import prisma from '../lib/prisma';
import logger from '../utils/logger';
import config from '../config';
import { Server as SocketIOServer } from 'socket.io';

// ── In-memory continuous flow tracker ──────────────────────────────────────────
const continuousFlowStartMap = new Map<string, Date | null>();

function getContinuousFlowMinutes(deviceId: string): number {
  const startTime = continuousFlowStartMap.get(deviceId);
  if (!startTime) return 0;
  const now = new Date();
  return (now.getTime() - startTime.getTime()) / (1000 * 60);
}

// ── Helper: check if a recent anomaly of the same message was recorded ─────────
async function recentAnomalyExists(deviceId: string, message: string, cooldownMinutes: number): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const existing = await prisma.anomaly.findFirst({
    where: {
      deviceId,
      message,
      timestamp: { gte: since },
    },
  });
  return existing !== null;
}

// ── Helper: Save anomaly and emit over Socket.IO ────────────────────────────────
async function saveAndEmitAnomaly(
  io: SocketIOServer,
  data: {
    deviceId: string;
    resourceType: 'water' | 'electricity';
    severity: 'low' | 'medium' | 'high';
    message: string;
    actualValue: number;
    baselineValue: number;
    threshold: number;
    unit: string;
    timestamp?: Date;
  }
) {
  try {
    const timestamp = data.timestamp ?? new Date();

    const record = await prisma.anomaly.create({
      data: {
        deviceId: data.deviceId,
        resourceType: data.resourceType,
        severity: data.severity,
        message: data.message,
        actualValue: data.actualValue,
        baselineValue: data.baselineValue,
        threshold: data.threshold,
        timestamp,
      },
    });

    const payload = {
      id: record.id,
      deviceId: record.deviceId,
      type: record.resourceType,
      resourceType: record.resourceType,
      severity: record.severity,
      message: record.message,
      value: record.actualValue,
      actualValue: record.actualValue,
      unit: data.unit,
      timestamp: record.timestamp.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };

    logger.warn(
      `[AnomalyService] 🚨 Anomaly detected: [${record.severity.toUpperCase()}] ${record.message} (Value: ${record.actualValue} ${data.unit})`
    );

    // Emit event expected by frontend useSocket ("anomaly:detected")
    io.emit('anomaly:detected', payload);

    return record;
  } catch (err: unknown) {
    logger.error('[AnomalyService] Error saving anomaly:', err);
    return null;
  }
}

// ── Check Water Reading Anomalies ──────────────────────────────────────────────
export async function checkWaterAnomalies(
  io: SocketIOServer,
  reading: {
    deviceId: string;
    flowRateLpm: number;
    totalLitres: number;
    timestamp?: Date | string;
  }
) {
  const { deviceId, flowRateLpm } = reading;
  const cooldown = config.anomaly.cooldownMinutes;
  const readingTimestamp = reading.timestamp ? new Date(reading.timestamp) : undefined;

  // 1. Continuous flow duration check
  if (flowRateLpm > config.anomaly.waterMinFlowThreshold) {
    if (!continuousFlowStartMap.get(deviceId)) {
      continuousFlowStartMap.set(deviceId, new Date());
    }

    const durationMinutes = getContinuousFlowMinutes(deviceId);
    let severity: 'low' | 'medium' | 'high' | null = null;

    if (durationMinutes >= config.anomaly.waterContinuousMinutes.high) {
      severity = 'high';
    } else if (durationMinutes >= config.anomaly.waterContinuousMinutes.medium) {
      severity = 'medium';
    } else if (durationMinutes >= config.anomaly.waterContinuousMinutes.low) {
      severity = 'low';
    }

    if (severity) {
      const msg = `Possible abnormal water usage: continuous flow for ${Math.round(durationMinutes)} mins`;
      if (!(await recentAnomalyExists(deviceId, msg, cooldown))) {
        await saveAndEmitAnomaly(io, {
          deviceId,
          resourceType: 'water',
          severity,
          message: msg,
          actualValue: parseFloat(durationMinutes.toFixed(1)),
          baselineValue: 0,
          threshold: config.anomaly.waterContinuousMinutes.low,
          unit: 'min',
          timestamp: readingTimestamp,
        });
      }
    }
  } else {
    // Flow stopped or below threshold, reset continuous flow tracker
    continuousFlowStartMap.set(deviceId, null);
  }

  // 2. High instantaneous flow rate check (e.g. > 10 L/min or config limit)
  const highFlowThreshold = config.anomaly.waterFlowMaxLmin;
  if (flowRateLpm > highFlowThreshold) {
    const msg = 'Unusually high water flow detected';
    if (!(await recentAnomalyExists(deviceId, msg, cooldown))) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'water',
        severity: flowRateLpm > 20 ? 'high' : 'medium',
        message: msg,
        actualValue: flowRateLpm,
        baselineValue: 3.5,
        threshold: highFlowThreshold,
        unit: 'L/min',
        timestamp: readingTimestamp,
      });
    }
  }
}

// ── Check Electricity Reading Anomalies ────────────────────────────────────────
export async function checkElectricityAnomalies(
  io: SocketIOServer,
  reading: {
    deviceId: string;
    voltage: number;
    current: number;
    power: number;
    energyKwh: number;
    timestamp?: Date | string;
  }
) {
  const { deviceId, voltage, power } = reading;
  const cooldown = config.anomaly.cooldownMinutes;
  const readingTimestamp = reading.timestamp ? new Date(reading.timestamp) : undefined;

  // 1. Voltage out of safe range
  if (voltage < config.anomaly.electricityVoltageMin || voltage > config.anomaly.electricityVoltageMax) {
    const msg = `Grid voltage abnormal (${voltage}V)`;
    if (!(await recentAnomalyExists(deviceId, msg, cooldown))) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'electricity',
        severity: 'low',
        message: msg,
        actualValue: voltage,
        baselineValue: 230,
        threshold: voltage < config.anomaly.electricityVoltageMin ? config.anomaly.electricityVoltageMin : config.anomaly.electricityVoltageMax,
        unit: 'V',
        timestamp: readingTimestamp,
      });
    }
  }

  // 2. High power threshold (e.g. > 700W or config limit > 3000W)
  const powerThreshold = config.anomaly.electricityPowerMaxW;
  if (power > powerThreshold) {
    const msg = 'Power consumption increased above normal level';
    if (!(await recentAnomalyExists(deviceId, msg, cooldown))) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'electricity',
        severity: power > 2500 ? 'high' : 'medium',
        message: msg,
        actualValue: power,
        baselineValue: 500,
        threshold: powerThreshold,
        unit: 'W',
        timestamp: readingTimestamp,
      });
    }
  }

  // 3. Power surge above recent baseline
  try {
    const recentReadings = await prisma.electricityReading.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { power: true },
    });

    if (recentReadings.length >= 10) {
      const avgPower = recentReadings.reduce((sum, r) => sum + r.power, 0) / recentReadings.length;
      if (avgPower > 50 && power > avgPower * config.anomaly.electricityBaselineMultiplier) {
        const msg = 'Sudden electricity power surge detected';
        if (!(await recentAnomalyExists(deviceId, msg, cooldown))) {
          await saveAndEmitAnomaly(io, {
            deviceId,
            resourceType: 'electricity',
            severity: 'medium',
            message: msg,
            actualValue: power,
            baselineValue: parseFloat(avgPower.toFixed(1)),
            threshold: parseFloat((avgPower * config.anomaly.electricityBaselineMultiplier).toFixed(1)),
            unit: 'W',
            timestamp: readingTimestamp,
          });
        }
      }
    }
  } catch (err: unknown) {
    logger.error('[AnomalyService] Error checking baseline power:', err);
  }
}

// ── Query Anomalies ────────────────────────────────────────────────────────────
export async function getAnomalies(limit = 50, offset = 0, resourceType?: string) {
  try {
    const anomalies = await prisma.anomaly.findMany({
      where: resourceType ? { resourceType } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    return anomalies.map(a => ({
      id: a.id,
      deviceId: a.deviceId,
      type: a.resourceType as 'water' | 'electricity',
      resourceType: a.resourceType,
      severity: a.severity as 'low' | 'medium' | 'high',
      message: a.message,
      value: a.actualValue,
      actualValue: a.actualValue,
      baselineValue: a.baselineValue,
      threshold: a.threshold,
      unit: a.resourceType === 'water' ? 'L/min' : 'W',
      timestamp: a.timestamp.toISOString(),
      resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (err: unknown) {
    logger.error('[AnomalyService] Error retrieving anomalies:', err);
    throw err;
  }
}

