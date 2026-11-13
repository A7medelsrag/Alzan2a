import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { formatEGP, type OrderPublic } from "@store/shared";
import { BrandMark, Icon } from "@store/ui";
import { useCustomerSession } from "../../customer/CustomerSession.js";
import { getOrder, OrderApiError } from "../api/orders.js";

const statusTranslations: Record<string, string> = {
  PENDING: "قيد المراجعة والتأكيد",
  CONFIRMED: "تم تأكيد الطلب",
  PROCESSING: "قيد التجهيز والتغليف",
  SHIPPED: "تم الشحن مع المندوب",
  DELIVERED: "تم التوصيل بنجاح",
  CANCELLED: "تم إلغاء الطلب",
  RETURNED: "مرتجع",
};

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { customer } = useCustomerSession();

  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");

    getOrder(id)
      .then((res) => {
        setOrder(res.data);
      })
      .catch((err) => {
        if (err instanceof OrderApiError && err.statusCode === 404) {
          setError("الطلب غير موجود أو انتهت صلاحية عرض تفاصيله على هذا المتصفح.");
        } else {
          setError("تعذر تحميل بيانات الطلب حاليًا.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="store-app" dir="rtl">
        <header className="store-header">
          <div className="store-header__main">
            <Link className="store-brand" to="/">
              <BrandMark />
              <span className="store-brand__name">{t("brandName")}</span>
            </Link>
          </div>
        </header>
        <main className="cart-main-container">
          <div className="homepage-loading" aria-live="polite">
            <p>جارٍ تحميل تفاصيل طلبك...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="store-app" dir="rtl">
        <header className="store-header">
          <div className="store-header__main">
            <Link className="store-brand" to="/">
              <BrandMark />
              <span className="store-brand__name">{t("brandName")}</span>
            </Link>
          </div>
        </header>
        <main className="cart-main-container">
          <div className="empty-cart-state">
            <h2>تعذر عرض الطلب</h2>
            <p role="alert">{error}</p>
            <Link className="customer-primary-button" to="/">
              العودة إلى المتجر
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="store-app cart-page-wrapper" dir="rtl">
      <header className="store-header">
        <div className="store-header__main">
          <Link aria-label={t("brandName")} className="store-brand" to="/">
            <BrandMark />
            <span className="store-brand__name">{t("brandName")}</span>
          </Link>
          <div className="cart-header-actions">
            <Link className="store-admin-link" to="/">
              <span>العودة للمتجر</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="cart-main-container confirmation-container">
        <section className="confirmation-card">
          <div className="confirmation-badge-success">
            <Icon name="truck" />
          </div>
          <h1>تم استلام طلبك بنجاح!</h1>
          <p className="confirmation-subtitle">
            شكرًا لطلبك. تم تسجيل طلبك وإرساله للإدارة، وسنتواصل معكِ قريبًا لتأكيد التفاصيل.
          </p>

          <div className="order-meta-box">
            <div className="meta-item">
              <span>رقم الطلب:</span>
              <strong className="order-id-tag">{order.id}</strong>
            </div>
            <div className="meta-item">
              <span>حالة الطلب:</span>
              <span className="status-pill">{statusTranslations[order.status] || order.status}</span>
            </div>
          </div>

          {/* Stepper Tracking Indicator */}
          <div className="order-tracking-stepper">
            <div className={`step-item ${order.status !== "CANCELLED" ? "step-active" : ""}`}>
              <div className="step-circle">1</div>
              <span>تم استلام الطلب</span>
            </div>
            <div className={`step-item ${["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) ? "step-active" : ""}`}>
              <div className="step-circle">2</div>
              <span>تم التأكيد</span>
            </div>
            <div className={`step-item ${["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) ? "step-active" : ""}`}>
              <div className="step-circle">3</div>
              <span>قيد التجهيز</span>
            </div>
            <div className={`step-item ${["SHIPPED", "DELIVERED"].includes(order.status) ? "step-active" : ""}`}>
              <div className="step-circle">4</div>
              <span>تم الشحن</span>
            </div>
            <div className={`step-item ${order.status === "DELIVERED" ? "step-active" : ""}`}>
              <div className="step-circle">5</div>
              <span>تم التوصيل</span>
            </div>
          </div>

          {/* Address & Customer details */}
          <div className="confirmation-details-grid">
            <div className="details-panel">
              <h3>بيانات العميل والعنوان</h3>
              <p><strong>الاسم:</strong> {order.customerName}</p>
              <p><strong>الهاتف:</strong> {order.customerPhone}</p>
              {order.customerEmail && <p><strong>البريد الإلكتروني:</strong> {order.customerEmail}</p>}
              <p><strong>المحافظة والمنطقة:</strong> {order.governorate} - {order.cityArea}</p>
              <p><strong>العنوان التفصيلي:</strong> {order.detailedAddress}</p>
              {order.landmark && <p><strong>علامة مميزة:</strong> {order.landmark}</p>}
            </div>

            <div className="details-panel">
              <h3>ملخص الفاتورة (الدفع عند الاستلام)</h3>
              <div className="summary-row">
                <span>إجمالي المنتجات:</span>
                <span>{formatEGP(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="summary-row">
                  <span>الخصم:</span>
                  <span>- {formatEGP(order.discountCents)}</span>
                </div>
              )}
              <div className="summary-row summary-row-total">
                <span>الإجمالي المطلوب للدفع:</span>
                <strong className="total-highlight">{formatEGP(order.totalCents)}</strong>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div className="confirmation-items-box">
            <h3>المنتجات المطلوبة ({order.items.length})</h3>
            <ul className="confirmation-items-list">
              {order.items.map((item) => (
                <li key={item.id} className="confirmation-item-row">
                  <div>
                    <strong>{item.productName || "منتج من المتجر"}</strong>
                    {item.variantName && <span className="variant-label"> - {item.variantName}</span>}
                  </div>
                  <div>
                    <span>{item.quantity} × {formatEGP(item.unitPriceCents)}</span>
                    <strong className="item-subtotal"> = {formatEGP(item.unitPriceCents * item.quantity)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Guest vs Account Perks notice */}
          {!customer && (
            <div className="guest-perk-callout">
              <Icon name="user" />
              <div>
                <h4>تابعي طلباتك بسهولة من حسابك الشخصي</h4>
                <p>
                  أنشئي حسابًا الآن برقم هاتفك لمتابعة حالة طلباتك وحفظ عناوين التوصيل المفضلة لديكِ.
                </p>
                <Link className="customer-secondary-button" to="/register">
                  إنشاء حساب جديد
                </Link>
              </div>
            </div>
          )}

          <div className="confirmation-actions">
            <Link className="customer-primary-button" to="/">
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
