import { useEffect, useState } from "react";
import { formatEGP } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { operationsApi, type FinanceReport } from "../api/operations";
const c = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
const monthAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};
export default function AdminFinance() {
  const [data, setData] = useState<FinanceReport | null>(null);
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [category, setCategory] = useState("PACKAGING");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [platform, setPlatform] = useState("");
  const [recurrence, setRecurrence] = useState<"ONE_TIME" | "MONTHLY">("ONE_TIME");
  const [recurrenceEndAt, setRecurrenceEndAt] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setData(
        (
          await operationsApi.finance(
            new Date(`${from}T00:00:00.000Z`).toISOString(),
            new Date(`${to}T23:59:59.999Z`).toISOString()
          )
        ).data
      );
      setError("");
    } catch {
      setError("تعذر تحميل التقرير المالي. تحقق من صلاحيتك واتصال الخادم.");
    }
  };
  useEffect(() => {
    void load();
  }, [from, to]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  };
  const addExpense = () =>
    run(() =>
      operationsApi.addExpense({
        category,
        description,
        amountCents: Math.round(Number(amount) * 100),
        recurrence,
        ...(recurrence === "MONTHLY" && recurrenceEndAt
          ? { recurrenceEndAt: new Date(`${recurrenceEndAt}T23:59:59.999Z`).toISOString() }
          : {}),
        ...(receiptImageUrl ? { receiptImageUrl } : {}),
        ...(category === "ADS" ? { platform } : {}),
      })
    );
  const settle = () => {
    const orders = Object.entries(selected)
      .filter(([, v]) => v >= 0)
      .map(([orderId, courierFeeCents]) => ({ orderId, courierFeeCents }));
    if (!orders.length) return;
    const courierName = data?.awaitingSettlement.find(
      (o) => o.id === orders[0]?.orderId
    )?.courierName?.trim();
    if (!courierName) {
      setError("يجب تحديد شركة الشحن على الطلب قبل تسجيل التسوية.");
      return;
    }
    if (
      orders.some(
        (o) => data?.awaitingSettlement.find((r) => r.id === o.orderId)?.courierName?.trim() !== courierName
      )
    ) {
      setError("أنشئ تسوية منفصلة لكل شركة شحن.");
      return;
    }
    void run(() => operationsApi.settle({ courierName, orders }));
  };
  return (
    <AdminLayout title="المالية" subtitle="الإيرادات والتكاليف والمصروفات وتحصيلات شركات الشحن">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">
          {error}
        </p>
      )}
      <div
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        dir="rtl"
      >
        <label className="text-sm text-slate-700">
          من
          <input
            className={`mt-1 block ${c}`}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-700">
          إلى
          <input
            className={`mt-1 block ${c}`}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          onClick={() => void load()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-white"
        >
          تحديث التقرير
        </button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" dir="rtl">
        {(
          [
            ["الإيرادات", data?.revenueCents, "text-emerald-700"],
            ["تكلفة البضاعة", data?.cogsCents, "text-amber-700"],
            ["المصروفات ورسوم الشحن", data?.expensesCents, "text-rose-700"],
            [
              "صافي تشغيلي تقريبي",
              data ? data.revenueCents - data.cogsCents - data.expensesCents : null,
              "text-[#5e0f2a]",
            ],
          ] as Array<[string, number | null | undefined, string]>
        ).map(([label, val, color]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <strong className={`mt-2 block text-xl ${color}`}>
              {val == null ? "—" : formatEGP(val)}
            </strong>
          </div>
        ))}
      </div>
      {data && data.unknownCostLines > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">
          هناك {data.unknownCostLines} بندًا بلا تكلفة محفوظة، لذلك قد تكون تكلفة البضاعة أقل من
          الفعلية.
        </p>
      )}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5" dir="rtl">
        <h2 className="mb-3 font-bold text-slate-900">تسجيل مصروف</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select className={c} value={category} onChange={(e) => setCategory(e.target.value)}>
            {[
              ["PACKAGING", "تغليف"],
              ["ADS", "إعلانات"],
              ["SHIPPING_FEES", "رسوم شحن"],
              ["SALARIES", "رواتب"],
              ["RENT", "إيجار"],
              ["OTHER", "أخرى"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            className={c}
            placeholder="وصف المصروف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className={c}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="المبلغ بالجنيه"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className={c}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as "ONE_TIME" | "MONTHLY")}
          >
            <option value="ONE_TIME">مصروف مرة واحدة</option>
            <option value="MONTHLY">مصروف شهري متكرر</option>
          </select>
          {recurrence === "MONTHLY" && (
            <label className="text-sm text-slate-700">
              آخر شهر للتكرار (اختياري)
              <input
                className={`mt-1 block ${c}`}
                type="date"
                value={recurrenceEndAt}
                onChange={(e) => setRecurrenceEndAt(e.target.value)}
              />
            </label>
          )}
          <input
            className={c}
            type="url"
            placeholder="رابط صورة الإيصال (اختياري)"
            value={receiptImageUrl}
            onChange={(e) => setReceiptImageUrl(e.target.value)}
          />
          {category === "ADS" && (
            <input
              className={c}
              placeholder="منصة الإعلان"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          )}
          <button
            disabled={busy || !description || !amount}
            onClick={() => void addExpense()}
            className="rounded-lg bg-[#5e0f2a] px-4 py-2 font-bold text-white"
          >
            حفظ المصروف
          </button>
        </div>
      </section>
      <section
        className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-5"
        dir="rtl"
      >
        <h2 className="mb-3 font-bold text-slate-900">طلبات بانتظار التحصيل من شركة الشحن</h2>
        {data?.awaitingSettlement?.length ? (
          <>
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="text-right text-slate-500">
                  <th className="p-2">تحديد</th>
                  <th className="p-2">العميل</th>
                  <th className="p-2">الشركة</th>
                  <th className="p-2">المبلغ</th>
                  <th className="p-2">رسوم الشحن</th>
                </tr>
              </thead>
              <tbody>
                {data.awaitingSettlement.map((o) => (
                  <tr className="border-t" key={o.id}>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          setSelected((x) => {
                            const n = { ...x };
                            if (e.target.checked) n[o.id] = 0;
                            else delete n[o.id];
                            return n;
                          })
                        }
                      />
                    </td>
                    <td className="p-2 text-slate-900">{o.customerName}</td>
                    <td className="p-2 text-slate-700">{o.courierName}</td>
                    <td className="p-2 text-slate-900">{formatEGP(o.totalCents)}</td>
                    <td className="p-2">
                      <input
                        className={c}
                        aria-label="رسوم شركة الشحن بالجنيه"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!(o.id in selected)}
                        value={(selected[o.id] ?? 0) / 100}
                        onChange={(e) =>
                          setSelected((v) => ({
                            ...v,
                            [o.id]: Math.round(Number(e.target.value) * 100),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              disabled={busy || !Object.keys(selected).length}
              onClick={settle}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white"
            >
              تسجيل التسوية المحددة
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">لا توجد طلبات معلقة حاليًا.</p>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5" dir="rtl">
        <h2 className="mb-3 font-bold text-slate-900">المصروفات المحتسبة خلال الفترة</h2>
        <ul className="divide-y divide-slate-100">
          {data?.expenses?.map((x, i) => (
            <li className="flex justify-between gap-4 py-3 text-sm" key={`${x.id}-${i}`}>
              <span className="text-slate-700">
                {x.description} — {new Date(x.occurredAt).toLocaleDateString("ar-EG")}
              </span>
              <b className="text-slate-900">{formatEGP(x.amountCents)}</b>
            </li>
          ))}
        </ul>
      </section>
    </AdminLayout>
  );
}
