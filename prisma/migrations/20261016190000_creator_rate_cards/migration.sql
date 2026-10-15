CREATE TABLE "CreatorRateCard" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deliverableType" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorRateCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreatorRateCard_creatorId_platform_deliverableType_key" ON "CreatorRateCard"("creatorId", "platform", "deliverableType");
CREATE INDEX "CreatorRateCard_creatorId_isPublic_idx" ON "CreatorRateCard"("creatorId", "isPublic");
CREATE INDEX "CreatorRateCard_platform_currency_price_idx" ON "CreatorRateCard"("platform", "currency", "price");
ALTER TABLE "CreatorRateCard" ADD CONSTRAINT "CreatorRateCard_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
