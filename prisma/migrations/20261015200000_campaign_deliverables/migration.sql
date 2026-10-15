CREATE TABLE "CampaignDeliverable" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignDeliverable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableSubmission" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "creatorNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "DeliverableSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliverableSubmission_deliverableId_version_key" ON "DeliverableSubmission"("deliverableId", "version");
CREATE INDEX "CampaignDeliverable_campaignCreatorId_status_idx" ON "CampaignDeliverable"("campaignCreatorId", "status");
CREATE INDEX "CampaignDeliverable_dueAt_status_idx" ON "CampaignDeliverable"("dueAt", "status");
CREATE INDEX "DeliverableSubmission_deliverableId_submittedAt_idx" ON "DeliverableSubmission"("deliverableId", "submittedAt");
CREATE INDEX "DeliverableSubmission_status_submittedAt_idx" ON "DeliverableSubmission"("status", "submittedAt");

ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "CampaignCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "CampaignDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
