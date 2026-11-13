import { useEffect, useState } from "react";
import { formatEGP } from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAdminProducts,
  updateAdminVariantStock,
} from "../api/management";

interface FlatInventoryItem {
  id: string; // variant id
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
  priceCents: number;
  categoryName: string;
  imageUrl?: string | null;
}

export default function AdminInventory() {
  const [items, setItems] = useState<FlatInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "low" | "out">("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<FlatInventoryItem | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminProducts();
      const flat: FlatInventoryItem[] = [];
      for (const prod of res.data) {
        if (prod.variants && prod.variants.length > 0) {
          for (const v of prod.variants) {
            flat.push({
              id: v.id,
              productId: prod.id,
              productName: prod.name,
              variantName: v.name,
              sku: v.sku || prod.slug,
              stock: v.stockQuantity,
              priceCents: v.priceCents,
              categoryName: prod.category.name,
              imageUrl: prod.imageUrl,
            });
          }
        }
      }
      setItems(flat);
    } catch {
      setError("تعذر تحميل بيانات المخزون من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalPieces = items.reduce((sum, item) => sum + item.stock, 0);
  const totalValueCents = items.reduce((sum, item) => sum + item.stock * item.priceCents, 0);
  const lowCount = items.filter((item) => item.stock > 0 && item.stock <= 5).length;
  const outCount = items.filter((item) => item.stock === 0).length;

  const categories = Array.from(new Set(items.map((i) => i.categoryName)));

  const filteredItems = items.filter((item) => {
    if (activeTab === "low" && (item.stock > 5 || item.stock === 0)) return false;
    if (activeTab === "out" && item.stock > 0) return false;
    if (search) {
      const matchName = item.productName.toLowerCase().includes(search.toLowerCase());
      const matchSku = item.sku.toLowerCase().includes(search.toLowerCase());
      if (!matchName && !matchSku) return false;
    }
    if (selectedCategory !== "all" && item.categoryName !== selectedCategory) return false;
    return true;
  });

  const handleOpenAdjust = (item: FlatInventoryItem) => {
    setAdjustItem(item);
    setNewStock(item.stock);
    setAdjustmentReason("");
    setError(null);
  };

  const handleSaveStock = async () => {
    if (!adjustItem) return;
    setSavingStock(true);
    setError(null);
    setNotice(null);
    try {
      if (adjustmentReason.trim().length < 5) {
        setError("اكتب سبب التسوية (٥ أحرف على الأقل).");
        return;
      }
      await updateAdminVariantStock(adjustItem.id, Math.max(0, Number(newStock)), adjustmentReason.trim());
      setNotice(`تم تعديل مخزون "${adjustItem.productName}" إلى ${newStock} بنجاح.`);
      setItems((prev) =>
        prev.map((i) => (i.id === adjustItem.id ? { ...i, stock: Math.max(0, Number(newStock)) } : i)),
      );
      setAdjustItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تحديث المخزون.";
      setError(msg);
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <AdminLayout title="المخزون" subtitle="متابعة الكميات وتنبيهات النواقص وتسوية المخزون">
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

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">تسوية المخزون</h3>
              <p className="text-xs text-neutral-500 mt-1">
                {adjustItem.productName} ({adjustItem.variantName})
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                الكمية الفعلية المتوفرة
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-base font-bold text-neutral-900 text-center focus:outline-hidden focus:border-[#7a1535]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="stock-adjustment-reason">
                سبب التسوية
              </label>
              <textarea
                id="stock-adjustment-reason"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                minLength={5}
                maxLength={500}
                required
                rows={3}
                className="w-full resize-y rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:border-[#7a1535]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingStock || adjustmentReason.trim().length < 5 || !Number.isInteger(newStock) || newStock < 0}
                onClick={() => void handleSaveStock()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7a1535] hover:bg-[#962046] text-white shadow-xs disabled:opacity-50"
              >
                {savingStock ? "جاري الحفظ..." : "حفظ التسوية"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">إجمالي القطع المتوفرة</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : totalPieces}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">في {items.length} متغير مسجل</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">قيمة المخزون المقدرة</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {loading ? "..." : formatEGP(totalValueCents)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">إجمالي قيمة البضاعة بسعر البيع</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium">نواقص المخزون</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {loading ? "..." : lowCount + outCount}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {lowCount} منخفض • {outCount} نفذ
          </span>
        </div>
      </div>

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
          كل المخزون ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("low")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "low"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          منخفض ({lowCount})
        </button>
        <button
          onClick={() => setActiveTab("out")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === "out"
              ? "bg-[#1b1420] text-white shadow-xs"
              : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200"
          }`}
        >
          نفذ ({outCount})
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-neutral-100">
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رمز الـ SKU"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#7a1535]"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 bg-white"
            >
              <option value="all">كل الأقسام</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            جاري فحص وتحديث المخزون...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-400">
            لا توجد عناصر تطابق البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-semibold bg-neutral-50/50">
                  <th className="py-3 px-4 font-medium">المنتج / المتغير</th>
                  <th className="py-3 px-2 font-medium">القسم</th>
                  <th className="py-3 px-2 font-medium">SKU</th>
                  <th className="py-3 px-2 font-medium text-center">المتوفر</th>
                  <th className="py-3 px-2 font-medium text-center">السعر</th>
                  <th className="py-3 px-2 font-medium text-center">إجمالي القيمة</th>
                  <th className="py-3 px-2 font-medium text-center">الحالة</th>
                  <th className="py-3 px-4 font-medium text-left">تسوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => {
                  const isOut = item.stock === 0;
                  const isLow = item.stock > 0 && item.stock <= 5;
                  const statusLabel = isOut ? "نفذ" : isLow ? "منخفض" : "متوفر";
                  const statusClass = isOut
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isLow
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-9 h-9 rounded-lg object-cover border border-neutral-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2a1020] to-[#450e26] shrink-0" />
                          )}
                          <div>
                            <span className="font-bold text-neutral-900 block">
                              {item.productName}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {item.variantName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-neutral-600 font-medium">
                        {item.categoryName}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-[11px] text-neutral-500">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-2 text-center font-bold text-neutral-900 text-sm">
                        {item.stock}
                      </td>
                      <td className="py-3.5 px-2 text-center text-neutral-700 font-medium">
                        {formatEGP(item.priceCents)}
                      </td>
                      <td className="py-3.5 px-2 text-center font-bold text-neutral-900">
                        {formatEGP(item.stock * item.priceCents)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(item)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#7a1535] bg-[#fdf2f4] hover:bg-[#fadce2] transition-colors"
                        >
                          تسوية
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>عرض {filteredItems.length} من {items.length} عنصر</div>
        </div>
      </div>
    </AdminLayout>
  );
}
