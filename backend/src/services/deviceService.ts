import prisma from '../lib/prisma';
import logger from '../utils/logger';
import config from '../config';
import { Server as SocketIOServer } from 'socket.io';

export async function upsertDevice(
  deviceId: string,
  status: 'online' | 'offline',
  details?: { rssi?: number | null; freeHeap?: number | null }
) {
  try {
    const device = await prisma.device.upsert({
      where: { deviceId },
      create: {
        deviceId,
        name: deviceId,
        status,
        lastSeenAt: new Date(),
        rssi: details?.rssi ?? null,
        freeHeap: details?.freeHeap ?? null,
      },
      update: {
        status,
        lastSeenAt: new Date(),
        ...(details?.rssi !== undefined && { rssi: details.rssi }),
        ...(details?.freeHeap !== undefined && { freeHeap: details.freeHeap }),
      },
    });
    return device;
  } catch (err: unknown) {
    logger.error(`[DeviceService] Failed to upsert device ${deviceId}:`, err);
    throw err;
  }
}

export async function getDeviceStatus(preferredDeviceId?: string) {
  try {
    let device = null;
    if (preferredDeviceId) {
      device = await prisma.device.findUnique({
        where: { deviceId: preferredDeviceId },
      });
    }

    if (!device) {
      // Find the most recently seen device
      device = await prisma.device.findFirst({
        orderBy: { lastSeenAt: 'desc' },
      });
    }

    if (!device) {
      return {
        deviceId: 'esp32-01',
        status: 'offline',
        lastSeen: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        rssi: -60,
      };
    }

    return {
      id: device.id,
      deviceId: device.deviceId,
      name: device.name,
      status: device.status as 'online' | 'offline',
      lastSeen: device.lastSeenAt ? device.lastSeenAt.toISOString() : new Date().toISOString(),
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : new Date().toISOString(),
      rssi: device.rssi ?? -50,
      freeHeap: device.freeHeap,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  } catch (err: unknown) {
    logger.error('[DeviceService] Error fetching device status:', err);
    throw err;
  }
}

export async function listDevices() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return devices.map(d => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      status: d.status,
      lastSeen: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      rssi: d.rssi,
      freeHeap: d.freeHeap,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  } catch (err: unknown) {
    logger.error('[DeviceService] Error listing devices:', err);
    throw err;
  }
}

let watchdogIntervalHandle: NodeJS.Timeout | null = null;

export function startDeviceWatchdog(io: SocketIOServer) {
  if (watchdogIntervalHandle) {
    clearInterval(watchdogIntervalHandle);
  }

  const { watchdogIntervalMs, offlineTimeoutMs } = config.device;

  watchdogIntervalHandle = setInterval(async () => {
    try {
      const thresholdDate = new Date(Date.now() - offlineTimeoutMs);

      const expiredDevices = await prisma.device.findMany({
        where: {
          status: 'online',
          lastSeenAt: {
            lt: thresholdDate,
          },
        },
      });

      for (const device of expiredDevices) {
        logger.warn(
          `[DeviceWatchdog] Device "${device.deviceId}" has been silent for > ${offlineTimeoutMs / 1000}s. Marking OFFLINE.`
        );

        await prisma.device.update({
          where: { id: device.id },
          data: { status: 'offline' },
        });

        const statusPayload = {
          deviceId: device.deviceId,
          status: 'offline',
          lastSeen: device.lastSeenAt ? device.lastSeenAt.toISOString() : new Date().toISOString(),
          lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : new Date().toISOString(),
          rssi: device.rssi,
        };

        io.emit('device:status', statusPayload);
      }
    } catch (err: unknown) {
      logger.error('[DeviceWatchdog] Error during device status check:', err);
    }
  }, watchdogIntervalMs);

  logger.info(
    `[DeviceWatchdog] Started watchdog (check every ${watchdogIntervalMs / 1000}s, timeout ${offlineTimeoutMs / 1000}s).`
  );
}

export function stopDeviceWatchdog() {
  if (watchdogIntervalHandle) {
    clearInterval(watchdogIntervalHandle);
    watchdogIntervalHandle = null;
    logger.info('[DeviceWatchdog] Stopped watchdog.');
  }
}

