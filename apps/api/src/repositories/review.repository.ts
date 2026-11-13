import type { PrismaClient } from "@prisma/client";

export class ReviewRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async listByProduct(productId: string) {
    return this.db.productReview.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  public async hasPurchased(productId: string, customerId: string): Promise<boolean> {
    const orderWithProduct = await this.db.order.findFirst({
      where: {
        customerId,
        status: "DELIVERED",
        items: {
          some: {
            variant: { productId },
          },
        },
      },
      select: { id: true },
    });

    return Boolean(orderWithProduct);
  }

  public async upsertReview(
    productId: string,
    customerId: string,
    rating: number,
    comment?: string | null,
  ) {
    const isVerifiedPurchase = await this.hasPurchased(productId, customerId);

    return this.db.productReview.upsert({
      where: {
        productId_customerId: { productId, customerId },
      },
      create: {
        productId,
        customerId,
        rating,
        comment: comment?.trim() || null,
        isVerifiedPurchase,
      },
      update: {
        rating,
        comment: comment?.trim() || null,
        isVerifiedPurchase,
      },
      include: {
        customer: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }
}
