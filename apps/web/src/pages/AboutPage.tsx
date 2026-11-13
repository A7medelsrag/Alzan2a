import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import StoreLayout from "../components/StoreLayout";

const valueCards = [
  { icon: "01", title: "aboutValueSelectionTitle", description: "aboutValueSelectionDescription" },
  { icon: "02", title: "aboutValueEaseTitle", description: "aboutValueEaseDescription" },
  { icon: "03", title: "aboutValueSupportTitle", description: "aboutValueSupportDescription" },
  { icon: "04", title: "aboutValueVarietyTitle", description: "aboutValueVarietyDescription" },
] as const;

const categories = [
  { title: "aboutCategoryFashion", slug: "women-clothing", style: "about-category-card--fashion" },
  { title: "aboutCategoryShoes", slug: "shoes-bags", style: "about-category-card--shoes" },
  { title: "aboutCategoryHome", slug: "home-essentials", style: "about-category-card--home" },
] as const;

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <StoreLayout activeNav="about">
      <div className="about-page">
        <nav aria-label={t("aboutBreadcrumbLabel")} className="about-breadcrumb">
          <Link to="/">{t("home")}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t("aboutPageTitle")}</span>
        </nav>

        <header className="about-hero">
          <p className="about-eyebrow">{t("aboutHeroEyebrow")}</p>
          <h1>{t("aboutPageTitle")}</h1>
          <p className="about-hero__description">
            {t("aboutHeroDescription", { brandName: t("brandName") })}
          </p>
        </header>

        <section aria-labelledby="about-story-title" className="about-story">
          <div className="about-story__copy">
            <p className="about-eyebrow">
              {t("aboutStoryEyebrow", { brandName: t("brandName") })}
            </p>
            <h2 id="about-story-title">{t("aboutStoryTitle")}</h2>
            <p>{t("aboutStoryDescription")}</p>
            <p>{t("aboutStoryClosing")}</p>
          </div>

          <div aria-hidden="true" className="about-story__art">
            <span className="about-story__shape about-story__shape--large" />
            <span className="about-story__shape about-story__shape--small" />
            <div className="about-story__note">
              <span>{t("aboutStoryArtEyebrow")}</span>
              <strong>{t("aboutStoryArtTitle")}</strong>
            </div>
            <div className="about-story__stamp">{t("brandName")}</div>
          </div>
        </section>

        <section aria-labelledby="about-values-title" className="about-values">
          <div className="about-section-heading">
            <p className="about-eyebrow">{t("aboutValuesEyebrow")}</p>
            <h2 id="about-values-title">{t("aboutValuesTitle")}</h2>
            <p>{t("aboutValuesDescription")}</p>
          </div>
          <div className="about-values__grid">
            {valueCards.map((card) => (
              <article className="about-value-card" key={card.title}>
                <span aria-hidden="true" className="about-value-card__icon">{card.icon}</span>
                <h3>{t(card.title)}</h3>
                <p>{t(card.description)}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-categories-title" className="about-categories">
          <div className="about-section-heading">
            <p className="about-eyebrow">{t("aboutCategoriesEyebrow")}</p>
            <h2 id="about-categories-title">{t("aboutCategoriesTitle")}</h2>
          </div>
          <div className="about-categories__grid">
            {categories.map((category) => (
              <Link
                className={`about-category-card ${category.style}`}
                key={category.title}
                to={`/?category=${category.slug}#product-catalog`}
              >
                <span>{t(category.title)}</span>
                <span aria-hidden="true" className="about-category-card__arrow">←</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-cta-title" className="about-cta">
          <p className="about-eyebrow">{t("aboutCtaEyebrow")}</p>
          <h2 id="about-cta-title">{t("aboutCtaTitle")}</h2>
          <p>{t("aboutCtaDescription")}</p>
          <Link className="about-cta__link" to="/#product-catalog">
            {t("aboutCtaAction")}
            <span aria-hidden="true">←</span>
          </Link>
        </section>
      </div>
    </StoreLayout>
  );
}
