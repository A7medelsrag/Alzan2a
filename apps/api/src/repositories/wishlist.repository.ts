import type { PrismaClient } from "@prisma/client";
import type { WishlistItemPublic } from "@store/shared";

export const wishlistItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      variants: {
        select: { priceCents: true },
      },
    },
  },
  variant: {
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      stockQuantity: true,
    },
  },
} as const;

export class WishlistRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async listByCustomerId(customerId: string): Promise<WishlistItemPublic[]> {
    const items = await this.db.wishlistItem.findMany({
      where: { customerId },
      include: wishlistItemInclude,
      orderBy: { createdAt: "desc" },
    });

    return items.map((item) => {
      const minPriceCents =
        item.product.variants.length > 0
          ? Math.min(...item.product.variants.map((v) => v.priceCents))
          : 0;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        createdAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          description: item.product.description,
          imageUrl: item.product.imageUrl,
          minPriceCents,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              sku: item.variant.sku,
              name: item.variant.name,
              priceCents: item.variant.priceCents,
              stockQuantity: item.variant.stockQuantity,
            }
          : null,
      };
    });
  }

  public async addItem(
    customerId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<void> {
    const existing = await this.db.wishlistItem.findFirst({
      where: {
        customerId,
        productId,
        variantId: variantId ?? null,
      },
    });

    if (existing) return;

    try {
      await this.db.wishlistItem.create({
        data: {
          customerId,
          productId,
          variantId: variantId ?? null,
        },
      });
    } catch {
      // Gracefully swallow duplicate key collisions (NULLS NOT DISTINCT constraint)
    }
  }

  public async removeItem(customerId: string, idOrProductId: string): Promise<void> {
    await this.db.wishlistItem.deleteMany({
      where: {
        customerId,
        OR: [{ id: idOrProductId }, { productId: idOrProductId }],
      },
    });
  }

  public async syncItems(
    customerId: string,
    items: Array<{ productId: string; variantId?: string | null }>,
  ): Promise<WishlistItemPublic[]> {
    for (const item of items) {
      await this.addItem(customerId, item.productId, item.variantId);
    }

    return this.listByCustomerId(customerId);
  }
}
