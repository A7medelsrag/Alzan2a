CREATE TYPE "HomepageSectionType" AS ENUM (
    'CATEGORIES',
    'NEW_ARRIVALS',
    'BEST_SELLERS',
    'FEATURED_COLLECTIONS',
    'SEASONAL_OFFERS',
    'BRAND_STORY',
    'RECENTLY_VIEWED',
    'BENEFITS',
    'NEWSLETTER',
    'SOCIAL'
);

CREATE TYPE "HomepageBannerSlot" AS ENUM ('ANNOUNCEMENT', 'HERO', 'PROMOTION');

ALTER TABLE "Category"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "bannerImageUrl" TEXT;

ALTER TABLE "Product"
ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "type" "HomepageSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "buttonLabel" TEXT,
    "linkUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSectionProduct" (
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HomepageSectionProduct_pkey" PRIMARY KEY ("sectionId", "productId")
);

CREATE TABLE "HomepageSectionCategory" (
    "sectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HomepageSectionCategory_pkey" PRIMARY KEY ("sectionId", "categoryId")
);

CREATE TABLE "HomepageBanner" (
    "id" TEXT NOT NULL,
    "slot" "HomepageBannerSlot" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "desktopImageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "buttonLabel" TEXT,
    "linkUrl" TEXT,
    "overlayColor" TEXT NOT NULL DEFAULT '#0A1733',
    "overlayOpacity" INTEGER NOT NULL DEFAULT 35,
    "blur" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomepageBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomepageSection_isEnabled_sortOrder_idx" ON "HomepageSection"("isEnabled", "sortOrder");
CREATE INDEX "HomepageSection_startsAt_endsAt_idx" ON "HomepageSection"("startsAt", "endsAt");
CREATE INDEX "HomepageSectionProduct_productId_idx" ON "HomepageSectionProduct"("productId");
CREATE INDEX "HomepageSectionCategory_categoryId_idx" ON "HomepageSectionCategory"("categoryId");
CREATE INDEX "HomepageBanner_slot_isEnabled_sortOrder_idx" ON "HomepageBanner"("slot", "isEnabled", "sortOrder");
CREATE INDEX "HomepageBanner_startsAt_endsAt_idx" ON "HomepageBanner"("startsAt", "endsAt");

ALTER TABLE "HomepageSectionProduct"
ADD CONSTRAINT "HomepageSectionProduct_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "HomepageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "HomepageSectionProduct_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageSectionCategory"
ADD CONSTRAINT "HomepageSectionCategory_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "HomepageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "HomepageSectionCategory_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
