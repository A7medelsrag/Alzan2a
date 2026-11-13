import type { PrismaClient } from "@prisma/client";

export class CatalogRepository {
  public constructor(private readonly db: PrismaClient) {}

  public listPublished(input: { page: number; pageSize: number; category?: string; search?: string }) {
    const where = {
      status: "ACTIVE" as const,
      ...(input.category
        ? {
            category: {
              OR: [
                { slug: input.category },
                { parent: { is: { slug: input.category } } },
              ],
            },
          }
        : {}),
      ...(input.search
        ? { OR: [{ name: { contains: input.search, mode: "insensitive" as const } }, { description: { contains: input.search, mode: "insensitive" as const } }] }
        : {}),
    };
    return this.db.$transaction([
      this.db.product.count({ where }),
      this.db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true, name: true, slug: true, description: true,
          category: { select: { name: true, slug: true } },
          variants: { where: { stockQuantity: { gt: 0 } }, select: { id: true, name: true, priceCents: true, stockQuantity: true } },
        },
      }),
    ]);
  }

  public findPublishedBySlug(slug: string) {
    return this.db.product.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true, name: true, slug: true, description: true, imageUrl: true,
        category: { select: { name: true, slug: true } },
        variants: { select: { id: true, name: true, sku: true, priceCents: true, stockQuantity: true } },
      },
    });
  }

  public listCategories() {
    return this.db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, imageUrl: true, bannerImageUrl: true },
    });
  }
}
