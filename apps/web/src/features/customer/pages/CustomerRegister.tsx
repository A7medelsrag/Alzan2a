import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { BrandMark } from "@store/ui";
import { CustomerAuthError, registerCustomer } from "../api/account";
import { useCustomerSession } from "../CustomerSession";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export default function CustomerRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { acceptSession } = useCustomerSession();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirmation) {
      setError(t("customerPasswordMismatch"));
      return;
    }
    setBusy(true);
    try {
      acceptSession(await registerCustomer({ fullName, phone, password, passwordConfirmation }));
      navigate("/account", { replace: true });
    } catch (reason) {
      setError(reason instanceof CustomerAuthError
        ? t(`customerError_${reason.kind}`)
        : t("customerError_unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="customer-auth-page">
      <section className="customer-auth-card">
        <Link aria-label={t("brandName")} className="customer-auth-brand" to="/">
          <BrandMark />
          <span>{t("brandName")}</span>
        </Link>
        <p className="eyebrow">{t("customerAccountOptional")}</p>
        <h1>{t("customerRegisterTitle")}</h1>
        <p className="customer-auth-intro">{t("customerRegisterIntro")}</p>
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
          <label htmlFor="customer-register-name">
            {t("fullNameLabel")}
            <input
              autoComplete="name"
              id="customer-register-name"
              maxLength={120}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
          <label htmlFor="customer-register-phone">
            {t("phoneLabel")}
            <input
              autoComplete="tel"
              id="customer-register-phone"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              required
              type="tel"
              value={phone}
            />
          </label>
          <label htmlFor="customer-register-password">
            {t("passwordLabel")}
            <input
              autoComplete="new-password"
              id="customer-register-password"
              minLength={15}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <p className="customer-password-hint">{t("customerPasswordHint")}</p>
          <label htmlFor="customer-register-confirm">
            {t("passwordConfirmationLabel")}
            <input
              autoComplete="new-password"
              id="customer-register-confirm"
              minLength={15}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              type="password"
              value={passwordConfirmation}
            />
          </label>
          {error && <p className="customer-form-error" role="alert">{error}</p>}
          <button className="customer-primary-button" disabled={busy} type="submit">
            {t(busy ? "loginSubmitting" : "customerRegisterAction")}
          </button>
        </form>
        <p className="customer-auth-switch">
          {t("customerAlreadyAccount")} <Link to="/login">{t("customerLoginLink")}</Link>
        </p>
        <Link className="customer-back-link" to="/">{t("backToStore")}</Link>
      </section>
    </main>
  );
}
