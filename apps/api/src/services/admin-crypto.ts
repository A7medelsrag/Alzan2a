import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const totpStepSeconds = 30;
const totpDigits = 6;

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function createTotpUri(secret: string, username: string): string {
  const label = encodeURIComponent(`AL zan2a:${username}`);
  const issuer = encodeURIComponent("AL zan2a");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${totpDigits}&period=${totpStepSeconds}`;
}

export function verifyTotp(secret: string, code: string, now = Date.now()): bigint | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = decodeBase32(secret);
  const currentCounter = Math.floor(now / 1_000 / totpStepSeconds);
  for (const offset of [-1, 0, 1]) {
    const counter = currentCounter + offset;
    if (counter < 0) continue;
    const digest = createHmac("sha1", key).update(counterBytes(counter)).digest();
    const index = digest[digest.length - 1]! & 0x0f;
    const binary = ((digest[index]! & 0x7f) << 24) |
      ((digest[index + 1]! & 0xff) << 16) |
      ((digest[index + 2]! & 0xff) << 8) |
      (digest[index + 3]! & 0xff);
    const candidate = String(binary % (10 ** totpDigits)).padStart(totpDigits, "0");
    const actualBytes = Buffer.from(code);
    const candidateBytes = Buffer.from(candidate);
    if (timingSafeEqual(actualBytes, candidateBytes)) return BigInt(counter);
  }
  return null;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const value = randomBytes(10).toString("hex");
    return `${value.slice(0, 5)}-${value.slice(5, 10)}-${value.slice(10, 15)}-${value.slice(15)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.replace(/-/g, "").toLowerCase()).digest("hex");
}

export function encryptTotpSecret(secret: string, encodedKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeEncryptionKey(encodedKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(encryptedValue: string, encodedKey: string): string {
  const [encodedIv, encodedTag, encodedData, extra] = encryptedValue.split(".");
  if (!encodedIv || !encodedTag || !encodedData || extra) throw new Error("Invalid encrypted TOTP secret");
  const decipher = createDecipheriv("aes-256-gcm", decodeEncryptionKey(encodedKey), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function decodeEncryptionKey(value: string): Buffer {
  return /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
}

function encodeBase32(value: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  let result = "";
  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(buffer << (5 - bits)) & 31];
  return result;
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const result: number[] = [];
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid TOTP secret");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      result.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(result);
}

function counterBytes(counter: number): Buffer {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(counter));
  return bytes;
}
