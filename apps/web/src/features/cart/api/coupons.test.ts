import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateCouponCode } from "./coupons";

describe("coupons web api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts coupon validation payload to backend", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isValid: true,
        discountCents: 5000,
        code: "ZAN2A50",
        message: "تم تطبيق الخصم بنجاح!",
      }),
    });

    const res = await validateCouponCode({
      code: "ZAN2A50",
      subtotalCents: 45000,
      shippingFeeCents: 4000,
    });

    expect(res.isValid).toBe(true);
    expect(res.discountCents).toBe(5000);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/store/coupons/validate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "ZAN2A50",
          subtotalCents: 45000,
          shippingFeeCents: 4000,
        }),
      }),
    );
  });
});
