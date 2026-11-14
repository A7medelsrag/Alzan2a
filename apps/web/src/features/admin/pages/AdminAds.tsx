import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import AdminLayout from "../components/AdminLayout";
import AdFormModal from "../components/AdFormModal";
import AdPreviewModal from "../components/AdPreviewModal";
import {
  BANNER_SLOTS,
  BANNER_SLOT_LABELS,
  bannerToDraft,
  createEmptyBannerDraft,
  formatAdDate,
  getBannerStatus,
  toBannerPayload,
  type BannerDraft,
  type BannerRecord,
  type BannerSlot,
} from "../components/adHelpers";
import { getAdminSession } from "../api/auth";
import {
  deleteHomepageBanner,
  HomepageRequestError,
  loadAdminHomepage,
  saveHomepageBanner,
} from "../../homepage/api/homepage";
import { resolvePublicImageUrl } from "../../../utils/media";

type StatusFilter = "all" | "active" | "inactive" | "expired";

function getAdErrorMessage(reason: unknown): string {
  if (reason instanceof HomepageRequestError) {
    if (reason.kind === "unauthorized") {
      return "انتهت الجلسة أو لا تملكين صلاحية إدارة الإعلانات.";
    }
    if (reason.kind === "setupRequired") {
      return "يلزم إكمال إعداد قاعدة بيانات المحتوى قبل إدارة الإعلانات.";
    }
    if (reason.kind === "invalid") {
      return "تعذر الحفظ: يرجى التأكد من صحة جميع الحقول المدخلة.";
    }
  }
  return "تعذر تحميل أو حفظ الإعلانات. يرجى التحقق من الاتصال ثم المحاولة مرة أخرى.";
}

const STATUS_BADGE_MAP = {
  active: {
    label: "نشط",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  scheduled: {
    label: "مجدول",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  inactive: {
    label: "غير نشط",
    classes: "border-neutral-200 bg-neutral-100 text-neutral-600",
    dot: "bg-neutral-400",
  },
  expired: {
    label: "منتهي",
    classes: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
} as const;

export default function AdminAds() {
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [slotFilter, setSlotFilter] = useState<"ALL" | BannerSlot>("ALL");

  // Modals
  const [formDraft, setFormDraft] = useState<BannerDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [previewDraft, setPreviewDraft] = useState<BannerDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerRecord | null>(null);

  const fetchAds = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const session = await getAdminSession(signal);
      if (!session) throw new HomepageRequestError("unauthorized");
      const result = await loadAdminHomepage(signal);
      if (signal?.aborted) return;
      setCsrfToken(session.csrfToken);
      setBanners(result.banners);
    } catch (reason: unknown) {
      if (!signal?.aborted) {
        setLoadError(getAdErrorMessage(reason));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAds(controller.signal);
    return () => controller.abort();
  }, [fetchAds]);

  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let inactive = 0;
    let expired = 0;

    for (const banner of banners) {
      const status = getBannerStatus(banner, now);
      if (status === "expired") {
        expired += 1;
      } else if (status === "inactive") {
        inactive += 1;
      } else {
        active += 1;
      }
    }

    return {
      total: banners.length,
      active,
      inactive,
      expired,
    };
  }, [banners]);

  const filteredBanners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    return banners
      .filter((banner) => {
        if (slotFilter !== "ALL" && banner.slot !== slotFilter) {
          return false;
        }
        if (statusFilter !== "all") {
          const status = getBannerStatus(banner, now);
          if (statusFilter === "active" && status !== "active" && status !== "scheduled") {
            return false;
          }
          if (statusFilter === "inactive" && status !== "inactive") {
            return false;
          }
          if (statusFilter === "expired" && status !== "expired") {
            return false;
          }
        }
        if (query) {
          const haystack = [
            banner.title ?? "",
            banner.subtitle ?? "",
            banner.linkUrl ?? "",
            banner.buttonLabel ?? "",
            BANNER_SLOT_LABELS[banner.slot],
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, searchQuery, slotFilter, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || slotFilter !== "ALL";

  async function ensureCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;
    const session = await getAdminSession();
    if (!session?.csrfToken) {
      throw new HomepageRequestError("unauthorized");
    }
    setCsrfToken(session.csrfToken);
    return session.csrfToken;
  }

  async function handleSaveBanner(draft: BannerDraft) {
    setBusy(true);
    setFormError("");
    setActionError("");
    setNotice("");
    try {
      const token = await ensureCsrfToken();
      const { id, input } = toBannerPayload(draft);
      await saveHomepageBanner(input, token, id);
      const refreshed = await loadAdminHomepage();
      setBanners(refreshed.banners);
      setFormDraft(null);
      setNotice(id ? "تم تحديث الإعلان بنجاح." : "تمت إضافة الإعلان بنجاح.");
    } catch (reason: unknown) {
      setFormError(getAdErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBanner(banner: BannerRecord) {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const token = await ensureCsrfToken();
      const { input } = toBannerPayload({
        ...bannerToDraft(banner),
        isEnabled: !banner.isEnabled,
      });
      await saveHomepageBanner(input, token, banner.id);
      const refreshed = await loadAdminHomepage();
      setBanners(refreshed.banners);
      setNotice(banner.isEnabled ? "تم إيقاف الإعلان." : "تم تفعيل الإعلان.");
    } catch (reason: unknown) {
      setActionError(getAdErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const token = await ensureCsrfToken();
      await deleteHomepageBanner(deleteTarget.id, token);
      const refreshed = await loadAdminHomepage();
      setBanners(refreshed.banners);
      setDeleteTarget(null);
      setNotice("تم حذف الإعلان بنجاح.");
    } catch (reason: unknown) {
      setActionError(getAdErrorMessage(reason));
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  function openCreateModal() {
    setFormError("");
    setActionError("");
    setFormDraft(createEmptyBannerDraft(banners.length));
  }

  function openEditModal(banner: BannerRecord) {
    setFormError("");
    setActionError("");
    setFormDraft(bannerToDraft(banner));
  }

  return (
    <AdminLayout
      title="إدارة الإعلانات والحملات"
      subtitle="إدارة البنرات الترويجية، مواضع الظهور، وجدولة الحملات الإعلانية في المتجر"
      headerActions={
        <button
          type="button"
          disabled={loading || busy}
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#a50d26] disabled:opacity-60"
        >
          <span aria-hidden="true">+</span>
          <span>إضافة إعلان جديد</span>
        </button>
      }
    >
      <div className="min-w-0 space-y-6">
        {/* Page Header + Breadcrumbs */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-2xs">
          <nav aria-label="مسار التنقل" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
            <Link to="/admin" className="font-medium transition-colors hover:text-[#C8102E]">
              لوحة التحكم
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/admin/marketing" className="font-medium transition-colors hover:text-[#C8102E]">
              التسويق
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-bold text-[#101B30]">إدارة الإعلانات والحملات</span>
          </nav>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-black text-[#101B30] sm:text-xl">
                إدارة الإعلانات والحملات
              </h2>
              <p className="text-xs leading-relaxed text-neutral-600 sm:text-sm">
                أنشئ وعدّل البنرات الإعلانية لسطح المكتب والهاتف، وحدد مواضع ظهورها وتواريخ تفعيلها.
              </p>
            </div>

            <button
              type="button"
              disabled={loading || busy}
              onClick={openCreateModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#a50d26] disabled:opacity-60"
            >
              <span aria-hidden="true">+</span>
              <span>إضافة إعلان جديد</span>
            </button>
          </div>

          {/* Real-data Summary Statistics */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5">
              <span className="block text-xs font-medium text-neutral-500">إجمالي الإعلانات</span>
              <strong className="mt-1 block text-2xl font-black text-[#101B30]">
                {loading ? "—" : stats.total}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <span className="block text-xs font-medium text-emerald-700">الإعلانات النشطة</span>
              <strong className="mt-1 block text-2xl font-black text-emerald-800">
                {loading ? "—" : stats.active}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5">
              <span className="block text-xs font-medium text-neutral-600">الإعلانات غير النشطة</span>
              <strong className="mt-1 block text-2xl font-black text-neutral-800">
                {loading ? "—" : stats.inactive}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-rose-200/80 bg-rose-50/50 p-3.5">
              <span className="block text-xs font-medium text-rose-700">الإعلانات المنتهية</span>
              <strong className="mt-1 block text-2xl font-black text-rose-800">
                {loading ? "—" : stats.expired}
              </strong>
            </div>
          </div>
        </section>

        {/* Feedback Banners */}
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              className="text-rose-700 hover:text-rose-900"
              aria-label="إغلاق الخطأ"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="min-w-0 md:col-span-5">
              <label htmlFor="ads-search" className="sr-only">
                البحث في الإعلانات
              </label>
              <div className="relative">
                <input
                  id="ads-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ابحث بالعنوان، الوصف، نص الزر، أو رابط الوجهة..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 py-2.5 pr-9 pl-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:bg-white focus:outline-hidden"
                />
                <svg
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              </div>
            </div>

            <div className="min-w-0 md:col-span-3">
              <label htmlFor="ads-status-filter" className="sr-only">
                تصفية حسب الحالة
              </label>
              <select
                id="ads-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 px-3.5 py-2.5 text-xs font-medium text-neutral-800 focus:border-[#C8102E] focus:bg-white focus:outline-hidden"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">النشطة والمجدولة</option>
                <option value="inactive">غير النشطة</option>
                <option value="expired">المنتهية</option>
              </select>
            </div>

            <div className="min-w-0 md:col-span-4 flex items-center gap-2">
              <label htmlFor="ads-slot-filter" className="sr-only">
                تصفية حسب موضع الإعلان
              </label>
              <select
                id="ads-slot-filter"
                value={slotFilter}
                onChange={(event) => setSlotFilter(event.target.value as "ALL" | BannerSlot)}
                className="w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3.5 py-2.5 text-xs font-medium text-neutral-800 focus:border-[#C8102E] focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">جميع مواضع الظهور</option>
                {BANNER_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSlotFilter("ALL");
                  }}
                  className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main Content: Loading / Error / Empty / Cards */}
        {loading ? (
          <div aria-busy="true" aria-label="جارٍ تحميل الإعلانات" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 space-y-4"
              >
                <div className="aspect-video w-full rounded-xl bg-neutral-200" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 rounded bg-neutral-200" />
                  <div className="h-3 w-1/2 rounded bg-neutral-100" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="h-8 rounded-lg bg-neutral-100" />
                  <div className="h-8 rounded-lg bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              !
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900">تعذر تحميل الإعلانات</h3>
              <p className="text-xs text-neutral-600">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchAds()}
              className="rounded-xl bg-[#101B30] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1a2b4c]"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#101B30]">
                {hasActiveFilters ? "لا توجد إعلانات مطابقة" : "لا توجد إعلانات مضافة بعد"}
              </h3>
              <p className="text-xs text-neutral-500">
                {hasActiveFilters
                  ? "جرّب تعديل كلمات البحث أو إزالة الفلاتر لعرض جميع الإعلانات."
                  : "ابدأ بإضافة أول بانر إعلاني أو حملة ترويجية لتظهر في متجرك."}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSlotFilter("ALL");
                }}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-50"
              >
                عرض جميع الإعلانات
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#a50d26]"
              >
                + إضافة إعلان جديد
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredBanners.map((banner) => {
              const status = getBannerStatus(banner);
              const badge = STATUS_BADGE_MAP[status];

              return (
                <article
                  key={banner.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xs transition-shadow hover:shadow-md"
                >
                  {/* Visual Preview Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#101B30]">
                    {banner.desktopImageUrl ? (
                      <img
                        src={resolvePublicImageUrl(banner.desktopImageUrl)}
                        alt={banner.title || "صورة الإعلان"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-white"
                        style={{ backgroundColor: banner.overlayColor || "#101B30" }}
                      >
                        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#D6A33A]">
                          إعلان نصي بدون صورة
                        </span>
                        {banner.title && (
                          <p className="mt-2 line-clamp-2 text-sm font-bold">{banner.title}</p>
                        )}
                      </div>
                    )}

                    {/* Subtle Top Badges */}
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-[#101B30]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                        {BANNER_SLOT_LABELS[banner.slot]}
                      </span>
                      <span className="rounded-lg bg-white/90 px-2 py-1 font-mono text-[11px] font-bold text-[#101B30] shadow-2xs">
                        #{banner.sortOrder}
                      </span>
                    </div>

                    {/* Mobile Image Thumbnail Inset */}
                    {banner.mobileImageUrl && (
                      <div
                        title="توجد صورة مخصصة للهاتف"
                        className="absolute bottom-2.5 left-2.5 flex items-end gap-1.5 rounded-xl border border-white/70 bg-white/95 p-1 shadow-md backdrop-blur-xs"
                      >
                        <img
                          src={resolvePublicImageUrl(banner.mobileImageUrl)}
                          alt="نسخة الهاتف"
                          loading="lazy"
                          className="h-12 w-9 rounded-lg object-cover"
                        />
                        <span className="px-1 pb-0.5 text-[10px] font-bold text-[#101B30]">
                          هاتف
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 min-w-0 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-sm font-bold text-[#101B30]">
                          {banner.title || "إعلان بصورة فقط"}
                        </h3>
                        {banner.subtitle ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                            {banner.subtitle}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-neutral-400">بدون عنوان فرعي</p>
                        )}
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.classes}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    {/* Destination & Button */}
                    <div className="space-y-1.5 rounded-xl bg-neutral-50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-neutral-500">الوجهة:</span>
                        {banner.linkUrl ? (
                          <span
                            dir="ltr"
                            title={banner.linkUrl}
                            className="min-w-0 truncate font-mono text-[11px] font-semibold text-[#101B30]"
                          >
                            {banner.linkUrl}
                          </span>
                        ) : (
                          <span className="text-neutral-400">غير محدد</span>
                        )}
                      </div>
                      {banner.buttonLabel && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="shrink-0 text-neutral-500">نص الزر:</span>
                          <span className="min-w-0 truncate font-semibold text-[#C8102E]">
                            {banner.buttonLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Schedule */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                      <div className="min-w-0 rounded-lg border border-neutral-100 px-2.5 py-1.5">
                        <span className="block text-neutral-400">يبدأ في</span>
                        <strong className="mt-0.5 block truncate font-semibold text-neutral-800">
                          {formatAdDate(banner.startsAt)}
                        </strong>
                      </div>
                      <div className="min-w-0 rounded-lg border border-neutral-100 px-2.5 py-1.5">
                        <span className="block text-neutral-400">ينتهي في</span>
                        <strong className="mt-0.5 block truncate font-semibold text-neutral-800">
                          {formatAdDate(banner.endsAt)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50/70 px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleBanner(banner)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                        banner.isEnabled
                          ? "bg-neutral-200/80 text-neutral-700 hover:bg-neutral-300/80"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {banner.isEnabled ? "إيقاف" : "تفعيل"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPreviewDraft(bannerToDraft(banner))}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30] transition-colors hover:bg-neutral-100 disabled:opacity-50"
                      >
                        معاينة
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openEditModal(banner)}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30] transition-colors hover:border-[#D6A33A] hover:bg-amber-50/40 disabled:opacity-50"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDeleteTarget(banner)}
                        className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Drawer */}
      {formDraft && (
        <AdFormModal
          initialDraft={formDraft}
          csrfToken={csrfToken}
          busy={busy}
          serverError={formError}
          onCsrfTokenChange={setCsrfToken}
          onSubmit={handleSaveBanner}
          onClose={() => {
            if (!busy) {
              setFormDraft(null);
              setFormError("");
            }
          }}
        />
      )}

      {/* Preview Modal */}
      {previewDraft && (
        <AdPreviewModal
          banner={previewDraft}
          onClose={() => setPreviewDraft(null)}
          onEdit={() => {
            const target = previewDraft;
            setPreviewDraft(null);
            setFormError("");
            setFormDraft(target);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-delete-modal-title"
          onClick={() => !busy && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 id="ad-delete-modal-title" className="text-base font-bold text-[#101B30]">
                تأكيد حذف الإعلان
              </h3>
              <p className="text-xs leading-relaxed text-neutral-600">
                هل أنت متأكد من حذف الإعلان{" "}
                <strong className="text-neutral-900">
                  "{deleteTarget.title || "إعلان بصورة فقط"}"
                </strong>
                ؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-[#C8102E] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#a50d26] disabled:opacity-60"
              >
                {busy ? "جارٍ الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
