import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatEGP } from "@store/shared";
import { BrandMark, Icon } from "@store/ui";
import { useCart } from "../../cart/CartContext";
import { useCustomerSession } from "../../customer/CustomerSession";
import { useWishlist } from "../WishlistContext";

export default function WishlistDrawer() {
  const { t } = useTranslation();
  const { items, isDrawerOpen, closeDrawer, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { status } = useCustomerSession();

  if (!isDrawerOpen) return null;

  function handleAddToCart(item: {
    productId: string;
    variantId?: string | null;
    name: string;
    priceCents: number;
    imageUrl?: string | null;
  }) {
    addItem({
      productId: item.productId,
      variantId: item.variantId ?? `${item.productId}_default`,
      productName: item.name,
      variantName: "الافتراضي",
      priceCents: item.priceCents,
      imageUrl: item.imageUrl,
    });
  }

  return (
    <div className="wishlist-drawer-backdrop" onClick={closeDrawer}>
      <aside
        aria-label="قائمة المفضلة"
        className="wishlist-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="wishlist-drawer__header">
          <div className="wishlist-drawer__title">
            <Icon name="heart" />
            <h2>المفضلة ({items.length})</h2>
          </div>
          <button
            aria-label={t("closeMenu")}
            className="wishlist-drawer__close"
            onClick={closeDrawer}
            type="button"
          >
            ✕
          </button>
        </header>

        {status === "anonymous" && (
          <div className="wishlist-guest-banner">
            <p>
              💡 <strong>نصيحة:</strong>{" "}
              <Link onClick={closeDrawer} to="/login">
                سجّلي دخولكِ
              </Link>{" "}
              أو{" "}
              <Link onClick={closeDrawer} to="/register">
                أنشئي حسابًا
              </Link>{" "}
              لحفظ مفضلتكِ وتتبع طلباتكِ عبر أي جهاز!
            </p>
          </div>
        )}

        <div className="wishlist-drawer__content">
          {items.length === 0 ? (
            <div className="wishlist-empty">
              <Icon name="heart" />
              <p>قائمة المفضلة فارغة حاليًا.</p>
              <button
                className="customer-primary-button"
                onClick={closeDrawer}
                type="button"
              >
                تصفح المنتجات
              </button>
            </div>
          ) : (
            <div className="wishlist-items-list">
              {items.map((item) => (
                <article className="wishlist-item-card" key={item.id}>
                  <div className="wishlist-item-card__image">
                    {item.imageUrl ? (
                      <img alt={item.name} src={item.imageUrl} />
                    ) : (
                      <div className="image-fallback">
                        <BrandMark compact />
                      </div>
                    )}
                  </div>
                  <div className="wishlist-item-card__details">
                    <h3>{item.name}</h3>
                    <div className="wishlist-item-card__price">
                      {formatEGP(item.priceCents)}
                    </div>
                    <div className="wishlist-item-card__actions">
                      <button
                        className="customer-primary-button customer-primary-button--small"
                        onClick={() => handleAddToCart(item)}
                        type="button"
                      >
                        أضف للسلة
                      </button>
                      <button
                        aria-label="إزالة من المفضلة"
                        className="customer-text-button customer-text-button--danger"
                        onClick={() => void removeItem(item.productId)}
                        type="button"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
