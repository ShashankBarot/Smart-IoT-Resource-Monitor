import prisma from '../lib/prisma';
import logger from '../utils/logger';

export interface RecordElectricityInput {
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energyKwh: number;
  timestamp?: string | Date;
}

export async function recordElectricityReading(input: RecordElectricityInput) {
  try {
    const readingTime = input.timestamp ? new Date(input.timestamp) : new Date();

    const reading = await prisma.electricityReading.create({
      data: {
        deviceId: input.deviceId,
        voltage: input.voltage,
        current: input.current,
        power: input.power,
        energyKwh: input.energyKwh,
        timestamp: readingTime,
      },
    });

    return reading;
  } catch (err: unknown) {
    logger.error(`[ElectricityService] Error recording electricity reading:`, err);
    throw err;
  }
}

export async function getLatestElectricityReading(deviceId?: string) {
  try {
    const reading = await prisma.electricityReading.findFirst({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    if (!reading) return null;

    return {
      id: reading.id,
      deviceId: reading.deviceId,
      timestamp: reading.timestamp.toISOString(),
      voltage: reading.voltage,
      current: reading.current,
      power: reading.power,
      energy: reading.energyKwh,
      energyKwh: reading.energyKwh,
      unit: 'home',
      createdAt: reading.createdAt.toISOString(),
    };
  } catch (err: unknown) {
    logger.error('[ElectricityService] Error getting latest electricity reading:', err);
    throw err;
  }
}

export async function getElectricityReadings(limit = 50, offset = 0, deviceId?: string) {
  try {
    const readings = await prisma.electricityReading.findMany({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    // Reverse to chronological order (ascending) so latestReading = readings[readings.length - 1] works in frontend
    const formatted = readings.map(r => ({
      id: r.id,
      deviceId: r.deviceId,
      timestamp: r.timestamp.toISOString(),
      voltage: r.voltage,
      current: r.current,
      power: r.power,
      energy: r.energyKwh,
      energyKwh: r.energyKwh,
      unit: 'home',
      createdAt: r.createdAt.toISOString(),
    })).reverse();

    return formatted;
  } catch (err: unknown) {
    logger.error('[ElectricityService] Error getting electricity readings:', err);
    throw err;
  }
}

export async function getElectricityDailyAnalytics(deviceId?: string) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readings = await prisma.electricityReading.findMany({
      where: {
        timestamp: { gte: since },
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });

    if (readings.length === 0) {
      // Return default recent points if no history exists yet
      return [
        { time: '08:00', value: 0.62 },
        { time: '10:00', value: 0.65 },
        { time: '12:00', value: 0.71 },
        { time: '14:00', value: 0.65 },
      ];
    }

    return readings.slice(-20).map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: r.energyKwh,
    }));
  } catch (err: unknown) {
    logger.error('[ElectricityService] Error getting electricity daily analytics:', err);
    throw err;
  }
}

export async function getElectricityHourlyAnalytics(deviceId?: string) {
  return getElectricityDailyAnalytics(deviceId);
}

