import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import AdminLayout from "../components/AdminLayout";
import AdminImageField from "../components/AdminImageField";
import {
  deleteHomepageBanner,
  deleteHomepageSection,
  HomepageRequestError,
  loadAdminHomepage,
  reorderHomepageSections,
  saveCategoryImages,
  saveHomepageBanner,
  saveHomepageSection,
  saveProductImage,
  type HomepageAdminContent,
} from "../../homepage/api/homepage";
import { getAdminSession } from "../api/auth";
import type { HomepageBannerInput, HomepageSectionInput } from "@store/shared";

type SectionRecord = HomepageAdminContent["sections"][number];
type BannerRecord = HomepageAdminContent["banners"][number];
type CategoryRecord = HomepageAdminContent["categories"][number];
type SectionDraft = HomepageSectionInput & { id?: string };
type BannerDraft = HomepageBannerInput & { id?: string };

const sectionTypes: HomepageSectionInput["type"][] = [
  "CATEGORIES",
  "NEW_ARRIVALS",
  "BEST_SELLERS",
  "FEATURED_COLLECTIONS",
  "SEASONAL_OFFERS",
  "BRAND_STORY",
  "RECENTLY_VIEWED",
  "BENEFITS",
  "NEWSLETTER",
  "SOCIAL",
];

const emptySection = (sortOrder: number): SectionDraft => ({
  type: "NEW_ARRIVALS",
  title: "",
  subtitle: null,
  description: null,
  imageUrl: null,
  buttonLabel: null,
  linkUrl: null,
  isEnabled: true,
  sortOrder,
  startsAt: null,
  endsAt: null,
  productIds: [],
  categoryIds: [],
});

const emptyBanner = (sortOrder: number): BannerDraft => ({
  slot: "HERO",
  title: "",
  subtitle: null,
  desktopImageUrl: null,
  mobileImageUrl: null,
  buttonLabel: null,
  linkUrl: null,
  overlayColor: "#0A1733",
  overlayOpacity: 35,
  blur: 0,
  isEnabled: true,
  sortOrder,
  startsAt: null,
  endsAt: null,
});

function asSectionDraft(section: SectionRecord): SectionDraft {
  return {
    ...section,
    subtitle: section.subtitle ?? null,
    description: section.description ?? null,
    imageUrl: section.imageUrl ?? null,
    buttonLabel: section.buttonLabel ?? null,
    linkUrl: section.linkUrl ?? null,
    startsAt: section.startsAt ?? null,
    endsAt: section.endsAt ?? null,
  };
}

function sectionPayload(draft: SectionDraft): { id?: string; input: HomepageSectionInput } {
  const { id, ...input } = draft;
  return { ...(id ? { id } : {}), input };
}

function asBannerDraft(banner: BannerRecord): BannerDraft {
  return {
    ...banner,
    title: banner.title ?? null,
    subtitle: banner.subtitle ?? null,
    desktopImageUrl: banner.desktopImageUrl ?? null,
    mobileImageUrl: banner.mobileImageUrl ?? null,
    buttonLabel: banner.buttonLabel ?? null,
    linkUrl: banner.linkUrl ?? null,
    startsAt: banner.startsAt ?? null,
    endsAt: banner.endsAt ?? null,
  };
}

function bannerPayload(draft: BannerDraft): { id?: string; input: HomepageBannerInput } {
  const { id, ...input } = draft;
  return { ...(id ? { id } : {}), input };
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function HomepageManagement() {
  const { t } = useTranslation();
  const [content, setContent] = useState<HomepageAdminContent | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SectionDraft | null>(null);
  const [bannerDraft, setBannerDraft] = useState<BannerDraft | null>(null);
  const [productImageDrafts, setProductImageDrafts] = useState<Record<string, string>>({});
  const [categoryImageDrafts, setCategoryImageDrafts] = useState<Record<string, { imageUrl: string; bannerImageUrl: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void getAdminSession(controller.signal)
      .then(async (session) => {
        if (!session) throw new HomepageRequestError("unauthorized");
        const result = await loadAdminHomepage(controller.signal);
        if (controller.signal.aborted) return;
        setCsrfToken(session.csrfToken);
        setContent(result);
        setProductImageDrafts(Object.fromEntries(result.products.map(({ id, imageUrl }) => [id, imageUrl ?? ""])));
        setCategoryImageDrafts(Object.fromEntries(result.categories.map((category) => [
          category.id,
          { imageUrl: category.imageUrl ?? "", bannerImageUrl: category.bannerImageUrl ?? "" },
        ])));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorText(reason, t));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [t]);

  function showFailure(reason: unknown) {
    setError(errorText(reason, t));
    setNotice("");
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionDraft || !csrfToken) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { id, input } = sectionPayload(sectionDraft);
      await saveHomepageSection(input, csrfToken, id);
      setSectionDraft(null);
      setNotice(t("homepageSaved"));
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bannerDraft || !csrfToken) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { id, input } = bannerPayload(bannerDraft);
      await saveHomepageBanner(input, csrfToken, id);
      setBannerDraft(null);
      setNotice(t("homepageSaved"));
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(section: SectionRecord) {
    if (!csrfToken || !window.confirm(t("homepageConfirmDelete"))) return;
    setBusy(true);
    setError("");
    try {
      await deleteHomepageSection(section.id, csrfToken);
      setNotice(t("homepageDeleted"));
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function removeBanner(banner: BannerRecord) {
    if (!csrfToken || !window.confirm(t("homepageConfirmDelete"))) return;
    setBusy(true);
    setError("");
    try {
      await deleteHomepageBanner(banner.id, csrfToken);
      setNotice(t("homepageDeleted"));
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSection(section: SectionRecord) {
    if (!csrfToken) return;
    setBusy(true);
    setError("");
    try {
      const { input } = sectionPayload({ ...asSectionDraft(section), isEnabled: !section.isEnabled });
      await saveHomepageSection(input, csrfToken, section.id);
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBanner(banner: BannerRecord) {
    if (!csrfToken) return;
    setBusy(true);
    setError("");
    try {
      const { input } = bannerPayload({ ...asBannerDraft(banner), isEnabled: !banner.isEnabled });
      await saveHomepageBanner(input, csrfToken, banner.id);
      setContent(await loadAdminHomepage());
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function moveSection(index: number, offset: -1 | 1) {
    if (!content || !csrfToken) return;
    const target = index + offset;
    if (target < 0 || target >= content.sections.length) return;
    const sections = [...content.sections];
    [sections[index], sections[target]] = [sections[target]!, sections[index]!];
    setBusy(true);
    setError("");
    try {
      await reorderHomepageSections(sections.map(({ id }) => id), csrfToken);
      setContent({ ...content, sections: sections.map((section, sortOrder) => ({ ...section, sortOrder })) });
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function saveProductMedia(productId: string) {
    if (!content || !csrfToken) return;
    setBusy(true);
    setError("");
    try {
      const imageUrl = productImageDrafts[productId]?.trim() || null;
      await saveProductImage(productId, imageUrl, csrfToken);
      setContent({
        ...content,
        products: content.products.map((product) => product.id === productId ? { ...product, imageUrl } : product),
      });
      setNotice(t("homepageSaved"));
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  async function saveCategoryMedia(categoryId: string) {
    if (!content || !csrfToken) return;
    setBusy(true);
    setError("");
    try {
      const imageUrl = categoryImageDrafts[categoryId]?.imageUrl.trim() || null;
      const bannerImageUrl = categoryImageDrafts[categoryId]?.bannerImageUrl.trim() || null;
      await saveCategoryImages(categoryId, imageUrl, bannerImageUrl, csrfToken);
      setContent({
        ...content,
        categories: content.categories.map((category) => category.id === categoryId
          ? { ...category, imageUrl, bannerImageUrl }
          : category),
      });
      setNotice(t("homepageSaved"));
    } catch (reason) {
      showFailure(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      title={t("homepageManagementTitle")}
      subtitle={t("homepageManagementIntro")}
      headerActions={(
        <button
          className="customer-primary-button"
          disabled={busy || loading}
          onClick={() => setSectionDraft(emptySection(content?.sections.length ?? 0))}
          type="button"
        >
          {t("homepageAddSection")}
        </button>
      )}
    >
    {loading ? <p aria-live="polite" className="homepage-admin-state">{t("catalogLoading")}</p> : <div className="homepage-admin">
      <header className="homepage-admin__heading">
        <div>
          <p className="eyebrow">{t("content")}</p>
          <h1>{t("homepageManagementTitle")}</h1>
          <p>{t("homepageManagementIntro")}</p>
        </div>
      </header>
      {error && <p className="customer-form-error" role="alert">{error}</p>}
      {notice && <p className="customer-form-success" role="status">{notice}</p>}

      <section className="homepage-admin__panel" aria-labelledby="homepage-sections-title">
        <div className="homepage-admin__panel-heading">
          <h2 id="homepage-sections-title">{t("homepageSectionsTitle")}</h2>
        </div>
        {content?.sections.length ? (
          <ol className="homepage-admin__list">
            {content.sections.map((section, index) => (
              <li className="homepage-admin__list-item" key={section.id}>
                <div>
                  <strong>{section.title || t(`homepageSection_${section.type}`)}</strong>
                  <small>{t(`homepageSection_${section.type}`)} · {section.isEnabled ? t("homepageEnabled") : t("homepageDisabled")}</small>
                </div>
                <div className="homepage-admin__actions">
                  <button disabled={busy || index === 0} onClick={() => void moveSection(index, -1)} type="button">{t("homepageMoveUp")}</button>
                  <button disabled={busy || index === content.sections.length - 1} onClick={() => void moveSection(index, 1)} type="button">{t("homepageMoveDown")}</button>
                  <button disabled={busy} onClick={() => void toggleSection(section)} type="button">{t(section.isEnabled ? "homepageDisable" : "homepageEnable")}</button>
                  <button disabled={busy} onClick={() => setSectionDraft(asSectionDraft(section))} type="button">{t("homepageEdit")}</button>
                  <button className="homepage-admin__danger" disabled={busy} onClick={() => void removeSection(section)} type="button">{t("homepageDelete")}</button>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="homepage-admin__empty">{t("homepageNoSections")}</p>}
        {sectionDraft && (
          <form className="homepage-admin__form" onSubmit={saveSection}>
            <h3>{t(sectionDraft.id ? "homepageEditSection" : "homepageAddSection")}</h3>
            <div className="homepage-admin__form-grid">
              <label>{t("homepageSectionType")}
                <select value={sectionDraft.type} onChange={(event) => setSectionDraft({ ...sectionDraft, type: event.target.value as HomepageSectionInput["type"] })}>
                  {sectionTypes.map((type) => <option disabled={type === "RECENTLY_VIEWED"} key={type} value={type}>{t(`homepageSection_${type}`)}</option>)}
                </select>
              </label>
              <label>{t("homepageTitle")}
                <input maxLength={120} required value={sectionDraft.title} onChange={(event) => setSectionDraft({ ...sectionDraft, title: event.target.value })} />
              </label>
              <label>{t("homepageSubtitle")}
                <input maxLength={240} value={sectionDraft.subtitle ?? ""} onChange={(event) => setSectionDraft({ ...sectionDraft, subtitle: event.target.value || null })} />
              </label>
              <AdminImageField csrfToken={csrfToken} label={t("homepageImageUrl")} value={sectionDraft.imageUrl ?? ""} onChange={(value) => setSectionDraft({ ...sectionDraft, imageUrl: value || null })} />
              <label>{t("homepageButtonLabel")}
                <input maxLength={80} value={sectionDraft.buttonLabel ?? ""} onChange={(event) => setSectionDraft({ ...sectionDraft, buttonLabel: event.target.value || null })} />
              </label>
              <label>{t("homepageLinkUrl")}
                <input value={sectionDraft.linkUrl ?? ""} onChange={(event) => setSectionDraft({ ...sectionDraft, linkUrl: event.target.value || null })} />
              </label>
              <label>{t("homepageStartAt")}
                <input type="datetime-local" value={toLocalDateTime(sectionDraft.startsAt)} onChange={(event) => setSectionDraft({ ...sectionDraft, startsAt: fromLocalDateTime(event.target.value) })} />
              </label>
              <label>{t("homepageEndAt")}
                <input type="datetime-local" value={toLocalDateTime(sectionDraft.endsAt)} onChange={(event) => setSectionDraft({ ...sectionDraft, endsAt: fromLocalDateTime(event.target.value) })} />
              </label>
              <label>{t("homepageSortOrder")}
                <input max={10_000} min={0} type="number" value={sectionDraft.sortOrder} onChange={(event) => setSectionDraft({ ...sectionDraft, sortOrder: Number(event.target.value) })} />
              </label>
            </div>
            <label>{t("homepageDescription")}
              <textarea maxLength={1_500} rows={3} value={sectionDraft.description ?? ""} onChange={(event) => setSectionDraft({ ...sectionDraft, description: event.target.value || null })} />
            </label>
            <label className="homepage-admin__check">
              <input checked={sectionDraft.isEnabled} type="checkbox" onChange={(event) => setSectionDraft({ ...sectionDraft, isEnabled: event.target.checked })} />
              {t("homepageEnabled")}
            </label>
            {content && sectionDraft.type !== "CATEGORIES" && sectionDraft.type !== "BRAND_STORY" && (
              <fieldset>
                <legend>{t("homepageChooseProducts")}</legend>
                <div className="homepage-admin__choices">
                  {content.products.map((product) => (
                    <label className="homepage-admin__check" key={product.id}>
                      <input
                        checked={sectionDraft.productIds.includes(product.id)}
                        type="checkbox"
                        onChange={(event) => setSectionDraft({
                          ...sectionDraft,
                          productIds: event.target.checked
                            ? [...sectionDraft.productIds, product.id]
                            : sectionDraft.productIds.filter((id) => id !== product.id),
                        })}
                      />
                      {product.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {content && (sectionDraft.type === "CATEGORIES" || sectionDraft.type === "FEATURED_COLLECTIONS") && (
              <fieldset>
                <legend>{t("homepageChooseCategories")}</legend>
                <div className="homepage-admin__choices">
                  {content.categories.map((category) => (
                    <label className="homepage-admin__check" key={category.id}>
                      <input
                        checked={sectionDraft.categoryIds.includes(category.id)}
                        type="checkbox"
                        onChange={(event) => setSectionDraft({
                          ...sectionDraft,
                          categoryIds: event.target.checked
                            ? [...sectionDraft.categoryIds, category.id]
                            : sectionDraft.categoryIds.filter((id) => id !== category.id),
                        })}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="homepage-admin__form-actions">
              <button className="customer-primary-button" disabled={busy} type="submit">{t(busy ? "homepageSaving" : "homepageSave")}</button>
              <button className="customer-secondary-button" onClick={() => setSectionDraft(null)} type="button">{t("cancel")}</button>
            </div>
          </form>
        )}
      </section>

      <section className="homepage-admin__panel" aria-labelledby="homepage-banners-title">
        <div className="homepage-admin__panel-heading">
          <h2 id="homepage-banners-title">{t("homepageBannersTitle")}</h2>
          <button className="customer-secondary-button" disabled={busy} onClick={() => setBannerDraft(emptyBanner(content?.banners.length ?? 0))} type="button">{t("homepageAddBanner")}</button>
        </div>
        {content?.banners.length ? (
          <ul className="homepage-admin__list homepage-admin__list--plain">
            {content.banners.map((banner) => (
              <li className="homepage-admin__list-item" key={banner.id}>
                <div>
                  <strong>{banner.title || t("homepageImageOnly")}</strong>
                  <small>{t(`homepageBanner_${banner.slot}`)} · {banner.isEnabled ? t("homepageEnabled") : t("homepageDisabled")}</small>
                </div>
                <div className="homepage-admin__actions">
                  <button disabled={busy} onClick={() => void toggleBanner(banner)} type="button">{t(banner.isEnabled ? "homepageDisable" : "homepageEnable")}</button>
                  <button disabled={busy} onClick={() => setBannerDraft(asBannerDraft(banner))} type="button">{t("homepageEdit")}</button>
                  <button className="homepage-admin__danger" disabled={busy} onClick={() => void removeBanner(banner)} type="button">{t("homepageDelete")}</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="homepage-admin__empty">{t("homepageNoBanners")}</p>}
        {bannerDraft && (
          <form className="homepage-admin__form" onSubmit={saveBanner}>
            <h3>{t(bannerDraft.id ? "homepageEditBanner" : "homepageAddBanner")}</h3>
            <div className="homepage-admin__form-grid">
              <label>{t("homepageBannerSlot")}
                <select value={bannerDraft.slot} onChange={(event) => setBannerDraft({ ...bannerDraft, slot: event.target.value as HomepageBannerInput["slot"] })}>
                  {(["ANNOUNCEMENT", "HERO", "PROMOTION"] as const).map((slot) => <option key={slot} value={slot}>{t(`homepageBanner_${slot}`)}</option>)}
                </select>
              </label>
              <label>{t("homepageTitle")}
                <input maxLength={120} value={bannerDraft.title ?? ""} onChange={(event) => setBannerDraft({ ...bannerDraft, title: event.target.value || null })} />
              </label>
              <label>{t("homepageSubtitle")}
                <input maxLength={240} value={bannerDraft.subtitle ?? ""} onChange={(event) => setBannerDraft({ ...bannerDraft, subtitle: event.target.value || null })} />
              </label>
              <AdminImageField csrfToken={csrfToken} label={t("homepageDesktopImageUrl")} value={bannerDraft.desktopImageUrl ?? ""} onChange={(value) => setBannerDraft({ ...bannerDraft, desktopImageUrl: value || null })} />
              <AdminImageField csrfToken={csrfToken} label={t("homepageMobileImageUrl")} value={bannerDraft.mobileImageUrl ?? ""} onChange={(value) => setBannerDraft({ ...bannerDraft, mobileImageUrl: value || null })} />
              <label>{t("homepageButtonLabel")}
                <input maxLength={80} value={bannerDraft.buttonLabel ?? ""} onChange={(event) => setBannerDraft({ ...bannerDraft, buttonLabel: event.target.value || null })} />
              </label>
              <label>{t("homepageLinkUrl")}
                <input value={bannerDraft.linkUrl ?? ""} onChange={(event) => setBannerDraft({ ...bannerDraft, linkUrl: event.target.value || null })} />
              </label>
              <label>{t("homepageOverlayColor")}
                <input type="color" value={bannerDraft.overlayColor} onChange={(event) => setBannerDraft({ ...bannerDraft, overlayColor: event.target.value })} />
              </label>
              <label>{t("homepageOverlayOpacity")}
                <input max={80} min={0} type="number" value={bannerDraft.overlayOpacity} onChange={(event) => setBannerDraft({ ...bannerDraft, overlayOpacity: Number(event.target.value) })} />
              </label>
              <label>{t("homepageBlur")}
                <input max={20} min={0} type="number" value={bannerDraft.blur} onChange={(event) => setBannerDraft({ ...bannerDraft, blur: Number(event.target.value) })} />
              </label>
              <label>{t("homepageSortOrder")}
                <input max={10_000} min={0} type="number" value={bannerDraft.sortOrder} onChange={(event) => setBannerDraft({ ...bannerDraft, sortOrder: Number(event.target.value) })} />
              </label>
              <label>{t("homepageStartAt")}
                <input type="datetime-local" value={toLocalDateTime(bannerDraft.startsAt)} onChange={(event) => setBannerDraft({ ...bannerDraft, startsAt: fromLocalDateTime(event.target.value) })} />
              </label>
              <label>{t("homepageEndAt")}
                <input type="datetime-local" value={toLocalDateTime(bannerDraft.endsAt)} onChange={(event) => setBannerDraft({ ...bannerDraft, endsAt: fromLocalDateTime(event.target.value) })} />
              </label>
            </div>
            <label className="homepage-admin__check">
              <input checked={bannerDraft.isEnabled} type="checkbox" onChange={(event) => setBannerDraft({ ...bannerDraft, isEnabled: event.target.checked })} />
              {t("homepageEnabled")}
            </label>
            <div className="homepage-admin__form-actions">
              <button className="customer-primary-button" disabled={busy} type="submit">{t(busy ? "homepageSaving" : "homepageSave")}</button>
              <button className="customer-secondary-button" onClick={() => setBannerDraft(null)} type="button">{t("cancel")}</button>
            </div>
          </form>
        )}
      </section>

      <section className="homepage-admin__panel" aria-labelledby="homepage-media-title">
        <div className="homepage-admin__panel-heading"><h2 id="homepage-media-title">{t("homepageMediaTitle")}</h2></div>
        <div className="homepage-admin__media">
          {content?.categories.map((category: CategoryRecord) => (
            <form
              className="homepage-admin__media-card"
              key={category.id}
              onSubmit={(event) => {
                event.preventDefault();
                void saveCategoryMedia(category.id);
              }}
            >
              <h3>{category.name}</h3>
              <AdminImageField csrfToken={csrfToken} label={t("homepageCategoryImageUrl")} value={categoryImageDrafts[category.id]?.imageUrl ?? ""} onChange={(value) => setCategoryImageDrafts({ ...categoryImageDrafts, [category.id]: { ...categoryImageDrafts[category.id]!, imageUrl: value } })} />
              <AdminImageField csrfToken={csrfToken} label={t("homepageCategoryBannerUrl")} value={categoryImageDrafts[category.id]?.bannerImageUrl ?? ""} onChange={(value) => setCategoryImageDrafts({ ...categoryImageDrafts, [category.id]: { ...categoryImageDrafts[category.id]!, bannerImageUrl: value } })} />
              <button className="customer-secondary-button" disabled={busy} type="submit">{t("homepageSave")}</button>
            </form>
          ))}
          {content?.products.map((product) => (
            <form
              className="homepage-admin__media-card"
              key={product.id}
              onSubmit={(event) => {
                event.preventDefault();
                void saveProductMedia(product.id);
              }}
            >
              <h3>{product.name}</h3>
              <AdminImageField csrfToken={csrfToken} label={t("homepageProductImageUrl")} value={productImageDrafts[product.id] ?? ""} onChange={(value) => setProductImageDrafts({ ...productImageDrafts, [product.id]: value })} />
              <button className="customer-secondary-button" disabled={busy} type="submit">{t("homepageSave")}</button>
            </form>
          ))}
        </div>
      </section>
    </div>}
    </AdminLayout>
  );
}

function errorText(reason: unknown, t: (key: string) => string): string {
  if (reason instanceof HomepageRequestError) {
    if (reason.kind === "unauthorized") return t("homepageAdminDenied");
    if (reason.kind === "setupRequired") return t("homepageSetupRequired");
  }
  return t("homepageRequestError");
}
