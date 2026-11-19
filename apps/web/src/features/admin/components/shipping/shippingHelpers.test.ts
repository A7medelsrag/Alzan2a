import { describe, expect, it } from "vitest";
import {
  centsToInputString,
  computeShippingStats,
  formatAverageDays,
  formatShippingApiError,
  formatShippingPriceEgp,
  isShippingDraftDirty,
  parseShippingDraftPayload,
  toShippingDraft,
  validateShippingDraft,
} from "./shippingHelpers";

describe("shipping management helpers", () => {
  it("converts cents to clean input strings and drafts", () => {
    expect(centsToInputString(0)).toBe("0");
    expect(centsToInputString(4000)).toBe("40");
    expect(centsToInputString(4550)).toBe("45.5");
    expect(centsToInputString(4525)).toBe("45.25");

    const draft = toShippingDraft({
      governorate: "القاهرة",
      priceCents: 4000,
      minDeliveryDays: 1,
      maxDeliveryDays: 2,
      isEnabled: true,
    });
    expect(draft).toEqual({
      governorate: "القاهرة",
      priceInput: "40",
      minDaysInput: "1",
      maxDaysInput: "2",
      isEnabled: true,
    });
  });

  it("validates shipping price and delivery durations according to backend rules", () => {
    expect(
      validateShippingDraft({
        governorate: "القاهرة",
        priceInput: "0",
        minDaysInput: "1",
        maxDaysInput: "2",
        isEnabled: true,
      }).isValid,
    ).toBe(true);

    const negativePrice = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "-10",
      minDaysInput: "1",
      maxDaysInput: "2",
      isEnabled: true,
    });
    expect(negativePrice.isValid).toBe(false);
    expect(negativePrice.priceError).toBeTruthy();

    const emptyPrice = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "",
      minDaysInput: "1",
      maxDaysInput: "2",
      isEnabled: true,
    });
    expect(emptyPrice.isValid).toBe(false);
    expect(emptyPrice.priceError).toBeTruthy();

    const tooManyDecimals = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "40.123",
      minDaysInput: "1",
      maxDaysInput: "2",
      isEnabled: true,
    });
    expect(tooManyDecimals.isValid).toBe(false);
    expect(tooManyDecimals.priceError).toBeTruthy();

    const nonIntMin = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "40",
      minDaysInput: "1.5",
      maxDaysInput: "3",
      isEnabled: true,
    });
    expect(nonIntMin.isValid).toBe(false);
    expect(nonIntMin.minDaysError).toBeTruthy();

    const zeroMin = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "40",
      minDaysInput: "0",
      maxDaysInput: "3",
      isEnabled: true,
    });
    expect(zeroMin.isValid).toBe(false);
    expect(zeroMin.minDaysError).toBeTruthy();

    const minGreaterThanMax = validateShippingDraft({
      governorate: "القاهرة",
      priceInput: "40",
      minDaysInput: "5",
      maxDaysInput: "3",
      isEnabled: true,
    });
    expect(minGreaterThanMax.isValid).toBe(false);
    expect(minGreaterThanMax.maxDaysError).toBeTruthy();
  });

  it("parses valid payloads accurately without floating point drift", () => {
    expect(
      parseShippingDraftPayload({
        governorate: "الجيزة",
        priceInput: "19.99",
        minDaysInput: "2",
        maxDaysInput: "4",
        isEnabled: false,
      }),
    ).toEqual({
      priceCents: 1999,
      minDeliveryDays: 2,
      maxDeliveryDays: 4,
      isEnabled: false,
    });

    expect(
      parseShippingDraftPayload({
        governorate: "الجيزة",
        priceInput: "",
        minDaysInput: "2",
        maxDaysInput: "4",
        isEnabled: true,
      }),
    ).toBeNull();
  });

  it("detects dirty drafts accurately", () => {
    const saved = {
      governorate: "أسوان",
      priceCents: 6500,
      minDeliveryDays: 3,
      maxDeliveryDays: 5,
      isEnabled: true,
    };

    expect(
      isShippingDraftDirty(
        {
          governorate: "أسوان",
          priceInput: "65.00",
          minDaysInput: "3",
          maxDaysInput: "5",
          isEnabled: true,
        },
        saved,
      ),
    ).toBe(false);

    expect(
      isShippingDraftDirty(
        {
          governorate: "أسوان",
          priceInput: "70",
          minDaysInput: "3",
          maxDaysInput: "5",
          isEnabled: true,
        },
        saved,
      ),
    ).toBe(true);

    expect(
      isShippingDraftDirty(
        {
          governorate: "أسوان",
          priceInput: "",
          minDaysInput: "3",
          maxDaysInput: "5",
          isEnabled: true,
        },
        saved,
      ),
    ).toBe(true);
  });

  it("computes real statistics dynamically from shipping rates", () => {
    const stats = computeShippingStats([
      { governorate: "القاهرة", priceInput: "40", minDaysInput: "1", maxDaysInput: "2", isEnabled: true },
      { governorate: "أسوان", priceInput: "65", minDaysInput: "3", maxDaysInput: "5", isEnabled: true },
      { governorate: "مطروح", priceInput: "20", minDaysInput: "4", maxDaysInput: "6", isEnabled: false },
    ]);

    expect(stats).toEqual({
      totalGovernorates: 3,
      enabledCount: 2,
      disabledCount: 1,
      minPriceCents: 4000,
      maxPriceCents: 6500,
      avgMinDays: 2,
      avgMaxDays: 3.5,
    });

    expect(formatShippingPriceEgp(4000)).toBe("40 جنيه");
    expect(formatShippingPriceEgp(4050)).toBe("40.50 جنيه");
    expect(formatAverageDays(2, 3.5)).toBe("2 - 3.5 يوم");
    expect(formatAverageDays(null, null)).toBe("—");
  });

  it("handles empty and all-disabled statistics gracefully", () => {
    expect(computeShippingStats([])).toEqual({
      totalGovernorates: 0,
      enabledCount: 0,
      disabledCount: 0,
      minPriceCents: null,
      maxPriceCents: null,
      avgMinDays: null,
      avgMaxDays: null,
    });

    expect(
      computeShippingStats([
        { governorate: "القاهرة", priceInput: "40", minDaysInput: "1", maxDaysInput: "2", isEnabled: false },
      ]),
    ).toEqual({
      totalGovernorates: 1,
      enabledCount: 0,
      disabledCount: 1,
      minPriceCents: 4000,
      maxPriceCents: 4000,
      avgMinDays: 1,
      avgMaxDays: 2,
    });
  });

  it("formats known API error codes into clear Arabic messages", () => {
    expect(formatShippingApiError(new Error("SHIPPING_DAYS_INVALID"), "القاهرة")).toContain("القاهرة");
    expect(formatShippingApiError(new Error("ADMIN_FORBIDDEN"))).toContain("صلاحية");
  });
});
