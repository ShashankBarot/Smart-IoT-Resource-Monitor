import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  host: process.env['HOST'] ?? '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',

  database: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/smart_monitor?schema=public',
  },

  mqtt: {
    brokerUrl: process.env['MQTT_BROKER_URL'] ?? 'mqtt://localhost:1883',
    username: process.env['MQTT_USERNAME'] ?? '',
    password: process.env['MQTT_PASSWORD'] ?? '',
  },

  anomaly: {
    waterFlowMaxLmin: parseFloat(process.env['WATER_FLOW_MAX_LMIN'] ?? '30'),
    waterContinuousMinutes: {
      low: 5,
      medium: 15,
      high: 30,
    },
    waterDailyLimitLitres: 200,
    waterMinFlowThreshold: 0.1,

    electricityVoltageMin: parseFloat(process.env['ELECTRICITY_VOLTAGE_MIN'] ?? '180'),
    electricityVoltageMax: parseFloat(process.env['ELECTRICITY_VOLTAGE_MAX'] ?? '260'),
    electricityPowerMaxW: parseFloat(process.env['ELECTRICITY_POWER_MAX_W'] ?? '3500'),
    electricityBaselineMultiplier: 2.0,
    cooldownMinutes: 5,
  },

  device: {
    offlineTimeoutMs: parseInt(process.env['DEVICE_OFFLINE_TIMEOUT_MS'] ?? '60000', 10),
    watchdogIntervalMs: 10000,
  },
};

export default config;

