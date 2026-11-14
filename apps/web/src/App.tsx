import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useLocation } from "react-router";
import AdminRoute from "./features/admin/pages/AdminRoute";
import { CartProvider } from "./features/cart/CartContext";
import CartPage from "./features/cart/pages/CartPage";
import OrderConfirmation from "./features/cart/pages/OrderConfirmation";
import CustomerSessionProvider from "./features/customer/CustomerSession";
import CustomerAccount from "./features/customer/pages/CustomerAccount";
import CustomerLogin from "./features/customer/pages/CustomerLogin";
import CustomerRegister from "./features/customer/pages/CustomerRegister";
import ProductDetailPage from "./features/catalog/pages/ProductDetailPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import ReturnsPolicyPage from "./pages/ReturnsPolicyPage";
import TermsPage from "./pages/TermsPage";
import { WishlistProvider } from "./features/wishlist/WishlistContext";
import WishlistDrawer from "./features/wishlist/components/WishlistDrawer";
import Storefront from "./Storefront";
import {
  getCachedStoreBranding,
  loadAndApplyStoreBranding,
  STORE_BRANDING_EVENT,
} from "./utils/store-branding";
import "./admin.css";

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const [brandNameState, setBrandNameState] = useState(
    () => getCachedStoreBranding().storeName,
  );

  useEffect(() => {
    void loadAndApplyStoreBranding();
    const onBrandChange = () => {
      setBrandNameState(getCachedStoreBranding().storeName);
    };
    window.addEventListener(STORE_BRANDING_EVENT, onBrandChange);
    return () => window.removeEventListener(STORE_BRANDING_EVENT, onBrandChange);
  }, []);

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      "/about": t("aboutPageTitle"),
      "/login": t("customerLoginTitle"),
      "/register": t("customerRegisterTitle"),
      "/account": t("customerProfileTitle"),
      "/offers": t("offersPageTitle"),
    };
    const pageTitle = location.pathname.startsWith("/admin")
      ? t("adminTitle")
      : pageTitles[location.pathname] ?? null;
    const activeBrand = brandNameState || t("brandName");
    document.title = pageTitle ? `${activeBrand} | ${pageTitle}` : activeBrand;
  }, [location.pathname, t, brandNameState]);

  return (
    <CustomerSessionProvider>
      <WishlistProvider>
        <CartProvider>
          <WishlistDrawer />
          <Routes>
            <Route element={<Storefront />} path="/" />
            <Route element={<Storefront />} path="/offers" />
            <Route element={<ProductDetailPage />} path="/products/:slug" />
            <Route element={<ProductDetailPage />} path="/product/:slug" />
            <Route element={<AboutPage />} path="/about" />
            <Route element={<ContactPage />} path="/contact" />
            <Route element={<FAQPage />} path="/faq" />
            <Route element={<ReturnsPolicyPage />} path="/returns" />
            <Route element={<TermsPage />} path="/terms" />
            <Route element={<TermsPage />} path="/privacy" />
            <Route element={<CartPage />} path="/cart" />
            <Route element={<OrderConfirmation />} path="/orders/:id" />
            <Route element={<CustomerLogin />} path="/login" />
            <Route element={<CustomerRegister />} path="/register" />
            <Route element={<CustomerAccount />} path="/account" />
            <Route element={<AdminEntry />} path="/admin/login" />
            <Route element={<AdminRoute />} path="/admin/*" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </CartProvider>
      </WishlistProvider>
    </CustomerSessionProvider>
  );
}

function AdminEntry() {
  return <Navigate replace to="/login#admin" />;
}
