import type { CreateReviewInput, ProductReviewsResponse, ReviewPublic } from "@store/shared";

const reviewsApiPath = "/api/v1/store/reviews";

export class ReviewApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "ReviewApiError";
  }
}

export async function fetchProductReviews(
  productId: string,
  signal?: AbortSignal,
): Promise<ProductReviewsResponse> {
  let response: Response;
  try {
    response = await fetch(`${reviewsApiPath}/${encodeURIComponent(productId)}`, {
      method: "GET",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ReviewApiError("UNAVAILABLE", 503, "تعذر تحميل التقييمات.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new ReviewApiError(code, response.status);
  }

  return body as ProductReviewsResponse;
}

export async function submitProductReview(
  productId: string,
  input: CreateReviewInput,
  csrfToken: string,
): Promise<{ data: ReviewPublic }> {
  let response: Response;
  try {
    response = await fetch(`${reviewsApiPath}/${encodeURIComponent(productId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(input),
    });
  } catch {
    throw new ReviewApiError("UNAVAILABLE", 503, "تعذر إرسال التقييم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    const message =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error
        ? (body.error.message as string)
        : undefined;
    throw new ReviewApiError(code, response.status, message);
  }

  return body as { data: ReviewPublic };
}
