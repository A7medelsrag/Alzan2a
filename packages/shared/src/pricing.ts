import { formatEGP } from "./money.js";
import type { DiscountType } from "./schemas.js";

export type { DiscountType };

export const FREE_SHIPPING_THRESHOLD_CENTS = 100_000; // 1,000 EGP

export interface CouponEvaluationInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minSubtotalCents: number;
  maxDiscountCents?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive: boolean;
}

export type CouponValidationResult =
  | {
      isValid: true;
      discountCents: number;
      code: string;
      message: string;
      discountType: DiscountType;
      discountValue: number;
    }
  | {
      isValid: false;
      discountCents: 0;
      code: string;
      message: string;
      discountType?: DiscountType;
      discountValue?: number;
    };

export function evaluateCoupon(
  coupon: CouponEvaluationInput,
  subtotalCents: number,
  shippingFeeCents: number,
  now: Date = new Date(),
): CouponValidationResult {
  if (!coupon.isActive) {
    return {
      isValid: false,
      discountCents: 0,
      code: coupon.code,
      message: "كود الخصم غير مفعّل حالياً.",
    };
  }

  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return {
      isValid: false,
      discountCents: 0,
      code: coupon.code,
      message: "كود الخصم لم يبدأ بعد.",
    };
  }

  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    return {
      isValid: false,
      discountCents: 0,
      code: coupon.code,
      message: "عذرًا، كود الخصم منتهي الصلاحية.",
    };
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
    return {
      isValid: false,
      discountCents: 0,
      code: coupon.code,
      message: "تم استنفاذ الحد الأقصى لاستخدام كود الخصم.",
    };
  }

  if (subtotalCents < coupon.minSubtotalCents) {
    return {
      isValid: false,
      discountCents: 0,
      code: coupon.code,
      message: `الحد الأدنى لقيمة الطلب لتطبيق هذا الكود هو ${formatEGP(coupon.minSubtotalCents)}.`,
    };
  }

  let discountCents = 0;

  switch (coupon.discountType) {
    case "PERCENTAGE": {
      discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
      if (coupon.maxDiscountCents !== null && coupon.maxDiscountCents !== undefined && discountCents > coupon.maxDiscountCents) {
        discountCents = coupon.maxDiscountCents;
      }
      break;
    }
    case "FIXED_AMOUNT": {
      discountCents = Math.min(coupon.discountValue, subtotalCents);
      break;
    }
    case "FREE_SHIPPING": {
      discountCents = shippingFeeCents;
      break;
    }
  }

  discountCents = Math.max(0, Math.min(discountCents, subtotalCents + shippingFeeCents));

  return {
    isValid: true,
    discountCents,
    code: coupon.code,
    message: "تم تطبيق الخصم بنجاح!",
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };
}

// ================= Product Offer Evaluation =================

export interface ProductOfferEvaluationInput {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountCents?: number | null;
  isFreeShipping: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive: boolean;
  productIds: string[];
}

export interface EvaluatedItemOffer {
  offerId: string;
  offerName: string;
  originalUnitPriceCents: number;
  discountPerUnitCents: number;
  finalUnitPriceCents: number;
  totalDiscountCents: number;
  isFreeShipping: boolean;
}

export function evaluateItemOffer(
  productId: string,
  unitPriceCents: number,
  quantity: number,
  offers: ProductOfferEvaluationInput[],
  now: Date = new Date(),
): EvaluatedItemOffer | null {
  const applicableOffers = offers.filter((o) => {
    if (!o.isActive) return false;
    if (o.startsAt && new Date(o.startsAt) > now) return false;
    if (o.endsAt && new Date(o.endsAt) < now) return false;
    return o.productIds.includes(productId);
  });

  if (applicableOffers.length === 0) return null;

  let bestOffer: ProductOfferEvaluationInput | null = null;
  let maxDiscountPerUnit = 0;

  for (const offer of applicableOffers) {
    let discount = 0;
    if (offer.discountType === "PERCENTAGE") {
      discount = Math.round((unitPriceCents * offer.discountValue) / 100);
      if (offer.maxDiscountCents !== null && offer.maxDiscountCents !== undefined && discount > offer.maxDiscountCents) {
        discount = offer.maxDiscountCents;
      }
    } else {
      discount = offer.discountValue;
    }
    discount = Math.max(0, Math.min(discount, unitPriceCents));

    if (discount > maxDiscountPerUnit || !bestOffer) {
      maxDiscountPerUnit = discount;
      bestOffer = offer;
    }
  }

  if (!bestOffer) return null;

  return {
    offerId: bestOffer.id,
    offerName: bestOffer.name,
    originalUnitPriceCents: unitPriceCents,
    discountPerUnitCents: maxDiscountPerUnit,
    finalUnitPriceCents: unitPriceCents - maxDiscountPerUnit,
    totalDiscountCents: maxDiscountPerUnit * quantity,
    isFreeShipping: bestOffer.isFreeShipping,
  };
}

// ================= Bundle Evaluation =================

export interface BundleEvaluationInput {
  id: string;
  internalName: string;
  publicTitle: string;
  fixedPriceCents?: number | null;
  discountCents?: number | null;
  isFreeShipping: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive: boolean;
}

export interface EvaluatedBundleComponent {
  productId: string;
  variantId: string;
  unitPriceCents: number;
  quantityPerBundle: number;
}

export interface EvaluatedBundle {
  bundleId: string;
  bundleName: string;
  quantity: number;
  componentsOriginalTotalCents: number;
  finalBundlePriceCents: number;
  discountPerBundleCents: number;
  totalOriginalCents: number;
  totalFinalCents: number;
  totalDiscountCents: number;
  isFreeShipping: boolean;
}

export function evaluateBundle(
  bundle: BundleEvaluationInput,
  components: EvaluatedBundleComponent[],
  bundleQuantity: number,
  now: Date = new Date(),
): EvaluatedBundle | null {
  if (!bundle.isActive) return null;
  if (bundle.startsAt && new Date(bundle.startsAt) > now) return null;
  if (bundle.endsAt && new Date(bundle.endsAt) < now) return null;

  const componentsOriginalTotalCents = components.reduce(
    (sum, c) => sum + c.unitPriceCents * c.quantityPerBundle,
    0,
  );

  let finalBundlePriceCents = componentsOriginalTotalCents;
  let discountPerBundleCents = 0;

  if (bundle.fixedPriceCents !== null && bundle.fixedPriceCents !== undefined) {
    finalBundlePriceCents = Math.min(bundle.fixedPriceCents, componentsOriginalTotalCents);
    discountPerBundleCents = Math.max(0, componentsOriginalTotalCents - bundle.fixedPriceCents);
  } else if (bundle.discountCents !== null && bundle.discountCents !== undefined) {
    discountPerBundleCents = Math.min(bundle.discountCents, componentsOriginalTotalCents);
    finalBundlePriceCents = Math.max(0, componentsOriginalTotalCents - discountPerBundleCents);
  }

  return {
    bundleId: bundle.id,
    bundleName: bundle.publicTitle,
    quantity: bundleQuantity,
    componentsOriginalTotalCents,
    finalBundlePriceCents,
    discountPerBundleCents,
    totalOriginalCents: componentsOriginalTotalCents * bundleQuantity,
    totalFinalCents: finalBundlePriceCents * bundleQuantity,
    totalDiscountCents: discountPerBundleCents * bundleQuantity,
    isFreeShipping: bundle.isFreeShipping,
  };
}

// ================= Master Cart Calculation =================

export interface CartItemPricingInput {
  productId: string;
  variantId: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CartBundlePricingInput {
  bundle: BundleEvaluationInput;
  components: EvaluatedBundleComponent[];
  quantity: number;
}

export interface CartPricingCalculationInput {
  items?: CartItemPricingInput[];
  bundles?: CartBundlePricingInput[];
  offers?: ProductOfferEvaluationInput[];
  coupon?: CouponEvaluationInput | null;
  baseShippingFeeCents: number;
  freeShippingThresholdCents?: number;
  allowCouponsWithOffers?: boolean;
  now?: Date;
}

export interface EvaluatedLineItem {
  productId: string;
  variantId: string;
  quantity: number;
  originalUnitPriceCents: number;
  unitDiscountCents: number;
  finalUnitPriceCents: number;
  totalOriginalCents: number;
  totalDiscountCents: number;
  totalFinalCents: number;
  offerId?: string | null;
  offerName?: string | null;
  bundleId?: string | null;
  bundleName?: string | null;
}

export interface CartTotalsResult {
  lineItems: EvaluatedLineItem[];
  bundles: EvaluatedBundle[];
  originalSubtotalCents: number;
  offerDiscountCents: number;
  bundleDiscountCents: number;
  subtotalAfterOffersAndBundlesCents: number;
  couponDiscountCents: number;
  totalDiscountCents: number;
  baseShippingFeeCents: number;
  shippingFeeCents: number;
  isFreeShipping: boolean;
  freeShippingReasons: Array<"THRESHOLD" | "OFFER" | "BUNDLE" | "COUPON">;
  totalCents: number;
}

export function calculateCartTotals(input: CartPricingCalculationInput): CartTotalsResult {
  const now = input.now ?? new Date();
  const offers = input.offers ?? [];
  const items = input.items ?? [];
  const bundlesInput = input.bundles ?? [];
  const baseShippingFeeCents = Math.max(0, input.baseShippingFeeCents);

  const evaluatedLineItems: EvaluatedLineItem[] = [];
  let itemsOriginalSubtotal = 0;
  let itemsOfferDiscount = 0;
  let hasFreeShippingOffer = false;

  // 1. Process regular items & product offers
  for (const item of items) {
    const originalUnitPrice = Math.max(0, item.unitPriceCents);
    const qty = Math.max(1, item.quantity);
    const itemOriginalTotal = originalUnitPrice * qty;
    itemsOriginalSubtotal += itemOriginalTotal;

    const offerEval = evaluateItemOffer(item.productId, originalUnitPrice, qty, offers, now);

    let unitDiscount = 0;
    let totalDiscount = 0;
    let offerId: string | null = null;
    let offerName: string | null = null;

    if (offerEval) {
      unitDiscount = offerEval.discountPerUnitCents;
      totalDiscount = offerEval.totalDiscountCents;
      offerId = offerEval.offerId;
      offerName = offerEval.offerName;
      if (offerEval.isFreeShipping) {
        hasFreeShippingOffer = true;
      }
    }

    itemsOfferDiscount += totalDiscount;
    const finalUnitPrice = originalUnitPrice - unitDiscount;
    const totalFinal = finalUnitPrice * qty;

    evaluatedLineItems.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: qty,
      originalUnitPriceCents: originalUnitPrice,
      unitDiscountCents: unitDiscount,
      finalUnitPriceCents: finalUnitPrice,
      totalOriginalCents: itemOriginalTotal,
      totalDiscountCents: totalDiscount,
      totalFinalCents: totalFinal,
      offerId,
      offerName,
    });
  }

  // 2. Process bundles
  const evaluatedBundles: EvaluatedBundle[] = [];
  let bundlesOriginalSubtotal = 0;
  let bundlesDiscount = 0;
  let hasFreeShippingBundle = false;

  for (const bInput of bundlesInput) {
    const bundleEval = evaluateBundle(bInput.bundle, bInput.components, bInput.quantity, now);
    if (!bundleEval) continue;

    evaluatedBundles.push(bundleEval);
    bundlesOriginalSubtotal += bundleEval.totalOriginalCents;
    bundlesDiscount += bundleEval.totalDiscountCents;

    if (bundleEval.isFreeShipping) {
      hasFreeShippingBundle = true;
    }

    // Add bundle component line items
    for (const comp of bInput.components) {
      const compOriginalUnitPrice = Math.max(0, comp.unitPriceCents);
      const totalCompQty = comp.quantityPerBundle * bundleEval.quantity;
      const compOriginalTotal = compOriginalUnitPrice * totalCompQty;

      // Distribute bundle discount proportionally or record it on line item
      const compFraction =
        bundleEval.componentsOriginalTotalCents > 0
          ? (compOriginalUnitPrice * comp.quantityPerBundle) / bundleEval.componentsOriginalTotalCents
          : 0;
      const compTotalDiscount = Math.round(bundleEval.totalDiscountCents * compFraction);
      const compUnitDiscount = totalCompQty > 0 ? Math.round(compTotalDiscount / totalCompQty) : 0;

      evaluatedLineItems.push({
        productId: comp.productId,
        variantId: comp.variantId,
        quantity: totalCompQty,
        originalUnitPriceCents: compOriginalUnitPrice,
        unitDiscountCents: compUnitDiscount,
        finalUnitPriceCents: Math.max(0, compOriginalUnitPrice - compUnitDiscount),
        totalOriginalCents: compOriginalTotal,
        totalDiscountCents: compTotalDiscount,
        totalFinalCents: Math.max(0, compOriginalTotal - compTotalDiscount),
        bundleId: bundleEval.bundleId,
        bundleName: bundleEval.bundleName,
      });
    }
  }

  const originalSubtotalCents = itemsOriginalSubtotal + bundlesOriginalSubtotal;
  const subtotalAfterOffersAndBundlesCents = Math.max(
    0,
    originalSubtotalCents - itemsOfferDiscount - bundlesDiscount,
  );

  // 3. Free shipping evaluation (pre-coupon conditions)
  const freeShippingReasons: Array<"THRESHOLD" | "OFFER" | "BUNDLE" | "COUPON"> = [];

  if (subtotalAfterOffersAndBundlesCents >= (input.freeShippingThresholdCents ?? FREE_SHIPPING_THRESHOLD_CENTS)) {
    freeShippingReasons.push("THRESHOLD");
  }
  if (hasFreeShippingOffer) {
    freeShippingReasons.push("OFFER");
  }
  if (hasFreeShippingBundle) {
    freeShippingReasons.push("BUNDLE");
  }

  // 4. Coupon evaluation
  let couponDiscountCents = 0;
  if (input.coupon && (input.allowCouponsWithOffers !== false || (itemsOfferDiscount === 0 && bundlesDiscount === 0))) {
    const couponRes = evaluateCoupon(
      input.coupon,
      subtotalAfterOffersAndBundlesCents,
      baseShippingFeeCents,
      now,
    );

    if (couponRes.isValid) {
      if (couponRes.discountType === "FREE_SHIPPING") {
        if (!freeShippingReasons.includes("COUPON")) {
          freeShippingReasons.push("COUPON");
        }
      } else {
        couponDiscountCents = Math.min(couponRes.discountCents, subtotalAfterOffersAndBundlesCents);
      }
    }
  }

  const isFreeShipping = freeShippingReasons.length > 0;
  const shippingFeeCents = isFreeShipping ? 0 : baseShippingFeeCents;

  const totalDiscountCents = itemsOfferDiscount + bundlesDiscount + couponDiscountCents;
  const payableGoods = Math.max(0, subtotalAfterOffersAndBundlesCents - couponDiscountCents);
  const totalCents = payableGoods + shippingFeeCents;

  return {
    lineItems: evaluatedLineItems,
    bundles: evaluatedBundles,
    originalSubtotalCents,
    offerDiscountCents: itemsOfferDiscount,
    bundleDiscountCents: bundlesDiscount,
    subtotalAfterOffersAndBundlesCents,
    couponDiscountCents,
    totalDiscountCents,
    baseShippingFeeCents,
    shippingFeeCents,
    isFreeShipping,
    freeShippingReasons,
    totalCents,
  };
}
