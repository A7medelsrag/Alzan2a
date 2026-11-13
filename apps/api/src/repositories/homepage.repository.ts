import { AppError } from "../errors.js";
import type { HomepageBannerInput, HomepageSectionInput } from "@store/shared";
import type { Prisma, PrismaClient } from "@prisma/client";

const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  category: { select: { name: true, slug: true } },
  variants: {
    where: { stockQuantity: { gt: 0 } },
    select: { id: true, name: true, priceCents: true, stockQuantity: true },
  },
} as const;

function activeSchedule(now: Date) {
  return {
    isEnabled: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ],
  };
}

export class HomepageRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async listPublished(now = new Date()) {
    const [banners, sections] = await Promise.all([
      this.db.homepageBanner.findMany({
        where: activeSchedule(now),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          slot: true,
          title: true,
          subtitle: true,
          desktopImageUrl: true,
          mobileImageUrl: true,
          buttonLabel: true,
          linkUrl: true,
          overlayColor: true,
          overlayOpacity: true,
          blur: true,
        },
      }),
      this.db.homepageSection.findMany({
        where: activeSchedule(now),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          products: {
            where: { product: { status: "ACTIVE" } },
            orderBy: { sortOrder: "asc" },
            include: { product: { select: publicProductSelect } },
          },
          categories: {
            orderBy: { sortOrder: "asc" },
            include: { category: { select: { id: true, name: true, slug: true, parentId: true, imageUrl: true, bannerImageUrl: true } } },
          },
        },
      }),
    ]);

    const result = await Promise.all(sections.map(async (section) => {
      let products = section.products.map(({ product }) => product);
      let categories = section.categories.map(({ category }) => category);
      if (section.type === "NEW_ARRIVALS" && products.length === 0) {
        products = await this.db.product.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 8,
          select: publicProductSelect,
        });
      }
      if (section.type === "CATEGORIES" && categories.length === 0) {
        categories = await this.db.category.findMany({
          orderBy: [{ parentId: "asc" }, { name: "asc" }],
          select: { id: true, name: true, slug: true, parentId: true, imageUrl: true, bannerImageUrl: true },
        });
      }

      return {
        id: section.id,
        type: section.type,
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        imageUrl: section.imageUrl,
        buttonLabel: section.buttonLabel,
        linkUrl: section.linkUrl,
        products,
        categories,
      };
    }));

    return {
      banners: banners.filter((banner) =>
        banner.slot !== "ANNOUNCEMENT" || banner.title || banner.subtitle,
      ),
      sections: result,
    };
  }

  public listForAdmin() {
    return Promise.all([
      this.db.homepageSection.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          products: { orderBy: { sortOrder: "asc" }, select: { productId: true } },
          categories: { orderBy: { sortOrder: "asc" }, select: { categoryId: true } },
        },
      }),
      this.db.homepageBanner.findMany({
        orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      this.db.product.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        take: 500,
        select: { id: true, name: true, imageUrl: true },
      }),
      this.db.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, parentId: true, imageUrl: true, bannerImageUrl: true },
      }),
    ]).then(([sections, banners, products, categories]) => ({
      sections: sections.map((section) => ({
        ...section,
        startsAt: section.startsAt?.toISOString() ?? null,
        endsAt: section.endsAt?.toISOString() ?? null,
        productIds: section.products.map(({ productId }) => productId),
        categoryIds: section.categories.map(({ categoryId }) => categoryId),
      })),
      banners: banners.map((banner) => ({
        ...banner,
        startsAt: banner.startsAt?.toISOString() ?? null,
        endsAt: banner.endsAt?.toISOString() ?? null,
      })),
      products,
      categories,
    }));
  }

  public async saveSection(input: HomepageSectionInput, actorId: string, id?: string) {
    return this.db.$transaction(async (transaction) => {
      await this.requireReferences(transaction, input.productIds, input.categoryIds);
      if (id && !(await transaction.homepageSection.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("HOMEPAGE_SECTION_NOT_FOUND", 404);
      }

      const { productIds, categoryIds, startsAt, endsAt, ...fields } = input;
      const relationData = {
        products: {
          deleteMany: {},
          create: productIds.map((productId, sortOrder) => ({
            sortOrder,
            product: { connect: { id: productId } },
          })),
        },
        categories: {
          deleteMany: {},
          create: categoryIds.map((categoryId, sortOrder) => ({
            sortOrder,
            category: { connect: { id: categoryId } },
          })),
        },
      };
      const data = {
        ...fields,
        subtitle: fields.subtitle ?? null,
        description: fields.description ?? null,
        imageUrl: fields.imageUrl ?? null,
        buttonLabel: fields.buttonLabel ?? null,
        linkUrl: fields.linkUrl ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        ...relationData,
      };
      const section = id
        ? await transaction.homepageSection.update({ where: { id }, data })
        : await transaction.homepageSection.create({ data });
      await this.audit(transaction, actorId, id ? "UPDATE" : "CREATE", "homepage_section", section.id, { type: section.type });
      return section;
    });
  }

  public async deleteSection(id: string, actorId: string) {
    return this.db.$transaction(async (transaction) => {
      if (!(await transaction.homepageSection.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("HOMEPAGE_SECTION_NOT_FOUND", 404);
      }
      await transaction.homepageSection.delete({ where: { id } });
      await this.audit(transaction, actorId, "DELETE", "homepage_section", id);
    });
  }

  public async reorderSections(ids: string[], actorId: string) {
    return this.db.$transaction(async (transaction) => {
      const [existing, total] = await Promise.all([
        transaction.homepageSection.count({ where: { id: { in: ids } } }),
        transaction.homepageSection.count(),
      ]);
      if (existing !== ids.length) throw new AppError("HOMEPAGE_SECTION_NOT_FOUND", 404);
      if (total !== ids.length) throw new AppError("VALIDATION_ERROR", 400);
      await Promise.all(ids.map((id, sortOrder) =>
        transaction.homepageSection.update({ where: { id }, data: { sortOrder } }),
      ));
      await this.audit(transaction, actorId, "REORDER", "homepage_section", null, { count: ids.length });
    });
  }

  public async saveBanner(input: HomepageBannerInput, actorId: string, id?: string) {
    return this.db.$transaction(async (transaction) => {
      if (id && !(await transaction.homepageBanner.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("HOMEPAGE_BANNER_NOT_FOUND", 404);
      }
      const { startsAt, endsAt, ...fields } = input;
      const data = {
        ...fields,
        title: fields.title ?? null,
        subtitle: fields.subtitle ?? null,
        desktopImageUrl: fields.desktopImageUrl ?? null,
        mobileImageUrl: fields.mobileImageUrl ?? null,
        buttonLabel: fields.buttonLabel ?? null,
        linkUrl: fields.linkUrl ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      };
      const banner = id
        ? await transaction.homepageBanner.update({ where: { id }, data })
        : await transaction.homepageBanner.create({ data });
      await this.audit(transaction, actorId, id ? "UPDATE" : "CREATE", "homepage_banner", banner.id, { slot: banner.slot });
      return banner;
    });
  }

  public async deleteBanner(id: string, actorId: string) {
    return this.db.$transaction(async (transaction) => {
      if (!(await transaction.homepageBanner.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("HOMEPAGE_BANNER_NOT_FOUND", 404);
      }
      await transaction.homepageBanner.delete({ where: { id } });
      await this.audit(transaction, actorId, "DELETE", "homepage_banner", id);
    });
  }

  public async updateProductImage(id: string, imageUrl: string | null, actorId: string) {
    return this.db.$transaction(async (transaction) => {
      if (!(await transaction.product.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("PRODUCT_NOT_FOUND", 404);
      }
      await transaction.product.update({ where: { id }, data: { imageUrl } });
      await this.audit(transaction, actorId, "UPDATE_IMAGE", "product", id);
    });
  }

  public async updateCategoryImages(
    id: string,
    imageUrl: string | null,
    bannerImageUrl: string | null,
    actorId: string,
  ) {
    return this.db.$transaction(async (transaction) => {
      if (!(await transaction.category.findUnique({ where: { id }, select: { id: true } }))) {
        throw new AppError("CATEGORY_NOT_FOUND", 404);
      }
      await transaction.category.update({ where: { id }, data: { imageUrl, bannerImageUrl } });
      await this.audit(transaction, actorId, "UPDATE_IMAGES", "category", id);
    });
  }

  private async requireReferences(
    transaction: Prisma.TransactionClient,
    productIds: string[],
    categoryIds: string[],
  ): Promise<void> {
    const [products, categories] = await Promise.all([
      productIds.length
        ? transaction.product.count({ where: { id: { in: productIds }, status: "ACTIVE" } })
        : Promise.resolve(0),
      categoryIds.length
        ? transaction.category.count({ where: { id: { in: categoryIds } } })
        : Promise.resolve(0),
    ]);
    if (products !== productIds.length || categories !== categoryIds.length) {
      throw new AppError("HOMEPAGE_REFERENCE_NOT_FOUND", 400);
    }
  }

  private audit(
    transaction: Prisma.TransactionClient,
    actorId: string,
    action: string,
    entity: string,
    entityId: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    return transaction.auditLog.create({
      data: { actorId, action, entity, entityId, ...(metadata ? { metadata } : {}) },
    });
  }
}
