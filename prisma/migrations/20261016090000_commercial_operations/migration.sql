ALTER TABLE "CampaignCreator"
  ADD COLUMN "proposalStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "proposedFee" DECIMAL(12,2),
  ADD COLUMN "counterFee" DECIMAL(12,2),
  ADD COLUMN "agreedFee" DECIMAL(12,2),
  ADD COLUMN "feeCurrency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "paymentTerms" TEXT,
  ADD COLUMN "proposalNote" TEXT,
  ADD COLUMN "proposalSentAt" TIMESTAMP(3),
  ADD COLUMN "proposalRespondedAt" TIMESTAMP(3);

CREATE TABLE "CampaignPaymentRecord" (
  "id" TEXT NOT NULL,
  "campaignCreatorId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reference" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignPaymentRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignPaymentRecord_campaignCreatorId_fkey"
    FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CampaignPaymentRecord_campaignCreatorId_status_idx"
  ON "CampaignPaymentRecord"("campaignCreatorId", "status");
CREATE INDEX "CampaignPaymentRecord_status_dueAt_idx"
  ON "CampaignPaymentRecord"("status", "dueAt");
