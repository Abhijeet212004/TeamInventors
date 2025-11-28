-- CreateTable
CREATE TABLE "user_tracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batteryLevel" INTEGER,
    "signalStrength" TEXT,
    "phoneStatus" TEXT,
    "speed" DOUBLE PRECISION,
    "address" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_tracking_userId_key" ON "user_tracking"("userId");
