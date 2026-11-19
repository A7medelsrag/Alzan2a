import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { operationsApi, type PurchaseInvoice, type Supplier } from "../../api/operations";
import ConfirmationDialog from "./ConfirmationDialog";
import EmptyState from "./EmptyState";
import InvoiceDetailsDrawer from "./InvoiceDetailsDrawer";
import LoadingSkeleton from "./LoadingSkeleton";
import PurchaseInvoiceForm from "./PurchaseInvoiceForm";
import PurchaseInvoicesTable from "./PurchaseInvoicesTable";
import PurchasePaymentModal from "./PurchasePaymentModal";
import PurchaseStatisticsCards from "./PurchaseStatisticsCards";
import PurchasesPageHeader from "./PurchasesPageHeader";
import PurchasesToolbar from "./PurchasesToolbar";
import SupplierModal from "./SupplierModal";
import { computePurchaseStats } from "./purchasesHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const suppliers: Supplier[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "شركة النيل للتوريدات",
    contactName: "كريم",
    phone: "01001112223",
    email: "sales@nile.example",
    address: "مدينة نصر، القاهرة",
  },
];

const invoices: PurchaseInvoice[] = [
  {
    id: "aaaa1111-1111-4111-8111-111111111111",
    invoiceNumber: "INV-2026-01",
    status: "DRAFT",
    invoiceDate: "2026-11-10T12:00:00.000Z",
    subtotalCents: 50000,
    extraCostsCents: 5000,
    totalCents: 55000,
    paidCents: 0,
    notes: "شحنة مبدئية",
    supplier: suppliers[0],
    lines: [
      {
        id: "line-1",
        quantity: 5,
        unitCostCents: 10000,
        lineTotalCents: 50000,
        variant: { sku: "HD-01", name: "أسود / L", product: { name: "هودي قطن" } },
      },
    ],
    payments: [],
  },
  {
    id: "bbbb2222-2222-4222-8222-222222222222",
    invoiceNumber: "INV-2026-02",
    status: "CONFIRMED",
    invoiceDate: "2026-11-14T12:00:00.000Z",
    confirmedAt: "2026-11-14T14:30:00.000Z",
    subtotalCents: 100000,
    extraCostsCents: 10000,
    totalCents: 110000,
    paidCents: 40000,
    supplier: suppliers[0],
    lines: [
      {
        id: "line-2",
        quantity: 10,
        unitCostCents: 10000,
        allocatedExtraCostCents: 10000,
        lineTotalCents: 100000,
        variant: { sku: "TS-01", name: "أبيض / M", product: { name: "تيشيرت" } },
      },
    ],
    payments: [
      {
        id: "pay-1",
        amountCents: 40000,
        method: "BANK_TRANSFER",
        reference: "TRF-998",
        paidAt: "2026-11-14T15:00:00.000Z",
      },
    ],
  },
];

describe("purchases dashboard UI components", () => {
  it("renders breadcrumbs, heading, and separate invoice and supplier actions in header", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PurchasesPageHeader
          onCreateInvoice={() => undefined}
          onCreateSupplier={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("الرئيسية");
    expect(html).toContain("المشتريات");
    expect(html).toContain("إدارة الموردين وفواتير الشراء والمبالغ المستحقة");
    expect(html).toContain("إضافة فاتورة شراء جديدة");
    expect(html).toContain("إضافة مورد");
  });

  it("renders loading skeleton for statistics cards without fabricated numbers", () => {
    const html = renderToStaticMarkup(
      <PurchaseStatisticsCards loading={true} stats={computePurchaseStats([], [])} />,
    );
    expect(html).toContain('aria-busy="true"');
  });

  it("renders real calculated statistics formatted in EGP", () => {
    const stats = computePurchaseStats(invoices, suppliers);
    const html = renderToStaticMarkup(
      <PurchaseStatisticsCards loading={false} stats={stats} />,
    );

    expect(html).toContain("إجمالي المشتريات");
    expect(html).toContain("1100.00 ج.م");
    expect(html).toContain("إجمالي الموردين");
    expect(html).toContain("إجمالي الفواتير");
    expect(html).toContain("إجمالي المبالغ المستحقة");
    expect(html).toContain("700.00 ج.م");
  });

  it("renders search and filter toolbar controls", () => {
    const html = renderToStaticMarkup(
      <PurchasesToolbar
        search=""
        onSearchChange={() => undefined}
        statusFilter="ALL"
        onStatusFilterChange={() => undefined}
        supplierFilter="ALL"
        onSupplierFilterChange={() => undefined}
        dateFrom=""
        onDateFromChange={() => undefined}
        dateTo=""
        onDateToChange={() => undefined}
        sortBy="date_desc"
        onSortChange={() => undefined}
        pageSize={10}
        onPageSizeChange={() => undefined}
        suppliers={suppliers}
        onRefresh={() => undefined}
        onResetFilters={() => undefined}
        hasActiveFilters={false}
        refreshing={false}
        filteredCount={2}
        totalCount={2}
      />,
    );

    expect(html).toContain('aria-label="البحث في فواتير الشراء"');
    expect(html).toContain("كل الحالات");
    expect(html).toContain("شركة النيل للتوريدات");
    expect(html).toContain("تحديث");
  });

  it("renders navy table header, status badges, and lifecycle-appropriate actions", () => {
    const html = renderToStaticMarkup(
      <PurchaseInvoicesTable
        invoices={invoices}
        totalFilteredCount={2}
        currentPage={1}
        totalPages={1}
        pageStartIndex={0}
        pageEndIndex={2}
        busy={false}
        onPageChange={() => undefined}
        onViewDetails={() => undefined}
        onRequestConfirm={() => undefined}
        onOpenPayment={() => undefined}
      />,
    );

    expect(html).toContain("bg-[#101B30]");
    expect(html).toContain("INV-2026-01");
    expect(html).toContain("INV-2026-02");
    expect(html).toContain("مسودة");
    expect(html).toContain("معتمدة");
    expect(html).toContain("مدفوعة جزئياً");
    expect(html).toContain("عرض التفاصيل");
    expect(html).toContain("اعتماد الفاتورة");
    expect(html).toContain("تسجيل دفعة");
  });

  it("renders empty state and loading skeleton cleanly", () => {
    const emptyHtml = renderToStaticMarkup(<EmptyState onAction={() => undefined} />);
    expect(emptyHtml).toContain("لا توجد فواتير شراء حتى الآن.");
    expect(emptyHtml).toContain("قم بإضافة فاتورة شراء جديدة للبدء.");
    expect(emptyHtml).toContain("إضافة فاتورة شراء جديدة");

    const skeletonHtml = renderToStaticMarkup(<LoadingSkeleton />);
    expect(skeletonHtml).toContain('aria-busy="true"');
  });

  it("renders invoice details drawer and approval confirmation dialog", () => {
    const detailsHtml = renderToStaticMarkup(
      <InvoiceDetailsDrawer
        invoice={invoices[1]}
        busy={false}
        onClose={() => undefined}
        onRequestConfirm={() => undefined}
        onOpenPayment={() => undefined}
      />,
    );

    expect(detailsHtml).toContain("INV-2026-02");
    expect(detailsHtml).toContain("تيشيرت");
    expect(detailsHtml).toContain("TRF-998");
    expect(detailsHtml).toContain("تحويل بنكي");
    expect(detailsHtml).toContain("تسجيل دفعة");

    const confirmHtml = renderToStaticMarkup(
      <ConfirmationDialog
        open={true}
        title="تأكيد الاعتماد"
        message="سيتم إضافة الكميات للمخزون"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(confirmHtml).toContain('role="alertdialog"');
    expect(confirmHtml).toContain("سيتم إضافة الكميات للمخزون");
  });

  it("renders supplier modal, purchase invoice workflow modal, and payment modal cleanly", () => {
    const supplierHtml = renderToStaticMarkup(
      <SupplierModal open={true} onClose={() => undefined} onCreated={() => undefined} />,
    );
    expect(supplierHtml).toContain("إضافة مورد جديد");
    expect(supplierHtml).toContain("اسم المورد");
    expect(supplierHtml).toContain("اسم المسؤول / جهة الاتصال");
    expect(supplierHtml).toContain("رقم الهاتف");
    expect(supplierHtml).toContain("البريد الإلكتروني");
    expect(supplierHtml).toContain("العنوان");

    const formHtml = renderToStaticMarkup(
      <PurchaseInvoiceForm
        open={true}
        suppliers={suppliers}
        variants={[
          {
            id: "v-1",
            productId: "p-1",
            productName: "هودي قطن",
            variantName: "أسود / L",
            sku: "HD-01",
            stockQuantity: 10,
            priceCents: 25000,
            label: "هودي قطن — أسود / L",
          },
        ]}
        onClose={() => undefined}
        onOpenAddSupplier={() => undefined}
        onSaved={() => undefined}
      />,
    );
    expect(formHtml).toContain("بيانات الفاتورة");
    expect(formHtml).toContain("الأصناف المشتراة");
    expect(formHtml).toContain("مصاريف إضافية");
    expect(formHtml).toContain("حفظ كمسودة");
    expect(formHtml).toContain("اعتماد الفاتورة وإضافتها للمخزون");
    expect(formHtml).toContain("المسودة لا تغيّر المخزون");

    const paymentHtml = renderToStaticMarkup(
      <PurchasePaymentModal
        invoice={invoices[1]}
        onClose={() => undefined}
        onRecorded={() => undefined}
      />,
    );
    expect(paymentHtml).toContain("تسجيل دفعة");
    expect(paymentHtml).toContain("700.00 ج.م");
    expect(paymentHtml).toContain("سداد المتبقي بالكامل");
    expect(paymentHtml).toContain("تحويل بنكي");
  });
});

describe("operationsApi purchases contract", () => {
  it("fetches CSRF token and preserves API payloads for suppliers, invoices, approval, and payments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { suppliers, invoices } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-purchases-123" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: suppliers[0] }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-purchases-123" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: invoices[0] }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-purchases-123" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: invoices[1] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-purchases-123" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: invoices[1].payments![0] }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const listRes = await operationsApi.purchases();
    expect(listRes.data.invoices).toHaveLength(2);

    await operationsApi.createSupplier({ name: "شركة النيل للتوريدات", phone: "01001112223" });
    await operationsApi.createPurchase({
      supplierId: suppliers[0].id,
      invoiceNumber: "INV-2026-01",
      extraCostsCents: 5000,
      lines: [{ variantId: "33333333-3333-4333-8333-333333333333", quantity: 5, unitCostCents: 10000 }],
    });
    await operationsApi.confirmPurchase(invoices[0].id);
    await operationsApi.payPurchase(invoices[1].id, {
      amountCents: 40000,
      method: "BANK_TRANSFER",
      reference: "TRF-998",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/purchases",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/auth/me",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/purchases/suppliers",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/admin/purchases/${invoices[0].id}/confirm`,
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/admin/purchases/${invoices[1].id}/payments`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
