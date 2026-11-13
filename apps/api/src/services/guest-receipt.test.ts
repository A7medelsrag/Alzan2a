import { describe, expect, it } from "vitest";
import { createGuestReceiptToken, verifyGuestReceiptToken } from "./guest-receipt.js";

describe("guest receipt token security", () => {
  const secret = "test-guest-receipt-secret-key-32-chars-long";
  const orderId = "11111111-1111-4111-8111-111111111111";

  it("creates and successfully verifies valid receipt token", () => {
    const token = createGuestReceiptToken(orderId, secret);
    expect(verifyGuestReceiptToken(token, orderId, secret)).toBe(true);
  });

  it("rejects token for different orderId (anti-IDOR)", () => {
    const token = createGuestReceiptToken(orderId, secret);
    const otherOrderId = "22222222-2222-4222-8222-222222222222";
    expect(verifyGuestReceiptToken(token, otherOrderId, secret)).toBe(false);
  });

  it("rejects expired receipt token", () => {
    const expiredToken = createGuestReceiptToken(orderId, secret, -1000);
    expect(verifyGuestReceiptToken(expiredToken, orderId, secret)).toBe(false);
  });

  it("rejects tampered signature", () => {
    const token = createGuestReceiptToken(orderId, secret);
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.tampered-signature`;
    expect(verifyGuestReceiptToken(tampered, orderId, secret)).toBe(false);
  });

  it("rejects invalid format", () => {
    expect(verifyGuestReceiptToken("malformed-token", orderId, secret)).toBe(false);
  });
});
