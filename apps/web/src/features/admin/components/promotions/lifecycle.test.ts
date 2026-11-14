import { describe, expect, it } from "vitest";
import {
  fromDatetimeLocalValue,
  getPromotionStatus,
  toDatetimeLocalValue,
} from "./lifecycle";

describe("promotion lifecycle helpers", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("returns inactive when isActive is false", () => {
    expect(getPromotionStatus({ isActive: false }, now)).toBe("inactive");
  });

  it("returns scheduled when startsAt is in the future", () => {
    expect(
      getPromotionStatus(
        { isActive: true, startsAt: "2026-06-20T00:00:00.000Z" },
        now,
      ),
    ).toBe("scheduled");
  });

  it("returns expired when endsAt is in the past", () => {
    expect(
      getPromotionStatus(
        { isActive: true, endsAt: "2026-06-10T00:00:00.000Z" },
        now,
      ),
    ).toBe("expired");
  });

  it("returns exhausted when usageCount reaches usageLimit", () => {
    expect(
      getPromotionStatus(
        { isActive: true, usageLimit: 10, usageCount: 10 },
        now,
      ),
    ).toBe("exhausted");
  });

  it("returns active when enabled and within date and usage bounds", () => {
    expect(
      getPromotionStatus(
        {
          isActive: true,
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: "2026-06-30T00:00:00.000Z",
          usageLimit: 100,
          usageCount: 25,
        },
        now,
      ),
    ).toBe("active");
  });

  it("round-trips datetime-local values", () => {
    const iso = "2026-06-15T14:30:00.000Z";
    const local = toDatetimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDatetimeLocalValue(local)).toBe(iso);
    expect(fromDatetimeLocalValue("")).toBeNull();
  });
});
