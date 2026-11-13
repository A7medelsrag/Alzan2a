import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import AdminDashboard from "../../../pages/AdminDashboard";
import { verifyAdminSession } from "../api/auth";

type SessionState = "checking" | "authenticated" | "unauthenticated" | "unavailable";

export default function AdminRoute() {
  const { t } = useTranslation();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSessionState("checking");
    void verifyAdminSession(controller.signal)
      .then((authenticated) => {
        setSessionState(authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSessionState("unavailable");
      });

    return () => controller.abort();
  }, [retry]);

  if (sessionState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-neutral-600 text-sm font-medium" dir="rtl">
        {t("loginSubmitting")}...
      </main>
    );
  }

  if (sessionState === "unauthenticated") {
    return <Navigate replace to="/login#admin" />;
  }

  if (sessionState === "unavailable") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6 text-center" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <h1 className="text-lg font-bold text-neutral-900">{t("sessionErrorTitle")}</h1>
          <p className="text-xs text-neutral-500 leading-relaxed">{t("sessionErrorBody")}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => setRetry((value) => value + 1)}
              type="button"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-50 transition-colors"
            >
              {t("retry")}
            </button>
            <Link
              to="/login#admin"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-50 transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <AdminDashboard />;
}
