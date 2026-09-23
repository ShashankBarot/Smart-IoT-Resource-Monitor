import { z } from 'zod';

export const CombinedTelemetrySchema = z.object({
  deviceId: z.string().min(1),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  water: z.object({
    flowRateLpm: z.number().optional(),
    flowRate: z.number().optional(),
    totalLitres: z.number().nonnegative(),
  }).transform(w => ({
    flowRateLpm: w.flowRateLpm ?? w.flowRate ?? 0,
    totalLitres: w.totalLitres,
  })),
  electricity: z.object({
    voltage: z.number().nonnegative(),
    current: z.number().nonnegative(),
    power: z.number().nonnegative(),
    energyKwh: z.number().optional(),
    energy: z.number().optional(),
  }).transform(e => ({
    voltage: e.voltage,
    current: e.current,
    power: e.power,
    energyKwh: e.energyKwh ?? e.energy ?? 0,
  })),
});

export const SplitWaterSchema = z.object({
  deviceId: z.string().min(1),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  flowRate: z.number().optional(),
  flowRateLpm: z.number().optional(),
  totalLitres: z.number().nonnegative(),
  unit: z.string().optional(),
}).transform(w => ({
  deviceId: w.deviceId,
  timestamp: w.timestamp,
  flowRateLpm: w.flowRateLpm ?? w.flowRate ?? 0,
  totalLitres: w.totalLitres,
}));

export const SplitElectricitySchema = z.object({
  deviceId: z.string().min(1),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  voltage: z.number().nonnegative(),
  current: z.number().nonnegative(),
  power: z.number().nonnegative(),
  energy: z.number().optional(),
  energyKwh: z.number().optional(),
  unit: z.string().optional(),
}).transform(e => ({
  deviceId: e.deviceId,
  timestamp: e.timestamp,
  voltage: e.voltage,
  current: e.current,
  power: e.power,
  energyKwh: e.energyKwh ?? e.energy ?? 0,
}));

export const DeviceStatusSchema = z.object({
  deviceId: z.string().min(1),
  status: z.enum(['online', 'offline']),
  rssi: z.number().optional().nullable(),
  freeHeap: z.number().optional().nullable(),
});

export type ValidatedCombinedTelemetry = z.infer<typeof CombinedTelemetrySchema>;
export type ValidatedWaterTelemetry = z.infer<typeof SplitWaterSchema>;
export type ValidatedElectricityTelemetry = z.infer<typeof SplitElectricitySchema>;
export type ValidatedDeviceStatus = z.infer<typeof DeviceStatusSchema>;

