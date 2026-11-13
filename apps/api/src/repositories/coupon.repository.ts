import type { PrismaClient } from "@prisma/client";
import type { AdminCreateCouponInput, AdminUpdateCouponInput } from "@store/shared";

export class CouponRepository {
  public constructor(private readonly db: PrismaClient) {}

  public async findByCode(code: string) {
    return this.db.coupon.findFirst({
      where: { code: code.toUpperCase() },
    });
  }

  public async findById(id: string) {
    return this.db.coupon.findUnique({
      where: { id },
    });
  }

  public async listAll() {
    return this.db.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  public async create(data: AdminCreateCouponInput) {
    return this.db.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minSubtotalCents: data.minSubtotalCents,
        maxDiscountCents: data.maxDiscountCents ?? null,
        usageLimit: data.usageLimit ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
      },
    });
  }

  public async update(id: string, data: AdminUpdateCouponInput) {
    return this.db.coupon.update({
      where: { id },
      data: {
        description: data.description === undefined ? undefined : data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minSubtotalCents: data.minSubtotalCents,
        maxDiscountCents: data.maxDiscountCents === undefined ? undefined : data.maxDiscountCents,
        usageLimit: data.usageLimit === undefined ? undefined : data.usageLimit,
        startsAt: data.startsAt === undefined ? undefined : (data.startsAt ? new Date(data.startsAt) : null),
        endsAt: data.endsAt === undefined ? undefined : (data.endsAt ? new Date(data.endsAt) : null),
        isActive: data.isActive,
      },
    });
  }

  public async delete(id: string) {
    return this.db.coupon.delete({
      where: { id },
    });
  }

  public async incrementUsage(id: string) {
    return this.db.coupon.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
