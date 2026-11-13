import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  customerLoginSchema,
  customerRegistrationSchema,
  idempotencyKeySchema,
  homepageBannerInputSchema,
  homepageSectionInputSchema,
} from "./schemas.js";
import { displayEgyptianPhone, normalizeEgyptianPhone } from "./phone.js";

describe("checkout input schemas", () => {
  it("rejects client-controlled price fields", () => {
    const result = createOrderSchema.safeParse({
      items: [{ variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", quantity: 1, priceCents: 1 }],
    });

    describe("customer account schemas", () => {
      it("normalizes Egyptian mobile numbers without accepting ambiguous values", () => {
        expect(normalizeEgyptianPhone("010 1234 5678")).toBe("+201012345678");
        expect(normalizeEgyptianPhone("+201012345678")).toBe("+201012345678");
        expect(normalizeEgyptianPhone("0201012345678")).toBeNull();
        expect(displayEgyptianPhone("+201012345678")).toBe("01012345678");
      });

      it("requires a long, non-common password and matching confirmation", () => {
        const registration = {
          fullName: "منى أحمد",
          phone: "01012345678",
          password: "A private phrase 2026",
          passwordConfirmation: "A private phrase 2026",
        };
        expect(customerRegistrationSchema.safeParse(registration).success).toBe(true);
        expect(customerRegistrationSchema.safeParse({
          ...registration,
          password: "123456789012345",
          passwordConfirmation: "123456789012345",
        }).success).toBe(false);
        expect(customerRegistrationSchema.safeParse({
          ...registration,
          passwordConfirmation: "A private phrase 2027",
        }).success).toBe(false);
      });

      it("normalizes the phone at login while preserving the password exactly", () => {
        expect(customerLoginSchema.parse({
          phone: "01012345678",
          password: " password with spaces ",
        })).toEqual({ phone: "+201012345678", password: " password with spaces " });
      });
    });
    expect(result.success).toBe(false);
  });

  it("requires a sufficiently long opaque idempotency key", () => {
    expect(idempotencyKeySchema.safeParse("short").success).toBe(false);
    expect(idempotencyKeySchema.safeParse("fJ3_O4fJ3_O4fJ3_O4fJ").success).toBe(true);
  });

  it("accepts HTTPS banner media and rejects unsafe campaign destinations", () => {
    const banner = {
      slot: "HERO",
      title: "حملة المتجر",
      desktopImageUrl: "https://images.example.test/campaign.webp",
      overlayColor: "#0A1733",
      overlayOpacity: 35,
      blur: 0,
      isEnabled: true,
      sortOrder: 0,
    };

    expect(homepageBannerInputSchema.safeParse(banner).success).toBe(true);
    expect(homepageBannerInputSchema.safeParse({
      ...banner,
      desktopImageUrl: "http://images.example.test/campaign.webp",
    }).success).toBe(false);
    expect(homepageBannerInputSchema.safeParse({
      ...banner,
      linkUrl: "javascript:alert(1)",
    }).success).toBe(false);
  });

  it("rejects homepage schedules that end before they start", () => {
    const result = homepageSectionInputSchema.safeParse({
      type: "NEW_ARRIVALS",
      title: "وصل حديثًا",
      isEnabled: true,
      sortOrder: 0,
      startsAt: "2026-11-07T12:00:00.000Z",
      endsAt: "2026-11-06T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
