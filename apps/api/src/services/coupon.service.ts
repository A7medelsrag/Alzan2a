import {
  evaluateCoupon,
  type AdminCreateCouponInput,
  type AdminUpdateCouponInput,
  type CouponPublic,
  type CouponValidationResult,
  type ValidateCouponInput,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { CouponRepository } from "../repositories/coupon.repository.js";

export class CouponService {
  public constructor(private readonly repo: CouponRepository) {}

  public async validate(input: ValidateCouponInput): Promise<CouponValidationResult> {
    const coupon = await this.repo.findByCode(input.code);
    if (!coupon) {
      return {
        isValid: false,
        discountCents: 0,
        code: input.code.toUpperCase(),
        message: "كود الخصم غير موجود أو تم إدخاله بشكل غير صحيح.",
      };
    }

    return evaluateCoupon(coupon, input.subtotalCents, input.shippingFeeCents);
  }

  public async listAllForAdmin(): Promise<{ data: CouponPublic[] }> {
    const coupons = await this.repo.listAll();
    return { data: coupons.map((c) => this.toPublicCoupon(c)) };
  }

  public async createByAdmin(input: AdminCreateCouponInput): Promise<{ data: CouponPublic }> {
    const existing = await this.repo.findByCode(input.code);
    if (existing) {
      throw new AppError("COUPON_ALREADY_EXISTS", 409, "كود الخصم مسجل بالفعل.");
    }
    const created = await this.repo.create(input);
    return { data: this.toPublicCoupon(created) };
  }

  public async updateByAdmin(id: string, input: AdminUpdateCouponInput): Promise<{ data: CouponPublic }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError("COUPON_NOT_FOUND", 404, "كود الخصم غير موجود.");
    }
    const updated = await this.repo.update(id, input);
    return { data: this.toPublicCoupon(updated) };
  }

  public async deleteByAdmin(id: string): Promise<{ success: true }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError("COUPON_NOT_FOUND", 404, "كود الخصم غير موجود.");
    }
    await this.repo.delete(id);
    return { success: true };
  }

  private toPublicCoupon(c: {
    id: string;
    code: string;
    description: string | null;
    discountType: CouponPublic["discountType"];
    discountValue: number;
    minSubtotalCents: number;
    maxDiscountCents: number | null;
    usageLimit: number | null;
    usageCount: number;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CouponPublic {
    return {
      id: c.id,
      code: c.code,
      description: c.description ?? null,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minSubtotalCents: c.minSubtotalCents,
      maxDiscountCents: c.maxDiscountCents ?? null,
      usageLimit: c.usageLimit ?? null,
      usageCount: c.usageCount,
      startsAt: c.startsAt ? (c.startsAt instanceof Date ? c.startsAt.toISOString() : String(c.startsAt)) : null,
      endsAt: c.endsAt ? (c.endsAt instanceof Date ? c.endsAt.toISOString() : String(c.endsAt)) : null,
      isActive: c.isActive,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
    };
  }
}
