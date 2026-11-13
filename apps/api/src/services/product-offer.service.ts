import type {
  AdminCreateProductOfferInput,
  AdminUpdateProductOfferInput,
  OfferDiscountType,
  ProductOfferPublic,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { ProductOfferRepository } from "../repositories/product-offer.repository.js";

type RawOffer = Awaited<ReturnType<ProductOfferRepository["findById"]>>;

export class ProductOfferService {
  public constructor(private readonly offers: ProductOfferRepository) {}

  public async listForAdmin(params?: { search?: string; isActive?: boolean }) {
    const records = await this.offers.listAll(params);
    return { data: records.map((r) => this.toPublicOffer(r)) };
  }

  public async listActivePublic() {
    const records = await this.offers.listActive();
    return { data: records.map((r) => this.toPublicOffer(r)) };
  }

  public async getById(id: string): Promise<{ data: ProductOfferPublic }> {
    const record = await this.offers.findById(id);
    if (!record) {
      throw new AppError("OFFER_NOT_FOUND", 404, "العرض غير موجود.");
    }
    return { data: this.toPublicOffer(record) };
  }

  public async create(input: AdminCreateProductOfferInput): Promise<{ data: ProductOfferPublic }> {
    const created = await this.offers.create(input);
    return { data: this.toPublicOffer(created) };
  }

  public async update(
    id: string,
    input: AdminUpdateProductOfferInput,
  ): Promise<{ data: ProductOfferPublic }> {
    const existing = await this.offers.findById(id);
    if (!existing) {
      throw new AppError("OFFER_NOT_FOUND", 404, "العرض غير موجود.");
    }
    const updated = await this.offers.update(id, input);
    return { data: this.toPublicOffer(updated) };
  }

  public async delete(id: string): Promise<{ success: true }> {
    const existing = await this.offers.findById(id);
    if (!existing) {
      throw new AppError("OFFER_NOT_FOUND", 404, "العرض غير موجود.");
    }
    await this.offers.delete(id);
    return { success: true };
  }

  private toPublicOffer(record: NonNullable<RawOffer>): ProductOfferPublic {
    const discountType: OfferDiscountType =
      record.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";

    return {
      id: record.id,
      name: record.title,
      description: record.description ?? null,
      discountType,
      discountValue: record.discountValue,
      maxDiscountCents: record.maxDiscountCents ?? null,
      isFreeShipping: record.freeShipping,
      startsAt: record.startsAt instanceof Date ? record.startsAt.toISOString() : (record.startsAt as unknown as string | null) ?? null,
      endsAt: record.endsAt instanceof Date ? record.endsAt.toISOString() : (record.endsAt as unknown as string | null) ?? null,
      isActive: record.isActive,
      productIds: record.products ? record.products.map((p) => p.productId) : [],
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    };
  }
}
