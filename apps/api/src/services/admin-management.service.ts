import { PrismaClient, ProductStatus, ReviewStatus } from "@prisma/client";
import { AppError } from "../errors.js";

export class AdminManagementService {
  public constructor(private readonly db: PrismaClient) {}

  public async getOverviewStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      deliveredOrders,
      todayDeliveredOrders,
      totalCustomers,
      totalProducts,
      lowStockVariants,
      pendingReviews,
      recentOrders,
    ] = await Promise.all([
      this.db.order.count(),
      this.db.order.count({ where: { createdAt: { gte: today } } }),
      this.db.order.findMany({
        where: { status: "DELIVERED" },
        select: { totalCents: true, updatedAt: true },
      }),
      this.db.order.count({ where: { status: "DELIVERED", updatedAt: { gte: today } } }),
      this.db.customer.count(),
      this.db.product.count({ where: { status: "ACTIVE" } }),
      this.db.productVariant.count({ where: { stockQuantity: { lte: 5 } } }),
      this.db.productReview.count({ where: { status: "PENDING" } }),
      this.db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          status: true,
          totalCents: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              variant: {
                select: {
                  name: true,
                  product: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalSalesCents = deliveredOrders.reduce((sum, o) => sum + o.totalCents, 0);
    const todaySalesCents = deliveredOrders
      .filter((o) => o.updatedAt >= today)
      .reduce((sum, o) => sum + o.totalCents, 0);

    return {
      data: {
        totalOrders,
        todayOrders,
        deliveredOrderCount: deliveredOrders.length,
        todayDeliveredOrders,
        totalSalesCents,
        todaySalesCents,
        totalCustomers,
        totalProducts,
        lowStockVariants,
        pendingReviews,
        recentOrders,
      },
    };
  }

  public async listProducts(query: { search?: string; categoryId?: string; status?: string }) {
    const where = {
      ...(query.status ? { status: query.status as ProductStatus } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const products = await this.db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            priceCents: true,
            stockQuantity: true,
          },
        },
      },
    });

    const data = products.map((p) => {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      const minPrice = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.priceCents)) : 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        status: p.status,
        category: p.category,
        variants: p.variants,
        totalStock,
        priceCents: minPrice,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return { data };
  }

  public async createProduct(input: {
    name: string;
    slug?: string;
    description: string;
    categoryId: string;
    imageUrl?: string | null;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    variants?: Array<{ name: string; priceCents: number; stockQuantity: number; sku?: string }>;
  }) {
    let slug = input.slug?.trim().toLowerCase();
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      const rand = Math.random().toString(36).substring(2, 7);
      slug = `prod-${Date.now().toString(36)}-${rand}`;
    }

    const category = await this.db.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError("CATEGORY_NOT_FOUND", 404);

    const variantsData =
      input.variants && input.variants.length > 0
        ? input.variants.map((v, index) => ({
            name: v.name,
            priceCents: Math.round(v.priceCents),
            stockQuantity: Math.max(0, Math.round(v.stockQuantity)),
            sku: v.sku?.trim() || `SKU-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
          }))
        : [
            {
              name: "الأساسي",
              priceCents: 10000,
              stockQuantity: 10,
              sku: `SKU-${Date.now().toString(36).toUpperCase()}-1`,
            },
          ];

    const product = await this.db.product.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description.trim(),
        categoryId: input.categoryId,
        imageUrl: input.imageUrl ?? null,
        status: input.status ?? "ACTIVE",
        variants: {
          create: variantsData,
        },
      },
      include: {
        category: true,
        variants: true,
      },
    });

    return { data: product };
  }

  public async updateProduct(
    id: string,
    input: {
      name?: string;
      description?: string;
      categoryId?: string;
      imageUrl?: string | null;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    },
  ) {
    const existing = await this.db.product.findUnique({ where: { id } });
    if (!existing) throw new AppError("PRODUCT_NOT_FOUND", 404);

    const updated = await this.db.product.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.description ? { description: input.description.trim() } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        category: true,
        variants: true,
      },
    });

    return { data: updated };
  }

  public async updateVariantStock(variantId: string, stockQuantity: number, reason: string, actorId: string) {
    const existing = await this.db.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) throw new AppError("VARIANT_NOT_FOUND", 404);

    const nextStock = Math.max(0, Math.round(stockQuantity));
    const updated = await this.db.$transaction(async (tx) => {
      const result = await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: nextStock },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "INVENTORY_STOCK_ADJUSTED",
          entity: "ProductVariant",
          entityId: variantId,
          metadata: { previousQuantity: existing.stockQuantity, newQuantity: nextStock, reason: reason.trim() },
        },
      });
      return result;
    });

    return { data: updated };
  }

  public async listCategories() {
    const categories = await this.db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        productCount: c._count.products,
      })),
    };
  }

  public async createCategory(input: {
    name: string;
    slug?: string;
    parentId?: string | null;
    imageUrl?: string | null;
  }) {
    let slug = input.slug?.trim().toLowerCase();
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      const rand = Math.random().toString(36).substring(2, 6);
      slug = `cat-${Date.now().toString(36)}-${rand}`;
    }

    const category = await this.db.category.create({
      data: {
        name: input.name.trim(),
        slug,
        parentId: input.parentId ?? null,
        imageUrl: input.imageUrl ?? null,
      },
    });

    return { data: category };
  }

  public async updateCategory(
    id: string,
    input: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      imageUrl?: string | null;
    },
  ) {
    const existing = await this.db.category.findUnique({ where: { id } });
    if (!existing) throw new AppError("CATEGORY_NOT_FOUND", 404);

    const updated = await this.db.category.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      },
    });

    return { data: updated };
  }

  public async deleteCategory(id: string) {
    const count = await this.db.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new AppError("CATEGORY_IN_USE", 400);
    }
    await this.db.category.delete({ where: { id } });
    return { data: { success: true } };
  }

  public async listCustomers() {
    const customers = await this.db.customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneE164: true,
        createdAt: true,
        orders: {
          select: {
            totalCents: true,
            status: true,
          },
        },
      },
    });

    const data = customers.map((c) => {
      const ordersCount = c.orders.length;
      const totalSpentCents = c.orders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((sum, o) => sum + o.totalCents, 0);

      return {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        phone: c.phoneE164,
        ordersCount,
        totalSpentCents,
        createdAt: c.createdAt,
      };
    });

    return { data };
  }

  public async listReviews(status?: string) {
    const where = status ? { status: status as ReviewStatus } : {};
    const reviews = await this.db.productReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true, phoneE164: true } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
    });

    return {
      data: reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productImage: r.product.imageUrl,
        customerName: r.customer.fullName,
        customerPhone: r.customer.phoneE164,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
      })),
    };
  }

  public async updateReviewStatus(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    const existing = await this.db.productReview.findUnique({ where: { id } });
    if (!existing) throw new AppError("REVIEW_NOT_FOUND", 404);

    const updated = await this.db.productReview.update({
      where: { id },
      data: { status },
    });

    return { data: updated };
  }
}
