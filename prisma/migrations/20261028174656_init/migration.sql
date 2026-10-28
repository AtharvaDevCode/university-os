-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('EMAIL', 'WEBPAGE', 'PDF', 'IMAGE', 'MANUAL', 'OTHER');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "venue" TEXT,
    "roomNumber" TEXT,
    "address" TEXT,
    "language" TEXT,
    "registrationUrl" TEXT,
    "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSource" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "filename" TEXT,
    "sender" TEXT,
    "subject" TEXT,
    "url" TEXT,
    "messageId" TEXT,
    "evidence" TEXT,
    "extractedFields" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT,

    CONSTRAINT "EventSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSource" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "filename" TEXT,
    "sender" TEXT,
    "subject" TEXT,
    "url" TEXT,
    "messageId" TEXT,
    "evidence" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecord" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'INBOX',
    "sender" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "contentHash" TEXT,
    "category" TEXT,
    "language" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchedSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailRecord_messageId_key" ON "EmailRecord"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedSource_url_key" ON "WatchedSource"("url");

-- AddForeignKey
ALTER TABLE "EventSource" ADD CONSTRAINT "EventSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSource" ADD CONSTRAINT "TaskSource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
