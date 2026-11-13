import { describe, expect, it } from "vitest";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from "./admin-crypto.js";

describe("admin authentication cryptography", () => {
  it("verifies RFC TOTP values and rejects invalid codes", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    expect(verifyTotp(secret, "287082", 59_000)).toBe(1n);
    expect(verifyTotp(secret, "287083", 59_000)).toBeNull();
  });

  it("encrypts TOTP secrets and detects tampering", () => {
    const encrypted = encryptTotpSecret("authenticator-secret", "a".repeat(64));

    expect(decryptTotpSecret(encrypted, "a".repeat(64))).toBe("authenticator-secret");
    expect(() => decryptTotpSecret(encrypted, "b".repeat(64))).toThrow();
  });

  it("hashes recovery codes without depending on display separators or case", () => {
    expect(hashRecoveryCode("ABCDE-F0123")).toBe(hashRecoveryCode("abcde f0123".replace(" ", "")));
  });
});
