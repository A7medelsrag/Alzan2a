import { describe, expect, it } from "vitest";
import { hasAdminPermission } from "./permissions.js";

describe("admin permission policy", () => {
  it("allows homepage management to owners and managers only", () => {
    expect(hasAdminPermission("OWNER", "manageHomepage")).toBe(true);
    expect(hasAdminPermission("MANAGER", "manageHomepage")).toBe(true);
    expect(hasAdminPermission("INVENTORY", "manageHomepage")).toBe(false);
    expect(hasAdminPermission("ACCOUNTANT", "manageHomepage")).toBe(false);
    expect(hasAdminPermission("SUPPORT", "manageHomepage")).toBe(false);
  });

  it("allows order management across all authorized staff roles", () => {
    expect(hasAdminPermission("OWNER", "manageOrders")).toBe(true);
    expect(hasAdminPermission("MANAGER", "manageOrders")).toBe(true);
    expect(hasAdminPermission("SUPPORT", "manageOrders")).toBe(true);
  });

  it("keeps inventory and accountant order access read-only", () => {
    expect(hasAdminPermission("INVENTORY", "viewOrders")).toBe(true);
    expect(hasAdminPermission("INVENTORY", "manageOrders")).toBe(false);
    expect(hasAdminPermission("ACCOUNTANT", "viewOrders")).toBe(true);
    expect(hasAdminPermission("ACCOUNTANT", "manageOrders")).toBe(false);
    expect(hasAdminPermission("SUPPORT", "manageOrders")).toBe(true);
  });

  it("allows coupon management to owners and managers only", () => {
    expect(hasAdminPermission("OWNER", "manageCoupons")).toBe(true);
    expect(hasAdminPermission("MANAGER", "manageCoupons")).toBe(true);
    expect(hasAdminPermission("ACCOUNTANT", "manageCoupons")).toBe(false);
    expect(hasAdminPermission("INVENTORY", "manageCoupons")).toBe(false);
    expect(hasAdminPermission("SUPPORT", "manageCoupons")).toBe(false);
  });

  it("allows offer and bundle management to owners and managers only", () => {
    expect(hasAdminPermission("OWNER", "manageOffers")).toBe(true);
    expect(hasAdminPermission("MANAGER", "manageOffers")).toBe(true);
    expect(hasAdminPermission("ACCOUNTANT", "manageOffers")).toBe(false);
    expect(hasAdminPermission("INVENTORY", "manageOffers")).toBe(false);
    expect(hasAdminPermission("SUPPORT", "manageOffers")).toBe(false);
  });
});
