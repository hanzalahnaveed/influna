-- Creator marketplace foundation: profiles, social metrics provenance, and campaign matching.
CREATE TABLE "CreatorProfile" (
"id" TEXT NOT NULL, "displayName" TEXT NOT NULL, "bio" TEXT,
"categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "country" TEXT, "city" TEXT,
"languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "isPublic" BOOLEAN NOT NULL DEFAULT true,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SocialAccount" (
"id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "platform" TEXT NOT NULL, "handle" TEXT NOT NULL,
"profileUrl" TEXT, "dataSource" TEXT NOT NULL DEFAULT 'creator_provided', "connectedAt" TIMESTAMP(3),
"verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SocialAccountSnapshot" (
"id" TEXT NOT NULL, "socialAccountId" TEXT NOT NULL, "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"dataSource" TEXT NOT NULL, "followerCount" INTEGER, "followingCount" INTEGER, "postCount" INTEGER,
"averageViews" DOUBLE PRECISION, "averageLikes" DOUBLE PRECISION, "averageComments" DOUBLE PRECISION,
"engagementRate" DOUBLE PRECISION, "rawMetrics" JSONB NOT NULL DEFAULT '{}',
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "SocialAccountSnapshot_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AudienceInsight" (
"id" TEXT NOT NULL, "socialAccountId" TEXT NOT NULL, "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"dataSource" TEXT NOT NULL, "countryBreakdown" JSONB NOT NULL DEFAULT '{}', "ageBreakdown" JSONB NOT NULL DEFAULT '{}',
"genderBreakdown" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "AudienceInsight_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CampaignCreator" (
"id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Suggested',
"matchScore" DOUBLE PRECISION, "matchReasons" JSONB NOT NULL DEFAULT '[]', "invitedAt" TIMESTAMP(3),
"acceptedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CampaignCreator_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "SocialAccount_platform_handle_key" ON "SocialAccount"("platform", "handle");
CREATE INDEX "CreatorProfile_isPublic_createdAt_idx" ON "CreatorProfile"("isPublic", "createdAt");
CREATE INDEX "CreatorProfile_country_city_idx" ON "CreatorProfile"("country", "city");
CREATE INDEX "SocialAccount_creatorId_platform_idx" ON "SocialAccount"("creatorId", "platform");
CREATE INDEX "SocialAccountSnapshot_socialAccountId_observedAt_idx" ON "SocialAccountSnapshot"("socialAccountId", "observedAt");
CREATE INDEX "SocialAccountSnapshot_dataSource_observedAt_idx" ON "SocialAccountSnapshot"("dataSource", "observedAt");
CREATE INDEX "AudienceInsight_socialAccountId_observedAt_idx" ON "AudienceInsight"("socialAccountId", "observedAt");
CREATE UNIQUE INDEX "CampaignCreator_campaignId_creatorId_key" ON "CampaignCreator"("campaignId", "creatorId");
CREATE INDEX "CampaignCreator_campaignId_status_idx" ON "CampaignCreator"("campaignId", "status");
CREATE INDEX "CampaignCreator_creatorId_status_idx" ON "CampaignCreator"("creatorId", "status");
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialAccountSnapshot" ADD CONSTRAINT "SocialAccountSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudienceInsight" ADD CONSTRAINT "AudienceInsight_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCreator" ADD CONSTRAINT "CampaignCreator_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCreator" ADD CONSTRAINT "CampaignCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
