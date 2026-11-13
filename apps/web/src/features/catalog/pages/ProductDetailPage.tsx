import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { formatEGP, type ProductOfferPublic, type StoreProduct } from "@store/shared";
import { Icon } from "@store/ui";
import StoreLayout from "../../../components/StoreLayout";
import { getCatalogProductBySlug, listCatalogProducts } from "../api/catalog";
import { listStoreOffers } from "../api/offers";
import { useCart } from "../../cart/CartContext";
import { useWishlist } from "../../wishlist/WishlistContext";
import ProductReviewsModal from "../components/ProductReviewsModal";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useTranslation();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [offers, setOffers] = useState<ProductOfferPublic[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "shipping">("desc");

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setQuantity(1);

    void getCatalogProductBySlug(slug, controller.signal)
      .then((prod) => {
        setProduct(prod);
        setSelectedVariantId(prod.variants[0]?.id ?? "");
        setLoading(false);

        // Fetch related products from same category
        void listCatalogProducts({ category: prod.category.slug, pageSize: 4 }, controller.signal)
          .then((res) => {
            setRelatedProducts(res.data.filter((p) => p.id !== prod.id).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(true);
      });

    void listStoreOffers()
      .then((res) => setOffers(res.data))
      .catch(() => {});

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <StoreLayout>
        <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1rem" }}>
          <div className="product-grid product-grid--skeleton">
            <div className="product-skeleton" style={{ height: "450px" }} />
            <div className="product-skeleton" style={{ height: "450px" }} />
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (error || !product) {
    return (
      <StoreLayout>
        <div style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center", padding: "2rem" }}>
          <span style={{ fontSize: "3rem" }}>🔍</span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "1rem 0" }}>المنتج غير موجود أو غير متاح حالياً</h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            قد يكون تم نقل المنتج أو نفد من المخزون. تفضلي بتصفح باقي المنتجات في متجرنا.
          </p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              background: "#7a1535",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            العودة لصفحة المتجر
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  const maxStock = selectedVariant ? selectedVariant.stockQuantity : 0;
  const isAvailable = maxStock > 0;
  const isWishlisted = isInWishlist(product.id);

  // Offers evaluation
  const matchingOffer = offers.find((o) => o.productIds.includes(product.id));
  let unitDiscount = 0;
  if (matchingOffer && selectedVariant) {
    if (matchingOffer.discountType === "PERCENTAGE") {
      unitDiscount = Math.round((selectedVariant.priceCents * matchingOffer.discountValue) / 100);
      if (matchingOffer.maxDiscountCents && unitDiscount > matchingOffer.maxDiscountCents) {
        unitDiscount = matchingOffer.maxDiscountCents;
      }
    } else {
      unitDiscount = Math.min(matchingOffer.discountValue, selectedVariant.priceCents);
    }
  }

  const effectivePriceCents = selectedVariant
    ? Math.max(0, selectedVariant.priceCents - unitDiscount)
    : 0;

  function handleAddToCart() {
    if (!selectedVariant || !isAvailable) return;
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product!.id,
        productName: product!.name,
        variantName: selectedVariant.name,
        priceCents: effectivePriceCents,
        imageUrl: product!.imageUrl,
      },
      quantity,
    );
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  }

  function handleBuyNow() {
    if (!selectedVariant || !isAvailable) return;
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product!.id,
        productName: product!.name,
        variantName: selectedVariant.name,
        priceCents: effectivePriceCents,
        imageUrl: product!.imageUrl,
      },
      quantity,
    );
    navigate("/cart");
  }

  return (
    <StoreLayout>
      <div style={{ maxWidth: "1200px", margin: "1.5rem auto 3rem", padding: "0 1rem" }}>
        {/* Breadcrumb Navigation */}
        <nav aria-label="مسار التصفح" style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "1.5rem" }}>
          <Link to="/" style={{ color: "#64748b", textDecoration: "none" }}>الرئيسية</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <Link to={`/?category=${encodeURIComponent(product.category.slug)}#product-catalog`} style={{ color: "#64748b", textDecoration: "none" }}>
            {product.category.name}
          </Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#0f172a", fontWeight: "600" }}>{product.name}</span>
        </nav>

        {/* Product Details Hero Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2.5rem", alignItems: "start" }}>
          {/* Gallery Media */}
          <div className="product-gallery">
            <div className="product-gallery__stage">
              {product.imageUrl ? (
                <img alt={product.name} src={product.imageUrl} />
              ) : (
                <div className="product-gallery__empty">
                  <span>صورة المنتج الرئيسية</span>
                  <small>800 × 600 • أضيفي صورة المنتج من لوحة التحكم</small>
                </div>
              )}

              {matchingOffer && (
                <span
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background: "#d32f2f",
                    color: "#fff",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                  }}
                >
                  {matchingOffer.discountType === "PERCENTAGE"
                    ? `خصم ${matchingOffer.discountValue}%`
                    : `وفر ${formatEGP(matchingOffer.discountValue)}`}
                </span>
              )}

              {matchingOffer?.isFreeShipping && (
                <span
                  style={{
                    position: "absolute",
                    top: "3.5rem",
                    right: "1rem",
                    background: "#16a34a",
                    color: "#fff",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                  }}
                >
                  شحن مجاني
                </span>
              )}

              {/* Wishlist floating button */}
              <button
                onClick={() =>
                  toggleWishlist(
                    {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      description: product.description,
                      imageUrl: product.imageUrl,
                      priceCents: selectedVariant ? selectedVariant.priceCents : 0,
                    },
                    selectedVariant?.id,
                  )
                }
                type="button"
                style={{
                  position: "absolute",
                  top: "1rem",
                  left: "1rem",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: isWishlisted ? "#e11d48" : "#94a3b8",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                title={isWishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              >
                <Icon name="heart" />
              </button>
            </div>
            <div className="product-gallery__thumbnails" aria-hidden="true">
              {product.imageUrl ? (
                <div className="product-gallery__thumbnail">
                  <img alt="" src={product.imageUrl} />
                </div>
              ) : (
                <>
                  <span className="product-gallery__thumbnail product-gallery__thumbnail--one" />
                  <span className="product-gallery__thumbnail product-gallery__thumbnail--two" />
                  <span className="product-gallery__thumbnail product-gallery__thumbnail--three" />
                  <span className="product-gallery__thumbnail product-gallery__thumbnail--four" />
                  <span className="product-gallery__thumbnail product-gallery__thumbnail--five" />
                </>
              )}
            </div>
          </div>

          {/* Buy Box Information */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.75rem",
                  background: "#f1f5f9",
                  color: "#475569",
                  borderRadius: "0.5rem",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {product.category.name}
              </span>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#0f172a", lineHeight: 1.3, margin: 0 }}>
                {product.name}
              </h1>
            </div>

            {/* Ratings Summary Link */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", color: "#f59e0b", fontSize: "1.1rem" }}>
                ★★★★★
              </div>
              <button
                type="button"
                onClick={() => setReviewsModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "0.88rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                عرض التقييمات والآراء
              </button>
            </div>

            {/* Pricing Section */}
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: "900", color: "#7a1535" }}>
                  {formatEGP(effectivePriceCents)}
                </span>
                {unitDiscount > 0 && selectedVariant && (
                  <span style={{ fontSize: "1.15rem", color: "#94a3b8", textDecoration: "line-through" }}>
                    {formatEGP(selectedVariant.priceCents)}
                  </span>
                )}
                {unitDiscount > 0 && (
                  <span style={{ background: "#fef2f2", color: "#dc2626", padding: "0.2rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.85rem", fontWeight: "bold" }}>
                    وفرتي {formatEGP(unitDiscount)}
                  </span>
                )}
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                الأسعار شاملة ضريبة القيمة المضافة • الدفع نقداً عند استلام الشحنة
              </p>
            </div>

            {/* Short Description */}
            <p style={{ color: "#334155", fontSize: "0.95rem", lineHeight: 1.7, margin: 0 }}>
              {product.description}
            </p>

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.6rem" }}>
                  المقاس أو الموديل: <span style={{ color: "#7a1535", fontWeight: "600" }}>{selectedVariant?.name}</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {product.variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    const hasStock = variant.stockQuantity > 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        disabled={!hasStock}
                        style={{
                          padding: "0.6rem 1.1rem",
                          borderRadius: "0.6rem",
                          fontSize: "0.88rem",
                          fontWeight: isSelected ? "700" : "500",
                          background: isSelected ? "#7a1535" : hasStock ? "#ffffff" : "#f1f5f9",
                          color: isSelected ? "#ffffff" : hasStock ? "#0f172a" : "#94a3b8",
                          border: isSelected ? "2px solid #7a1535" : "1px solid #cbd5e1",
                          cursor: hasStock ? "pointer" : "not-allowed",
                          textDecoration: hasStock ? "none" : "line-through",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {variant.name}
                        {!hasStock && " (نفد)"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Availability Badge */}
            <div>
              {isAvailable ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a", fontSize: "0.88rem", fontWeight: "600" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }} />
                  {maxStock <= 5 ? `متبقي ${maxStock} قطع فقط في المخزن!` : "متوفر في المخزن وجاهز للشحن الفوري"}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626", fontSize: "0.88rem", fontWeight: "600" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }} />
                  غير متوفر حالياً
                </div>
              )}
            </div>

            {/* Quantity Stepper & Buttons */}
            {isAvailable && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>الكمية:</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "0.5rem", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{ padding: "0.5rem 0.9rem", background: "#f8fafc", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: "40px", textAlign: "center", fontWeight: "700", fontSize: "0.95rem" }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(Math.min(20, maxStock), q + 1))}
                      style={{ padding: "0.5rem 0.9rem", background: "#f8fafc", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    style={{
                      background: addedNotice ? "#16a34a" : "#7a1535",
                      color: "#ffffff",
                      padding: "0.85rem 1rem",
                      borderRadius: "0.75rem",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                  >
                    {addedNotice ? "تمت الإضافة للسلة ✓" : "أضف إلى السلة"}
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "0.85rem 1rem",
                      borderRadius: "0.75rem",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    شراء فوري (إتمام الطلب)
                  </button>
                </div>
              </div>
            )}

            {/* Service & Guarantee Badges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", padding: "1rem", background: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "#334155" }}>
                <span style={{ fontSize: "1.2rem" }}>🚚</span>
                <span>توصيل سريع لكل المحافظات (2-4 أيام)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "#334155" }}>
                <span style={{ fontSize: "1.2rem" }}>📦</span>
                <span>حق المعاينة الكاملة قبل الدفع</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "#334155" }}>
                <span style={{ fontSize: "1.2rem" }}>🔄</span>
                <span>استبدال واسترجاع سهل خلال 14 يوماً</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "#334155" }}>
                <span style={{ fontSize: "1.2rem" }}>💵</span>
                <span>دفع كاش نقداً عند باب المنزل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs Section */}
        <div style={{ marginTop: "3.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #e2e8f0", marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => setActiveTab("desc")}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "none",
                fontWeight: activeTab === "desc" ? "800" : "600",
                color: activeTab === "desc" ? "#7a1535" : "#64748b",
                borderBottom: activeTab === "desc" ? "3px solid #7a1535" : "none",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              وصف وتفاصيل المنتج
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "none",
                fontWeight: activeTab === "specs" ? "800" : "600",
                color: activeTab === "specs" ? "#7a1535" : "#64748b",
                borderBottom: activeTab === "specs" ? "3px solid #7a1535" : "none",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              المواصفات وإرشادات العناية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shipping")}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "none",
                fontWeight: activeTab === "shipping" ? "800" : "600",
                color: activeTab === "shipping" ? "#7a1535" : "#64748b",
                borderBottom: activeTab === "shipping" ? "3px solid #7a1535" : "none",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              الشحن وسياسة المعاينة
            </button>
          </div>

          <div style={{ color: "#334155", lineHeight: 1.8, fontSize: "0.95rem" }}>
            {activeTab === "desc" && (
              <div>
                <p style={{ margin: "0 0 1rem" }}>{product.description}</p>
                <p>
                  تم تصميم هذا المنتج بعناية فائقة ليلبي متطلباتكِ اليومية والمناسبات بأعلى درجات الراحة والجودة. خامات مختارة بعناية تدوم طويلاً مع الحفاظ على رونقها وأناقتها.
                </p>
              </div>
            )}
            {activeTab === "specs" && (
              <div>
                <ul style={{ paddingRight: "1.25rem", margin: 0 }}>
                  <li><strong>القسم:</strong> {product.category.name}</li>
                  <li><strong>الخامة:</strong> خامات عالية الجودة ومريحة للاستخدام.</li>
                  <li><strong>المقاسات المتوفرة:</strong> {product.variants.map((v) => v.name).join("، ")}</li>
                  <li><strong>إرشادات الغسيل:</strong> يُفضل الغسيل بماء فاتر وعدم استخدام مبيضات، واستخدام درجة حرارة منخفضة عند الكي.</li>
                </ul>
              </div>
            )}
            {activeTab === "shipping" && (
              <div>
                <p>
                  نوفر الشحن لجميع محافظات جمهورية مصر العربية الـ 27 عبر شركات الشحن الرائدة (بوسطة، أرامكس).
                </p>
                <ul style={{ paddingRight: "1.25rem" }}>
                  <li>القاهرة والجيزة: 40 ج.م (توصيل خلال 24 - 48 ساعة).</li>
                  <li>الإسكندرية ومحافظات الدلتا: 50 ج.م (توصيل خلال 48 - 72 ساعة).</li>
                  <li>محافظات القناة: 55 ج.م.</li>
                  <li>محافظات الصعيد: 65 ج.م.</li>
                  <li>المحافظات الحدودية (البحر الأحمر، مطروح، الوادي الجديد): 80 ج.م.</li>
                </ul>
                <p>
                  💡 <strong>ميزة المعاينة:</strong> يحق لكِ فتح الشحنة وفحص المنتج أمام مندوب الشحن قبل سداد قيمة الأوردر.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Shelf */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: "4rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0f172a", marginBottom: "1.5rem" }}>
              منتجات مشابهة قد تعجبكِ
            </h2>
            <div className="product-grid">
              {relatedProducts.map((relProduct) => {
                const variant = relProduct.variants.find((item) => item.stockQuantity > 0) ?? relProduct.variants[0];
                const isRelatedAvailable = Boolean(variant && variant.stockQuantity > 0);
                return (
                  <article className="product-card" key={relProduct.id}>
                    <div className="product-card__media">
                      <Link to={`/products/${relProduct.slug}`} style={{ display: "block", height: "100%" }}>
                        {relProduct.imageUrl ? (
                          <img alt={relProduct.name} src={relProduct.imageUrl} loading="lazy" />
                        ) : (
                          <span aria-label="لا توجد صورة" className="image-fallback image-fallback--empty" role="img">
                            لا توجد صورة
                          </span>
                        )}
                      </Link>
                    </div>
                    <div className="product-card__body">
                      <Link to={`/products/${relProduct.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <p className="product-card__category">{relProduct.category.name}</p>
                        <h3 style={{ fontSize: "0.95rem" }}>{relProduct.name}</h3>
                      </Link>
                      <div className="product-card__footer">
                        <p className="product-card__price">
                          {isRelatedAvailable ? formatEGP(variant.priceCents) : t("productUnavailable")}
                        </p>
                        <Link to={`/products/${relProduct.slug}`} style={{ fontSize: "0.82rem", color: "#7a1535", fontWeight: "bold" }}>
                          عرض التفاصيل ←
                        </Link>
                      </div>
                      <button
                        className="product-card__add-btn"
                        disabled={!isRelatedAvailable}
                        onClick={() => {
                          if (!variant || !isRelatedAvailable) return;
                          addItem({
                            variantId: variant.id,
                            productId: relProduct.id,
                            productName: relProduct.name,
                            variantName: variant.name,
                            priceCents: variant.priceCents,
                            imageUrl: relProduct.imageUrl,
                          });
                        }}
                        type="button"
                      >
                        {t("cartAddToCart")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Reviews Modal */}
        <ProductReviewsModal
          isOpen={reviewsModalOpen}
          onClose={() => setReviewsModalOpen(false)}
          product={product}
        />
      </div>
    </StoreLayout>
  );
}
