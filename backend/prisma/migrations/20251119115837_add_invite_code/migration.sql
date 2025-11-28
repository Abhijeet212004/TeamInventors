/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `bubbles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inviteCode` to the `bubbles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add column with temporary default value
ALTER TABLE "bubbles" ADD COLUMN "inviteCode" TEXT;

-- Update existing rows with unique invite codes
UPDATE "bubbles" SET "inviteCode" = substring(md5(random()::text || clock_timestamp()::text) from 1 for 10) WHERE "inviteCode" IS NULL;

-- Make the column required
ALTER TABLE "bubbles" ALTER COLUMN "inviteCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bubbles_inviteCode_key" ON "bubbles"("inviteCode");
