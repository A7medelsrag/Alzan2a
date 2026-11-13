import { useEffect, useState, type FormEvent } from "react";
import { formatEGP, type CouponPublic, type DiscountType } from "@store/shared";
import { getAdminSession } from "../api/auth";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from "../api/coupons";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSubtotalEgp, setMinSubtotalEgp] = useState("0");
  const [maxDiscountEgp, setMaxDiscountEgp] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

  async function loadCoupons() {
    setLoading(true);
    setError("");
    try {
      const res = await listAdminCoupons();
      setCoupons(res.data);
    } catch {
      setError("تعذر تحميل قائمة الكوبونات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function handleToggleStatus(coupon: CouponPublic) {
    if (!csrfToken) return;
    try {
      const updated = await updateAdminCoupon(
        coupon.id,
        { isActive: !coupon.isActive },
        csrfToken,
      );
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? updated.data : c)),
      );
      setNotice(`تم ${!coupon.isActive ? "تفعيل" : "تعطيل"} الكود بنجاح.`);
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر تحديث حالة الكوبون.");
    }
  }

  async function handleDelete(coupon: CouponPublic) {
    if (!csrfToken) return;
    if (!window.confirm(`هل أنت متأكد من حذف كود الخصم "${coupon.code}"؟`)) {
      return;
    }

    try {
      await deleteAdminCoupon(coupon.id, csrfToken);
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      setNotice("تم حذف الكوبون بنجاح.");
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setError("تعذر حذف الكوبون.");
    }
  }

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setFormError("");

    try {
      const val = parseInt(discountValue, 10);
      if (isNaN(val) || val <= 0) {
        setFormError("يرجى إدخال قيمة خصم صحيحة أكبر من صفر.");
        setSubmitting(false);
        return;
      }

      const minSub = Math.round((parseFloat(minSubtotalEgp) || 0) * 100);
      const maxDisc = maxDiscountEgp
        ? Math.round(parseFloat(maxDiscountEgp) * 100)
        : null;
      const limit = usageLimit ? parseInt(usageLimit, 10) : null;

      const res = await createAdminCoupon(
        {
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          discountType,
          discountValue: discountType === "FREE_SHIPPING" ? 1 : val,
          minSubtotalCents: minSub,
          maxDiscountCents: maxDisc,
          usageLimit: limit,
          isActive,
        },
        csrfToken,
      );

      setCoupons((prev) => [res.data, ...prev]);
      setIsModalOpen(false);
      resetForm();
      setNotice(`تم إنشاء كود الخصم "${res.data.code}" بنجاح!`);
      setTimeout(() => setNotice(""), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("حدث خطأ أثناء إنشاء الكوبون.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCode("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("10");
    setMinSubtotalEgp("0");
    setMaxDiscountEgp("");
    setUsageLimit("");
    setIsActive(true);
    setFormError("");
  }

  return (
    <div className="admin-orders-page" dir="rtl">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة الكوبونات والخصومات</h1>
          <p className="admin-page-subtitle">
            إنشاء وإدارة أكواد الخصم الترويجية وعروض الشحن المجاني
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          + إنشاء كود خصم جديد
        </button>
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

      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading-state">جاري تحميل الكوبونات...</div>
        ) : coupons.length === 0 ? (
          <div className="admin-empty-state">
            <p>لا توجد أكواد خصم حاليًا.</p>
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              أنشئ أول كود خصم الآن
            </button>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>كود الخصم</th>
                <th>نوع الخصم</th>
                <th>القيمة</th>
                <th>الحد الأدنى للطلب</th>
                <th>الحد الأقصى للخصم</th>
                <th>الاستخدامات</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <span className="admin-badge admin-badge-primary">
                      {coupon.code}
                    </span>
                    {coupon.description && (
                      <div className="admin-subtext">{coupon.description}</div>
                    )}
                  </td>
                  <td>
                    {coupon.discountType === "PERCENTAGE" && "نسبة مئوية"}
                    {coupon.discountType === "FIXED_AMOUNT" && "مبلغ ثابت"}
                    {coupon.discountType === "FREE_SHIPPING" && "شحن مجاني"}
                  </td>
                  <td>
                    {coupon.discountType === "PERCENTAGE" && `${coupon.discountValue}%`}
                    {coupon.discountType === "FIXED_AMOUNT" && formatEGP(coupon.discountValue)}
                    {coupon.discountType === "FREE_SHIPPING" && "100% الشحن"}
                  </td>
                  <td>
                    {coupon.minSubtotalCents > 0
                      ? formatEGP(coupon.minSubtotalCents)
                      : "بدون حد أدنى"}
                  </td>
                  <td>
                    {coupon.maxDiscountCents
                      ? formatEGP(coupon.maxDiscountCents)
                      : "بدون سقف"}
                  </td>
                  <td>
                    {coupon.usageCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (غير محدود)"}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon)}
                      className={`admin-status-toggle ${
                        coupon.isActive ? "is-active" : "is-inactive"
                      }`}
                      title="اضغط لتغيير الحالة"
                    >
                      {coupon.isActive ? "مفعّل" : "معطّل"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-action admin-btn-danger-outline"
                      onClick={() => handleDelete(coupon)}
                      title="حذف الكوبون"
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

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" dir="rtl">
            <div className="admin-modal-header">
              <h2>إنشاء كود خصم جديد</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon}>
              {formError && (
                <div className="admin-alert admin-alert-danger" role="alert">
                  {formError}
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="coupon-code">كود الخصم (باللغة الإنجليزية) *</label>
                <input
                  id="coupon-code"
                  type="text"
                  required
                  placeholder="مثال: SUMMER2026 أو ZAN2A50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="admin-input text-uppercase"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="coupon-desc">وصف الكوبون (اختياري)</label>
                <input
                  id="coupon-desc"
                  type="text"
                  placeholder="مثال: خصم 20% بمناسبة عروض الصيف"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="coupon-type">نوع الخصم *</label>
                  <select
                    id="coupon-type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="admin-select"
                  >
                    <option value="PERCENTAGE">نسبة مئوية (%)</option>
                    <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                    <option value="FREE_SHIPPING">شحن مجاني</option>
                  </select>
                </div>

                {discountType !== "FREE_SHIPPING" && (
                  <div className="admin-form-group">
                    <label htmlFor="coupon-value">
                      {discountType === "PERCENTAGE" ? "النسبة المئوية (%) *" : "المبلغ (ج.م) *"}
                    </label>
                    <input
                      id="coupon-value"
                      type="number"
                      min="1"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                )}
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="coupon-min-sub">الحد الأدنى للطلب (ج.م)</label>
                  <input
                    id="coupon-min-sub"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minSubtotalEgp}
                    onChange={(e) => setMinSubtotalEgp(e.target.value)}
                    className="admin-input"
                  />
                </div>

                {discountType === "PERCENTAGE" && (
                  <div className="admin-form-group">
                    <label htmlFor="coupon-max-disc">الحد الأقصى للخصم (ج.م)</label>
                    <input
                      id="coupon-max-disc"
                      type="number"
                      min="1"
                      placeholder="اختياري (سقف للخصم)"
                      value={maxDiscountEgp}
                      onChange={(e) => setMaxDiscountEgp(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                <label htmlFor="coupon-limit">الحد الأقصى لعدد الاستخدامات الكلي</label>
                <input
                  id="coupon-limit"
                  type="number"
                  min="1"
                  placeholder="اتركه فارغاً للاستخدام غير المحدود"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>تفعيل الكوبون فور الإنشاء</span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-btn admin-btn-primary"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ الكوبون"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
