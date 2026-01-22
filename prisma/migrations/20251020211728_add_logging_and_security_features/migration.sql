-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "method" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failReason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metadata" JSONB,
    "stack" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "session_logs_userId_idx" ON "session_logs"("userId");

-- CreateIndex
CREATE INDEX "session_logs_event_idx" ON "session_logs"("event");

-- CreateIndex
CREATE INDEX "session_logs_timestamp_idx" ON "session_logs"("timestamp");

-- CreateIndex
CREATE INDEX "session_logs_success_idx" ON "session_logs"("success");

-- CreateIndex
CREATE INDEX "rate_limit_logs_identifier_endpoint_idx" ON "rate_limit_logs"("identifier", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_logs_windowEnd_idx" ON "rate_limit_logs"("windowEnd");

-- CreateIndex
CREATE INDEX "app_logs_level_idx" ON "app_logs"("level");

-- CreateIndex
CREATE INDEX "app_logs_category_idx" ON "app_logs"("category");

-- CreateIndex
CREATE INDEX "app_logs_timestamp_idx" ON "app_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_logs" ADD CONSTRAINT "rate_limit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
