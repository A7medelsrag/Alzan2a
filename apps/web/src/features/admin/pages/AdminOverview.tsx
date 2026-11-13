import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatEGP } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { fetchAdminOverview, type AdminOverviewStats } from "../api/management";

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: "قيد المراجعة", color: "bg-amber-50 text-amber-700 border-amber-200" },
  CONFIRMED: { label: "تم التأكيد", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  PROCESSING: { label: "قيد التجهيز", color: "bg-blue-50 text-blue-700 border-blue-200" },
  SHIPPED: { label: "تم الشحن", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED: { label: "تم التسليم", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "ملغي", color: "bg-rose-50 text-rose-700 border-rose-200" },
  RETURNED: { label: "مرتجع", color: "bg-neutral-100 text-neutral-700 border-neutral-300" },
};

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminOverview();
      setStats(res.data);
    } catch {
      setError("تعذر تحميل بيانات الإحصائيات من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const todayStr = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const aovCents = !stats || stats.todaySalesCents === null || stats.totalSalesCents === null
    ? null
    : stats.todayDeliveredOrders > 0
      ? Math.round(stats.todaySalesCents / stats.todayDeliveredOrders)
      : stats.deliveredOrderCount > 0
        ? Math.round(stats.totalSalesCents / stats.deliveredOrderCount)
        : 0;

  return (
    <AdminLayout title="الرئيسية" subtitle={todayStr}>
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => void loadData()}
            className="font-bold underline hover:no-underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Live Status */}
        <div className="bg-[#101426] text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">حالة النظام</span>
            <span className="flex h-2.5 w-2.5 relative">
              {!error && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${error ? "bg-rose-500" : loading ? "bg-amber-400" : "bg-emerald-500"}`}></span>
            </span>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-400">
              متصل
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex items-center justify-between">
            <span>الطلبات: {stats ? stats.totalOrders : "..."}</span>
            <span className="text-slate-600">|</span>
            <span>العملاء: {stats ? stats.totalCustomers : "..."}</span>
          </div>
        </div>

        {/* Card 2: Today Orders */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">طلبات اليوم</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : (stats?.todayOrders ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-neutral-50 w-fit px-2 py-0.5 rounded-md">
            <span>إجمالي الطلبات: {stats?.totalOrders ?? 0}</span>
          </div>
        </div>

        {/* Card 3: Today Sales */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">المبيعات اليوم</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : stats?.todaySalesCents == null ? "غير متاح" : formatEGP(stats.todaySalesCents)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 w-fit px-2 py-0.5 rounded-md">
            <span>نشط ومحدث</span>
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">إجمالي المبيعات</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : stats?.totalSalesCents == null ? "غير متاح" : formatEGP(stats.totalSalesCents)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 w-fit px-2 py-0.5 rounded-md">
            <span>من جميع الطلبات</span>
          </div>
        </div>

        {/* Card 5: Average Order Value */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">متوسط قيمة الطلب</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : aovCents === null ? "غير متاح" : formatEGP(aovCents)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400">محسوب من المبيعات</div>
        </div>

        {/* Card 6: Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">إجمالي المنتجات</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : (stats?.totalProducts ?? 0)}
            </span>
          </div>
          <Link
            to="/admin/products"
            className="text-[11px] text-[#7a1535] font-semibold hover:underline"
          >
            إدارة الكتالوج ←
          </Link>
        </div>

        {/* Card 7: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">نواقص المخزون</span>
          <div className="my-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                (stats?.lowStockVariants ?? 0) > 0 ? "text-amber-600" : "text-neutral-900"
              }`}
            >
              {loading ? "..." : (stats?.lowStockVariants ?? 0)}
            </span>
          </div>
          <Link
            to="/admin/inventory"
            className="text-[11px] text-[#7a1535] font-semibold hover:underline"
          >
            فحص المخزون ←
          </Link>
        </div>

        {/* Card 8: Pending Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-neutral-500 font-medium">تقييمات بالانتظار</span>
          <div className="my-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                (stats?.pendingReviews ?? 0) > 0 ? "text-amber-600" : "text-neutral-900"
              }`}
            >
              {loading ? "..." : (stats?.pendingReviews ?? 0)}
            </span>
          </div>
          <Link
            to="/admin/reviews"
            className="text-[11px] text-[#7a1535] font-semibold hover:underline"
          >
            مراجعة التقييمات ←
          </Link>
        </div>
      </div>

      {/* Bottom Table: Recent Orders */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">آخر الطلبات الواردة</h3>
            <p className="text-xs text-neutral-400 mt-0.5">أحدث الطلبات المسجلة في المتجر</p>
          </div>
          <Link to="/admin/orders" className="text-xs font-bold text-[#7a1535] hover:underline">
            عرض كل الطلبات ←
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            جاري تحميل الطلبات...
          </div>
        ) : !stats?.recentOrders?.length ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            لا توجد طلبات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-semibold">
                  <th className="pb-3 font-medium">رقم الطلب</th>
                  <th className="pb-3 font-medium">العميل</th>
                  <th className="pb-3 font-medium">الهاتف</th>
                  <th className="pb-3 font-medium text-center">المنتجات</th>
                  <th className="pb-3 font-medium text-center">الإجمالي</th>
                  <th className="pb-3 font-medium text-center">الحالة</th>
                  <th className="pb-3 font-medium text-left">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats.recentOrders.map((order) => {
                  const statusInfo = statusMap[order.status] ?? {
                    label: order.status,
                    color: "bg-neutral-100 text-neutral-700 border-neutral-200",
                  };
                  const dateStr = new Date(order.createdAt).toLocaleDateString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 font-bold font-mono text-neutral-900">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="hover:text-[#7a1535] text-xs"
                        >
                          {order.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="py-3.5 font-semibold text-neutral-800">
                        {order.customerName}
                      </td>
                      <td className="py-3.5 font-mono text-neutral-500" dir="ltr">
                        {order.customerPhone}
                      </td>
                      <td className="py-3.5 text-center text-neutral-600">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                      </td>
                      <td className="py-3.5 text-center font-bold text-neutral-900">
                        {formatEGP(order.totalCents)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-left text-neutral-400 font-medium">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
