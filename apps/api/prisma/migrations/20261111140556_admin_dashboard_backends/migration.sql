-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "PurchasePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('PACKAGING', 'ADS', 'SHIPPING_FEES', 'SALARIES', 'RENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseRecurrence" AS ENUM ('ONE_TIME', 'MONTHLY');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('SALE', 'CANCEL', 'RETURN', 'PURCHASE', 'ADJUSTMENT', 'COUNT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "returnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "unitCostCents" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "unitCostCents" INTEGER,
    "reference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "extraCostsCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "allocatedExtraCostCents" INTEGER NOT NULL DEFAULT 0,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "PurchaseInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PurchasePaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "governorate" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "minDeliveryDays" INTEGER NOT NULL,
    "maxDeliveryDays" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("governorate")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "platform" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurrence" "ExpenseRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "recurrenceEndAt" TIMESTAMP(3),
    "receiptImageUrl" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierSettlement" (
    "id" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grossCollectedCents" INTEGER NOT NULL,
    "courierFeesCents" INTEGER NOT NULL,
    "netReceivedCents" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierSettlementOrder" (
    "settlementId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAmountCents" INTEGER NOT NULL,
    "courierFeeCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierSettlementOrder_pkey" PRIMARY KEY ("settlementId","orderId")
);

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "storeName" TEXT NOT NULL DEFAULT 'Zan2a',
    "supportPhone" TEXT,
    "supportWhatsApp" TEXT,
    "freeShippingThresholdCents" INTEGER NOT NULL DEFAULT 100000,
    "allowCouponsWithOffers" BOOLEAN NOT NULL DEFAULT true,
    "dailyOrderLimitPerPhone" INTEGER,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_actorId_createdAt_idx" ON "OrderEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_reference_key" ON "StockMovement"("reference");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_status_invoiceDate_idx" ON "PurchaseInvoice"("status", "invoiceDate");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_supplierId_invoiceDate_idx" ON "PurchaseInvoice"("supplierId", "invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_supplierId_invoiceNumber_key" ON "PurchaseInvoice"("supplierId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceLine_variantId_idx" ON "PurchaseInvoiceLine"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoiceLine_invoiceId_variantId_key" ON "PurchaseInvoiceLine"("invoiceId", "variantId");

-- CreateIndex
CREATE INDEX "PurchasePayment_invoiceId_paidAt_idx" ON "PurchasePayment"("invoiceId", "paidAt");

-- CreateIndex
CREATE INDEX "Expense_occurredAt_category_idx" ON "Expense"("occurredAt", "category");

-- CreateIndex
CREATE INDEX "Expense_recurrence_occurredAt_recurrenceEndAt_idx" ON "Expense"("recurrence", "occurredAt", "recurrenceEndAt");

-- CreateIndex
CREATE INDEX "CourierSettlement_courierName_settledAt_idx" ON "CourierSettlement"("courierName", "settledAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourierSettlementOrder_orderId_key" ON "CourierSettlementOrder"("orderId");

-- CreateIndex
CREATE INDEX "CourierSettlementOrder_orderId_idx" ON "CourierSettlementOrder"("orderId");

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierSettlement" ADD CONSTRAINT "CourierSettlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierSettlementOrder" ADD CONSTRAINT "CourierSettlementOrder_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "CourierSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierSettlementOrder" ADD CONSTRAINT "CourierSettlementOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSetting" ADD CONSTRAINT "StoreSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the existing documented Egyptian governorate rates as editable operational defaults.
INSERT INTO "ShippingRate" ("governorate", "priceCents", "minDeliveryDays", "maxDeliveryDays", "isEnabled", "updatedAt")
VALUES
  ('القاهرة', 4000, 1, 2, TRUE, CURRENT_TIMESTAMP),
  ('الجيزة', 4000, 1, 2, TRUE, CURRENT_TIMESTAMP),
  ('الإسكندرية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('الدقهلية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('البحر الأحمر', 8000, 4, 6, TRUE, CURRENT_TIMESTAMP),
  ('البحيرة', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('الفيوم', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('الغربية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('الإسماعيلية', 5500, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('المنوفية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('المنيا', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('القليوبية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('الوادي الجديد', 8000, 4, 6, TRUE, CURRENT_TIMESTAMP),
  ('السويس', 5500, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('أسوان', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('أسيوط', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('بني سويف', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('بورسعيد', 5500, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('دمياط', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('الشرقية', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('جنوب سيناء', 8000, 4, 6, TRUE, CURRENT_TIMESTAMP),
  ('كفر الشيخ', 5000, 2, 4, TRUE, CURRENT_TIMESTAMP),
  ('مطروح', 8000, 4, 6, TRUE, CURRENT_TIMESTAMP),
  ('الأقصر', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('قنا', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP),
  ('شمال سيناء', 8000, 4, 6, TRUE, CURRENT_TIMESTAMP),
  ('سوهاج', 6500, 3, 5, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT ("governorate") DO NOTHING;

INSERT INTO "StoreSetting" ("id", "storeName", "freeShippingThresholdCents", "allowCouponsWithOffers", "updatedAt")
VALUES ('global', 'Zan2a', 100000, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Persist core accounting and shipping invariants at the database boundary.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_costCents_nonnegative_check" CHECK ("costCents" IS NULL OR "costCents" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_lowStockThreshold_nonnegative_check" CHECK ("lowStockThreshold" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_quantityDelta_nonzero_check" CHECK ("quantityDelta" <> 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_type_direction_check" CHECK (("type" = 'SALE' AND "quantityDelta" < 0) OR ("type" IN ('CANCEL', 'RETURN', 'PURCHASE') AND "quantityDelta" > 0) OR "type" IN ('ADJUSTMENT', 'COUNT'));
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_amounts_nonnegative_check" CHECK ("subtotalCents" >= 0 AND "extraCostsCents" >= 0 AND "totalCents" >= 0);
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_values_check" CHECK ("quantity" > 0 AND "unitCostCents" >= 0 AND "allocatedExtraCostCents" >= 0 AND "lineTotalCents" >= 0);
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_amount_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_values_check" CHECK ("priceCents" >= 0 AND "minDeliveryDays" > 0 AND "maxDeliveryDays" >= "minDeliveryDays");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_ads_platform_check" CHECK ("category" <> 'ADS' OR ("platform" IS NOT NULL AND length(trim("platform")) > 0));
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurrence_range_check" CHECK ("recurrenceEndAt" IS NULL OR "recurrenceEndAt" >= "occurredAt");
ALTER TABLE "CourierSettlement" ADD CONSTRAINT "CourierSettlement_amounts_check" CHECK ("grossCollectedCents" > 0 AND "courierFeesCents" >= 0 AND "courierFeesCents" <= "grossCollectedCents" AND "netReceivedCents" = "grossCollectedCents" - "courierFeesCents");
ALTER TABLE "CourierSettlementOrder" ADD CONSTRAINT "CourierSettlementOrder_amounts_check" CHECK ("orderAmountCents" > 0 AND "courierFeeCents" >= 0 AND "courierFeeCents" <= "orderAmountCents");
ALTER TABLE "StoreSetting" ADD CONSTRAINT "StoreSetting_global_id_check" CHECK ("id" = 'global');
ALTER TABLE "StoreSetting" ADD CONSTRAINT "StoreSetting_values_check" CHECK ("freeShippingThresholdCents" >= 0 AND ("dailyOrderLimitPerPhone" IS NULL OR "dailyOrderLimitPerPhone" > 0));
