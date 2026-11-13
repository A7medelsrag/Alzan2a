import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchProductReviews, submitProductReview } from "./reviews.js";

const mockResponse = {
  items: [
    {
      id: "rev-1",
      productId: "prod-1",
      customerId: "cust-1",
      customerName: "سارة أ.",
      rating: 5,
      comment: "ممتاز جداً",
      isVerifiedPurchase: true,
      createdAt: "2026-11-07T12:00:00Z",
    },
  ],
  stats: {
    averageRating: 5.0,
    totalReviews: 1,
    ratingDistribution: { "5": 1, "4": 0, "3": 0, "2": 0, "1": 0 },
  },
};

describe("Product Reviews API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches product reviews", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      }),
    );

    const result = await fetchProductReviews("prod-1");
    expect(result.items).toHaveLength(1);
    expect(result.stats.averageRating).toBe(5.0);
    expect(result.items[0].isVerifiedPurchase).toBe(true);
  });

  it("submits a product review", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockResponse.items[0] }),
      }),
    );

    const result = await submitProductReview(
      "prod-1",
      { rating: 5, comment: "ممتاز جداً" },
      "csrf-token-123",
    );
    expect(result.data.rating).toBe(5);
    expect(result.data.customerName).toBe("سارة أ.");
  });
});
