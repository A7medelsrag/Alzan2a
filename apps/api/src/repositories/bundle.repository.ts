import type { Prisma, PrismaClient } from "@prisma/client";
import type { AdminCreateBundleInput, AdminUpdateBundleInput } from "@store/shared";

const bundleInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          status: true,
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
      },
      defaultVariant: {
        select: {
          id: true,
          sku: true,
          name: true,
          priceCents: true,
          stockQuantity: true,
        },
      },
    },
  },
} as const;

export class BundleRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async listAll(params?: { search?: string; isActive?: boolean }) {
    const where: Prisma.BundleWhereInput = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.db.bundle.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: bundleInclude,
    });
  }

  public async listActive(now: Date = new Date()) {
    return this.db.bundle.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          {
            items: {
              every: {
                product: { status: "ACTIVE" },
              },
            },
          },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: bundleInclude,
    });
  }

  public async findById(id: string) {
    return this.db.bundle.findUnique({
      where: { id },
      include: bundleInclude,
    });
  }

  public async create(data: AdminCreateBundleInput) {
    return this.db.bundle.create({
      data: {
        name: data.internalName,
        title: data.publicTitle,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        priceCents: data.fixedPriceCents ?? null,
        discountType: data.discountCents ? "FIXED_AMOUNT" : null,
        discountValue: data.discountCents ?? null,
        freeShipping: data.isFreeShipping ?? false,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
        sortOrder: data.displayOrder ?? 0,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            defaultVariantId: item.defaultVariantId ?? null,
            quantity: item.quantity ?? 1,
          })),
        },
      },
      include: bundleInclude,
    });
  }

  public async update(id: string, data: AdminUpdateBundleInput) {
    return this.db.$transaction(async (tx) => {
      if (data.items) {
        await tx.bundleItem.deleteMany({
          where: { bundleId: id },
        });
        await tx.bundleItem.createMany({
          data: data.items.map((item) => ({
            bundleId: id,
            productId: item.productId,
            defaultVariantId: item.defaultVariantId ?? null,
            quantity: item.quantity ?? 1,
          })),
        });
      }

      return tx.bundle.update({
        where: { id },
        data: {
          name: data.internalName,
          title: data.publicTitle,
          description: data.description === undefined ? undefined : data.description,
          imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl,
          priceCents: data.fixedPriceCents === undefined ? undefined : data.fixedPriceCents,
          discountType: data.discountCents ? "FIXED_AMOUNT" : undefined,
          discountValue: data.discountCents === undefined ? undefined : data.discountCents,
          freeShipping: data.isFreeShipping,
          startsAt: data.startsAt === undefined ? undefined : data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
          isActive: data.isActive,
          sortOrder: data.displayOrder,
        },
        include: bundleInclude,
      });
    });
  }

  public async delete(id: string) {
    return this.db.bundle.delete({
      where: { id },
    });
  }
}
