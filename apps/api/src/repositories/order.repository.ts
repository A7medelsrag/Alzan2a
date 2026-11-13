import { randomUUID } from "node:crypto";
import type { OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  calculateCartTotals,
  normalizeEgyptianPhone,
  type CartBundlePricingInput,
  type CartItemPricingInput,
  type OrderCustomerInput,
  type OrderShippingAddressInput,
  type ProductOfferEvaluationInput,
} from "@store/shared";

export class CheckoutUnavailableError extends Error {
  public constructor(message = "Requested variants are unavailable or out of stock") {
    super(message);
    this.name = "CheckoutUnavailableError";
  }
}

export type CreateOrderRepoInput = {
  idempotencyKey: string;
  customerId?: string | null;
  customer: OrderCustomerInput;
  shippingAddress: OrderShippingAddressInput;
  items?: Array<{ variantId: string; quantity: number }>;
  bundles?: Array<{
    bundleId: string;
    quantity: number;
    selectedVariants: Array<{ productId: string; variantId: string }>;
  }>;
  couponCode?: string;
};

const orderInclude = {
  items: {
    include: {
      variant: {
        select: {
          name: true,
          product: { select: { name: true } },
        },
      },
    },
  },
} as const;

export class OrderRepository {
  public constructor(private readonly db: PrismaClient) {}

  public findByIdempotencyKey(idempotencyKey: string) {
    return this.db.order.findUnique({
      where: { idempotencyKey },
      include: orderInclude,
    });
  }

  public findById(id: string) {
    return this.db.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  public listByCustomerId(customerId: string) {
    return this.db.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    });
  }

  public async listForAdmin(params: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 24;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: orderInclude,
      }),
      this.db.order.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  public async updateStatus(
    id: string,
    data: {
      status: OrderStatus;
      courierName?: string | null;
      trackingNumber?: string | null;
    },
    actorId?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }
      const allowedNext: Record<string, string[]> = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["PROCESSING", "CANCELLED"],
        PROCESSING: ["SHIPPED", "CANCELLED"],
        SHIPPED: ["DELIVERED", "RETURNED"],
        DELIVERED: ["RETURNED"],
        CANCELLED: [],
        RETURNED: [],
      };
      if (data.status !== existing.status && !allowedNext[existing.status]?.includes(data.status)) {
        throw new Error("INVALID_STATUS_TRANSITION");
      }

      const isCurrentlyRestocked = existing.status === "CANCELLED" || existing.status === "RETURNED";
      const isTargetRestocked = data.status === "CANCELLED" || data.status === "RETURNED";

      if (!isCurrentlyRestocked && isTargetRestocked && existing.status !== data.status) {
        // Order was active and is now cancelled or returned -> restore stock atomically
        for (const item of existing.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({ data: { variantId: item.variantId, type: data.status === "CANCELLED" ? "CANCEL" : "RETURN", quantityDelta: item.quantity, reference: `${data.status.toLowerCase()}:${existing.id}:${item.id}`, reason: `Order ${existing.id} ${data.status.toLowerCase()}`, actorId } });
        }
      } else if (isCurrentlyRestocked && !isTargetRestocked) {
        // Order was cancelled or returned and is being reactivated -> decrement stock if available
        for (const item of existing.items) {
          const res = await tx.productVariant.updateMany({
            where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (res.count !== 1) {
            throw new CheckoutUnavailableError("Insufficient stock to reactivate order");
          }
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              type: "SALE",
              quantityDelta: -item.quantity,
              reference: `reactivate:${existing.id}:${item.id}:${randomUUID()}`,
              reason: `Order ${existing.id} reactivated to ${data.status.toLowerCase()}`,
              actorId,
            },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: data.status,
          ...(existing.status !== data.status && data.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(existing.status !== data.status && data.status === "RETURNED" ? { returnedAt: new Date() } : {}),
          courierName: data.courierName === undefined ? undefined : data.courierName,
          trackingNumber: data.trackingNumber === undefined ? undefined : data.trackingNumber,
        },
        include: orderInclude,
      });
      if (existing.status !== data.status) {
        await tx.orderEvent.create({ data: { orderId: id, actorId, fromStatus: existing.status, toStatus: data.status } });
      }
      return updated;
    }, { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel });
  }

  public createAtomically(input: CreateOrderRepoInput) {
    const customerPhone = normalizeEgyptianPhone(input.customer.phone) ?? input.customer.phone;
    const directItems = input.items ?? [];
    const bundleInputs = input.bundles ?? [];
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      // 1. Collect all variant IDs needed across regular items and bundles
      const variantQtyMap = new Map<string, number>();

      for (const item of directItems) {
        const current = variantQtyMap.get(item.variantId) ?? 0;
        variantQtyMap.set(item.variantId, current + item.quantity);
      }

      // 2. Fetch and validate bundles if any
      const cartBundlesPricing: CartBundlePricingInput[] = [];
      const bundleIds = bundleInputs.map((b) => b.bundleId);

      const bundlesFromDb = bundleIds.length > 0
        ? await tx.bundle.findMany({
            where: {
              id: { in: bundleIds },
              isActive: true,
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
              ],
            },
            include: {
              items: {
                include: {
                  product: {
                    select: { id: true, status: true },
                  },
                },
              },
            },
          })
        : [];
      const bundlesById = new Map(bundlesFromDb.map((b) => [b.id, b]));

      if (bundleIds.length > 0) {
        for (const bInput of bundleInputs) {
          const bundleRecord = bundlesById.get(bInput.bundleId);
          if (!bundleRecord) {
            throw new CheckoutUnavailableError(`Bundle ${bInput.bundleId} is no longer available.`);
          }

          // Verify every required component product in bundle has a selected variant
          const selectedByProduct = new Map(bInput.selectedVariants.map((sv) => [sv.productId, sv.variantId]));

          for (const item of bundleRecord.items) {
            if (item.product.status !== "ACTIVE") {
              throw new CheckoutUnavailableError(`Product in bundle ${bundleRecord.title} is inactive.`);
            }

            const chosenVariantId = selectedByProduct.get(item.productId) ?? item.defaultVariantId;
            if (!chosenVariantId) {
              throw new CheckoutUnavailableError(`Missing variant selection for product in bundle ${bundleRecord.title}.`);
            }

            const totalQtyForComponent = item.quantity * bInput.quantity;
            const current = variantQtyMap.get(chosenVariantId) ?? 0;
            variantQtyMap.set(chosenVariantId, current + totalQtyForComponent);
          }
        }
      }

      // 3. Fetch all required variants from database with their products
      const allVariantIds = Array.from(variantQtyMap.keys());
      if (allVariantIds.length === 0) {
        throw new CheckoutUnavailableError("Order must contain at least one valid item or bundle.");
      }

      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: allVariantIds },
          product: { status: "ACTIVE" },
        },
        select: {
          id: true,
          productId: true,
          priceCents: true,
          costCents: true,
          stockQuantity: true,
          name: true,
          product: { select: { id: true, name: true, status: true } },
        },
      });

      if (variants.length !== allVariantIds.length) {
        throw new CheckoutUnavailableError("One or more items or variants are no longer available.");
      }

      const variantsMap = new Map(variants.map((v) => [v.id, v]));

      // 4. Validate ownership of selected variants in bundles
      if (bundleInputs.length > 0) {
        for (const bInput of bundleInputs) {
          const bundleRecord = bundlesById.get(bInput.bundleId);
          if (!bundleRecord) continue;

          const selectedByProduct = new Map(bInput.selectedVariants.map((sv) => [sv.productId, sv.variantId]));
          const componentsPricing: CartBundlePricingInput["components"] = [];

          for (const item of bundleRecord.items) {
            const variantId = selectedByProduct.get(item.productId) ?? item.defaultVariantId;
            if (!variantId) continue;

            const variant = variantsMap.get(variantId);
            if (!variant || variant.productId !== item.productId) {
              throw new CheckoutUnavailableError(`Variant ${variantId} does not belong to product ${item.productId}.`);
            }

            componentsPricing.push({
              productId: item.productId,
              variantId: variant.id,
              unitPriceCents: variant.priceCents,
              quantityPerBundle: item.quantity,
            });
          }

          cartBundlesPricing.push({
            bundle: {
              id: bundleRecord.id,
              internalName: bundleRecord.name,
              publicTitle: bundleRecord.title,
              fixedPriceCents: bundleRecord.priceCents,
              discountCents: bundleRecord.discountValue,
              isFreeShipping: bundleRecord.freeShipping,
              startsAt: bundleRecord.startsAt,
              endsAt: bundleRecord.endsAt,
              isActive: bundleRecord.isActive,
            },
            components: componentsPricing,
            quantity: bInput.quantity,
          });
        }
      }

      // 5. Build regular items pricing input
      const cartItemsPricing: CartItemPricingInput[] = directItems.map((item) => {
        const v = variantsMap.get(item.variantId)!;
        return {
          productId: v.productId ?? "",
          variantId: v.id,
          unitPriceCents: v.priceCents,
          quantity: item.quantity,
        };
      });

      // 6. Fetch active offers for all relevant product IDs
      const allProductIds = Array.from(new Set(variants.map((v) => v.productId).filter(Boolean)));
      const rawOffers = tx.productOffer
        ? await tx.productOffer.findMany({
            where: {
              isActive: true,
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                {
                  products: {
                    some: { productId: { in: allProductIds } },
                  },
                },
              ],
            },
            include: {
              products: { select: { productId: true } },
            },
          })
        : [];

      const offersPricing: ProductOfferEvaluationInput[] = rawOffers.map((o) => ({
        id: o.id,
        name: o.title,
        discountType: o.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
        discountValue: o.discountValue,
        maxDiscountCents: o.maxDiscountCents,
        isFreeShipping: o.freeShipping,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        isActive: o.isActive,
        productIds: o.products.map((p) => p.productId),
      }));

      // 7. Fetch coupon if provided
      let couponInput = null;
      let appliedCouponRecord = null;
      if (input.couponCode) {
        appliedCouponRecord = await tx.coupon.findFirst({
          where: { code: input.couponCode.toUpperCase() },
        });
        if (appliedCouponRecord) {
          couponInput = {
            code: appliedCouponRecord.code,
            discountType: appliedCouponRecord.discountType,
            discountValue: appliedCouponRecord.discountValue,
            minSubtotalCents: appliedCouponRecord.minSubtotalCents,
            maxDiscountCents: appliedCouponRecord.maxDiscountCents,
            usageLimit: appliedCouponRecord.usageLimit,
            usageCount: appliedCouponRecord.usageCount,
            startsAt: appliedCouponRecord.startsAt,
            endsAt: appliedCouponRecord.endsAt,
            isActive: appliedCouponRecord.isActive,
          };
        }
      }

      // 8. Run master pure pricing calculation (no shipping fee calculation)
      const storeSettings = await tx.storeSetting.findUnique({ where: { id: "global" } });
      if (storeSettings?.dailyOrderLimitPerPhone) {
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const dailyOrders = await tx.order.count({ where: { customerPhone, createdAt: { gte: startOfDay }, status: { not: "CANCELLED" } } });
        if (dailyOrders >= storeSettings.dailyOrderLimitPerPhone) throw new CheckoutUnavailableError("Daily order limit reached for this phone.");
      }
      const cartTotals = calculateCartTotals({
        items: cartItemsPricing,
        bundles: cartBundlesPricing,
        offers: offersPricing,
        coupon: couponInput,
        baseShippingFeeCents: 0,
        allowCouponsWithOffers: storeSettings?.allowCouponsWithOffers,
        now,
      });

      // 9. Atomically decrement stock for all required variants
      for (const [variantId, reqQty] of variantQtyMap.entries()) {
        const updateResult = await tx.productVariant.updateMany({
          where: { id: variantId, stockQuantity: { gte: reqQty } },
          data: { stockQuantity: { decrement: reqQty } },
        });
        if (updateResult.count !== 1) {
          const v = variantsMap.get(variantId);
          throw new CheckoutUnavailableError(`Insufficient stock for item: ${v?.name ?? variantId}`);
        }
      }

      // 10. Update coupon usage count if coupon discount was applied
      let appliedCouponId: string | undefined = undefined;
      let appliedCouponCode: string | undefined = undefined;
      if (appliedCouponRecord && cartTotals.couponDiscountCents > 0) {
        appliedCouponId = appliedCouponRecord.id;
        appliedCouponCode = appliedCouponRecord.code;
        await tx.coupon.update({
          where: { id: appliedCouponRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      } else if (appliedCouponRecord && cartTotals.freeShippingReasons.includes("COUPON")) {
        appliedCouponId = appliedCouponRecord.id;
        appliedCouponCode = appliedCouponRecord.code;
        await tx.coupon.update({
          where: { id: appliedCouponRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 11. Create order record with snapshots
      const order = await tx.order.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          customerId: input.customerId ?? null,
          status: "PENDING",
          customerName: input.customer.fullName,
          customerPhone,
          customerEmail: input.customer.email ?? null,
          governorate: input.shippingAddress.governorate,
          cityArea: input.shippingAddress.cityArea,
          detailedAddress: input.shippingAddress.detailedAddress,
          landmark: input.shippingAddress.landmark ?? null,
          subtotalCents: cartTotals.subtotalAfterOffersAndBundlesCents,
          shippingFeeCents: cartTotals.shippingFeeCents,
          discountCents: cartTotals.totalDiscountCents,
          offerDiscountCents: cartTotals.offerDiscountCents,
          bundleDiscountCents: cartTotals.bundleDiscountCents,
          couponDiscountCents: cartTotals.couponDiscountCents,
          totalCents: cartTotals.totalCents,
          couponId: appliedCouponId,
          couponCode: appliedCouponCode,
          items: {
            create: cartTotals.lineItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPriceCents: item.finalUnitPriceCents,
              unitCostCents: variantsMap.get(item.variantId)?.costCents ?? null,
              originalPriceCents: item.originalUnitPriceCents,
              discountCents: item.totalDiscountCents,
              offerId: item.offerId ?? null,
              bundleId: item.bundleId ?? null,
              bundleName: item.bundleName ?? null,
            })),
          },
        },
        include: orderInclude,
      });
      await tx.orderEvent.create({ data: { orderId: order.id, toStatus: "PENDING", metadata: { source: "checkout" } } });
      for (const [variantId, quantity] of variantQtyMap) {
        await tx.stockMovement.create({ data: { variantId, type: "SALE", quantityDelta: -quantity, reference: `sale:${order.id}:${variantId}`, reason: `Order ${order.id}` } });
      }
      return order;
    }, { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel });
  }
}
