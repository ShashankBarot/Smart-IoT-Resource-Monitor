import assert from 'node:assert/strict';
import { CombinedTelemetrySchema, SplitWaterSchema, SplitElectricitySchema } from '../src/mqtt/validator';

const firmwarePayload = {
  device_id: 'esp32-01',
  timestamp: '2026-09-25T09:30:00Z',
  water: {
    flow_rate_lpm: 3.2,
    total_volume_liters: 12.5,
    pulse_count: 144,
  },
  electricity: {
    voltage_v: 230.4,
    current_a: 0.42,
    power_w: 96.8,
    energy_kwh: 0.0012,
  },
};

const combined = CombinedTelemetrySchema.safeParse(firmwarePayload);
assert.equal(combined.success, true, 'Firmware combined telemetry should be accepted');
if (combined.success) {
  assert.equal(combined.data.deviceId, 'esp32-01');
  assert.equal(combined.data.water.flowRateLpm, 3.2);
  assert.equal(combined.data.electricity.energyKwh, 0.0012);
}

assert.equal(
  SplitWaterSchema.safeParse({ deviceId: 'esp32-01', flowRate: 3.2, totalLitres: 12.5 }).success,
  true,
  'Legacy split water telemetry should be accepted',
);
assert.equal(
  SplitElectricitySchema.safeParse({
    deviceId: 'esp32-01',
    voltage: 230.4,
    current: 0.42,
    power: 96.8,
    energyKwh: 0.0012,
  }).success,
  true,
  'Legacy split electricity telemetry should be accepted',
);
assert.equal(
  CombinedTelemetrySchema.safeParse({
    device_id: 'esp32-01',
    water: { flow_rate_lpm: 3.2 },
    electricity: firmwarePayload.electricity,
  }).success,
  false,
  'Incomplete water telemetry should be rejected',
);

console.log('MQTT contract tests passed.');