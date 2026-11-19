import { formatEGP } from "@store/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminProducts } from "../api/management";
import {
  operationsApi,
  type PurchaseInvoice,
  type PurchasesResponse,
  type Supplier,
} from "../api/operations";
import AdminLayout from "../components/AdminLayout";
import ConfirmationDialog from "../components/purchases/ConfirmationDialog";
import EmptyState from "../components/purchases/EmptyState";
import InvoiceDetailsDrawer from "../components/purchases/InvoiceDetailsDrawer";
import LoadingSkeleton from "../components/purchases/LoadingSkeleton";
import PurchaseInvoiceForm from "../components/purchases/PurchaseInvoiceForm";
import PurchaseInvoicesTable from "../components/purchases/PurchaseInvoicesTable";
import PurchasePaymentModal from "../components/purchases/PurchasePaymentModal";
import PurchasesPageHeader from "../components/purchases/PurchasesPageHeader";
import PurchaseStatisticsCards from "../components/purchases/PurchaseStatisticsCards";
import PurchasesToolbar from "../components/purchases/PurchasesToolbar";
import SupplierModal from "../components/purchases/SupplierModal";
import {
  computePurchaseStats,
  filterAndSortInvoices,
  formatPurchaseApiError,
  getInvoiceDisplayNumber,
  type ProductVariantOption,
  type PurchasePageSize,
  type PurchaseSortOption,
  type PurchaseStatusFilter,
} from "../components/purchases/purchasesHelpers";

export default function AdminPurchases() {
  const [data, setData] = useState<PurchasesResponse["data"]>({ suppliers: [], invoices: [] });
  const [variants, setVariants] = useState<ProductVariantOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  // Filters, Sorting & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatusFilter>("ALL");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<PurchaseSortOption>("date_desc");
  const [pageSize, setPageSize] = useState<PurchasePageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [newlyCreatedSupplierId, setNewlyCreatedSupplierId] = useState<string | undefined>(
    undefined,
  );
  const [detailsInvoiceId, setDetailsInvoiceId] = useState<string | null>(null);
  const [paymentTargetId, setPaymentTargetId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PurchaseInvoice | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError("");

    try {
      const [purchasesRes, productsRes] = await Promise.all([
        operationsApi.purchases(),
        fetchAdminProducts(),
      ]);
      setData(purchasesRes.data);
      setVariants(
        productsRes.data.flatMap((product) =>
          product.variants.map((variant) => ({
            id: variant.id,
            productId: product.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            stockQuantity: variant.stockQuantity,
            priceCents: variant.priceCents,
            label: `${product.name} — ${variant.name}`,
          })),
        ),
      );
    } catch (error) {
      setLoadError(
        formatPurchaseApiError(
          error,
          "تعذر تحميل بيانات المشتريات. تحقق من صلاحياتك واتصال الخادم.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const stats = useMemo(
    () => computePurchaseStats(data.invoices, data.suppliers),
    [data.invoices, data.suppliers],
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter !== "ALL" ||
      supplierFilter !== "ALL" ||
      dateFrom ||
      dateTo,
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSupplierFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setSortBy("date_desc");
    setCurrentPage(1);
  };

  const filteredInvoices = useMemo(
    () =>
      filterAndSortInvoices(data.invoices, {
        search,
        status: statusFilter,
        supplierId: supplierFilter,
        dateFrom,
        dateTo,
        sortBy,
      }),
    [data.invoices, search, statusFilter, supplierFilter, dateFrom, dateTo, sortBy],
  );

  const totalPages =
    pageSize === "ALL"
      ? 1
      : Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = pageSize === "ALL" ? 0 : (safePage - 1) * pageSize;
  const pageEndIndex =
    pageSize === "ALL"
      ? filteredInvoices.length
      : Math.min(filteredInvoices.length, pageStartIndex + pageSize);
  const paginatedInvoices =
    pageSize === "ALL"
      ? filteredInvoices
      : filteredInvoices.slice(pageStartIndex, pageEndIndex);

  const detailsInvoice = useMemo(
    () =>
      detailsInvoiceId
        ? data.invoices.find((inv) => inv.id === detailsInvoiceId) ?? null
        : null,
    [data.invoices, detailsInvoiceId],
  );

  const paymentTargetInvoice = useMemo(
    () =>
      paymentTargetId
        ? data.invoices.find((inv) => inv.id === paymentTargetId) ?? null
        : null,
    [data.invoices, paymentTargetId],
  );

  const handleSupplierCreated = (supplier: Supplier) => {
    setData((prev) => ({
      ...prev,
      suppliers: [
        ...prev.suppliers.filter((existing) => existing.id !== supplier.id),
        supplier,
      ].sort((a, b) => a.name.localeCompare(b.name, "ar")),
    }));
    if (invoiceFormOpen) {
      setNewlyCreatedSupplierId(supplier.id);
    }
    setActionError("");
    setNotice(`تمت إضافة المورد "${supplier.name}" بنجاح.`);
    void loadData(true);
  };

  const handleInvoiceSaved = async ({
    invoice,
    approved,
    confirmError,
  }: {
    invoice: PurchaseInvoice;
    approved: boolean;
    confirmError?: string;
  }) => {
    setActionError("");
    setNotice("");
    await loadData(true);

    if (confirmError) {
      setActionError(confirmError);
      return;
    }

    if (approved) {
      setNotice(
        `تم إنشاء واعتماد الفاتورة ${getInvoiceDisplayNumber(invoice)} وإضافة الكميات للمخزون بنجاح.`,
      );
    } else {
      setNotice(
        `تم حفظ مسودة الفاتورة ${getInvoiceDisplayNumber(invoice)} بنجاح (لم يتغير المخزون).`,
      );
    }
  };

  const handleConfirmPurchase = async () => {
    if (!confirmTarget || confirming) return;

    const target = confirmTarget;
    setConfirming(true);
    setActionError("");
    setNotice("");

    try {
      await operationsApi.confirmPurchase(target.id);
      setConfirmTarget(null);
      await loadData(true);
      setNotice(
        `تم اعتماد الفاتورة ${getInvoiceDisplayNumber(target)} وإضافة الكميات للمخزون وتحديث متوسط التكلفة.`,
      );
    } catch (error) {
      setConfirmTarget(null);
      setActionError(formatPurchaseApiError(error, "تعذر اعتماد الفاتورة."));
      await loadData(true);
    } finally {
      setConfirming(false);
    }
  };

  const handlePaymentRecorded = async () => {
    setActionError("");
    await loadData(true);
    setNotice("تم تسجيل الدفعة وتحديث الرصيد المتبقي بنجاح.");
  };

  return (
    <AdminLayout
      title="المشتريات"
      subtitle="إدارة الموردين وفواتير الشراء والمبالغ المستحقة"
    >
      <div className="space-y-5 min-w-0">
        {/* Page Header */}
        <PurchasesPageHeader
          disabled={loading && data.invoices.length === 0 && data.suppliers.length === 0}
          onCreateInvoice={() => {
            setNewlyCreatedSupplierId(undefined);
            setInvoiceFormOpen(true);
          }}
          onCreateSupplier={() => setSupplierModalOpen(true)}
        />

        {/* Purchase Statistics Cards */}
        <PurchaseStatisticsCards
          stats={stats}
          loading={loading && data.invoices.length === 0 && data.suppliers.length === 0}
        />

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

        {/* Main Content: Loading / Load Error / Invoices List */}
        {loading && data.invoices.length === 0 && data.suppliers.length === 0 ? (
          <LoadingSkeleton />
        ) : loadError && data.invoices.length === 0 && data.suppliers.length === 0 ? (
          <div
            role="alert"
            className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-4 shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8102E] flex items-center justify-center mx-auto font-black text-lg">
              !
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-[#101B30]">تعذر تحميل بيانات المشتريات</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadData(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#101B30] hover:bg-[#1a2b4c] text-xs font-bold text-white shadow-2xs transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            {loadError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2"
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => void loadData(true)}
                  className="px-3 py-1 rounded-lg bg-white border border-amber-300 font-bold text-amber-900 shrink-0"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            <PurchasesToolbar
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
              supplierFilter={supplierFilter}
              onSupplierFilterChange={(val) => {
                setSupplierFilter(val);
                setCurrentPage(1);
              }}
              dateFrom={dateFrom}
              onDateFromChange={(val) => {
                setDateFrom(val);
                setCurrentPage(1);
              }}
              dateTo={dateTo}
              onDateToChange={(val) => {
                setDateTo(val);
                setCurrentPage(1);
              }}
              sortBy={sortBy}
              onSortChange={(val) => {
                setSortBy(val);
                setCurrentPage(1);
              }}
              pageSize={pageSize}
              onPageSizeChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
              suppliers={data.suppliers}
              onRefresh={() => void loadData(true)}
              onResetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
              refreshing={refreshing || loading}
              filteredCount={filteredInvoices.length}
              totalCount={data.invoices.length}
            />

            {data.invoices.length === 0 ? (
              <EmptyState
                variant="empty"
                title="لا توجد فواتير شراء حتى الآن."
                description="قم بإضافة فاتورة شراء جديدة للبدء."
                actionLabel="إضافة فاتورة شراء جديدة"
                onAction={() => {
                  setNewlyCreatedSupplierId(undefined);
                  setInvoiceFormOpen(true);
                }}
              />
            ) : filteredInvoices.length === 0 ? (
              <EmptyState
                variant="filtered"
                title="لا توجد فواتير مطابقة للبحث"
                description="جرّب تغيير كلمة البحث أو حالة الفاتورة أو نطاق التاريخ."
                actionLabel="عرض جميع الفواتير"
                onAction={resetFilters}
              />
            ) : (
              <PurchaseInvoicesTable
                invoices={paginatedInvoices}
                totalFilteredCount={filteredInvoices.length}
                currentPage={safePage}
                totalPages={totalPages}
                pageStartIndex={pageStartIndex}
                pageEndIndex={pageEndIndex}
                busy={confirming}
                onPageChange={setCurrentPage}
                onViewDetails={(invoice) => setDetailsInvoiceId(invoice.id)}
                onRequestConfirm={(invoice) => setConfirmTarget(invoice)}
                onOpenPayment={(invoice) => setPaymentTargetId(invoice.id)}
              />
            )}
          </div>
        )}
      </div>

      {/* Create Purchase Invoice Modal */}
      <PurchaseInvoiceForm
        open={invoiceFormOpen}
        suppliers={data.suppliers}
        variants={variants}
        selectedSupplierIdOverride={newlyCreatedSupplierId}
        isChildModalOpen={supplierModalOpen}
        onClose={() => setInvoiceFormOpen(false)}
        onOpenAddSupplier={() => setSupplierModalOpen(true)}
        onSaved={handleInvoiceSaved}
      />

      {/* Add Supplier Modal (usable independently or stacked above Invoice Form) */}
      <SupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
      />

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        invoice={detailsInvoice}
        busy={confirming}
        onClose={() => {
          if (!paymentTargetId && !confirmTarget && !confirming) {
            setDetailsInvoiceId(null);
          }
        }}
        onRequestConfirm={(invoice) => setConfirmTarget(invoice)}
        onOpenPayment={(invoice) => setPaymentTargetId(invoice.id)}
      />

      {/* Record Payment Modal */}
      <PurchasePaymentModal
        invoice={paymentTargetInvoice}
        onClose={() => setPaymentTargetId(null)}
        onRecorded={handlePaymentRecorded}
      />

      {/* Confirm/Approve Draft Invoice Dialog */}
      <ConfirmationDialog
        open={Boolean(confirmTarget)}
        variant="approve"
        title={`اعتماد فاتورة الشراء ${confirmTarget ? getInvoiceDisplayNumber(confirmTarget) : ""}`}
        message={
          confirmTarget
            ? `هل تريد اعتماد فاتورة المورد "${confirmTarget.supplier.name}" بقيمة ${formatEGP(confirmTarget.totalCents)}؟ سيتم إضافة الكميات إلى المخزون وتحديث متوسط التكلفة، ولا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="اعتماد وإضافة للمخزون"
        loadingLabel="جارٍ الاعتماد..."
        loading={confirming}
        onCancel={() => {
          if (!confirming) setConfirmTarget(null);
        }}
        onConfirm={() => void handleConfirmPurchase()}
      />
    </AdminLayout>
  );
}
