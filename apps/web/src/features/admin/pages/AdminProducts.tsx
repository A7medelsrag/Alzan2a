import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatEGP } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  updateAdminProduct,
  type AdminProduct,
  type AdminCategory,
} from "../api/management";

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStock, setSelectedStock] = useState("all");
  const [selectedSort, setSelectedSort] = useState("latest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        fetchAdminProducts(),
        fetchAdminCategories(),
      ]);
      setProducts(prodsRes.data);
      setCategories(catsRes.data);
    } catch {
      setError("تعذر تحميل المنتجات من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("سيتم أرشفة المنتج وإخفاؤه من المتجر. هل تريد المتابعة؟")) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await updateAdminProduct(id, { status: "ARCHIVED" });
      setNotice("تمت أرشفة المنتج.");
      setProducts((prev) => prev.map((p) => p.id === id ? result.data : p));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } catch {
      setError("تعذرت أرشفة المنتج.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (product: AdminProduct) => {
    const nextStatus = product.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateAdminProduct(product.id, { status: nextStatus });
      setNotice(nextStatus === "ACTIVE" ? "تم نشر المنتج." : "تم تحويل المنتج إلى مسودة.");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? res.data : p)),
      );
    } catch {
      setError("فشل تحديث حالة المنتج.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkStatus = async (status: "ACTIVE" | "DRAFT") => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      await Promise.all(
        selectedIds.map((id) => updateAdminProduct(id, { status })),
      );
      setNotice(status === "ACTIVE" ? "تم نشر المنتجات المحددة." : "تم تحويل المنتجات المحددة لمسودة.");
      await loadData();
      setSelectedIds([]);
    } catch {
      setError("حدث خطأ أثناء تنفيذ الإجراء الجماعي.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`سيتم أرشفة ${selectedIds.length} منتج. هل تريد المتابعة؟`)) return;
    setActionLoading(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => updateAdminProduct(id, { status: "ARCHIVED" })));
      setNotice("تمت أرشفة المنتجات المحددة.");
      await loadData();
      setSelectedIds([]);
    } catch {
      setError("تعذرت أرشفة بعض المنتجات المحددة.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = products
    .filter((p) => {
      if (activeTab === "published" && p.status !== "ACTIVE") return false;
      if (activeTab === "draft" && p.status !== "DRAFT") return false;
      if (activeTab === "out" && p.totalStock > 0) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSlug = p.slug.toLowerCase().includes(query);
        const matchSku = p.variants?.some((v) => v.sku.toLowerCase().includes(query));
        if (!matchName && !matchSlug && !matchSku) return false;
      }

      if (selectedCategory !== "all" && p.category.id !== selectedCategory) return false;

      if (selectedStock === "available" && p.totalStock <= 5) return false;
      if (selectedStock === "low" && (p.totalStock === 0 || p.totalStock > 5)) return false;
      if (selectedStock === "out" && p.totalStock > 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (selectedSort === "price_asc") return a.priceCents - b.priceCents;
      if (selectedSort === "price_desc") return b.priceCents - a.priceCents;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const countPublished = products.filter((p) => p.status === "ACTIVE").length;
  const countDraft = products.filter((p) => p.status === "DRAFT").length;
  const countOut = products.filter((p) => p.totalStock === 0).length;

  return (
    <AdminLayout
      title="المنتجات"
      subtitle="إدارة منتجات المتجر والمخزون"
      headerActions={
        <Link
          to="/admin/products/new"
          className="flex items-center gap-1.5 bg-[#7a1535] hover:bg-[#962046] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <span>+</span>
          <span>إضافة منتج</span>
        </Link>
      }
    >
      {notice && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setNotice(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "all"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          الكل ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("published")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "published"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          منشور ({countPublished})
        </button>
        <button
          onClick={() => setActiveTab("draft")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "draft"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          مسودة ({countDraft})
        </button>
        <button
          onClick={() => setActiveTab("out")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "out"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          نفذ المخزون ({countOut})
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
        {/* Search & Select Filters */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-neutral-100">
          <div className="lg:col-span-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الرابط أو الـ SKU"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#7a1535]"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-hidden focus:border-[#7a1535] bg-white"
            >
              <option value="all">كل الأقسام</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-hidden focus:border-[#7a1535] bg-white"
            >
              <option value="all">كل المخزون</option>
              <option value="available">متوفر (&gt; 5)</option>
              <option value="low">منخفض (1 - 5)</option>
              <option value="out">نفذ (0)</option>
            </select>
          </div>
          <div>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-hidden focus:border-[#7a1535] bg-white"
            >
              <option value="latest">الأحدث</option>
              <option value="price_asc">الأقل سعراً</option>
              <option value="price_desc">الأعلى سعراً</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-[#fbf2f4] px-4 py-2.5 flex items-center justify-between text-xs text-neutral-700 border-b border-[#f3d9e0]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#7a1535]">
                تم تحديد {selectedIds.length} منتج
              </span>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-500 font-medium">إجراءات جماعية:</span>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleBulkStatus("ACTIVE")}
                className="font-semibold text-neutral-700 hover:text-neutral-900 disabled:opacity-50"
              >
                نشر
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleBulkStatus("DRAFT")}
                className="font-semibold text-neutral-700 hover:text-neutral-900 disabled:opacity-50"
              >
                تحويل لمسودة
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleBulkDelete()}
                className="font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50"
              >
                أرشفة
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            جاري تحميل المنتجات...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            لا توجد منتجات تطابق البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-semibold bg-neutral-50/50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        selectedIds.length === filteredProducts.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300 text-[#7a1535] focus:ring-[#7a1535]"
                    />
                  </th>
                  <th className="py-3 px-2 font-medium">المنتج</th>
                  <th className="py-3 px-2 font-medium">القسم</th>
                  <th className="py-3 px-2 font-medium">السعر</th>
                  <th className="py-3 px-2 font-medium text-center">المخزون</th>
                  <th className="py-3 px-2 font-medium text-center">الحالة</th>
                  <th className="py-3 px-2 font-medium text-center">المتغيرات</th>
                  <th className="py-3 px-4 font-medium text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const firstSku = p.variants?.[0]?.sku || p.slug;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isSelected ? "bg-[#fbf4f6]" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-[#7a1535] focus:ring-[#7a1535]"
                        />
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2a1224] to-[#450e26] shrink-0 border border-neutral-200/50 flex items-center justify-center text-white text-[10px] font-bold">
                              زنقة
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-neutral-900 leading-snug">{p.name}</p>
                            <span className="text-[11px] font-mono text-neutral-400 block mt-0.5">
                              {firstSku}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-neutral-600 font-medium">
                        {p.category?.name || "بدون قسم"}
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-neutral-900">
                          {formatEGP(p.priceCents)}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {p.totalStock > 5 && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            متوفر {p.totalStock}
                          </span>
                        )}
                        {p.totalStock > 0 && p.totalStock <= 5 && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            منخفض {p.totalStock}
                          </span>
                        )}
                        {p.totalStock === 0 && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            نفذ 0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(p)}
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200"
                          }`}
                        >
                          {p.status === "ACTIVE" ? "منشور" : "مسودة"}
                        </button>
                      </td>
                      <td className="py-3.5 px-2 text-center font-bold text-neutral-800">
                        {p.variants?.length || 0}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/admin/products/new?id=${p.id}`}
                            className="text-[#7a1535] hover:text-[#962046] font-bold"
                          >
                            تعديل
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(p.id)}
                            className="text-rose-500 hover:text-rose-700 font-medium"
                          >
                            أرشفة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>عرض {filteredProducts.length} من {products.length} منتج</div>
        </div>
      </div>
    </AdminLayout>
  );
}
