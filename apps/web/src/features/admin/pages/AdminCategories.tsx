import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import AdminLayout from "../components/AdminLayout";
import { getAdminSession } from "../api/auth";
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  type AdminCategory,
} from "../api/management";
import CategoryStatsCards from "../components/categories/CategoryStatsCards";
import CategoryToolbar, {
  type CategoryHierarchyFilter,
  type CategorySortOption,
} from "../components/categories/CategoryToolbar";
import CategoryCard, { CategoryCardSkeleton } from "../components/categories/CategoryCard";
import CategoryFormDrawer, { type CategoryFormValues } from "../components/categories/CategoryFormDrawer";
import CategoryPreviewModal from "../components/categories/CategoryPreviewModal";
import DeleteCategoryModal from "../components/categories/DeleteCategoryModal";

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Search, Filter & Sort State
  const [search, setSearch] = useState("");
  const [hierarchyFilter, setHierarchyFilter] = useState<CategoryHierarchyFilter>("all");
  const [sortBy, setSortBy] = useState<CategorySortOption>("name-asc");

  // Drawer State (Create / Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState<string | null>(null);

  // Preview & Delete Modal State
  const [previewCategory, setPreviewCategory] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const res = await fetchAdminCategories();
      setCategories(res.data);
    } catch {
      setLoadError("تعذر تحميل الأقسام من الخادم. يرجى التحقق من الاتصال والمحاولة مرة أخرى.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    let active = true;
    void getAdminSession()
      .then((session) => {
        if (active && session) setCsrfToken(session.csrfToken);
      })
      .catch(() => {
        if (active) {
          setActionError("تعذر التحقق من جلسة الإدارة. حدّثي الصفحة وسجّلي الدخول مرة أخرى.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Maps for parent lookup and children counts
  const categoryById = useMemo(() => {
    const map = new Map<string, AdminCategory>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, AdminCategory[]>();
    for (const cat of categories) {
      if (!cat.parentId) continue;
      const list = map.get(cat.parentId);
      if (list) {
        list.push(cat);
      } else {
        map.set(cat.parentId, [cat]);
      }
    }
    return map;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = categories.filter((cat) => {
      if (hierarchyFilter === "root" && cat.parentId) return false;
      if (hierarchyFilter === "sub" && !cat.parentId) return false;

      if (query) {
        const parentName = cat.parentId ? categoryById.get(cat.parentId)?.name.toLowerCase() ?? "" : "";
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesSlug = cat.slug.toLowerCase().includes(query);
        const matchesParent = parentName.includes(query);
        if (!matchesName && !matchesSlug && !matchesParent) return false;
      }

      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name-desc":
          return b.name.localeCompare(a.name, "ar");
        case "products-desc":
          return b.productCount - a.productCount || a.name.localeCompare(b.name, "ar");
        case "products-asc":
          return a.productCount - b.productCount || a.name.localeCompare(b.name, "ar");
        case "name-asc":
        default:
          return a.name.localeCompare(b.name, "ar");
      }
    });

    return sorted;
  }, [categories, search, hierarchyFilter, sortBy, categoryById]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingCategory(null);
    setFormApiError(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (cat: AdminCategory) => {
    setDrawerMode("edit");
    setEditingCategory(cat);
    setFormApiError(null);
    setDrawerOpen(true);
  };

  const handleFormSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    setFormApiError(null);
    setActionError(null);
    setNotice(null);

    try {
      if (drawerMode === "create") {
        const res = await createAdminCategory({
          name: values.name,
          slug: values.slug,
          parentId: values.parentId,
          imageUrl: values.imageUrl,
        });
        const created: AdminCategory = {
          ...res.data,
          productCount: res.data.productCount ?? 0,
        };
        setCategories((prev) => [...prev, created]);
        setNotice(`تم إنشاء قسم "${created.name}" بنجاح.`);
        setDrawerOpen(false);
      } else if (editingCategory) {
        const res = await updateAdminCategory(editingCategory.id, {
          name: values.name,
          slug: values.slug,
          parentId: values.parentId,
          imageUrl: values.imageUrl,
        });
        const updated: AdminCategory = {
          ...res.data,
          productCount: res.data.productCount ?? editingCategory.productCount,
        };
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? updated : c)),
        );
        setNotice(`تم حفظ تغييرات قسم "${updated.name}" بنجاح.`);
        setDrawerOpen(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء حفظ بيانات القسم.";
      setFormApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    setNotice(null);

    try {
      await deleteAdminCategory(deleteTarget.id);
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      setNotice(`تم حذف قسم "${deletedName}" بنجاح.`);
      // Reload from server so any cascade-deleted subcategories are accurately reflected
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر حذف القسم.";
      setActionError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="إدارة الأقسام"
      subtitle="تنظيم أقسام المتجر والأقسام الفرعية وإدارة صورها وربطها بالمنتجات"
      headerActions={
        <button
          type="button"
          onClick={openCreateDrawer}
          className="inline-flex items-center gap-1.5 bg-[#C8102E] hover:bg-[#a50d26] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <span className="text-sm leading-none">+</span>
          <span>إضافة قسم جديد</span>
        </button>
      }
    >
      {/* Breadcrumbs */}
      <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs text-neutral-500">
        <Link to="/admin" className="hover:text-[#C8102E] font-medium transition-colors">
          الرئيسية
        </Link>
        <span aria-hidden="true" className="text-neutral-300">/</span>
        <span>المتجر</span>
        <span aria-hidden="true" className="text-neutral-300">/</span>
        <span className="font-bold text-[#101B30]">إدارة الأقسام</span>
      </nav>

      {/* Feedback Alerts */}
      {notice && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="إغلاق التنبيه"
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#C8102E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="إغلاق التنبيه"
            className="text-rose-700 hover:text-rose-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Statistics Summary Row */}
      <CategoryStatsCards categories={categories} loading={loading} />

      {/* Search & Filter Toolbar */}
      <CategoryToolbar
        search={search}
        onSearchChange={setSearch}
        hierarchyFilter={hierarchyFilter}
        onHierarchyFilterChange={setHierarchyFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onRefresh={() => void loadData(true)}
        refreshing={refreshing}
        totalCount={categories.length}
        filteredCount={filteredCategories.length}
      />

      {/* Main Category Grid / States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8102E] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-bold text-[#101B30]">تعذر تحميل الأقسام</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#101B30]/5 border border-[#D6A33A]/30 text-[#101B30] flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-black text-[#101B30]">لم يتم إضافة أي أقسام بعد</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              ابدأ بإضافة أول قسم لتنظيم منتجات متجرك وتسهيل تصفح العملاء.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors"
          >
            <span>+</span>
            <span>إضافة أول قسم</span>
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center space-y-3 shadow-xs">
          <p className="text-sm font-bold text-[#101B30]">لا توجد أقسام تطابق البحث أو التصفية</p>
          <p className="text-xs text-neutral-500">جرّب تعديل كلمات البحث أو مسح الفلاتر لعرض جميع الأقسام.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setHierarchyFilter("all");
            }}
            className="inline-flex items-center px-4 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold text-[#101B30] transition-colors"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => {
            const parentName = cat.parentId ? categoryById.get(cat.parentId)?.name ?? null : null;
            const childrenCount = childrenByParentId.get(cat.id)?.length ?? 0;
            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                parentName={parentName}
                childrenCount={childrenCount}
                onPreview={setPreviewCategory}
                onEdit={openEditDrawer}
                onDelete={setDeleteTarget}
              />
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Drawer */}
      <CategoryFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        category={editingCategory}
        categories={categories}
        csrfToken={csrfToken}
        submitting={submitting}
        apiError={formApiError}
        onCsrfTokenChange={setCsrfToken}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Category Preview Modal */}
      <CategoryPreviewModal
        category={previewCategory}
        parentCategory={
          previewCategory?.parentId ? categoryById.get(previewCategory.parentId) ?? null : null
        }
        subcategories={
          previewCategory ? childrenByParentId.get(previewCategory.id) ?? [] : []
        }
        onClose={() => setPreviewCategory(null)}
        onEdit={openEditDrawer}
        onSelectCategory={setPreviewCategory}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal
        category={deleteTarget}
        childrenCount={deleteTarget ? childrenByParentId.get(deleteTarget.id)?.length ?? 0 : 0}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </AdminLayout>
  );
}
