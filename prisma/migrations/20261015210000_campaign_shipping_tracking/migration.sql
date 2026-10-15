CREATE TABLE "CampaignShipment" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Preparing',
    "notes" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignShipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignShipment_campaignCreatorId_key" ON "CampaignShipment"("campaignCreatorId");
CREATE INDEX "CampaignShipment_status_updatedAt_idx" ON "CampaignShipment"("status", "updatedAt");
ALTER TABLE "CampaignShipment" ADD CONSTRAINT "CampaignShipment_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
