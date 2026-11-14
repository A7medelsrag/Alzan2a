import { useEffect, useState, type FormEvent } from "react";
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

export default function AdminOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit modal / drawer state
  const [editingOrder, setEditingOrder] = useState<OrderPublic | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OrderStatus>("CONFIRMED");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await listAdminOrders({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        pageSize: 50,
      });
      setOrders(res.data);
    } catch {
      setError(t("homepageRequestError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [selectedStatus, refreshKey]);

  function openEdit(order: OrderPublic) {
    setEditingOrder(order);
    setUpdateStatus(order.status);
    setCourierName(order.courierName ?? "");
    setTrackingNumber(order.trackingNumber ?? "");
    setNotice("");
    setError("");
  }

  async function handleInlineStatusChange(order: OrderPublic, status: OrderStatus) {
    if (status === order.status) return;
    if (!csrfToken) {
      setError(t("homepageAdminDenied"));
      return;
    }

    setSavingOrderId(order.id);
    setError("");
    setNotice("");
    try {
      await updateAdminOrderStatus(order.id, { status }, csrfToken);
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
    if (!editingOrder || !csrfToken) return;

    setSaving(true);
    setError("");
    try {
      const payload: AdminUpdateOrderStatusInput = {
        status: updateStatus,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
      };
      await updateAdminOrderStatus(editingOrder.id, payload, csrfToken);
      setNotice(t("adminUpdateSuccess"));
      setRefreshKey((current) => current + 1);
      setEditingOrder(null);
    } catch {
      setError(t("homepageRequestError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title={t("adminOrdersTitle")} subtitle={t("adminOrdersIntro")}>
      <div className="admin-orders-container">
        {notice && (
          <p className="admin-notice admin-notice--success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="admin-notice admin-notice--error" role="alert">
            {error}
          </p>
        )}

        <div className="admin-orders-filters">
          {statuses.map((s) => (
            <button
              className={`admin-filter-pill ${selectedStatus === s.value ? "admin-filter-pill--active" : ""}`}
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="admin-loading-state">{t("catalogLoading")}</div>
        ) : orders.length === 0 ? (
          <div className="admin-empty-state">{t("customerNoOrders")}</div>
        ) : (
          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>{t("customerOrderNumber")}</th>
                  <th>
                    {t("fullNameLabel")} / {t("phoneLabel")}
                  </th>
                  <th>{t("customerGovernorate")}</th>
                  <th>{t("customerOrderItems")}</th>
                  <th>{t("customerOrderTotal")}</th>
                  <th>{t("customerOrderStatus")}</th>
                  <th>{t("customerOrderCourier")}</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        aria-label={`تفاصيل الطلب ${order.id.slice(-8).toUpperCase()}`}
                        className="text-[#7a1535] hover:underline"
                        to={`/admin/orders/${order.id}`}
                      >
                        <strong>#{order.id.slice(-8).toUpperCase()}</strong>
                      </Link>
                      <div className="admin-cell-muted">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                      </div>
                    </td>
                    <td>
                      <div>{order.customerName}</div>
                      <div className="admin-cell-muted" dir="ltr">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td>
                      {order.governorate} - {order.cityArea}
                    </td>
                    <td>
                      <span
                        title={order.items
                          .map((i) => `${i.productName} × ${i.quantity}`)
                          .join("\n")}
                      >
                        {order.items.length} منتج{order.items.length > 1 ? "ات" : ""}
                      </span>
                    </td>
                    <td>
                      <strong>{formatEGP(order.totalCents)}</strong>
                    </td>
                    <td>
                      <select
                        aria-label={`حالة الطلب ${order.id.slice(-8).toUpperCase()}`}
                        className="admin-select"
                        disabled={savingOrderId !== null}
                        onChange={(event) =>
                          void handleInlineStatusChange(order, event.target.value as OrderStatus)
                        }
                        value={order.status}
                      >
                        {statuses
                          .filter((status) => status.value !== "ALL")
                          .map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {order.courierName ? (
                        <div>
                          <div>{order.courierName}</div>
                          {order.trackingNumber && (
                            <div className="admin-cell-muted" dir="ltr">
                              #{order.trackingNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="admin-cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={() => openEdit(order)}
                        type="button"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingOrder && (
          <div className="admin-modal-backdrop">
            <div className="admin-modal-card">
              <header className="admin-modal-header">
                <h3>تحديث حالة الطلب #{editingOrder.id.slice(-8).toUpperCase()}</h3>
                <button
                  className="admin-modal-close"
                  onClick={() => setEditingOrder(null)}
                  type="button"
                >
                  ✕
                </button>
              </header>
              <form onSubmit={handleStatusSubmit}>
                <div className="admin-modal-body">
                  <label className="admin-form-group">
                    <span>{t("adminOrderStatus")}</span>
                    <select
                      className="admin-select"
                      onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
                      value={updateStatus}
                    >
                      {statuses
                        .filter((s) => s.value !== "ALL")
                        .map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="admin-form-group">
                    <span>{t("customerOrderCourier")}</span>
                    <input
                      className="admin-input"
                      maxLength={100}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="مثال: بوسطة / أرامكس / مندوب خاص"
                      type="text"
                      value={courierName}
                    />
                  </label>

                  <label className="admin-form-group">
                    <span>{t("customerOrderTracking")}</span>
                    <input
                      className="admin-input"
                      maxLength={100}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="مثال: BST-9823411"
                      type="text"
                      value={trackingNumber}
                    />
                  </label>
                </div>

                <footer className="admin-modal-footer">
                  <button className="admin-btn admin-btn--primary" disabled={saving} type="submit">
                    {saving ? t("homepageSaving") : t("homepageSave")}
                  </button>
                  <button
                    className="admin-btn admin-btn--secondary"
                    onClick={() => setEditingOrder(null)}
                    type="button"
                  >
                    {t("cancel")}
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
