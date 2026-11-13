import type {
  AdminCreateBundleInput,
  AdminUpdateBundleInput,
  BundlePublic,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { BundleRepository } from "../repositories/bundle.repository.js";

type RawBundle = Awaited<ReturnType<BundleRepository["findById"]>>;

export class BundleService {
  public constructor(private readonly bundles: BundleRepository) {}

  public async listForAdmin(params?: { search?: string; isActive?: boolean }) {
    const records = await this.bundles.listAll(params);
    return { data: records.map((r) => this.toPublicBundle(r)) };
  }

  public async listActivePublic() {
    const records = await this.bundles.listActive();
    return { data: records.map((r) => this.toPublicBundle(r)) };
  }

  public async getById(id: string): Promise<{ data: BundlePublic }> {
    const record = await this.bundles.findById(id);
    if (!record) {
      throw new AppError("BUNDLE_NOT_FOUND", 404, "الباقة غير موجودة.");
    }
    return { data: this.toPublicBundle(record) };
  }

  public async create(input: AdminCreateBundleInput): Promise<{ data: BundlePublic }> {
    const created = await this.bundles.create(input);
    return { data: this.toPublicBundle(created) };
  }

  public async update(
    id: string,
    input: AdminUpdateBundleInput,
  ): Promise<{ data: BundlePublic }> {
    const existing = await this.bundles.findById(id);
    if (!existing) {
      throw new AppError("BUNDLE_NOT_FOUND", 404, "الباقة غير موجودة.");
    }
    const updated = await this.bundles.update(id, input);
    return { data: this.toPublicBundle(updated) };
  }

  public async delete(id: string): Promise<{ success: true }> {
    const existing = await this.bundles.findById(id);
    if (!existing) {
      throw new AppError("BUNDLE_NOT_FOUND", 404, "الباقة غير موجودة.");
    }
    await this.bundles.delete(id);
    return { success: true };
  }

  public toPublicBundle(record: NonNullable<RawBundle>): BundlePublic {
    let totalOriginalPriceCents = 0;
    let availableStock = 999999;

    const items = record.items.map((item) => {
      const productVariants = item.product?.variants ?? [];
      const totalProductStock = productVariants.reduce((sum, v) => sum + v.stockQuantity, 0);

      const componentPossibleBundles = item.quantity > 0
        ? Math.floor(totalProductStock / item.quantity)
        : 0;

      if (componentPossibleBundles < availableStock) {
        availableStock = componentPossibleBundles;
      }

      let componentUnitPrice = 0;
      if (item.defaultVariant?.priceCents !== undefined) {
        componentUnitPrice = item.defaultVariant.priceCents;
      } else if (productVariants.length > 0) {
        componentUnitPrice = Math.min(...productVariants.map((v) => v.priceCents));
      }

      totalOriginalPriceCents += componentUnitPrice * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        defaultVariantId: item.defaultVariantId ?? null,
        quantity: item.quantity,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              imageUrl: item.product.imageUrl ?? null,
              variants: item.product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                name: v.name,
                priceCents: v.priceCents,
                stockQuantity: v.stockQuantity,
              })),
            }
          : undefined,
      };
    });

    if (items.length === 0 || availableStock === 999999) {
      availableStock = 0;
    }

    const fixedPriceCents = record.priceCents ?? null;
    const discountCents = record.discountValue ?? null;

    let finalPriceCents = totalOriginalPriceCents;
    if (fixedPriceCents !== null) {
      finalPriceCents = fixedPriceCents;
    } else if (discountCents !== null) {
      finalPriceCents = Math.max(0, totalOriginalPriceCents - discountCents);
    }

    return {
      id: record.id,
      internalName: record.name,
      publicTitle: record.title,
      description: record.description ?? null,
      imageUrl: record.imageUrl ?? null,
      fixedPriceCents,
      discountCents,
      isFreeShipping: record.freeShipping,
      startsAt: record.startsAt instanceof Date ? record.startsAt.toISOString() : (record.startsAt as unknown as string | null) ?? null,
      endsAt: record.endsAt instanceof Date ? record.endsAt.toISOString() : (record.endsAt as unknown as string | null) ?? null,
      isActive: record.isActive,
      displayOrder: record.sortOrder,
      items,
      availableStock,
      totalOriginalPriceCents,
      finalPriceCents,
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    };
  }
}
