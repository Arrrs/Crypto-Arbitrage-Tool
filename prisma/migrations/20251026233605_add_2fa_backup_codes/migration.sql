-- AlterTable
ALTER TABLE "users" ADD COLUMN     "backupCodes" TEXT[],
ADD COLUMN     "twoFactorVerified" TIMESTAMP(3);
