-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastSeenAt" TIMESTAMP(3),
    "rssi" INTEGER,
    "freeHeap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "flowRateLpm" DOUBLE PRECISION NOT NULL,
    "totalLitres" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electricity_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "voltage" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,
    "power" DOUBLE PRECISION NOT NULL,
    "energyKwh" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electricity_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_daily_aggregates" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalLitres" DOUBLE PRECISION NOT NULL,
    "avgFlowRateLpm" DOUBLE PRECISION NOT NULL,
    "peakFlowRateLpm" DOUBLE PRECISION NOT NULL,
    "readingCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electricity_daily_aggregates" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalEnergyKwh" DOUBLE PRECISION NOT NULL,
    "avgPowerWatts" DOUBLE PRECISION NOT NULL,
    "peakPowerWatts" DOUBLE PRECISION NOT NULL,
    "avgVoltage" DOUBLE PRECISION NOT NULL,
    "avgCurrent" DOUBLE PRECISION NOT NULL,
    "readingCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electricity_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "devices_deviceId_idx" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "water_readings_deviceId_timestamp_idx" ON "water_readings"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "water_readings_timestamp_idx" ON "water_readings"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "water_readings_deviceId_timestamp_key" ON "water_readings"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "electricity_readings_deviceId_timestamp_idx" ON "electricity_readings"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "electricity_readings_timestamp_idx" ON "electricity_readings"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_readings_deviceId_timestamp_key" ON "electricity_readings"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "anomalies_deviceId_timestamp_idx" ON "anomalies"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "anomalies_resourceType_idx" ON "anomalies"("resourceType");

-- CreateIndex
CREATE INDEX "anomalies_timestamp_idx" ON "anomalies"("timestamp");

-- CreateIndex
CREATE INDEX "water_daily_aggregates_deviceId_date_idx" ON "water_daily_aggregates"("deviceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "water_daily_aggregates_deviceId_date_key" ON "water_daily_aggregates"("deviceId", "date");

-- CreateIndex
CREATE INDEX "electricity_daily_aggregates_deviceId_date_idx" ON "electricity_daily_aggregates"("deviceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_daily_aggregates_deviceId_date_key" ON "electricity_daily_aggregates"("deviceId", "date");

-- AddForeignKey
ALTER TABLE "water_readings" ADD CONSTRAINT "water_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electricity_readings" ADD CONSTRAINT "electricity_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;
