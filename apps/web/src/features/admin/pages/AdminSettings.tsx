import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { operationsApi, type AuditEntry, type StoreSettings } from "../api/operations";
import { getAdminSession } from "../api/auth";
import { applyStoreBranding } from "../../../utils/store-branding";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-[#C8102E] disabled:bg-slate-50 disabled:text-slate-500";

const BUTTON_PALETTE = [
  { label: "عنابي كلاسيكي", hex: "#7a1535" },
  { label: "أحمر Egypt Shop", hex: "#C8102E" },
  { label: "كحلي عميق", hex: "#101B30" },
  { label: "ذهبي ملكي", hex: "#B8860B" },
  { label: "أخضر زمردي", hex: "#047857" },
  { label: "رمادي داكن", hex: "#334155" },
];

const BACKGROUND_PALETTE = [
  { label: "كريمي دافئ", hex: "#faf6f3" },
  { label: "رمادي فاتح", hex: "#F8F9FA" },
  { label: "أبيض نقي", hex: "#FFFFFF" },
  { label: "رملي ناعم", hex: "#F5EFE6" },
  { label: "وردي هادئ", hex: "#FDF2F4" },
  { label: "سماوي فاتح", hex: "#F1F5F9" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const load = () =>
    Promise.all([operationsApi.settings(), getAdminSession()])
      .then(([r, session]) => {
        if (r.data) {
          setSettings({
            ...r.data,
            dashboardName: r.data.dashboardName || "zan2a | زنقة",
            buttonColor: r.data.buttonColor || "#7a1535",
            backgroundColor: r.data.backgroundColor || "#faf6f3",
          });
        }
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
    setNotice("");

    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    const cleanButtonColor = hexPattern.test(settings.buttonColor)
      ? settings.buttonColor
      : "#7a1535";
    const cleanBgColor = hexPattern.test(settings.backgroundColor)
      ? settings.backgroundColor
      : "#faf6f3";

    try {
      await operationsApi.updateSettings({
        storeName: settings.storeName,
        dashboardName: settings.dashboardName,
        buttonColor: cleanButtonColor,
        backgroundColor: cleanBgColor,
        supportPhone: settings.supportPhone,
        supportWhatsApp: settings.supportWhatsApp,
        freeShippingThresholdCents: Math.round(Number(settings.freeShippingThresholdCents)),
        allowCouponsWithOffers: settings.allowCouponsWithOffers,
        dailyOrderLimitPerPhone:
          settings.dailyOrderLimitPerPhone === null
            ? null
            : Number(settings.dailyOrderLimitPerPhone),
      });

      applyStoreBranding({
        storeName: settings.storeName,
        dashboardName: settings.dashboardName,
        buttonColor: cleanButtonColor,
        backgroundColor: cleanBgColor,
      });

      setNotice("تم حفظ الإعدادات وتحديث الهوية والألوان بنجاح.");
      setTimeout(() => setNotice(""), 3500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ الإعدادات");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="الإعدادات" subtitle="إعدادات المتجر والهوية البصرية وسجل التغييرات">
      <div dir="rtl" className="space-y-6">
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between"
          >
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
            {error}
          </p>
        )}

        {settings && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                بيانات المتجر والهوية وسياسات الطلب
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تحكم في اسم الموقع واسم الداشبورد وألوان الأزرار والخلفية وإعدادات الطلبات.
              </p>
            </div>

            <fieldset disabled={!canEdit || busy} className="space-y-6">
              {/* Brand & Dashboard Names */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  اسم الموقع / المتجر
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    placeholder="مثال: Egypt Shop"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700 block">
                  اسم لوحة التحكم (الداشبورد)
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    value={settings.dashboardName}
                    onChange={(e) =>
                      setSettings({ ...settings, dashboardName: e.target.value })
                    }
                    placeholder="مثال: zan2a | زنقة"
                  />
                </label>
              </div>

              {/* Color Palettes */}
              <div className="grid gap-5 lg:grid-cols-2 pt-4 border-t border-slate-100">
                {/* Button Color Palette */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">لون أزرار الموقع</h3>
                      <p className="text-[11px] text-slate-500">
                        اختر من الباليت أو حدد أي لون مخصص للأزرار الرئيسية.
                      </p>
                    </div>
                    <span
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: settings.buttonColor }}
                    >
                      معاينة الزر
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {BUTTON_PALETTE.map((swatch) => {
                      const active =
                        settings.buttonColor.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() =>
                            setSettings({ ...settings, buttonColor: swatch.hex })
                          }
                          title={swatch.label}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                            active
                              ? "border-slate-900 bg-white shadow-xs ring-2 ring-slate-900/10"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span className="text-slate-700">{swatch.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="color"
                      aria-label="اختيار لون الأزرار"
                      value={settings.buttonColor}
                      onChange={(e) =>
                        setSettings({ ...settings, buttonColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.buttonColor}
                      onChange={(e) =>
                        setSettings({ ...settings, buttonColor: e.target.value })
                      }
                      placeholder="#7a1535"
                      className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* Background Color Palette */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">لون خلفية الموقع</h3>
                      <p className="text-[11px] text-slate-500">
                        اختر لون الخلفية العامة لصفحات المتجر من الباليت أو مخصص.
                      </p>
                    </div>
                    <span
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-800 border border-slate-300 shrink-0"
                      style={{ backgroundColor: settings.backgroundColor }}
                    >
                      معاينة الخلفية
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {BACKGROUND_PALETTE.map((swatch) => {
                      const active =
                        settings.backgroundColor.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() =>
                            setSettings({ ...settings, backgroundColor: swatch.hex })
                          }
                          title={swatch.label}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                            active
                              ? "border-slate-900 bg-white shadow-xs ring-2 ring-slate-900/10"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span className="text-slate-700">{swatch.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="color"
                      aria-label="اختيار لون الخلفية"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      placeholder="#faf6f3"
                      className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Support & Order Policies */}
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block">
                  هاتف الدعم
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    value={settings.supportPhone ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, supportPhone: e.target.value || null })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700 block">
                  واتساب الدعم
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    value={settings.supportWhatsApp ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, supportWhatsApp: e.target.value || null })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700 block">
                  حد الشحن المجاني بالجنيه
                  <input
                    className={`mt-1.5 ${inputClass}`}
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

                <label className="text-xs font-semibold text-slate-700 block">
                  حد الطلبات اليومية لكل هاتف (اتركه فارغًا بلا حد)
                  <input
                    className={`mt-1.5 ${inputClass}`}
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

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 sm:col-span-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowCouponsWithOffers}
                    onChange={(e) =>
                      setSettings({ ...settings, allowCouponsWithOffers: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#C8102E] rounded"
                  />
                  <span>السماح باستخدام الكوبون مع العروض</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {canEdit
                    ? "يمكنك حفظ التغييرات لتطبيقها فوراً على المتجر ولوحة التحكم."
                    : "المدير يمكنه عرض الإعدادات فقط؛ حفظها متاح للمالك (OWNER)."}
                </p>
                <button
                  type="button"
                  disabled={busy || !canEdit}
                  onClick={() => void save()}
                  className="rounded-xl bg-[#C8102E] hover:bg-[#a50d26] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
                </button>
              </div>
            </fieldset>
          </section>
        )}

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            سجل النشاط (آخر 100 تغيير)
          </h2>
          <table className="w-full min-w-[600px] text-right text-sm">
            <thead className="text-slate-500 text-xs border-b border-slate-100">
              <tr>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">المستخدم</th>
                <th className="p-2.5">الحدث</th>
                <th className="p-2.5">العنصر</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 text-xs">
                  <td className="p-2.5 text-slate-700">
                    {new Date(a.createdAt).toLocaleString("ar-EG")}
                  </td>
                  <td className="p-2.5 text-slate-700">{a.actor?.username ?? "—"}</td>
                  <td className="p-2.5 font-semibold text-slate-900">{a.action}</td>
                  <td className="p-2.5 text-slate-700">
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
