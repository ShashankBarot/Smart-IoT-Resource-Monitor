import { z } from 'zod';

const deviceFields = {
  deviceId: z.string().min(1).optional(),
  device_id: z.string().min(1).optional(),
};

const waterFields = {
  flowRateLpm: z.number().nonnegative().optional(),
  flowRate: z.number().nonnegative().optional(),
  flow_rate_lpm: z.number().nonnegative().optional(),
  totalLitres: z.number().nonnegative().optional(),
  total_volume_liters: z.number().nonnegative().optional(),
  total_litres: z.number().nonnegative().optional(),
};

const electricityFields = {
  voltage: z.number().nonnegative().optional(),
  voltage_v: z.number().nonnegative().optional(),
  current: z.number().nonnegative().optional(),
  current_a: z.number().nonnegative().optional(),
  power: z.number().nonnegative().optional(),
  power_w: z.number().nonnegative().optional(),
  energyKwh: z.number().nonnegative().optional(),
  energy_kwh: z.number().nonnegative().optional(),
  energy: z.number().nonnegative().optional(),
};

function requireDeviceId(value: { deviceId?: string; device_id?: string }, context: z.RefinementCtx) {
  if (!value.deviceId && !value.device_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Either 'deviceId' or 'device_id' must be provided", path: ['deviceId'] });
  }
}

export const CombinedTelemetrySchema = z.object({
  ...deviceFields,
  timestamp: z.string().datetime({ offset: true }).optional().default(() => new Date().toISOString()),
  water: z.object(waterFields).superRefine((water, context) => {
    if (water.flowRateLpm === undefined && water.flowRate === undefined && water.flow_rate_lpm === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Water flow rate is required', path: ['flowRateLpm'] });
    }
    if (water.totalLitres === undefined && water.total_volume_liters === undefined && water.total_litres === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Total water volume is required', path: ['totalLitres'] });
    }
  }).transform(w => ({
    flowRateLpm: w.flow_rate_lpm ?? w.flowRateLpm ?? w.flowRate as number,
    totalLitres: w.total_volume_liters ?? w.totalLitres ?? w.total_litres as number,
  })),
  electricity: z.object(electricityFields).superRefine((electricity, context) => {
    if (electricity.voltage === undefined && electricity.voltage_v === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Voltage is required', path: ['voltage'] });
    }
    if (electricity.current === undefined && electricity.current_a === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Current is required', path: ['current'] });
    }
    if (electricity.power === undefined && electricity.power_w === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Power is required', path: ['power'] });
    }
    if (electricity.energyKwh === undefined && electricity.energy_kwh === undefined && electricity.energy === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Energy is required', path: ['energyKwh'] });
    }
  }).transform(e => ({
    voltage: e.voltage_v ?? e.voltage as number,
    current: e.current_a ?? e.current as number,
    power: e.power_w ?? e.power as number,
    energyKwh: e.energy_kwh ?? e.energyKwh ?? e.energy as number,
  })),
}).superRefine(requireDeviceId).transform(value => ({
  deviceId: (value.device_id ?? value.deviceId) as string,
  timestamp: value.timestamp,
  water: value.water,
  electricity: value.electricity,
}));

export const SplitWaterSchema = z.object({
  ...deviceFields,
  timestamp: z.string().datetime({ offset: true }).optional().default(() => new Date().toISOString()),
  ...waterFields,
  unit: z.string().optional(),
}).superRefine((water, context) => {
  requireDeviceId(water, context);
  if (water.flowRateLpm === undefined && water.flowRate === undefined && water.flow_rate_lpm === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Water flow rate is required', path: ['flowRateLpm'] });
  }
  if (water.totalLitres === undefined && water.total_volume_liters === undefined && water.total_litres === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Total water volume is required', path: ['totalLitres'] });
  }
}).transform(w => ({
  deviceId: (w.device_id ?? w.deviceId) as string,
  timestamp: w.timestamp,
  flowRateLpm: w.flow_rate_lpm ?? w.flowRateLpm ?? w.flowRate as number,
  totalLitres: w.total_volume_liters ?? w.totalLitres ?? w.total_litres as number,
}));

export const SplitElectricitySchema = z.object({
  ...deviceFields,
  timestamp: z.string().datetime({ offset: true }).optional().default(() => new Date().toISOString()),
  ...electricityFields,
  unit: z.string().optional(),
}).superRefine((electricity, context) => {
  requireDeviceId(electricity, context);
  if (electricity.voltage === undefined && electricity.voltage_v === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Voltage is required', path: ['voltage'] });
  }
  if (electricity.current === undefined && electricity.current_a === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Current is required', path: ['current'] });
  }
  if (electricity.power === undefined && electricity.power_w === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Power is required', path: ['power'] });
  }
  if (electricity.energyKwh === undefined && electricity.energy_kwh === undefined && electricity.energy === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Energy is required', path: ['energyKwh'] });
  }
}).transform(e => ({
  deviceId: (e.device_id ?? e.deviceId) as string,
  timestamp: e.timestamp,
  voltage: e.voltage_v ?? e.voltage as number,
  current: e.current_a ?? e.current as number,
  power: e.power_w ?? e.power as number,
  energyKwh: e.energy_kwh ?? e.energyKwh ?? e.energy as number,
}));

export const DeviceStatusSchema = z.object({
  ...deviceFields,
  status: z.enum(['online', 'offline']),
  rssi: z.number().optional().nullable(),
  wifi_rssi_dbm: z.number().optional().nullable(),
  freeHeap: z.number().optional().nullable(),
  free_heap: z.number().optional().nullable(),
}).superRefine(requireDeviceId).transform(value => ({
  deviceId: (value.device_id ?? value.deviceId) as string,
  status: value.status,
  rssi: value.wifi_rssi_dbm ?? value.rssi ?? null,
  freeHeap: value.free_heap ?? value.freeHeap ?? null,
}));

export type ValidatedCombinedTelemetry = z.infer<typeof CombinedTelemetrySchema>;
export type ValidatedWaterTelemetry = z.infer<typeof SplitWaterSchema>;
export type ValidatedElectricityTelemetry = z.infer<typeof SplitElectricitySchema>;
export type ValidatedDeviceStatus = z.infer<typeof DeviceStatusSchema>;

