-- AlterTable
ALTER TABLE "PlatformConnection" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "PlatformConnection" ADD COLUMN "tokenExpiresAt" DATETIME;
