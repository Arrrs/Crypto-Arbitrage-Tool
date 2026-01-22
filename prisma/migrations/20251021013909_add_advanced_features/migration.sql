-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CronStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SECURITY', 'ERROR', 'INFO', 'WARNING');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TELEGRAM', 'EMAIL', 'WEBHOOK');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "session_logs" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "cron_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_executions" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "CronStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "recordsAffected" INTEGER,

    CONSTRAINT "cron_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AlertType" NOT NULL,
    "condition" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_triggers" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "channels" TEXT[],

    CONSTRAINT "alert_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_channels" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_jobs_name_key" ON "cron_jobs"("name");

-- CreateIndex
CREATE INDEX "cron_executions_jobId_idx" ON "cron_executions"("jobId");

-- CreateIndex
CREATE INDEX "cron_executions_status_idx" ON "cron_executions"("status");

-- CreateIndex
CREATE INDEX "cron_executions_startedAt_idx" ON "cron_executions"("startedAt");

-- CreateIndex
CREATE INDEX "alert_triggers_alertId_idx" ON "alert_triggers"("alertId");

-- CreateIndex
CREATE INDEX "alert_triggers_triggered_idx" ON "alert_triggers"("triggered");

-- CreateIndex
CREATE INDEX "alert_triggers_sent_idx" ON "alert_triggers"("sent");

-- CreateIndex
CREATE INDEX "alert_channels_alertId_idx" ON "alert_channels"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_action_idx" ON "audit_logs"("timestamp", "action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_severity_idx" ON "audit_logs"("timestamp", "severity");

-- CreateIndex
CREATE INDEX "session_logs_timestamp_success_idx" ON "session_logs"("timestamp", "success");

-- AddForeignKey
ALTER TABLE "cron_executions" ADD CONSTRAINT "cron_executions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "cron_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_channels" ADD CONSTRAINT "alert_channels_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
