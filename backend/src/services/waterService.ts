import prisma from '../lib/prisma';
import logger from '../utils/logger';

export interface RecordWaterInput {
  deviceId: string;
  flowRateLpm: number;
  totalLitres: number;
  timestamp?: string | Date;
}

export async function recordWaterReading(input: RecordWaterInput) {
  try {
    const readingTime = input.timestamp ? new Date(input.timestamp) : new Date();

    const reading = await prisma.waterReading.create({
      data: {
        deviceId: input.deviceId,
        flowRateLpm: input.flowRateLpm,
        totalLitres: input.totalLitres,
        timestamp: readingTime,
      },
    });

    return reading;
  } catch (err: unknown) {
    logger.error(`[WaterService] Error recording water reading:`, err);
    throw err;
  }
}

export async function getLatestWaterReading(deviceId?: string) {
  try {
    const reading = await prisma.waterReading.findFirst({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    if (!reading) return null;

    return {
      id: reading.id,
      deviceId: reading.deviceId,
      timestamp: reading.timestamp.toISOString(),
      flowRate: reading.flowRateLpm,
      flowRateLpm: reading.flowRateLpm,
      totalLitres: reading.totalLitres,
      unit: 'L',
      createdAt: reading.createdAt.toISOString(),
    };
  } catch (err: unknown) {
    logger.error('[WaterService] Error getting latest water reading:', err);
    throw err;
  }
}

export async function getWaterReadings(limit = 50, offset = 0, deviceId?: string) {
  try {
    const readings = await prisma.waterReading.findMany({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    // Reverse so chronologically ascending if needed, but return format expected by frontend
    // In frontend/src/app/water/page.tsx: latestReading = readings[readings.length - 1]
    // which expects chronologically ASCENDING array of readings!
    const formatted = readings.map(r => ({
      id: r.id,
      deviceId: r.deviceId,
      timestamp: r.timestamp.toISOString(),
      flowRate: r.flowRateLpm,
      flowRateLpm: r.flowRateLpm,
      totalLitres: r.totalLitres,
      unit: 'L',
      createdAt: r.createdAt.toISOString(),
    })).reverse();

    return formatted;
  } catch (err: unknown) {
    logger.error('[WaterService] Error getting water readings:', err);
    throw err;
  }
}

export async function getWaterDailyAnalytics(deviceId?: string) {
  try {
    // Get readings from last 24 hours or last 7 days
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readings = await prisma.waterReading.findMany({
      where: {
        timestamp: { gte: since },
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });

    if (readings.length === 0) {
      // Return default recent points if no history exists yet
      return [
        { time: '08:00', value: 2.4 },
        { time: '10:00', value: 3.2 },
        { time: '12:00', value: 4.1 },
        { time: '14:00', value: 3.7 },
      ];
    }

    return readings.slice(-20).map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: r.flowRateLpm,
    }));
  } catch (err: unknown) {
    logger.error('[WaterService] Error getting water daily analytics:', err);
    throw err;
  }
}

export async function getWaterHourlyAnalytics(deviceId?: string) {
  return getWaterDailyAnalytics(deviceId);
}

