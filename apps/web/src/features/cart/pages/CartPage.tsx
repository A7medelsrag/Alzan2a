import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { EGYPTIAN_GOVERNORATES, formatEGP } from "@store/shared";
import { BrandMark, Icon } from "@store/ui";
import { useCustomerSession } from "../../customer/CustomerSession.js";
import { listCustomerAddresses, type CustomerAddress } from "../../customer/api/account.js";
import { useCart } from "../CartContext.js";
import { OrderApiError, placeOrder } from "../api/orders.js";
import { validateCouponCode } from "../api/coupons.js";

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    items,
    bundles,
    itemCount,
    subtotalCents,
    updateQuantity,
    removeItem,
    updateBundleQuantity,
    removeBundle,
    clearCart,
  } = useCart();
  const { customer, csrfToken } = useCustomerSession();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [email, setEmail] = useState("");
  const [governorate, setGovernorate] = useState<string>(EGYPTIAN_GOVERNORATES[0] ?? "القاهرة");
  const [cityArea, setCityArea] = useState("");
  const [detailedAddress, setDetailedAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [appliedDiscountCents, setAppliedDiscountCents] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponValidating, setCouponValidating] = useState(false);

  // Pre-fill customer details if logged in
  useEffect(() => {
    if (customer) {
      setFullName((prev) => prev || customer.fullName);
      if (customer.phone) setPhone((prev) => prev || customer.phone || "");
      if (customer.email) setEmail((prev) => prev || customer.email || "");

      void listCustomerAddresses()
        .then((res) => {
          setSavedAddresses(res);
          if (res.length > 0 && res[0]) {
            const first = res[0];
            setGovernorate(first.governorate);
            setCityArea(first.cityArea);
            setDetailedAddress(first.detailedAddress);
            if (first.landmark) setLandmark(first.landmark);
          }
        })
        .catch(() => {});
    }
  }, [customer]);

  const totalCents = Math.max(0, subtotalCents - appliedDiscountCents);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponValidating(true);
    setCouponMessage("");
    try {
      const res = await validateCouponCode({
        code: couponInput.trim(),
        subtotalCents,
        shippingFeeCents: 0,
      });
      if (res.isValid) {
        setAppliedCouponCode(res.code);
        setAppliedDiscountCents(res.discountCents);
        setCouponMessage(res.message);
      } else {
        setAppliedCouponCode(null);
        setAppliedDiscountCents(0);
        setCouponMessage(res.message);
      }
    } catch {
      setCouponMessage("تعذر التحقق من كود الخصم حاليًا.");
    } finally {
      setCouponValidating(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponInput("");
    setAppliedCouponCode(null);
    setAppliedDiscountCents(0);
    setCouponMessage("");
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 && bundles.length === 0) return;

    setError("");
    setBusy(true);

    try {
      const result = await placeOrder({
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          backupPhone: backupPhone.trim() || undefined,
          email: email.trim() || undefined,
        },
        shippingAddress: {
          governorate: governorate.trim(),
          cityArea: cityArea.trim(),
          detailedAddress: detailedAddress.trim(),
          landmark: landmark.trim() || undefined,
        },
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        bundles: bundles.map((b) => ({
          bundleId: b.bundleId,
          quantity: b.quantity,
          selectedVariants: b.selectedVariants.map((sv) => ({
            productId: sv.productId,
            variantId: sv.variantId,
          })),
        })),
        couponCode: appliedCouponCode ?? undefined,
      }, undefined, csrfToken ?? undefined);

      clearCart();
      navigate(`/orders/${result.data.id}`);
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (err.code === "OUT_OF_STOCK_OR_UNAVAILABLE") {
          setError("الكمية المطلوبة غير متوفرة حاليًا. يرجى مراجعة السلة والمحاولة مرة أخرى.");
        } else {
          setError("تعذر تأكيد الطلب. راجعي الاسم ورقم الهاتف والعنوان وحاولي مرة أخرى.");
        }
      } else {
        setError("تعذر تأكيد الطلب. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSelectSavedAddress(addressId: string) {
    const selected = savedAddresses.find((a) => a.id === addressId);
    if (!selected) return;
    setGovernorate(selected.governorate);
    setCityArea(selected.cityArea);
    setDetailedAddress(selected.detailedAddress);
    setLandmark(selected.landmark ?? "");
  }

  return (
    <div className="store-app cart-page-wrapper" dir="rtl">
      <header className="store-header">
        <div className="store-header__main">
          <Link aria-label={t("brandName")} className="store-brand" to="/">
            <BrandMark />
            <span className="store-brand__name">{t("brandName")}</span>
          </Link>
          <div className="cart-header-actions">
            <Link className="store-admin-link" to="/">
              <span>العودة للمتجر</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="cart-main-container">
        <h1 className="cart-title">سلة المشتريات وتأكيد الطلب</h1>

        {items.length === 0 && bundles.length === 0 ? (
          <div className="empty-cart-state">
            <Icon name="bag" className="empty-cart-icon" />
            <h2>سلة المشتريات فارغة</h2>
            <p>أضيفي المنتجات المفضلة لديكِ من المتجر لإتمام الطلب.</p>
            <Link className="customer-primary-button" to="/">
              تصفحي المنتجات الآن
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            {/* Items Column */}
            <section className="cart-items-section">
              <div className="cart-section-header">
                <h2>المنتجات المختارة ({itemCount})</h2>
              </div>
              <ul className="cart-items-list">
                {items.map((item) => (
                  <li className="cart-item-card" key={item.variantId}>
                    <div className="cart-item-image">
                      {item.imageUrl ? (
                        <img alt={item.productName} src={item.imageUrl} />
                      ) : (
                        <div className="cart-image-placeholder">
                          <Icon name="box" />
                        </div>
                      )}
                    </div>
                    <div className="cart-item-details">
                      <h3>{item.productName}</h3>
                      <p className="cart-item-variant">{item.variantName}</p>
                      <p className="cart-item-price">{formatEGP(item.priceCents)}</p>
                    </div>
                    <div className="cart-item-actions">
                      <div className="quantity-controller">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          aria-label="إنقاص الكمية"
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          aria-label="زيادة الكمية"
                          disabled={item.quantity >= 20}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item-remove-btn"
                        onClick={() => removeItem(item.variantId)}
                        aria-label="حذف المنتج من السلة"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}

                {bundles.map((bundle) => (
                  <li className="cart-item-card" key={bundle.bundleId} style={{ borderRight: "4px solid #0052cc" }}>
                    <div className="cart-item-image">
                      {bundle.imageUrl ? (
                        <img alt={bundle.bundleTitle} src={bundle.imageUrl} />
                      ) : (
                        <div className="cart-image-placeholder" style={{ background: "#e6f0ff", color: "#0052cc" }}>
                          <Icon name="box" />
                        </div>
                      )}
                    </div>
                    <div className="cart-item-details">
                      <span className="admin-badge admin-badge-info" style={{ display: "inline-block", marginBottom: "0.25rem" }}>
                        باقة مميزة
                      </span>
                      <h3>{bundle.bundleTitle}</h3>
                      <div style={{ fontSize: "0.85rem", color: "#555" }}>
                        {bundle.selectedVariants.map((sv) => (
                          <div key={sv.productId}>
                            {sv.productName}: <strong>{sv.variantName}</strong>
                          </div>
                        ))}
                      </div>
                      <p className="cart-item-price">{formatEGP(bundle.priceCents)}</p>
                    </div>
                    <div className="cart-item-actions">
                      <div className="quantity-controller">
                        <button
                          type="button"
                          onClick={() => updateBundleQuantity(bundle.bundleId, bundle.quantity - 1)}
                          aria-label="إنقاص الكمية"
                          disabled={bundle.quantity <= 1}
                        >
                          -
                        </button>
                        <span>{bundle.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateBundleQuantity(bundle.bundleId, bundle.quantity + 1)}
                          aria-label="زيادة الكمية"
                          disabled={bundle.quantity >= 20}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item-remove-btn"
                        onClick={() => removeBundle(bundle.bundleId)}
                        aria-label="حذف الباقة من السلة"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Checkout Form & Order Summary Column */}
            <section className="checkout-section">
              <form className="checkout-form" onSubmit={handleCheckout}>
                <h2>بيانات التوصيل</h2>

                {customer && (
                  <div className="logged-in-checkout-notice">
                    <span>
                      مرحبًا بعودتك: <strong>{customer.fullName}</strong>
                    </span>
                    {savedAddresses.length > 0 && (
                      <div className="saved-addresses-picker">
                        <label htmlFor="saved-address-select">اختاري من عناوينك المحفوظة:</label>
                        <select
                          id="saved-address-select"
                          onChange={(e) => handleSelectSavedAddress(e.target.value)}
                        >
                          {savedAddresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.label}: {addr.governorate} - {addr.cityArea}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group-grid">
                  <label htmlFor="customer-name">
                    الاسم بالكامل *
                    <input
                      id="customer-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: سارة أحمد"
                    />
                  </label>

                  <label htmlFor="customer-phone">
                    رقم الهاتف الأساسي (واتساب / اتصال) *
                    <input
                      id="customer-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                    />
                  </label>

                  <label htmlFor="customer-backup-phone">
                    رقم هاتف إضافي (اختياري)
                    <input
                      id="customer-backup-phone"
                      type="tel"
                      value={backupPhone}
                      onChange={(e) => setBackupPhone(e.target.value)}
                      placeholder="01112345678"
                    />
                  </label>

                  <label htmlFor="customer-email">
                    البريد الإلكتروني (اختياري)
                    <input
                      id="customer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@domain.com"
                    />
                  </label>
                </div>

                <div className="form-group-grid">
                  <label htmlFor="shipping-governorate">
                    المحافظة *
                    <select
                      id="shipping-governorate"
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                    >
                      {EGYPTIAN_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>
                          {gov}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="shipping-city">
                    المدينة أو المنطقة *
                    <input
                      id="shipping-city"
                      required
                      value={cityArea}
                      onChange={(e) => setCityArea(e.target.value)}
                      placeholder="مثال: مدينة نصر"
                    />
                  </label>
                </div>

                <label htmlFor="shipping-detailed">
                  العنوان التفصيلي (اسم الشارع، رقم العقار، الدور، الشقة) *
                  <textarea
                    id="shipping-detailed"
                    required
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="شارع عباس العقاد، عمارة 12، الدور الثالث شقة 8"
                  />
                </label>

                <label htmlFor="shipping-landmark">
                  علامة مميزة (اختياري)
                  <input
                    id="shipping-landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="بجوار صيدلية / مسجد..."
                  />
                </label>

                {/* Coupon Code Section */}
                <div className="cart-coupon-box">
                  <label htmlFor="cart-coupon-input">هل لديكِ كود خصم؟</label>
                  <div className="cart-coupon-input-group">
                    <input
                      disabled={Boolean(appliedCouponCode)}
                      id="cart-coupon-input"
                      maxLength={30}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="أدخلي الكود (مثال: WELCOME10)"
                      type="text"
                      value={couponInput}
                    />
                    {appliedCouponCode ? (
                      <button
                        className="cart-coupon-btn cart-coupon-btn--remove"
                        onClick={handleRemoveCoupon}
                        type="button"
                      >
                        إزالة
                      </button>
                    ) : (
                      <button
                        className="cart-coupon-btn cart-coupon-btn--apply"
                        disabled={couponValidating || !couponInput.trim()}
                        onClick={handleApplyCoupon}
                        type="button"
                      >
                        {couponValidating ? "جارٍ التحقق..." : "تطبيق"}
                      </button>
                    )}
                  </div>
                  {couponMessage && (
                    <p className={`cart-coupon-msg ${appliedCouponCode ? "cart-coupon-msg--success" : "cart-coupon-msg--error"}`}>
                      {couponMessage}
                    </p>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="checkout-financial-summary">
                  <div className="summary-row">
                    <span>إجمالي المنتجات:</span>
                    <strong>{formatEGP(subtotalCents)}</strong>
                  </div>
                  {appliedDiscountCents > 0 && (
                    <div className="summary-row summary-row-discount">
                      <span>خصم الكوبون ({appliedCouponCode}):</span>
                      <strong className="discount-highlight">-{formatEGP(appliedDiscountCents)}</strong>
                    </div>
                  )}
                  <div className="summary-row summary-row-total">
                    <span>الإجمالي المطلوب:</span>
                    <strong className="total-highlight">{formatEGP(totalCents)}</strong>
                  </div>
                  <p className="cod-badge">
                    <Icon name="truck" /> الدفع نقدًا عند الاستلام (Cash On Delivery)
                  </p>
                </div>

                {error && (
                  <p className="customer-form-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="customer-primary-button checkout-submit-btn"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? "جارٍ تأكيد الطلب..." : "تأكيد الطلب الآن (الدفع عند الاستلام)"}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
