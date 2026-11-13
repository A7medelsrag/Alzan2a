import { useEffect, useState } from "react";
import { formatEGP } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { fetchAdminCustomers, type AdminCustomer } from "../api/management";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminCustomers();
      setCustomers(res.data);
      if (res.data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(res.data[0]);
      }
    } catch {
      setError("تعذر تحميل بيانات العملاء من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpentCents, 0);
  const withOrdersCount = customers.filter((c) => c.ordersCount > 0).length;

  const filtered = customers.filter((c) => {
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(query);
      const matchPhone = c.phone?.toLowerCase().includes(query);
      const matchEmail = c.email?.toLowerCase().includes(query);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  return (
    <AdminLayout title="العملاء" subtitle="سجل بيانات العميلات والطلبات وإجمالي الإنفاق">
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => void loadData()} className="font-bold underline">إعادة المحاولة</button>
        </div>
      )}

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">إجمالي العملاء</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : customers.length}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">عميلات مسجلات وطلبات هاتفية</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">عميلات لهن طلبات</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : withOrdersCount}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">عميلات أتممن طلب شراء</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">إجمالي إنفاق العملاء</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {loading ? "..." : formatEGP(totalSpentAll)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">إجمالي المشتريات المسجلة</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers Table (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو البريد..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#7a1535]"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              جاري تحميل بيانات العملاء...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              لا توجد عميلات مسجلات حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-semibold bg-neutral-50/50">
                    <th className="py-3 px-4 font-medium">العميلة</th>
                    <th className="py-3 px-2 font-medium">الهاتف</th>
                    <th className="py-3 px-2 font-medium text-center">الطلبات</th>
                    <th className="py-3 px-2 font-medium text-center">إجمالي الإنفاق</th>
                    <th className="py-3 px-2 font-medium text-left">تاريخ التسجيل</th>
                    <th className="py-3 px-4 font-medium text-left">عرض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const dateStr = new Date(c.createdAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`hover:bg-neutral-50/60 transition-colors cursor-pointer ${
                          isSelected ? "bg-[#fbf4f6]" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-neutral-900 block">{c.fullName}</span>
                          {c.email && (
                            <span className="text-[11px] font-mono text-neutral-400 block" dir="ltr">
                              {c.email}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 font-mono text-neutral-600" dir="ltr">
                          {c.phone || "—"}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-neutral-800">
                          {c.ordersCount}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-neutral-900">
                          {formatEGP(c.totalSpentCents)}
                        </td>
                        <td className="py-3.5 px-2 text-left text-neutral-400">
                          {dateStr}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            type="button"
                            className="text-xs font-bold text-[#7a1535] hover:underline"
                          >
                            عرض
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Customer Side Card (1 col on lg) */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">ملف العميلة</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              نشطة
            </span>
          </div>

          {!selectedCustomer ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              اختر عميلة من القائمة لعرض التفاصيل.
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-base font-bold text-neutral-900">{selectedCustomer.fullName}</h4>
                {selectedCustomer.phone && (
                  <p className="text-xs font-mono text-neutral-500 mt-1" dir="ltr">
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.email && (
                  <p className="text-xs font-mono text-neutral-400 mt-0.5" dir="ltr">
                    {selectedCustomer.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl text-center text-xs">
                <div>
                  <span className="text-neutral-500 block">عدد الطلبات</span>
                  <span className="text-base font-extrabold text-neutral-900">
                    {selectedCustomer.ordersCount}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">إجمالي الإنفاق</span>
                  <span className="text-base font-extrabold text-neutral-900">
                    {formatEGP(selectedCustomer.totalSpentCents)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-neutral-500 space-y-1 pt-2 border-t border-neutral-100">
                <div className="flex justify-between">
                  <span>تاريخ التسجيل:</span>
                  <span className="font-medium text-neutral-800">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
