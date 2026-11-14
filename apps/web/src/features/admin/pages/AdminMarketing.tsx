import { Link } from "react-router";
import AdminLayout from "../components/AdminLayout";

const marketingTools = [
  { to: "/admin/offers", title: "العروض والباقات", description: "إنشاء العروض على المنتجات والباقات وإدارة حالتها." },
  { to: "/admin/coupons", title: "الكوبونات", description: "إنشاء أكواد الخصم ومتابعة الاستخدام والحالة." },
];

export default function AdminMarketing() {
  return (
    <AdminLayout title="التسويق" subtitle="إدارة أدوات الترويج المتصلة ببيانات المتجر">
      <div className="grid gap-4 md:grid-cols-2">
        {marketingTools.map((tool) => (
          <Link className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-[#7a1535]" key={tool.to} to={tool.to}>
            <h2 className="mb-2 text-lg font-bold text-neutral-900">{tool.title}</h2>
            <p className="text-sm leading-6 text-neutral-600">{tool.description}</p>
            <span className="mt-4 inline-block text-sm font-bold text-[#7a1535]">فتح الإدارة ←</span>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
