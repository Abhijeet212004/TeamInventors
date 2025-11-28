-- CreateEnum
CREATE TYPE "BubbleType" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateTable
CREATE TABLE "bubbles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" "BubbleType" NOT NULL DEFAULT 'PERMANENT',
    "creatorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bubbles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bubble_members" (
    "id" TEXT NOT NULL,
    "bubbleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bubble_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bubble_members_bubbleId_userId_key" ON "bubble_members"("bubbleId", "userId");

-- AddForeignKey
ALTER TABLE "bubbles" ADD CONSTRAINT "bubbles_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bubble_members" ADD CONSTRAINT "bubble_members_bubbleId_fkey" FOREIGN KEY ("bubbleId") REFERENCES "bubbles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bubble_members" ADD CONSTRAINT "bubble_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
