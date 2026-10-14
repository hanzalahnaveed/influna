-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "campaignDetails" JSONB NOT NULL DEFAULT '{}',
    "targetingCriteria" JSONB NOT NULL DEFAULT '{}',
    "platformDetails" JSONB NOT NULL DEFAULT '{}',
    "paymentInformation" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_status_createdAt_idx" ON "Campaign"("status", "createdAt");
