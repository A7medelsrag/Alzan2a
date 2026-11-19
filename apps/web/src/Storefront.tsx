import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import {
  formatEGP,
  type BundlePublic,
  type CategoryListResponse,
  type ProductListResponse,
  type ProductOfferPublic,
} from "@store/shared";
import { BrandMark, Icon } from "@store/ui";
import { listCatalogProducts, listCategories } from "./features/catalog/api/catalog";
import { listStoreBundles, listStoreOffers } from "./features/catalog/api/offers";
import { HomepageRequestError, loadHomepage, type HomepageContent } from "./features/homepage/api/homepage";
import { useCustomerSession } from "./features/customer/CustomerSession";
import { useCart } from "./features/cart/CartContext";
import { useWishlist } from "./features/wishlist/WishlistContext";
import BundleDetailModal from "./features/catalog/components/BundleDetailModal";
import ProductReviewsModal from "./features/catalog/components/ProductReviewsModal";
import { resolvePublicImageUrl } from "./utils/media";

type CatalogProduct = ProductListResponse["data"][number];
type CatalogCategory = CategoryListResponse["data"][number];
type CatalogStatus = "loading" | "ready" | "error";
type OffersStatus = "loading" | "ready" | "error";
type HomeStatus = "loading" | "ready" | "error" | "setupRequired";
type HomepageSection = HomepageContent["sections"][number];

export default function Storefront() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isOffersPage = pathname === "/offers";
  const { customer } = useCustomerSession();
  const { itemCount } = useCart();
  const { count: wishlistCount, openDrawer: openWishlistDrawer } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "priceAsc" | "priceDesc">("newest");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<CatalogProduct | null>(null);
  const [offers, setOffers] = useState<ProductOfferPublic[]>([]);
  const [offersStatus, setOffersStatus] = useState<OffersStatus>("loading");
  const [bundles, setBundles] = useState<BundlePublic[]>([]);
  const [bundlesStatus, setBundlesStatus] = useState<OffersStatus>("loading");
  const [selectedBundle, setSelectedBundle] = useState<BundlePublic | null>(null);
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [homeStatus, setHomeStatus] = useState<HomeStatus>("loading");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  function requestProducts(search: string, category = activeCategory, page = 1, append = false) {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    void loadProducts(search, category, controller.signal, page, append);
  }

  useEffect(() => {
    const controller = new AbortController();
    void listCategories(controller.signal)
      .then((cats) => setCategories(cats))
      .catch(() => {});
    void listStoreOffers()
      .then((res) => {
        setOffers(res.data);
        setOffersStatus("ready");
      })
      .catch(() => setOffersStatus("error"));
    void loadHomepage(controller.signal)
      .then((result) => {
        setHomepage(result);
        setHomeStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setHomeStatus(error instanceof HomepageRequestError && error.kind === "setupRequired" ? "setupRequired" : "error");
      });
    return () => {
      requestControllerRef.current?.abort();
      controller.abort();
    };
  }, []);

  useEffect(() => {
    requestProducts("", "all");
    setSelectedBundle(null);
    setBundlesStatus("loading");
    void listStoreBundles()
      .then((res) => {
        setBundles(res.data);
        setBundlesStatus("ready");
      })
      .catch(() => setBundlesStatus("error"));
  }, [isOffersPage]);

  useEffect(() => {
    if (activeCategory !== "all") {
      document.getElementById("product-catalog")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [activeCategory]);

  async function loadProducts(search: string, category: string, signal: AbortSignal, page: number, append: boolean) {
    if (append) {
      setLoadingMore(true);
      setLoadMoreError(false);
    } else {
      setLoadingMore(false);
      setLoadMoreError(false);
      setCatalogStatus("loading");
      setSubmittedSearch(search);
      setActiveCategory(category);
    }
    try {
      const result = await listCatalogProducts({
        search,
        category: category === "all" ? undefined : category,
        page,
        pageSize: isOffersPage ? 100 : category !== "all" && !search ? 6 : 24,
      }, signal);
      setProducts((current) => append
        ? [...current, ...result.data.filter((product) => !current.some(({ id }) => id === product.id))]
        : result.data);
      setCatalogTotal(result.total);
      setCatalogPage(result.page);
      setCategories((current) => current.length > 0
        ? current
        : [...new Map(result.data.map(({ category: productCategory }) => [
          productCategory.slug,
          {
            id: productCategory.slug,
            name: productCategory.name,
            slug: productCategory.slug,
            parentId: null,
            imageUrl: null,
            bannerImageUrl: null,
          },
        ] as const)).values()]);
      setCatalogStatus("ready");
    } catch {
      if (!signal.aborted) {
        if (append) setLoadMoreError(true);
        else setCatalogStatus("error");
      }
    } finally {
      if (append && !signal.aborted) setLoadingMore(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestProducts(searchTerm.trim());
    setMenuOpen(false);
  }

  function selectCategory(category: string) {
    setSubmittedSearch("");
    setSearchTerm("");
    setSortOrder("newest");
    resetCategoryFilters();
    setMobileFiltersOpen(false);
    requestProducts("", category);
    setMenuOpen(false);
  }

  function retryCatalog() {
    requestProducts(submittedSearch);
  }

  function resetCategoryFilters() {
    setMinimumPrice("");
    setMaximumPrice("");
    setSelectedSize("");
    setInStockOnly(false);
    setDiscountedOnly(false);
    setFreeShippingOnly(false);
  }

  function loadMoreProducts() {
    requestProducts(submittedSearch, activeCategory, catalogPage + 1, true);
  }

  const heroBanners = homepage?.banners.filter((banner) => banner.slot === "HERO") ?? [];
  const promotionalBanners = homepage?.banners.filter((banner) => banner.slot === "PROMOTION") ?? [];
  const announcementBanners = homepage?.banners.filter((banner) => banner.slot === "ANNOUNCEMENT") ?? [];
  const topSideBanners = homepage?.banners.filter((banner) => banner.slot === "SIDE_TOP") ?? [];
  const bottomSideBanners = homepage?.banners.filter((banner) => banner.slot === "SIDE_BOTTOM") ?? [];
  const timerBanners = homepage?.banners.filter((banner) => banner.slot === "TIMER") ?? [];
  const finalBanners = homepage?.banners.filter((banner) => banner.slot === "FINAL") ?? [];
  const visibleSections = homepage?.sections.filter((section) => sectionHasContent(section)) ?? [];
  const heading = submittedSearch ? t("searchResultsFor", { query: submittedSearch }) : t("collection");
  const heroPromotions = promotionalBanners.slice(0, 2);
  const hasHeroSidePromotions =
    topSideBanners.length > 0 || bottomSideBanners.length > 0 || heroPromotions.length > 0;
  const heroImageUrl = homepage?.sections.find((section) => section.type === "BRAND_STORY")?.imageUrl
    ?? products.find((product) => product.imageUrl)?.imageUrl
    ?? null;
  const selectedCategory = categories.find((category) => category.slug === activeCategory);
  const categoryParent = selectedCategory?.parentId
    ? categories.find((category) => category.id === selectedCategory.parentId) ?? selectedCategory
    : selectedCategory;
  const subcategories = categories.filter((category) => category.parentId === categoryParent?.id);
  const categoryOptions = subcategories.length > 0
    ? subcategories
    : categoryParent?.parentId
      ? categories.filter((category) => category.parentId === categoryParent.parentId)
      : [];
  const isParentCategorySelected = selectedCategory?.id === categoryParent?.id;
  const isCategoryPage = Boolean(selectedCategory && !submittedSearch && !isOffersPage);
  const availableSizes = [...new Set(products.flatMap((product) => product.variants
    .map((variant) => variant.name)
    .filter((name) => /^(xs|s|m|l|xl|xxl|xxxl|2xl|3xl|\d+)$/i.test(name.trim()))))];
  const minimumPriceCents = minimumPrice ? Number(minimumPrice) * 100 : null;
  const maximumPriceCents = maximumPrice ? Number(maximumPrice) * 100 : null;
  const filteredProducts = products.filter((product) => {
    const prices = product.variants.map((variant) => variant.priceCents);
    if ((minimumPriceCents !== null || maximumPriceCents !== null) && !prices.some((price) =>
      (minimumPriceCents === null || price >= minimumPriceCents)
      && (maximumPriceCents === null || price <= maximumPriceCents))) return false;
    if (selectedSize && !product.variants.some((variant) => variant.name.trim() === selectedSize)) return false;
    if (inStockOnly && product.variants.length === 0) return false;
    const matchingOffers = offers.filter((offer) => offer.productIds.includes(product.id));
    if (discountedOnly && matchingOffers.length === 0) return false;
    if (freeShippingOnly && !matchingOffers.some((offer) => offer.isFreeShipping)) return false;
    return true;
  }).sort((left, right) => {
    if (sortOrder === "newest") return 0;
    const leftPrice = Math.min(...left.variants.map((variant) => variant.priceCents), Number.MAX_SAFE_INTEGER);
    const rightPrice = Math.min(...right.variants.map((variant) => variant.priceCents), Number.MAX_SAFE_INTEGER);
    return sortOrder === "priceAsc" ? leftPrice - rightPrice : rightPrice - leftPrice;
  });
  const hasCategoryFilters = Boolean(
    minimumPrice || maximumPrice || selectedSize || inStockOnly || discountedOnly || freeShippingOnly,
  );
  const hasMoreProducts = products.length < catalogTotal;
  const homepageProducts = [...(homepage?.sections.flatMap((section) => section.products) ?? []), ...products]
    .filter((product, index, all) => all.findIndex((candidate) => candidate.id === product.id) === index);

  return (
    <div className="store-app" dir="rtl">
      <AnnouncementBar banners={announcementBanners} />
      <header className="store-header">
        <div className="store-header__main">
          <button
            aria-controls="store-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("closeMenu") : t("menu")}
            className="icon-button mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <Link aria-label={t("brandName")} className="store-brand" to="/">
            <BrandMark />
            <span className="store-brand__name">{t("brandName")}</span>
          </Link>
          <form className="store-search" onSubmit={handleSearch} role="search">
            <input
              aria-label={t("searchLabel")}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("searchLabel")}
              ref={searchInputRef}
              type="search"
              value={searchTerm}
            />
            <button aria-label={t("searchAction")} type="submit"><Icon name="search" /></button>
          </form>
          <Link aria-label={t("customerAccountLink")} className="store-admin-link" to={customer ? "/account" : "/login"}>
            <Icon name="user" />
            <span className="store-action-label">{t(customer ? "customerProfileTitle" : "customerAuthLink")}</span>
          </Link>
          <button
            aria-label="المفضلة"
            className="store-admin-link store-wishlist-button"
            onClick={openWishlistDrawer}
            type="button"
          >
            <Icon name="heart" />
            <span className="store-action-label">المفضلة</span>
            {wishlistCount > 0 && <span className="cart-counter-badge">{wishlistCount}</span>}
          </button>
          <Link aria-label="سلة المشتريات" className="store-admin-link store-cart-link" to="/cart">
            <Icon name="bag" />
            <span className="store-action-label">السلة</span>
            {itemCount > 0 && <span className="cart-counter-badge">{itemCount}</span>}
          </Link>
        </div>
        <nav
          aria-label={t("mainNavigation")}
          className={`store-nav${menuOpen ? " store-nav--open" : ""}`}
          id="store-navigation"
        >
          <Link aria-current={!isOffersPage && !submittedSearch && activeCategory === "all" ? "page" : undefined} onClick={() => selectCategory("all")} to="/">
            {t("home")}
          </Link>
          {((homepage?.sections.find((section) => section.type === "CATEGORIES")?.categories?.length ?? 0) > 0
            ? homepage!.sections.find((section) => section.type === "CATEGORIES")!.categories
            : categories
          ).map((category) => (
            <button
              aria-current={activeCategory === category.slug ? "true" : undefined}
              className={activeCategory === category.slug ? "store-nav__category store-nav__category--active" : "store-nav__category"}
              key={category.id}
              onClick={() => selectCategory(category.slug)}
              type="button"
            >
              {category.name}
            </button>
          ))}
          <Link
            aria-current={isOffersPage ? "page" : undefined}
            className="store-nav__offers"
            onClick={() => setMenuOpen(false)}
            to="/offers"
          >
            {t("offers")}
          </Link>
        </nav>
      </header>

      <main className={`store-main${isOffersPage ? " store-main--offers" : ""}`} id={isOffersPage ? "offers-page" : "campaigns"}>
        {isOffersPage ? (
          <OffersPageContent
            bundles={bundles}
            bundlesStatus={bundlesStatus}
            catalogStatus={catalogStatus}
            offers={offers}
            offersStatus={offersStatus}
            onOpenBundle={setSelectedBundle}
            onOpenReviews={setReviewProduct}
            products={products}
          />
        ) : (
          <>
        {homeStatus === "loading" && (
          <div className="homepage-loading" aria-label={t("catalogLoading")} aria-live="polite">
            <div className="homepage-loading__hero" />
            <div className="homepage-loading__row"><span /><span /><span /></div>
          </div>
        )}
        {(homeStatus === "error" || homeStatus === "setupRequired") && (
          <p className="homepage-inline-error" role="status">
            {t(homeStatus === "setupRequired" ? "homepageSetupRequired" : "homepageContentUnavailable")}
          </p>
        )}
        {homeStatus === "ready" && !submittedSearch && activeCategory === "all" && (
          <div className={`homepage-hero${hasHeroSidePromotions ? "" : " homepage-hero--single"}`}>
            {heroBanners.length > 0
              ? <CampaignSlider banners={heroBanners} />
              : <DefaultHero imageUrl={heroImageUrl} />}
            {hasHeroSidePromotions && (
              <HeroSidePromotions
                topBanners={topSideBanners.length > 0 ? topSideBanners : heroPromotions.slice(0, 1)}
                bottomBanners={bottomSideBanners.length > 0 ? bottomSideBanners : heroPromotions.slice(1, 2)}
              />
            )}
          </div>
        )}

        <div className="store-main__inner">
          {homeStatus === "ready" && !submittedSearch && activeCategory === "all" && (
            <>
              <StoreBenefits />
              <HomepageSections
                banners={promotionalBanners}
                bundles={bundles}
                bundlesStatus={bundlesStatus}
                timerBanners={timerBanners}
                finalBanners={finalBanners}
                offers={offers}
                offersStatus={offersStatus}
                onCategorySelect={selectCategory}
                onOpenBundle={setSelectedBundle}
                onOpenReviews={setReviewProduct}
                products={homepageProducts}
                sections={visibleSections}
              />
            </>
          )}

          {isCategoryPage && selectedCategory ? (
            <section aria-labelledby="catalog-title" className="category-page" id="product-catalog">
              <nav aria-label={t("categoryBreadcrumbLabel")} className="category-page__breadcrumb">
                <button onClick={() => selectCategory("all")} type="button">{t("home")}</button>
                <span aria-hidden="true">/</span>
                <span>{selectedCategory.name}</span>
              </nav>
              <header className="category-banner">
                <div className="category-banner__copy">
                  <h1 id="catalog-title">{selectedCategory.name}</h1>
                  <p>{t("categoryBannerIntro", { category: selectedCategory.name })}</p>
                </div>
                <div className="category-banner__art">
                  {selectedCategory.bannerImageUrl
                    ? <ImageWithFallback alt="" imageUrl={selectedCategory.bannerImageUrl} />
                    : <div className="category-banner__placeholder">{t("categoryBannerImagePlaceholder")}</div>}
                </div>
              </header>

              {(subcategories.length > 0 || categoryOptions.length > 0) && categoryParent && (
                <div aria-label={t("categoryNavigationLabel")} className="store-category-pills" role="tablist">
                  <button
                    aria-selected={isParentCategorySelected}
                    className={`store-category-pill ${isParentCategorySelected ? "store-category-pill--active" : ""}`}
                    onClick={() => selectCategory(categoryParent.slug)}
                    role="tab"
                    type="button"
                  >
                    {t("categoryAllCategories")}
                  </button>
                  {categoryOptions.map((category) => (
                    <button
                      aria-selected={activeCategory === category.slug}
                      className={`store-category-pill ${activeCategory === category.slug ? "store-category-pill--active" : ""}`}
                      key={category.id}
                      onClick={() => selectCategory(category.slug)}
                      role="tab"
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="category-layout">
                {mobileFiltersOpen && (
                  <button
                    aria-label={t("categoryCloseFilterLabel")}
                    className="category-filter-backdrop"
                    onClick={() => setMobileFiltersOpen(false)}
                    type="button"
                  />
                )}
                <aside
                  aria-label={t("categoryFilterTitle")}
                  className={`category-filters${mobileFiltersOpen ? " category-filters--open" : ""}`}
                  id="category-filters"
                >
                  <header className="category-filters__heading">
                    <h2>{t("categoryFilterTitle")}</h2>
                    <div>
                      <button onClick={resetCategoryFilters} type="button">{t("categoryFilterClearAll")}</button>
                      <button className="category-filters__close" onClick={() => setMobileFiltersOpen(false)} type="button">
                        {t("categoryFilterClose")}
                      </button>
                    </div>
                  </header>
                  {categoryOptions.length > 0 && (
                    <fieldset className="category-filter-group">
                      <legend>{t("categoryFilterGroup")}</legend>
                      {categoryOptions.map((category) => (
                        <label className="category-filter-option" key={category.id}>
                          <input
                            checked={activeCategory === category.slug}
                            onChange={(event) => selectCategory(
                              event.target.checked ? category.slug : categoryParent?.slug ?? activeCategory,
                            )}
                            type="checkbox"
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <fieldset className="category-filter-group">
                    <legend>{t("categoryFilterPrice")}</legend>
                    <div className="category-price-inputs">
                      <label>
                        <span>{t("categoryPriceFrom")}</span>
                        <input
                          min="0"
                          onChange={(event) => setMinimumPrice(event.target.value)}
                          type="number"
                          value={minimumPrice}
                        />
                      </label>
                      <label>
                        <span>{t("categoryPriceTo")}</span>
                        <input
                          min="0"
                          onChange={(event) => setMaximumPrice(event.target.value)}
                          type="number"
                          value={maximumPrice}
                        />
                      </label>
                    </div>
                  </fieldset>
                  {availableSizes.length > 0 && (
                    <fieldset className="category-filter-group">
                      <legend>{t("categoryFilterSize")}</legend>
                      <div className="category-size-options">
                        {availableSizes.map((size) => (
                          <button
                            aria-pressed={selectedSize === size}
                            className={selectedSize === size ? "category-size-option category-size-option--active" : "category-size-option"}
                            key={size}
                            onClick={() => setSelectedSize((current) => current === size ? "" : size)}
                            type="button"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <fieldset className="category-filter-group">
                    <legend>{t("categoryFilterMore")}</legend>
                    <label className="category-filter-option">
                      <input checked={discountedOnly} onChange={(event) => setDiscountedOnly(event.target.checked)} type="checkbox" />
                      <span>{t("categoryDiscounted")}</span>
                    </label>
                    <label className="category-filter-option">
                      <input checked={freeShippingOnly} onChange={(event) => setFreeShippingOnly(event.target.checked)} type="checkbox" />
                      <span>{t("categoryFreeShipping")}</span>
                    </label>
                    <label className="category-filter-option">
                      <input checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} type="checkbox" />
                      <span>{t("categoryInStock")}</span>
                    </label>
                  </fieldset>
                </aside>

                <div className="category-results">
                  <div className="category-toolbar">
                    <p aria-live="polite">
                      {t("categoryResultCount", {
                        visible: filteredProducts.length,
                        total: hasCategoryFilters ? products.length : catalogTotal,
                      })}
                    </p>
                    <label className="category-sort">
                      <span>{t("categorySortLabel")}</span>
                      <select
                        onChange={(event) => setSortOrder(
                          event.target.value === "priceAsc" || event.target.value === "priceDesc"
                            ? event.target.value
                            : "newest",
                        )}
                        value={sortOrder}
                      >
                        <option value="newest">{t("categorySortNewest")}</option>
                        <option value="priceAsc">{t("categorySortPriceAsc")}</option>
                        <option value="priceDesc">{t("categorySortPriceDesc")}</option>
                      </select>
                    </label>
                    <button
                      aria-controls="category-filters"
                      aria-expanded={mobileFiltersOpen}
                      className="category-filter-toggle"
                      onClick={() => setMobileFiltersOpen((open) => !open)}
                      type="button"
                    >
                      {t(mobileFiltersOpen ? "categoryFilterHide" : "categoryFilterTitle")}
                    </button>
                  </div>
                  {hasCategoryFilters && (
                    <div className="category-active-filters">
                      {minimumPrice && (
                        <button onClick={() => setMinimumPrice("")} type="button">
                          {t("categoryPriceFromChip", { price: minimumPrice })}
                          <span aria-hidden="true">×</span>
                        </button>
                      )}
                      {maximumPrice && (
                        <button onClick={() => setMaximumPrice("")} type="button">
                          {t("categoryPriceToChip", { price: maximumPrice })}
                          <span aria-hidden="true">×</span>
                        </button>
                      )}
                      {selectedSize && (
                        <button onClick={() => setSelectedSize("")} type="button">
                          {t("categorySizeChip", { size: selectedSize })}
                          <span aria-hidden="true">×</span>
                        </button>
                      )}
                      {discountedOnly && (
                        <button onClick={() => setDiscountedOnly(false)} type="button">
                          {t("categoryDiscounted")}<span aria-hidden="true">×</span>
                        </button>
                      )}
                      {freeShippingOnly && (
                        <button onClick={() => setFreeShippingOnly(false)} type="button">
                          {t("categoryFreeShipping")}<span aria-hidden="true">×</span>
                        </button>
                      )}
                      {inStockOnly && (
                        <button onClick={() => setInStockOnly(false)} type="button">
                          {t("categoryInStock")}<span aria-hidden="true">×</span>
                        </button>
                      )}
                      <button onClick={resetCategoryFilters} type="button">{t("categoryFilterClearAll")}</button>
                    </div>
                  )}
                  {catalogStatus === "loading" && (
                    <div aria-label={t("catalogLoading")} className="product-grid product-grid--skeleton" role="status">
                      {Array.from({ length: 6 }, (_, index) => <div className="product-skeleton" key={index} />)}
                    </div>
                  )}
                  {catalogStatus === "error" && (
                    <div className="catalog-message" role="alert">
                      <p>{t("catalogError")}</p>
                      <button className="catalog-retry" onClick={retryCatalog} type="button">{t("retry")}</button>
                    </div>
                  )}
                  {catalogStatus === "ready" && filteredProducts.length === 0 && (
                    <div className="store-empty">
                      <h2>{t(hasCategoryFilters ? "categoryNoFilterResults" : "noProducts")}</h2>
                      <p>{t(hasCategoryFilters ? "categoryNoFilterResultsBody" : "noProductsBody")}</p>
                    </div>
                  )}
                  {catalogStatus === "ready" && filteredProducts.length > 0 && (
                    <>
                      <div aria-label={t("productList")} className="product-grid category-product-grid">
                        {filteredProducts.map((product) => (
                          <ProductCard key={product.id} offers={offers} onOpenReviews={setReviewProduct} product={product} />
                        ))}
                      </div>
                      {hasMoreProducts && (
                        <div className="category-load-more">
                          <button disabled={loadingMore} onClick={loadMoreProducts} type="button">
                            {loadingMore
                              ? t("categoryLoadingMore")
                              : loadMoreError
                                ? t("categoryRetryMore")
                                : t("categoryLoadMore")}
                          </button>
                          {loadMoreError && <p role="alert">{t("categoryLoadMoreError")}</p>}
                          {!loadMoreError && (
                            <small>{t("categoryLoadedCount", { visible: products.length, total: catalogTotal })}</small>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          ) : (submittedSearch || activeCategory !== "all") ? (
          <section aria-labelledby="catalog-title" className="catalog-section" id="product-catalog">
            <div className="catalog-heading">
              <p className="eyebrow">{submittedSearch ? t("searchResultsEyebrow") : t("collection")}</p>
              <h1 id="catalog-title">
                {submittedSearch
                  ? heading
                  : activeCategory === "all"
                    ? "جميع المنتجات"
                    : (categories.find((c) => c.slug === activeCategory)?.name ?? t("productCollectionTitle"))}
              </h1>
              {catalogStatus === "ready" && (
                <p aria-live="polite" className="catalog-count">
                  {t("catalogResultCount", { count: products.length })}
                </p>
              )}
            </div>
            {categories.length > 0 && !submittedSearch && (
              <div className="store-category-pills" role="tablist">
                <button
                  aria-selected={activeCategory === "all"}
                  className={`store-category-pill ${activeCategory === "all" ? "store-category-pill--active" : ""}`}
                  onClick={() => selectCategory("all")}
                  role="tab"
                  type="button"
                >
                  {t("categoryAllCategories")}
                </button>
                {categories.map((c) => (
                  <button
                    aria-selected={activeCategory === c.slug}
                    className={`store-category-pill ${activeCategory === c.slug ? "store-category-pill--active" : ""}`}
                    key={c.id}
                    onClick={() => selectCategory(c.slug)}
                    role="tab"
                    type="button"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {catalogStatus === "loading" && (
              <div aria-label={t("catalogLoading")} className="product-grid product-grid--skeleton" role="status">
                {Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index} />)}
              </div>
            )}
            {catalogStatus === "error" && (
              <div className="catalog-message" role="alert">
                <p>{t("catalogError")}</p>
                <button className="catalog-retry" onClick={retryCatalog} type="button">
                  {t("retry")}
                </button>
              </div>
            )}
            {catalogStatus === "ready" && products.length === 0 && (
              <div className="store-empty">
                <h2>{t(submittedSearch ? "noSearchResults" : "noProducts")}</h2>
                <p>{t(submittedSearch ? "noSearchResultsBody" : "noProductsBody")}</p>
              </div>
            )}
            {catalogStatus === "ready" && products.length > 0 && (
              <div aria-label={t("productList")} className="product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    offers={offers}
                    onOpenReviews={setReviewProduct}
                    product={product}
                  />
                ))}
              </div>
            )}
          </section>
          ) : null}
        </div>
          </>
        )}
      </main>

      {!isOffersPage && !submittedSearch && activeCategory === "all" && homeStatus === "ready" && <WeeklyPromo />}
      <Footer homepage={homepage} />
      <nav aria-label={t("mobileNavigation")} className="mobile-bottom-nav">
        <Link aria-current={!isOffersPage ? "page" : undefined} to="/"><Icon name="grid" /><span>{t("home")}</span></Link>
        <button aria-label="المفضلة" onClick={openWishlistDrawer} type="button">
          <Icon name="heart" />
          <span>المفضلة</span>
          {wishlistCount > 0 && <span className="cart-counter-badge">{wishlistCount}</span>}
        </button>
        <Link aria-label="السلة" className="mobile-cart-link" to="/cart">
          <Icon name="bag" />
          <span>السلة</span>
          {itemCount > 0 && <span className="cart-counter-badge">{itemCount}</span>}
        </Link>
        <Link to={customer ? "/account" : "/login"}>
          <Icon name="user" /><span>{t("customerAccountLink")}</span>
        </Link>
      </nav>

      <ProductReviewsModal
        isOpen={Boolean(reviewProduct)}
        onClose={() => setReviewProduct(null)}
        product={reviewProduct}
      />
      <BundleDetailModal
        bundle={selectedBundle}
        isOpen={Boolean(selectedBundle)}
        onClose={() => setSelectedBundle(null)}
      />

    </div>
  );
}

function OffersPageContent({
  offers,
  offersStatus,
  bundles,
  bundlesStatus,
  products,
  catalogStatus,
  onOpenBundle,
  onOpenReviews,
}: {
  offers: ProductOfferPublic[];
  offersStatus: OffersStatus;
  bundles: BundlePublic[];
  bundlesStatus: OffersStatus;
  products: CatalogProduct[];
  catalogStatus: CatalogStatus;
  onOpenBundle: (bundle: BundlePublic) => void;
  onOpenReviews: (product: CatalogProduct) => void;
}) {
  const { t } = useTranslation();
  const discountedProducts = products.filter((product) =>
    offers.some((offer) => offer.productIds.includes(product.id)),
  );
  const freeShippingProducts = products.filter((product) =>
    offers.some((offer) => offer.isFreeShipping && offer.productIds.includes(product.id)),
  );

  return (
    <div className="offers-page">
      <section aria-labelledby="offers-page-title" className="offers-hero">
        <div className="offers-hero__copy">
          <p className="offers-hero__eyebrow">{t("offersPageEyebrow")}</p>
          <h1 id="offers-page-title">{t("offersPageTitle")}</h1>
          <p>{t("offersPageIntro")}</p>
          <a className="offers-hero__link" href="#current-offers">{t("offersBrowse")}</a>
        </div>
        <div aria-hidden="true" className="offers-hero__art">
          <span className="offers-hero__circle offers-hero__circle--outer" />
          <span className="offers-hero__circle offers-hero__circle--inner" />
          <span className="offers-hero__ticket">
            <strong>{t("offersHeroHighlight")}</strong>
            <small>{t("offersHeroCaption")}</small>
          </span>
        </div>
      </section>

      <section aria-labelledby="current-offers-title" className="offers-section" id="current-offers">
        <header className="offers-section__heading">
          <div>
            <p className="eyebrow">{t("offersPageEyebrow")}</p>
            <h2 id="current-offers-title">{t("offersAvailableTitle")}</h2>
          </div>
          {offersStatus === "ready" && (
            <span className="offers-section__count">{t("offersAvailableCount", { count: offers.length })}</span>
          )}
        </header>
        {offersStatus === "loading" && (
          <div aria-label={t("offersLoading")} className="offers-promo-grid offers-promo-grid--skeleton" role="status">
            <span /><span /><span />
          </div>
        )}
        {offersStatus === "error" && (
          <p className="offers-message offers-message--error" role="alert">{t("offersLoadError")}</p>
        )}
        {offersStatus === "ready" && offers.length === 0 && (
          <p className="offers-message">{t("offersEmpty")}</p>
        )}
        {offersStatus === "ready" && offers.length > 0 && (
          <div className="offers-promo-grid">
            {offers.map((offer) => (
              <article className="offers-promo-card" key={offer.id}>
                <div className="offers-promo-card__top">
                  <span className="offers-promo-card__discount">
                    {offer.discountType === "PERCENTAGE"
                      ? t("offersPercentDiscount", { value: offer.discountValue })
                      : t("offersAmountDiscount", { value: formatEGP(offer.discountValue) })}
                  </span>
                  {offer.isFreeShipping && <span className="offers-promo-card__shipping">{t("offersFreeShipping")}</span>}
                </div>
                <h3>{offer.name}</h3>
                {offer.description && <p>{offer.description}</p>}
                {offer.endsAt && (
                  <small className="offers-promo-card__expiry">
                    {t("offersEndsAt", {
                      date: new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long" }).format(new Date(offer.endsAt)),
                    })}
                  </small>
                )}
                <a href="#discounted-products">{t("offersShopNow")}<span aria-hidden="true"> ←</span></a>
              </article>
            ))}
          </div>
        )}
      </section>

      {(bundlesStatus === "loading" || bundlesStatus === "error" || bundles.length > 0) && (
        <section aria-labelledby="offers-bundles-title" className="offers-section">
          <header className="offers-section__heading">
            <div>
              <p className="eyebrow">{t("offersBundlesEyebrow")}</p>
              <h2 id="offers-bundles-title">{t("offersBundlesTitle")}</h2>
            </div>
          </header>
          {bundlesStatus === "loading" && (
            <div aria-label={t("offersBundlesLoading")} className="offers-bundle-grid offers-bundle-grid--skeleton" role="status">
              <span /><span />
            </div>
          )}
          {bundlesStatus === "error" && (
            <p className="offers-message offers-message--error" role="alert">{t("offersBundlesError")}</p>
          )}
          {bundlesStatus === "ready" && bundles.length > 0 && (
            <div className="offers-bundle-grid">
              {bundles.map((bundle) => {
                const priceCents = bundle.finalPriceCents
                  ?? bundle.fixedPriceCents
                  ?? Math.max(0, (bundle.totalOriginalPriceCents ?? 0) - (bundle.discountCents ?? 0));
                return (
                  <article className="offers-bundle-card" key={bundle.id}>
                    <div className="offers-bundle-card__media">
                      <ImageWithFallback alt={bundle.publicTitle} imageUrl={bundle.imageUrl ?? null} />
                      {bundle.isFreeShipping && <span>{t("offersFreeShipping")}</span>}
                    </div>
                    <div className="offers-bundle-card__body">
                      <p className="offers-bundle-card__items">{t("offersBundleItems", { count: bundle.items.length })}</p>
                      <h3>{bundle.publicTitle}</h3>
                      {bundle.description && <p className="offers-bundle-card__description">{bundle.description}</p>}
                      <div className="offers-bundle-card__footer">
                        <strong>{formatEGP(priceCents)}</strong>
                        <button onClick={() => onOpenBundle(bundle)} type="button">{t("offersViewBundle")}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="discounted-products-title" className="offers-section" id="discounted-products">
        <header className="offers-section__heading">
          <div>
            <p className="eyebrow">{t("offersProductsEyebrow")}</p>
            <h2 id="discounted-products-title">{t("offersProductsTitle")}</h2>
          </div>
        </header>
        {catalogStatus === "loading" && (
          <div aria-label={t("catalogLoading")} className="product-grid product-grid--skeleton" role="status">
            {Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index} />)}
          </div>
        )}
        {catalogStatus === "error" && (
          <p className="offers-message offers-message--error" role="alert">{t("catalogError")}</p>
        )}
        {catalogStatus === "ready" && discountedProducts.length === 0 && (
          <p className="offers-message">{t("offersProductsEmpty")}</p>
        )}
        {catalogStatus === "ready" && discountedProducts.length > 0 && (
          <div aria-label={t("offersProductsTitle")} className="product-grid">
            {discountedProducts.map((product) => (
              <ProductCard
                key={product.id}
                offers={offers.filter((offer) => offer.productIds.includes(product.id))}
                onOpenReviews={onOpenReviews}
                product={product}
              />
            ))}
          </div>
        )}
      </section>

      {freeShippingProducts.length > 0 && (
        <section aria-labelledby="offers-shipping-title" className="offers-section">
          <header className="offers-section__heading">
            <div>
              <p className="eyebrow">{t("offersFreeShipping")}</p>
              <h2 id="offers-shipping-title">{t("offersShippingProductsTitle")}</h2>
            </div>
          </header>
          <div aria-label={t("offersShippingProductsTitle")} className="product-grid">
            {freeShippingProducts.map((product) => (
              <ProductCard
                key={product.id}
                offers={offers.filter((offer) => offer.isFreeShipping && offer.productIds.includes(product.id))}
                onOpenReviews={onOpenReviews}
                product={product}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AnnouncementBar({ banners }: { banners: HomepageContent["banners"] }) {
  const banner = banners[0];
  if (!banner) return null;
  const content = banner.title ?? banner.subtitle;
  if (!content) return null;
  return (
    <div className="announcement">
      {banner.linkUrl
        ? <a href={banner.linkUrl}>{content}</a>
        : <span>{content}</span>}
    </div>
  );
}

function CampaignSlider({ banners }: { banners: HomepageContent["banners"] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const banner = banners[active];

  if (!banner) return null;
  const style = {
    "--campaign-overlay": banner.overlayColor,
    "--campaign-opacity": banner.overlayOpacity / 100,
    "--campaign-blur": `${banner.blur}px`,
  } as CSSProperties;
  const text = (
    <>
      <div className="campaign-slide__copy">
        {banner.subtitle && <p className="eyebrow">{banner.subtitle}</p>}
        {banner.title && <h1>{banner.title}</h1>}
        {(banner.buttonLabel || banner.linkUrl) && (
          <div className="campaign-slide__actions">
            <a className="campaign-slide__button" href={banner.linkUrl ?? "#product-catalog"}>
              {banner.buttonLabel ?? "تسوقي الآن"}
            </a>
          </div>
        )}
      </div>
      {banner.desktopImageUrl && (
        <picture className="campaign-slide__media">
          {banner.mobileImageUrl && <source media="(max-width: 48rem)" srcSet={banner.mobileImageUrl} />}
          <img alt={banner.title ?? t("homepageBannerImageAlt")} fetchPriority="high" src={resolvePublicImageUrl(banner.desktopImageUrl)} />
        </picture>
      )}
      {!banner.desktopImageUrl && <span aria-hidden="true" className="campaign-slide__art" />}
      <span aria-hidden="true" className="campaign-slide__overlay" />
    </>
  );

  return (
    <section aria-label={t("homepageHero")} aria-roledescription={t("homepageCarousel")} className="campaign-slider" role="region">
      <div
        aria-label={t("homepageBannerNumber", { number: active + 1 })}
        aria-roledescription={t("homepageSlide")}
        className="campaign-slide"
        key={banner.id}
        role="group"
        style={style}
      >
        {text}
      </div>
      {banners.length > 1 && (
        <div className="campaign-controls">
          <button
            aria-label={t("homepagePreviousBanner")}
            onClick={() => setActive((value) => (value + banners.length - 1) % banners.length)}
            type="button"
          >‹</button>
          <div className="campaign-dots" role="group" aria-label={t("homepageChooseBanner")}>
            {banners.map((item, index) => (
              <button
                aria-current={index === active ? "true" : undefined}
                aria-label={t("homepageBannerNumber", { number: index + 1 })}
                key={item.id}
                onClick={() => setActive(index)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label={t("homepageNextBanner")}
            onClick={() => setActive((value) => (value + 1) % banners.length)}
            type="button"
          >›</button>
        </div>
      )}
      {banners.length === 1 && <div aria-hidden="true" className="hero-dots"><i /><i /><i /></div>}
    </section>
  );
}

function HeroSidePromotions({ topBanners, bottomBanners }: {
  topBanners: HomepageContent["banners"];
  bottomBanners: HomepageContent["banners"];
}) {
  if (topBanners.length === 0 && bottomBanners.length === 0) return null;
  return (
    <div className="hero-side-promotions">
      {topBanners.length > 0 && <PromotionBanners banners={topBanners} className="hero-side-promotions__top" />}
      {bottomBanners.length > 0 && <PromotionBanners banners={bottomBanners} className="hero-side-promotions__bottom" />}
    </div>
  );
}

function DefaultHero({ imageUrl }: { imageUrl: string | null }) {
  return (
    <section aria-labelledby="default-hero-title" className="default-hero">
      <div aria-hidden="true" className="default-hero__art">
        {imageUrl && <ImageWithFallback alt="" className="default-hero__image" imageUrl={imageUrl} />}
      </div>
      <div className="default-hero__content">
        <p className="eyebrow">متجر زنقة</p>
        <h1 id="default-hero-title">أناقتك تبدأ من هنا</h1>
        <p>أحدث الموديلات وأفضل مستلزمات البيت بأسعار تناسبك، وتوصيل لكل المحافظات.</p>
        <div className="default-hero__actions">
          <a className="default-hero__button" href="#product-catalog">تسوقي الآن</a>
          <a className="default-hero__button default-hero__button--secondary" href="#flash-sale">عروض اليوم</a>
        </div>
      </div>
      <div aria-hidden="true" className="hero-dots"><i /><i /><i /></div>
    </section>
  );
}

function HomepageSections({
  sections,
  banners,
  timerBanners,
  finalBanners,
  bundles,
  bundlesStatus,
  offers,
  offersStatus,
  products,
  onCategorySelect,
  onOpenBundle,
  onOpenReviews,
}: {
  sections: HomepageSection[];
  banners: HomepageContent["banners"];
  timerBanners: HomepageContent["banners"];
  finalBanners: HomepageContent["banners"];
  bundles: BundlePublic[];
  bundlesStatus: OffersStatus;
  offers: ProductOfferPublic[];
  offersStatus: OffersStatus;
  products: CatalogProduct[];
  onCategorySelect: (slug: string) => void;
  onOpenBundle: (bundle: BundlePublic) => void;
  onOpenReviews?: (product: CatalogProduct) => void;
}) {
  let campaignRendered = false;
  return (
    <div className="homepage-sections">
      {sections.map((section) => {
        const content = (
          <SectionContent
            key={section.id}
            onCategorySelect={onCategorySelect}
            onOpenReviews={onOpenReviews}
            section={section}
          />
        );
        const categoryExtras = section.type === "CATEGORIES" ? (
          <>
            <FlashSale
              banners={timerBanners}
              offers={offers}
              offersStatus={offersStatus}
              onOpenReviews={onOpenReviews}
              products={products}
            />
            <BundleOffers bundles={bundles} bundlesStatus={bundlesStatus} onOpenBundle={onOpenBundle} />
          </>
        ) : null;
        if (section.type === "SEASONAL_OFFERS" && banners.length > 0 && !campaignRendered) {
          campaignRendered = true;
          return (
            <div className="homepage-sections__campaign" key={`campaign-${section.id}`}>
              <Reveal>{content}</Reveal>
              <PromotionBanners banners={banners} />
            </div>
          );
        }
        return (
          <div className="homepage-section-group" key={section.id}>
            <Reveal>{content}</Reveal>
            {categoryExtras}
          </div>
        );
      })}
      {!sections.some((section) => section.type === "CATEGORIES") && (
        <>
          <FlashSale banners={timerBanners} offers={offers} offersStatus={offersStatus} onOpenReviews={onOpenReviews} products={products} />
          <BundleOffers bundles={bundles} bundlesStatus={bundlesStatus} onOpenBundle={onOpenBundle} />
        </>
      )}
      {!campaignRendered && banners.length > 0 && <PromotionBanners banners={banners} />}
      {finalBanners.length > 0 && <PromotionBanners banners={finalBanners} className="homepage-final-banners" />}
    </div>
  );
}

function FlashSale({
  banners,
  products,
  offers,
  offersStatus,
  onOpenReviews,
}: {
  banners: HomepageContent["banners"];
  products: CatalogProduct[];
  offers: ProductOfferPublic[];
  offersStatus: OffersStatus;
  onOpenReviews?: (product: CatalogProduct) => void;
}) {
  const [remaining, setRemaining] = useState(getDailyCountdown);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getDailyCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const discountedProducts = products
    .filter((product) => product.variants.some((variant) => variant.stockQuantity > 0)
      && offers.some((offer) => offer.productIds.includes(product.id)))
    .slice(0, 4);

  return (
    <section aria-labelledby="flash-sale-title" className="flash-sale" id="flash-sale">
      <header className="flash-sale__header">
        {banners[0]
          ? <PromotionBanners banners={banners.slice(0, 1)} className="flash-sale__banner" />
          : <div><h2 id="flash-sale-title">عروض سريعة</h2><p>خصومات لفترة محدودة</p></div>}
        <div aria-label="الوقت المتبقي" className="flash-sale__timer" dir="ltr">
          {remaining.map((value, index) => (
            <div className="flash-sale__timer-unit" key={index}>
              <strong>{value}</strong>
              <small>{["ساعة", "دقيقة", "ثانية"][index]}</small>
            </div>
          ))}
        </div>
      </header>
      {offersStatus === "error" && <p className="flash-sale__message" role="status">تعذر تحميل العروض حاليًا.</p>}
      {offersStatus === "loading" && (
        <p className="flash-sale__message" role="status">جارٍ تحميل العروض...</p>
      )}
      {offersStatus === "ready" && discountedProducts.length > 0 && (
        <div className="product-grid flash-sale__products">
          {discountedProducts.map((product) => (
            <ProductCard
              key={product.id}
              offers={offers.filter((offer) => offer.productIds.includes(product.id))}
              onOpenReviews={onOpenReviews}
              product={product}
            />
          ))}
        </div>
      )}
      {offersStatus === "ready" && discountedProducts.length === 0 && (
        <p className="flash-sale__message">ترقبي عروضنا الجديدة قريبًا.</p>
      )}
    </section>
  );
}

function getDailyCountdown(): [string, string, string] {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => value.toString().padStart(2, "0")) as [string, string, string];
}

function BundleOffers({
  bundles,
  bundlesStatus,
  onOpenBundle,
}: {
  bundles: BundlePublic[];
  bundlesStatus: OffersStatus;
  onOpenBundle: (bundle: BundlePublic) => void;
}) {
  return (
    <section aria-labelledby="bundle-offers-title" className="bundle-offers">
      <header className="section-heading">
        <h2 id="bundle-offers-title">عروض المجموعات</h2>
      </header>
      {bundlesStatus === "loading" && <p role="status">جارٍ تحميل المجموعات...</p>}
      {bundlesStatus === "error" && <p role="alert">تعذر تحميل عروض المجموعات.</p>}
      {bundlesStatus === "ready" && bundles.length === 0 && (
        <p className="bundle-offers__empty">لا توجد عروض مجموعات متاحة حاليًا.</p>
      )}
      {bundlesStatus === "ready" && bundles.length > 0 && (
        <div className="bundle-offers__grid">
          {bundles.slice(0, 2).map((bundle) => {
            const originalPrice = bundle.totalOriginalPriceCents
              ?? bundle.items.reduce((total, item) => {
                const variant = item.product?.variants.find(({ id }) => id === item.defaultVariantId)
                  ?? item.product?.variants[0];
                return total + (variant?.priceCents ?? 0) * item.quantity;
              }, 0);
            const finalPrice = bundle.finalPriceCents
              ?? (bundle.fixedPriceCents ?? Math.max(0, originalPrice - (bundle.discountCents ?? 0)));
            return (
              <article className="bundle-offer-card" key={bundle.id}>
                <div aria-label={bundle.publicTitle} className="bundle-offer-card__images">
                  {bundle.items.slice(0, 3).map((item) => (
                    <span className="bundle-offer-card__image" key={item.id}>
                      <ImageWithFallback
                        alt={item.product?.name ?? ""}
                        imageUrl={item.product?.imageUrl ?? bundle.imageUrl ?? null}
                      />
                    </span>
                  ))}
                </div>
                <div className="bundle-offer-card__details">
                  <h3>{bundle.publicTitle}</h3>
                  {bundle.description && <p>{bundle.description}</p>}
                  <div className="bundle-offer-card__price">
                    <strong>{formatEGP(finalPrice)}</strong>
                    {originalPrice > finalPrice && <del>{formatEGP(originalPrice)}</del>}
                  </div>
                  <button disabled={(bundle.availableStock ?? 0) <= 0} onClick={() => onOpenBundle(bundle)} type="button">
                    أضيفي المجموعة
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionContent({
  section,
  onCategorySelect,
  onOpenReviews,
}: {
  section: HomepageSection;
  onCategorySelect: (slug: string) => void;
  onOpenReviews?: (product: CatalogProduct) => void;
}) {
  const { t } = useTranslation();
  const [showAllCategories, setShowAllCategories] = useState(false);
  if (section.type === "CATEGORIES") {
    const visibleCategories = showAllCategories ? section.categories : section.categories.slice(0, 6);
    return (
      <section aria-labelledby={`section-${section.id}`} className="category-section">
        <SectionHeading
          onViewAll={() => setShowAllCategories((current) => !current)}
          section={section}
          viewAllLabel={showAllCategories ? "عرض أقل" : "عرض الكل"}
        />
        <div className="category-grid">
          {visibleCategories.map((category, index) => (
            <button
              className="category-card"
              key={category.id}
              onClick={() => onCategorySelect(category.slug)}
              type="button"
            >
              <span aria-hidden="true" className={`category-card__image category-card__image--${index % 6}`}>
                {category.imageUrl && <ImageWithFallback alt="" imageUrl={category.imageUrl} />}
              </span>
              <span className="category-card__name">{category.name}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "NEW_ARRIVALS" || section.type === "BEST_SELLERS" ||
      section.type === "FEATURED_COLLECTIONS" || section.type === "SEASONAL_OFFERS" ||
      section.type === "RECENTLY_VIEWED") {
    return (
      <section
        aria-labelledby={`section-${section.id}`}
        className={`product-shelf product-shelf--${section.type.toLowerCase()}`}
        id={section.type === "NEW_ARRIVALS" ? "new-arrivals" : undefined}
      >
        <SectionHeading section={section} />
        <div className="product-grid">
          {(section.type === "NEW_ARRIVALS" ? section.products.slice(0, 4) : section.products).map((product) => (
            <ProductCard
              key={product.id}
              onOpenReviews={onOpenReviews}
              product={product}
            />
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "BRAND_STORY") {
    return (
      <section aria-labelledby={`section-${section.id}`} className="editorial-section">
        {section.imageUrl && <ImageWithFallback alt="" className="editorial-section__image" imageUrl={section.imageUrl} />}
        <div className="editorial-section__copy">
          <SectionHeading section={section} />
          {section.description && <p>{section.description}</p>}
          {section.buttonLabel && section.linkUrl && <a className="editorial-section__link" href={section.linkUrl}>{section.buttonLabel}</a>}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={`section-${section.id}`} className={`editorial-note editorial-note--${section.type.toLowerCase()}`}>
      <SectionHeading section={section} />
      {section.description && <p>{section.description}</p>}
      {section.buttonLabel && section.linkUrl && <a className="editorial-section__link" href={section.linkUrl}>{section.buttonLabel}</a>}
      {section.type === "SOCIAL" && section.linkUrl && (
        <a aria-label={t("homepageVisitSocial")} className="editorial-note__social" href={section.linkUrl} rel="noreferrer" target="_blank">
          {t("homepageVisitSocial")}
        </a>
      )}
    </section>
  );
}

function SectionHeading({
  section,
  onViewAll,
  viewAllLabel = "عرض الكل",
}: {
  section: HomepageSection;
  onViewAll?: () => void;
  viewAllLabel?: string;
}) {
  const showViewAll = section.type === "CATEGORIES" || section.type === "NEW_ARRIVALS";
  return (
    <header className="section-heading">
      <div>
        {section.subtitle && <p className="eyebrow">{section.subtitle}</p>}
        <h2 id={`section-${section.id}`}>
          {section.type === "CATEGORIES"
            ? "تسوقي حسب القسم"
            : section.type === "NEW_ARRIVALS"
              ? "وصل حديثاً"
              : section.title}
        </h2>
      </div>
      {section.buttonLabel && section.linkUrl
        ? <a href={section.linkUrl}>{section.buttonLabel}<span aria-hidden="true"> ←</span></a>
        : showViewAll && (onViewAll
          ? <button className="section-heading__view-all" onClick={onViewAll} type="button">{viewAllLabel}</button>
          : <a href="#new-arrivals">{viewAllLabel}<span aria-hidden="true"> ←</span></a>)}
    </header>
  );
}

function PromotionBanners({
  banners,
  className = "",
}: {
  banners: HomepageContent["banners"];
  className?: string;
}) {
  const { t } = useTranslation();
  if (banners.length === 0) {
    return (
      <section aria-label="عروض المتجر" className={`promotion-grid ${className}`.trim()}>
        <article className="promotion-card promotion-card--default promotion-card--tableware">
          <span className="promotion-card__copy">
            <small>مستلزمات المنزل</small>
            <strong>خصم حتى 40% على أدوات المائدة</strong>
          </span>
        </article>
        <article className="promotion-card promotion-card--default promotion-card--shoes">
          <span className="promotion-card__copy">
            <small>أحذية</small>
            <strong>شحن مجاني على كل الأحذية</strong>
          </span>
        </article>
      </section>
    );
  }
  return (
    <section aria-label={t("homepagePromotions")} className={`promotion-grid ${className}`.trim()}>
      {banners.map((banner) => {
        const style = {
          "--campaign-overlay": banner.overlayColor,
          "--campaign-opacity": banner.overlayOpacity / 100,
          "--campaign-blur": `${banner.blur}px`,
        } as CSSProperties;
        const content = (
          <>
            {banner.desktopImageUrl && (
              <picture className="promotion-card__media">
                {banner.mobileImageUrl && <source media="(max-width: 48rem)" srcSet={banner.mobileImageUrl} />}
                <img alt="" className="promotion-card__image" src={resolvePublicImageUrl(banner.desktopImageUrl)} />
              </picture>
            )}
            <span aria-hidden="true" className="promotion-card__overlay" />
            <span className="promotion-card__copy">
              {banner.subtitle && <small>{banner.subtitle}</small>}
              {banner.title && <strong>{banner.title}</strong>}
              {banner.buttonLabel && <span className="campaign-slide__button">{banner.buttonLabel}</span>}
            </span>
          </>
        );
        return banner.linkUrl
          ? <a className="promotion-card" href={banner.linkUrl} key={banner.id} style={style}>{content}</a>
          : <article className="promotion-card" key={banner.id} style={style}>{content}</article>;
      })}
    </section>
  );
}

function StoreBenefits() {
  return (
    <section aria-label="مميزات التسوق" className="store-benefits">
      <article>
        <strong>الدفع عند الاستلام</strong>
        <span>ادفعي عند استلام طلبكِ</span>
      </article>
      <article>
        <strong>شحن لكل المحافظات</strong>
        <span>شحن مجاني للطلبات فوق 1,000 ج.م</span>
      </article>
      <article>
        <strong>استرجاع سهل</strong>
        <span>سياسة استبدال واسترجاع واضحة</span>
      </article>
      <article>
        <strong>دعم على واتساب</strong>
        <span>نحن هنا لمساعدتكِ</span>
      </article>
    </section>
  );
}

function ProductCard({
  product,
  offers = [],
  onOpenReviews,
}: {
  product: CatalogProduct;
  offers?: ProductOfferPublic[];
  onOpenReviews?: (product: CatalogProduct) => void;
}) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [addedNotice, setAddedNotice] = useState(false);
  const isWishlisted = isInWishlist(product.id);
  const selectedVariant = product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0];
  const isAvailable = Boolean(selectedVariant && selectedVariant.stockQuantity > 0);
  const swatches = product.variants
    .map((variant) => ({ id: variant.id, name: variant.name, color: productVariantColor(variant.name) }))
    .filter((variant): variant is { id: string; name: string; color: string } => Boolean(variant.color));

  const matchingOffer = offers.find((o) => o.productIds.includes(product.id));
  let unitDiscount = 0;
  if (matchingOffer && selectedVariant) {
    if (matchingOffer.discountType === "PERCENTAGE") {
      unitDiscount = Math.round((selectedVariant.priceCents * matchingOffer.discountValue) / 100);
      if (matchingOffer.maxDiscountCents && unitDiscount > matchingOffer.maxDiscountCents) {
        unitDiscount = matchingOffer.maxDiscountCents;
      }
    } else {
      unitDiscount = Math.min(matchingOffer.discountValue, selectedVariant.priceCents);
    }
  }

  const effectivePriceCents = selectedVariant
    ? Math.max(0, selectedVariant.priceCents - unitDiscount)
    : 0;

  function handleToggleWishlist(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageUrl,
        priceCents: selectedVariant ? selectedVariant.priceCents : 0,
      },
      selectedVariant?.id,
    );
  }

  function handleAddToCart() {
    if (!selectedVariant || !isAvailable) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      variantName: selectedVariant.name,
      priceCents: effectivePriceCents,
      imageUrl: product.imageUrl,
    });
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  }

  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link to={`/products/${product.slug}`} style={{ display: "block", height: "100%", textDecoration: "none" }}>
          <ImageWithFallback
            alt={product.name}
            emptyText={t("productImageMissing")}
            imageUrl={product.imageUrl ?? null}
          />
        </Link>
        {!isAvailable && <span className="product-card__badge">{t("productUnavailable")}</span>}
        {isAvailable && matchingOffer && (
          <span className="product-card__badge">
            {matchingOffer.discountType === "PERCENTAGE"
              ? `-${matchingOffer.discountValue}%`
              : `وفر ${formatEGP(matchingOffer.discountValue)}`}
          </span>
        )}
        {isAvailable && matchingOffer?.isFreeShipping && (
          <span className="product-card__badge product-card__badge--shipping">
            شحن مجاني
          </span>
        )}
        <button
          aria-label={isWishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          className={`product-card__wishlist-btn${isWishlisted ? " product-card__wishlist-btn--active" : ""}`}
          onClick={handleToggleWishlist}
          type="button"
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="product-card__body">
        <h3>
          <Link to={`/products/${product.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
            {product.name}
          </Link>
        </h3>
        {onOpenReviews && (
          <button
            type="button"
            className="product-card__reviews-btn"
            onClick={() => onOpenReviews(product)}
            title="عرض تقييمات وآراء العملاء"
          >
            ★ التقييمات
          </button>
        )}
        <div className="product-card__footer">
          {selectedVariant ? (
            <div>
              <p className="product-card__price">{formatEGP(effectivePriceCents)}</p>
              {unitDiscount > 0 && (
                <del className="product-card__old-price">{formatEGP(selectedVariant.priceCents)}</del>
              )}
            </div>
          ) : (
            <p className="product-card__price">{t("productUnavailable")}</p>
          )}

          {swatches.length > 0 && (
            <div aria-label="الألوان المتاحة" className="product-card__swatches">
              {swatches.map((swatch) => <span aria-label={swatch.name} key={swatch.id} style={{ backgroundColor: swatch.color }} />)}
            </div>
          )}
        </div>
        <button
          className={`product-card__add-btn${addedNotice ? " product-card__add-btn--added" : ""}`}
          disabled={!isAvailable}
          onClick={handleAddToCart}
          type="button"
        >
          {addedNotice ? t("cartAddedToCart") : t("cartAddToCart")}
        </button>
      </div>
    </article>
  );
}

function productVariantColor(name: string): string | null {
  const normalized = name.toLowerCase();
  const colors: Array<[RegExp, string]> = [
    [/أسود|black/, "#171717"],
    [/أبيض|ابيض|white/, "#f5f2ee"],
    [/أحمر|احمر|red/, "#9e1b45"],
    [/أزرق|ازرق|كحلي|blue|navy/, "#17274b"],
    [/أخضر|اخضر|green/, "#39745d"],
    [/بيج|beige|cream/, "#dfc19b"],
    [/بني|brown/, "#795548"],
    [/وردي|pink/, "#d58c9b"],
    [/ذهبي|gold/, "#c49a55"],
    [/رمادي|gray|grey/, "#8b8b8b"],
  ];
  return colors.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function ImageWithFallback({
  imageUrl,
  alt,
  className = "",
  emptyText,
}: {
  imageUrl: string | null;
  alt: string;
  className?: string;
  emptyText?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  if (!imageUrl || failed) {
    return (
      <span
        aria-label={emptyText || alt || undefined}
        className={`image-fallback${emptyText ? " image-fallback--empty" : ""} ${className}`}
        role={alt || emptyText ? "img" : undefined}
      >
        {emptyText ?? <BrandMark compact />}
      </span>
    );
  }
  return <img alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} src={resolvePublicImageUrl(imageUrl)} />;
}

function Footer({ homepage }: { homepage: HomepageContent | null }) {
  const { t } = useTranslation();
  const social = homepage?.sections.find((section) => section.type === "SOCIAL");
  return (
    <footer className="store-footer">
      <div className="store-footer__main">
        <div className="store-footer__brand">
          <Link aria-label={t("brandName")} className="store-brand" to="/">
            <BrandMark compact />
            <span className="store-brand__name">{t("brandName")}</span>
          </Link>
          <p>{t("footerIntro")}</p>
        </div>
        <div>
          <h2>{t("footerCustomerService")}</h2>
          <Link to="/account">{t("customerAccountLink")}</Link>
          <Link to="/faq">الأسئلة الشائعة</Link>
          <Link to="/contact">تواصلي معنا</Link>
          <Link to="/offers">العروض والمجموعات</Link>
        </div>
        <div>
          <h2>السياسات</h2>
          <Link to="/returns">الشحن والاستبدال</Link>
          <Link to="/returns">الاسترجاع والاسترداد</Link>
          <Link to="/terms">الخصوصية</Link>
          <Link to="/terms">الشروط والأحكام</Link>
        </div>
        <div>
          <h2>{social?.title ?? "تابعينا"}</h2>
          <p>{social?.description ?? "تابعينا لتصلك أحدث المنتجات والعروض."}</p>
          {social?.linkUrl && (
            <a href={social.linkUrl} rel="noreferrer" target="_blank">
              {social.buttonLabel || t("homepageVisitSocial")}
            </a>
          )}
        </div>
      </div>
      <div className="store-footer__bottom">
        <span>© {new Date().getFullYear()} {t("brandName")}</span>
        <span>{t("copyright")}</span>
      </div>
    </footer>
  );
}

function WeeklyPromo() {
  return (
    <section aria-labelledby="weekly-promo-title" className="weekly-promo">
      <div>
        <p>عرض الأسبوع</p>
        <h2 id="weekly-promo-title">اشتري 2 واحصلي على خصم 15%</h2>
        <a href="/offers">اكتشفي العرض</a>
      </div>
      <span aria-hidden="true" className="weekly-promo__art" />
    </section>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -48px 0px", threshold: 0.08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className={`scroll-reveal${visible ? " scroll-reveal--visible" : ""}`} ref={elementRef}>{children}</div>;
}

function sectionHasContent(section: HomepageSection): boolean {
  if (section.type === "RECENTLY_VIEWED") return false;
  if (section.type === "CATEGORIES") return section.categories.length > 0;
  if (["NEW_ARRIVALS", "BEST_SELLERS", "FEATURED_COLLECTIONS", "SEASONAL_OFFERS", "RECENTLY_VIEWED"].includes(section.type)) {
    return section.products.length > 0;
  }
  return Boolean(section.title || section.description || section.imageUrl);
}
