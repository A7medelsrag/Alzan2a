import { describe, expect, it } from "vitest";
import {
  calculateCartTotals,
  evaluateBundle,
  evaluateCoupon,
  evaluateItemOffer,
  FREE_SHIPPING_THRESHOLD_CENTS,
  type BundleEvaluationInput,
  type CouponEvaluationInput,
  type ProductOfferEvaluationInput,
} from "./pricing.js";

describe("Pricing Engine & Coupon Evaluation", () => {
  const basePercentageCoupon: CouponEvaluationInput = {
    code: "SAVE10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minSubtotalCents: 20000, // 200 EGP
    maxDiscountCents: 5000,  // max 50 EGP
    usageLimit: 100,
    usageCount: 10,
    isActive: true,
  };

  it("calculates percentage discount accurately within max cap", () => {
    const res = evaluateCoupon(basePercentageCoupon, 30000, 4000);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountCents).toBe(3000);
    }
  });

  it("enforces max discount cap on large orders", () => {
    const res = evaluateCoupon(basePercentageCoupon, 100000, 4000);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountCents).toBe(5000);
    }
  });

  it("rejects coupon if subtotal is below minimum", () => {
    const res = evaluateCoupon(basePercentageCoupon, 15000, 4000);
    expect(res.isValid).toBe(false);
    expect(res.discountCents).toBe(0);
    expect(res.message).toContain("الحد الأدنى");
  });

  it("handles fixed amount coupons", () => {
    const fixedCoupon: CouponEvaluationInput = {
      code: "FLAT50",
      discountType: "FIXED_AMOUNT",
      discountValue: 5000, // 50 EGP
      minSubtotalCents: 10000,
      usageCount: 0,
      isActive: true,
    };

    const res = evaluateCoupon(fixedCoupon, 25000, 4000);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountCents).toBe(5000);
    }
  });

  it("handles free shipping coupons", () => {
    const freeShipCoupon: CouponEvaluationInput = {
      code: "FREESHIP",
      discountType: "FREE_SHIPPING",
      discountValue: 0,
      minSubtotalCents: 50000,
      usageCount: 0,
      isActive: true,
    };

    const res = evaluateCoupon(freeShipCoupon, 60000, 5500);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.discountCents).toBe(5500);
    }
  });

  it("rejects inactive, expired, or exhausted coupons", () => {
    const inactiveCoupon: CouponEvaluationInput = {
      ...basePercentageCoupon,
      isActive: false,
    };
    expect(evaluateCoupon(inactiveCoupon, 50000, 4000).isValid).toBe(false);

    const expiredCoupon: CouponEvaluationInput = {
      ...basePercentageCoupon,
      endsAt: new Date(Date.now() - 100000),
    };
    expect(evaluateCoupon(expiredCoupon, 50000, 4000).isValid).toBe(false);

    const exhaustedCoupon: CouponEvaluationInput = {
      ...basePercentageCoupon,
      usageLimit: 5,
      usageCount: 5,
    };
    expect(evaluateCoupon(exhaustedCoupon, 50000, 4000).isValid).toBe(false);
  });
});

describe("Product Offers Evaluation", () => {
  const percentageOffer: ProductOfferEvaluationInput = {
    id: "off-1",
    name: "Summer Sale 20%",
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountCents: 4000, // max 40 EGP per unit
    isFreeShipping: false,
    isActive: true,
    productIds: ["prod-1"],
  };

  const fixedOffer: ProductOfferEvaluationInput = {
    id: "off-2",
    name: "Save 30 EGP",
    discountType: "FIXED_AMOUNT",
    discountValue: 3000, // 30 EGP per unit
    isFreeShipping: true,
    isActive: true,
    productIds: ["prod-2"],
  };

  it("evaluates percentage offer with cap", () => {
    // 20% of 150 EGP (15000 cents) = 30 EGP (3000 cents), below 40 EGP cap
    const eval1 = evaluateItemOffer("prod-1", 15000, 2, [percentageOffer]);
    expect(eval1).not.toBeNull();
    expect(eval1?.discountPerUnitCents).toBe(3000);
    expect(eval1?.totalDiscountCents).toBe(6000);
    expect(eval1?.finalUnitPriceCents).toBe(12000);

    // 20% of 300 EGP (30000 cents) = 60 EGP (6000 cents), capped at 40 EGP (4000 cents)
    const eval2 = evaluateItemOffer("prod-1", 30000, 1, [percentageOffer]);
    expect(eval2?.discountPerUnitCents).toBe(4000);
  });

  it("evaluates fixed amount offer and respects product ids", () => {
    const eval1 = evaluateItemOffer("prod-2", 10000, 1, [percentageOffer, fixedOffer]);
    expect(eval1).not.toBeNull();
    expect(eval1?.offerId).toBe("off-2");
    expect(eval1?.discountPerUnitCents).toBe(3000);
    expect(eval1?.isFreeShipping).toBe(true);

    const nonMatching = evaluateItemOffer("prod-999", 10000, 1, [percentageOffer, fixedOffer]);
    expect(nonMatching).toBeNull();
  });
});

describe("Bundle Evaluation", () => {
  const fixedPriceBundle: BundleEvaluationInput = {
    id: "bun-1",
    internalName: "Suit Bundle",
    publicTitle: "طقم كلاسيك متكامل",
    fixedPriceCents: 45000, // 450 EGP
    isFreeShipping: false,
    isActive: true,
  };

  it("evaluates bundle with fixed price", () => {
    // Components: Blazer (350 EGP) + Pants (200 EGP) = 550 EGP (55000 cents)
    // Bundle fixed price = 450 EGP (45000 cents) -> Discount = 100 EGP (10000 cents)
    const components = [
      { productId: "p-blazer", variantId: "v-blazer", unitPriceCents: 35000, quantityPerBundle: 1 },
      { productId: "p-pants", variantId: "v-pants", unitPriceCents: 20000, quantityPerBundle: 1 },
    ];

    const result = evaluateBundle(fixedPriceBundle, components, 2);
    expect(result).not.toBeNull();
    expect(result?.componentsOriginalTotalCents).toBe(55000);
    expect(result?.finalBundlePriceCents).toBe(45000);
    expect(result?.discountPerBundleCents).toBe(10000);
    expect(result?.totalOriginalCents).toBe(110000);
    expect(result?.totalFinalCents).toBe(90000);
    expect(result?.totalDiscountCents).toBe(20000);
  });
});

describe("Complete Cart Totals & 4-Way Free Shipping", () => {
  const offerWithFreeShip: ProductOfferEvaluationInput = {
    id: "off-freeship",
    name: "Special Shoes Free Shipping",
    discountType: "FIXED_AMOUNT",
    discountValue: 1000,
    isFreeShipping: true,
    isActive: true,
    productIds: ["p-shoes"],
  };

  it("calculates regular cart totals without offers or coupon", () => {
    const res = calculateCartTotals({
      items: [{ productId: "p-1", variantId: "v-1", unitPriceCents: 20000, quantity: 2 }],
      baseShippingFeeCents: 4000,
    });

    expect(res.originalSubtotalCents).toBe(40000);
    expect(res.offerDiscountCents).toBe(0);
    expect(res.subtotalAfterOffersAndBundlesCents).toBe(40000);
    expect(res.shippingFeeCents).toBe(4000);
    expect(res.totalCents).toBe(44000);
    expect(res.isFreeShipping).toBe(false);
  });

  it("applies free shipping when subtotal >= 1,000 EGP (THRESHOLD)", () => {
    const res = calculateCartTotals({
      items: [{ productId: "p-1", variantId: "v-1", unitPriceCents: 100000, quantity: 1 }],
      baseShippingFeeCents: 5000,
    });

    expect(res.subtotalAfterOffersAndBundlesCents).toBe(FREE_SHIPPING_THRESHOLD_CENTS);
    expect(res.isFreeShipping).toBe(true);
    expect(res.freeShippingReasons).toContain("THRESHOLD");
    expect(res.shippingFeeCents).toBe(0);
    expect(res.totalCents).toBe(100000);
  });

  it("applies free shipping when cart contains free shipping offer (OFFER)", () => {
    const res = calculateCartTotals({
      items: [{ productId: "p-shoes", variantId: "v-shoes", unitPriceCents: 30000, quantity: 1 }],
      offers: [offerWithFreeShip],
      baseShippingFeeCents: 5000,
    });

    expect(res.offerDiscountCents).toBe(1000);
    expect(res.subtotalAfterOffersAndBundlesCents).toBe(29000);
    expect(res.isFreeShipping).toBe(true);
    expect(res.freeShippingReasons).toContain("OFFER");
    expect(res.shippingFeeCents).toBe(0);
    expect(res.totalCents).toBe(29000);
  });

  it("applies free shipping when cart contains free shipping bundle (BUNDLE)", () => {
    const freeShipBundle: BundleEvaluationInput = {
      id: "bun-free",
      internalName: "Winter Pack",
      publicTitle: "عرض الشتاء شحن مجاني",
      fixedPriceCents: 50000,
      isFreeShipping: true,
      isActive: true,
    };

    const res = calculateCartTotals({
      bundles: [
        {
          bundle: freeShipBundle,
          components: [{ productId: "p-1", variantId: "v-1", unitPriceCents: 60000, quantityPerBundle: 1 }],
          quantity: 1,
        },
      ],
      baseShippingFeeCents: 4500,
    });

    expect(res.isFreeShipping).toBe(true);
    expect(res.freeShippingReasons).toContain("BUNDLE");
    expect(res.shippingFeeCents).toBe(0);
    expect(res.totalCents).toBe(50000);
  });

  it("applies coupon after offers and bundles", () => {
    const percentageOffer: ProductOfferEvaluationInput = {
      id: "off-p",
      name: "10% off",
      discountType: "PERCENTAGE",
      discountValue: 10,
      isFreeShipping: false,
      isActive: true,
      productIds: ["p-1"],
    };

    const coupon: CouponEvaluationInput = {
      code: "EXTRA10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minSubtotalCents: 10000,
      isActive: true,
      usageCount: 0,
    };

    // Item: 2 units at 100 EGP (10000 cents) = 200 EGP (20000 cents)
    // Offer: 10% per unit = 10 EGP (1000 cents) discount each -> 20 EGP (2000 cents) total offer discount
    // Subtotal after offer = 180 EGP (18000 cents)
    // Coupon: 10% of 180 EGP = 18 EGP (1800 cents) discount
    // Payable goods = 180 - 18 = 162 EGP (16200 cents)
    // Shipping = 40 EGP (4000 cents)
    // Total = 202 EGP (20200 cents)
    const res = calculateCartTotals({
      items: [{ productId: "p-1", variantId: "v-1", unitPriceCents: 10000, quantity: 2 }],
      offers: [percentageOffer],
      coupon,
      baseShippingFeeCents: 4000,
    });

    expect(res.originalSubtotalCents).toBe(20000);
    expect(res.offerDiscountCents).toBe(2000);
    expect(res.subtotalAfterOffersAndBundlesCents).toBe(18000);
    expect(res.couponDiscountCents).toBe(1800);
    expect(res.shippingFeeCents).toBe(4000);
    expect(res.totalCents).toBe(20200);
  });
});
