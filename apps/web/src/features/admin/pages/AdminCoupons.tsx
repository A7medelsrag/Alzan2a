import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatEGP, type CouponPublic, type DiscountType } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { getAdminSession } from "../api/auth";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from "../api/coupons";
import PageHeader from "../components/promotions/PageHeader";
import StatisticsCard from "../components/promotions/StatisticsCard";
import SearchFilterToolbar from "../components/promotions/SearchFilterToolbar";
import CouponCard from "../components/promotions/CouponCard";
import EmptyState from "../components/promotions/EmptyState";
import LoadingSkeleton from "../components/promotions/LoadingSkeleton";
import ConfirmationDialog from "../components/promotions/ConfirmationDialog";
import DrawerModal from "../components/promotions/DrawerModal";
import StatusBadge from "../components/promotions/StatusBadge";
import {
  formatArabicDate,
  fromDatetimeLocalValue,
  getPromotionStatus,
  toDatetimeLocalValue,
} from "../components/promotions/lifecycle";

const statusFilterOptions = [
  { value: "ALL", label: "كل الحالات" },
  { value: "active", label: "نشط" },
  { value: "scheduled", label: "مجدول" },
  { value: "expired", label: "منتهي" },
  { value: "exhausted", label: "مكتمل الاستخدام" },
  { value: "inactive", label: "معطّل" },
];

const discountTypeOptions = [
  { value: "ALL", label: "كل أنواع الخصم" },
  { value: "PERCENTAGE", label: "نسبة مئوية (%)" },
  { value: "FIXED_AMOUNT", label: "مبلغ ثابت (ج.م)" },
  { value: "FREE_SHIPPING", label: "شحن مجاني" },
];

const sortOptions = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "usage_desc", label: "الأكثر استخداماً" },
  { value: "code_asc", label: "الكود (A - Z)" },
];

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  // Details Modal
  const [detailsCoupon, setDetailsCoupon] = useState<CouponPublic | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<CouponPublic | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSubtotalEgp, setMinSubtotalEgp] = useState("0");
  const [maxDiscountEgp, setMaxDiscountEgp] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession()
      .then((session) => {
        if (active && session) setCsrfToken(session.csrfToken);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function loadCoupons(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const res = await listAdminCoupons();
      setCoupons(res.data);
    } catch {
      setError("تعذر تحميل قائمة الكوبونات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  // Real Statistics
  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let totalUsage = 0;
    for (const c of coupons) {
      const st = getPromotionStatus({
        isActive: c.isActive,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        usageLimit: c.usageLimit,
        usageCount: c.usageCount,
      });
      if (st === "active") active++;
      if (st === "expired" || st === "exhausted") expired++;
      totalUsage += c.usageCount;
    }
    return {
      total: coupons.length,
      active,
      expired,
      totalUsage,
    };
  }, [coupons]);

  // Filtered & Sorted Coupons
  const filteredCoupons = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = coupons.filter((c) => {
      if (
        q &&
        !c.code.toLowerCase().includes(q) &&
        !(c.description || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      const st = getPromotionStatus({
        isActive: c.isActive,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        usageLimit: c.usageLimit,
        usageCount: c.usageCount,
      });
      if (statusFilter !== "ALL" && st !== statusFilter) return false;
      if (typeFilter !== "ALL" && c.discountType !== typeFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "usage_desc") {
        return b.usageCount - a.usageCount;
      }
      if (sortBy === "code_asc") {
        return a.code.localeCompare(b.code, "en");
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [coupons, search, statusFilter, typeFilter, sortBy]);

  function openCreateModal() {
    resetForm();
    setEditingCouponId(null);
    setIsModalOpen(true);
  }

  function openEditModal(coupon: CouponPublic) {
    setEditingCouponId(coupon.id);
    setCode(coupon.code);
    setDescription(coupon.description || "");
    setDiscountType(coupon.discountType);
    setDiscountValue(
      coupon.discountType === "FIXED_AMOUNT"
        ? String(coupon.discountValue / 100)
        : String(coupon.discountValue),
    );
    setMinSubtotalEgp(String(coupon.minSubtotalCents / 100));
    setMaxDiscountEgp(
      coupon.maxDiscountCents ? String(coupon.maxDiscountCents / 100) : "",
    );
    setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : "");
    setStartsAt(toDatetimeLocalValue(coupon.startsAt));
    setEndsAt(toDatetimeLocalValue(coupon.endsAt));
    setIsActive(coupon.isActive);
    setFormError("");
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditingCouponId(null);
    setCode("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("10");
    setMinSubtotalEgp("0");
    setMaxDiscountEgp("");
    setUsageLimit("");
    setStartsAt("");
    setEndsAt("");
    setIsActive(true);
    setFormError("");
  }

  async function handleToggleStatus(coupon: CouponPublic) {
    if (!csrfToken) return;
    setTogglingId(coupon.id);
    setError("");
    try {
      const updated = await updateAdminCoupon(
        coupon.id,
        { isActive: !coupon.isActive },
        csrfToken,
      );
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? updated.data : c)),
      );
      showNotice(`تم ${!coupon.isActive ? "تفعيل" : "تعطيل"} الكود بنجاح.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة الكوبون.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !csrfToken) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAdminCoupon(deleteTarget.id, csrfToken);
      setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showNotice(`تم حذف الكوبون "${deleteTarget.code}" بنجاح.`);
      setDeleteTarget(null);
    } catch {
      setError("تعذر حذف الكوبون.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;

    const cleanCode = code.trim().toUpperCase();
    if (!editingCouponId) {
      if (cleanCode.length < 2 || !/^[A-Za-z0-9_-]+$/.test(cleanCode)) {
        setFormError("كود الخصم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط (حرفان على الأقل).");
        return;
      }
    }

    let numericValue = 1;
    if (discountType !== "FREE_SHIPPING") {
      const parsed = parseFloat(discountValue);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setFormError("يرجى إدخال قيمة خصم صحيحة أكبر من صفر.");
        return;
      }
      if (discountType === "PERCENTAGE" && parsed > 100) {
        setFormError("النسبة المئوية للخصم لا يمكن أن تتجاوز 100%.");
        return;
      }
      numericValue =
        discountType === "PERCENTAGE"
          ? Math.round(parsed)
          : Math.round(parsed * 100);
    }

    const minSub = Math.round((parseFloat(minSubtotalEgp) || 0) * 100);
    if (minSub < 0) {
      setFormError("الحد الأدنى للطلب لا يمكن أن يكون سالباً.");
      return;
    }

    const maxDisc =
      discountType === "PERCENTAGE" && maxDiscountEgp.trim()
        ? Math.round(parseFloat(maxDiscountEgp) * 100)
        : null;
    if (maxDisc !== null && (Number.isNaN(maxDisc) || maxDisc <= 0)) {
      setFormError("الحد الأقصى للخصم يجب أن يكون رقماً موجباً.");
      return;
    }

    const limit = usageLimit.trim() ? parseInt(usageLimit, 10) : null;
    if (limit !== null && (Number.isNaN(limit) || limit <= 0)) {
      setFormError("الحد الأقصى لعدد الاستخدامات يجب أن يكون رقماً موجباً.");
      return;
    }

    const startsAtIso = fromDatetimeLocalValue(startsAt);
    const endsAtIso = fromDatetimeLocalValue(endsAt);
    if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      setFormError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (editingCouponId) {
        const res = await updateAdminCoupon(
          editingCouponId,
          {
            description: description.trim() || null,
            discountType,
            discountValue: numericValue,
            minSubtotalCents: minSub,
            maxDiscountCents: maxDisc,
            usageLimit: limit,
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            isActive,
          },
          csrfToken,
        );
        setCoupons((prev) =>
          prev.map((c) => (c.id === editingCouponId ? res.data : c)),
        );
        showNotice(`تم تحديث كود الخصم "${res.data.code}" بنجاح.`);
      } else {
        const res = await createAdminCoupon(
          {
            code: cleanCode,
            description: description.trim() || null,
            discountType,
            discountValue: numericValue,
            minSubtotalCents: minSub,
            maxDiscountCents: maxDisc,
            usageLimit: limit,
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            isActive,
          },
          csrfToken,
        );
        setCoupons((prev) => [res.data, ...prev]);
        showNotice(`تم إنشاء كود الخصم "${res.data.code}" بنجاح.`);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الكوبون.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyFromDetails(codeText: string) {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedDetails(true);
      setTimeout(() => setCopiedDetails(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <AdminLayout
      title="إدارة الكوبونات"
      subtitle="إدارة أكواد الخصم والعروض الترويجية"
    >
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", to: "/admin" },
          { label: "التسويق", to: "/admin/marketing" },
          { label: "إدارة الكوبونات" },
        ]}
        title="إدارة الكوبونات"
        description="إدارة أكواد الخصم والعروض الترويجية ومتابعة شروط الاستخدام وحدود الصلاحية."
        primaryAction={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>+</span>
            <span>إضافة كوبون جديد</span>
          </button>
        }
      />

      {notice && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatisticsCard
          label="إجمالي الكوبونات"
          value={stats.total}
          accent="navy"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        />
        <StatisticsCard
          label="الكوبونات النشطة"
          value={stats.active}
          accent="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatisticsCard
          label="الكوبونات المنتهية"
          value={stats.expired}
          accent="burgundy"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatisticsCard
          label="إجمالي مرات الاستخدام"
          value={stats.totalUsage}
          accent="gold"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Search & Filter Toolbar */}
      <SearchFilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث بكود الخصم أو الوصف..."
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={statusFilterOptions}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        typeOptions={discountTypeOptions}
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortOptions={sortOptions}
        onRefresh={() => void loadCoupons(true)}
        refreshing={refreshing}
        resultCount={filteredCoupons.length}
      />

      {/* Coupons Grid */}
      {loading ? (
        <LoadingSkeleton count={6} />
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          title={coupons.length === 0 ? "لا توجد أكواد خصم حالياً" : "لا توجد كوبونات مطابقة للبحث"}
          description={
            coupons.length === 0
              ? "ابدأ بإنشاء أول كود خصم أو عرض شحن مجاني لعملائك."
              : "جرّب تعديل كلمات البحث أو إعادة تعيين الفلاتر لعرض جميع الكوبونات."
          }
          action={
            coupons.length === 0 ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs transition-colors"
              >
                + إضافة كوبون جديد
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {filteredCoupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onDetails={(c) => {
                setCopiedDetails(false);
                setDetailsCoupon(c);
              }}
              onEdit={openEditModal}
              onToggleStatus={(c) => void handleToggleStatus(c)}
              onDelete={setDeleteTarget}
              toggling={togglingId === coupon.id}
            />
          ))}
        </div>
      )}

      {/* ================= Coupon Details Modal ================= */}
      <DrawerModal
        open={Boolean(detailsCoupon)}
        onClose={() => setDetailsCoupon(null)}
        title={detailsCoupon ? `تفاصيل الكوبون: ${detailsCoupon.code}` : ""}
        subtitle="معلومات الخصم والقيود والصلاحية"
        footer={
          detailsCoupon && (
            <>
              <button
                type="button"
                onClick={() => setDetailsCoupon(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailsCoupon;
                  setDetailsCoupon(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1b2c4d] text-white text-xs font-bold"
              >
                تعديل الكوبون
              </button>
            </>
          )
        }
      >
        {detailsCoupon && (
          <div className="space-y-4 text-xs">
            <div className="bg-[#101B30] text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span dir="ltr" className="font-mono text-lg font-extrabold text-[#D6A33A]">
                  {detailsCoupon.code}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyFromDetails(detailsCoupon.code)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
                >
                  {copiedDetails ? "تم النسخ ✓" : "نسخ الكود"}
                </button>
              </div>
              <StatusBadge
                status={getPromotionStatus({
                  isActive: detailsCoupon.isActive,
                  startsAt: detailsCoupon.startsAt,
                  endsAt: detailsCoupon.endsAt,
                  usageLimit: detailsCoupon.usageLimit,
                  usageCount: detailsCoupon.usageCount,
                })}
              />
            </div>

            {detailsCoupon.description && (
              <div>
                <h4 className="font-bold text-[#101B30] mb-1">الوصف</h4>
                <p className="text-neutral-600 leading-relaxed">{detailsCoupon.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">قيمة الخصم</span>
                <strong className="text-[#C8102E] text-sm">
                  {detailsCoupon.discountType === "PERCENTAGE"
                    ? `${detailsCoupon.discountValue}%`
                    : detailsCoupon.discountType === "FIXED_AMOUNT"
                      ? formatEGP(detailsCoupon.discountValue)
                      : "شحن مجاني 100%"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">الحد الأدنى للطلب</span>
                <strong className="text-[#101B30]">
                  {detailsCoupon.minSubtotalCents > 0
                    ? formatEGP(detailsCoupon.minSubtotalCents)
                    : "بدون حد أدنى"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">الحد الأقصى للخصم</span>
                <strong className="text-[#101B30]">
                  {detailsCoupon.maxDiscountCents
                    ? formatEGP(detailsCoupon.maxDiscountCents)
                    : "بدون سقف"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">الاستخدامات</span>
                <strong className="text-[#101B30]">
                  {detailsCoupon.usageCount}
                  {detailsCoupon.usageLimit
                    ? ` / ${detailsCoupon.usageLimit}`
                    : " (غير محدود)"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ البدء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(detailsCoupon.startsAt)}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ الانتهاء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(detailsCoupon.endsAt)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* ================= Add / Edit Coupon Modal ================= */}
      <DrawerModal
        open={isModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsModalOpen(false);
            resetForm();
          }
        }}
        title={editingCouponId ? "تعديل الكوبون" : "إضافة كوبون جديد"}
        subtitle="حدد كود الخصم وشروط التطبيق وفترة الصلاحية"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {formError && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* A. Coupon Information */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              بيانات الكوبون
            </legend>
            <div>
              <label htmlFor="coupon-code" className="block text-xs font-semibold text-neutral-700 mb-1">
                كود الخصم (أحرف إنجليزية وأرقام) *
              </label>
              <input
                id="coupon-code"
                type="text"
                required
                disabled={Boolean(editingCouponId)}
                dir="ltr"
                placeholder="SUMMER2026"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs font-mono font-bold text-left uppercase text-neutral-900 focus:outline-hidden focus:border-[#C8102E] disabled:bg-neutral-100 disabled:text-neutral-500"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                {editingCouponId
                  ? "لا يمكن تعديل كود الخصم بعد إنشائه للحفاظ على سجل الطلبات."
                  : "يسمح بالأحرف الإنجليزية والأرقام والشرطة (-) والشرطة السفلية (_)."}
              </p>
            </div>

            <div>
              <label htmlFor="coupon-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
                وصف الكوبون (اختياري)
              </label>
              <input
                id="coupon-desc"
                type="text"
                placeholder="مثال: خصم 20% بمناسبة عروض الصيف"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>
          </fieldset>

          {/* B. Discount Configuration */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              إعدادات الخصم
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-type" className="block text-xs font-semibold text-neutral-700 mb-1">
                  نوع الخصم *
                </label>
                <select
                  id="coupon-type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                >
                  <option value="PERCENTAGE">نسبة مئوية (%)</option>
                  <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                  <option value="FREE_SHIPPING">شحن مجاني</option>
                </select>
              </div>

              {discountType !== "FREE_SHIPPING" && (
                <div>
                  <label htmlFor="coupon-value" className="block text-xs font-semibold text-neutral-700 mb-1">
                    {discountType === "PERCENTAGE" ? "النسبة المئوية (%) *" : "قيمة الخصم (ج.م) *"}
                  </label>
                  <input
                    id="coupon-value"
                    type="number"
                    min="1"
                    max={discountType === "PERCENTAGE" ? "100" : undefined}
                    step={discountType === "PERCENTAGE" ? "1" : "0.01"}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              {discountType === "PERCENTAGE"
                ? "يتم حساب الخصم كنسبة مئوية من إجمالي قيمة المنتجات، ويمكن تحديد سقف أقصى للخصم."
                : discountType === "FIXED_AMOUNT"
                  ? "يتم خصم مبلغ ثابت بالجنيه المصري من إجمالي الطلب."
                  : "يعفي العميل من رسوم الشحن بالكامل عند استيفاء الشروط."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-min-sub" className="block text-xs font-semibold text-neutral-700 mb-1">
                  الحد الأدنى للطلب (ج.م)
                </label>
                <input
                  id="coupon-min-sub"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={minSubtotalEgp}
                  onChange={(e) => setMinSubtotalEgp(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>

              {discountType === "PERCENTAGE" && (
                <div>
                  <label htmlFor="coupon-max-disc" className="block text-xs font-semibold text-neutral-700 mb-1">
                    الحد الأقصى للخصم (ج.م)
                  </label>
                  <input
                    id="coupon-max-disc"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="اختياري (سقف للخصم)"
                    value={maxDiscountEgp}
                    onChange={(e) => setMaxDiscountEgp(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* C. Usage Restrictions */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              قيود الاستخدام
            </legend>
            <div>
              <label htmlFor="coupon-limit" className="block text-xs font-semibold text-neutral-700 mb-1">
                الحد الأقصى لعدد الاستخدامات الكلي
              </label>
              <input
                id="coupon-limit"
                type="number"
                min="1"
                placeholder="اتركه فارغاً للاستخدام غير المحدود"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>
          </fieldset>

          {/* D. Validity Settings */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              إعدادات الصلاحية والحالة
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-starts" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ البدء (اختياري)
                </label>
                <input
                  id="coupon-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
              <div>
                <label htmlFor="coupon-ends" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  id="coupon-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#C8102E] rounded"
              />
              <span>تفعيل الكوبون</span>
            </label>
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : editingCouponId ? "حفظ التعديلات" : "حفظ الكوبون"}
            </button>
          </div>
        </form>
      </DrawerModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="حذف الكوبون"
        message={
          deleteTarget
            ? `هل أنت متأكد من حذف كود الخصم "${deleteTarget.code}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </AdminLayout>
  );
}
