import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { BrandMark, Icon } from "@store/ui";
import { useCustomerSession } from "../features/customer/CustomerSession";
import { useCart } from "../features/cart/CartContext";
import { useWishlist } from "../features/wishlist/WishlistContext";
import { listCategories } from "../features/catalog/api/catalog";

interface StoreLayoutProps {
  children: ReactNode;
  activeNav?: string;
}

export default function StoreLayout({ children, activeNav }: StoreLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customer } = useCustomerSession();
  const { itemCount } = useCart();
  const { count: wishlistCount, openDrawer: openWishlistDrawer } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    void listCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}#product-catalog`);
      setMenuOpen(false);
    }
  }

  return (
    <div className="store-app" dir="rtl">
      <div className="announcement">
        شحن مجاني على الطلبات فوق 1000 ج.م أو استخدمي كود ZANZA لخصم 10%
      </div>

      <header className="store-header">
        <div className="store-header__main">
          <button
            aria-controls="store-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("closeMenu") : t("menu")}
            className="icon-button mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name="menu" />
          </button>

          <Link aria-label={t("brandName")} className="store-brand" to="/">
            <BrandMark />
            <span className="store-brand__name">{t("brandName")}</span>
          </Link>

          <form className="store-search" onSubmit={handleSearch} role="search">
            <input
              aria-label={t("searchLabel")}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchLabel")}
              type="search"
              value={searchTerm}
            />
            <button aria-label={t("searchAction")} type="submit"><Icon name="search" /></button>
          </form>

          <Link aria-label={t("customerAccountLink")} className="store-admin-link" to={customer ? "/account" : "/login"}>
            <Icon name="user" />
            <span className="store-action-label">{t(customer ? "customerProfileTitle" : "customerAuthLink")}</span>
          </Link>

          <button
            aria-label="المفضلة"
            className="store-admin-link store-wishlist-button"
            onClick={openWishlistDrawer}
            type="button"
          >
            <Icon name="heart" />
            <span className="store-action-label">المفضلة</span>
            {wishlistCount > 0 && <span className="cart-counter-badge">{wishlistCount}</span>}
          </button>

          <Link aria-label="سلة المشتريات" className="store-admin-link store-cart-link" to="/cart">
            <Icon name="bag" />
            <span className="store-action-label">السلة</span>
            {itemCount > 0 && <span className="cart-counter-badge">{itemCount}</span>}
          </Link>
        </div>

        {/* Navigation Categories and Links */}
        <nav
          aria-label={t("mainNavigation")}
          className={`store-nav${menuOpen ? " store-nav--open" : ""}`}
          id="store-navigation"
        >
          <Link
            aria-current={activeNav === "home" ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            to="/"
          >
            {t("home")}
          </Link>

          {categories.map((category) => (
            <Link
              className={activeNav === category.slug ? "store-nav__category store-nav__category--active" : "store-nav__category"}
              key={category.id}
              onClick={() => setMenuOpen(false)}
              to={`/?category=${encodeURIComponent(category.slug)}#product-catalog`}
            >
              {category.name}
            </Link>
          ))}
          <Link className="store-nav__offers" onClick={() => setMenuOpen(false)} to="/offers">{t("offers")}</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="store-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="store-footer">
        <div className="store-footer__main">
          <div className="store-footer__brand">
            <Link aria-label={t("brandName")} className="store-brand" to="/">
              <BrandMark compact />
              <span className="store-brand__name">{t("brandName")}</span>
            </Link>
            <p>
              وجهتكِ الأولى في مصر لأحدث صيحات الموضة النسائية، الأحذية والحقائب، ومستلزمات المنزل العصرية بأعلى جودة وأفضل سعر مع ميزة المعاينة قبل الدفع.
            </p>
          </div>

          <div>
            <h2>روابط سريعة</h2>
            <Link to="/">الرئيسية</Link>
            <Link to="/#product-catalog">كل المنتجات</Link>
            <Link to="/#campaigns">العروض والباقات</Link>
            <Link to="/about">عن متجر زنقة</Link>
            <Link to="/contact">تواصل معنا</Link>
          </div>

          <div>
            <h2>خدمة العملاء</h2>
            <Link to="/account">{t("customerAccountLink")}</Link>
            <Link to="/cart">سلة المشتريات</Link>
            <Link to="/faq">الأسئلة الشائعة</Link>
            <Link to="/returns">سياسة الاستبدال والاسترجاع</Link>
            <Link to="/terms">الشروط والأحكام والخصوصية</Link>
          </div>

          <div>
            <h2>الدعم والمساعدة</h2>
            <p style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6, marginBottom: "0.75rem" }}>
              فريقنا متواجد لخدمتكِ يومياً من 9:00 ص حتى 10:00 م.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
              <span>📞 هاتف: <strong>01001234567</strong></span>
              <span>💬 واتساب: <strong>01001234567</strong></span>
              <span>✉️ إيميل: <strong>support@zan2a.store</strong></span>
              <span>📍 القاهرة، جمهورية مصر العربية</span>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Link to="/login#admin" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                لوحة تحكم الإدارة
              </Link>
            </div>
          </div>
        </div>

        <div className="store-footer__bottom">
          <span>© {new Date().getFullYear()} {t("brandName")} — جميع الحقوق محفوظة</span>
          <span>دفع آمن كاش عند الاستلام • معاينة المنتجات قبل الشراء • شحن لجميع محافظات مصر</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav aria-label={t("mobileNavigation")} className="mobile-bottom-nav">
        <Link aria-current={activeNav === "home" ? "page" : undefined} to="/">
          <Icon name="grid" />
          <span>{t("home")}</span>
        </Link>
        <button aria-label="المفضلة" onClick={openWishlistDrawer} type="button">
          <Icon name="heart" />
          <span>المفضلة</span>
          {wishlistCount > 0 && <span className="cart-counter-badge">{wishlistCount}</span>}
        </button>
        <Link aria-label="السلة" className="mobile-cart-link" to="/cart">
          <Icon name="bag" />
          <span>السلة</span>
          {itemCount > 0 && <span className="cart-counter-badge">{itemCount}</span>}
        </Link>
        <Link to={customer ? "/account" : "/login"}>
          <Icon name="user" />
          <span>{t("customerAccountLink")}</span>
        </Link>
      </nav>
    </div>
  );
}
