/*
  Warnings:

  - A unique constraint covering the columns `[folder,sogoUid]` on the table `EmailRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EmailRecord" ADD COLUMN     "bodyHtml" TEXT,
ADD COLUMN     "ccRecipients" JSONB,
ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawJson" JSONB,
ADD COLUMN     "sogoUid" INTEGER,
ADD COLUMN     "toRecipients" JSONB;

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailRecordId" TEXT NOT NULL,
    "filename" TEXT,
    "contentType" TEXT,
    "size" TEXT,
    "downloadUrl" TEXT,
    "viewUrl" TEXT,
    "rawPart" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSyncState" (
    "id" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "syncToken" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAttachment_emailRecordId_idx" ON "EmailAttachment"("emailRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSyncState_folder_key" ON "EmailSyncState"("folder");

-- CreateIndex
CREATE INDEX "EmailRecord_receivedAt_idx" ON "EmailRecord"("receivedAt");

-- CreateIndex
CREATE INDEX "EmailRecord_sender_idx" ON "EmailRecord"("sender");

-- CreateIndex
CREATE INDEX "EmailRecord_isRead_idx" ON "EmailRecord"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRecord_folder_sogoUid_key" ON "EmailRecord"("folder", "sogoUid");

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailRecordId_fkey" FOREIGN KEY ("emailRecordId") REFERENCES "EmailRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
