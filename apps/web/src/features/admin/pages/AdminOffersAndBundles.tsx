import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  formatEGP,
  type BundlePublic,
  type ProductOfferPublic,
  type StoreProduct,
} from "@store/shared";
import AdminLayout from "../components/AdminLayout";
import AdminImageField from "../components/AdminImageField";
import { getAdminSession } from "../api/auth";
import {
  createAdminOffer,
  deleteAdminOffer,
  listAdminOffers,
  updateAdminOffer,
} from "../api/offers";
import {
  createAdminBundle,
  deleteAdminBundle,
  listAdminBundles,
  updateAdminBundle,
} from "../api/bundles";
import { listCatalogProducts } from "../../catalog/api/catalog";
import { resolvePublicImageUrl } from "../../../utils/media";
import PageHeader from "../components/promotions/PageHeader";
import StatisticsCard from "../components/promotions/StatisticsCard";
import SearchFilterToolbar from "../components/promotions/SearchFilterToolbar";
import OfferCard from "../components/promotions/OfferCard";
import BundleCard from "../components/promotions/BundleCard";
import EmptyState from "../components/promotions/EmptyState";
import LoadingSkeleton from "../components/promotions/LoadingSkeleton";
import ConfirmationDialog from "../components/promotions/ConfirmationDialog";
import DrawerModal from "../components/promotions/DrawerModal";
import StatusBadge from "../components/promotions/StatusBadge";
import {
  formatArabicDate,
  fromDatetimeLocalValue,
  getPromotionStatus,
  toDatetimeLocalValue,
} from "../components/promotions/lifecycle";

type TabMode = "offers" | "bundles";

const statusFilterOptions = [
  { value: "ALL", label: "كل الحالات" },
  { value: "active", label: "نشط" },
  { value: "scheduled", label: "مجدول" },
  { value: "expired", label: "منتهي" },
  { value: "inactive", label: "معطّل" },
];

const offerTypeOptions = [
  { value: "ALL", label: "كل أنواع العروض" },
  { value: "PERCENTAGE", label: "نسبة مئوية (%)" },
  { value: "FIXED_AMOUNT", label: "مبلغ ثابت (ج.م)" },
  { value: "FREE_SHIPPING", label: "شحن مجاني" },
];

const bundleTypeOptions = [
  { value: "ALL", label: "كل أنواع التسعير" },
  { value: "FIXED", label: "سعر ثابت للباقة" },
  { value: "DISCOUNT", label: "خصم على الإجمالي" },
  { value: "FREE_SHIPPING", label: "شحن مجاني" },
];

const sortOptions = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "name_asc", label: "الاسم (أ - ي)" },
  { value: "value_desc", label: "الأعلى قيمة" },
];

export default function AdminOffersAndBundles() {
  const [tab, setTab] = useState<TabMode>("offers");
  const [offers, setOffers] = useState<ProductOfferPublic[]>([]);
  const [bundles, setBundles] = useState<BundlePublic[]>([]);
  const [availableProducts, setAvailableProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  // Preview Modals
  const [previewOffer, setPreviewOffer] = useState<ProductOfferPublic | null>(null);
  const [previewBundle, setPreviewBundle] = useState<BundlePublic | null>(null);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "offer"; item: ProductOfferPublic } | { kind: "bundle"; item: BundlePublic } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Offer Add/Edit Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerDiscountType, setOfferDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [offerDiscountValue, setOfferDiscountValue] = useState("15");
  const [offerMaxDiscountEgp, setOfferMaxDiscountEgp] = useState("");
  const [offerFreeShipping, setOfferFreeShipping] = useState(false);
  const [offerStartsAt, setOfferStartsAt] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");
  const [offerIsActive, setOfferIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerFormError, setOfferFormError] = useState("");

  // Bundle Add/Edit Modal State
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleInternalName, setBundleInternalName] = useState("");
  const [bundlePublicTitle, setBundlePublicTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundleImageUrl, setBundleImageUrl] = useState("");
  const [bundlePricingType, setBundlePricingType] = useState<"FIXED" | "DISCOUNT">("FIXED");
  const [bundlePriceEgp, setBundlePriceEgp] = useState("350");
  const [bundleDiscountEgp, setBundleDiscountEgp] = useState("50");
  const [bundleFreeShipping, setBundleFreeShipping] = useState(false);
  const [bundleStartsAt, setBundleStartsAt] = useState("");
  const [bundleEndsAt, setBundleEndsAt] = useState("");
  const [bundleDisplayOrder, setBundleDisplayOrder] = useState("0");
  const [bundleIsActive, setBundleIsActive] = useState(true);
  const [bundleItems, setBundleItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [bundleSubmitting, setBundleSubmitting] = useState(false);
  const [bundleFormError, setBundleFormError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession()
      .then((session) => {
        if (active && session) setCsrfToken(session.csrfToken);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const [offersRes, bundlesRes, productsRes] = await Promise.all([
        listAdminOffers(),
        listAdminBundles(),
        listCatalogProducts({ pageSize: 100 }),
      ]);
      setOffers(offersRes.data);
      setBundles(bundlesRes.data);
      setAvailableProducts(productsRes.data);
    } catch {
      setError("تعذر تحميل بيانات العروض والباقات. يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  }

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of availableProducts) {
      map.set(p.id, p.name);
    }
    return map;
  }, [availableProducts]);

  // Statistics
  const offerStats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let freeShipping = 0;
    for (const o of offers) {
      const st = getPromotionStatus(o);
      if (st === "active") active++;
      if (st === "expired") expired++;
      if (o.isFreeShipping) freeShipping++;
    }
    return { total: offers.length, active, expired, freeShipping };
  }, [offers]);

  const bundleStats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let inStock = 0;
    for (const b of bundles) {
      const st = getPromotionStatus(b);
      if (st === "active") active++;
      if (st === "expired") expired++;
      if ((b.availableStock ?? 0) > 0) inStock++;
    }
    return { total: bundles.length, active, expired, inStock };
  }, [bundles]);

  // Filtered & Sorted Offers
  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = offers.filter((o) => {
      if (
        q &&
        !o.name.toLowerCase().includes(q) &&
        !(o.description || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== "ALL" && getPromotionStatus(o) !== statusFilter) {
        return false;
      }
      if (typeFilter === "PERCENTAGE" && o.discountType !== "PERCENTAGE") return false;
      if (typeFilter === "FIXED_AMOUNT" && o.discountType !== "FIXED_AMOUNT") return false;
      if (typeFilter === "FREE_SHIPPING" && !o.isFreeShipping) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "ar");
      }
      if (sortBy === "value_desc") {
        return b.discountValue - a.discountValue;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [offers, search, statusFilter, typeFilter, sortBy]);

  // Filtered & Sorted Bundles
  const filteredBundles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = bundles.filter((b) => {
      if (
        q &&
        !b.publicTitle.toLowerCase().includes(q) &&
        !b.internalName.toLowerCase().includes(q) &&
        !(b.description || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== "ALL" && getPromotionStatus(b) !== statusFilter) {
        return false;
      }
      if (
        typeFilter === "FIXED" &&
        (b.fixedPriceCents === null || b.fixedPriceCents === undefined)
      ) {
        return false;
      }
      if (typeFilter === "DISCOUNT" && !b.discountCents) return false;
      if (typeFilter === "FREE_SHIPPING" && !b.isFreeShipping) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name_asc") {
        return a.publicTitle.localeCompare(b.publicTitle, "ar");
      }
      if (sortBy === "value_desc") {
        return (b.finalPriceCents ?? b.fixedPriceCents ?? 0) - (a.finalPriceCents ?? a.fixedPriceCents ?? 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [bundles, search, statusFilter, typeFilter, sortBy]);

  // ================= Offer Handlers =================
  function openCreateOfferModal() {
    resetOfferForm();
    setEditingOfferId(null);
    setIsOfferModalOpen(true);
  }

  function openEditOfferModal(offer: ProductOfferPublic) {
    setEditingOfferId(offer.id);
    setOfferName(offer.name);
    setOfferDescription(offer.description || "");
    setOfferDiscountType(offer.discountType);
    setOfferDiscountValue(
      offer.discountType === "PERCENTAGE"
        ? String(offer.discountValue)
        : String(offer.discountValue / 100),
    );
    setOfferMaxDiscountEgp(
      offer.maxDiscountCents ? String(offer.maxDiscountCents / 100) : "",
    );
    setOfferFreeShipping(offer.isFreeShipping);
    setOfferStartsAt(toDatetimeLocalValue(offer.startsAt));
    setOfferEndsAt(toDatetimeLocalValue(offer.endsAt));
    setOfferIsActive(offer.isActive);
    setSelectedProductIds(offer.productIds);
    setProductSearch("");
    setOfferFormError("");
    setIsOfferModalOpen(true);
  }

  function resetOfferForm() {
    setEditingOfferId(null);
    setOfferName("");
    setOfferDescription("");
    setOfferDiscountType("PERCENTAGE");
    setOfferDiscountValue("15");
    setOfferMaxDiscountEgp("");
    setOfferFreeShipping(false);
    setOfferStartsAt("");
    setOfferEndsAt("");
    setOfferIsActive(true);
    setSelectedProductIds([]);
    setProductSearch("");
    setOfferFormError("");
  }

  async function handleToggleOfferStatus(offer: ProductOfferPublic) {
    if (!csrfToken) return;
    setTogglingId(offer.id);
    setError("");
    try {
      const updated = await updateAdminOffer(
        offer.id,
        { isActive: !offer.isActive },
        csrfToken,
      );
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated.data : o)));
      showNotice(`تم ${!offer.isActive ? "تفعيل" : "تعطيل"} العرض بنجاح.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة العرض.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSubmitOffer(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;

    if (offerName.trim().length < 2) {
      setOfferFormError("اسم العرض يجب أن يكون حرفين على الأقل.");
      return;
    }

    const numericDiscount = parseFloat(offerDiscountValue);
    if (Number.isNaN(numericDiscount) || numericDiscount <= 0) {
      setOfferFormError("يرجى إدخال قيمة خصم صحيحة أكبر من صفر.");
      return;
    }

    if (offerDiscountType === "PERCENTAGE" && numericDiscount > 100) {
      setOfferFormError("النسبة المئوية للخصم لا يمكن أن تتجاوز 100%.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setOfferFormError("يجب اختيار منتج واحد على الأقل للعرض.");
      return;
    }

    const startsAtIso = fromDatetimeLocalValue(offerStartsAt);
    const endsAtIso = fromDatetimeLocalValue(offerEndsAt);
    if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      setOfferFormError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.");
      return;
    }

    setOfferSubmitting(true);
    setOfferFormError("");

    try {
      const maxDiscountCents =
        offerDiscountType === "PERCENTAGE" && offerMaxDiscountEgp.trim()
          ? Math.round(parseFloat(offerMaxDiscountEgp) * 100)
          : null;

      const payload = {
        name: offerName.trim(),
        description: offerDescription.trim() || null,
        discountType: offerDiscountType,
        discountValue:
          offerDiscountType === "PERCENTAGE"
            ? Math.round(numericDiscount)
            : Math.round(numericDiscount * 100),
        maxDiscountCents,
        isFreeShipping: offerFreeShipping,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        isActive: offerIsActive,
        productIds: selectedProductIds,
      };

      if (editingOfferId) {
        const updated = await updateAdminOffer(editingOfferId, payload, csrfToken);
        setOffers((prev) => prev.map((o) => (o.id === editingOfferId ? updated.data : o)));
        showNotice("تم تحديث العرض بنجاح.");
      } else {
        const created = await createAdminOffer(payload, csrfToken);
        setOffers((prev) => [created.data, ...prev]);
        showNotice("تم إنشاء العرض بنجاح.");
      }

      setIsOfferModalOpen(false);
      resetOfferForm();
    } catch (err) {
      setOfferFormError(err instanceof Error ? err.message : "تعذر حفظ العرض.");
    } finally {
      setOfferSubmitting(false);
    }
  }

  // ================= Bundle Handlers =================
  function openCreateBundleModal() {
    resetBundleForm();
    setEditingBundleId(null);
    setIsBundleModalOpen(true);
  }

  function openEditBundleModal(bundle: BundlePublic) {
    setEditingBundleId(bundle.id);
    setBundleInternalName(bundle.internalName);
    setBundlePublicTitle(bundle.publicTitle);
    setBundleDescription(bundle.description || "");
    setBundleImageUrl(bundle.imageUrl || "");
    if (bundle.fixedPriceCents !== null && bundle.fixedPriceCents !== undefined) {
      setBundlePricingType("FIXED");
      setBundlePriceEgp(String(bundle.fixedPriceCents / 100));
      setBundleDiscountEgp("50");
    } else {
      setBundlePricingType("DISCOUNT");
      setBundleDiscountEgp(bundle.discountCents ? String(bundle.discountCents / 100) : "50");
      setBundlePriceEgp("350");
    }
    setBundleFreeShipping(bundle.isFreeShipping);
    setBundleStartsAt(toDatetimeLocalValue(bundle.startsAt));
    setBundleEndsAt(toDatetimeLocalValue(bundle.endsAt));
    setBundleDisplayOrder(String(bundle.displayOrder));
    setBundleIsActive(bundle.isActive);
    setBundleItems(
      bundle.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );
    setBundleFormError("");
    setIsBundleModalOpen(true);
  }

  function resetBundleForm() {
    setEditingBundleId(null);
    setBundleInternalName("");
    setBundlePublicTitle("");
    setBundleDescription("");
    setBundleImageUrl("");
    setBundlePricingType("FIXED");
    setBundlePriceEgp("350");
    setBundleDiscountEgp("50");
    setBundleFreeShipping(false);
    setBundleStartsAt("");
    setBundleEndsAt("");
    setBundleDisplayOrder("0");
    setBundleIsActive(true);
    setBundleItems([]);
    setBundleFormError("");
  }

  async function handleToggleBundleStatus(bundle: BundlePublic) {
    if (!csrfToken) return;
    setTogglingId(bundle.id);
    setError("");
    try {
      const updated = await updateAdminBundle(
        bundle.id,
        { isActive: !bundle.isActive },
        csrfToken,
      );
      setBundles((prev) => prev.map((b) => (b.id === bundle.id ? updated.data : b)));
      showNotice(`تم ${!bundle.isActive ? "تفعيل" : "تعطيل"} الباقة بنجاح.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة الباقة.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSubmitBundle(e: FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;

    if (bundlePublicTitle.trim().length < 2 || bundleInternalName.trim().length < 2) {
      setBundleFormError("يجب إدخال عنوان الباقة والاسم الداخلي (حرفين على الأقل).");
      return;
    }

    if (bundleItems.length === 0) {
      setBundleFormError("يجب إضافة منتج واحد على الأقل للباقة.");
      return;
    }

    const startsAtIso = fromDatetimeLocalValue(bundleStartsAt);
    const endsAtIso = fromDatetimeLocalValue(bundleEndsAt);
    if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      setBundleFormError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.");
      return;
    }

    const fixedPriceCents =
      bundlePricingType === "FIXED"
        ? Math.round(parseFloat(bundlePriceEgp) * 100)
        : null;
    const discountCents =
      bundlePricingType === "DISCOUNT"
        ? Math.round(parseFloat(bundleDiscountEgp) * 100)
        : null;

    if (bundlePricingType === "FIXED" && (!fixedPriceCents || fixedPriceCents <= 0)) {
      setBundleFormError("يرجى إدخال سعر ثابت صحيح أكبر من صفر.");
      return;
    }
    if (bundlePricingType === "DISCOUNT" && (!discountCents || discountCents <= 0)) {
      setBundleFormError("يرجى إدخال قيمة خصم صحيحة أكبر من صفر.");
      return;
    }

    setBundleSubmitting(true);
    setBundleFormError("");

    try {
      const payload = {
        internalName: bundleInternalName.trim(),
        publicTitle: bundlePublicTitle.trim(),
        description: bundleDescription.trim() || null,
        imageUrl: bundleImageUrl.trim() || null,
        fixedPriceCents,
        discountCents,
        isFreeShipping: bundleFreeShipping,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        isActive: bundleIsActive,
        displayOrder: parseInt(bundleDisplayOrder, 10) || 0,
        items: bundleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      if (editingBundleId) {
        const updated = await updateAdminBundle(editingBundleId, payload, csrfToken);
        setBundles((prev) => prev.map((b) => (b.id === editingBundleId ? updated.data : b)));
        showNotice("تم تحديث الباقة بنجاح.");
      } else {
        const created = await createAdminBundle(payload, csrfToken);
        setBundles((prev) => [created.data, ...prev]);
        showNotice("تم إنشاء الباقة بنجاح.");
      }

      setIsBundleModalOpen(false);
      resetBundleForm();
    } catch (err) {
      setBundleFormError(err instanceof Error ? err.message : "تعذر حفظ الباقة.");
    } finally {
      setBundleSubmitting(false);
    }
  }

  function addBundleItem(productId: string) {
    if (!productId) return;
    if (bundleItems.some((i) => i.productId === productId)) return;
    setBundleItems((prev) => [...prev, { productId, quantity: 1 }]);
  }

  function removeBundleItem(productId: string) {
    setBundleItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateBundleItemQuantity(productId: string, quantity: number) {
    setBundleItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(10, Math.max(1, quantity)) } : i,
      ),
    );
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !csrfToken) return;
    setDeleting(true);
    setError("");
    try {
      if (deleteTarget.kind === "offer") {
        await deleteAdminOffer(deleteTarget.item.id, csrfToken);
        setOffers((prev) => prev.filter((o) => o.id !== deleteTarget.item.id));
        showNotice("تم حذف العرض بنجاح.");
      } else {
        await deleteAdminBundle(deleteTarget.item.id, csrfToken);
        setBundles((prev) => prev.filter((b) => b.id !== deleteTarget.item.id));
        showNotice("تم حذف الباقة بنجاح.");
      }
      setDeleteTarget(null);
    } catch {
      setError(
        deleteTarget.kind === "offer" ? "تعذر حذف العرض." : "تعذر حذف الباقة.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredModalProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return availableProducts;
    return availableProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [availableProducts, productSearch]);

  return (
    <AdminLayout
      title="إدارة العروض والباقات"
      subtitle="تحكم في عروض وتخفيضات المنتجات وتجميعات الباقات المتكاملة"
    >
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", to: "/admin" },
          { label: "التسويق", to: "/admin/marketing" },
          { label: "إدارة العروض والباقات" },
        ]}
        title="إدارة العروض والباقات"
        description="أنشئ عروض الخصم على المنتجات المنفردة أو كوّن باقات متكاملة بأسعار خاصة مع تتبع الصلاحية والمخزون."
        primaryAction={
          <button
            type="button"
            onClick={openCreateOfferModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>+</span>
            <span>إضافة عرض جديد</span>
          </button>
        }
        secondaryAction={
          <button
            type="button"
            onClick={openCreateBundleModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#101B30]/20 bg-white hover:bg-neutral-50 text-[#101B30] text-xs font-bold shadow-xs transition-colors"
          >
            <span>+</span>
            <span>إضافة باقة جديدة</span>
          </button>
        }
      />

      {notice && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-1.5 inline-flex flex-wrap gap-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => {
            setTab("offers");
            setTypeFilter("ALL");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            tab === "offers"
              ? "bg-[#101B30] text-white shadow-xs"
              : "text-neutral-600 hover:text-[#101B30] hover:bg-neutral-50"
          }`}
        >
          العروض ({offers.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("bundles");
            setTypeFilter("ALL");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            tab === "bundles"
              ? "bg-[#101B30] text-white shadow-xs"
              : "text-neutral-600 hover:text-[#101B30] hover:bg-neutral-50"
          }`}
        >
          الباقات ({bundles.length})
        </button>
      </div>

      {/* Statistics Overview */}
      {tab === "offers" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatisticsCard
            label="إجمالي العروض"
            value={offerStats.total}
            accent="navy"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
          <StatisticsCard
            label="العروض النشطة"
            value={offerStats.active}
            accent="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatisticsCard
            label="العروض المنتهية"
            value={offerStats.expired}
            accent="burgundy"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatisticsCard
            label="عروض شحن مجاني"
            value={offerStats.freeShipping}
            accent="gold"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatisticsCard
            label="إجمالي الباقات"
            value={bundleStats.total}
            accent="navy"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatisticsCard
            label="الباقات النشطة"
            value={bundleStats.active}
            accent="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatisticsCard
            label="الباقات المنتهية"
            value={bundleStats.expired}
            accent="burgundy"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatisticsCard
            label="باقات متوفرة بالمخزون"
            value={bundleStats.inStock}
            accent="gold"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <SearchFilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          tab === "offers"
            ? "ابحث باسم العرض أو الوصف..."
            : "ابحث بعنوان الباقة أو الكود الداخلي..."
        }
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={statusFilterOptions}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        typeOptions={tab === "offers" ? offerTypeOptions : bundleTypeOptions}
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortOptions={sortOptions}
        onRefresh={() => void loadData(true)}
        refreshing={refreshing}
        resultCount={tab === "offers" ? filteredOffers.length : filteredBundles.length}
      />

      {/* Listing */}
      {loading ? (
        <LoadingSkeleton count={6} />
      ) : tab === "offers" ? (
        filteredOffers.length === 0 ? (
          <EmptyState
            title={offers.length === 0 ? "لا توجد عروض حالياً" : "لا توجد عروض مطابقة للبحث"}
            description={
              offers.length === 0
                ? "ابدأ بإنشاء أول عرض خصم على المنتجات لجذب العملاء وزيادة المبيعات."
                : "جرّب تعديل كلمات البحث أو إعادة تعيين الفلاتر لعرض جميع العروض."
            }
            action={
              offers.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreateOfferModal}
                  className="px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  + إضافة عرض جديد
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {filteredOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                productNameById={productNameById}
                onPreview={setPreviewOffer}
                onEdit={openEditOfferModal}
                onToggleStatus={(o) => void handleToggleOfferStatus(o)}
                onDelete={(o) => setDeleteTarget({ kind: "offer", item: o })}
                toggling={togglingId === offer.id}
              />
            ))}
          </div>
        )
      ) : filteredBundles.length === 0 ? (
        <EmptyState
          title={bundles.length === 0 ? "لا توجد باقات حالياً" : "لا توجد باقات مطابقة للبحث"}
          description={
            bundles.length === 0
              ? "أنشئ أول باقة تجمع عدة منتجات بسعر مميز أو خصم خاص."
              : "جرّب تعديل كلمات البحث أو إعادة تعيين الفلاتر لعرض جميع الباقات."
          }
          action={
            bundles.length === 0 ? (
              <button
                type="button"
                onClick={openCreateBundleModal}
                className="px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs transition-colors"
              >
                + إضافة باقة جديدة
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {filteredBundles.map((bundle) => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              onPreview={setPreviewBundle}
              onEdit={openEditBundleModal}
              onToggleStatus={(b) => void handleToggleBundleStatus(b)}
              onDelete={(b) => setDeleteTarget({ kind: "bundle", item: b })}
              toggling={togglingId === bundle.id}
            />
          ))}
        </div>
      )}

      {/* ================= Preview Offer Modal ================= */}
      <DrawerModal
        open={Boolean(previewOffer)}
        onClose={() => setPreviewOffer(null)}
        title={previewOffer ? `معاينة العرض: ${previewOffer.name}` : ""}
        subtitle="تفاصيل العرض والمنتجات المشمولة"
        footer={
          previewOffer && (
            <>
              <button
                type="button"
                onClick={() => setPreviewOffer(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewOffer;
                  setPreviewOffer(null);
                  openEditOfferModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1b2c4d] text-white text-xs font-bold"
              >
                تعديل العرض
              </button>
            </>
          )
        }
      >
        {previewOffer && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <div>
                <span className="text-neutral-500 block">قيمة الخصم</span>
                <span className="text-lg font-extrabold text-[#C8102E]">
                  {previewOffer.discountType === "PERCENTAGE"
                    ? `${previewOffer.discountValue}%`
                    : formatEGP(previewOffer.discountValue)}
                </span>
              </div>
              <StatusBadge status={getPromotionStatus(previewOffer)} />
            </div>

            {previewOffer.description && (
              <div>
                <h4 className="font-bold text-[#101B30] mb-1">الوصف</h4>
                <p className="text-neutral-600 leading-relaxed">{previewOffer.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">سقف الخصم</span>
                <strong className="text-[#101B30]">
                  {previewOffer.maxDiscountCents
                    ? formatEGP(previewOffer.maxDiscountCents)
                    : "بدون سقف"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">الشحن المجاني</span>
                <strong className="text-[#101B30]">
                  {previewOffer.isFreeShipping ? "مشمول (شحن مجاني)" : "غير مشمول"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ البدء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(previewOffer.startsAt)}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ الانتهاء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(previewOffer.endsAt)}
                </strong>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#101B30] mb-2">
                المنتجات المشمولة ({previewOffer.productIds.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                {previewOffer.productIds.map((pid) => (
                  <span
                    key={pid}
                    className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-medium"
                  >
                    {productNameById.get(pid) || pid}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* ================= Preview Bundle Modal ================= */}
      <DrawerModal
        open={Boolean(previewBundle)}
        onClose={() => setPreviewBundle(null)}
        title={previewBundle ? `معاينة الباقة: ${previewBundle.publicTitle}` : ""}
        subtitle={previewBundle ? `الكود الداخلي: ${previewBundle.internalName}` : ""}
        footer={
          previewBundle && (
            <>
              <button
                type="button"
                onClick={() => setPreviewBundle(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewBundle;
                  setPreviewBundle(null);
                  openEditBundleModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1b2c4d] text-white text-xs font-bold"
              >
                تعديل الباقة
              </button>
            </>
          )
        }
      >
        {previewBundle && (
          <div className="space-y-4 text-xs">
            {previewBundle.imageUrl && (
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <img
                  src={resolvePublicImageUrl(previewBundle.imageUrl)}
                  alt={previewBundle.publicTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <div>
                <span className="text-neutral-500 block">التسعير النهائي</span>
                <span className="text-lg font-extrabold text-[#C8102E]">
                  {previewBundle.fixedPriceCents !== null &&
                  previewBundle.fixedPriceCents !== undefined
                    ? formatEGP(previewBundle.fixedPriceCents)
                    : previewBundle.discountCents
                      ? `خصم ${formatEGP(previewBundle.discountCents)}`
                      : "-"}
                </span>
              </div>
              <StatusBadge status={getPromotionStatus(previewBundle)} />
            </div>

            {previewBundle.description && (
              <div>
                <h4 className="font-bold text-[#101B30] mb-1">الوصف</h4>
                <p className="text-neutral-600 leading-relaxed">{previewBundle.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">المخزون المتاح</span>
                <strong className="text-[#101B30]">
                  {previewBundle.availableStock ?? 0} باقة
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">الشحن المجاني</span>
                <strong className="text-[#101B30]">
                  {previewBundle.isFreeShipping ? "مشمول (شحن مجاني)" : "غير مشمول"}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ البدء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(previewBundle.startsAt)}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block">تاريخ الانتهاء</span>
                <strong className="text-[#101B30]">
                  {formatArabicDate(previewBundle.endsAt)}
                </strong>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#101B30] mb-2">
                مكونات الباقة ({previewBundle.items.length})
              </h4>
              <div className="space-y-2">
                {previewBundle.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"
                  >
                    <span className="font-semibold text-[#101B30]">
                      {item.product?.name || productNameById.get(item.productId) || item.productId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-neutral-200 font-bold text-[#C8102E]">
                      الكمية: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* ================= Add / Edit Offer Modal ================= */}
      <DrawerModal
        open={isOfferModalOpen}
        onClose={() => {
          if (!offerSubmitting) {
            setIsOfferModalOpen(false);
            resetOfferForm();
          }
        }}
        title={editingOfferId ? "تعديل العرض" : "إضافة عرض جديد"}
        subtitle="حدّد تفاصيل الخصم والمنتجات المشمولة وفترة الصلاحية"
      >
        <form id="offer-form" onSubmit={(e) => void handleSubmitOffer(e)} className="space-y-5">
          {offerFormError && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {offerFormError}
            </div>
          )}

          {/* A. Basic Information */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              المعلومات الأساسية
            </legend>
            <div>
              <label htmlFor="offer-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                اسم العرض *
              </label>
              <input
                id="offer-name"
                type="text"
                required
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
                placeholder="مثال: عرض نهاية الأسبوع على الإلكترونيات"
                className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>
            <div>
              <label htmlFor="offer-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
                وصف العرض (اختياري)
              </label>
              <textarea
                id="offer-desc"
                rows={2}
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="تفاصيل مختصرة تظهر عند مراجعة العرض..."
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>
          </fieldset>

          {/* B. Discount Configuration */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              إعدادات الخصم
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="offer-type" className="block text-xs font-semibold text-neutral-700 mb-1">
                  نوع الخصم *
                </label>
                <select
                  id="offer-type"
                  value={offerDiscountType}
                  onChange={(e) =>
                    setOfferDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                >
                  <option value="PERCENTAGE">نسبة مئوية (%)</option>
                  <option value="FIXED_AMOUNT">مبلغ ثابت (ج.م)</option>
                </select>
              </div>
              <div>
                <label htmlFor="offer-value" className="block text-xs font-semibold text-neutral-700 mb-1">
                  {offerDiscountType === "PERCENTAGE" ? "نسبة الخصم (%) *" : "قيمة الخصم (ج.م) *"}
                </label>
                <input
                  id="offer-value"
                  type="number"
                  min="1"
                  max={offerDiscountType === "PERCENTAGE" ? "100" : undefined}
                  step={offerDiscountType === "PERCENTAGE" ? "1" : "0.01"}
                  required
                  value={offerDiscountValue}
                  onChange={(e) => setOfferDiscountValue(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>

            {offerDiscountType === "PERCENTAGE" && (
              <div>
                <label htmlFor="offer-max-disc" className="block text-xs font-semibold text-neutral-700 mb-1">
                  الحد الأقصى للخصم (ج.م) — اختياري
                </label>
                <input
                  id="offer-max-disc"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="اتركه فارغاً بدون سقف"
                  value={offerMaxDiscountEgp}
                  onChange={(e) => setOfferMaxDiscountEgp(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={offerFreeShipping}
                onChange={(e) => setOfferFreeShipping(e.target.checked)}
                className="w-4 h-4 accent-[#C8102E] rounded"
              />
              <span>تضمين شحن مجاني مع هذا العرض</span>
            </label>
          </fieldset>

          {/* C. Target Products */}
          <fieldset className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <legend className="text-xs font-bold text-[#101B30]">
                المنتجات المشمولة * ({selectedProductIds.length} محدد)
              </legend>
              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="text-[11px] font-semibold text-[#C8102E] hover:underline"
                >
                  إلغاء تحديد الكل
                </button>
              )}
            </div>
            <input
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="ابحث عن منتج لإضافته..."
              className="w-full h-9 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
            />
            <div className="max-h-44 overflow-y-auto rounded-xl border border-neutral-200 p-2 space-y-1 bg-neutral-50/40">
              {filteredModalProducts.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">لا توجد منتجات مطابقة.</p>
              ) : (
                filteredModalProducts.map((p) => {
                  const checked = selectedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        checked ? "bg-[#C8102E]/5 text-[#101B30] font-semibold" : "hover:bg-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedProductIds((prev) =>
                              checked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                            )
                          }
                          className="w-4 h-4 accent-[#C8102E] rounded shrink-0"
                        />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="text-[11px] text-neutral-500 shrink-0">
                        {p.variants[0] ? formatEGP(p.variants[0].priceCents) : "-"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>

          {/* D. Validity & Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              الصلاحية والحالة
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="offer-starts" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ البدء (اختياري)
                </label>
                <input
                  id="offer-starts"
                  type="datetime-local"
                  value={offerStartsAt}
                  onChange={(e) => setOfferStartsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
              <div>
                <label htmlFor="offer-ends" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  id="offer-ends"
                  type="datetime-local"
                  value={offerEndsAt}
                  onChange={(e) => setOfferEndsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={offerIsActive}
                onChange={(e) => setOfferIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#C8102E] rounded"
              />
              <span>تفعيل العرض مباشرة</span>
            </label>
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={offerSubmitting}
              onClick={() => {
                setIsOfferModalOpen(false);
                resetOfferForm();
              }}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={offerSubmitting}
              className="px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {offerSubmitting ? "جاري الحفظ..." : editingOfferId ? "حفظ التعديلات" : "حفظ العرض"}
            </button>
          </div>
        </form>
      </DrawerModal>

      {/* ================= Add / Edit Bundle Modal ================= */}
      <DrawerModal
        open={isBundleModalOpen}
        onClose={() => {
          if (!bundleSubmitting) {
            setIsBundleModalOpen(false);
            resetBundleForm();
          }
        }}
        title={editingBundleId ? "تعديل الباقة" : "إضافة باقة جديدة"}
        subtitle="تجميع عدة منتجات في باقة واحدة بسعر خاص أو خصم"
      >
        <form onSubmit={(e) => void handleSubmitBundle(e)} className="space-y-5">
          {bundleFormError && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {bundleFormError}
            </div>
          )}

          {/* A. Basic Information */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              بيانات الباقة
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bundle-title" className="block text-xs font-semibold text-neutral-700 mb-1">
                  عنوان الباقة (يظهر للعملاء) *
                </label>
                <input
                  id="bundle-title"
                  type="text"
                  required
                  value={bundlePublicTitle}
                  onChange={(e) => setBundlePublicTitle(e.target.value)}
                  placeholder="مثال: باقة العناية الكاملة"
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
              <div>
                <label htmlFor="bundle-internal" className="block text-xs font-semibold text-neutral-700 mb-1">
                  الاسم الداخلي *
                </label>
                <input
                  id="bundle-internal"
                  type="text"
                  required
                  value={bundleInternalName}
                  onChange={(e) => setBundleInternalName(e.target.value)}
                  placeholder="مثال: CARE-BUNDLE-2026"
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 font-mono focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bundle-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
                وصف الباقة (اختياري)
              </label>
              <textarea
                id="bundle-desc"
                rows={2}
                value={bundleDescription}
                onChange={(e) => setBundleDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label htmlFor="bundle-order" className="block text-xs font-semibold text-neutral-700 mb-1">
                ترتيب العرض
              </label>
              <input
                id="bundle-order"
                type="number"
                value={bundleDisplayOrder}
                onChange={(e) => setBundleDisplayOrder(e.target.value)}
                className="w-32 h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
              />
            </div>
          </fieldset>

          {/* B. Media */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              صورة الباقة
            </legend>
            <AdminImageField
              label="صورة الباقة (اختياري)"
              value={bundleImageUrl}
              csrfToken={csrfToken}
              disabled={bundleSubmitting}
              onChange={setBundleImageUrl}
              onCsrfTokenChange={setCsrfToken}
            />
          </fieldset>

          {/* C. Pricing */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              تسعير الباقة
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bundle-pricing-type" className="block text-xs font-semibold text-neutral-700 mb-1">
                  طريقة التسعير *
                </label>
                <select
                  id="bundle-pricing-type"
                  value={bundlePricingType}
                  onChange={(e) =>
                    setBundlePricingType(e.target.value as "FIXED" | "DISCOUNT")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                >
                  <option value="FIXED">سعر ثابت للباقة</option>
                  <option value="DISCOUNT">خصم ثابت على إجمالي المنتجات</option>
                </select>
              </div>
              {bundlePricingType === "FIXED" ? (
                <div>
                  <label htmlFor="bundle-price" className="block text-xs font-semibold text-neutral-700 mb-1">
                    سعر الباقة النهائي (ج.م) *
                  </label>
                  <input
                    id="bundle-price"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={bundlePriceEgp}
                    onChange={(e) => setBundlePriceEgp(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="bundle-discount" className="block text-xs font-semibold text-neutral-700 mb-1">
                    قيمة الخصم (ج.م) *
                  </label>
                  <input
                    id="bundle-discount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={bundleDiscountEgp}
                    onChange={(e) => setBundleDiscountEgp(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                  />
                </div>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={bundleFreeShipping}
                onChange={(e) => setBundleFreeShipping(e.target.checked)}
                className="w-4 h-4 accent-[#C8102E] rounded"
              />
              <span>شحن مجاني للباقة</span>
            </label>
          </fieldset>

          {/* D. Items */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              مكونات الباقة * ({bundleItems.length})
            </legend>
            <select
              aria-label="إضافة منتج للباقة"
              value=""
              onChange={(e) => addBundleItem(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
            >
              <option value="">+ اختر منتجاً لإضافته للباقة...</option>
              {availableProducts
                .filter((p) => !bundleItems.some((i) => i.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.variants[0] ? formatEGP(p.variants[0].priceCents) : "-"})
                  </option>
                ))}
            </select>

            {bundleItems.length > 0 && (
              <div className="space-y-2">
                {bundleItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200"
                  >
                    <span className="text-xs font-semibold text-[#101B30] truncate flex-1">
                      {productNameById.get(item.productId) || item.productId}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-[11px] text-neutral-500">
                        الكمية:
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={item.quantity}
                          onChange={(e) =>
                            updateBundleItemQuantity(
                              item.productId,
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="w-14 h-8 mr-1 px-2 rounded-lg border border-neutral-200 bg-white text-xs text-center"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeBundleItem(item.productId)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          {/* E. Validity & Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-[#101B30] pb-1 border-b border-neutral-100 w-full">
              الصلاحية والحالة
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bundle-starts" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ البدء (اختياري)
                </label>
                <input
                  id="bundle-starts"
                  type="datetime-local"
                  value={bundleStartsAt}
                  onChange={(e) => setBundleStartsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
              <div>
                <label htmlFor="bundle-ends" className="block text-xs font-semibold text-neutral-700 mb-1">
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  id="bundle-ends"
                  type="datetime-local"
                  value={bundleEndsAt}
                  onChange={(e) => setBundleEndsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={bundleIsActive}
                onChange={(e) => setBundleIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#C8102E] rounded"
              />
              <span>تفعيل الباقة مباشرة</span>
            </label>
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={bundleSubmitting}
              onClick={() => {
                setIsBundleModalOpen(false);
                resetBundleForm();
              }}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={bundleSubmitting}
              className="px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {bundleSubmitting ? "جاري الحفظ..." : editingBundleId ? "حفظ التعديلات" : "حفظ الباقة"}
            </button>
          </div>
        </form>
      </DrawerModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === "offer" ? "حذف العرض" : "حذف الباقة"}
        message={
          deleteTarget?.kind === "offer"
            ? `هل أنت متأكد من حذف العرض "${deleteTarget.item.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : deleteTarget?.kind === "bundle"
              ? `هل أنت متأكد من حذف الباقة "${deleteTarget.item.publicTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`
              : ""
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </AdminLayout>
  );
}
