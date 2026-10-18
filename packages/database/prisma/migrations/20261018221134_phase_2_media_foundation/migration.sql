-- CreateEnum
CREATE TYPE "MediaSourceType" AS ENUM ('UPLOAD', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaJobKind" AS ENUM ('PROBE_UPLOAD', 'FETCH_YOUTUBE_METADATA');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceType" "MediaSourceType" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT,
    "originalName" TEXT,
    "storageKey" TEXT,
    "thumbnailKey" TEXT,
    "remoteThumbnailUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "sha256" TEXT,
    "sourceUrl" TEXT,
    "youtubeVideoId" TEXT,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "videoCodec" TEXT,
    "audioCodec" TEXT,
    "error" TEXT,
    "idempotencyKey" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "bullJobId" TEXT,
    "kind" "MediaJobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_thumbnailKey_key" ON "MediaAsset"("thumbnailKey");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_deletedAt_createdAt_idx" ON "MediaAsset"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_projectId_deletedAt_createdAt_idx" ON "MediaAsset"("projectId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_youtubeVideoId_idx" ON "MediaAsset"("youtubeVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_userId_idempotencyKey_key" ON "MediaAsset"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProcessingJob_bullJobId_key" ON "MediaProcessingJob"("bullJobId");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_mediaAssetId_createdAt_idx" ON "MediaProcessingJob"("mediaAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_status_createdAt_idx" ON "MediaProcessingJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
