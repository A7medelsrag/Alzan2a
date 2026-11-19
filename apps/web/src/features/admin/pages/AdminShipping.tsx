import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import AdminLayout from "../components/AdminLayout";
import { operationsApi, type ShippingRate } from "../api/operations";
import ShippingStatsCards from "../components/shipping/ShippingStatsCards";
import ShippingTable from "../components/shipping/ShippingTable";
import ShippingToolbar, {
  type ShippingPageSize,
  type ShippingStatusFilter,
} from "../components/shipping/ShippingToolbar";
import {
  computeShippingStats,
  formatShippingApiError,
  isShippingDraftDirty,
  parseShippingDraftPayload,
  toShippingDraft,
  type ShippingRateDraft,
} from "../components/shipping/shippingHelpers";

function TableSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="جارٍ تحميل جدول المحافظات"
      className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden"
    >
      <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-3 justify-between animate-pulse">
        <div className="h-10 w-full sm:max-w-md bg-neutral-100 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-10 w-44 bg-neutral-100 rounded-xl" />
          <div className="h-10 w-24 bg-neutral-100 rounded-xl" />
        </div>
      </div>
      <div className="h-11 bg-[#101B30]/90" />
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 grid grid-cols-2 sm:grid-cols-6 gap-3 items-center animate-pulse"
          >
            <div className="h-5 w-24 bg-neutral-200 rounded-md" />
            <div className="h-10 w-24 bg-neutral-100 rounded-xl mx-auto" />
            <div className="h-10 w-20 bg-neutral-100 rounded-xl mx-auto hidden sm:block" />
            <div className="h-10 w-20 bg-neutral-100 rounded-xl mx-auto hidden sm:block" />
            <div className="h-6 w-16 bg-neutral-100 rounded-full mx-auto hidden sm:block" />
            <div className="h-9 w-20 bg-neutral-200 rounded-xl mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminShipping() {
  const [savedRates, setSavedRates] = useState<ShippingRate[]>([]);
  const [draftsByGov, setDraftsByGov] = useState<Record<string, ShippingRateDraft>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [savingGovs, setSavingGovs] = useState<Record<string, boolean>>({});
  const [justSavedGovs, setJustSavedGovs] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Toolbar & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShippingStatusFilter>("all");
  const [pageSize, setPageSize] = useState<ShippingPageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const savedByGov = useMemo(() => {
    const map: Record<string, ShippingRate> = {};
    for (const rate of savedRates) {
      map[rate.governorate] = rate;
    }
    return map;
  }, [savedRates]);

  const savedByGovRef = useRef<Record<string, ShippingRate>>({});
  savedByGovRef.current = savedByGov;

  const loadRates = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError("");

    try {
      const response = await operationsApi.shipping();
      const incoming = response.data;
      const prevSavedMap = savedByGovRef.current;
      setSavedRates(incoming);

      setDraftsByGov((prevDrafts) => {
        if (!isRefresh || Object.keys(prevDrafts).length === 0) {
          const fresh: Record<string, ShippingRateDraft> = {};
          for (const rate of incoming) {
            fresh[rate.governorate] = toShippingDraft(rate);
          }
          return fresh;
        }

        // Preserve any unsaved local drafts during a manual refresh
        const next: Record<string, ShippingRateDraft> = {};
        for (const rate of incoming) {
          const existingDraft = prevDrafts[rate.governorate];
          const prevSaved = prevSavedMap[rate.governorate];
          if (existingDraft && prevSaved && isShippingDraftDirty(existingDraft, prevSaved)) {
            next[rate.governorate] = existingDraft;
          } else {
            next[rate.governorate] = toShippingDraft(rate);
          }
        }
        return next;
      });
    } catch (err) {
      const msg = formatShippingApiError(err);
      if (isRefresh && Object.keys(savedByGovRef.current).length > 0) {
        setActionError(msg);
      } else {
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRates(false);
  }, [loadRates]);

  const orderedDrafts = useMemo(() => {
    return savedRates.map(
      (rate) => draftsByGov[rate.governorate] ?? toShippingDraft(rate),
    );
  }, [savedRates, draftsByGov]);

  const dirtyGovernorates = useMemo(() => {
    return orderedDrafts.filter((draft) => {
      const saved = savedByGov[draft.governorate];
      return saved ? isShippingDraftDirty(draft, saved) : false;
    });
  }, [orderedDrafts, savedByGov]);

  const dirtySet = useMemo(
    () => new Set(dirtyGovernorates.map((d) => d.governorate)),
    [dirtyGovernorates],
  );

  // If the user was filtering by unsaved edits and saved/reverted them all, return to "all"
  useEffect(() => {
    if (statusFilter === "dirty" && dirtyGovernorates.length === 0) {
      setStatusFilter("all");
    }
  }, [statusFilter, dirtyGovernorates.length]);

  const stats = useMemo(
    () => computeShippingStats(orderedDrafts),
    [orderedDrafts],
  );

  const filteredDrafts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedDrafts.filter((draft) => {
      if (statusFilter === "enabled" && !draft.isEnabled) return false;
      if (statusFilter === "disabled" && draft.isEnabled) return false;
      if (statusFilter === "dirty" && !dirtySet.has(draft.governorate)) return false;

      if (query && !draft.governorate.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [orderedDrafts, search, statusFilter, dirtySet]);

  const effectivePageSize =
    pageSize === "all" ? Math.max(1, filteredDrafts.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredDrafts.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartZeroBased = (safePage - 1) * effectivePageSize;
  const paginatedItems = filteredDrafts.slice(
    pageStartZeroBased,
    pageStartZeroBased + effectivePageSize,
  );
  const pageStartIndex = filteredDrafts.length === 0 ? 0 : pageStartZeroBased + 1;
  const pageEndIndex = pageStartZeroBased + paginatedItems.length;

  const isAnyRowSaving = Object.values(savingGovs).some(Boolean);

  const handleFieldChange = (
    governorate: string,
    field: "priceInput" | "minDaysInput" | "maxDaysInput",
    value: string,
  ) => {
    setDraftsByGov((prev) => {
      const current = prev[governorate];
      if (!current) return prev;
      return {
        ...prev,
        [governorate]: { ...current, [field]: value },
      };
    });
    setJustSavedGovs((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });
    setRowErrors((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });
  };

  const handleToggleEnabled = (governorate: string) => {
    setDraftsByGov((prev) => {
      const current = prev[governorate];
      if (!current) return prev;
      return {
        ...prev,
        [governorate]: { ...current, isEnabled: !current.isEnabled },
      };
    });
    setJustSavedGovs((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });
    setRowErrors((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });
  };

  const handleResetRow = (governorate: string) => {
    const saved = savedByGov[governorate];
    if (!saved) return;
    setDraftsByGov((prev) => ({
      ...prev,
      [governorate]: toShippingDraft(saved),
    }));
    setRowErrors((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });
  };

  const saveRow = async (governorate: string) => {
    if (savingGovs[governorate] || bulkSaving) return;
    const draft = draftsByGov[governorate];
    if (!draft) return;

    const payload = parseShippingDraftPayload(draft);
    if (!payload) {
      setActionError(`تعذر الحفظ: يرجى مراجعة القيم غير الصالحة لمحافظة ${governorate}.`);
      setNotice("");
      return;
    }

    setSavingGovs((prev) => ({ ...prev, [governorate]: true }));
    setActionError("");
    setNotice("");
    setRowErrors((prev) => {
      if (!prev[governorate]) return prev;
      const next = { ...prev };
      delete next[governorate];
      return next;
    });

    try {
      const res = (await operationsApi.updateShipping(governorate, payload)) as {
        data?: ShippingRate;
      } | null;
      const confirmed: ShippingRate = res?.data ?? { governorate, ...payload };

      setSavedRates((prev) =>
        prev.map((item) => (item.governorate === governorate ? confirmed : item)),
      );
      setDraftsByGov((prev) => ({
        ...prev,
        [governorate]: toShippingDraft(confirmed),
      }));
      setJustSavedGovs((prev) => ({ ...prev, [governorate]: true }));
      setNotice(`تم حفظ إعدادات الشحن لمحافظة ${governorate} بنجاح.`);
    } catch (err) {
      const msg = formatShippingApiError(err, governorate);
      setRowErrors((prev) => ({ ...prev, [governorate]: msg }));
      setActionError(msg);
    } finally {
      setSavingGovs((prev) => {
        const next = { ...prev };
        delete next[governorate];
        return next;
      });
    }
  };

  const handleSaveAllChanges = async () => {
    if (bulkSaving || loading || isAnyRowSaving || dirtyGovernorates.length === 0) {
      return;
    }

    const invalidRows = dirtyGovernorates.filter(
      (draft) => parseShippingDraftPayload(draft) === null,
    );
    if (invalidRows.length > 0) {
      const names = invalidRows
        .slice(0, 3)
        .map((d) => d.governorate)
        .join("، ");
      setNotice("");
      setActionError(
        `تعذر حفظ التغييرات: توجد قيم غير صالحة في (${names}${
          invalidRows.length > 3 ? " وغيرها" : ""
        }). يرجى تصحيحها أولاً.`,
      );
      return;
    }

    setBulkSaving(true);
    setNotice("");
    setActionError("");

    let savedCount = 0;
    const failedGovs: string[] = [];
    let firstErrorMessage = "";

    for (const draft of dirtyGovernorates) {
      const payload = parseShippingDraftPayload(draft);
      if (!payload) continue;

      setSavingGovs((prev) => ({ ...prev, [draft.governorate]: true }));
      try {
        const res = (await operationsApi.updateShipping(draft.governorate, payload)) as {
          data?: ShippingRate;
        } | null;
        const confirmed: ShippingRate = res?.data ?? {
          governorate: draft.governorate,
          ...payload,
        };

        setSavedRates((prev) =>
          prev.map((item) => (item.governorate === draft.governorate ? confirmed : item)),
        );
        setDraftsByGov((prev) => ({
          ...prev,
          [draft.governorate]: toShippingDraft(confirmed),
        }));
        setJustSavedGovs((prev) => ({ ...prev, [draft.governorate]: true }));
        setRowErrors((prev) => {
          if (!prev[draft.governorate]) return prev;
          const next = { ...prev };
          delete next[draft.governorate];
          return next;
        });
        savedCount += 1;
      } catch (err) {
        const msg = formatShippingApiError(err, draft.governorate);
        if (!firstErrorMessage) firstErrorMessage = msg;
        failedGovs.push(draft.governorate);
        setRowErrors((prev) => ({ ...prev, [draft.governorate]: msg }));
      } finally {
        setSavingGovs((prev) => {
          const next = { ...prev };
          delete next[draft.governorate];
          return next;
        });
      }
    }

    setBulkSaving(false);

    if (failedGovs.length === 0) {
      setNotice(
        savedCount === 1
          ? `تم حفظ إعدادات الشحن لمحافظة ${dirtyGovernorates[0]!.governorate} بنجاح.`
          : `تم حفظ التغييرات لعدد ${savedCount} محافظات بنجاح.`,
      );
    } else if (savedCount > 0) {
      setNotice(`تم حفظ ${savedCount} محافظات بنجاح.`);
      setActionError(
        `${firstErrorMessage} (تعذر حفظ: ${failedGovs.join("، ")})`,
      );
    } else {
      setActionError(firstErrorMessage || "تعذر حفظ التغييرات. تحقق من الاتصال وحاول مرة أخرى.");
    }
  };

  return (
    <AdminLayout
      title="الشحن"
      subtitle="إدارة أسعار التوصيل ومواعيده حسب المحافظة"
    >
      <div className="min-w-0 space-y-5">
        {/* Page Header Card */}
        <section className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
          <nav
            aria-label="مسار التنقل"
            className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500"
          >
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 font-medium hover:text-[#C8102E] transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>الرئيسية</span>
            </Link>
            <span aria-hidden="true" className="text-neutral-300">
              /
            </span>
            <span className="font-bold text-[#101B30]">الشحن</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#C8102E]/10 text-[#C8102E] flex items-center justify-center shrink-0">
                  <svg
                    className="w-4.5 h-4.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 6h11v10H3V6zm11 4h4l3 3v3h-7v-6z"
                    />
                    <circle cx="7.5" cy="18" r="2" />
                    <circle cx="17.5" cy="18" r="2" />
                  </svg>
                </span>
                <h2 className="text-lg sm:text-xl font-black text-[#101B30] leading-snug">
                  إدارة الشحن وأسعار التوصيل حسب المحافظة
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                إعداد تكاليف التوصيل ومواعيد الشحن لكل محافظة
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={
                  loading ||
                  bulkSaving ||
                  isAnyRowSaving ||
                  dirtyGovernorates.length === 0
                }
                onClick={() => void handleSaveAllChanges()}
                title={
                  dirtyGovernorates.length === 0
                    ? "لا توجد تعديلات غير محفوظة"
                    : `حفظ التغييرات لعدد ${dirtyGovernorates.length} محافظة`
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkSaving ? (
                  <>
                    <span
                      className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    <span>جارٍ حفظ التغييرات...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>حفظ التغييرات</span>
                    {dirtyGovernorates.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-[11px] font-extrabold tabular-nums">
                        {dirtyGovernorates.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Shipping Statistics */}
        <ShippingStatsCards stats={stats} loading={loading && savedRates.length === 0} />

        {/* Feedback Banners */}
        {notice && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-emerald-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="إغلاق إشعار النجاح"
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-[#C8102E] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError("")}
              aria-label="إغلاق رسالة الخطأ"
              className="text-rose-700 hover:text-rose-900 font-bold px-1 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Loading / Error / Table */}
        {loading && savedRates.length === 0 ? (
          <TableSkeleton />
        ) : loadError && savedRates.length === 0 ? (
          <div
            role="alert"
            className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-4 shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8102E] flex items-center justify-center mx-auto font-black text-lg">
              !
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-[#101B30]">تعذر تحميل أسعار الشحن</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRates(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#101B30] hover:bg-[#1a2b4c] text-xs font-bold text-white shadow-2xs transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <section className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden min-w-0">
            <ShippingToolbar
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
              pageSize={pageSize}
              onPageSizeChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
              onRefresh={() => void loadRates(true)}
              refreshing={refreshing || loading}
              totalCount={stats.totalGovernorates}
              enabledCount={stats.enabledCount}
              disabledCount={stats.disabledCount}
              dirtyCount={dirtyGovernorates.length}
            />

            {savedRates.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-[#101B30]">
                  لا توجد محافظات مسجلة في إعدادات الشحن
                </p>
                <p className="text-xs text-neutral-500">
                  تأكد من تهيئة بيانات المحافظات ثم أعد التحديث.
                </p>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#101B30]">
                    لم يتم العثور على محافظات مطابقة
                  </h3>
                  <p className="text-xs text-neutral-500">
                    لا توجد نتائج تطابق كلمة البحث أو التصفية المحددة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold text-[#101B30] transition-colors"
                >
                  عرض جميع المحافظات
                </button>
              </div>
            ) : (
              <ShippingTable
                items={paginatedItems}
                savedByGov={savedByGov}
                savingGovs={savingGovs}
                justSavedGovs={justSavedGovs}
                rowErrors={rowErrors}
                bulkSaving={bulkSaving}
                totalFilteredCount={filteredDrafts.length}
                totalAllCount={savedRates.length}
                currentPage={safePage}
                totalPages={totalPages}
                pageStartIndex={pageStartIndex}
                pageEndIndex={pageEndIndex}
                onPageChange={setCurrentPage}
                onFieldChange={handleFieldChange}
                onToggleEnabled={handleToggleEnabled}
                onSaveRow={(gov) => void saveRow(gov)}
                onResetRow={handleResetRow}
              />
            )}
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
