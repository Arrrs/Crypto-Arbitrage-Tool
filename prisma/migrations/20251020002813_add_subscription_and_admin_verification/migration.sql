-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidUntil" TIMESTAMP(3);
