CREATE TABLE "SavedCreator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedCreator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedCreator_userId_creatorId_key" ON "SavedCreator"("userId", "creatorId");
CREATE INDEX "SavedCreator_userId_createdAt_idx" ON "SavedCreator"("userId", "createdAt");
CREATE INDEX "SavedCreator_creatorId_idx" ON "SavedCreator"("creatorId");

ALTER TABLE "SavedCreator" ADD CONSTRAINT "SavedCreator_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCreator" ADD CONSTRAINT "SavedCreator_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
