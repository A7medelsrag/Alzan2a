import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { getAdminSession, logoutAdmin } from "../api/auth";
import {
  getCachedStoreBranding,
  STORE_BRANDING_EVENT,
  type PublicStoreBranding,
} from "../../../utils/store-branding";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  timeFilter?: "today" | "7days" | "30days";
  onTimeFilterChange?: (filter: "today" | "7days" | "30days") => void;
}

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "عام",
    items: [{ label: "الرئيسية", path: "/admin" }],
  },
  {
    title: "المتجر",
    items: [
      { label: "المنتجات", path: "/admin/products" },
      { label: "الأقسام", path: "/admin/categories" },
      { label: "المخزون", path: "/admin/inventory" },
      { label: "المشتريات", path: "/admin/purchases" },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { label: "الطلبات", path: "/admin/orders" },
      { label: "العملاء", path: "/admin/customers" },
      { label: "التقييمات", path: "/admin/reviews" },
    ],
  },
  {
    title: "التسويق",
    items: [
      { label: "الإعلانات", path: "/admin/ads" },
      { label: "العروض والكوبونات", path: "/admin/marketing" },
    ],
  },
  {
    title: "المالية",
    items: [{ label: "المالية", path: "/admin/finance" }],
  },
  {
    title: "النظام",
    items: [
      { label: "الشحن", path: "/admin/shipping" },
      { label: "الموظفين والصلاحيات", path: "/admin/staff" },
      { label: "الإعدادات", path: "/admin/settings" },
    ],
  },
];

export default function AdminLayout({
  children,
  title,
  subtitle,
  headerActions,
  timeFilter = "today",
  onTimeFilterChange,
}: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"today" | "7days" | "30days">(timeFilter);
  const [adminUsername, setAdminUsername] = useState("");
  const [dashboardName, setDashboardName] = useState(
    () => getCachedStoreBranding().dashboardName,
  );

  useEffect(() => {
    const onBrandUpdate = (event: Event) => {
      const custom = event as CustomEvent<PublicStoreBranding>;
      if (custom.detail?.dashboardName) {
        setDashboardName(custom.detail.dashboardName);
      }
    };
    window.addEventListener(STORE_BRANDING_EVENT, onBrandUpdate);
    return () => window.removeEventListener(STORE_BRANDING_EVENT, onBrandUpdate);
  }, []);

  useEffect(() => {
    let active = true;
    void getAdminSession().then((session) => {
      if (active && session) setAdminUsername(session.data.username);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleFilterClick = (filter: "today" | "7days" | "30days") => {
    setActiveFilter(filter);
    onTimeFilterChange?.(filter);
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("zan2a_admin_logged_in");
      const session = await getAdminSession();
      if (session) await logoutAdmin(session.csrfToken);
    } catch {
      // ignore
    }
    navigate("/login#admin", { replace: true });
  };

  const isCurrentPath = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1e293b] font-sans antialiased flex flex-row" dir="rtl">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-50 h-screen w-64 bg-[#0d1527] text-slate-200 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        } shadow-xl lg:shadow-none select-none`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* Brand Logo */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <Link to="/admin" className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white truncate">
                  {dashboardName}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">لوحة التحكم</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Nav Groups */}
          <nav className="p-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isCurrentPath(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? "bg-[#7a1535] text-white font-semibold shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{item.label}</span>

                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <span>العودة للمتجر</span>
          </Link>
          <button
            onClick={handleLogout}
            type="button"
            className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/30 rounded-md transition-colors"
          >
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#F8F9FA]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-neutral-200/70">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 shadow-xs"
              type="button"
              aria-label="القائمة"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                {title || "الرئيسية"}
              </h1>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {subtitle || new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(new Date())}
              </p>
            </div>
          </div>

          {/* Center / Left Controls */}
          <div className="flex items-center gap-3">
            {headerActions}

            {/* Quick Time Filter Pills */}
            {onTimeFilterChange && (
              <div className="hidden sm:flex items-center bg-white border border-neutral-200 rounded-lg p-1 shadow-xs text-xs">
              <button
                type="button"
                onClick={() => handleFilterClick("today")}
                className={`px-3 py-1 rounded-md transition-colors font-medium ${
                  activeFilter === "today"
                    ? "bg-[#1b1420] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => handleFilterClick("7days")}
                className={`px-3 py-1 rounded-md transition-colors font-medium ${
                  activeFilter === "7days"
                    ? "bg-[#1b1420] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                7 أيام
              </button>
              <button
                type="button"
                onClick={() => handleFilterClick("30days")}
                className={`px-3 py-1 rounded-md transition-colors font-medium ${
                  activeFilter === "30days"
                    ? "bg-[#1b1420] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                30 يوم
              </button>
              </div>
            )}

            {/* Admin Avatar Profile */}
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-neutral-200 rounded-lg shadow-xs">
              <div className="w-7 h-7 rounded-full bg-[#3a0a1a] text-white flex items-center justify-center font-bold text-xs">
                {adminUsername.slice(0, 1).toLocaleUpperCase() || "A"}
              </div>
              <div className="hidden md:flex flex-col text-right leading-none">
                <span className="text-xs font-bold text-neutral-800">{adminUsername || "مدير المتجر"}</span>
                <span className="text-[10px] text-neutral-500">{adminUsername ? "حساب الإدارة" : ""}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-4 md:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
