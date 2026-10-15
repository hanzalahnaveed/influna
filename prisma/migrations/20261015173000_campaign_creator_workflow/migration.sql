-- Campaign collaboration workflow metadata. Existing campaign/creator records are preserved.
ALTER TABLE "CampaignCreator"
  ADD COLUMN "declinedAt" TIMESTAMP(3),
  ADD COLUMN "contentUrl" TEXT,
  ADD COLUMN "contentNote" TEXT,
  ADD COLUMN "contentSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);
