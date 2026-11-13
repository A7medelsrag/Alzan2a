import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAdminReviews,
  updateAdminReviewStatus,
  type AdminReview,
} from "../api/management";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminReviews();
      setReviews(res.data);
    } catch {
      setError("تعذر تحميل التقييمات من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await updateAdminReviewStatus(id, newStatus);
      setNotice(
        newStatus === "APPROVED"
          ? "تمت الموافقة على نشر التقييم."
          : newStatus === "REJECTED"
          ? "تم رفض التقييم."
          : "تمت إعادة التقييم إلى قيد المراجعة.",
      );
      setReviews((prev) => prev.map((r) => (r.id === id ? res.data : r)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تحديث حالة التقييم.";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;
  const approvedCount = reviews.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = reviews.filter((r) => r.status === "REJECTED").length;
  const fiveStarsCount = reviews.filter((r) => r.rating === 5).length;
  const fiveStarsPct = reviews.length > 0 ? Math.round((fiveStarsCount / reviews.length) * 100) : 100;
  const lowRatingsCount = reviews.filter((r) => r.rating <= 2).length;

  const filtered = reviews.filter((r) => {
    if (activeTab === "ALL") return true;
    return r.status === activeTab;
  });

  return (
    <AdminLayout title="التقييمات" subtitle="مراجعة تقييمات العملاء والموافقة على نشرها في المتجر">
      {notice && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">متوسط التقييم العام</span>
          <div className="my-2 flex items-center gap-2">
            <span className="text-2xl text-amber-500 font-bold">★</span>
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : avgRating}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">من {reviews.length} تقييم مسجل</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">بانتظار المراجعة</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {loading ? "..." : pendingCount}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">تحتاج موافقة للنشر</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">نسبة 5 نجوم</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : `${fiveStarsPct}%`}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">معدل رضا إيجابي</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">تقييمات منخفضة (1-2)</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {loading ? "..." : lowRatingsCount}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">تستدعي المتابعة</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "PENDING"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          بانتظار المراجعة ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "APPROVED"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          منشورة ({approvedCount})
        </button>
        <button
          onClick={() => setActiveTab("REJECTED")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "REJECTED"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          مرفوضة ({rejectedCount})
        </button>
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "ALL"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          الكل ({reviews.length})
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-neutral-400">
          جاري تحميل التقييمات...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-neutral-100 text-center text-xs text-neutral-400">
          لا توجد تقييمات في هذه الفئة.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rev) => {
            const dateStr = new Date(rev.createdAt).toLocaleDateString("ar-EG", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={rev.id}
                className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-3">
                    {rev.productImage ? (
                      <img
                        src={rev.productImage}
                        alt={rev.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2a1020] to-[#4c0d28] shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900">{rev.productName}</h4>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {dateStr}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`w-fit px-3 py-0.5 rounded-full text-xs font-semibold ${
                      rev.status === "PENDING"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : rev.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {rev.status === "PENDING"
                      ? "بانتظار المراجعة"
                      : rev.status === "APPROVED"
                      ? "منشور"
                      : "مرفوض"}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-neutral-800">
                      {rev.customerName}
                    </span>
                    <span className="text-amber-400 text-xs tracking-widest">
                      {"★".repeat(rev.rating)}
                      <span className="text-neutral-200">
                        {"★".repeat(Math.max(0, 5 - rev.rating))}
                      </span>
                    </span>
                    {rev.isVerifiedPurchase && (
                      <span className="text-[10px] font-semibold text-[#7a1535] bg-[#fbf2f4] px-2 py-0.5 rounded-md">
                        مشترية موثقة
                      </span>
                    )}
                  </div>
                  {rev.comment ? (
                    <p className="text-xs text-neutral-700 leading-relaxed mt-2">
                      {rev.comment}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic mt-1">
                      بدون تعليق نصي (تقييم بالنجوم فقط).
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  {rev.status !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleUpdateStatus(rev.id, "APPROVED")}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1b1420] text-white hover:bg-neutral-800 shadow-xs disabled:opacity-50"
                    >
                      موافقة ونشر
                    </button>
                  )}
                  {rev.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleUpdateStatus(rev.id, "REJECTED")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      رفض
                    </button>
                  )}
                  {rev.status !== "PENDING" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleUpdateStatus(rev.id, "PENDING")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      إعادة للمراجعة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
