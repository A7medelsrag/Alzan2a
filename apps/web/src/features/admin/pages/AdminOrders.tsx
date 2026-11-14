import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  formatEGP,
  type AdminUpdateOrderStatusInput,
  type OrderPublic,
  type OrderStatus,
} from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { getAdminSession } from "../api/auth";
import { listAdminOrders, updateAdminOrderStatus } from "../api/orders";

const statuses: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "الكل" },
  { value: "PENDING", label: "قيد المراجعة" },
  { value: "CONFIRMED", label: "تم التأكيد" },
  { value: "PROCESSING", label: "قيد التجهيز" },
  { value: "SHIPPED", label: "تم الشحن" },
  { value: "DELIVERED", label: "تم التوصيل" },
  { value: "CANCELLED", label: "ملغي" },
  { value: "RETURNED", label: "مرتجع" },
];

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  CONFIRMED: "border-sky-200 bg-sky-50 text-sky-800",
  PROCESSING: "border-indigo-200 bg-indigo-50 text-indigo-800",
  SHIPPED: "border-purple-200 bg-purple-50 text-purple-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  RETURNED: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

const STATUS_LABEL_MAP: Record<OrderStatus, string> = Object.fromEntries(
  statuses.filter((s) => s.value !== "ALL").map((s) => [s.value, s.label]),
) as Record<OrderStatus, string>;

export default function AdminOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit modal state
  const [editingOrder, setEditingOrder] = useState<OrderPublic | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OrderStatus>("CONFIRMED");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession().then((session) => {
      if (active && session) {
        setCsrfToken(session.csrfToken);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAdminOrders({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        pageSize: 50,
      });
      setOrders(res.data);
      setTotalCount(res.pagination?.total ?? res.data.length);
    } catch {
      setError(t("homepageRequestError"));
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshKey]);

  const stats = useMemo(() => {
    let inProgress = 0;
    let fulfilled = 0;
    let cancelledOrReturned = 0;

    for (const order of orders) {
      if (order.status === "PENDING" || order.status === "CONFIRMED" || order.status === "PROCESSING") {
        inProgress += 1;
      } else if (order.status === "SHIPPED" || order.status === "DELIVERED") {
        fulfilled += 1;
      } else {
        cancelledOrReturned += 1;
      }
    }

    return {
      total: totalCount || orders.length,
      inProgress,
      fulfilled,
      cancelledOrReturned,
    };
  }, [orders, totalCount]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const shortId = order.id.slice(-8).toLowerCase();
      const haystack = [
        shortId,
        order.id.toLowerCase(),
        order.customerName,
        order.customerPhone,
        order.governorate,
        order.cityArea,
        order.courierName ?? "",
        order.trackingNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, searchQuery]);

  function openEdit(order: OrderPublic) {
    setEditingOrder(order);
    setUpdateStatus(order.status);
    setCourierName(order.courierName ?? "");
    setTrackingNumber(order.trackingNumber ?? "");
    setNotice("");
    setError("");
    setModalError("");
  }

  async function ensureCsrfToken(): Promise<string | null> {
    if (csrfToken) return csrfToken;
    const session = await getAdminSession();
    if (session?.csrfToken) {
      setCsrfToken(session.csrfToken);
      return session.csrfToken;
    }
    return null;
  }

  async function handleInlineStatusChange(order: OrderPublic, status: OrderStatus) {
    if (status === order.status) return;
    const token = await ensureCsrfToken();
    if (!token) {
      setError(t("homepageAdminDenied"));
      return;
    }

    setSavingOrderId(order.id);
    setError("");
    setNotice("");
    try {
      await updateAdminOrderStatus(order.id, { status }, token);
      setNotice(t("adminUpdateSuccess"));
      setRefreshKey((current) => current + 1);
    } catch {
      setError(t("homepageRequestError"));
    } finally {
      setSavingOrderId(null);
    }
  }

  async function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingOrder) return;
    const token = await ensureCsrfToken();
    if (!token) {
      setModalError(t("homepageAdminDenied"));
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const payload: AdminUpdateOrderStatusInput = {
        status: updateStatus,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
      };
      await updateAdminOrderStatus(editingOrder.id, payload, token);
      setNotice(t("adminUpdateSuccess"));
      setRefreshKey((current) => current + 1);
      setEditingOrder(null);
    } catch {
      setModalError(t("homepageRequestError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title={t("adminOrdersTitle")}
      subtitle={t("adminOrdersIntro")}
      headerActions={
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefreshKey((current) => current + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-[#101B30] shadow-2xs transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          <span>تحديث الطلبات</span>
        </button>
      }
    >
      <div className="min-w-0 space-y-6">
        {/* Page Header + Breadcrumbs + Summary Stats */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-2xs">
          <nav aria-label="مسار التنقل" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
            <Link to="/admin" className="font-medium transition-colors hover:text-[#C8102E]">
              لوحة التحكم
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-bold text-[#101B30]">{t("adminOrdersTitle")}</span>
          </nav>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-black text-[#101B30] sm:text-xl">
                {t("adminOrdersTitle")}
              </h2>
              <p className="text-xs leading-relaxed text-neutral-600 sm:text-sm">
                {t("adminOrdersIntro")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5">
              <span className="block text-xs font-medium text-neutral-500">إجمالي الطلبات</span>
              <strong className="mt-1 block text-2xl font-black text-[#101B30]">
                {loading ? "—" : stats.total}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5">
              <span className="block text-xs font-medium text-amber-800">قيد المراجعة والتجهيز</span>
              <strong className="mt-1 block text-2xl font-black text-amber-900">
                {loading ? "—" : stats.inProgress}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <span className="block text-xs font-medium text-emerald-700">تم الشحن والتوصيل</span>
              <strong className="mt-1 block text-2xl font-black text-emerald-800">
                {loading ? "—" : stats.fulfilled}
              </strong>
            </div>
            <div className="min-w-0 rounded-xl border border-rose-200/80 bg-rose-50/50 p-3.5">
              <span className="block text-xs font-medium text-rose-700">ملغي ومرتجع</span>
              <strong className="mt-1 block text-2xl font-black text-rose-800">
                {loading ? "—" : stats.cancelledOrReturned}
              </strong>
            </div>
          </div>
        </section>

        {/* Feedback Banners */}
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-700 hover:text-rose-900"
              aria-label="إغلاق الخطأ"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Status Filter Toolbar */}
        <section className="space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <label htmlFor="orders-search" className="sr-only">
                البحث في الطلبات
              </label>
              <input
                id="orders-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، المحافظة، أو رقم التتبع..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 py-2.5 pr-9 pl-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:bg-white focus:outline-hidden"
              />
              <svg
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </div>

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="self-start rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 sm:self-auto"
              >
                مسح البحث
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statuses.map((s) => {
              const isActive = selectedStatus === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedStatus(s.value)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? "border-[#C8102E] bg-[#C8102E] text-white shadow-2xs"
                      : "border-neutral-200 bg-neutral-50/70 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Content: Loading / Empty / Orders List */}
        {loading ? (
          <div aria-busy="true" aria-label="جارٍ تحميل الطلبات" className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="animate-pulse flex items-center justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                <div className="h-4 w-24 rounded bg-neutral-200" />
                <div className="h-4 w-36 rounded bg-neutral-100" />
                <div className="h-4 w-20 rounded bg-neutral-200" />
                <div className="h-8 w-28 rounded-lg bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error && orders.length === 0 ? (
          <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs">
            <p className="text-sm font-bold text-neutral-900">تعذر تحميل الطلبات</p>
            <p className="text-xs text-neutral-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="rounded-xl bg-[#101B30] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1a2b4c]"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <h3 className="text-sm font-bold text-[#101B30]">
              {searchQuery.trim() ? "لا توجد طلبات مطابقة للبحث" : t("customerNoOrders")}
            </h3>
            <p className="text-xs text-neutral-500">
              {searchQuery.trim()
                ? "جرّب البحث برقم طلب أو اسم عميل آخر."
                : "ستظهر الطلبات الجديدة هنا فور تسجيلها من المتجر."}
            </p>
            {(searchQuery.trim() || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                }}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-50"
              >
                عرض جميع الطلبات
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-neutral-200/90 bg-white shadow-2xs">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-bold text-neutral-500">
                    <th className="px-4 py-3.5">{t("customerOrderNumber")}</th>
                    <th className="px-4 py-3.5">{t("fullNameLabel")} / {t("phoneLabel")}</th>
                    <th className="px-4 py-3.5">{t("customerGovernorate")}</th>
                    <th className="px-4 py-3.5">{t("customerOrderItems")}</th>
                    <th className="px-4 py-3.5">{t("customerOrderTotal")}</th>
                    <th className="px-4 py-3.5">{t("customerOrderStatus")}</th>
                    <th className="px-4 py-3.5">{t("customerOrderCourier")}</th>
                    <th className="px-4 py-3.5 text-left">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-neutral-50/70">
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          aria-label={`تفاصيل الطلب ${order.id.slice(-8).toUpperCase()}`}
                          className="font-mono font-bold text-[#C8102E] hover:underline"
                          to={`/admin/orders/${order.id}`}
                        >
                          #{order.id.slice(-8).toUpperCase()}
                        </Link>
                        <div className="mt-0.5 text-[11px] text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-neutral-900">{order.customerName}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-neutral-500" dir="ltr">
                          {order.customerPhone}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top text-neutral-700">
                        {order.governorate} - {order.cityArea}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span
                          title={order.items
                            .map((i) => `${i.productName} × ${i.quantity}`)
                            .join("\n")}
                          className="inline-flex rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700"
                        >
                          {order.items.length} منتج{order.items.length > 1 ? "ات" : ""}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top font-bold text-[#101B30]">
                        {formatEGP(order.totalCents)}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <select
                          aria-label={`حالة الطلب ${order.id.slice(-8).toUpperCase()}`}
                          disabled={savingOrderId !== null}
                          onChange={(event) =>
                            void handleInlineStatusChange(order, event.target.value as OrderStatus)
                          }
                          value={order.status}
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold focus:outline-hidden disabled:opacity-60 ${STATUS_BADGE_CLASSES[order.status]}`}
                        >
                          {statuses
                            .filter((status) => status.value !== "ALL")
                            .map((status) => (
                              <option key={status.value} value={status.value} className="bg-white text-neutral-900">
                                {status.label}
                              </option>
                            ))}
                        </select>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {order.courierName ? (
                          <div>
                            <div className="font-semibold text-neutral-800">{order.courierName}</div>
                            {order.trackingNumber && (
                              <div className="mt-0.5 font-mono text-[11px] text-neutral-500" dir="ltr">
                                #{order.trackingNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30] transition-colors hover:bg-neutral-100"
                          >
                            التفاصيل
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(order)}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30] transition-colors hover:border-[#D6A33A] hover:bg-amber-50/40"
                          >
                            تعديل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        aria-label={`تفاصيل الطلب ${order.id.slice(-8).toUpperCase()}`}
                        className="font-mono text-sm font-bold text-[#C8102E] hover:underline"
                        to={`/admin/orders/${order.id}`}
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASSES[order.status]}`}
                    >
                      {STATUS_LABEL_MAP[order.status]}
                    </span>
                  </div>

                  <div className="space-y-1.5 rounded-xl bg-neutral-50 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500">العميل:</span>
                      <strong className="truncate text-neutral-900">{order.customerName}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500">الهاتف:</span>
                      <span dir="ltr" className="font-mono text-neutral-700">{order.customerPhone}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500">المنطقة:</span>
                      <span className="truncate text-neutral-700">{order.governorate} - {order.cityArea}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500">الإجمالي:</span>
                      <strong className="text-[#101B30]">{formatEGP(order.totalCents)}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <select
                      aria-label={`حالة الطلب ${order.id.slice(-8).toUpperCase()}`}
                      disabled={savingOrderId !== null}
                      onChange={(event) =>
                        void handleInlineStatusChange(order, event.target.value as OrderStatus)
                      }
                      value={order.status}
                      className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-800 focus:border-[#C8102E] focus:outline-hidden"
                    >
                      {statuses
                        .filter((status) => status.value !== "ALL")
                        .map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30]"
                      >
                        التفاصيل
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(order)}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B30]"
                      >
                        تعديل
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Edit Status & Shipping Modal */}
        {editingOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-edit-modal-title"
            onClick={() => !saving && setEditingOrder(null)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-center justify-between border-b border-neutral-200 bg-[#101B30] px-5 py-4 text-white">
                <h3 id="order-edit-modal-title" className="text-sm font-bold">
                  تحديث حالة الطلب #{editingOrder.id.slice(-8).toUpperCase()}
                </h3>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingOrder(null)}
                  aria-label="إغلاق النافذة"
                  className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </header>

              <form onSubmit={(e) => void handleStatusSubmit(e)} className="space-y-4 p-5">
                {modalError && (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                    {modalError}
                  </p>
                )}

                <div>
                  <label htmlFor="edit-order-status" className="mb-1.5 block text-xs font-bold text-neutral-800">
                    {t("adminOrderStatus")}
                  </label>
                  <select
                    id="edit-order-status"
                    disabled={saving}
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:border-[#C8102E] focus:outline-hidden"
                  >
                    {statuses
                      .filter((s) => s.value !== "ALL")
                      .map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-order-courier" className="mb-1.5 block text-xs font-bold text-neutral-800">
                    {t("customerOrderCourier")}
                  </label>
                  <input
                    id="edit-order-courier"
                    type="text"
                    maxLength={100}
                    disabled={saving}
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="مثال: بوسطة / أرامكس / مندوب خاص"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="edit-order-tracking" className="mb-1.5 block text-xs font-bold text-neutral-800">
                    {t("customerOrderTracking")}
                  </label>
                  <input
                    id="edit-order-tracking"
                    type="text"
                    maxLength={100}
                    dir="ltr"
                    disabled={saving}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="مثال: BST-9823411"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                  />
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingOrder(null)}
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#C8102E] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#a50d26] disabled:opacity-60"
                  >
                    {saving ? t("homepageSaving") : t("homepageSave")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
