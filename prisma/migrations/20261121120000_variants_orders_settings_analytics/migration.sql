-- Variantes, délais, opérations de stock, paramètres métier et analytique propriétaire.
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NEW_VISITOR';

ALTER TABLE "Product" ADD COLUMN "optionLabel" TEXT NOT NULL DEFAULT 'Option';
ALTER TABLE "DeliveryZone" ADD COLUMN "deliveryMinHours" INTEGER;
ALTER TABLE "DeliveryZone" ADD COLUMN "deliveryMaxHours" INTEGER;
ALTER TABLE "Order" ADD COLUMN "stockRestoredAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantLabelSnapshot" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "paymentRules" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "deliveryRules" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "deliveryLeadTimeNote" TEXT;

CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "price" INTEGER,
    "salePrice" INTEGER,
    "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "landingPath" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "arrivalAlertSentAt" TIMESTAMP(3),
    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "target" TEXT,
    "durationSeconds" INTEGER,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitorEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_productId_label_key" ON "ProductVariant"("productId", "label");
CREATE INDEX "ProductVariant_productId_isActive_position_idx" ON "ProductVariant"("productId", "isActive", "position");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
CREATE UNIQUE INDEX "VisitorSession_visitorKey_key" ON "VisitorSession"("visitorKey");
CREATE INDEX "VisitorSession_firstSeenAt_idx" ON "VisitorSession"("firstSeenAt");
CREATE INDEX "VisitorSession_source_firstSeenAt_idx" ON "VisitorSession"("source", "firstSeenAt");
CREATE INDEX "VisitorSession_country_region_city_idx" ON "VisitorSession"("country", "region", "city");
CREATE INDEX "VisitorEvent_sessionId_occurredAt_idx" ON "VisitorEvent"("sessionId", "occurredAt");
CREATE INDEX "VisitorEvent_type_occurredAt_idx" ON "VisitorEvent"("type", "occurredAt");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisitorEvent" ADD CONSTRAINT "VisitorEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
