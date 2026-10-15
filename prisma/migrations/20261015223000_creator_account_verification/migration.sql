ALTER TABLE "SocialAccount"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "verificationRequestedAt" TIMESTAMP(3),
ADD COLUMN "verificationRequestNote" TEXT,
ADD COLUMN "verificationEvidenceUrl" TEXT,
ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
ADD COLUMN "verificationReviewedByUserId" TEXT,
ADD COLUMN "verificationReviewNote" TEXT;

UPDATE "SocialAccount"
SET "verificationStatus" = 'VERIFIED'
WHERE "verifiedAt" IS NOT NULL;
