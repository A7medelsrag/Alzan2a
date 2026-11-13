import type { CreateReviewInput, ProductReviewsResponse, ReviewPublic } from "@store/shared";
import { AppError } from "../errors.js";
import type { ReviewRepository } from "../repositories/review.repository.js";

export class ReviewService {
  public constructor(private readonly repo: ReviewRepository) {}

  public async getProductReviews(productId: string): Promise<ProductReviewsResponse> {
    const rawReviews = await this.repo.listByProduct(productId);

    const totalReviews = rawReviews.length;
    const ratingDistribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };

    let totalScore = 0;
    for (const r of rawReviews) {
      totalScore += r.rating;
      const key = String(r.rating);
      if (key in ratingDistribution) {
        ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1;
      }
    }

    const averageRating =
      totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;

    const items: ReviewPublic[] = rawReviews.map((r) => this.toPublicReview(r));

    return {
      items,
      stats: {
        averageRating,
        totalReviews,
        ratingDistribution,
      },
    };
  }

  public async submitReview(
    productId: string,
    customerId: string,
    input: CreateReviewInput,
  ): Promise<{ data: ReviewPublic }> {
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError("INVALID_REVIEW_RATING", 400, "التقييم يجب أن يكون بين 1 و 5 نجوم.");
    }

    try {
      const review = await this.repo.upsertReview(
        productId,
        customerId,
        input.rating,
        input.comment,
      );
      return { data: this.toPublicReview(review) };
    } catch {
      throw new AppError("PRODUCT_NOT_FOUND", 404, "المنتج غير موجود.");
    }
  }

  private toPublicReview(r: {
    id: string;
    productId: string;
    customerId: string;
    rating: number;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: Date;
    customer: { fullName: string };
  }): ReviewPublic {
    const parts = r.customer.fullName.trim().split(/\s+/);
    const firstName = parts[0] || "عميل زنقه";
    const secondInitial = parts[1] && parts[1][0] ? ` ${parts[1][0]}.` : "";
    const maskedName = `${firstName}${secondInitial}`;

    return {
      id: r.id,
      productId: r.productId,
      customerId: r.customerId,
      customerName: maskedName,
      rating: r.rating,
      comment: r.comment ?? null,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  }
}
