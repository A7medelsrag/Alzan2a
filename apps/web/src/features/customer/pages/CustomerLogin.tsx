import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { BrandMark } from "@store/ui";
import { CustomerAuthError, loginCustomer } from "../api/account";
import { useCustomerSession } from "../CustomerSession";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import AdminLogin from "../../admin/pages/AdminLogin";

export default function CustomerLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { acceptSession } = useCustomerSession();
  const [loginType, setLoginType] = useState<"customer" | "admin">(() =>
    window.location.hash === "#admin" ? "admin" : "customer",
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      acceptSession(await loginCustomer({ phone, password }));
      navigate("/account", { replace: true });
    } catch (reason) {
      setError(reason instanceof CustomerAuthError
        ? t(`customerError_${reason.kind}`)
        : t("customerError_unavailable"));
    } finally {
      setBusy(false);
    }
  }

  if (loginType === "admin") {
    return (
      <main className="customer-auth-page" dir="rtl">
        <section className="customer-auth-card login-choice-card">
          <div className="login-choice-tabs" role="tablist" aria-label="نوع الحساب">
            <button aria-selected={false} onClick={() => setLoginType("customer")} role="tab" type="button">دخول العملاء</button>
            <button aria-selected={true} className="is-active" role="tab" type="button">دخول الإدارة</button>
          </div>
          <AdminLogin />
          <Link className="customer-back-link" to="/">{t("backToStore")}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-auth-page">
      <section className="customer-auth-card">
        <Link aria-label={t("brandName")} className="customer-auth-brand" to="/">
          <BrandMark />
          <span>{t("brandName")}</span>
        </Link>
        <div className="login-choice-tabs" role="tablist" aria-label="نوع الحساب">
          <button aria-selected={true} className="is-active" role="tab" type="button">دخول العملاء</button>
          <button aria-selected={false} onClick={() => setLoginType("admin")} role="tab" type="button">دخول الإدارة</button>
        </div>
        <p className="eyebrow">{t("customerAccountOptional")}</p>
        <h1>{t("customerLoginTitle")}</h1>
        <p className="customer-auth-intro">{t("customerLoginIntro")}</p>
        <GoogleSignInButton
          disabled={busy}
          onSuccess={(session) => {
            acceptSession(session);
            navigate("/account", { replace: true });
          }}
          onError={(reason) => {
            setError(reason instanceof CustomerAuthError
              ? t(`customerError_${reason.kind}`)
              : t("customerError_unavailable"));
          }}
        />
        <div className="customer-auth-divider">
          <span>{t("orDivider")}</span>
        </div>
        <form className="customer-form" onSubmit={handleSubmit}>
          <label htmlFor="customer-login-phone">
            {t("phoneLabel")}
            <input
              autoComplete="tel"
              id="customer-login-phone"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              required
              type="tel"
              value={phone}
            />
          </label>
          <label htmlFor="customer-login-password">
            {t("passwordLabel")}
            <input
              autoComplete="current-password"
              id="customer-login-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="customer-form-error" role="alert">{error}</p>}
          <button className="customer-primary-button" disabled={busy} type="submit">
            {t(busy ? "loginSubmitting" : "customerLoginAction")}
          </button>
        </form>
        <p className="customer-auth-switch">
          {t("customerNoAccount")} <Link to="/register">{t("customerRegisterLink")}</Link>
        </p>
        <Link className="customer-back-link" to="/">{t("backToStore")}</Link>
      </section>
    </main>
  );
}

