import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { operationsApi } from "../api/operations";
import type { PurchasesResponse } from "../api/operations";
import { fetchAdminProducts } from "../api/management";
import { formatEGP } from "@store/shared";

const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
export default function AdminPurchases() {
  const [data, setData] = useState<PurchasesResponse["data"]>({ suppliers: [], invoices: [] });
  const [variants, setVariants] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState(0);
  const [additionalLines, setAdditionalLines] = useState<
    Array<{ variantId: string; quantity: number; unitCostCents: number }>
  >([]);
  const [extra, setExtra] = useState(0);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [p, products] = await Promise.all([operationsApi.purchases(), fetchAdminProducts()]);
      setData(p.data);
      setVariants(
        products.data.flatMap((x) =>
          x.variants.map((v) => ({ id: v.id, label: `${x.name} — ${v.name}` }))
        )
      );
    } catch {
      setError("تعذر تحميل بيانات المشتريات. تحقق من صلاحياتك واتصال الخادم.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  };
  const createSupplier = () =>
    act(async () => {
      if (!supplierName.trim()) return;
      await operationsApi.createSupplier({ name: supplierName.trim() });
      setSupplierName("");
    });
  const createPurchase = () =>
    act(async () => {
      if (
        !supplier ||
        !variantId ||
        qty < 1 ||
        unit < 0 ||
        additionalLines.some(
          (line) => !line.variantId || line.quantity < 1 || line.unitCostCents < 0
        )
      )
        throw new Error("اختر المورد والصنف وأدخل الكمية والتكلفة");
      await operationsApi.createPurchase({
        supplierId: supplier,
        extraCostsCents: extra,
        lines: [
          { variantId, quantity: qty, unitCostCents: Math.round(unit * 100) },
          ...additionalLines,
        ],
      });
      setAdditionalLines([]);
    });
  return (
    <AdminLayout title="المشتريات" subtitle="الموردون وفواتير الشراء والمبالغ المستحقة">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">
          {error}
        </p>
      )}
      <section
        className="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-2"
        dir="rtl"
      >
        <div>
          <h2 className="mb-3 font-bold text-slate-900">إضافة مورد</h2>
          <div className="flex gap-2">
            <input
              className={`${control} min-w-0 flex-1`}
              placeholder="اسم المورد"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <button
              disabled={busy}
              onClick={() => void createSupplier()}
              className="rounded-lg bg-[#5e0f2a] px-4 font-bold text-white"
            >
              إضافة
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-slate-900">مسودة فاتورة جديدة</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className={control}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              <option value="">اختر المورد</option>
              {data.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className={control}
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">اختر المنتج / المقاس</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              className={control}
              type="number"
              min="1"
              value={qty}
              aria-label="الكمية"
              onChange={(e) => setQty(Number(e.target.value))}
            />
            <input
              className={control}
              type="number"
              min="0"
              step="0.01"
              placeholder="تكلفة الوحدة بالجنيه"
              value={unit}
              onChange={(e) => setUnit(Number(e.target.value))}
            />
            {additionalLines.map((line, index) => (
              <div key={index} className="col-span-full grid gap-2 sm:grid-cols-4">
                <select
                  className={control}
                  value={line.variantId}
                  aria-label="صنف إضافي"
                  onChange={(e) =>
                    setAdditionalLines((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, variantId: e.target.value } : row
                      )
                    )
                  }
                >
                  <option value="">اختر المنتج / المقاس</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <input
                  className={control}
                  type="number"
                  min="1"
                  value={line.quantity}
                  aria-label="كمية الصنف الإضافي"
                  onChange={(e) =>
                    setAdditionalLines((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, quantity: Number(e.target.value) } : row
                      )
                    )
                  }
                />
                <input
                  className={control}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCostCents / 100}
                  aria-label="تكلفة وحدة الصنف الإضافي"
                  onChange={(e) =>
                    setAdditionalLines((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? { ...row, unitCostCents: Math.round(Number(e.target.value) * 100) }
                          : row
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setAdditionalLines((rows) => rows.filter((_, i) => i !== index))}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700"
                >
                  حذف الصنف
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setAdditionalLines((rows) => [
                  ...rows,
                  { variantId: "", quantity: 1, unitCostCents: 0 },
                ])
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            >
              إضافة صنف آخر
            </button>
            <input
              className={control}
              type="number"
              min="0"
              step="0.01"
              placeholder="مصاريف إضافية بالجنيه"
              value={extra / 100}
              onChange={(e) => setExtra(Math.round(Number(e.target.value) * 100))}
            />
            <button
              disabled={busy}
              onClick={() => void createPurchase()}
              className="rounded-lg bg-[#5e0f2a] px-4 py-2 font-bold text-white"
            >
              حفظ كمسودة
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            المسودة لا تغيّر المخزون؛ الاعتماد يضيف الكمية ويحدّث متوسط التكلفة.
          </p>
        </div>
      </section>
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[750px] text-right text-sm" dir="rtl">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {[
                "الفاتورة",
                "المورد",
                "الأصناف",
                "الإجمالي",
                "المدفوع",
                "المتبقي",
                "الحالة",
                "إجراء",
              ].map((s) => (
                <th className="p-3" key={s}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.invoices.map((i) => (
              <tr key={i.id}>
                <td className="p-3 text-slate-800">{i.invoiceNumber || i.id.slice(0, 8)}</td>
                <td className="p-3 text-slate-800">{i.supplier.name}</td>
                <td className="p-3 text-slate-700">
                  {i.lines.map((l) => `${l.variant.product.name} × ${l.quantity}`).join("، ")}
                </td>
                <td className="p-3 text-slate-800">{formatEGP(i.totalCents)}</td>
                <td className="p-3 text-emerald-700">{formatEGP(i.paidCents)}</td>
                <td className="p-3 text-rose-700">{formatEGP(i.totalCents - i.paidCents)}</td>
                <td className="p-3 text-slate-700">{i.status === "DRAFT" ? "مسودة" : "معتمدة"}</td>
                <td className="flex gap-2 p-3">
                  {i.status === "DRAFT" && (
                    <button
                      disabled={busy}
                      onClick={() => void act(() => operationsApi.confirmPurchase(i.id))}
                      className="rounded bg-emerald-700 px-3 py-2 text-white"
                    >
                      اعتماد وإضافة للمخزون
                    </button>
                  )}
                  {i.status === "CONFIRMED" && i.paidCents < i.totalCents && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        const amount = window.prompt("المبلغ المدفوع بالجنيه");
                        if (amount)
                          void act(() =>
                            operationsApi.payPurchase(i.id, {
                              amountCents: Math.round(Number(amount) * 100),
                              method: "CASH",
                            })
                          );
                      }}
                      className="rounded bg-blue-700 px-3 py-2 text-white"
                    >
                      تسجيل دفعة
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.invoices.length && (
          <p className="p-8 text-center text-slate-500">لا توجد فواتير شراء حتى الآن.</p>
        )}
      </section>
    </AdminLayout>
  );
}
