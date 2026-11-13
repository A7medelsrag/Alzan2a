import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { operationsApi, type AuditEntry, type StoreSettings } from "../api/operations";
import { getAdminSession } from "../api/auth";
const c = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const load = () =>
    Promise.all([operationsApi.settings(), getAdminSession()])
      .then(([r, session]) => {
        setSettings(r.data);
        setAudit(r.audit);
        setCanEdit(session?.data.role === "OWNER");
      })
      .catch(() => setError("تعذر تحميل الإعدادات أو سجل النشاط. تحقق من الصلاحية والاتصال."));
  useEffect(() => {
    void load();
  }, []);
  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError("");
    try {
      await operationsApi.updateSettings({
        storeName: settings.storeName,
        supportPhone: settings.supportPhone,
        supportWhatsApp: settings.supportWhatsApp,
        freeShippingThresholdCents: Math.round(Number(settings.freeShippingThresholdCents)),
        allowCouponsWithOffers: settings.allowCouponsWithOffers,
        dailyOrderLimitPerPhone:
          settings.dailyOrderLimitPerPhone === null
            ? null
            : Number(settings.dailyOrderLimitPerPhone),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ الإعدادات");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminLayout title="الإعدادات" subtitle="إعدادات المتجر وسجل التغييرات">
      <div dir="rtl">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">
            {error}
          </p>
        )}
        {settings && (
          <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-slate-900">بيانات المتجر وسياسات الطلب</h2>
            <fieldset disabled={!canEdit || busy} className="contents">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  اسم المتجر
                  <input
                    className={`mt-1 ${c}`}
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  هاتف الدعم
                  <input
                    className={`mt-1 ${c}`}
                    value={settings.supportPhone ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, supportPhone: e.target.value || null })
                    }
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  واتساب الدعم
                  <input
                    className={`mt-1 ${c}`}
                    value={settings.supportWhatsApp ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, supportWhatsApp: e.target.value || null })
                    }
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  حد الشحن المجاني بالجنيه
                  <input
                    className={`mt-1 ${c}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.freeShippingThresholdCents / 100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        freeShippingThresholdCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  حد الطلبات اليومية لكل هاتف (اتركه فارغًا بلا حد)
                  <input
                    className={`mt-1 ${c}`}
                    type="number"
                    min="1"
                    value={settings.dailyOrderLimitPerPhone ?? ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyOrderLimitPerPhone: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.allowCouponsWithOffers}
                    onChange={(e) =>
                      setSettings({ ...settings, allowCouponsWithOffers: e.target.checked })
                    }
                  />
                  السماح باستخدام الكوبون مع العروض
                </label>
              </div>
              <button
                disabled={busy || !canEdit}
                onClick={() => void save()}
                className="mt-5 rounded-lg bg-[#5e0f2a] px-5 py-2 font-bold text-white"
              >
                {busy ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
              </button>
            </fieldset>
            <p className="mt-2 text-xs text-slate-500">
              المدير يمكنه عرض الإعدادات فقط؛ حفظها متاح للمالك.
            </p>
          </section>
        )}
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-slate-900">سجل النشاط (آخر 100 تغيير)</h2>
          <table className="w-full min-w-[600px] text-right text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="p-2">التاريخ</th>
                <th className="p-2">المستخدم</th>
                <th className="p-2">الحدث</th>
                <th className="p-2">العنصر</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-2 text-slate-700">
                    {new Date(a.createdAt).toLocaleString("ar-EG")}
                  </td>
                  <td className="p-2 text-slate-700">{a.actor?.username ?? "—"}</td>
                  <td className="p-2 font-medium text-slate-900">{a.action}</td>
                  <td className="p-2 text-slate-700">
                    {a.entity} {a.entityId ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AdminLayout>
  );
}
