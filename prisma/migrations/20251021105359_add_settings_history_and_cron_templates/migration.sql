-- AlterTable
ALTER TABLE "cron_jobs" ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "template" TEXT;

-- CreateTable
CREATE TABLE "settings_history" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settings_history_key_changedAt_idx" ON "settings_history"("key", "changedAt");

-- AddForeignKey
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
