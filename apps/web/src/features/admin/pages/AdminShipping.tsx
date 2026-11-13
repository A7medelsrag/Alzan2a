import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { operationsApi, type ShippingRate } from "../api/operations";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
export default function AdminShipping() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = () =>
    operationsApi
      .shipping()
      .then((r) => setRates(r.data))
      .catch(() => setError("تعذر تحميل أسعار الشحن. تحقق من اتصال الخادم وصلاحيتك."));
  useEffect(() => {
    void load();
  }, []);
  const save = async (rate: ShippingRate) => {
    setBusy(rate.governorate);
    setError("");
    try {
      await operationsApi.updateShipping(rate.governorate, {
        priceCents: rate.priceCents,
        minDeliveryDays: rate.minDeliveryDays,
        maxDeliveryDays: rate.maxDeliveryDays,
        isEnabled: rate.isEnabled,
      });
    } catch {
      setError(`لم يتم حفظ سعر ${rate.governorate}.`);
    } finally {
      setBusy("");
    }
  };
  return (
    <AdminLayout title="الشحن" subtitle="إدارة أسعار التوصيل ومواعيده حسب المحافظة">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-right text-sm" dir="rtl">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {["المحافظة", "السعر (جنيه)", "أقل مدة", "أقصى مدة", "مفعّل", ""].map((x) => (
                <th key={x} className="p-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((rate, i) => (
              <tr key={rate.governorate}>
                <td className="p-3 font-semibold text-slate-900">{rate.governorate}</td>
                <td className="p-2">
                  <input
                    aria-label={`سعر ${rate.governorate}`}
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate.priceCents / 100}
                    onChange={(e) =>
                      setRates((v) =>
                        v.map((x, j) =>
                          j === i
                            ? { ...x, priceCents: Math.round(Number(e.target.value) * 100) }
                            : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label="أقل مدة بالأيام"
                    className={inputClass}
                    type="number"
                    min="1"
                    value={rate.minDeliveryDays}
                    onChange={(e) =>
                      setRates((v) =>
                        v.map((x, j) =>
                          j === i ? { ...x, minDeliveryDays: Number(e.target.value) } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label="أقصى مدة بالأيام"
                    className={inputClass}
                    type="number"
                    min="1"
                    value={rate.maxDeliveryDays}
                    onChange={(e) =>
                      setRates((v) =>
                        v.map((x, j) =>
                          j === i ? { ...x, maxDeliveryDays: Number(e.target.value) } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    aria-label="تفعيل المحافظة"
                    type="checkbox"
                    checked={rate.isEnabled}
                    onChange={(e) =>
                      setRates((v) =>
                        v.map((x, j) => (j === i ? { ...x, isEnabled: e.target.checked } : x))
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <button
                    disabled={busy === rate.governorate}
                    onClick={() => void save(rate)}
                    className="rounded-lg bg-[#5e0f2a] px-4 py-2 font-bold text-white disabled:opacity-50"
                  >
                    {busy === rate.governorate ? "جارٍ الحفظ" : "حفظ"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rates.length === 0 && (
          <p className="p-8 text-center text-slate-500">جارٍ تحميل المحافظات…</p>
        )}
      </div>
    </AdminLayout>
  );
}
