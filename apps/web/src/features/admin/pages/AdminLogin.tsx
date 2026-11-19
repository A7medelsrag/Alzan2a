import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { AdminAuthError, loginAdmin } from "../api/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await loginAdmin(username, password);
      navigate("/admin", { replace: true });
    } catch (error) {
      if (error instanceof AdminAuthError) {
        if (error.kind === "invalid" || error.kind === "mfaRequired") {
          setErrorMessage("البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة.");
        } else if (error.kind === "rateLimit") {
          setErrorMessage("محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.");
        } else if (error.kind === "origin") {
          setErrorMessage("عنوان صفحة الدخول غير مسموح به من الخادم.");
        } else {
          setErrorMessage("تعذر الاتصال بالخدمة. تأكد من تشغيل الخادم وحاول مرة أخرى.");
        }
      } else {
        setErrorMessage("حدث خطأ غير متوقع.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-login-form" dir="rtl">
      <header className="admin-login-heading">
        <h1>تسجيل دخول الإدارة</h1>
        <p>أدخل بياناتك للوصول إلى لوحة التحكم.</p>
      </header>
      <form className="admin-login-fields" onSubmit={handleSubmit}>
        <label htmlFor="admin-username">
          البريد الإلكتروني أو اسم المستخدم
          <input
            autoComplete="username"
            dir="ltr"
            id="admin-username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin@example.com"
            required
            type="text"
            value={username}
          />
        </label>
        <label htmlFor="admin-password">
          كلمة المرور
          <span className="admin-password-control">
            <input
              autoComplete="current-password"
              id="admin-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword((visible) => !visible)} type="button">
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </span>
        </label>
        {errorMessage && <p className="admin-login-error" role="alert">{errorMessage}</p>}
        <button className="admin-login-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "جارٍ تسجيل الدخول…" : "دخول"}
        </button>
        <p className="admin-login-hint">بعد 5 محاولات خاطئة، قد يتأخر تسجيل الدخول مؤقتًا لحماية الحساب.</p>
      </form>
    </div>
  );
}
