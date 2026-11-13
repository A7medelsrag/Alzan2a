import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { formatEGP, type CustomerAddressInput, type OrderPublic } from "@store/shared";
import StoreLayout from "../../../components/StoreLayout";
import { listCustomerOrders } from "../../cart/api/orders.js";
import { useWishlist } from "../../wishlist/WishlistContext";
import {
  createCustomerAddress,
  CustomerAuthError,
  deleteCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress,
  updateCustomerProfile,
  type CustomerAddress,
} from "../api/account";
import { useCustomerSession } from "../CustomerSession";

const emptyAddress: CustomerAddressInput = {
  label: "",
  governorate: "",
  cityArea: "",
  detailedAddress: "",
  landmark: "",
};

const statusTranslations: Record<string, string> = {
  PENDING: "قيد المراجعة",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  RETURNED: "مرتجع",
};

type AccountSection = "orders" | "addresses" | "profile";

export default function CustomerAccount() {
  const { t } = useTranslation();
  const { customer, csrfToken, status, updateCustomer, refresh, logout } = useCustomerSession();
  const { openDrawer: openWishlist } = useWishlist();
  const [activeSection, setActiveSection] = useState<AccountSection>("addresses");
  const [fullName, setFullName] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [addressDraft, setAddressDraft] = useState<CustomerAddressInput>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addressFormOpen, setAddressFormOpen] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName);
    let active = true;
    void listCustomerAddresses()
      .then((items) => {
        if (active) setAddresses(items);
      })
      .catch(() => {
        if (active) setAddressError(t("customerError_unavailable"));
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    void listCustomerOrders()
      .then((res) => {
        if (active) setOrders(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customer, t]);

  if (status === "checking") {
    return <StoreLayout><div className="customer-account-state" aria-live="polite">{t("loginSubmitting")}</div></StoreLayout>;
  }
  if (status === "anonymous") return <Navigate replace to="/login" />;
  if (status === "unavailable") {
    return (
      <StoreLayout><div className="customer-account-state">
        <p role="alert">{t("customerError_unavailable")}</p>
        <button className="customer-primary-button" onClick={refresh} type="button">{t("retry")}</button>
      </div></StoreLayout>
    );
  }
  if (!customer || !csrfToken) return null;
  const authenticatedCsrfToken = csrfToken;

  function showError(reason: unknown) {
    setError(reason instanceof CustomerAuthError
      ? t(`customerError_${reason.kind}`)
      : t("customerError_unavailable"));
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      updateCustomer(await updateCustomerProfile(fullName, authenticatedCsrfToken));
      setMessage(t("customerProfileSaved"));
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddressSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAddressError("");
    try {
      const saved = editingAddressId
        ? await updateCustomerAddress(editingAddressId, addressDraft, authenticatedCsrfToken)
        : await createCustomerAddress(addressDraft, authenticatedCsrfToken);
      setAddresses((current) => editingAddressId
        ? current.map((address) => address.id === saved.id ? saved : address)
        : [saved, ...current]);
      setAddressDraft(emptyAddress);
      setEditingAddressId(null);
      setAddressFormOpen(false);
    } catch (reason) {
      setAddressError(reason instanceof CustomerAuthError
        ? t(`customerError_${reason.kind}`)
        : t("customerError_unavailable"));
    } finally {
      setBusy(false);
    }
  }

  function beginAddressEdit(address: CustomerAddress) {
    setEditingAddressId(address.id);
    setAddressFormOpen(true);
    setAddressDraft({
      label: address.label,
      governorate: address.governorate,
      cityArea: address.cityArea,
      detailedAddress: address.detailedAddress,
      landmark: address.landmark ?? "",
    });
    setAddressError("");
  }

  async function removeAddress(id: string) {
    if (!window.confirm(t("customerAddressDeleteConfirm"))) return;
    setAddressError("");
    try {
      await deleteCustomerAddress(id, authenticatedCsrfToken);
      setAddresses((current) => current.filter((address) => address.id !== id));
      if (editingAddressId === id) {
        setEditingAddressId(null);
        setAddressDraft(emptyAddress);
      }
    } catch (reason) {
      setAddressError(reason instanceof CustomerAuthError
        ? t(`customerError_${reason.kind}`)
        : t("customerError_unavailable"));
    }
  }

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
    } catch (reason) {
      setLogoutError(reason instanceof CustomerAuthError
        ? t(`customerError_${reason.kind}`)
        : t("customerError_unavailable"));
    }
  }

  return (
    <StoreLayout>
      <div className="customer-account-page">
        <nav aria-label={t("customerAccountBreadcrumb")} className="customer-account-breadcrumb">
          <Link to="/">{t("home")}</Link>
          <span aria-hidden="true">/</span>
          <span>{t("customerAccountLink")}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t(activeSection === "profile" ? "customerPersonalInfo" : activeSection === "orders" ? "customerOrders" : "customerAddresses")}</span>
        </nav>

        <div className="customer-account-layout">
          <aside aria-label={t("customerAccountSidebarLabel")} className="customer-account-sidebar">
            <div className="customer-account-identity">
              <span aria-hidden="true" className="customer-account-avatar">{customer.fullName.trim().charAt(0) || "؟"}</span>
              <div>
                <strong>{customer.fullName}</strong>
                <span>{customer.phone}</span>
              </div>
            </div>
            <nav aria-label={t("customerAccountSidebarLabel")} className="customer-account-nav">
              <button
                aria-current={activeSection === "orders" ? "page" : undefined}
                className={activeSection === "orders" ? "customer-account-nav__link customer-account-nav__link--active" : "customer-account-nav__link"}
                onClick={() => setActiveSection("orders")}
                type="button"
              >
                {t("customerOrders")}
              </button>
              <button
                aria-current={activeSection === "addresses" ? "page" : undefined}
                className={activeSection === "addresses" ? "customer-account-nav__link customer-account-nav__link--active" : "customer-account-nav__link"}
                onClick={() => setActiveSection("addresses")}
                type="button"
              >
                {t("customerAddresses")}
              </button>
              <button className="customer-account-nav__link" onClick={openWishlist} type="button">
                {t("customerFavorites")}
              </button>
              <button
                aria-current={activeSection === "profile" ? "page" : undefined}
                className={activeSection === "profile" ? "customer-account-nav__link customer-account-nav__link--active" : "customer-account-nav__link"}
                onClick={() => setActiveSection("profile")}
                type="button"
              >
                {t("customerPersonalInfo")}
              </button>
              <button className="customer-account-nav__link customer-account-nav__link--logout" onClick={() => void handleLogout()} type="button">
                {t("customerLogout")}
              </button>
            </nav>
          </aside>

          <section aria-labelledby="account-section-title" className="customer-account-content">
            <header className="customer-account-heading">
              <h1 id="account-section-title">
                {t(activeSection === "profile" ? "customerPersonalInfo" : activeSection === "orders" ? "customerOrders" : "customerAddresses")}
              </h1>
              {activeSection === "addresses" && (
                <button
                  className="customer-primary-button customer-address-add-button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressDraft(emptyAddress);
                    setAddressError("");
                    setAddressFormOpen(true);
                  }}
                  type="button"
                >
                  <span aria-hidden="true">+</span>
                  {t("customerAddressAddNew")}
                </button>
              )}
            </header>

            {logoutError && <p className="customer-form-error" role="alert">{logoutError}</p>}

            {activeSection === "profile" && (
              <section aria-labelledby="profile-section-title" className="customer-account-panel">
                <h2 id="profile-section-title">{t("customerPersonalInfo")}</h2>
                <form className="customer-form customer-profile-form" onSubmit={handleProfileSave}>
                  <label htmlFor="customer-profile-name">
                    {t("fullNameLabel")}
                    <input
                      autoComplete="name"
                      id="customer-profile-name"
                      maxLength={120}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      value={fullName}
                    />
                  </label>
                  <label htmlFor="customer-profile-phone">
                    {t("phoneLabel")}
                    <input autoComplete="tel" id="customer-profile-phone" readOnly value={customer.phone ?? ""} />
                  </label>
                  <button className="customer-primary-button" disabled={busy} type="submit">
                    {t("customerSaveProfile")}
                  </button>
                  {message && <p className="customer-form-success" role="status">{message}</p>}
                  {error && <p className="customer-form-error" role="alert">{error}</p>}
                </form>
              </section>
            )}

            {activeSection === "orders" && (
              <section aria-labelledby="orders-section-title" className="customer-account-panel">
                <div className="customer-section-heading">
                  <div>
                    <h2 id="orders-section-title">{t("customerOrders")}</h2>
                    <p>{t("customerOrdersIntro")}</p>
                  </div>
                </div>
                {ordersLoading && <p className="customer-account-state">{t("catalogLoading")}</p>}
                {!ordersLoading && orders.length === 0 && (
                  <p className="customer-address-empty">{t("customerNoOrders")}</p>
                )}
                {!ordersLoading && orders.length > 0 && (
                  <div className="customer-orders-list">
                    {orders.map((order) => (
                      <article className="customer-order-card" key={order.id}>
                        <div className="customer-order-card__header">
                          <div>
                            <span className="customer-order-card__id">{t("customerOrderNumber")}: #{order.id.slice(-8).toUpperCase()}</span>
                            <time className="customer-order-card__date" dateTime={typeof order.createdAt === "string" ? order.createdAt : order.createdAt.toISOString()}>
                              {new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                            </time>
                          </div>
                          <span className={`order-status-pill order-status-pill--${order.status.toLowerCase()}`}>
                            {statusTranslations[order.status] ?? order.status}
                          </span>
                        </div>
                        <div className="customer-order-card__body">
                          <div className="customer-order-card__items">
                            <p>
                              <strong>{order.items.length} منتج{order.items.length > 1 ? "ات" : ""}:</strong>{" "}
                              {order.items.map((i) => `${i.productName} (${i.variantName}) × ${i.quantity}`).join("، ")}
                            </p>
                            <p className="customer-order-card__address">
                              📍 {order.governorate} - {order.cityArea}
                            </p>
                            {order.courierName && (
                              <p className="customer-order-card__courier">
                                🚚 {t("customerOrderCourier")}: {order.courierName}
                                {order.trackingNumber && ` (${t("customerOrderTracking")}: ${order.trackingNumber})`}
                              </p>
                            )}
                          </div>
                          <div className="customer-order-card__meta">
                            <span className="customer-order-card__total">{formatEGP(order.totalCents)}</span>
                            <Link className="customer-primary-button customer-primary-button--small" to={`/orders/${order.id}`}>
                              {t("customerOrderView")}
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeSection === "addresses" && (
              <section aria-labelledby="account-section-title" className="customer-account-panel customer-addresses-panel">
                {addressError && <p className="customer-form-error" role="alert">{addressError}</p>}
                {addressesLoading && <p className="customer-account-state">{t("catalogLoading")}</p>}
                {!addressesLoading && addresses.length === 0 && (
                  <p className="customer-address-empty">{t("customerNoAddresses")}</p>
                )}
                {!addressesLoading && (
                  <div className="customer-address-list">
                    {addresses.map((address) => (
                      <article className="customer-address-card" key={address.id}>
                        <div className="customer-address-card__details">
                          <h3>{address.label}</h3>
                          <strong>{customer.fullName}</strong>
                          {customer.phone && <p>{customer.phone}</p>}
                          <p>{address.governorate}، {address.cityArea}</p>
                          <p>{address.detailedAddress}</p>
                          {address.landmark && <p>{t("customerLandmark")}: {address.landmark}</p>}
                        </div>
                        <div className="customer-address-actions">
                          <button className="customer-text-button" onClick={() => beginAddressEdit(address)} type="button">
                            {t("customerEditAddress")}
                          </button>
                          <button className="customer-text-button customer-text-button--danger" onClick={() => void removeAddress(address.id)} type="button">
                            {t("customerDeleteAddress")}
                          </button>
                        </div>
                      </article>
                    ))}
                    <button
                      aria-expanded={addressFormOpen}
                      className="customer-address-add-card"
                      onClick={() => setAddressFormOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      <span aria-hidden="true">+</span>
                      {t("customerAddressAddNew")}
                    </button>
                  </div>
                )}
                {addressFormOpen && (
                  <form className="customer-form customer-address-form" onSubmit={handleAddressSave}>
                    <h3>{t(editingAddressId ? "customerEditAddress" : "customerAddAddress")}</h3>
                    <label>
                      {t("customerAddressLabel")}
                      <input
                        maxLength={40}
                        onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })}
                        required
                        value={addressDraft.label}
                      />
                    </label>
                    <label>
                      {t("customerGovernorate")}
                      <input
                        maxLength={80}
                        onChange={(event) => setAddressDraft({ ...addressDraft, governorate: event.target.value })}
                        required
                        value={addressDraft.governorate}
                      />
                    </label>
                    <label>
                      {t("customerCityArea")}
                      <input
                        maxLength={100}
                        onChange={(event) => setAddressDraft({ ...addressDraft, cityArea: event.target.value })}
                        required
                        value={addressDraft.cityArea}
                      />
                    </label>
                    <label>
                      {t("customerDetailedAddress")}
                      <textarea
                        maxLength={300}
                        onChange={(event) => setAddressDraft({ ...addressDraft, detailedAddress: event.target.value })}
                        required
                        rows={3}
                        value={addressDraft.detailedAddress}
                      />
                    </label>
                    <label>
                      {t("customerLandmark")}
                      <input
                        maxLength={120}
                        onChange={(event) => setAddressDraft({ ...addressDraft, landmark: event.target.value })}
                        value={addressDraft.landmark ?? ""}
                      />
                    </label>
                    <div className="customer-address-form-actions">
                      <button className="customer-primary-button" disabled={busy} type="submit">
                        {t(editingAddressId ? "customerSaveAddress" : "customerAddAddress")}
                      </button>
                      <button
                        className="customer-secondary-button"
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressDraft(emptyAddress);
                          setAddressFormOpen(false);
                        }}
                        type="button"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
                <p className="customer-address-hint">{t("customerAddressHint")}</p>
              </section>
            )}
          </section>
        </div>
      </div>
    </StoreLayout>
  );
}
