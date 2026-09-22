/**
 * mqtt-simulator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates an ESP32 IoT device that publishes water + electricity readings to
 * the Mosquitto MQTT broker every 5 seconds.
 *
 * Usage:
 *   npx ts-node scripts/mqtt-simulator.ts [scenario]
 *   SCENARIO=2 npx ts-node scripts/mqtt-simulator.ts
 *
 * Scenarios:
 *   1 – Normal operation        (default)
 *   2 – Water anomaly           (high flow rate)
 *   3 – High electricity        (power surge)
 *   4 – ESP32 offline           (stops publishing)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mqtt, { MqttClient } from 'mqtt';

// ── Constants ─────────────────────────────────────────────────────────────────

const BROKER_URL   = 'mqtt://localhost:1883';
const TOPIC        = 'resource/readings';
const DEVICE_ID    = 'simulator-01';
const INTERVAL_MS  = 5_000; // publish every 5 seconds

/** Parse scenario from CLI arg or SCENARIO env variable; default = 1 */
const rawScenario  = process.argv[2] ?? process.env['SCENARIO'] ?? '1';
const SCENARIO     = parseInt(rawScenario, 10);

// ── Accumulator state (persists across publishes within a session) ─────────────

let totalLitres : number = 0;   // Litres accumulated since simulator start
let energyKwh   : number = 0;   // kWh accumulated since simulator start

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Returns a random float between min (inclusive) and max (exclusive),
 * rounded to the given number of decimal places.
 */
function rand(min: number, max: number, decimals = 2): number {
  const raw = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(raw * factor) / factor;
}

/** Clamp a value between lo and hi */
function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// ── Payload builders per scenario ─────────────────────────────────────────────

interface WaterReading {
  flowRateLpm: number;
  totalLitres: number;
}

interface ElectricityReading {
  voltage    : number;
  current    : number;
  power      : number;
  energyKwh  : number;
}

interface IoTPayload {
  deviceId    : string;
  timestamp   : string;         // ISO-8601 UTC
  water       : WaterReading;
  electricity : ElectricityReading;
}

/**
 * SCENARIO 1 – Normal household operation
 *   • Flow rate: 0 – 3 LPM (tap open/closed randomly)
 *   • Power:     100 – 300 W
 *   • Voltage:   229 – 231 V (grid-stable)
 */
function buildScenario1(): { water: WaterReading; electricity: ElectricityReading } {
  const flowRateLpm = rand(0, 3, 2);
  const voltage     = rand(229, 231, 1);
  const power       = rand(100, 300, 1);
  const current     = parseFloat((power / voltage).toFixed(2));

  // Accumulate (INTERVAL_MS / 60_000 minutes elapsed per tick)
  const minutesElapsed = INTERVAL_MS / 60_000;
  totalLitres = parseFloat((totalLitres + flowRateLpm * minutesElapsed).toFixed(3));
  energyKwh   = parseFloat((energyKwh   + (power / 1000) * (INTERVAL_MS / 3_600_000)).toFixed(6));

  return {
    water       : { flowRateLpm, totalLitres },
    electricity : { voltage, current, power, energyKwh },
  };
}

/**
 * SCENARIO 2 – Water anomaly (burst pipe / tap left open)
 *   • Flow rate: 15 – 25 LPM (sustained high flow)
 *   • Power:     100 – 300 W (electricity stays normal)
 *   • Voltage:   229 – 231 V
 */
function buildScenario2(): { water: WaterReading; electricity: ElectricityReading } {
  const flowRateLpm = rand(15, 25, 2);
  const voltage     = rand(229, 231, 1);
  const power       = rand(100, 300, 1);
  const current     = parseFloat((power / voltage).toFixed(2));

  const minutesElapsed = INTERVAL_MS / 60_000;
  totalLitres = parseFloat((totalLitres + flowRateLpm * minutesElapsed).toFixed(3));
  energyKwh   = parseFloat((energyKwh   + (power / 1000) * (INTERVAL_MS / 3_600_000)).toFixed(6));

  return {
    water       : { flowRateLpm, totalLitres },
    electricity : { voltage, current, power, energyKwh },
  };
}

/**
 * SCENARIO 3 – High electricity usage (industrial load / fault)
 *   • Flow rate: 0 – 2 LPM (normal water)
 *   • Power:     3000 – 5000 W
 *   • Voltage:   225 – 235 V (slight sag under load)
 */
function buildScenario3(): { water: WaterReading; electricity: ElectricityReading } {
  const flowRateLpm = rand(0, 2, 2);
  const voltage     = rand(225, 235, 1);
  const power       = rand(3000, 5000, 1);
  const current     = parseFloat((power / voltage).toFixed(2));

  const minutesElapsed = INTERVAL_MS / 60_000;
  totalLitres = parseFloat((totalLitres + flowRateLpm * minutesElapsed).toFixed(3));
  energyKwh   = parseFloat((energyKwh   + (power / 1000) * (INTERVAL_MS / 3_600_000)).toFixed(6));

  return {
    water       : { flowRateLpm, totalLitres },
    electricity : { voltage, current, power, energyKwh },
  };
}

// ── MQTT connection ───────────────────────────────────────────────────────────

/** Interval handle – kept so we can clear it on shutdown */
let publishInterval: ReturnType<typeof setInterval> | null = null;

function startSimulator(): void {
  // ── SCENARIO 4: offline simulation ──────────────────────────────────────────
  if (SCENARIO === 4) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   SCENARIO 4 – ESP32 OFFLINE SIMULATION              ║');
    console.log('║                                                      ║');
    console.log('║   The device is powered off / disconnected.          ║');
    console.log('║   No MQTT messages will be published.                ║');
    console.log('║   The backend will mark this device as "offline"     ║');
    console.log('║   after the configured timeout window expires.       ║');
    console.log('║                                                      ║');
    console.log('║   Press Ctrl+C to exit.                              ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    // Keep the process alive so the user can observe the backend timeout
    process.stdin.resume();
    return;
  }

  // ── Validate scenario ───────────────────────────────────────────────────────
  if (![1, 2, 3].includes(SCENARIO)) {
    console.error(`[Simulator] ❌  Unknown scenario "${SCENARIO}". Use 1, 2, 3, or 4.`);
    process.exit(1);
  }

  const scenarioLabels: Record<number, string> = {
    1: 'Normal Operation',
    2: 'Water Anomaly (High Flow)',
    3: 'High Electricity (Power Surge)',
  };

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║   MQTT IoT Simulator – Scenario ${SCENARIO}: ${scenarioLabels[SCENARIO].padEnd(19)}║`);
  console.log(`║   Broker  : ${BROKER_URL.padEnd(41)}║`);
  console.log(`║   Topic   : ${TOPIC.padEnd(41)}║`);
  console.log(`║   Interval: every ${(INTERVAL_MS / 1000).toString().padEnd(3)}s                              ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // ── Connect to Mosquitto ────────────────────────────────────────────────────
  const client: MqttClient = mqtt.connect(BROKER_URL, {
    clientId  : `iot-simulator-${Date.now()}`,
    clean     : true,
    reconnectPeriod: 3_000,        // retry every 3 s if connection drops
    connectTimeout : 10_000,
  });

  // ── Connection events ───────────────────────────────────────────────────────

  client.on('connect', () => {
    console.log(`[Simulator] ✅  Connected to broker at ${BROKER_URL}`);
    console.log(`[Simulator] 📡  Publishing to "${TOPIC}" every ${INTERVAL_MS / 1000}s...\n`);

    // Start the periodic publish loop
    publishInterval = setInterval(() => {
      publishReading(client);
    }, INTERVAL_MS);

    // Publish immediately on connect (don't wait for first interval tick)
    publishReading(client);
  });

  client.on('reconnect', () => {
    console.log('[Simulator] 🔄  Reconnecting to broker...');
  });

  client.on('error', (err: Error) => {
    console.error('[Simulator] ❌  MQTT error:', err.message);
  });

  client.on('offline', () => {
    console.warn('[Simulator] ⚠️   Broker offline – buffering messages.');
  });

  client.on('close', () => {
    console.log('[Simulator] 🔌  Connection closed.');
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n[Simulator] 🛑  Received ${signal}. Shutting down gracefully...`);

    if (publishInterval) {
      clearInterval(publishInterval);
      publishInterval = null;
    }

    client.end(false, {}, () => {
      console.log('[Simulator] 👋  MQTT client disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ── Publish a single reading ──────────────────────────────────────────────────

function publishReading(client: MqttClient): void {
  let readings: { water: WaterReading; electricity: ElectricityReading };

  switch (SCENARIO) {
    case 2:
      readings = buildScenario2();
      break;
    case 3:
      readings = buildScenario3();
      break;
    case 1:
    default:
      readings = buildScenario1();
      break;
  }

  const payload: IoTPayload = {
    deviceId  : DEVICE_ID,
    timestamp : new Date().toISOString(),   // current UTC timestamp
    water     : readings.water,
    electricity: readings.electricity,
  };

  const message = JSON.stringify(payload, null, 2);

  client.publish(
    TOPIC,
    message,
    { qos: 1, retain: false },
    (err?: Error) => {
      if (err) {
        console.error('[Simulator] ❌  Publish error:', err.message);
        return;
      }

      // Pretty-print to console so the developer can see live data
      console.log('─'.repeat(60));
      console.log(`[Simulator] 📤  Published @ ${payload.timestamp}`);
      console.log(`  💧 Water      → Flow: ${payload.water.flowRateLpm} LPM  |  Total: ${payload.water.totalLitres} L`);
      console.log(`  ⚡ Electricity → Power: ${payload.electricity.power} W  |  Voltage: ${payload.electricity.voltage} V  |  Energy: ${payload.electricity.energyKwh} kWh`);
    },
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

startSimulator();
