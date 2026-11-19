import { describe, expect, it } from "vitest";
import type { PurchaseInvoice, Supplier } from "../../api/operations";
import {
  computeLineTotalCents,
  computePurchaseStats,
  filterAndSortInvoices,
  formatPiastersToInput,
  getInvoicePaymentState,
  getInvoiceRemainingCents,
  parseEgpToPiasters,
  parsePositiveQuantity,
  validatePaymentDraft,
  validatePurchaseInvoiceDraft,
  validateSupplierDraft,
} from "./purchasesHelpers";

const sampleSuppliers: Supplier[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "شركة النيل", phone: "01001112223" },
  { id: "22222222-2222-4222-8222-222222222222", name: "مصنع الدلتا", contactName: "أحمد" },
];

const sampleInvoices: PurchaseInvoice[] = [
  {
    id: "aaaa1111-1111-4111-8111-111111111111",
    invoiceNumber: "INV-001",
    status: "DRAFT",
    invoiceDate: "2026-11-10T12:00:00.000Z",
    subtotalCents: 10000,
    extraCostsCents: 500,
    totalCents: 10500,
    paidCents: 0,
    supplier: sampleSuppliers[0],
    lines: [
      {
        id: "l1",
        quantity: 2,
        unitCostCents: 5000,
        lineTotalCents: 10000,
        variant: { name: "M", sku: "SKU-1", product: { name: "هودي" } },
      },
    ],
  },
  {
    id: "bbbb2222-2222-4222-8222-222222222222",
    invoiceNumber: "INV-002",
    status: "CONFIRMED",
    invoiceDate: "2026-11-12T12:00:00.000Z",
    subtotalCents: 20000,
    extraCostsCents: 1000,
    totalCents: 21000,
    paidCents: 5000,
    supplier: sampleSuppliers[1],
    lines: [
      {
        id: "l2",
        quantity: 4,
        unitCostCents: 5000,
        lineTotalCents: 20000,
        variant: { name: "L", sku: "SKU-2", product: { name: "تيشيرت" } },
      },
    ],
  },
  {
    id: "cccc3333-3333-4333-8333-333333333333",
    invoiceNumber: "INV-003",
    status: "CONFIRMED",
    invoiceDate: "2026-11-15T12:00:00.000Z",
    subtotalCents: 15000,
    extraCostsCents: 0,
    totalCents: 15000,
    paidCents: 15000,
    supplier: sampleSuppliers[0],
    lines: [
      {
        id: "l3",
        quantity: 3,
        unitCostCents: 5000,
        lineTotalCents: 15000,
        variant: { name: "XL", sku: "SKU-3", product: { name: "بنطلون" } },
      },
    ],
  },
];

describe("purchases monetary precision and parsing helpers", () => {
  it("converts EGP decimal strings to integer piasters without floating-point drift", () => {
    expect(parseEgpToPiasters("19.99")).toBe(1999);
    expect(parseEgpToPiasters("0.29")).toBe(29);
    expect(parseEgpToPiasters("1.05")).toBe(105);
    expect(parseEgpToPiasters("250.5")).toBe(25050);
    expect(parseEgpToPiasters("0")).toBe(0);
    expect(parseEgpToPiasters("-10")).toBeNull();
    expect(parseEgpToPiasters("12.345")).toBeNull();
    expect(parseEgpToPiasters("abc")).toBeNull();
  });

  it("formats piasters back cleanly and calculates exact integer line totals", () => {
    expect(formatPiastersToInput(1999)).toBe("19.99");
    expect(formatPiastersToInput(1250)).toBe("12.5");
    expect(formatPiastersToInput(10000)).toBe("100");
    expect(parsePositiveQuantity("3")).toBe(3);
    expect(parsePositiveQuantity("0")).toBeNull();
    expect(parsePositiveQuantity("2.5")).toBeNull();
    expect(computeLineTotalCents(3, 1999)).toBe(5997);
  });
});

describe("purchase statistics and filters", () => {
  it("calculates real statistics excluding unconfirmed drafts from confirmed totals and payables", () => {
    const stats = computePurchaseStats(sampleInvoices, sampleSuppliers);
    expect(stats).toEqual({
      totalPurchasesCents: 36000,
      totalOutstandingCents: 16000,
      totalPaidCents: 20000,
      totalInvoicesCount: 3,
      confirmedCount: 2,
      draftCount: 1,
      paidInvoicesCount: 1,
      unpaidOrPartialCount: 1,
      totalSuppliersCount: 2,
    });
  });

  it("derives accurate invoice payment states and remaining balances", () => {
    expect(getInvoicePaymentState(sampleInvoices[0])).toBe("draft");
    expect(getInvoicePaymentState(sampleInvoices[1])).toBe("partial");
    expect(getInvoicePaymentState(sampleInvoices[2])).toBe("paid");
    expect(getInvoiceRemainingCents(sampleInvoices[1])).toBe(16000);
    expect(getInvoiceRemainingCents(sampleInvoices[2])).toBe(0);
  });

  it("filters by search, status, supplier, date range, and sorts accurately", () => {
    const bySearch = filterAndSortInvoices(sampleInvoices, {
      search: "تيشيرت",
      status: "ALL",
      supplierId: "ALL",
      dateFrom: "",
      dateTo: "",
      sortBy: "date_desc",
    });
    expect(bySearch.map((i) => i.invoiceNumber)).toEqual(["INV-002"]);

    const byPartial = filterAndSortInvoices(sampleInvoices, {
      search: "",
      status: "CONFIRMED_PARTIAL",
      supplierId: "ALL",
      dateFrom: "",
      dateTo: "",
      sortBy: "date_desc",
    });
    expect(byPartial.map((i) => i.invoiceNumber)).toEqual(["INV-002"]);

    const byDateRangeAndSupplier = filterAndSortInvoices(sampleInvoices, {
      search: "",
      status: "ALL",
      supplierId: sampleSuppliers[0].id,
      dateFrom: "2026-11-11",
      dateTo: "2026-11-16",
      sortBy: "date_desc",
    });
    expect(byDateRangeAndSupplier.map((i) => i.invoiceNumber)).toEqual(["INV-003"]);

    const sortedByRemaining = filterAndSortInvoices(sampleInvoices, {
      search: "",
      status: "ALL",
      supplierId: "ALL",
      dateFrom: "",
      dateTo: "",
      sortBy: "remaining_desc",
    });
    expect(sortedByRemaining[0].invoiceNumber).toBe("INV-002");
  });
});

describe("supplier, invoice, and payment draft validation", () => {
  it("validates supplier fields and omits blank optional fields", () => {
    expect(
      validateSupplierDraft({
        name: "أ",
        contactName: "",
        phone: "",
        email: "bad-email",
        address: "",
      }).ok,
    ).toBe(false);

    const valid = validateSupplierDraft({
      name: "  مورد القماش المصري  ",
      contactName: "محمود",
      phone: "01012345678",
      email: "",
      address: "القاهرة",
    });
    expect(valid).toEqual({
      ok: true,
      payload: {
        name: "مورد القماش المصري",
        contactName: "محمود",
        phone: "01012345678",
        address: "القاهرة",
      },
    });
  });

  it("rejects duplicate variants and validates invoice totals accurately", () => {
    const duplicateResult = validatePurchaseInvoiceDraft({
      supplierId: sampleSuppliers[0].id,
      invoiceNumber: "INV-99",
      invoiceDate: "2026-11-18",
      extraCostsInput: "50",
      notes: "",
      lines: [
        { key: "1", variantId: "v1", quantityInput: "2", unitCostInput: "100" },
        { key: "2", variantId: "v1", quantityInput: "1", unitCostInput: "100" },
      ],
    });
    expect(duplicateResult.ok).toBe(false);

    const validResult = validatePurchaseInvoiceDraft({
      supplierId: sampleSuppliers[0].id,
      invoiceNumber: "INV-100",
      invoiceDate: "2026-11-18",
      extraCostsInput: "25.50",
      notes: "توريد شتوي",
      lines: [
        { key: "1", variantId: "v1", quantityInput: "2", unitCostInput: "150.25" },
        { key: "2", variantId: "v2", quantityInput: "3", unitCostInput: "80" },
      ],
    });
    expect(validResult).toMatchObject({
      ok: true,
      subtotalCents: 54050,
      extraCostsCents: 2550,
      totalCents: 56600,
    });
  });

  it("enforces positive payment <= remaining invoice balance", () => {
    expect(
      validatePaymentDraft(
        { amountInput: "200", method: "CASH", paidAt: "2026-11-18", reference: "" },
        15000,
      ).ok,
    ).toBe(false);

    expect(
      validatePaymentDraft(
        { amountInput: "0", method: "CASH", paidAt: "2026-11-18", reference: "" },
        15000,
      ).ok,
    ).toBe(false);

    expect(
      validatePaymentDraft(
        { amountInput: "150", method: "BANK_TRANSFER", paidAt: "2026-11-18", reference: "TRF-12" },
        15000,
      ),
    ).toMatchObject({
      ok: true,
      payload: {
        amountCents: 15000,
        method: "BANK_TRANSFER",
        reference: "TRF-12",
      },
    });
  });
});
