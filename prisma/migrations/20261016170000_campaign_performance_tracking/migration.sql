CREATE TABLE "CampaignPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "attributedRevenue" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dataSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignPerformanceSnapshot_campaignCreatorId_capturedAt_idx" ON "CampaignPerformanceSnapshot"("campaignCreatorId", "capturedAt");
CREATE INDEX "CampaignPerformanceSnapshot_dataSource_capturedAt_idx" ON "CampaignPerformanceSnapshot"("dataSource", "capturedAt");

ALTER TABLE "CampaignPerformanceSnapshot"
ADD CONSTRAINT "CampaignPerformanceSnapshot_campaignCreatorId_fkey"
FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
