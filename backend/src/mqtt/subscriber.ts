import mqtt, { MqttClient } from 'mqtt';
import { Server as SocketIOServer } from 'socket.io';
import config from '../config';
import logger from '../utils/logger';
import {
  CombinedTelemetrySchema,
  SplitWaterSchema,
  SplitElectricitySchema,
  DeviceStatusSchema,
} from './validator';
import { upsertDevice } from '../services/deviceService';
import { recordWaterReading } from '../services/waterService';
import { recordElectricityReading } from '../services/electricityService';
import { checkWaterAnomalies, checkElectricityAnomalies } from '../services/anomalyService';

let client: MqttClient | null = null;

export function connectMqttSubscriber(io: SocketIOServer): MqttClient {
  if (client) {
    return client;
  }

  const { brokerUrl, username, password } = config.mqtt;

  logger.info(`[MQTT] Connecting to broker at ${brokerUrl}...`);

  client = mqtt.connect(brokerUrl, {
    clientId: `backend-subscriber-${Date.now()}`,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
  });

  client.on('connect', () => {
    logger.info(`[MQTT] ✅ Connected to broker at ${brokerUrl}`);

    // Subscribe to both topics for 100% compatibility across firmware, simulator, and documentation
    const topics = ['resource/#', 'sensors/#'];
    client?.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        logger.error('[MQTT] ❌ Subscription error:', err);
      } else {
        logger.info(`[MQTT] 📡 Subscribed to topics: ${topics.join(', ')}`);
      }
    });
  });

  client.on('reconnect', () => {
    logger.warn('[MQTT] 🔄 Reconnecting to broker...');
  });

  client.on('error', (err: Error) => {
    logger.error('[MQTT] ❌ Client error:', err.message);
  });

  client.on('offline', () => {
    logger.warn('[MQTT] ⚠️ Broker offline.');
  });

  client.on('message', async (topic: string, message: Buffer) => {
    const rawString = message.toString();

    try {
      const parsedJson = JSON.parse(rawString);

      // ── Handle Combined Telemetry: "resource/readings" ──────────────────
      if (topic === 'resource/readings' || topic.endsWith('/readings')) {
        const validation = CombinedTelemetrySchema.safeParse(parsedJson);
        if (!validation.success) {
          logger.warn(`[MQTT] Invalid combined telemetry payload:`, validation.error.format());
          return;
        }

        const data = validation.data;
        const timestamp = data.timestamp;

        // 1. Mark device online
        await upsertDevice(data.deviceId, 'online');

        // 2. Persist readings
        await recordWaterReading({
          deviceId: data.deviceId,
          flowRateLpm: data.water.flowRateLpm,
          totalLitres: data.water.totalLitres,
          timestamp,
        });

        await recordElectricityReading({
          deviceId: data.deviceId,
          voltage: data.electricity.voltage,
          current: data.electricity.current,
          power: data.electricity.power,
          energyKwh: data.electricity.energyKwh,
          timestamp,
        });

        // 3. Evaluate anomalies
        await checkWaterAnomalies(io, {
          deviceId: data.deviceId,
          flowRateLpm: data.water.flowRateLpm,
          totalLitres: data.water.totalLitres,
          timestamp,
        });

        await checkElectricityAnomalies(io, {
          deviceId: data.deviceId,
          voltage: data.electricity.voltage,
          current: data.electricity.current,
          power: data.electricity.power,
          energyKwh: data.electricity.energyKwh,
          timestamp,
        });

        // 4. Emit real-time telemetry to frontend clients
        const unifiedPayload = {
          deviceId: data.deviceId,
          timestamp,
          flowRate: data.water.flowRateLpm,
          flowRateLpm: data.water.flowRateLpm,
          totalLitres: data.water.totalLitres,
          voltage: data.electricity.voltage,
          current: data.electricity.current,
          power: data.electricity.power,
          energy: data.electricity.energyKwh,
          energyKwh: data.electricity.energyKwh,
          unit: 'L',
          water: {
            deviceId: data.deviceId,
            timestamp,
            flowRate: data.water.flowRateLpm,
            flowRateLpm: data.water.flowRateLpm,
            totalLitres: data.water.totalLitres,
            unit: 'L',
          },
          electricity: {
            deviceId: data.deviceId,
            timestamp,
            voltage: data.electricity.voltage,
            current: data.electricity.current,
            power: data.electricity.power,
            energy: data.electricity.energyKwh,
            energyKwh: data.electricity.energyKwh,
            unit: 'home',
          },
        };

        io.emit('sensor:reading', unifiedPayload);
        // Also emit reading:update for compatibility
        io.emit('reading:update', unifiedPayload);
        return;
      }

      // ── Handle Device Heartbeat / Status / LWT: "resource/status" ────────
      if (topic === 'resource/status' || topic.endsWith('/status')) {
        const validation = DeviceStatusSchema.safeParse(parsedJson);
        if (!validation.success) {
          logger.warn(`[MQTT] Invalid device status payload:`, validation.error.format());
          return;
        }

        const { deviceId, status, rssi, freeHeap } = validation.data;
        await upsertDevice(deviceId, status, { rssi, freeHeap });

        const statusPayload = {
          deviceId,
          status,
          lastSeen: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          rssi: rssi ?? null,
        };

        io.emit('device:status', statusPayload);
        logger.info(`[MQTT] Device status update: ${deviceId} is ${status.toUpperCase()}`);
        return;
      }

      // ── Handle Split Water Reading: "sensors/water" ──────────────────────
      if (topic === 'sensors/water') {
        const validation = SplitWaterSchema.safeParse(parsedJson);
        if (!validation.success) {
          logger.warn(`[MQTT] Invalid water reading payload:`, validation.error.format());
          return;
        }

        const data = validation.data;
        await upsertDevice(data.deviceId, 'online');
        await recordWaterReading(data);
        await checkWaterAnomalies(io, data);

        const waterPayload = {
          deviceId: data.deviceId,
          timestamp: data.timestamp,
          flowRate: data.flowRateLpm,
          flowRateLpm: data.flowRateLpm,
          totalLitres: data.totalLitres,
          unit: 'L',
        };

        io.emit('sensor:reading', waterPayload);
        return;
      }

      // ── Handle Split Electricity Reading: "sensors/electricity" ──────────
      if (topic === 'sensors/electricity') {
        const validation = SplitElectricitySchema.safeParse(parsedJson);
        if (!validation.success) {
          logger.warn(`[MQTT] Invalid electricity reading payload:`, validation.error.format());
          return;
        }

        const data = validation.data;
        await upsertDevice(data.deviceId, 'online');
        await recordElectricityReading(data);
        await checkElectricityAnomalies(io, data);

        const electricityPayload = {
          deviceId: data.deviceId,
          timestamp: data.timestamp,
          voltage: data.voltage,
          current: data.current,
          power: data.power,
          energy: data.energyKwh,
          energyKwh: data.energyKwh,
          unit: 'home',
        };

        io.emit('sensor:reading', electricityPayload);
        return;
      }
    } catch (parseError: unknown) {
      logger.error(`[MQTT] Failed to process message from "${topic}":`, parseError);
    }
  });

  return client;
}

export async function disconnectMqttSubscriber(): Promise<void> {
  if (client) {
    return new Promise((resolve) => {
      client?.end(false, {}, () => {
        logger.info('[MQTT] Client disconnected.');
        client = null;
        resolve();
      });
    });
  }
}

