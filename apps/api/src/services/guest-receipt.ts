import { createHmac, timingSafeEqual } from "node:crypto";

export function createGuestReceiptToken(
  orderId: string,
  secret: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000, // 7 days receipt viewing window
): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${orderId}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyGuestReceiptToken(
  token: string,
  expectedOrderId: string,
  secret: string,
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [orderId, expiresAtStr, signature] = parts;
  if (!orderId || !expiresAtStr || !signature) return false;
  if (orderId !== expectedOrderId) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedPayload = `${orderId}.${expiresAtStr}`;
  const expectedSignature = createHmac("sha256", secret).update(expectedPayload).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(sigBuf, expectedBuf);
}
