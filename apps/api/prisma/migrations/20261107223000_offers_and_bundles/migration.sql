-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED';

-- DropIndex
DROP INDEX IF EXISTS "ProductReview_productId_createdAt_idx";

-- CreateIndex
CREATE INDEX "ProductReview_productId_status_createdAt_idx" ON "ProductReview"("productId", "status", "createdAt");

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "offerDiscountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bundleDiscountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "couponDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "originalPriceCents" INTEGER,
ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "offerId" TEXT,
ADD COLUMN "bundleId" TEXT,
ADD COLUMN "bundleName" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_bundleId_idx" ON "OrderItem"("bundleId");

-- CreateTable
CREATE TABLE "ProductOffer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountCents" INTEGER,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOfferProduct" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductOfferProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER,
    "discountType" "DiscountType",
    "discountValue" INTEGER,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultVariantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOffer_isActive_startsAt_endsAt_idx" ON "ProductOffer"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ProductOfferProduct_productId_idx" ON "ProductOfferProduct"("productId");

-- CreateIndex
CREATE INDEX "ProductOfferProduct_offerId_idx" ON "ProductOfferProduct"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOfferProduct_offerId_productId_key" ON "ProductOfferProduct"("offerId", "productId");

-- CreateIndex
CREATE INDEX "Bundle_isActive_startsAt_endsAt_idx" ON "Bundle"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Bundle_sortOrder_idx" ON "Bundle"("sortOrder");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleItem_productId_idx" ON "BundleItem"("productId");

-- CreateIndex
CREATE INDEX "BundleItem_defaultVariantId_idx" ON "BundleItem"("defaultVariantId");

-- AddForeignKey
ALTER TABLE "ProductOfferProduct" ADD CONSTRAINT "ProductOfferProduct_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOfferProduct" ADD CONSTRAINT "ProductOfferProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_defaultVariantId_fkey" FOREIGN KEY ("defaultVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
