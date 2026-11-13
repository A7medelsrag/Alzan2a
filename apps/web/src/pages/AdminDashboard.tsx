import { useLocation } from "react-router";
import AdminOverview from "../features/admin/pages/AdminOverview";
import AdminProducts from "../features/admin/pages/AdminProducts";
import AdminOrders from "../features/admin/pages/AdminOrders";
import AdminCoupons from "../features/admin/pages/AdminCoupons";
import AdminOffersAndBundles from "../features/admin/pages/AdminOffersAndBundles";
import AdminProductCreate from "../features/admin/pages/AdminProductCreate";
import AdminCategories from "../features/admin/pages/AdminCategories";
import AdminInventory from "../features/admin/pages/AdminInventory";
import AdminPurchases from "../features/admin/pages/AdminPurchases";
import AdminOrderDetail from "../features/admin/pages/AdminOrderDetail";
import AdminCustomers from "../features/admin/pages/AdminCustomers";
import AdminReviews from "../features/admin/pages/AdminReviews";
import AdminMarketing from "../features/admin/pages/AdminMarketing";
import AdminFinance from "../features/admin/pages/AdminFinance";
import AdminShipping from "../features/admin/pages/AdminShipping";
import AdminStaff from "../features/admin/pages/AdminStaff";
import AdminSettings from "../features/admin/pages/AdminSettings";
import HomepageManagement from "../features/admin/pages/HomepageManagement";

export default function AdminDashboard() {
  const { pathname } = useLocation();

  if (pathname === "/admin/products/new") {
    return <AdminProductCreate />;
  }
  if (pathname.startsWith("/admin/products")) {
    return <AdminProducts />;
  }
  if (pathname.startsWith("/admin/categories")) {
    return <AdminCategories />;
  }
  if (pathname.startsWith("/admin/inventory")) {
    return <AdminInventory />;
  }
  if (pathname.startsWith("/admin/purchases")) {
    return <AdminPurchases />;
  }
  if (pathname.startsWith("/admin/orders/") && pathname !== "/admin/orders") {
    return <AdminOrderDetail />;
  }
  if (pathname.startsWith("/admin/orders")) {
    if (pathname !== "/admin/orders" && pathname !== "/admin/orders/") {
      return <AdminOrderDetail />;
    }
    return <AdminOrders />;
  }
  if (pathname.startsWith("/admin/customers")) {
    return <AdminCustomers />;
  }
  if (pathname.startsWith("/admin/reviews")) {
    return <AdminReviews />;
  }
  if (pathname.startsWith("/admin/ads")) {
    return <HomepageManagement />;
  }
  if (pathname.startsWith("/admin/homepage")) {
    return <HomepageManagement />;
  }
  if (pathname.startsWith("/admin/coupons")) {
    return <AdminCoupons />;
  }
  if (pathname.startsWith("/admin/offers")) {
    return <AdminOffersAndBundles />;
  }
  if (pathname.startsWith("/admin/marketing")) {
    return <AdminMarketing />;
  }
  if (pathname.startsWith("/admin/finance")) {
    return <AdminFinance />;
  }
  if (pathname.startsWith("/admin/shipping")) {
    return <AdminShipping />;
  }
  if (pathname.startsWith("/admin/staff")) {
    return <AdminStaff />;
  }
  if (pathname.startsWith("/admin/settings")) {
    return <AdminSettings />;
  }

  return <AdminOverview />;
}
