import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { formatEGP, type OrderPublic, type OrderStatus } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import { getAdminSession } from "../api/auth";
import { AdminOrderApiError, getAdminOrder, updateAdminOrderStatus } from "../api/orders";

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "جديد",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  RETURNED: "مرتجع",
};

export default function AdminOrderDetail() {
  const { pathname } = useLocation();
  const orderId = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([getAdminOrder(orderId), getAdminSession()])
      .then(([result, session]) => {
        if (!active) return;
        setOrder(result.data);
        setStatus(result.data.status);
        setCourier(result.data.courierName ?? "");
        setTrackingNumber(result.data.trackingNumber ?? "");
        setCsrfToken(session?.csrfToken ?? "");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof AdminOrderApiError && reason.code === "ORDER_NOT_FOUND"
          ? "الطلب غير موجود."
          : "تعذر تحميل بيانات الطلب. حاول مرة أخرى.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !csrfToken) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await updateAdminOrderStatus(order.id, {
        status,
        courierName: courier.trim() || null,
        trackingNumber: trackingNumber.trim() || null,
      }, csrfToken);
      setOrder(result.data);
      setNotice("تم حفظ تحديثات الطلب.");
    } catch {
      setError("تعذر حفظ التحديث. راجع حالة الطلب وحاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminLayout title="تفاصيل الطلب"><p role="status">جارٍ تحميل الطلب…</p></AdminLayout>;
  }

  if (!order) {
    return <AdminLayout title="تفاصيل الطلب"><p role="alert">{error || "الطلب غير موجود."}</p><Link to="/admin/orders">العودة إلى الطلبات</Link></AdminLayout>;
  }

  return (
    <AdminLayout title={`الطلب ${order.id.slice(-8).toUpperCase()}`} subtitle={new Date(order.createdAt).toLocaleString("ar-EG")}>
      <div className="mb-4 text-sm"><Link className="text-[#7a1535]" to="/admin/orders">الطلبات</Link><span className="mx-2">/</span><span>{order.id.slice(-8).toUpperCase()}</span></div>
      {notice && <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
      {error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-rose-700" role="alert">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">المنتجات</h2>
            <table className="w-full text-right text-sm">
              <thead><tr className="border-b text-neutral-500"><th className="py-2">المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
              <tbody>{order.items.map((item) => <tr className="border-b last:border-0" key={item.id}>
                <td className="py-3">{item.productName ?? item.variantName ?? "منتج"}</td><td>{item.quantity}</td><td>{formatEGP(item.unitPriceCents)}</td><td>{formatEGP(item.unitPriceCents * item.quantity - item.discountCents)}</td>
              </tr>)}</tbody>
            </table>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between"><dt>قيمة المنتجات</dt><dd>{formatEGP(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>الشحن</dt><dd>{formatEGP(order.shippingFeeCents)}</dd></div>
              <div className="flex justify-between"><dt>الخصومات</dt><dd>{formatEGP(order.discountCents)}</dd></div>
              <div className="flex justify-between font-bold"><dt>الإجمالي</dt><dd>{formatEGP(order.totalCents)}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">عنوان التوصيل</h2>
            <p>{order.governorate}، {order.cityArea}</p><p>{order.detailedAddress}</p>{order.landmark && <p>علامة مميزة: {order.landmark}</p>}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">بيانات العميل</h2>
            <p>{order.customerName}</p><p dir="ltr" className="text-right">{order.customerPhone}</p>{order.customerEmail && <p dir="ltr" className="text-right">{order.customerEmail}</p>}
          </section>
          <form className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5" onSubmit={saveOrder}>
            <h2 className="text-lg font-bold">تحديث الطلب</h2>
            <label className="grid gap-1 text-sm font-semibold">الحالة<select className="rounded-lg border border-neutral-300 p-2" onChange={(event) => setStatus(event.target.value as OrderStatus)} value={status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold">شركة الشحن<input className="rounded-lg border border-neutral-300 p-2" maxLength={100} onChange={(event) => setCourier(event.target.value)} value={courier} /></label>
            <label className="grid gap-1 text-sm font-semibold">رقم التتبع<input className="rounded-lg border border-neutral-300 p-2" dir="ltr" maxLength={100} onChange={(event) => setTrackingNumber(event.target.value)} value={trackingNumber} /></label>
            <button className="w-full rounded-xl bg-[#7a1535] p-3 font-bold text-white disabled:opacity-50" disabled={saving || !csrfToken} type="submit">{saving ? "جارٍ الحفظ…" : "حفظ التحديث"}</button>
          </form>
        </aside>
      </div>
    </AdminLayout>
  );
}
