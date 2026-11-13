import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAdminCategories,
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  type AdminCategory,
} from "../api/management";

export default function AdminProductCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form Fields
  const [productNameAr, setProductNameAr] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [salePrice, setSalePrice] = useState<number>(500);
  const [costPrice, setCostPrice] = useState<number>(300);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");
  const [stockQty, setStockQty] = useState<number>(25);
  const [sku, setSku] = useState<string>("");

  const [colors, setColors] = useState(["عنابي", "كحلي", "شمبانيا"]);
  const [sizes, setSizes] = useState(["S", "M", "L", "XL"]);
  const [tags, setTags] = useState(["جديد", "مميز"]);
  const [tagInput, setTagInput] = useState("");

  const profitPerItem = salePrice - costPrice;
  const profitMargin = salePrice > 0 ? Math.round((profitPerItem / salePrice) * 100) : 0;
  const discountRate = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      try {
        const catRes = await fetchAdminCategories();
        if (!active) return;
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !categoryId) {
          setCategoryId(catRes.data[0].id);
        }

        if (editId) {
          const prodsRes = await fetchAdminProducts();
          if (!active) return;
          const found = prodsRes.data.find((p) => p.id === editId);
          if (found) {
            setProductNameAr(found.name);
            setProductSlug(found.slug);
            setShortDesc(found.description);
            setCategoryId(found.category.id);
            setImageUrl(found.imageUrl || "");
            setStatus(found.status === "ACTIVE" ? "ACTIVE" : "DRAFT");
            setSalePrice(Math.round(found.priceCents / 100));
            setStockQty(found.totalStock);
            if (found.variants && found.variants.length > 0) {
              setSku(found.variants[0].sku);
            }
          }
        }
      } catch {
        setError("تعذر تحميل بيانات الأقسام أو المنتج.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [editId]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (submitStatus: "ACTIVE" | "DRAFT") => {
    if (!productNameAr.trim()) {
      setError("يرجى إدخال اسم المنتج باللغة العربية.");
      return;
    }
    if (!categoryId) {
      setError("يرجى اختيار القسم.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const priceCents = Math.round(Number(salePrice) * 100);
    const description = (shortDesc.trim() || productNameAr.trim()) + (longDesc.trim() ? `\n\n${longDesc.trim()}` : "");

    // Prepare slug
    let cleanSlug = productSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!cleanSlug) {
      cleanSlug = undefined as unknown as string;
    }

    try {
      if (editId) {
        await updateAdminProduct(editId, {
          name: productNameAr.trim(),
          description,
          categoryId,
          imageUrl: imageUrl.trim() || null,
          status: submitStatus,
        });
        setNotice("تم تحديث المنتج بنجاح!");
      } else {
        await createAdminProduct({
          name: productNameAr.trim(),
          slug: cleanSlug,
          description,
          categoryId,
          imageUrl: imageUrl.trim() || null,
          status: submitStatus,
          variants: [
            {
              name: "الأساسي",
              priceCents,
              stockQuantity: Number(stockQty) || 0,
              sku: sku.trim() || undefined,
            },
          ],
        });
        setNotice("تمت إضافة المنتج بنجاح!");
      }

      setTimeout(() => {
        navigate("/admin/products");
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل حفظ المنتج.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title={editId ? "تعديل المنتج" : "إضافة منتج"}
      subtitle={editId ? "تعديل بيانات المنتج والمخزون والتسعير" : "إضافة منتج جديد وتفاصيل المخزون والتسعير"}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit("DRAFT")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs disabled:opacity-50"
          >
            حفظ كمسودة
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit("ACTIVE")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7a1535] hover:bg-[#962046] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {submitting ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "نشر المنتج"}
          </button>
        </div>
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
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-neutral-400">
          جاري تحميل البيانات...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (2 Cols on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Basic Information */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                المعلومات الأساسية
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    اسم المنتج (عربي) *
                  </label>
                  <input
                    type="text"
                    value={productNameAr}
                    onChange={(e) => setProductNameAr(e.target.value)}
                    placeholder="مثال: فستان سهرة ساتان طويل"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    الرابط المخصص / الاسم الإنجليزي (slug)
                  </label>
                  <input
                    type="text"
                    value={productSlug}
                    onChange={(e) => setProductSlug(e.target.value)}
                    placeholder="مثال: satin-evening-dress"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535] text-left font-mono"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    حروف إنجليزية وأرقام وشرطات فقط. إذا ترك فارغاً سيتم توليده تلقائياً.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    وصف مختصر *
                  </label>
                  <textarea
                    rows={2}
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    placeholder="وصف سريع يظهر في بطاقة المنتج"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    الوصف التفصيلي
                  </label>
                  <textarea
                    rows={4}
                    value={longDesc}
                    onChange={(e) => setLongDesc(e.target.value)}
                    placeholder="اكتبي الوصف الكامل والمواصفات والخامة وتفاصيل العناية"
                    className="w-full p-3.5 text-xs text-neutral-900 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-[#7a1535]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Media Upload / Image URL */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                صورة المنتج
              </h2>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  رابط صورة المنتج الرئيسية
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535] text-left font-mono"
                />
              </div>
              {imageUrl && (
                <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl">
                  <img
                    src={imageUrl}
                    alt="معاينة"
                    className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">معاينة الصورة</span>
                    <span className="text-[11px] text-neutral-400">ستظهر هذه الصورة في واجهة المتجر</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pricing */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                التسعير والمخزون
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    سعر البيع (ج.م) *
                  </label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    السعر قبل الخصم (ج.م)
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    سعر التكلفة (ج.م)
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    الكمية المتوفرة بالمخزون *
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    رمز المخزن (SKU)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="مثال: ZN-DR-0231"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono text-neutral-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  هامش الربح: {profitMargin}%
                </span>
                {discountRate > 0 && (
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    نسبة الخصم: {discountRate}%
                  </span>
                )}
                <span className="text-xs font-bold text-neutral-700">
                  الربح للقطعة: {profitPerItem} ج.م
                </span>
              </div>
            </div>

            {/* 4. Variants Preview */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                الألوان والمقاسات (الخيارات)
              </h2>
              <div>
                <span className="block text-xs font-semibold text-neutral-700 mb-2">الألوان</span>
                <div className="flex flex-wrap items-center gap-2">
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200"
                    >
                      <span>{color}</span>
                      <button
                        type="button"
                        onClick={() => setColors(colors.filter((c) => c !== color))}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-neutral-700 mb-2">المقاسات</span>
                <div className="flex flex-wrap items-center gap-2">
                  {sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200"
                    >
                      <span>{size}</span>
                      <button
                        type="button"
                        onClick={() => setSizes(sizes.filter((s) => s !== size))}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panels (1 Col on large screens) */}
          <div className="space-y-6">
            {/* Side Card 1: Status & Publish */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                الحالة والنشر
              </h2>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">الحالة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "DRAFT")}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white"
                >
                  <option value="ACTIVE">منشور</option>
                  <option value="DRAFT">مسودة</option>
                </select>
              </div>
            </div>

            {/* Side Card 2: Organization */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                القسم والتصنيف
              </h2>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">القسم *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">الوسوم</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f9edf1] text-[#7a1535]"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#7a1535] hover:text-rose-900 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="أضيفي وسم ثم اضغطي Enter"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900"
                />
              </div>
            </div>

            {/* Submit Action Box */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit("ACTIVE")}
                className="w-full py-3 rounded-xl text-xs font-bold bg-[#7a1535] hover:bg-[#962046] text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "نشر المنتج الآن"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit("DRAFT")}
                className="w-full py-2.5 rounded-xl text-xs font-bold border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                حفظ كمسودة
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
