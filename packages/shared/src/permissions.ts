import type { AdminRole } from "./schemas.js";

export type AdminPermission =
  | "manageHomepage"
  | "manageOrders"
  | "viewOrders"
  | "manageCoupons"
  | "manageOffers"
  | "manageCatalog"
  | "viewCatalog"
  | "manageCustomers"
  | "manageReviews"
  | "viewPurchases"
  | "managePurchases"
  | "viewFinance"
  | "manageFinance"
  | "viewShipping"
  | "manageShipping"
  | "manageStaff"
  | "viewSettings"
  | "manageSettings"
  | "viewAuditLog";

const adminPermissionMatrix: Record<AdminRole, Record<AdminPermission, boolean>> = {
  OWNER: { manageHomepage: true, manageOrders: true, viewOrders: true, manageCoupons: true, manageOffers: true, manageCatalog: true, viewCatalog: true, manageCustomers: true, manageReviews: true, viewPurchases: true, managePurchases: true, viewFinance: true, manageFinance: true, viewShipping: true, manageShipping: true, manageStaff: true, viewSettings: true, manageSettings: true, viewAuditLog: true },
  MANAGER: { manageHomepage: true, manageOrders: true, viewOrders: true, manageCoupons: true, manageOffers: true, manageCatalog: true, viewCatalog: true, manageCustomers: true, manageReviews: true, viewPurchases: true, managePurchases: true, viewFinance: true, manageFinance: false, viewShipping: true, manageShipping: true, manageStaff: false, viewSettings: true, manageSettings: false, viewAuditLog: true },
  INVENTORY: { manageHomepage: false, manageOrders: false, viewOrders: true, manageCoupons: false, manageOffers: false, manageCatalog: true, viewCatalog: true, manageCustomers: false, manageReviews: false, viewPurchases: true, managePurchases: true, viewFinance: false, manageFinance: false, viewShipping: false, manageShipping: false, manageStaff: false, viewSettings: false, manageSettings: false, viewAuditLog: false },
  ACCOUNTANT: { manageHomepage: false, manageOrders: false, viewOrders: true, manageCoupons: false, manageOffers: false, manageCatalog: false, viewCatalog: true, manageCustomers: false, manageReviews: false, viewPurchases: true, managePurchases: true, viewFinance: true, manageFinance: true, viewShipping: false, manageShipping: false, manageStaff: false, viewSettings: false, manageSettings: false, viewAuditLog: false },
  SUPPORT: { manageHomepage: false, manageOrders: true, viewOrders: true, manageCoupons: false, manageOffers: false, manageCatalog: false, viewCatalog: true, manageCustomers: true, manageReviews: true, viewPurchases: false, managePurchases: false, viewFinance: false, manageFinance: false, viewShipping: false, manageShipping: false, manageStaff: false, viewSettings: false, manageSettings: false, viewAuditLog: false },
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return adminPermissionMatrix[role][permission];
}
