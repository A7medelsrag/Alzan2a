import type { CouponValidationResult, ValidateCouponInput } from "@store/shared";

const couponApiPath = "/api/v1/store/coupons/validate";

export class CouponApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "CouponApiError";
  }
}

export async function validateCouponCode(input: ValidateCouponInput): Promise<CouponValidationResult> {
  let response: Response;
  try {
    response = await fetch(couponApiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new CouponApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم للتحقق من كود الخصم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new CouponApiError("VALIDATION_ERROR", response.status);
  }

  return body as CouponValidationResult;
}
