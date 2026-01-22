-- AlterTable
-- Remove redundant 'verified' and 'verifiedAt' fields from PendingEmailChange
-- These fields are no longer used - 'finalized' field serves this purpose
ALTER TABLE "pending_email_changes" DROP COLUMN "verified";
ALTER TABLE "pending_email_changes" DROP COLUMN "verifiedAt";
