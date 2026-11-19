import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  operationsApi,
  type StaffRecord,
} from "../api/operations";
const c = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
const roles = ["MANAGER", "INVENTORY", "ACCOUNTANT", "SUPPORT"];
export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SUPPORT");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    operationsApi
      .staff()
      .then((r) => setStaff(r.data))
      .catch(() => setError("إدارة الموظفين متاحة للمالك فقط، وتعذر تحميل الحسابات."));
  useEffect(() => {
    void load();
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
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
  const create = () =>
    void run(async () => {
      await operationsApi.createStaff({ username, password, role });
      setUsername("");
      setPassword("");
    });
  return (
    <AdminLayout title="الموظفون والصلاحيات" subtitle="حسابات الموظفين وأدوارهم وصلاحيات الدخول">
      <div dir="rtl">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">
            {error}
          </p>
        )}
        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-slate-900">إضافة موظف</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className={c}
              placeholder="اسم الدخول"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className={c}
              type="password"
              placeholder="كلمة مرور (15 حرفًا على الأقل)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select className={c} value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              disabled={busy || password.length < 15 || username.length < 3}
              onClick={create}
              className="rounded-lg bg-[#5e0f2a] px-4 py-2 font-bold text-white"
            >
              إنشاء الحساب
            </button>
          </div>
        </section>
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {["اسم الدخول", "الدور", "الحالة", "آخر دخول"].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-semibold text-slate-900">{s.username}</td>
                  <td className="p-3">
                    <select
                      className={c}
                      value={s.role}
                      disabled={s.role === "OWNER" || busy}
                      onChange={(e) =>
                        void run(() => operationsApi.updateStaff(s.id, { role: e.target.value }))
                      }
                    >
                      {(s.role === "OWNER" ? ["OWNER"] : roles).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      disabled={s.role === "OWNER" || busy}
                      onClick={() =>
                        void run(() => operationsApi.updateStaff(s.id, { isActive: !s.isActive }))
                      }
                      className={`rounded-full px-3 py-1 font-bold ${s.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                    >
                      {s.isActive ? "نشط" : "موقوف"}
                    </button>
                  </td>
                  <td className="p-3 text-slate-600">
                    {s.lastLoginAt
                      ? new Date(s.lastLoginAt).toLocaleString("ar-EG")
                      : "لم يسجل الدخول"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <p className="p-8 text-center text-slate-500">لا توجد حسابات موظفين مسجلة.</p>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
