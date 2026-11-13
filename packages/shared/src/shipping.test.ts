import { describe, expect, it } from "vitest";
import { calculateShippingFeeCents, EGYPTIAN_GOVERNORATES, isEgyptianGovernorate } from "./shipping.js";

describe("shipping calculation & governorates", () => {
  it("contains all 27 official Egyptian governorates", () => {
    expect(EGYPTIAN_GOVERNORATES).toHaveLength(27);
    expect(isEgyptianGovernorate("القاهرة")).toBe(true);
    expect(isEgyptianGovernorate("الإسكندرية")).toBe(true);
    expect(isEgyptianGovernorate("أسوان")).toBe(true);
    expect(isEgyptianGovernorate("Unknown City")).toBe(false);
  });

  it("calculates accurate integer shipping fees in piasters", () => {
    expect(calculateShippingFeeCents("القاهرة")).toBe(4000);
    expect(calculateShippingFeeCents("الجيزة")).toBe(4000);
    expect(calculateShippingFeeCents("الإسكندرية")).toBe(5000);
    expect(calculateShippingFeeCents("السويس")).toBe(5500);
    expect(calculateShippingFeeCents("أسوان")).toBe(6500);
    expect(calculateShippingFeeCents("مطروح")).toBe(8000);
    expect(calculateShippingFeeCents("unknown")).toBe(5000);
  });
});
