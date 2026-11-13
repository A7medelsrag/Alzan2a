import type { Prisma, PrismaClient } from "@prisma/client";
import type { AdminCreateProductOfferInput, AdminUpdateProductOfferInput } from "@store/shared";

const offerInclude = {
  products: {
    select: {
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          status: true,
        },
      },
    },
  },
} as const;

export class ProductOfferRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async listAll(params?: { search?: string; isActive?: boolean }) {
    const where: Prisma.ProductOfferWhereInput = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params?.search) {
      where.title = { contains: params.search.trim(), mode: "insensitive" };
    }

    return this.db.productOffer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: offerInclude,
    });
  }

  public async findById(id: string) {
    return this.db.productOffer.findUnique({
      where: { id },
      include: offerInclude,
    });
  }

  public async findActiveForProducts(productIds: string[], now: Date = new Date()) {
    if (productIds.length === 0) return [];

    return this.db.productOffer.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          {
            products: {
              some: {
                productId: { in: productIds },
                product: { status: "ACTIVE" },
              },
            },
          },
        ],
      },
      include: offerInclude,
    });
  }

  public async listActive(now: Date = new Date()) {
    return this.db.productOffer.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: offerInclude,
    });
  }

  public async create(data: AdminCreateProductOfferInput) {
    return this.db.productOffer.create({
      data: {
        title: data.name,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscountCents: data.maxDiscountCents ?? null,
        freeShipping: data.isFreeShipping ?? false,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
        products: {
          create: data.productIds.map((productId) => ({ productId })),
        },
      },
      include: offerInclude,
    });
  }

  public async update(id: string, data: AdminUpdateProductOfferInput) {
    return this.db.$transaction(async (tx) => {
      if (data.productIds) {
        await tx.productOfferProduct.deleteMany({
          where: { offerId: id },
        });
        await tx.productOfferProduct.createMany({
          data: data.productIds.map((productId) => ({
            offerId: id,
            productId,
          })),
        });
      }

      return tx.productOffer.update({
        where: { id },
        data: {
          title: data.name,
          description: data.description === undefined ? undefined : data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          maxDiscountCents: data.maxDiscountCents === undefined ? undefined : data.maxDiscountCents,
          freeShipping: data.isFreeShipping,
          startsAt: data.startsAt === undefined ? undefined : data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
          isActive: data.isActive,
        },
        include: offerInclude,
      });
    });
  }

  public async delete(id: string) {
    return this.db.productOffer.delete({
      where: { id },
    });
  }
}
