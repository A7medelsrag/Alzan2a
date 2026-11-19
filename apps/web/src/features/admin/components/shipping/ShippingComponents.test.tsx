import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { operationsApi } from "../../api/operations";
import ShippingStatsCards from "./ShippingStatsCards";
import ShippingTable from "./ShippingTable";
import ShippingToolbar from "./ShippingToolbar";
import { computeShippingStats } from "./shippingHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shipping dashboard UI components", () => {
  it("renders loading skeleton for stats cards without hardcoded numbers", () => {
    const html = renderToStaticMarkup(
      <ShippingStatsCards
        loading={true}
        stats={computeShippingStats([])}
      />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("250 جنيه");
    expect(html).not.toContain("24 - 48 ساعة");
  });

  it("renders calculated statistics from real rate records", () => {
    const stats = computeShippingStats([
      { governorate: "القاهرة", priceInput: "40", minDaysInput: "1", maxDaysInput: "2", isEnabled: true },
      { governorate: "أسوان", priceInput: "65", minDaysInput: "3", maxDaysInput: "5", isEnabled: true },
      { governorate: "مطروح", priceInput: "80", minDaysInput: "4", maxDaysInput: "6", isEnabled: false },
    ]);

    const html = renderToStaticMarkup(
      <ShippingStatsCards loading={false} stats={stats} />,
    );
    expect(html).toContain("3 محافظة");
    expect(html).toContain("2 مفعل");
    expect(html).toContain("40 جنيه");
    expect(html).toContain("65 جنيه");
    expect(html).toContain("2 - 3.5 يوم");
  });

  it("renders search toolbar with filters, page size selector, and refresh action", () => {
    const html = renderToStaticMarkup(
      <ShippingToolbar
        search=""
        onSearchChange={() => undefined}
        statusFilter="all"
        onStatusFilterChange={() => undefined}
        pageSize={10}
        onPageSizeChange={() => undefined}
        onRefresh={() => undefined}
        refreshing={false}
        totalCount={27}
        enabledCount={25}
        disabledCount={2}
        dirtyCount={1}
      />,
    );

    expect(html).toContain('aria-label="البحث في المحافظات"');
    expect(html).toContain("الكل");
    expect(html).toContain("مفعل");
    expect(html).toContain("غير مفعل");
    expect(html).toContain("غير محفوظ");
    expect(html).toContain("تحديث");
    expect(html).toContain("عرض الكل (27)");
  });

  it("renders navy table header, switch controls, validation errors, and pagination", () => {
    const items = [
      { governorate: "القاهرة", priceInput: "40", minDaysInput: "1", maxDaysInput: "2", isEnabled: true },
      { governorate: "الجيزة", priceInput: "-5", minDaysInput: "5", maxDaysInput: "2", isEnabled: false },
    ];
    const savedByGov = {
      القاهرة: { governorate: "القاهرة", priceCents: 4000, minDeliveryDays: 1, maxDeliveryDays: 2, isEnabled: true },
      الجيزة: { governorate: "الجيزة", priceCents: 4000, minDeliveryDays: 1, maxDeliveryDays: 2, isEnabled: false },
    };

    const html = renderToStaticMarkup(
      <ShippingTable
        items={items}
        savedByGov={savedByGov}
        savingGovs={{}}
        justSavedGovs={{}}
        rowErrors={{}}
        bulkSaving={false}
        totalFilteredCount={27}
        totalAllCount={27}
        currentPage={1}
        totalPages={3}
        pageStartIndex={1}
        pageEndIndex={10}
        onPageChange={() => undefined}
        onFieldChange={() => undefined}
        onToggleEnabled={() => undefined}
        onSaveRow={() => undefined}
        onResetRow={() => undefined}
      />,
    );

    expect(html).toContain("bg-[#101B30] text-white");
    expect(html).toContain("القاهرة");
    expect(html).toContain("الجيزة");
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("مفعل");
    expect(html).toContain("غير مفعل");
    expect(html).toContain("يجب أن يكون السعر 0 جنيه أو أكثر.");
    expect(html).toContain("أقصى مدة يجب ألا تقل عن أقل مدة (5).");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("غير محفوظ");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("27");
  });
});

describe("operationsApi shipping contract", () => {
  it("fetches and patches governorate shipping rates using existing endpoints and CSRF", async () => {
    const csrfToken = "csrf-token-shipping-test-123456";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                governorate: "القاهرة",
                priceCents: 4000,
                minDeliveryDays: 1,
                maxDeliveryDays: 2,
                isEnabled: true,
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              governorate: "القاهرة",
              priceCents: 4500,
              minDeliveryDays: 1,
              maxDeliveryDays: 3,
              isEnabled: true,
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const listRes = await operationsApi.shipping();
    expect(listRes.data).toHaveLength(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/admin/shipping");

    await operationsApi.updateShipping("القاهرة", {
      priceCents: 4500,
      minDeliveryDays: 1,
      maxDeliveryDays: 3,
      isEnabled: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/admin/auth/me");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/v1/admin/shipping/${encodeURIComponent("القاهرة")}`,
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("PATCH");
    const headers = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(headers.get("X-CSRF-Token")).toBe(csrfToken);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      priceCents: 4500,
      minDeliveryDays: 1,
      maxDeliveryDays: 3,
      isEnabled: true,
    });
  });
});
