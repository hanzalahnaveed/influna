CREATE TABLE "CampaignPlanItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rateCardId" TEXT,
    "deliverableType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CampaignPlanItem_campaignId_createdAt_idx" ON "CampaignPlanItem"("campaignId", "createdAt");
CREATE INDEX "CampaignPlanItem_creatorId_idx" ON "CampaignPlanItem"("creatorId");
CREATE INDEX "CampaignPlanItem_rateCardId_idx" ON "CampaignPlanItem"("rateCardId");
ALTER TABLE "CampaignPlanItem" ADD CONSTRAINT "CampaignPlanItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignPlanItem" ADD CONSTRAINT "CampaignPlanItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignPlanItem" ADD CONSTRAINT "CampaignPlanItem_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "CreatorRateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
