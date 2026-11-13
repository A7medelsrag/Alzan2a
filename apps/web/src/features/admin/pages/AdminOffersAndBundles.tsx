import { useEffect, useState, type FormEvent } from "react";
import {
  formatEGP,
  type BundlePublic,
  type ProductOfferPublic,
  type StoreProduct,
} from "@store/shared";
import { getAdminSession } from "../api/auth";
import {
  createAdminOffer,
  deleteAdminOffer,
  listAdminOffers,
  updateAdminOffer,
} from "../api/offers";
import {
  createAdminBundle,
  deleteAdminBundle,
  listAdminBundles,
  updateAdminBundle,
} from "../api/bundles";
import { listCatalogProducts } from "../../catalog/api/catalog";

type TabMode = "offers" | "bundles";

export default function AdminOffersAndBundles() {
  const [tab, setTab] = useState<TabMode>("offers");
  const [offers, setOffers] = useState<ProductOfferPublic[]>([]);
  const [bundles, setBundles] = useState<BundlePublic[]>([]);
  const [availableProducts, setAvailableProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Offer Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerDiscountType, setOfferDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [offerDiscountValue, setOfferDiscountValue] = useState("15");
  const [offerMaxDiscountEgp, setOfferMaxDiscountEgp] = useState("");
  const [offerFreeShipping, setOfferFreeShipping] = useState(false);
  const [offerStartsAt, setOfferStartsAt] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");
  const [offerIsActive, setOfferIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerFormError, setOfferFormError] = useState("");

  // Bundle Modal State
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundleInternalName, setBundleInternalName] = useState("");
  const [bundlePublicTitle, setBundlePublicTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundleImageUrl, setBundleImageUrl] = useState("");
  const [bundlePricingType, setBundlePricingType] = useState<"FIXED" | "DISCOUNT">("FIXED");
  const [bundlePriceEgp, setBundlePriceEgp] = useState("350");
  const [bundleDiscountEgp, setBundleDiscountEgp] = useState("50");
  const [bundleFreeShipping, setBundleFreeShipping] = useState(false);
  const [bundleStartsAt, setBundleStartsAt] = useState("");
  const [bundleEndsAt, setBundleEndsAt] = useState("");
  const [bundleDisplayOrder, setBundleDisplayOrder] = useState("0");
  const [bundleIsActive, setBundleIsActive] = useState(true);
  const [bundleItems, setBundleItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [bundleSubmitting, setBundleSubmitting] = useState(false);
  const [bundleFormError, setBundleFormError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession().then((session) => {
      if (active && session) {
        setCsrfToken(session.csrfToken);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [offersRes, bundlesRes, productsRes] = await Promise.all([
        listAdminOffers(),
        listAdminBundles(),
        listCatalogProducts({ pageSize: 100 }),
      ]);
      setOffers(offersRes.data);
      setBundles(bundlesRes.data);
      setAvailableProducts(productsRes.data);
    } catch {
      setError("تعذر تحميل بيانات العروض والباقات. يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // ================= Offer Actions =================
  async function handleToggleOfferStatus(offer: ProductOfferPublic) {
    if (!csrfToken) return;
    try {
      const updated = await updateAdminOffer(
        offer.id,
        { isActive: !offer.isActive },
        csrfToken,
      );
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated.data : o)));
      setNotice(`تم ${!offer.isActive ? "تفعيل" : "تعطيل"} العرض بنجاح.`);
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر تحديث حالة العرض.");
    }
  }

  async function handleDeleteOffer(offer: ProductOfferPublic) {
    if (!csrfToken) return;
    if (!window.confirm(`هل أنت متأكد من حذف العرض "${offer.name}"؟`)) return;
    try {
      await deleteAdminOffer(offer.id, csrfToken);
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      setNotice("تم حذف العرض بنجاح.");
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر حذف العرض.");
    }
  }

  async function handleCreateOffer(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    if (selectedProductIds.length === 0) {
      setOfferFormError("يجب اختيار منتج واحد على الأقل للعرض.");
      return;
    }

    setOfferSubmitting(true);
    setOfferFormError("");

    try {
      const discountVal = parseInt(offerDiscountValue, 10);
      const maxDiscountCents =
        offerDiscountType === "PERCENTAGE" && offerMaxDiscountEgp.trim()
          ? Math.round(parseFloat(offerMaxDiscountEgp) * 100)
          : null;

      const created = await createAdminOffer(
        {
          name: offerName.trim(),
          description: offerDescription.trim() || null,
          discountType: offerDiscountType,
          discountValue:
            offerDiscountType === "PERCENTAGE"
              ? discountVal
              : Math.round(parseFloat(offerDiscountValue) * 100),
          maxDiscountCents,
          isFreeShipping: offerFreeShipping,
          startsAt: offerStartsAt ? new Date(offerStartsAt).toISOString() : null,
          endsAt: offerEndsAt ? new Date(offerEndsAt).toISOString() : null,
          isActive: offerIsActive,
          productIds: selectedProductIds,
        },
        csrfToken,
      );

      setOffers((prev) => [created.data, ...prev]);
      setIsOfferModalOpen(false);
      resetOfferForm();
      setNotice("تم إنشاء العرض بنجاح!");
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setOfferFormError(err instanceof Error ? err.message : "تعذر حفظ العرض.");
    } finally {
      setOfferSubmitting(false);
    }
  }

  function resetOfferForm() {
    setOfferName("");
    setOfferDescription("");
    setOfferDiscountType("PERCENTAGE");
    setOfferDiscountValue("15");
    setOfferMaxDiscountEgp("");
    setOfferFreeShipping(false);
    setOfferStartsAt("");
    setOfferEndsAt("");
    setOfferIsActive(true);
    setSelectedProductIds([]);
    setOfferFormError("");
  }

  // ================= Bundle Actions =================
  async function handleToggleBundleStatus(bundle: BundlePublic) {
    if (!csrfToken) return;
    try {
      const updated = await updateAdminBundle(
        bundle.id,
        { isActive: !bundle.isActive },
        csrfToken,
      );
      setBundles((prev) => prev.map((b) => (b.id === bundle.id ? updated.data : b)));
      setNotice(`تم ${!bundle.isActive ? "تفعيل" : "تعطيل"} الباقة بنجاح.`);
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر تحديث حالة الباقة.");
    }
  }

  async function handleDeleteBundle(bundle: BundlePublic) {
    if (!csrfToken) return;
    if (!window.confirm(`هل أنت متأكد من حذف الباقة "${bundle.publicTitle}"؟`)) return;
    try {
      await deleteAdminBundle(bundle.id, csrfToken);
      setBundles((prev) => prev.filter((b) => b.id !== bundle.id));
      setNotice("تم حذف الباقة بنجاح.");
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر حذف الباقة.");
    }
  }

  async function handleCreateBundle(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    if (bundleItems.length === 0) {
      setBundleFormError("يجب إضافة منتج واحد على الأقل للباقة.");
      return;
    }

    setBundleSubmitting(true);
    setBundleFormError("");

    try {
      const fixedPriceCents =
        bundlePricingType === "FIXED"
          ? Math.round(parseFloat(bundlePriceEgp) * 100)
          : null;
      const discountCents =
        bundlePricingType === "DISCOUNT"
          ? Math.round(parseFloat(bundleDiscountEgp) * 100)
          : null;

      const created = await createAdminBundle(
        {
          internalName: bundleInternalName.trim(),
          publicTitle: bundlePublicTitle.trim(),
          description: bundleDescription.trim() || null,
          imageUrl: bundleImageUrl.trim() || null,
          fixedPriceCents,
          discountCents,
          isFreeShipping: bundleFreeShipping,
          startsAt: bundleStartsAt ? new Date(bundleStartsAt).toISOString() : null,
          endsAt: bundleEndsAt ? new Date(bundleEndsAt).toISOString() : null,
          isActive: bundleIsActive,
          displayOrder: parseInt(bundleDisplayOrder, 10) || 0,
          items: bundleItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        csrfToken,
      );

      setBundles((prev) => [created.data, ...prev]);
      setIsBundleModalOpen(false);
      resetBundleForm();
      setNotice("تم إنشاء الباقة بنجاح!");
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setBundleFormError(err instanceof Error ? err.message : "تعذر حفظ الباقة.");
    } finally {
      setBundleSubmitting(false);
    }
  }

  function resetBundleForm() {
    setBundleInternalName("");
    setBundlePublicTitle("");
    setBundleDescription("");
    setBundleImageUrl("");
    setBundlePricingType("FIXED");
    setBundlePriceEgp("350");
    setBundleDiscountEgp("50");
    setBundleFreeShipping(false);
    setBundleStartsAt("");
    setBundleEndsAt("");
    setBundleDisplayOrder("0");
    setBundleIsActive(true);
    setBundleItems([]);
    setBundleFormError("");
  }

  function addBundleItem(productId: string) {
    if (!productId) return;
    if (bundleItems.some((i) => i.productId === productId)) return;
    setBundleItems((prev) => [...prev, { productId, quantity: 1 }]);
  }

  function removeBundleItem(productId: string) {
    setBundleItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateBundleItemQuantity(productId: string, quantity: number) {
    setBundleItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة العروض والباقات</h1>
          <p className="admin-page-subtitle">
            تحكم في عروض وتخفيضات المنتجات المنفردة وتجميعات الباقات المتكاملة
          </p>
        </div>
        <div>
          {tab === "offers" ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => setIsOfferModalOpen(true)}
            >
              + إضافة عرض منتج جديد
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => setIsBundleModalOpen(true)}
            >
              + إضافة باقة جديدة
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="admin-alert admin-alert-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="admin-tabs-nav" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`admin-btn ${tab === "offers" ? "admin-btn-primary" : "admin-btn-secondary"}`}
          onClick={() => setTab("offers")}
        >
          عروض المنتجات ({offers.length})
        </button>
        <button
          type="button"
          className={`admin-btn ${tab === "bundles" ? "admin-btn-primary" : "admin-btn-secondary"}`}
          onClick={() => setTab("bundles")}
        >
          الباقات والمجموعات ({bundles.length})
        </button>
      </div>

      {loading ? (
        <div className="admin-loading-state">جاري تحميل البيانات...</div>
      ) : tab === "offers" ? (
        /* ================= Offers Tab Table ================= */
        <div className="admin-table-container">
          {offers.length === 0 ? (
            <div className="admin-empty-state">لا توجد عروض حالياً. ابدأ بإنشاء عرض جديد!</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>اسم العرض</th>
                  <th>نوع الخصم</th>
                  <th>قيمة الخصم</th>
                  <th>المنتجات المشمولة</th>
                  <th>الشحن</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <strong>{offer.name}</strong>
                      {offer.description && (
                        <div style={{ fontSize: "0.85rem", color: "#666" }}>{offer.description}</div>
                      )}
                    </td>
                    <td>
                      {offer.discountType === "PERCENTAGE" ? "نسبة مئوية (%)" : "مبلغ ثابت"}
                    </td>
                    <td>
                      {offer.discountType === "PERCENTAGE" ? (
                        <>
                          {offer.discountValue}%
                          {offer.maxDiscountCents ? (
                            <small style={{ display: "block", color: "#666" }}>
                              سقف {formatEGP(offer.maxDiscountCents)}
                            </small>
                          ) : null}
                        </>
                      ) : (
                        formatEGP(offer.discountValue)
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info">
                        {offer.productIds.length} منتج
                      </span>
                    </td>
                    <td>
                      {offer.isFreeShipping ? (
                        <span className="admin-badge admin-badge-success">شحن مجاني</span>
                      ) : (
                        <span style={{ color: "#888" }}>عادي</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleOfferStatus(offer)}
                        className={`admin-status-badge ${
                          offer.isActive ? "status-active" : "status-inactive"
                        }`}
                      >
                        {offer.isActive ? "مفعّل" : "معطّل"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(offer)}
                        className="admin-btn admin-btn-danger admin-btn-sm"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ================= Bundles Tab Table ================= */
        <div className="admin-table-container">
          {bundles.length === 0 ? (
            <div className="admin-empty-state">لا توجد باقات حالياً. ابدأ بإنشاء باقة جديدة!</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>عنوان الباقة</th>
                  <th>السعر / الخصم</th>
                  <th>مكونات الباقة</th>
                  <th>المخزون المتاح</th>
                  <th>الشحن</th>
                  <th>الترتيب</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td>
                      <strong>{bundle.publicTitle}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>
                        الكود الداخلي: {bundle.internalName}
                      </div>
                    </td>
                    <td>
                      {bundle.fixedPriceCents !== null && bundle.fixedPriceCents !== undefined ? (
                        <strong>{formatEGP(bundle.fixedPriceCents)}</strong>
                      ) : bundle.discountCents ? (
                        <span style={{ color: "green" }}>خصم {formatEGP(bundle.discountCents)}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info">
                        {bundle.items.length} منتج
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: (bundle.availableStock ?? 0) > 0 ? "inherit" : "red" }}>
                        {bundle.availableStock ?? 0} باقة
                      </strong>
                    </td>
                    <td>
                      {bundle.isFreeShipping ? (
                        <span className="admin-badge admin-badge-success">شحن مجاني</span>
                      ) : (
                        <span style={{ color: "#888" }}>عادي</span>
                      )}
                    </td>
                    <td>{bundle.displayOrder}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleBundleStatus(bundle)}
                        className={`admin-status-badge ${
                          bundle.isActive ? "status-active" : "status-inactive"
                        }`}
                      >
                        {bundle.isActive ? "مفعّل" : "معطّل"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteBundle(bundle)}
                        className="admin-btn admin-btn-danger admin-btn-sm"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================= Create Offer Modal ================= */}
      {isOfferModalOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: "600px" }}>
            <div className="admin-modal-header">
              <h2>إضافة عرض منتجات جديد</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setIsOfferModalOpen(false);
                  resetOfferForm();
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="admin-form">
              {offerFormError && (
                <div className="admin-alert admin-alert-danger">{offerFormError}</div>
              )}

              <div className="admin-form-group">
                <label>اسم العرض *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تخفيضات الشتاء 20%"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label>الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="وصف مختصر للعرض"
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>نوع الخصم *</label>
                  <select
                    value={offerDiscountType}
                    onChange={(e) =>
                      setOfferDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")
                    }
                    className="admin-select"
                  >
                    <option value="PERCENTAGE">نسبة مئوية (%)</option>
                    <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>
                    {offerDiscountType === "PERCENTAGE" ? "النسبة المئوية (%) *" : "المبلغ (ج.م) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offerDiscountValue}
                    onChange={(e) => setOfferDiscountValue(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              {offerDiscountType === "PERCENTAGE" && (
                <div className="admin-form-group">
                  <label>الحد الأقصى للخصم بالقطعة (ج.م) - اختياري</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="سقف للخصم إن وجد"
                    value={offerMaxDiscountEgp}
                    onChange={(e) => setOfferMaxDiscountEgp(e.target.value)}
                    className="admin-input"
                  />
                </div>
              )}

              <div className="admin-form-group">
                <label>المنتجات المشمولة بالعرض (اختر واحداً أو أكثر) *</label>
                <div
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    padding: "0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  {availableProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds((prev) => [...prev, p.id]);
                            } else {
                              setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: "#666" }}>
                  تم اختيار: {selectedProductIds.length} منتج
                </small>
              </div>

              <div className="admin-form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={offerFreeShipping}
                    onChange={(e) => setOfferFreeShipping(e.target.checked)}
                  />
                  <span>شحن مجاني للطلب الذي يحتوي على منتجات هذا العرض</span>
                </label>
              </div>

              <div className="admin-form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={offerIsActive}
                    onChange={(e) => setOfferIsActive(e.target.checked)}
                  />
                  <span>تفعيل العرض فور الحفظ</span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsOfferModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {offerSubmitting ? "جاري الحفظ..." : "حفظ العرض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Create Bundle Modal ================= */}
      {isBundleModalOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: "650px" }}>
            <div className="admin-modal-header">
              <h2>إضافة باقة متكاملة جديدة</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setIsBundleModalOpen(false);
                  resetBundleForm();
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBundle} className="admin-form">
              {bundleFormError && (
                <div className="admin-alert admin-alert-danger">{bundleFormError}</div>
              )}

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>الاسم الداخلي (للمسؤولين) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: suit-pack-winter"
                    value={bundleInternalName}
                    onChange={(e) => setBundleInternalName(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>عنوان الباقة للعملاء *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: طقم الشتاء المتكامل (بدلة + قميص)"
                    value={bundlePublicTitle}
                    onChange={(e) => setBundlePublicTitle(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>وصف الباقة (اختياري)</label>
                <textarea
                  placeholder="وصف تفصيلي للباقة وما تشمله من مميزات"
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  className="admin-input"
                  rows={2}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>نظام تسعير الباقة *</label>
                  <select
                    value={bundlePricingType}
                    onChange={(e) =>
                      setBundlePricingType(e.target.value as "FIXED" | "DISCOUNT")
                    }
                    className="admin-select"
                  >
                    <option value="FIXED">سعر ثابت للباقة بالكامل (ج.م)</option>
                    <option value="DISCOUNT">خصم محدد من إجمالي سعر القطع (ج.م)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>
                    {bundlePricingType === "FIXED"
                      ? "السعر الثابت للباقة (ج.م) *"
                      : "قيمة الخصم من إجمالي القطع (ج.م) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bundlePricingType === "FIXED" ? bundlePriceEgp : bundleDiscountEgp}
                    onChange={(e) =>
                      bundlePricingType === "FIXED"
                        ? setBundlePriceEgp(e.target.value)
                        : setBundleDiscountEgp(e.target.value)
                    }
                    className="admin-input"
                  />
                </div>
              </div>

              {/* Component Products Selection */}
              <div className="admin-form-group">
                <label>مكونات الباقة (المنتجات الإلزامية) *</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <select
                    id="bundle-add-product-select"
                    className="admin-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addBundleItem(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">-- اختر منتجاً لإضافته للباقة --</option>
                    {availableProducts
                      .filter((p) => !bundleItems.some((bi) => bi.productId === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                {bundleItems.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
                    لم يتم إضافة أي منتجات للباقة بعد.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {bundleItems.map((item) => {
                      const prod = availableProducts.find((p) => p.id === item.productId);
                      return (
                        <div
                          key={item.productId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#f8f9fa",
                            padding: "0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          <span>{prod?.name ?? item.productId}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>الكمية:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={item.quantity}
                              onChange={(e) =>
                                updateBundleItemQuantity(
                                  item.productId,
                                  parseInt(e.target.value, 10) || 1,
                                )
                              }
                              style={{ width: "60px", padding: "0.25rem" }}
                            />
                            <button
                              type="button"
                              onClick={() => removeBundleItem(item.productId)}
                              className="admin-btn admin-btn-danger admin-btn-sm"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="admin-form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={bundleFreeShipping}
                    onChange={(e) => setBundleFreeShipping(e.target.checked)}
                  />
                  <span>شحن مجاني للباقة</span>
                </label>
              </div>

              <div className="admin-form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={bundleIsActive}
                    onChange={(e) => setBundleIsActive(e.target.checked)}
                  />
                  <span>تفعيل الباقة فور الحفظ</span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsBundleModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={bundleSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {bundleSubmitting ? "جاري الحفظ..." : "حفظ الباقة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
