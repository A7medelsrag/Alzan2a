import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  type AdminCategory,
} from "../api/management";

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<AdminCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminCategories();
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCat) {
        setSelectedCat(res.data[0]);
        setEditName(res.data[0].name);
        setEditSlug(res.data[0].slug);
        setEditImageUrl(res.data[0].imageUrl || "");
      }
    } catch {
      setError("تعذر تحميل الأقسام من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSelect = (cat: AdminCategory) => {
    setSelectedCat(cat);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditImageUrl(cat.imageUrl || "");
    setError(null);
    setNotice(null);
  };

  const handleUpdate = async () => {
    if (!selectedCat) return;
    if (!editName.trim()) {
      setError("يرجى إدخال اسم القسم.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const cleanSlug = editSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    try {
      const res = await updateAdminCategory(selectedCat.id, {
        name: editName.trim(),
        slug: cleanSlug || undefined,
        imageUrl: editImageUrl.trim() || null,
      });
      setNotice("تم حفظ تغييرات القسم بنجاح.");
      setCategories((prev) =>
        prev.map((c) => (c.id === selectedCat.id ? res.data : c)),
      );
      setSelectedCat(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تحديث القسم.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCat) return;
    if (selectedCat.productCount > 0) {
      setError(`لا يمكن حذف هذا القسم لأنه يحتوي على ${selectedCat.productCount} منتج. يرجى نقل أو حذف المنتجات أولاً.`);
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف قسم "${selectedCat.name}"؟`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteAdminCategory(selectedCat.id);
      setNotice(`تم حذف قسم "${selectedCat.name}" بنجاح.`);
      const remaining = categories.filter((c) => c.id !== selectedCat.id);
      setCategories(remaining);
      if (remaining.length > 0) {
        handleSelect(remaining[0]);
      } else {
        setSelectedCat(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل حذف القسم.";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("يرجى كتابة اسم القسم الجديد.");
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);

    const cleanSlug = newSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    try {
      const res = await createAdminCategory({
        name: newName.trim(),
        slug: cleanSlug || undefined,
        imageUrl: newImageUrl.trim() || null,
      });
      setNotice(`تم إنشاء قسم "${res.data.name}" بنجاح.`);
      setCategories((prev) => [...prev, res.data]);
      handleSelect(res.data);
      setShowCreateModal(false);
      setNewName("");
      setNewSlug("");
      setNewImageUrl("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إضافة القسم.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.slug.includes(search)) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout
      title="الأقسام"
      subtitle="تنظيم أقسام وتصنيفات المتجر وترتيبها"
      headerActions={
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setError(null);
          }}
          className="flex items-center gap-1.5 bg-[#7a1535] hover:bg-[#962046] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <span>+</span>
          <span>إضافة قسم جديد</span>
        </button>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">إضافة قسم جديد</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  اسم القسم (عربي) *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: فساتين سهرة"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  الرابط (slug إنجليزي)
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="مثال: evening-dresses"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 text-left font-mono focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  رابط صورة القسم (اختياري)
                </label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 text-left font-mono focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreate()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7a1535] hover:bg-[#962046] text-white shadow-xs disabled:opacity-50"
              >
                {creating ? "جاري الإنشاء..." : "إنشاء القسم"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Categories List (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">أقسام المتجر</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                إجمالي {categories.length} أقسام مسجلة في قاعدة البيانات.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في الأقسام..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#7a1535]"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              جاري تحميل الأقسام...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              لا توجد أقسام تطابق البحث.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCat?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelect(cat)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#7a1535] ring-2 ring-[#7a1535]/10 shadow-xs bg-[#fbf5f7]"
                        : "border-neutral-200/70 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a1020] to-[#4c0d28] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                          {cat.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-xs text-neutral-900 block">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          /{cat.slug} • {cat.productCount} منتج
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#7a1535] hover:underline">
                        تعديل
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Category Side Panel (1 Col on lg) */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">تفاصيل وتعديل القسم</h3>
            {selectedCat && (
              <span className="text-xs font-mono text-neutral-400">
                {selectedCat.productCount} منتج
              </span>
            )}
          </div>

          {!selectedCat ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              اختر قسماً من القائمة لعرض تفاصيله أو تعديله.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  اسم القسم (عربي) *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  الرابط المخصص (slug)
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 text-left font-mono focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  رابط صورة القسم
                </label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 text-left font-mono focus:outline-hidden focus:border-[#7a1535]"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleUpdate()}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#1b1420] text-white hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "جاري الحذف..." : "حذف القسم"}
                </button>
                <p className="text-[10px] text-neutral-400 text-center">
                  لا يمكن حذف قسم به منتجات، انقلي المنتجات أولاً.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
