# TEAM_TASK_DISTRIBUTION.md
# Smart IoT-Based Water and Electricity Consumption Monitoring System
### Project-Based Learning (PBL) — Team Task Distribution & Ownership Guide

> **Document Version:** 1.0.0  
> **Last Updated:** 2026-09-22  
> **Status:** Active — All members must read this document in full before beginning any implementation work.

---

## Table of Contents

1. [Team Overview](#1-team-overview)
2. [Parallel Development Philosophy](#2-parallel-development-philosophy)
3. [Shared Contracts and Interfaces](#3-shared-contracts-and-interfaces)
4. [Member 1 — Hardware, ESP32 Firmware & IoT Integration](#4-member-1--hardware-esp32-firmware--iot-integration)
5. [Member 2 — Backend, Database & Analytics](#5-member-2--backend-database--analytics)
6. [Member 3 — Frontend, Dashboard & Real-Time Visualization](#6-member-3--frontend-dashboard--real-time-visualization)
7. [File Ownership Matrix](#7-file-ownership-matrix)
8. [Integration Milestones](#8-integration-milestones)
9. [Communication Protocol Between Members](#9-communication-protocol-between-members)

---

## 1. Team Overview

This project is built by a three-member team, each owning a distinct horizontal layer of the full-stack IoT system. The separation of concerns is intentional: it allows all three members to work in parallel throughout the development phase, minimizes cross-blocking dependencies, and maps cleanly to the three core domains of an IoT product — physical sensing, data processing, and user interface.

| Member | Role Title | Domain | Primary Specialization |
|--------|-----------|--------|----------------------|
| **Member 1** | IoT & Firmware Engineer | Hardware + Embedded C++ | Physical sensors, ESP32 firmware, MQTT publishing, circuit assembly |
| **Member 2** | Backend & Data Engineer | Server-Side + Database | Node.js, TypeScript, PostgreSQL, MQTT ingestion, REST API, analytics |
| **Member 3** | Frontend & UX Engineer | Client-Side | Next.js, React, Recharts, real-time WebSocket UI, mock-first development |

### Team Coordination Principles

- **No member is blocked by another member** during the first 80% of development. Each person can build and test their entire domain independently using stubs, simulators, and mock data.
- **Integration happens in two discrete phases** — backend ↔ firmware (Phase 2) and frontend ↔ backend (Phase 2) — both of which occur after each individual layer is already unit-tested and working in isolation.
- **Every inter-member dependency is documented explicitly** in this file. If you discover an undocumented dependency, you must raise it in the daily sync immediately.
- **The shared contract (MQTT payload schema + REST API shape + WebSocket events)** is the single source of truth that all three members code against. It lives in `docs/API_CONTRACT.md` and `shared/types.ts`.

---

## 2. Parallel Development Philosophy

The central challenge of a three-member IoT team is that hardware is physically owned by one person, the backend runs on a second machine, and the frontend runs on a third machine. If development is sequential (hardware → backend → frontend), two of three members sit idle for most of the project. This project explicitly rejects that pattern.

### The Three Parallel Tracks

```
Week 1-4: All three members work fully independently
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Member 1  │  Assemble hardware → Write firmware → Test sensors locally
Member 2  │  Set up backend → Build API → Test with MQTT simulator
Member 3  │  Build all UI components → Test with mock JSON fixtures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 5-6: Integration Phase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Member 1  │  Point ESP32 to Member 2's broker → Verify MQTT messages arrive
Member 2  │  Confirm readings insert into DB → Enable CORS → Turn on Socket.IO
Member 3  │  Switch USE_MOCK_API=false → Point to Member 2's API → Verify charts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### How Each Member Simulates Dependencies

#### Member 1 — No software dependency needed for Phase 1
Member 1 has all the real hardware. During Phase 1, they test firmware by connecting to a local Mosquitto broker running on their own laptop. They use the MQTT Explorer tool (or `mosquitto_sub`) to visually confirm their JSON payloads look correct. No backend code is needed for this phase.

#### Member 2 — MQTT Simulator replaces real hardware
Member 2 writes `backend/scripts/mqtt-simulator.ts`, a Node.js script that publishes realistic MQTT messages to `resource/readings` every 5 seconds on a tight loop. The simulator generates plausible values for flow rate, voltage, and current with small random jitter added, so the database receives realistic-looking time-series data. This simulator makes the entire backend testable without any physical device.

```typescript
// Example: mqtt-simulator.ts publishes this payload every 5 seconds
{
  "device_id": "ESP32_SIM_001",
  "timestamp": "2026-09-22T14:23:05.000Z",
  "water": {
    "flow_rate_lpm": 12.34,
    "total_volume_liters": 1042.7,
    "pulse_count": 52135
  },
  "electricity": {
    "voltage_v": 231.8,
    "current_a": 4.12,
    "power_w": 954.2,
    "energy_kwh": 0.2648,
    "power_factor": 1.0
  },
  "uptime_seconds": 86400,
  "wifi_rssi_dbm": -62
}
```

#### Member 3 — Mock JSON Fixtures replace real API
Member 3 creates `frontend/lib/mockData.ts`, which contains pre-authored JavaScript objects that exactly match the shape of every REST API endpoint and every Socket.IO event. A single environment variable `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local` makes every `fetch()` call in the frontend return mock data instead of hitting the real backend. This means Member 3 can build and demo the entire dashboard — charts, real-time updates, anomaly cards, everything — without Member 2's backend being running at all.

When integration time comes, Member 3 simply changes `NEXT_PUBLIC_USE_MOCK_API=false` and the app switches to real data.

---

## 3. Shared Contracts and Interfaces

These contracts are agreed upon by all three members at the start of the project. **No member may unilaterally change these contracts without a team discussion.** Changes must be reflected in `docs/API_CONTRACT.md` and `shared/types.ts`.

### 3.1 MQTT Topic Structure

| Topic | Publisher | Subscriber | Purpose |
|-------|-----------|------------|---------|
| `resource/readings` | ESP32 (Member 1) | Backend (Member 2) | Sensor data payload published every 10 seconds |
| `resource/status` | ESP32 (Member 1) | Backend (Member 2) | Device heartbeat published every 30 seconds |
| `resource/command` | Backend (Member 2) | ESP32 (Member 1) | Optional: commands sent to device (e.g., reset counter) |

### 3.2 Canonical MQTT Payload — `resource/readings`

```json
{
  "device_id": "ESP32_WEM_001",
  "timestamp": "2026-09-22T14:23:05.000Z",
  "water": {
    "flow_rate_lpm": 12.34,
    "total_volume_liters": 1042.7,
    "pulse_count": 52135
  },
  "electricity": {
    "voltage_v": 231.8,
    "current_a": 4.12,
    "power_w": 954.2,
    "energy_kwh": 0.2648,
    "power_factor": 1.0
  },
  "uptime_seconds": 86400,
  "wifi_rssi_dbm": -62
}
```

### 3.3 MQTT Payload — `resource/status`

```json
{
  "device_id": "ESP32_WEM_001",
  "timestamp": "2026-09-22T14:23:05.000Z",
  "status": "online",
  "ip_address": "192.168.1.105",
  "firmware_version": "1.0.0",
  "uptime_seconds": 86400,
  "wifi_rssi_dbm": -62,
  "free_heap_bytes": 182432
}
```

### 3.4 REST API Base URL

```
http://localhost:3001/api/v1
```

All endpoints, response shapes, and error formats are documented in `docs/API_CONTRACT.md`.

### 3.5 Key REST Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/water/readings` | Paginated water readings with optional `from` / `to` query params |
| GET | `/water/analytics/daily` | Daily water consumption aggregated by day |
| GET | `/water/analytics/hourly` | Hourly consumption for a given date |
| GET | `/electricity/readings` | Paginated electricity readings |
| GET | `/electricity/analytics/daily` | Daily energy consumption in kWh |
| GET | `/electricity/analytics/hourly` | Hourly power readings |
| GET | `/anomalies` | All detected anomalies |
| GET | `/device/status` | Latest device status |
| GET | `/device/list` | All known devices |

### 3.6 Socket.IO Events

| Event Name | Direction | Payload | Description |
|-----------|-----------|---------|-------------|
| `sensor:reading` | Server → Client | Full readings payload (same as MQTT) | Emitted every time a new reading is stored |
| `anomaly:detected` | Server → Client | Anomaly object | Emitted when anomaly detection fires |
| `device:status` | Server → Client | Status payload | Emitted when heartbeat is received |
| `device:offline` | Server → Client | `{ device_id, last_seen }` | Emitted when device has not been heard from for >60s |

---

## 4. Member 1 — Hardware, ESP32 Firmware & IoT Integration

### 4.1 Profile

Member 1 physically owns all hardware components. Their responsibility is the **physical layer** of the IoT stack: assembling circuits, writing embedded C++ firmware for the ESP32, calibrating sensors, and ensuring that accurate, validated JSON payloads are delivered to the MQTT broker reliably and on schedule. They must also understand enough about the backend to diagnose connectivity and payload issues when performing integration.

Member 1 works primarily in **C++** using the **Arduino framework via PlatformIO** (preferred) or Arduino IDE. They are expected to be comfortable with microcontroller concepts such as GPIO pin modes, ADC readings, hardware interrupts, and non-blocking loop design.

### 4.2 Responsibilities

- Design and assemble the water flow sensing circuit using a YF-S201 or YF-S401 hall-effect flow sensor.
- Design and assemble the electricity monitoring circuit using a ZMPT101B voltage sensor module and an ACS712 current sensor module, with mandatory safety isolation from AC mains.
- Write production-quality ESP32 firmware that reads both sensors, calculates derived values (flow rate, power, energy), assembles a canonical JSON payload, and publishes it to MQTT on a strict 10-second schedule.
- Implement Wi-Fi connection with auto-reconnect and exponential back-off.
- Implement MQTT client with last-will message and reconnect logic.
- Implement hardware interrupt-based pulse counting for the flow sensor.
- Implement ADC-based sampling for both the voltage and current sensors with RMS calculation.
- Perform sensor calibration and document calibration factors.
- Coordinate with Member 2 to confirm MQTT message reception during integration.
- Coordinate with Member 3 to visually confirm live data appears in the dashboard during final integration.

### 4.3 Exact Tasks (Numbered and Detailed)

**Task 1 — Hardware Assembly: Water Flow Circuit**

Obtain the YF-S201 (or YF-S401) hall-effect flow sensor. Connect its three wires as follows: Red wire (VCC) to ESP32 3.3V or 5V pin (check your specific sensor's datasheet — YF-S201 typically operates at 5V but its signal output is 3.3V-compatible), Black wire (GND) to ESP32 GND, and Yellow wire (Signal/OUT) to ESP32 GPIO 18 (configurable in `config.h`). Add a 10kΩ pull-up resistor between the Signal wire and VCC to ensure clean digital pulses. The sensor generates approximately 7.5 pulses per liter of water flow (this is the default calibration factor Q = pulses / 7.5). Confirm the sensor is installed in-line with water flow direction (arrow on casing must match flow direction).

**Task 2 — Hardware Assembly: Electricity Sensing Circuit**

> [!CAUTION]
> **AC Mains Safety Warning — This is not optional.**  
> The electricity sensing portion of this project involves proximity to 230V AC mains voltage. Working with AC mains incorrectly can cause severe electric shock, death, or fire. The following rules are **mandatory** and non-negotiable:
> 1. **Never work on a live circuit.** Always disconnect the power supply from the mains before touching any wiring.
> 2. **Use a proper enclosure.** All AC-side connections must be inside a rated electrical enclosure. Never leave AC conductors exposed on an open breadboard.
> 3. **Use the ZMPT101B module correctly.** The ZMPT101B is a transformer-isolated voltage sensor module. It provides galvanic isolation between the AC line and your ESP32. Use the module as-is; never attempt to modify or bypass its isolation transformer.
> 4. **Use the ACS712 module correctly.** The ACS712 is a Hall-effect current sensor with built-in isolation. The AC current flows through the primary side of the IC (the two screw terminals), and the analog output pin connects to the ESP32 ADC. These two sides are electrically isolated.
> 5. **Do not attempt this on a breadboard.** AC wiring must use proper terminal blocks or clamp connectors inside a grounded metal or flame-retardant plastic enclosure.
> 6. **A qualified electrician or your lab supervisor must review and approve the AC wiring before it is ever energized.** Have your supervisor sign off before powering on the AC side.
> 7. **Use a low-power load for testing.** Use a lamp or small fan rated under 200W during initial testing, never a high-power appliance.

For the ZMPT101B voltage sensor module: Connect Module VCC to ESP32 5V (or 3.3V — check your module), Module GND to ESP32 GND, Module OUT to ESP32 GPIO 34 (ADC1 channel 6 — input-only ADC pin). The AC input terminals of the module go in-line with a single phase (Live wire) of the AC supply to the load, using properly insulated leads.

For the ACS712-30A current sensor module (or ACS712-20A depending on expected load): Connect Module VCC to ESP32 5V, Module GND to ESP32 GND, Module OUT to ESP32 GPIO 35 (ADC1 channel 7). The AC load current flows through the ACS712's primary terminals (IN+ and IN−) in series with the load.

**Task 3 — GPIO Pin Assignment**

Define all pin assignments in `firmware/esp32/config.h` as named constants. The following table is the canonical pin map:

| Signal | ESP32 GPIO | Type | Notes |
|--------|-----------|------|-------|
| Flow Sensor Pulse (YF-S201) | GPIO 18 | Digital Input (Interrupt) | 10kΩ pull-up required |
| Voltage Sensor Output (ZMPT101B) | GPIO 34 | ADC Input (ADC1 CH6) | Input-only pin, 12-bit ADC |
| Current Sensor Output (ACS712) | GPIO 35 | ADC Input (ADC1 CH7) | Input-only pin, 12-bit ADC |
| Status LED (onboard or external) | GPIO 2 | Digital Output | Blinks during Wi-Fi connect; solid when MQTT connected |
| Reserved | GPIO 4 | — | Available for future sensor |

**Task 4 — ESP32 Firmware: Wi-Fi Connection Module**

Create `firmware/esp32/wifi_manager.h` and `wifi_manager.cpp`. Implement a `WiFiManager` class with the following interface:
- `begin()` — Attempts Wi-Fi connection using credentials from `config.h`. Blocks until connected (with a 20-second timeout). Logs each attempt to Serial.
- `isConnected()` — Returns true if currently connected.
- `reconnect()` — To be called from the main loop. If not connected, attempts reconnection with exponential back-off starting at 2 seconds, capped at 60 seconds.
- `getIPAddress()` — Returns the current IP address as a `String`.
- `getRSSI()` — Returns current signal strength in dBm as `int`.

Use `WiFi.begin(ssid, password)` from the `WiFi.h` library. Set Wi-Fi mode to `WIFI_STA` (station mode). Set a custom hostname (`ESP32_WEM_001`) using `WiFi.setHostname()`. Print connection status updates to Serial at 115200 baud.

**Task 5 — ESP32 Firmware: MQTT Client with Reconnect**

Create `firmware/esp32/mqtt_client.h` and `mqtt_client.cpp`. Use the `PubSubClient` library. Implement an `MQTTManager` class with:
- `begin(client, broker_ip, broker_port, callback)` — Initialises PubSubClient, sets server, sets last-will message on topic `resource/status` with payload `{"status":"offline","device_id":"ESP32_WEM_001"}` (QoS 1, retained = true).
- `isConnected()` — Returns `mqttClient.connected()`.
- `reconnect()` — Attempts MQTT connection with client ID `ESP32_WEM_001`. On failure, waits 5 seconds and retries. On success, subscribes to `resource/command`.
- `publish(topic, payload)` — Wraps `mqttClient.publish()` with error logging.
- `loop()` — Must be called in `loop()` to maintain the connection.

**Task 6 — ESP32 Firmware: YF-S201 Pulse Interrupt Handler and Flow Rate Calculation**

In `firmware/esp32/sensors.cpp`, implement the flow sensor logic:

```cpp
// Interrupt Service Routine — keep extremely short
volatile uint32_t pulseCount = 0;

void IRAM_ATTR flowPulseISR() {
  pulseCount++;
}

// Call once in setup()
void setupFlowSensor() {
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseISR, FALLING);
}

// Call every PUBLISH_INTERVAL_MS milliseconds
float calculateFlowRate(uint32_t intervalMs) {
  // Disable interrupt to safely read and reset volatile counter
  detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));
  uint32_t pulses = pulseCount;
  pulseCount = 0;
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseISR, FALLING);

  // YF-S201 calibration factor: 7.5 pulses per second per liter per minute
  // flow_rate (L/min) = (pulses / interval_seconds) / CALIBRATION_FACTOR
  float intervalSeconds = intervalMs / 1000.0f;
  float flowRate = (pulses / intervalSeconds) / FLOW_CALIBRATION_FACTOR;
  return flowRate;
}
```

The `FLOW_CALIBRATION_FACTOR` is defined in `config.h` as `7.5f` by default. After physical calibration (Task 13), this value may be updated.

Total volume accumulates by integrating flow rate over time:
```cpp
totalVolumeLiters += (flowRate * intervalSeconds) / 60.0f;
```

**Task 7 — ESP32 Firmware: ZMPT101B Voltage Reading (ADC + Calibration)**

The ZMPT101B outputs an AC sinusoidal waveform centered around VCC/2 (approximately 1.65V on a 3.3V system). To measure RMS voltage, sample the ADC at high frequency over one or more full cycles (50Hz mains → 20ms period), compute the mean-square deviation from the bias point, then take the square root:

```cpp
float readVoltageRMS() {
  const int SAMPLES = 500;
  long sumSquares = 0;
  long bias = 0;

  // First pass: determine DC offset (bias)
  for (int i = 0; i < SAMPLES; i++) {
    bias += analogRead(VOLTAGE_SENSOR_PIN);
    delayMicroseconds(100);
  }
  bias /= SAMPLES;

  // Second pass: compute RMS around bias
  for (int i = 0; i < SAMPLES; i++) {
    int raw = analogRead(VOLTAGE_SENSOR_PIN) - bias;
    sumSquares += (long)raw * raw;
    delayMicroseconds(100);
  }

  float rmsRaw = sqrt((float)sumSquares / SAMPLES);
  // Scale to actual mains voltage using calibration factor
  return rmsRaw * VOLTAGE_CALIBRATION_FACTOR;
}
```

`VOLTAGE_CALIBRATION_FACTOR` is determined during calibration (Task 13) by comparing the ESP32 reading against a known reference multimeter measurement.

**Task 8 — ESP32 Firmware: ACS712 Current Reading (ADC + Calibration)**

The ACS712 outputs 2.5V at zero current (on a 5V supply, which maps to ~512 on 10-bit ADC; the ESP32 uses 12-bit ADC so the zero-current output is approximately 2048 counts at 3.3V reference). The sensitivity for the ACS712-30A variant is 66 mV/A.

```cpp
float readCurrentRMS() {
  const int SAMPLES = 500;
  long sumSquares = 0;
  long bias = 0;

  // First pass: determine actual zero-current offset
  for (int i = 0; i < SAMPLES; i++) {
    bias += analogRead(CURRENT_SENSOR_PIN);
    delayMicroseconds(100);
  }
  bias /= SAMPLES;

  // Second pass: compute RMS around offset
  for (int i = 0; i < SAMPLES; i++) {
    int raw = analogRead(CURRENT_SENSOR_PIN) - bias;
    sumSquares += (long)raw * raw;
    delayMicroseconds(100);
  }

  float rmsRaw = sqrt((float)sumSquares / SAMPLES);
  // Convert ADC counts to amps using sensitivity
  // ADC resolution: 3.3V / 4095 counts = 0.000806 V/count
  // ACS712-30A sensitivity: 0.066 V/A
  float rmsVolts = rmsRaw * (3.3f / 4095.0f);
  return rmsVolts / CURRENT_CALIBRATION_FACTOR;
}
```

`CURRENT_CALIBRATION_FACTOR` defaults to `0.066f` (66mV/A for ACS712-30A). Adjust for ACS712-20A (100mV/A) or ACS712-5A (185mV/A).

**Task 9 — ESP32 Firmware: Power and Energy Calculation**

```cpp
// Apparent power (for resistive loads, this equals real power)
float power_w = voltage_v * current_a;  // P = V × I

// Energy in kWh accumulated since boot
// Energy (kWh) += Power (W) × Time (hours)
// Time in hours = PUBLISH_INTERVAL_MS / 3600000.0f
totalEnergyKWh += (power_w * PUBLISH_INTERVAL_MS) / 3600000.0f;
```

For this prototype, the power factor is assumed to be 1.0 (purely resistive load — lamp, heater, etc.). For reactive loads (motors, capacitors), power factor measurement requires phase-angle calculation between voltage and current waveforms, which is an advanced extension.

**Task 10 — ESP32 Firmware: JSON Payload Assembly**

Use the `ArduinoJson` library (version 6.x or 7.x):

```cpp
#include <ArduinoJson.h>

String assemblePayload(float flowRate, float totalVolume, uint32_t pulseCount,
                       float voltage, float current, float power, float energy) {
  StaticJsonDocument<512> doc;
  doc["device_id"]       = DEVICE_ID;
  doc["timestamp"]       = getISO8601Timestamp(); // NTP-synced time

  JsonObject water       = doc.createNestedObject("water");
  water["flow_rate_lpm"] = round(flowRate * 100.0f) / 100.0f;
  water["total_volume_liters"] = round(totalVolume * 10.0f) / 10.0f;
  water["pulse_count"]   = pulseCount;

  JsonObject elec        = doc.createNestedObject("electricity");
  elec["voltage_v"]      = round(voltage * 10.0f) / 10.0f;
  elec["current_a"]      = round(current * 100.0f) / 100.0f;
  elec["power_w"]        = round(power * 10.0f) / 10.0f;
  elec["energy_kwh"]     = round(energy * 10000.0f) / 10000.0f;
  elec["power_factor"]   = 1.0f;

  doc["uptime_seconds"]  = millis() / 1000;
  doc["wifi_rssi_dbm"]   = WiFi.RSSI();

  String output;
  serializeJson(doc, output);
  return output;
}
```

**Task 11 — ESP32 Firmware: MQTT Publish Loop**

The `loop()` function in `main.cpp` must be non-blocking. Use `millis()` for timing, never `delay()` during normal operation:

```cpp
unsigned long lastPublishTime = 0;
const unsigned long PUBLISH_INTERVAL = 10000; // 10 seconds

void loop() {
  wifiManager.reconnect();
  mqttManager.loop();

  unsigned long now = millis();
  if (now - lastPublishTime >= PUBLISH_INTERVAL) {
    lastPublishTime = now;

    float flowRate   = calculateFlowRate(PUBLISH_INTERVAL);
    float voltage    = readVoltageRMS();
    float current    = readCurrentRMS();
    float power      = voltage * current;
    totalEnergyKWh  += (power * PUBLISH_INTERVAL) / 3600000.0f;
    totalVolumeLiters += (flowRate * PUBLISH_INTERVAL / 1000.0f) / 60.0f;

    String payload = assemblePayload(flowRate, totalVolumeLiters, pulseCount,
                                     voltage, current, power, totalEnergyKWh);

    if (mqttManager.isConnected()) {
      mqttManager.publish(MQTT_TOPIC_READINGS, payload.c_str());
      Serial.println("[MQTT] Published: " + payload);
    } else {
      Serial.println("[MQTT] Not connected — skipping publish");
    }
  }
}
```

**Task 12 — ESP32 Firmware: Heartbeat/Status Topic**

Every 30 seconds, publish a status message to `resource/status`:

```cpp
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Inside loop():
if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
  lastHeartbeatTime = now;
  StaticJsonDocument<256> statusDoc;
  statusDoc["device_id"]        = DEVICE_ID;
  statusDoc["timestamp"]        = getISO8601Timestamp();
  statusDoc["status"]           = "online";
  statusDoc["ip_address"]       = WiFi.localIP().toString();
  statusDoc["firmware_version"] = FIRMWARE_VERSION;
  statusDoc["uptime_seconds"]   = millis() / 1000;
  statusDoc["wifi_rssi_dbm"]    = WiFi.RSSI();
  statusDoc["free_heap_bytes"]  = ESP.getFreeHeap();

  String statusPayload;
  serializeJson(statusDoc, statusPayload);
  mqttManager.publish(MQTT_TOPIC_STATUS, statusPayload.c_str());
}
```

**Task 13 — Sensor Calibration Procedures**

*Flow Sensor Calibration:*
1. Connect the flow sensor in-line with a water pipe.
2. Place a measuring jug (1 litre) under the outlet.
3. Open the tap and let exactly 1 litre of water flow through.
4. Count the total pulses logged over Serial during this 1-litre flow.
5. The calibration factor = (total pulses measured) / (1 litre) = pulses/litre.
6. Convert: pulses_per_litre / 60 = pulses per second per L/min = your `FLOW_CALIBRATION_FACTOR` in Hz/(L/min) terms. For YF-S201, this should be close to 7.5.
7. Update `FLOW_CALIBRATION_FACTOR` in `config.h`.
8. Repeat 3 times and average the results.

*Voltage Sensor Calibration:*
1. Connect ZMPT101B to a known AC supply (e.g., 230V mains via extension cord with load).
2. Measure the actual mains voltage using a calibrated digital multimeter.
3. Read the raw RMS value output by `readVoltageRMS()` before applying the calibration factor (set factor to 1.0 temporarily).
4. `VOLTAGE_CALIBRATION_FACTOR` = (actual voltage from multimeter) / (raw RMS ADC-based reading).
5. Update `config.h` and verify the firmware now reports a value within ±2% of the multimeter reading.

*Current Sensor Calibration:*
1. With a known resistive load (e.g., 100W lamp: I = P/V = 100/230 ≈ 0.43A), measure the actual current with a clamp meter or series ammeter.
2. Read the raw current from `readCurrentRMS()` with factor set to 1.0.
3. `CURRENT_CALIBRATION_FACTOR` = (sensitivity from datasheet in V/A) × any correction.
4. Verify the firmware reading is within ±5% of the reference measurement.

**Task 14 — Integration with Member 2's Backend**

During the integration phase (Week 5):
1. Obtain Member 2's laptop's local IP address (e.g., `192.168.1.102`) and update `MQTT_BROKER_IP` in `config.h`.
2. Flash the updated firmware to the ESP32.
3. Open Serial Monitor and confirm Wi-Fi connection and MQTT connection success messages.
4. Using MQTT Explorer on Member 2's machine, verify that messages appear on `resource/readings` every 10 seconds with the correct JSON structure.
5. Ask Member 2 to confirm that rows are being inserted into the PostgreSQL `water_readings` and `electricity_readings` tables by querying the DB.
6. Test edge cases: power-cycle the ESP32 and confirm it reconnects and resumes publishing within 30 seconds.
7. Simulate Wi-Fi drop (disable the router briefly) and confirm the reconnect logic triggers.

**Task 15 — Integration with Member 3's Dashboard**

During the final integration phase (Week 6):
1. With the ESP32 publishing to the broker and Member 2's backend running, ask Member 3 to switch their dashboard to `NEXT_PUBLIC_USE_MOCK_API=false`.
2. Confirm that the flow rate chart on the dashboard updates with real values from the sensor.
3. Confirm that the voltage and power readings visible in the dashboard match the Serial Monitor output within acceptable calibration error.
4. Physically vary the water flow (open/close tap) and observe the dashboard chart respond in near-real-time (within 15 seconds).
5. Physically switch the load on/off and observe the power chart respond.

### 4.4 Files Member 1 Creates or Edits

| File Path | Purpose |
|-----------|---------|
| `firmware/esp32/main.cpp` | Entry point — `setup()` and `loop()` |
| `firmware/esp32/config.h` | All compile-time constants: pins, SSID, broker IP, calibration factors, topic strings |
| `firmware/esp32/sensors.h` | Header: sensor function declarations |
| `firmware/esp32/sensors.cpp` | Implementation: flow ISR, RMS calculations, payload assembly |
| `firmware/esp32/mqtt_client.h` | Header: MQTTManager class declaration |
| `firmware/esp32/mqtt_client.cpp` | Implementation: PubSubClient wrapper with reconnect |
| `firmware/esp32/wifi_manager.h` | Header: WiFiManager class declaration |
| `firmware/esp32/wifi_manager.cpp` | Implementation: WiFi connection, reconnect, status |
| `firmware/esp32/ntp_time.h` | Header: NTP time sync functions |
| `firmware/esp32/ntp_time.cpp` | Implementation: configTime(), getISO8601Timestamp() |
| `firmware/esp32/platformio.ini` | PlatformIO project configuration: board, libraries, upload port |
| `firmware/esp32/README.md` | Hardware setup guide, wiring diagrams, calibration instructions |

### 4.5 Technologies Used

| Technology | Version | Purpose |
|-----------|---------|---------|
| Arduino Framework (ESP32 Core) | 2.x | Hardware abstraction layer for ESP32 |
| PlatformIO | Latest | Build system, dependency management, OTA |
| Arduino IDE (alternative) | 2.x | Alternative build tool |
| C++ | C++11/14 | Firmware language |
| PubSubClient | 2.8.0 | MQTT client library for Arduino |
| ArduinoJson | 7.x | JSON serialization/deserialization |
| WiFi.h | (bundled) | Wi-Fi connection management |
| NTPClient | 3.x | Network Time Protocol for timestamps |
| MQTT Explorer | Latest | Desktop tool for inspecting MQTT messages |

### 4.6 Inputs Member 1 Receives

- **From this document:** The canonical MQTT payload format (Section 3.2 and 3.3) — this defines exactly what JSON the ESP32 must produce.
- **From Member 2:** The IP address of the Mosquitto broker and the port number (default 1883). Member 2 must share this before integration begins.
- **From Member 2:** Confirmation that the MQTT broker accepts unauthenticated connections on the LAN (or credential if authentication is enabled).
- **From the team:** Any changes to the MQTT topic names or payload schema — communicated via team sync.

### 4.7 Outputs Member 1 Produces

- MQTT messages on topic **`resource/readings`** — Published every 10 seconds, containing the full sensor payload.
- MQTT messages on topic **`resource/status`** — Published every 30 seconds, containing the heartbeat payload.
- A calibrated, physically assembled hardware prototype ready for demo.
- The `firmware/esp32/README.md` describing wiring, calibration, and flashing instructions.

### 4.8 Dependencies

| Dependency | Depends On | For What | When |
|-----------|-----------|---------|------|
| Member 2 | Mosquitto broker IP | Cannot test MQTT publish to shared broker until IP is known | Week 5 (integration) |
| Member 2 | Broker connectivity confirmation | To verify messages are received and stored | Week 5 |
| Member 3 | Nothing | Member 1 has no dependency on frontend during Phase 1 | — |
| Member 3 | Visual confirmation only | During final demo to confirm live data displays correctly | Week 6 |

### 4.9 Definition of Done

Member 1's work is considered **complete** when all of the following criteria are met:

- [ ] All hardware is physically assembled in a safe enclosure; AC-side connections reviewed by supervisor.
- [ ] ESP32 connects to Wi-Fi automatically on power-on within 20 seconds.
- [ ] ESP32 connects to the MQTT broker automatically and displays "MQTT Connected" on Serial Monitor.
- [ ] Flow sensor pulses are correctly counted using hardware interrupt (no missed pulses at typical flow rates).
- [ ] Flow rate is displayed on Serial Monitor and matches a physical timing + volume measurement within ±5%.
- [ ] Voltage reading matches a calibrated multimeter measurement within ±2%.
- [ ] Current reading matches a clamp meter measurement within ±5%.
- [ ] Power calculation (P = V × I) is computed and serialized correctly in the JSON payload.
- [ ] Energy accumulation (kWh) increments correctly over time.
- [ ] JSON payload published to `resource/readings` every 10 seconds in the exact canonical format (Section 3.2).
- [ ] Heartbeat published to `resource/status` every 30 seconds (Section 3.3).
- [ ] MQTT last-will message fires correctly when ESP32 loses power (verified by Member 2 via `mosquitto_sub`).
- [ ] Firmware auto-reconnects to Wi-Fi after a simulated router restart.
- [ ] Firmware auto-reconnects to MQTT broker after broker restart.
- [ ] Member 2 confirms rows appear in PostgreSQL during integration test.
- [ ] Member 3 confirms live values appear on the dashboard during integration test.
- [ ] `firmware/esp32/README.md` is complete with wiring diagram, calibration values, and flashing steps.

### 4.10 Testing Requirements

| Test | Method | Pass Criterion |
|------|--------|----------------|
| Wi-Fi auto-connect | Power on ESP32 cold | Connected within 20 seconds |
| Wi-Fi reconnect | Disable Wi-Fi AP then re-enable | Reconnects within 60 seconds |
| MQTT publish | Open MQTT Explorer and subscribe to `resource/readings` | Message arrives every 10s ±1s |
| MQTT reconnect | Kill `mosquitto` and restart it | ESP32 reconnects within 30 seconds |
| Last will message | Power off ESP32 abruptly | `mosquitto_sub` receives offline status within 60 seconds |
| Flow rate accuracy | Flow exactly 1 litre, measure time, compare with firmware reading | Within ±5% |
| Voltage accuracy | Compare with multimeter | Within ±2% |
| Current accuracy | Compare with clamp meter | Within ±5% |
| JSON schema | Parse output with `jq` or `python -m json.tool` | Parses without error, all keys present |
| Energy accumulation | Let system run for 1 hour; calculate expected kWh manually | Firmware reading within ±5% |
| NTP timestamp | Verify `timestamp` field in payload | ISO 8601 format, correct UTC time |
| Memory stability | Let device run for 24 hours | No heap depletion, no crash/watchdog reset |

### 4.11 Integration Responsibilities

- **Week 5, Day 1:** Share the exact JSON payload (captured from MQTT Explorer) with Member 2 and Member 3 in the group chat for final confirmation against the contract.
- **Week 5, Day 2:** Point ESP32 to Member 2's broker; verify message reception together in the same room or via screen share.
- **Week 6, Day 1:** Join Member 3 on a call; power-cycle the sensor while Member 3 watches the dashboard; confirm live update works end-to-end.

### 4.12 Viva Questions Member 1 Should Prepare

**Q1: How does the YF-S201 flow sensor work?**  
**A:** The YF-S201 is a hall-effect flow sensor. Inside the body is a pinwheel with a small magnet attached. As water flows through, the pinwheel spins. Each rotation of the pinwheel causes the hall-effect sensor to output one or more digital pulses. The ESP32 counts these pulses using a hardware interrupt attached to a GPIO pin. The number of pulses per unit time is proportional to the volumetric flow rate. The manufacturer specifies the calibration factor as approximately 7.5 pulses per second per litre-per-minute (i.e., at 1 L/min, the sensor outputs 7.5 Hz).

**Q2: Why do you use a hardware interrupt instead of polling the flow sensor pin in the main loop?**  
**A:** Water flow can produce up to hundreds of pulses per second at high flow rates. The main loop executes many other tasks — sensor ADC readings, JSON serialization, MQTT operations — each of which can take several milliseconds. If we poll the pin inside the loop, we risk missing pulses that occur while the processor is busy doing other work, leading to undercounting and inaccurate flow rate measurements. A hardware interrupt fires immediately when the pin edge is detected, regardless of what the main loop is doing, and increments a counter atomically. This guarantees zero missed pulses within the sensor's rated frequency range.

**Q3: What does `volatile` mean in the context of the pulse counter variable?**  
**A:** `volatile` tells the C++ compiler not to cache the variable's value in a register or optimize away reads from it. Without `volatile`, the compiler might see that `pulseCount` is not modified within the main loop body and optimize out repeated reads of it, always using a stale cached value. Since `pulseCount` is modified inside an ISR (which runs asynchronously), `volatile` ensures the main loop always reads the actual current value from memory.

**Q4: What is the ZMPT101B and how does it provide electrical isolation?**  
**A:** The ZMPT101B is a precision instrument voltage transformer module. It contains a small toroidal transformer that steps down the high AC mains voltage to a small, safe AC signal centered around VCC/2. The primary winding connects to the AC line, and the secondary winding drives the ESP32's ADC pin. The transformer provides galvanic isolation — there is no direct electrical connection between the mains side and the ESP32 side — so the ESP32 circuitry is protected from dangerous mains voltages.

**Q5: How do you calculate RMS voltage from ADC samples?**  
**A:** RMS (Root Mean Square) voltage is calculated by: (1) sampling the ADC at a rate much faster than the 50Hz AC frequency, (2) removing the DC bias (the midpoint voltage added by the sensor circuit) by subtracting the mean of samples, (3) squaring each bias-corrected sample, (4) computing the mean of all squared samples, and (5) taking the square root of that mean. Mathematically: `V_rms = sqrt( (1/N) × Σ(sample_i - bias)² )`. This value is then multiplied by a calibration factor to convert from ADC counts to actual volts.

**Q6: What is the ACS712 and what does its output voltage represent?**  
**A:** The ACS712 is a fully integrated Hall-effect linear current sensor IC. The load current flows through the primary side of the IC (copper conductors embedded in the chip). The magnetic field generated by this current is sensed by a Hall-effect element and converted to a proportional output voltage. At zero current, the output is VCC/2 (2.5V on a 5V supply). For the ACS712-30A, the sensitivity is 66mV per Ampere, meaning 1A of current shifts the output by 66mV. The ESP32 reads this analog voltage via ADC and converts it back to current.

**Q7: What is the formula for electrical power and how do you apply it here?**  
**A:** Real power P = V × I × cos(φ), where V is RMS voltage, I is RMS current, and cos(φ) is the power factor. For purely resistive loads (incandescent lamps, resistive heaters), the power factor is 1.0, so P = V × I. In this prototype, we assume resistive loads, so the power in Watts is simply the product of the RMS voltage reading and the RMS current reading.

**Q8: How do you calculate energy consumption in kWh?**  
**A:** Energy is the integral of power over time. Since power is measured at discrete intervals, we use: E (Joules) = P (Watts) × t (seconds). To convert to kWh: E (kWh) = P (W) × t (seconds) / 3,600,000. At each 10-second publish interval, we add the incremental energy `(power_w × 10) / 3,600,000` to the running `totalEnergyKWh` accumulator.

**Q9: What MQTT QoS level do you use and why?**  
**A:** We use QoS 0 (at most once) for sensor readings, because sensor data is published frequently (every 10 seconds) and the loss of a single reading is acceptable — the next reading arrives shortly after. We use QoS 1 (at least once) for the last-will message and status message, because those are important for device state tracking and must be delivered reliably even under marginal network conditions.

**Q10: What is an MQTT Last Will and Testament (LWT) message?**  
**A:** An LWT is a message that the MQTT client configures during the CONNECT handshake. If the broker detects that the client has disconnected ungracefully (without sending a proper DISCONNECT packet — for example, due to a power failure or network crash), the broker automatically publishes the LWT message to the specified topic on behalf of the disconnected client. This allows subscribers to know that the device has gone offline. We configure LWT on `resource/status` with payload `{"status":"offline"}` to let the backend detect device disconnection.

**Q11: What ESP32 ADC pins are used and why specifically those?**  
**A:** We use GPIO 34 and GPIO 35, which are part of ADC1. These pins are input-only (they have no internal pull-up/pull-down and cannot be used as outputs), which makes them ideal for analog signal measurement. Critically, ADC2 pins (GPIO 0, 2, 4, 12-15, 25-27) cannot be used for ADC when Wi-Fi is active because the Wi-Fi driver uses ADC2 internally. Since this firmware requires Wi-Fi, we exclusively use ADC1 pins.

**Q12: What is the role of NTP in this firmware and why is a correct timestamp important?**  
**A:** NTP (Network Time Protocol) synchronizes the ESP32's internal clock to an internet time server when it first connects to Wi-Fi. Each sensor reading payload includes an ISO 8601 UTC timestamp. This timestamp is the primary key for time-series queries in the backend database. Without NTP, the ESP32 would start at Unix epoch 0 (January 1, 1970) or some arbitrary time, making all database records incorrectly timestamped and useless for time-series analytics.

**Q13: How does the JSON payload get serialized on the ESP32?**  
**A:** The `ArduinoJson` library is used. It provides a `StaticJsonDocument` with a fixed-size memory allocation (512 bytes in this case) that lives on the stack, avoiding heap fragmentation. The document is built by assigning key-value pairs and nested objects. `serializeJson(doc, output)` serializes it to a `String`. This string is then passed to `mqttClient.publish()` as a C-string (`output.c_str()`).

**Q14: What are the safety rules for the AC mains sensing portion of this project?**  
**A:** (1) Never work on live circuits — always disconnect mains before touching wiring. (2) All AC connections must be inside a rated electrical enclosure. (3) Use the ZMPT101B module as-is — it provides galvanic isolation. (4) Use the ACS712 module as-is — it provides galvanic isolation. (5) A qualified supervisor must review the AC wiring before it is energized. (6) Test only with low-power resistive loads during initial commissioning. (7) Never use an open breadboard for AC mains connections.

**Q15: What happens if the Wi-Fi drops while the ESP32 is running? Does data get lost?**  
**A:** During a Wi-Fi or MQTT disconnection, the ESP32 continues to run the main loop, continues to count flow pulses via interrupt (no pulses are lost), and continues to accumulate energy. However, MQTT publishes are skipped with a log message when the connection is down. Upon reconnection, the next publish sends the current instantaneous readings. Cumulative values (total volume, total energy) continue to accumulate correctly in RAM throughout the outage, so they remain accurate even if individual publish events are lost. For production-grade systems, an SD card or SPIFFS-based local buffer would store missed readings for later retransmission.

---

## 5. Member 2 — Backend, Database & Analytics

### 5.1 Profile

Member 2 has no physical hardware. Their entire development environment is software-only on their laptop. Their responsibility is the **data layer** and **API layer** of the system: ingesting MQTT messages from the ESP32, validating and storing them in PostgreSQL, performing analytics computations, exposing a REST API for the frontend, and broadcasting real-time updates via Socket.IO. They also build the MQTT simulator that substitutes for real hardware during their development phase.

Member 2 works in **TypeScript / Node.js**, using Express.js for the HTTP server, Prisma ORM for database access, MQTT.js for MQTT client operations, Socket.IO for WebSocket communication, and Zod for runtime payload validation.

### 5.2 Responsibilities

- Install and configure Mosquitto MQTT broker locally.
- Set up a Node.js 20+ project with full TypeScript configuration.
- Set up PostgreSQL 15+ database locally with appropriate schema.
- Build a Prisma schema covering all data models.
- Build an MQTT subscriber service that connects to Mosquitto and processes incoming sensor payloads.
- Build payload validation using Zod schemas to reject malformed or out-of-range data.
- Build a database insertion service for water readings and electricity readings.
- Build a simulator script that generates realistic fake MQTT payloads for testing without hardware.
- Build water analytics service: daily totals, hourly averages, rolling 7-day consumption.
- Build electricity analytics service: daily kWh totals, hourly averages, peak demand.
- Build anomaly detection service: rule-based detection for abnormal flow rates, abnormal power draw, and device timeout.
- Build REST API controllers and routes for all resources.
- Build a Socket.IO server that broadcasts real-time events to all connected frontend clients.
- Write API documentation (`docs/API_CONTRACT.md`).
- Handle device status tracking and offline detection.

### 5.3 Exact Tasks (Numbered and Detailed)

**Task 1 — Install and Configure Mosquitto Broker Locally**

Download and install Eclipse Mosquitto for Windows from the official site. Edit `mosquitto.conf`:
```
listener 1883
allow_anonymous true
log_type all
log_dest file C:\mosquitto\log\mosquitto.log
```
Start Mosquitto as a Windows service or run it in a terminal with `mosquitto -c mosquitto.conf -v`. Verify it is listening on port 1883 with `netstat -an | findstr 1883`. Test using `mosquitto_pub` and `mosquitto_sub` from another terminal. Note your laptop's LAN IP address (use `ipconfig` to find the IPv4 address under your Wi-Fi adapter) and share it with Member 1.

**Task 2 — Set Up Node.js + TypeScript Project**

```bash
mkdir backend && cd backend
npm init -y
npm install express mqtt @prisma/client socket.io cors dotenv zod winston
npm install -D typescript ts-node nodemon @types/node @types/express @types/cors prisma
npx tsc --init
```

Configure `tsconfig.json` with `"target": "ES2022"`, `"module": "CommonJS"`, `"strict": true`, `"outDir": "./dist"`, `"rootDir": "./src"`. Add scripts to `package.json`:
```json
"scripts": {
  "dev": "nodemon --exec ts-node src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "simulate": "ts-node scripts/mqtt-simulator.ts",
  "migrate": "prisma migrate dev"
}
```

**Task 3 — Set Up PostgreSQL Locally**

Install PostgreSQL 15+ from postgresql.org. Create a database:
```sql
CREATE DATABASE water_electricity_monitor;
CREATE USER wem_user WITH PASSWORD 'wem_password_2026';
GRANT ALL PRIVILEGES ON DATABASE water_electricity_monitor TO wem_user;
```

Set the `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://wem_user:wem_password_2026@localhost:5432/water_electricity_monitor"
```

**Task 4 — Create Prisma Schema**

Create `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Device {
  id              String           @id @default(cuid())
  deviceId        String           @unique @map("device_id")
  name            String?
  location        String?
  firmwareVersion String?          @map("firmware_version")
  ipAddress       String?          @map("ip_address")
  status          String           @default("unknown")
  lastSeen        DateTime?        @map("last_seen")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  waterReadings   WaterReading[]
  electricityReadings ElectricityReading[]
  anomalies       Anomaly[]
  @@map("devices")
}

model WaterReading {
  id               String   @id @default(cuid())
  deviceId         String   @map("device_id")
  device           Device   @relation(fields: [deviceId], references: [deviceId])
  timestamp        DateTime
  flowRateLpm      Float    @map("flow_rate_lpm")
  totalVolumeLiters Float   @map("total_volume_liters")
  pulseCount       Int      @map("pulse_count")
  createdAt        DateTime @default(now()) @map("created_at")
  @@index([deviceId, timestamp])
  @@index([timestamp])
  @@map("water_readings")
}

model ElectricityReading {
  id          String   @id @default(cuid())
  deviceId    String   @map("device_id")
  device      Device   @relation(fields: [deviceId], references: [deviceId])
  timestamp   DateTime
  voltageV    Float    @map("voltage_v")
  currentA    Float    @map("current_a")
  powerW      Float    @map("power_w")
  energyKwh   Float    @map("energy_kwh")
  powerFactor Float    @default(1.0) @map("power_factor")
  createdAt   DateTime @default(now()) @map("created_at")
  @@index([deviceId, timestamp])
  @@index([timestamp])
  @@map("electricity_readings")
}

model Anomaly {
  id          String   @id @default(cuid())
  deviceId    String   @map("device_id")
  device      Device   @relation(fields: [deviceId], references: [deviceId])
  detectedAt  DateTime @default(now()) @map("detected_at")
  type        String   // "HIGH_FLOW" | "LOW_VOLTAGE" | "HIGH_POWER" | "DEVICE_OFFLINE" | "ZERO_FLOW"
  severity    String   // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description String
  value       Float?
  threshold   Float?
  resolved    Boolean  @default(false)
  resolvedAt  DateTime? @map("resolved_at")
  @@index([deviceId, detectedAt])
  @@map("anomalies")
}
```

**Task 5 — Run Prisma Migrations**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Verify tables were created using `psql` or pgAdmin.

**Task 6 — Build MQTT Subscriber Service**

Create `backend/src/mqtt/subscriber.ts`. This module connects to the Mosquitto broker, subscribes to `resource/readings` and `resource/status`, and hands off received messages to validation and insertion services:

```typescript
import mqtt, { MqttClient } from 'mqtt';
import { validateReadingsPayload, validateStatusPayload } from '../validation/payloadValidator';
import { insertWaterReading, insertElectricityReading } from '../services/dataInsertionService';
import { updateDeviceStatus } from '../services/deviceService';
import { detectAnomalies } from '../analytics/anomalyDetection';
import { emitSensorReading, emitAnomalyDetected, emitDeviceStatus } from '../mqtt/socketEmitter';
import logger from '../utils/logger';

let client: MqttClient;

export function startMqttSubscriber(brokerUrl: string): void {
  client = mqtt.connect(brokerUrl, {
    clientId: 'backend_subscriber_001',
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    logger.info(`[MQTT] Connected to broker at ${brokerUrl}`);
    client.subscribe(['resource/readings', 'resource/status'], { qos: 1 }, (err) => {
      if (err) logger.error('[MQTT] Subscribe error:', err);
      else logger.info('[MQTT] Subscribed to resource/readings and resource/status');
    });
  });

  client.on('message', async (topic, buffer) => {
    const rawMessage = buffer.toString();
    try {
      const parsed = JSON.parse(rawMessage);
      if (topic === 'resource/readings') {
        const validated = validateReadingsPayload(parsed);
        await insertWaterReading(validated);
        await insertElectricityReading(validated);
        const anomalies = await detectAnomalies(validated);
        emitSensorReading(validated);
        anomalies.forEach(a => emitAnomalyDetected(a));
      } else if (topic === 'resource/status') {
        const validated = validateStatusPayload(parsed);
        await updateDeviceStatus(validated);
        emitDeviceStatus(validated);
      }
    } catch (err) {
      logger.error(`[MQTT] Failed to process message on ${topic}:`, err);
    }
  });

  client.on('error', (err) => logger.error('[MQTT] Client error:', err));
  client.on('offline', () => logger.warn('[MQTT] Client offline'));
  client.on('reconnect', () => logger.info('[MQTT] Reconnecting...'));
}
```

**Task 7 — Build Payload Validation**

Create `backend/src/validation/payloadValidator.ts` using Zod:

```typescript
import { z } from 'zod';

const WaterSchema = z.object({
  flow_rate_lpm:       z.number().min(0).max(100),
  total_volume_liters: z.number().min(0),
  pulse_count:         z.number().int().min(0),
});

const ElectricitySchema = z.object({
  voltage_v:    z.number().min(0).max(500),
  current_a:    z.number().min(0).max(30),
  power_w:      z.number().min(0).max(15000),
  energy_kwh:   z.number().min(0),
  power_factor: z.number().min(0).max(1),
});

export const ReadingsPayloadSchema = z.object({
  device_id:       z.string().min(1).max(64),
  timestamp:       z.string().datetime(),
  water:           WaterSchema,
  electricity:     ElectricitySchema,
  uptime_seconds:  z.number().int().min(0),
  wifi_rssi_dbm:   z.number().min(-120).max(0),
});

export const StatusPayloadSchema = z.object({
  device_id:        z.string(),
  timestamp:        z.string().datetime(),
  status:           z.enum(['online', 'offline']),
  ip_address:       z.string().optional(),
  firmware_version: z.string().optional(),
  uptime_seconds:   z.number().int().min(0).optional(),
  wifi_rssi_dbm:    z.number().optional(),
  free_heap_bytes:  z.number().optional(),
});

export type ReadingsPayload = z.infer<typeof ReadingsPayloadSchema>;
export type StatusPayload   = z.infer<typeof StatusPayloadSchema>;

export function validateReadingsPayload(raw: unknown): ReadingsPayload {
  return ReadingsPayloadSchema.parse(raw); // throws ZodError on invalid data
}

export function validateStatusPayload(raw: unknown): StatusPayload {
  return StatusPayloadSchema.parse(raw);
}
```

**Task 8 — Build Database Insertion Service**

Create `backend/src/services/dataInsertionService.ts`:

```typescript
import { prisma } from '../lib/prisma';
import { ReadingsPayload } from '../validation/payloadValidator';

export async function insertWaterReading(payload: ReadingsPayload): Promise<void> {
  await prisma.waterReading.create({
    data: {
      deviceId:          payload.device_id,
      timestamp:         new Date(payload.timestamp),
      flowRateLpm:       payload.water.flow_rate_lpm,
      totalVolumeLiters: payload.water.total_volume_liters,
      pulseCount:        payload.water.pulse_count,
    },
  });
}

export async function insertElectricityReading(payload: ReadingsPayload): Promise<void> {
  await prisma.electricityReading.create({
    data: {
      deviceId:    payload.device_id,
      timestamp:   new Date(payload.timestamp),
      voltageV:    payload.electricity.voltage_v,
      currentA:    payload.electricity.current_a,
      powerW:      payload.electricity.power_w,
      energyKwh:   payload.electricity.energy_kwh,
      powerFactor: payload.electricity.power_factor,
    },
  });
}
```

**Task 9 — Build MQTT Simulator Script**

Create `backend/scripts/mqtt-simulator.ts`. This script is Member 2's primary development tool — it substitutes for the real ESP32 hardware by publishing realistic JSON payloads:

```typescript
import mqtt from 'mqtt';

const BROKER_URL   = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const DEVICE_ID    = 'ESP32_SIM_001';
const INTERVAL_MS  = 10000;

const client = mqtt.connect(BROKER_URL);

let totalVolume = 0;
let totalEnergy = 0;
let uptimeSeconds = 0;
let pulseCount = 0;

client.on('connect', () => {
  console.log('[SIM] Connected to MQTT broker');

  setInterval(() => {
    uptimeSeconds += INTERVAL_MS / 1000;
    const flowRate = parseFloat((Math.random() * 20 + 5).toFixed(2));   // 5–25 L/min
    const voltage  = parseFloat((230 + (Math.random() * 10 - 5)).toFixed(1)); // ~230V
    const current  = parseFloat((Math.random() * 5 + 1).toFixed(2));   // 1–6A
    const power    = parseFloat((voltage * current).toFixed(1));
    const intervalH = INTERVAL_MS / 3600000;
    totalEnergy    += power * intervalH;
    totalVolume    += (flowRate * INTERVAL_MS / 1000) / 60;
    pulseCount     += Math.round(flowRate * 7.5 * (INTERVAL_MS / 1000 / 60));

    const payload = JSON.stringify({
      device_id:       DEVICE_ID,
      timestamp:       new Date().toISOString(),
      water: { flow_rate_lpm: flowRate, total_volume_liters: +totalVolume.toFixed(1), pulse_count: pulseCount },
      electricity: { voltage_v: voltage, current_a: current, power_w: power, energy_kwh: +totalEnergy.toFixed(4), power_factor: 1.0 },
      uptime_seconds:  uptimeSeconds,
      wifi_rssi_dbm:   -62,
    });

    client.publish('resource/readings', payload, { qos: 0 });
    console.log(`[SIM] Published: flow=${flowRate} L/min, power=${power}W`);
  }, INTERVAL_MS);

  // Heartbeat
  setInterval(() => {
    const statusPayload = JSON.stringify({
      device_id: DEVICE_ID, timestamp: new Date().toISOString(), status: 'online',
      ip_address: '192.168.1.SIM', firmware_version: '1.0.0-sim',
      uptime_seconds: uptimeSeconds, wifi_rssi_dbm: -62, free_heap_bytes: 182432,
    });
    client.publish('resource/status', statusPayload, { qos: 1 });
  }, 30000);
});
```

**Task 10 — Build Water Analytics Service**

Create `backend/src/analytics/waterAnalytics.ts`. Implements:
- `getDailyWaterConsumption(deviceId, days)` — Groups water readings by date, returns total volume per day.
- `getHourlyWaterFlow(deviceId, date)` — Returns average flow rate for each hour of a given day.
- `getRolling7DayAverage(deviceId)` — Returns the average daily consumption over the last 7 days.
- `getPeakFlowPeriod(deviceId, date)` — Returns the hour with the highest average flow rate.

All queries use Prisma's `groupBy` and `aggregate` features with proper UTC date handling.

**Task 11 — Build Electricity Analytics Service**

Create `backend/src/analytics/electricityAnalytics.ts`. Implements:
- `getDailyEnergyConsumption(deviceId, days)` — Total kWh increment per day.
- `getHourlyPowerProfile(deviceId, date)` — Average power (W) per hour.
- `getPeakDemand(deviceId, date)` — Maximum power reading in a day.
- `getMonthlyEnergyTotal(deviceId)` — Total energy for the current calendar month.
- `estimateMonthlyCost(deviceId, ratePerKwh)` — Projects current month cost at the given tariff rate.

**Task 12 — Build Anomaly Detection Service**

Create `backend/src/analytics/anomalyDetection.ts`. Implements rule-based anomaly detection triggered every time a new reading is inserted:

| Rule | Condition | Severity |
|------|-----------|---------|
| HIGH_FLOW | `flow_rate_lpm > 30` | HIGH |
| ZERO_FLOW_SUSTAINED | `flow_rate_lpm == 0` for last 6 consecutive readings | MEDIUM |
| LOW_VOLTAGE | `voltage_v < 200` | HIGH |
| HIGH_VOLTAGE | `voltage_v > 260` | HIGH |
| HIGH_POWER | `power_w > 3500` | CRITICAL |
| DEVICE_OFFLINE | No message received for >60 seconds | CRITICAL |

The service checks the incoming reading against these thresholds. When a threshold is breached, it inserts a record into the `anomalies` table and emits a `anomaly:detected` Socket.IO event. For the DEVICE_OFFLINE rule, a scheduled job (`setInterval`) checks the `devices` table every 30 seconds and flags any device whose `lastSeen` is more than 60 seconds in the past.

**Task 13 — Build REST API Controllers**

Create controllers for each resource:
- `backend/src/controllers/waterController.ts` — handlers for water readings and analytics endpoints.
- `backend/src/controllers/electricityController.ts` — handlers for electricity readings and analytics endpoints.
- `backend/src/controllers/deviceController.ts` — handlers for device list and status endpoints.
- `backend/src/controllers/anomalyController.ts` — handlers for anomaly list and resolution endpoints.

Each controller function validates query parameters (using Zod), calls the appropriate service function, and returns a consistent JSON response envelope:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 50, "total": 1234 } }
```
Errors return:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

**Task 14 — Build WebSocket / Socket.IO Server**

Create `backend/src/socket/socketServer.ts`. Initialize Socket.IO on the same HTTP server as Express:

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export function initSocketServer(httpServer: HTTPServer): void {
  io = new SocketIOServer(httpServer, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

export function emitSensorReading(payload: unknown): void {
  io?.emit('sensor:reading', payload);
}
export function emitAnomalyDetected(anomaly: unknown): void {
  io?.emit('anomaly:detected', anomaly);
}
export function emitDeviceStatus(status: unknown): void {
  io?.emit('device:status', status);
}
export function emitDeviceOffline(info: unknown): void {
  io?.emit('device:offline', info);
}
```

**Task 15 — Write API Documentation**

Write `docs/API_CONTRACT.md` covering every endpoint with request parameters, response body examples, and error responses. Share with Member 3 before Week 3 so they can build accurate mock data.

**Task 16 — Handle Device Status / Heartbeat**

Create `backend/src/services/deviceService.ts`. On receiving a status payload:
- Upsert the device record in the `devices` table (insert if new, update `lastSeen`, `status`, `ipAddress`, etc. if existing).
- Start a 60-second inactivity timer for the device. If no new message arrives within 60 seconds, mark the device as `offline` in the DB and emit `device:offline` via Socket.IO.

### 5.4 Files Member 2 Creates or Edits

| File Path | Purpose |
|-----------|---------|
| `backend/src/server.ts` | HTTP server entry point; creates Express app + HTTP server + Socket.IO |
| `backend/src/app.ts` | Express app configuration: middleware, routes, CORS |
| `backend/src/mqtt/subscriber.ts` | MQTT subscriber: connects to broker, processes messages |
| `backend/src/mqtt/mqttClient.ts` | Shared MQTT client instance |
| `backend/src/socket/socketServer.ts` | Socket.IO initialization and emit helpers |
| `backend/src/validation/payloadValidator.ts` | Zod schemas and validation functions |
| `backend/src/services/dataInsertionService.ts` | Prisma-based DB insertion for readings |
| `backend/src/services/waterService.ts` | Water CRUD and analytics query functions |
| `backend/src/services/electricityService.ts` | Electricity CRUD and analytics query functions |
| `backend/src/services/deviceService.ts` | Device upsert, status update, offline detection |
| `backend/src/analytics/waterAnalytics.ts` | Water analytics computation functions |
| `backend/src/analytics/electricityAnalytics.ts` | Electricity analytics computation functions |
| `backend/src/analytics/anomalyDetection.ts` | Rule-based anomaly detection engine |
| `backend/src/controllers/waterController.ts` | Express route handlers for water endpoints |
| `backend/src/controllers/electricityController.ts` | Express route handlers for electricity endpoints |
| `backend/src/controllers/deviceController.ts` | Express route handlers for device endpoints |
| `backend/src/controllers/anomalyController.ts` | Express route handlers for anomaly endpoints |
| `backend/src/routes/waterRoutes.ts` | Express Router for /water/* |
| `backend/src/routes/electricityRoutes.ts` | Express Router for /electricity/* |
| `backend/src/routes/deviceRoutes.ts` | Express Router for /device/* |
| `backend/src/routes/anomalyRoutes.ts` | Express Router for /anomalies/* |
| `backend/src/lib/prisma.ts` | Singleton Prisma client instance |
| `backend/src/utils/logger.ts` | Winston logger configuration |
| `backend/prisma/schema.prisma` | Prisma schema defining all DB models |
| `backend/prisma/migrations/` | Auto-generated migration SQL files |
| `backend/scripts/mqtt-simulator.ts` | MQTT simulator: publishes realistic fake payloads |
| `backend/package.json` | npm project configuration and scripts |
| `backend/tsconfig.json` | TypeScript compiler configuration |
| `backend/.env` | Environment variables (gitignored) |
| `backend/.env.example` | Template for environment variables (committed to git) |

### 5.5 Technologies Used

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 LTS | Server runtime |
| TypeScript | 5.x | Static typing |
| Express.js | 4.x | HTTP server framework |
| MQTT.js | 5.x | MQTT client for Node.js |
| Prisma ORM | 5.x | Database access layer |
| PostgreSQL | 15+ | Relational time-series database |
| Socket.IO | 4.x | WebSocket library |
| Zod | 3.x | Runtime schema validation |
| Winston | 3.x | Structured logging |
| nodemon | 3.x | Auto-restart on file change during dev |
| ts-node | 10.x | Execute TypeScript directly without compilation |
| Mosquitto | 2.x | MQTT broker |

### 5.6 Inputs Member 2 Receives

- **MQTT payload contract** from Section 3.2 and 3.3 of this document.
- **API response shapes required by Member 3** — Member 3 shares the mock data shapes they built early on, and Member 2 must ensure the real API returns the same structure.
- **Member 1's device ID** (`ESP32_WEM_001`) to configure device lookup.

### 5.7 Outputs Member 2 Produces

- Running **REST API** on `http://localhost:3001/api/v1` responding to all documented endpoints.
- Running **Socket.IO server** on `http://localhost:3001` emitting `sensor:reading`, `anomaly:detected`, `device:status`, `device:offline` events.
- Populated **PostgreSQL** database with time-series sensor data.
- Anomaly records in the `anomalies` table.
- MQTT Simulator script for local testing without hardware.
- `.env.example` file shared with team.

### 5.8 Dependencies and Definition of Done

**Dependencies:**
- Depends on Member 1 for: Physical MQTT messages during integration phase (Week 5). Until then, uses own simulator.
- Depends on Member 3 for: Nothing during development. During integration, Member 3 will notify Member 2 of CORS issues or Socket.IO event name mismatches.

**Definition of Done:**

- [ ] Mosquitto broker starts automatically and listens on port 1883.
- [ ] MQTT subscriber connects and logs "Subscribed to resource/readings and resource/status".
- [ ] Simulator script publishes payloads every 10 seconds; subscriber receives and processes them without errors.
- [ ] Zod validator correctly rejects a payload with `flow_rate_lpm: -5` (negative flow) with a logged error.
- [ ] Water readings insert into `water_readings` table; confirmed with `SELECT COUNT(*) FROM water_readings;`.
- [ ] Electricity readings insert into `electricity_readings` table.
- [ ] Device record upserted into `devices` table on first status message.
- [ ] Device marked offline in DB after 60 seconds of no heartbeat.
- [ ] `GET /api/v1/water/readings` returns paginated JSON with correct data.
- [ ] `GET /api/v1/electricity/analytics/daily` returns correct daily kWh aggregation.
- [ ] `GET /api/v1/anomalies` returns anomaly list with correct schema.
- [ ] Socket.IO `sensor:reading` event received by a test client on every new reading.
- [ ] HIGH_FLOW anomaly created when simulator sends `flow_rate_lpm: 45`.
- [ ] All API endpoints return errors in the standard envelope on invalid input.
- [ ] `docs/API_CONTRACT.md` is complete and reviewed by Member 3.
- [ ] `.env.example` is committed to Git with all required variable names (no values).

### 5.9 Testing Requirements

| Test | Method | Pass Criterion |
|------|--------|----------------|
| MQTT subscribe | Run simulator + check subscriber logs | Message received every 10s |
| Zod validation — valid payload | Send canonical payload | No error; DB row inserted |
| Zod validation — invalid | Send `{ device_id: "" }` | ZodError logged; no DB insert |
| DB insertion | Query DB after simulator runs for 1 min | 6 rows in each table |
| REST GET /water/readings | `curl http://localhost:3001/api/v1/water/readings` | Valid JSON, `success: true` |
| REST pagination | Add `?page=2&limit=10` | Returns correct page |
| REST date filter | Add `?from=2026-09-22` | Returns only matching rows |
| Analytics daily | Send 48h of simulated data; call daily endpoint | Correct totals per day |
| Anomaly HIGH_FLOW | Simulator sends flow > 30 | Anomaly row created |
| Anomaly DEVICE_OFFLINE | Stop simulator for 90s | Device marked offline; event emitted |
| Socket.IO emit | Connect Socket.IO client; run simulator | `sensor:reading` event received |
| Error handling | Call non-existent route | `404` with error envelope |
| CORS | Fetch from `http://localhost:3000` | No CORS error |

### 5.10 Viva Questions Member 2 Should Prepare

**Q1: What is the role of the MQTT subscriber in your backend?**  
**A:** The MQTT subscriber is the entry point for all sensor data into the backend. It is a long-running MQTT client (using MQTT.js) that connects to the Mosquitto broker and subscribes to the `resource/readings` and `resource/status` topics with QoS 1. Whenever a message arrives on these topics, the subscriber parses the JSON, runs it through the Zod validation schema, and if valid, passes the data to the database insertion service and analytics pipeline. If the message fails validation, the error is logged and the message is discarded — no invalid data ever reaches the database.

**Q2: What is Prisma ORM and why did you use it instead of raw SQL?**  
**A:** Prisma is a type-safe ORM (Object-Relational Mapper) for Node.js and TypeScript. Instead of writing raw SQL strings, you define your data models in a `schema.prisma` file, and Prisma generates a fully type-safe client that provides auto-completed query methods like `prisma.waterReading.create()`, `prisma.waterReading.findMany()`, and `prisma.waterReading.groupBy()`. The advantages are: (1) TypeScript types are automatically derived from the schema, catching data shape mismatches at compile time. (2) Prisma Migrate manages database schema evolution in a tracked, reproducible way. (3) Query results are typed objects, not raw row arrays, reducing runtime errors.

**Q3: Explain your PostgreSQL schema. Why did you index `timestamp` and `deviceId`?**  
**A:** The schema has five tables: `devices`, `water_readings`, `electricity_readings`, and `anomalies`. The `water_readings` and `electricity_readings` tables have composite indexes on `(device_id, timestamp)` and a standalone index on `timestamp`. This is because the most common query patterns are: (a) "give me all readings for device X between time A and time B" — served by the composite index, and (b) "give me all readings in the last 24 hours across all devices" — served by the standalone timestamp index. Without these indexes, every time-range query would require a full sequential table scan, which becomes prohibitively slow as the table grows to millions of rows over weeks of operation.

**Q4: What is Zod and why do you validate MQTT payloads with it?**  
**A:** Zod is a TypeScript-first schema declaration and runtime validation library. The MQTT broker is an open network endpoint — any device can publish to it. Without validation, a malformed payload (missing a required field, a string where a number is expected, a negative value for a physical quantity that must be non-negative) could cause runtime exceptions in downstream code or insert corrupt data into the database. Zod schemas define the exact expected shape and value constraints of the payload. Calling `schema.parse(data)` either returns a fully-typed valid object or throws a `ZodError` with detailed field-level error messages. This provides a safety boundary at the ingestion layer.

**Q5: Why did you choose rule-based anomaly detection instead of machine learning?**  
**A:** For a college PBL project with a development timeline of 6 weeks and a dataset that will have at most a few weeks of historical data at the time of submission, machine learning is not appropriate. ML-based anomaly detection (e.g., LSTM autoencoders, isolation forests) requires (a) substantial historical training data representing normal behaviour, (b) model training infrastructure, (c) model evaluation and tuning cycles, and (d) deployment complexity. Rule-based detection (threshold checks) is deterministic, immediately explainable ("the flow rate exceeded 30 L/min at 14:23"), requires no training data, has zero inference latency, and the decision logic is fully transparent and auditable. For physical quantities with known safe operating ranges (voltage 200–260V, flow 0–30 L/min), thresholds are the appropriate and professional choice.

**Q6: How does Socket.IO differ from raw WebSocket?**  
**A:** Raw WebSocket (RFC 6455) provides a bidirectional, full-duplex communication channel over a single TCP connection, but it is a low-level protocol with no built-in features for room management, automatic reconnection, message acknowledgments, or fallback to long-polling in restricted network environments. Socket.IO is a library built on top of WebSocket (and falling back to HTTP long-polling if WebSocket is unavailable) that adds: named events, acknowledgment callbacks, rooms and namespaces for grouping clients, automatic reconnection with exponential back-off, and a unified client API across browsers. For this project, Socket.IO's named events (`sensor:reading`, `anomaly:detected`) are semantically clearer and easier to work with on the frontend than raw WebSocket message framing.

**Q7: How does your backend detect that a device has gone offline?**  
**A:** The device offline detection uses a heartbeat watchdog pattern. Each time a `resource/status` message is received, the `deviceService` calls `prisma.device.update({ where: { deviceId }, data: { lastSeen: new Date() } })` to record the current timestamp. A `setInterval` runs every 30 seconds and queries `prisma.device.findMany({ where: { lastSeen: { lt: sixtySecondsAgo } } })`. Any device whose `lastSeen` is more than 60 seconds in the past is updated to `status: 'offline'` and a `device:offline` Socket.IO event is emitted to all connected frontend clients.

**Q8: Explain the daily energy consumption analytics query.**  
**A:** The daily energy query needs to return total kWh consumed per calendar day. Since we store `energy_kwh` as a running total (cumulative since device boot), we cannot simply sum the `energy_kwh` column — that would double-count all previous energy. Instead, for each day, we find the first and last reading of the day, and daily consumption = `last.energy_kwh - first.energy_kwh`. Alternatively, if readings are frequent enough, we can compute incremental energy: since each 10-second interval's energy is `power_w × (10/3600000)` kWh, we can compute and store the incremental value per reading. We do the latter: at insertion time, we compute and store `incrementalEnergyKwh` by subtracting the previous reading's `energy_kwh` from the current one. The daily analytics then sums these incremental values using `prisma.electricityReading.aggregate({ _sum: { incrementalEnergyKwh: true }, where: { timestamp: { gte: dayStart, lt: dayEnd } } })`.

**Q9: What is the baseline calculation for anomaly detection?**  
**A:** The baseline is the expected normal value for a sensor. For flow rate, the baseline could be defined as the rolling 7-day median flow rate during working hours. However, for this prototype, we use static thresholds derived from the sensor's physical and safety limits rather than a computed baseline. The thresholds are: flow > 30 L/min is abnormal (typical household pipe burst level), voltage < 200V or > 260V is abnormal (outside the ISI permitted variation of ±6% of 230V), and power > 3500W is abnormal (exceeds a standard 15A Indian household circuit's safe capacity). These are well-known domain values, not learned from data.

**Q10: How does the REST API handle pagination?**  
**A:** Every list endpoint (`/water/readings`, `/electricity/readings`, `/anomalies`) accepts `page` and `limit` query parameters. The controller validates these with Zod (they must be positive integers; limit ≤ 200). It then calls `prisma.waterReading.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { timestamp: 'desc' } })` for data, and `prisma.waterReading.count(...)` for the total count. The response includes a `meta` object: `{ page, limit, total, totalPages }`. This prevents the frontend from accidentally loading thousands of rows in a single response.

**Q11: What does your `.env.example` file contain and why is it committed to Git?**  
**A:** `.env.example` is a template that lists every required environment variable name with a placeholder or description as the value, but no actual secrets. For example: `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB_NAME"`. The real `.env` file contains actual values and is listed in `.gitignore` so it is never committed. `.env.example` is committed so that any team member can clone the repository and know exactly what environment variables they need to configure, without exposing secrets in the repository.

**Q12: Why do you use Winston for logging instead of `console.log`?**  
**A:** `console.log` is not suitable for production because: (1) it has no severity levels, so debug noise and critical errors are indistinguishable; (2) it does not support structured output (JSON), making log aggregation difficult; (3) it cannot write to files or external log systems; (4) timestamps are not automatically included. Winston provides: configurable log levels (error, warn, info, debug), structured JSON output, simultaneous transport to console and file, and timestamp injection. In production, machine-readable JSON logs can be ingested by tools like ELK Stack or CloudWatch.

**Q13: Explain how the WebSocket integration connects the MQTT subscriber to the frontend.**  
**A:** The MQTT subscriber, Socket.IO server, and REST API all run inside the same Node.js process. When the MQTT subscriber receives a validated sensor reading, it calls `emitSensorReading(payload)`, which calls `io.emit('sensor:reading', payload)`. This broadcasts the payload to all currently connected Socket.IO clients (i.e., all open browser tabs running the dashboard). The Socket.IO server shares the same HTTP server instance as Express, initialized in `server.ts`. This avoids running a separate WebSocket server on a different port.

**Q14: What Node.js version do you use and why?**  
**A:** Node.js 20 LTS (Long-Term Support). LTS versions are supported with security updates for 30 months, making them appropriate for production and for projects that will be maintained beyond the initial build. Node.js 20 includes native fetch, improved performance on the V8 engine, and stable ECMAScript 2022 features. Using an LTS version also ensures all npm packages in the ecosystem have compatible builds.

**Q15: How do you ensure the backend does not crash on a single bad MQTT message?**  
**A:** The MQTT message handler is wrapped in a `try-catch` block. If the JSON is malformed (`JSON.parse` throws), or if Zod validation fails (`schema.parse` throws a ZodError), or if the Prisma insertion fails (DB connection error throws), all errors are caught, logged with their details using Winston, and the execution returns without crashing the process. The MQTT client continues listening for subsequent messages. This is a resilience pattern called "bulkhead isolation" — a single bad message cannot take down the entire subscriber.

---

## 6. Member 3 — Frontend, Dashboard & Real-Time Visualization

### 6.1 Profile

Member 3 has no physical hardware and does not run a backend server during Phase 1. Their responsibility is the **presentation layer** of the system: a Next.js 14+ web dashboard that displays real-time water flow and electricity consumption data, historical charts, anomaly alerts, and device status. They use a mock-first development approach, building every component and page against mock JSON data before connecting to the real backend.

Member 3 works in **TypeScript / React / Next.js**, using Tailwind CSS for styling, Recharts for data visualization, Socket.IO client for real-time updates, and SWR or React Query for REST data fetching.

### 6.2 Responsibilities

- Initialize and configure the Next.js 14+ project with TypeScript, Tailwind CSS, and all required dependencies.
- Define all TypeScript type interfaces for API responses and component props.
- Create comprehensive mock data fixtures for every API endpoint and every Socket.IO event.
- Build a toggleable API utility that switches between mock and real backend seamlessly.
- Build all reusable UI components: metric cards, charts, alert displays, status indicators.
- Build all application pages: Dashboard, Water, Electricity, Analytics, Anomalies.
- Implement a real-time data hook using Socket.IO client.
- Implement data fetching hooks using SWR or React Query.
- Implement responsive layout for both mobile and desktop viewports.
- Handle and display offline/device-down states gracefully in the UI.

### 6.3 Exact Tasks (Numbered and Detailed)

**Task 1 — Initialize Next.js 14+ Project**

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd frontend
npm install recharts socket.io-client swr date-fns clsx
npm install -D @types/recharts
```

Configure `tailwind.config.ts` to extend theme with custom colors matching the dashboard design (blues for water, ambers for electricity, reds for anomalies). Configure `next.config.js` to set up the API proxy:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
```

**Task 2 — Create Type Definitions File**

Create `frontend/src/types/index.ts` with all shared TypeScript interfaces:

```typescript
export interface WaterReading {
  id: string;
  deviceId: string;
  timestamp: string;
  flowRateLpm: number;
  totalVolumeLiters: number;
  pulseCount: number;
}

export interface ElectricityReading {
  id: string;
  deviceId: string;
  timestamp: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  energyKwh: number;
  powerFactor: number;
}

export interface DailyWaterConsumption {
  date: string;           // "2026-09-22"
  totalVolumeLiters: number;
}

export interface DailyEnergyConsumption {
  date: string;
  totalEnergyKwh: number;
}

export interface HourlyWaterFlow {
  hour: number;           // 0–23
  avgFlowRateLpm: number;
}

export interface HourlyPowerProfile {
  hour: number;
  avgPowerW: number;
}

export interface Anomaly {
  id: string;
  deviceId: string;
  detectedAt: string;
  type: 'HIGH_FLOW' | 'LOW_VOLTAGE' | 'HIGH_VOLTAGE' | 'HIGH_POWER' | 'DEVICE_OFFLINE' | 'ZERO_FLOW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  value: number | null;
  threshold: number | null;
  resolved: boolean;
  resolvedAt: string | null;
}

export interface DeviceStatus {
  deviceId: string;
  name: string | null;
  status: 'online' | 'offline' | 'unknown';
  lastSeen: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  wifiRssiDbm: number | null;
  uptimeSeconds: number | null;
}

export interface SensorReadingEvent {
  device_id: string;
  timestamp: string;
  water: {
    flow_rate_lpm: number;
    total_volume_liters: number;
    pulse_count: number;
  };
  electricity: {
    voltage_v: number;
    current_a: number;
    power_w: number;
    energy_kwh: number;
    power_factor: number;
  };
  uptime_seconds: number;
  wifi_rssi_dbm: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Task 3 — Create Mock JSON Fixtures**

Create `frontend/src/lib/mockData.ts`. This file must contain realistic, plausible data for every API response shape. Values must be believable (flow rates between 5–25 L/min, voltage around 230V, power between 100–3000W, etc.):

```typescript
import type {
  WaterReading, ElectricityReading, DailyWaterConsumption,
  DailyEnergyConsumption, HourlyWaterFlow, HourlyPowerProfile,
  Anomaly, DeviceStatus, SensorReadingEvent,
} from '@/types';

export const mockWaterReadings: WaterReading[] = [
  { id: 'wr_001', deviceId: 'ESP32_WEM_001', timestamp: '2026-09-22T14:20:00.000Z', flowRateLpm: 12.5, totalVolumeLiters: 1024.3, pulseCount: 51215 },
  { id: 'wr_002', deviceId: 'ESP32_WEM_001', timestamp: '2026-09-22T14:20:10.000Z', flowRateLpm: 13.1, totalVolumeLiters: 1026.5, pulseCount: 51325 },
  // ... at least 20 entries
];

export const mockDailyWaterConsumption: DailyWaterConsumption[] = [
  { date: '2026-09-16', totalVolumeLiters: 312.4 },
  { date: '2026-09-17', totalVolumeLiters: 298.7 },
  { date: '2026-09-18', totalVolumeLiters: 341.2 },
  { date: '2026-09-19', totalVolumeLiters: 287.9 },
  { date: '2026-09-20', totalVolumeLiters: 356.1 },
  { date: '2026-09-21', totalVolumeLiters: 329.8 },
  { date: '2026-09-22', totalVolumeLiters: 198.4 },
];

export const mockDailyEnergyConsumption: DailyEnergyConsumption[] = [
  { date: '2026-09-16', totalEnergyKwh: 8.42 },
  { date: '2026-09-17', totalEnergyKwh: 7.91 },
  { date: '2026-09-18', totalEnergyKwh: 9.34 },
  { date: '2026-09-19', totalEnergyKwh: 8.07 },
  { date: '2026-09-20', totalEnergyKwh: 10.12 },
  { date: '2026-09-21', totalEnergyKwh: 9.55 },
  { date: '2026-09-22', totalEnergyKwh: 5.21 },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 'anom_001', deviceId: 'ESP32_WEM_001',
    detectedAt: '2026-09-22T09:14:23.000Z',
    type: 'HIGH_FLOW', severity: 'HIGH',
    description: 'Water flow rate 34.2 L/min exceeded threshold of 30 L/min. Possible pipe burst or tap left open.',
    value: 34.2, threshold: 30, resolved: true, resolvedAt: '2026-09-22T09:32:00.000Z',
  },
  {
    id: 'anom_002', deviceId: 'ESP32_WEM_001',
    detectedAt: '2026-09-21T23:47:11.000Z',
    type: 'HIGH_POWER', severity: 'CRITICAL',
    description: 'Power consumption 4120W exceeded threshold of 3500W. Possible appliance malfunction.',
    value: 4120, threshold: 3500, resolved: false, resolvedAt: null,
  },
];

export const mockDeviceStatus: DeviceStatus = {
  deviceId: 'ESP32_WEM_001', name: 'Main Building Monitor',
  status: 'online', lastSeen: new Date().toISOString(),
  ipAddress: '192.168.1.105', firmwareVersion: '1.0.0',
  wifiRssiDbm: -62, uptimeSeconds: 86400,
};

export const mockSensorReadingEvent: SensorReadingEvent = {
  device_id: 'ESP32_WEM_001', timestamp: new Date().toISOString(),
  water: { flow_rate_lpm: 11.8, total_volume_liters: 1042.7, pulse_count: 52135 },
  electricity: { voltage_v: 231.8, current_a: 4.12, power_w: 954.2, energy_kwh: 0.2648, power_factor: 1.0 },
  uptime_seconds: 86400, wifi_rssi_dbm: -62,
};
```

**Task 4 — Create Mock API Utility**

Create `frontend/src/lib/api.ts`. This is the central function through which all data fetching flows. It checks `process.env.NEXT_PUBLIC_USE_MOCK_API`:

```typescript
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
const BASE_URL = '/api/backend';

async function fetchReal<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data as T;
}

export async function getWaterReadings(params?: { page?: number; limit?: number; from?: string; to?: string }) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200)); // simulate latency
    return mockWaterReadings;
  }
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return fetchReal<WaterReading[]>(`/water/readings?${query}`);
}

export async function getDailyWaterConsumption() {
  if (USE_MOCK) return mockDailyWaterConsumption;
  return fetchReal<DailyWaterConsumption[]>('/water/analytics/daily');
}

// ... similar functions for every endpoint
```

**Task 5 — Build DashboardHeader Component**

Create `frontend/src/components/DashboardHeader.tsx`. Displays the project title, current date/time (updated every second using `useEffect` + `setInterval`), and device connection status badge (green "Online" or red "Offline" based on device status prop).

**Task 6 — Build MetricCard Component**

Create `frontend/src/components/MetricCard.tsx`. A reusable card with props: `title`, `value`, `unit`, `icon`, `trend` (up/down/neutral), `trendValue`, `colorScheme` ('water' | 'electricity' | 'alert'). Renders a styled card with a large value display, unit label, and trend indicator arrow.

**Task 7 — Build WaterFlowCard Component**

Create `frontend/src/components/WaterFlowCard.tsx`. Displays current flow rate in L/min with a circular gauge visual (implemented with a Recharts `RadialBarChart`), total volume consumed today, and a color-coded status (green for normal, orange for elevated, red for high).

**Task 8 — Build ElectricityCard Component**

Create `frontend/src/components/ElectricityCard.tsx`. Displays current voltage, current draw, power in Watts, and today's energy in kWh. Uses a grid layout with four sub-cards. Voltage and current values update in real-time via Socket.IO.

**Task 9 — Build ConsumptionChart Component (Recharts)**

Create `frontend/src/components/ConsumptionChart.tsx`. Uses Recharts `BarChart` to display daily water consumption (litres per day) for the last 7 days. Props: `data: DailyWaterConsumption[]`, `isLoading: boolean`. Includes loading skeleton, responsive container, custom tooltip, and X-axis formatted with `date-fns`.

**Task 10 — Build PowerChart Component (Recharts)**

Create `frontend/src/components/PowerChart.tsx`. Uses Recharts `LineChart` with `AreaChart` fill to display power consumption (W) over time. Updates in real-time: each new `sensor:reading` Socket.IO event appends a new data point to the chart. The chart shows the last 30 data points (last 5 minutes). Uses smooth curve interpolation (`type="monotone"`).

**Task 11 — Build AnomalyCard Component**

Create `frontend/src/components/AnomalyCard.tsx`. Displays a single anomaly with: severity badge (color-coded by severity level), anomaly type label, description text, detected-at timestamp (formatted with `date-fns`), current value vs threshold, and a "Resolved" or "Unresolved" status indicator.

**Task 12 — Build AlertCard Component**

Create `frontend/src/components/AlertCard.tsx`. A notification-style card that appears at the top of the dashboard when a new anomaly is received via Socket.IO. Has a dismiss button. Stack multiple unread alerts. Automatically dismiss after 10 seconds.

**Task 13 — Build DeviceStatus Component**

Create `frontend/src/components/DeviceStatus.tsx`. Displays the device status panel: device ID, online/offline status with pulsing dot indicator, last seen timestamp, IP address, firmware version, Wi-Fi RSSI with signal bar icon, and uptime formatted as "X days, Y hours, Z minutes".

**Task 14 — Build TimeRangeSelector Component**

Create `frontend/src/components/TimeRangeSelector.tsx`. A button group allowing user to select time range for charts: Last Hour | Last 24 Hours | Last 7 Days | Last 30 Days. Passes selected range up via `onChange` callback. Used on all analytics pages to drive API query parameters.

**Task 15 — Build Main Dashboard Page**

Create `frontend/src/app/page.tsx` (the root route `/`). Layout: header row → MetricCards row (4 cards: current flow, today's volume, current power, today's energy) → two-column middle row (WaterFlowCard + ElectricityCard) → two-column lower row (ConsumptionChart + PowerChart) → AlertCard stack (if anomalies) → DeviceStatus sidebar.

**Task 16 — Build Water Page**

Create `frontend/src/app/water/page.tsx`. Dedicated water monitoring page with: current flow rate gauge, hourly flow bar chart (24 hours), daily consumption bar chart (7 days), flow rate history line chart, and total volume statistics.

**Task 17 — Build Electricity Page**

Create `frontend/src/app/electricity/page.tsx`. Dedicated electricity monitoring page with: live voltage/current/power display, hourly power area chart, daily energy bar chart, peak demand display, and estimated monthly cost calculator (using a configurable tariff rate input in ₹/kWh).

**Task 18 — Build Analytics Page**

Create `frontend/src/app/analytics/page.tsx`. Combined analytics page showing: water vs electricity dual-axis chart, rolling 7-day averages, efficiency scores (current vs last week), and time-of-day usage heatmap (hours × days grid coloured by intensity).

**Task 19 — Build Anomalies Page**

Create `frontend/src/app/anomalies/page.tsx`. Full anomaly management page with: filterable/sortable table of all anomalies, filter by severity/type/status, anomaly detail expand panel, and summary statistics (total anomalies by type, resolved vs unresolved).

**Task 20 — Implement Socket.IO Client Hook (`useSocket`)**

Create `frontend/src/hooks/useSocket.ts`:

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    }
    socketRef.current = socket;
    return () => {
      // Do not disconnect on component unmount — shared singleton
    };
  }, []);

  return socketRef.current;
}
```

**Task 21 — Implement Real-Time State Updates**

Create `frontend/src/hooks/useRealTimeData.ts`. This hook subscribes to Socket.IO events and updates local React state:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import type { SensorReadingEvent, Anomaly, DeviceStatus } from '@/types';

export function useRealTimeData() {
  const socket = useSocket();
  const [latestReading, setLatestReading] = useState<SensorReadingEvent | null>(null);
  const [latestAnomaly, setLatestAnomaly] = useState<Anomaly | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isDeviceOnline, setIsDeviceOnline] = useState(true);

  useEffect(() => {
    if (!socket) return;
    socket.on('sensor:reading', (data: SensorReadingEvent) => setLatestReading(data));
    socket.on('anomaly:detected', (data: Anomaly) => setLatestAnomaly(data));
    socket.on('device:status', (data: DeviceStatus) => setDeviceStatus(data));
    socket.on('device:offline', () => setIsDeviceOnline(false));
    return () => {
      socket.off('sensor:reading');
      socket.off('anomaly:detected');
      socket.off('device:status');
      socket.off('device:offline');
    };
  }, [socket]);

  return { latestReading, latestAnomaly, deviceStatus, isDeviceOnline };
}
```

**Task 22 — Implement API Fetch Hooks**

Create `frontend/src/hooks/useWaterData.ts`, `useElectricityData.ts`, `useAnomalyData.ts`, `useDeviceStatus.ts`. Each uses SWR:

```typescript
import useSWR from 'swr';
import { getDailyWaterConsumption, getWaterReadings } from '@/lib/api';

export function useWaterData() {
  const { data: daily, error: dailyError, isLoading: dailyLoading } =
    useSWR('water/daily', () => getDailyWaterConsumption(), { refreshInterval: 60000 });

  const { data: readings, error: readingsError, isLoading: readingsLoading } =
    useSWR('water/readings', () => getWaterReadings({ limit: 50 }), { refreshInterval: 30000 });

  return { daily, readings, isLoading: dailyLoading || readingsLoading, error: dailyError || readingsError };
}
```

**Task 23 — Responsive Layout**

Implement responsive CSS using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`). The dashboard uses:
- Mobile (< 768px): single-column layout, cards stack vertically, charts are 300px tall.
- Tablet (768–1024px): two-column grid for metric cards and charts.
- Desktop (> 1024px): full three-column layout with sidebar for device status.

Use Tailwind's `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` pattern for metric cards.

**Task 24 — Offline / Device-Down State Display**

When the `device:offline` Socket.IO event is received (or when the API returns a device status of `offline`):
- Display a full-width red banner at the top: "⚠️ Device offline — showing last known values as of [timestamp]".
- Dim all metric cards with `opacity-60` and add a "Last known" label.
- Show a pulsing grey dot instead of the green online indicator in DeviceStatus.
- Charts continue to display historical data normally; they just do not update with new points.

### 6.4 Files Member 3 Creates or Edits

| File Path | Purpose |
|-----------|---------|
| `frontend/src/app/page.tsx` | Main dashboard page (root route `/`) |
| `frontend/src/app/water/page.tsx` | Water monitoring page |
| `frontend/src/app/electricity/page.tsx` | Electricity monitoring page |
| `frontend/src/app/analytics/page.tsx` | Combined analytics page |
| `frontend/src/app/anomalies/page.tsx` | Anomaly management page |
| `frontend/src/app/layout.tsx` | Root layout: navigation sidebar, fonts, metadata |
| `frontend/src/app/globals.css` | Global styles and Tailwind directives |
| `frontend/src/components/DashboardHeader.tsx` | Top header with title, time, and connection status |
| `frontend/src/components/MetricCard.tsx` | Reusable metric display card |
| `frontend/src/components/WaterFlowCard.tsx` | Water flow gauge and stats card |
| `frontend/src/components/ElectricityCard.tsx` | Electricity readings display card |
| `frontend/src/components/ConsumptionChart.tsx` | Daily water consumption bar chart |
| `frontend/src/components/PowerChart.tsx` | Real-time power line/area chart |
| `frontend/src/components/AnomalyCard.tsx` | Individual anomaly display card |
| `frontend/src/components/AlertCard.tsx` | Dismissible real-time alert notification |
| `frontend/src/components/DeviceStatus.tsx` | Device info and connection status panel |
| `frontend/src/components/TimeRangeSelector.tsx` | Time range button group for chart filtering |
| `frontend/src/components/Navigation.tsx` | Sidebar or top navigation with route links |
| `frontend/src/components/LoadingSkeleton.tsx` | Skeleton placeholder for loading states |
| `frontend/src/hooks/useSocket.ts` | Socket.IO singleton client hook |
| `frontend/src/hooks/useRealTimeData.ts` | Real-time state management via Socket.IO |
| `frontend/src/hooks/useWaterData.ts` | SWR-based water data fetching hook |
| `frontend/src/hooks/useElectricityData.ts` | SWR-based electricity data fetching hook |
| `frontend/src/hooks/useAnomalyData.ts` | SWR-based anomaly data fetching hook |
| `frontend/src/hooks/useDeviceStatus.ts` | SWR-based device status fetching hook |
| `frontend/src/lib/api.ts` | Centralized API utility with mock/real toggle |
| `frontend/src/lib/mockData.ts` | All mock data fixtures for development |
| `frontend/src/types/index.ts` | All TypeScript type and interface definitions |
| `frontend/tailwind.config.ts` | Tailwind CSS configuration with theme extensions |
| `frontend/next.config.js` | Next.js configuration with API proxy rewrites |
| `frontend/package.json` | npm project configuration |
| `frontend/.env.local` | Local environment variables (gitignored) |
| `frontend/.env.example` | Template for environment variables |

### 6.5 Technologies Used

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14+ (App Router) | React framework with SSR/SSG/RSC and file-based routing |
| React | 18 | UI component library |
| TypeScript | 5.x | Static typing |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Recharts | 2.x | React charting library (composable, responsive) |
| Socket.IO Client | 4.x | WebSocket client for real-time events |
| SWR | 2.x | Data fetching with stale-while-revalidate caching |
| date-fns | 3.x | Date formatting and manipulation |
| clsx | 2.x | Utility for conditional className composition |

### 6.6 Mock Data Strategy

Member 3's primary development technique is **mock-first development**. The fundamental insight is: the shape of the data (types and interfaces) is agreed upon by the team in advance, even before Member 2 has written a single API handler. Member 3 uses that agreed shape to write mock data and build components against it. When Member 2's real API is ready, switching to real data is a one-line environment variable change.

**Implementation steps:**

1. **`frontend/src/types/index.ts`** — Define all TypeScript interfaces (done in Task 2). This file is the ground truth for data shapes; all three members reference it.

2. **`frontend/src/lib/mockData.ts`** — Hand-author realistic objects that match every interface. Include at least 7 days of daily aggregation data, at least 20 individual readings, at least 3 anomalies (of different types and severities), and a device status object. Values must be physically plausible.

3. **`frontend/src/lib/api.ts`** — Every API call goes through this file. At the top of the file, `const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';`. Each exported function checks this flag and either returns mock data with a simulated 200ms async delay (to make loading states testable), or performs a real `fetch()` to the backend.

4. **`frontend/.env.local`** — During Phase 1 development: `NEXT_PUBLIC_USE_MOCK_API=true`. During integration Phase 2: `NEXT_PUBLIC_USE_MOCK_API=false`.

5. **Simulated Socket.IO events (optional)** — For fully offline development of real-time features, Member 3 can create a `useSocketMock.ts` hook that uses a `setInterval` to generate fake `sensor:reading` events at the same interval as the real device (every 10 seconds), using values from `mockData.ts` with added random jitter. This can be enabled by another flag: `NEXT_PUBLIC_USE_MOCK_SOCKET=true`.

**Benefits:**
- Member 3 can build and demo the complete dashboard independently of both Member 1 and Member 2.
- The UI is fully testable for edge cases (device offline, anomaly banner, empty state) by simply varying the mock data.
- Integration is a single configuration change — no code refactoring required.

### 6.7 Inputs Member 3 Receives

- **From this document (Section 3):** The canonical MQTT payload format and the REST API endpoint list — used to design `types/index.ts` and `lib/mockData.ts`.
- **From Member 2 (`docs/API_CONTRACT.md`):** Complete REST API documentation including exact request/response shapes, error formats, and pagination structure. Member 2 must deliver this by end of Week 2.
- **From Member 2:** Socket.IO event names and their payload shapes. Member 2 must share these by end of Week 2 (they are defined in Section 3.6 of this document).

### 6.8 Outputs Member 3 Produces

- Running **Next.js application** on `http://localhost:3000`.
- Fully functional dashboard viewable in any modern browser.
- All pages complete and responsive on mobile and desktop.
- Real-time charts and metrics updating via Socket.IO during integration.
- Offline device state handled gracefully with user-friendly messaging.

### 6.9 Dependencies and Definition of Done

**Dependencies:**
- Depends on Member 2 for: API contract document by end of Week 2 (can use this document's Section 3 as starting point until then). Real backend during integration Phase 2 (Week 5–6).
- Depends on Member 1 for: Nothing directly. The real sensor data arrives via Member 2's backend.

**Definition of Done:**

- [ ] Next.js app starts on `http://localhost:3000` with `NEXT_PUBLIC_USE_MOCK_API=true` and all pages load without errors.
- [ ] Dashboard page displays 4 metric cards, 2 gauge cards, and 2 charts with mock data.
- [ ] ConsumptionChart renders 7 days of bar data with correct labels and values from mockData.
- [ ] PowerChart updates in real-time when mock Socket.IO interval fires new readings.
- [ ] WaterFlowCard radial gauge changes color when flow rate exceeds 25 L/min.
- [ ] AnomalyCard renders all 3 mock anomalies on the Anomalies page with correct severity colors.
- [ ] AlertCard appears at top of dashboard when a new anomaly Socket.IO event arrives; dismisses on click.
- [ ] DeviceStatus shows "Offline" state correctly when `device:offline` event fires.
- [ ] TimeRangeSelector correctly filters chart data when different range buttons are clicked.
- [ ] All pages are accessible via navigation links; no broken routes.
- [ ] Layout is responsive: single column on 375px viewport, multi-column on 1440px viewport.
- [ ] TypeScript compiles with `tsc --noEmit` with zero errors.
- [ ] After switching `NEXT_PUBLIC_USE_MOCK_API=false` and pointing to Member 2's running backend, the same pages display real data with no code changes.
- [ ] Socket.IO real-time updates from Member 2's server populate the PowerChart in near-real-time.

### 6.10 Testing Requirements

| Test | Method | Pass Criterion |
|------|--------|----------------|
| Mock data load | Start with `USE_MOCK_API=true`; open Dashboard | All cards show correct mock values |
| Chart renders | Open Dashboard; inspect ConsumptionChart | 7 bars visible, labels correct |
| Real-time mock | Wait 10 seconds; watch PowerChart | New data point appended to chart |
| Anomaly display | Open Anomalies page | All 3 mock anomalies listed with correct severity badges |
| Alert card | Trigger mock `anomaly:detected` event | Red alert banner appears at top |
| Offline state | Trigger mock `device:offline` event | Banner and dimmed cards appear |
| Time range selector | Click "Last 7 Days" then "Last Hour" | Chart data changes accordingly |
| Responsive mobile | Open Chrome DevTools at 375px | Single column layout, no horizontal overflow |
| TypeScript check | Run `npx tsc --noEmit` | Zero errors |
| Real API switch | Set `USE_MOCK_API=false`; run with Member 2's backend | Real data appears; no `fetch` errors |
| Socket.IO real | Run with Member 2's backend + simulator | PowerChart updates every 10s |
| Navigation | Click all nav links | All pages load; active link highlighted |

### 6.11 Viva Questions Member 3 Should Prepare

**Q1: What is the Next.js 14 App Router and how does it differ from the Pages Router?**  
**A:** The App Router (introduced stable in Next.js 13.4, refined in 14) uses the `app/` directory. Every folder in `app/` represents a route segment, and `page.tsx` files are the UI for that segment. The App Router uses React Server Components by default — components run on the server, fetch data directly, and stream HTML to the client. Client components (needing `useState`, `useEffect`, browser APIs, or event listeners) must be explicitly marked with the `'use client'` directive at the top of the file. This differs from the old Pages Router where all pages were client-rendered by default. The App Router enables much better code splitting, server-side data fetching, and streaming.

**Q2: What are React Server Components (RSC) and which components in your project use them?**  
**A:** React Server Components render on the server and never ship their JavaScript to the client. They can directly `await` data fetches, access databases, read files, and use server-side secrets. They cannot use React hooks (`useState`, `useEffect`), browser APIs, or event handlers. In this project, page-level components (`page.tsx` files) can be Server Components if they only render layout and pass data to client components. However, because most of our pages need real-time state from Socket.IO, hooks like `useRealTimeData`, and interactive controls like TimeRangeSelector, most of our UI components are Client Components (marked with `'use client'`). The root layout (`layout.tsx`) and static structure wrappers can remain Server Components.

**Q3: Explain the SWR data fetching pattern. What does "stale-while-revalidate" mean?**  
**A:** SWR is a React data fetching library that implements the HTTP stale-while-revalidate cache strategy. When `useSWR(key, fetcher)` is called: (1) If there is cached data for the key, it returns the stale cached data immediately (so the UI renders instantly, no loading flash). (2) In the background, it fires the `fetcher` function to get fresh data from the API. (3) When fresh data arrives, it updates the state and the component re-renders with up-to-date values. This means the UI is always fast (returns immediately from cache) but also always fresh (background revalidation keeps data updated). We configure `refreshInterval: 60000` on most hooks so SWR automatically re-fetches every 60 seconds even without user interaction.

**Q4: Why do you use both SWR (REST polling) and Socket.IO (WebSocket)?**  
**A:** They serve different purposes. SWR handles **historical and aggregated data** that changes slowly — daily consumption totals, weekly charts, anomaly lists. For these, polling every 60 seconds is sufficient. Socket.IO handles **real-time instantaneous readings** — the live power reading, the current flow rate — which must update every 10 seconds to feel live. Maintaining a WebSocket connection for all REST data would be wasteful and complex. Polling SWR every second for live readings would hammer the backend with unnecessary HTTP requests. The combination is optimal: SWR for historical/aggregate data, Socket.IO for live streaming data.

**Q5: How does the mock API toggle work technically?**  
**A:** `process.env.NEXT_PUBLIC_USE_MOCK_API` is a Next.js public environment variable — the `NEXT_PUBLIC_` prefix causes Next.js to expose it to the browser bundle at build time. In `api.ts`, at module load time, `const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'` evaluates the flag once. All exported API functions check this constant and branch accordingly. Because the value is evaluated at module load time (and in Next.js, at build time for static pages), switching between mock and real requires restarting the dev server (`npm run dev`) with the updated `.env.local` file. During development (`npm run dev`), Next.js hot-reloads environment variables, so the switch is seamless.

**Q6: What is Tailwind CSS and how is it different from writing regular CSS?**  
**A:** Tailwind CSS is a utility-first CSS framework. Instead of writing custom CSS class names with associated style rules, you apply small, single-purpose utility classes directly in JSX: `className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-md"`. Each class maps to exactly one CSS property. This eliminates naming (`BEM`, `camelCase`, etc.), eliminates CSS file proliferation, makes responsive design declarative (`md:grid-cols-2`), makes dark mode declarative (`dark:bg-gray-900`), and eliminates dead CSS (Tailwind purges unused utility classes at build time, resulting in very small CSS bundles).

**Q7: How does Recharts work and how did you make the charts responsive?**  
**A:** Recharts is a composable charting library where charts are composed from React components. A basic bar chart is: `<ResponsiveContainer width="100%" height={300}><BarChart data={data}><CartesianGrid/><XAxis dataKey="date"/><YAxis/><Tooltip/><Bar dataKey="totalVolumeLiters" fill="#3b82f6"/></BarChart></ResponsiveContainer>`. `ResponsiveContainer` is key — it observes its parent container's width using a ResizeObserver and passes the actual pixel width to the chart, making it automatically responsive to the container size. Custom tooltips are built with `content={<CustomTooltip />}` prop.

**Q8: How do you implement the real-time power chart that streams new data points?**  
**A:** The PowerChart component receives `latestReading` from the `useRealTimeData` hook. Inside PowerChart, a `useState<{ time: string; power: number }[]>([])` holds the chart's data array. A `useEffect` watches for `latestReading` changes: when a new reading arrives, it appends `{ time: latestReading.timestamp, power: latestReading.electricity.power_w }` to the array, but slices it to keep only the last 30 points. This bounded array is passed directly to a Recharts `AreaChart`. Recharts re-renders the chart whenever the data prop changes.

**Q9: Explain the Socket.IO client singleton pattern you use.**  
**A:** Creating a new Socket.IO connection on every component mount would create multiple WebSocket connections to the server, wasting resources and causing duplicated event handlers. The singleton pattern ensures only one `Socket` object exists for the entire application. In `useSocket.ts`, the socket is stored in a module-level variable (`let socket: Socket | null = null`) outside any React component. The first call to `useSocket()` creates the connection and stores it. Subsequent calls (from any component, on any page) return the same existing socket instance. The cleanup function in `useEffect` does not disconnect the socket on unmount — only the application's root unmount (browser close/refresh) destroys it.

**Q10: How does your component handle the device offline state?**  
**A:** When the `device:offline` Socket.IO event fires, `useRealTimeData` sets `isDeviceOnline = false`. This boolean is passed as a prop down to components that care about it. The `DashboardHeader` renders a red "Device Offline" badge. All `MetricCard` components receive an `isStale` prop and apply `className={clsx('...', isStale && 'opacity-60')}`. A full-width warning banner is conditionally rendered using `{!isDeviceOnline && <OfflineBanner lastSeen={...} />}`. The charts continue to display their existing data array — the absence of new Socket.IO events simply means no new points are appended, which is the correct visual representation of no new data.

**Q11: What is the TypeScript `interface` and why did you define interfaces in a shared `types/index.ts` file?**  
**A:** A TypeScript `interface` defines the shape (property names and types) of an object. It exists only at compile time — it is completely erased from the JavaScript output. Centralizing all interfaces in `types/index.ts` means: (1) Every component, hook, and API function imports from the same source of truth. (2) When Member 2 changes an API response shape, Member 3 updates `types/index.ts` and TypeScript immediately highlights every component that is now passing the wrong data type. (3) There is no duplicated type definition that could drift out of sync.

**Q12: What is Next.js API route proxying and why did you configure it?**  
**A:** By default, a browser-side `fetch('http://localhost:3001/api/v1/...')` works fine during development but breaks in production or when backend is on a different host due to CORS. Instead, we configure `next.config.js` rewrites: any request to `/api/backend/*` is transparently forwarded by the Next.js server to `http://localhost:3001/api/v1/*`. The browser always talks to the Next.js server (same origin), so CORS is never an issue. In production, we would just change the `BACKEND_URL` environment variable to point to the deployed backend host.

**Q13: What is the difference between `useEffect` and `useMemo` and give an example of each from your project?**  
**A:** `useEffect` runs a side effect after render — it is used for things that must happen outside of the pure render cycle: subscribing to events, setting up timers, calling APIs. Example: in `useRealTimeData`, `useEffect` subscribes to Socket.IO events and returns a cleanup function that calls `socket.off(...)`. `useMemo` computes a memoized derived value — it recomputes only when its dependencies change, avoiding expensive recalculation on every render. Example: in the PowerChart, `useMemo(() => chartData.slice(-30), [chartData])` ensures the sliced array is only recomputed when `chartData` changes, not on every render caused by other state changes.

**Q14: How does Tailwind CSS achieve a small production CSS bundle?**  
**A:** Tailwind ships with thousands of utility classes, but in production it uses a "purge" (now called "content scanning") step. The `tailwind.config.ts` `content` array lists all files that contain class names (`.tsx`, `.ts`, `.js` files). At build time, Tailwind scans these files with a regular expression, finds every class name string that appears, and generates only the CSS for those classes. Any utility that is never referenced in your source code is excluded from the bundle. A typical Next.js production build with Tailwind produces a CSS file under 15 KB (gzipped).

**Q15: If a student asks you "why not use Redux for state management?", how would you answer?**  
**A:** Redux is designed for complex, shared, cross-component global state — applications with deep component trees where many components need to read from and write to the same state, and where actions need to be traceable and debuggable via a time-travel debugger. In this dashboard, real-time data is managed by `useRealTimeData` (a single hook at the page or app level), historical data is managed by SWR's cache, and component-local state (toggle states, selected time range) is handled by local `useState`. There is very little state that genuinely needs to be global. Adding Redux would introduce significant boilerplate (actions, reducers, selectors, providers) without providing meaningful benefit. For this project, a combination of SWR, Socket.IO hooks, and local `useState` is simpler, more readable, and equally correct.

---

## 7. File Ownership Matrix

This table is the canonical source of truth for which member owns each file. "Owns" means they are the primary author and the one responsible for keeping it updated and correct. Another member should not edit an owned file without discussing it first.

| File Path | Owner | Purpose | Other Members Who Touch It |
|-----------|-------|---------|---------------------------|
| `firmware/esp32/main.cpp` | Member 1 | Entry point: setup() and loop() | None |
| `firmware/esp32/config.h` | Member 1 | All constants, pins, credentials | Member 2 reads broker IP from here |
| `firmware/esp32/sensors.h` | Member 1 | Sensor function declarations | None |
| `firmware/esp32/sensors.cpp` | Member 1 | Flow + ADC + RMS implementations | None |
| `firmware/esp32/mqtt_client.h` | Member 1 | MQTT manager class declaration | None |
| `firmware/esp32/mqtt_client.cpp` | Member 1 | PubSubClient wrapper | None |
| `firmware/esp32/wifi_manager.h` | Member 1 | WiFi manager declaration | None |
| `firmware/esp32/wifi_manager.cpp` | Member 1 | WiFi connection and reconnect | None |
| `firmware/esp32/ntp_time.h` | Member 1 | NTP time sync declaration | None |
| `firmware/esp32/ntp_time.cpp` | Member 1 | configTime(), getISO8601Timestamp() | None |
| `firmware/esp32/platformio.ini` | Member 1 | PlatformIO build config | None |
| `firmware/esp32/README.md` | Member 1 | Hardware setup, wiring, calibration | None |
| `backend/src/server.ts` | Member 2 | HTTP server entry point | None |
| `backend/src/app.ts` | Member 2 | Express middleware and route registration | None |
| `backend/src/mqtt/subscriber.ts` | Member 2 | MQTT subscription and message dispatch | None |
| `backend/src/mqtt/mqttClient.ts` | Member 2 | Shared MQTT client instance | None |
| `backend/src/socket/socketServer.ts` | Member 2 | Socket.IO init and emit helpers | Member 3 reads event names from here |
| `backend/src/validation/payloadValidator.ts` | Member 2 | Zod schemas for MQTT payloads | None |
| `backend/src/services/dataInsertionService.ts` | Member 2 | DB row insertion | None |
| `backend/src/services/waterService.ts` | Member 2 | Water CRUD + analytics queries | None |
| `backend/src/services/electricityService.ts` | Member 2 | Electricity CRUD + analytics queries | None |
| `backend/src/services/deviceService.ts` | Member 2 | Device upsert and offline detection | None |
| `backend/src/analytics/waterAnalytics.ts` | Member 2 | Water analytics computations | None |
| `backend/src/analytics/electricityAnalytics.ts` | Member 2 | Electricity analytics computations | None |
| `backend/src/analytics/anomalyDetection.ts` | Member 2 | Rule-based anomaly detection engine | None |
| `backend/src/controllers/waterController.ts` | Member 2 | Express handlers: /water/* | None |
| `backend/src/controllers/electricityController.ts` | Member 2 | Express handlers: /electricity/* | None |
| `backend/src/controllers/deviceController.ts` | Member 2 | Express handlers: /device/* | None |
| `backend/src/controllers/anomalyController.ts` | Member 2 | Express handlers: /anomalies/* | None |
| `backend/src/routes/waterRoutes.ts` | Member 2 | Express Router for water | None |
| `backend/src/routes/electricityRoutes.ts` | Member 2 | Express Router for electricity | None |
| `backend/src/routes/deviceRoutes.ts` | Member 2 | Express Router for devices | None |
| `backend/src/routes/anomalyRoutes.ts` | Member 2 | Express Router for anomalies | None |
| `backend/src/lib/prisma.ts` | Member 2 | Singleton Prisma client | None |
| `backend/src/utils/logger.ts` | Member 2 | Winston logger config | None |
| `backend/prisma/schema.prisma` | Member 2 | Database schema definition | Member 3 reads model names for type alignment |
| `backend/scripts/mqtt-simulator.ts` | Member 2 | Fake MQTT publisher for dev | Member 1 can run this to test backend without hardware |
| `backend/package.json` | Member 2 | Backend npm config | None |
| `backend/tsconfig.json` | Member 2 | Backend TS compiler config | None |
| `backend/.env.example` | Member 2 | Shared env var template | Member 3 reads to know BACKEND_URL format |
| `docs/API_CONTRACT.md` | Member 2 | Full REST API documentation | Member 3 reads extensively; Member 1 reads for reference |
| `frontend/src/app/page.tsx` | Member 3 | Main dashboard page | None |
| `frontend/src/app/water/page.tsx` | Member 3 | Water monitoring page | None |
| `frontend/src/app/electricity/page.tsx` | Member 3 | Electricity monitoring page | None |
| `frontend/src/app/analytics/page.tsx` | Member 3 | Analytics page | None |
| `frontend/src/app/anomalies/page.tsx` | Member 3 | Anomalies page | None |
| `frontend/src/app/layout.tsx` | Member 3 | Root layout and navigation | None |
| `frontend/src/components/DashboardHeader.tsx` | Member 3 | Header component | None |
| `frontend/src/components/MetricCard.tsx` | Member 3 | Metric card component | None |
| `frontend/src/components/WaterFlowCard.tsx` | Member 3 | Water flow gauge component | None |
| `frontend/src/components/ElectricityCard.tsx` | Member 3 | Electricity readings card | None |
| `frontend/src/components/ConsumptionChart.tsx` | Member 3 | Daily water bar chart | None |
| `frontend/src/components/PowerChart.tsx` | Member 3 | Real-time power area chart | None |
| `frontend/src/components/AnomalyCard.tsx` | Member 3 | Anomaly display card | None |
| `frontend/src/components/AlertCard.tsx` | Member 3 | Dismissible alert notification | None |
| `frontend/src/components/DeviceStatus.tsx` | Member 3 | Device status panel | None |
| `frontend/src/components/TimeRangeSelector.tsx` | Member 3 | Time range button group | None |
| `frontend/src/components/Navigation.tsx` | Member 3 | Application navigation | None |
| `frontend/src/hooks/useSocket.ts` | Member 3 | Socket.IO singleton hook | None |
| `frontend/src/hooks/useRealTimeData.ts` | Member 3 | Real-time state via Socket.IO | None |
| `frontend/src/hooks/useWaterData.ts` | Member 3 | SWR water data fetching | None |
| `frontend/src/hooks/useElectricityData.ts` | Member 3 | SWR electricity data fetching | None |
| `frontend/src/hooks/useAnomalyData.ts` | Member 3 | SWR anomaly data fetching | None |
| `frontend/src/hooks/useDeviceStatus.ts` | Member 3 | SWR device status fetching | None |
| `frontend/src/lib/api.ts` | Member 3 | Mock/real API toggle utility | None |
| `frontend/src/lib/mockData.ts` | Member 3 | All mock data fixtures | None |
| `frontend/src/types/index.ts` | Member 3 | TypeScript type definitions | **All members reference this** |
| `frontend/package.json` | Member 3 | Frontend npm config | None |
| `frontend/next.config.js` | Member 3 | Next.js configuration | None |
| `frontend/.env.example` | Member 3 | Frontend env var template | All members read |
| `docs/TEAM_TASK_DISTRIBUTION.md` | All (shared) | This document | All members maintain |
| `docs/SYSTEM_ARCHITECTURE.md` | All (shared) | System architecture overview | All members read |
| `README.md` | All (shared) | Project root README | All members contribute |
| `.gitignore` | All (shared) | Files to exclude from Git | All members may update |

---

## 8. Integration Milestones

Integration happens in two phases. The following table defines exactly **what is needed, from whom, by when, and what the acceptance test is** for each integration event.

### Phase 1 — Individual Development (Weeks 1–4)

During this phase, all three members work independently. No integration testing is done. Each member's work is tested in isolation.

| Week | Member 1 Milestone | Member 2 Milestone | Member 3 Milestone |
|------|--------------------|--------------------|--------------------|
| Week 1 | Hardware components procured and identified | Node.js + TypeScript + Prisma project set up; PostgreSQL running | Next.js project initialized; Tailwind and Recharts confirmed working |
| Week 2 | Flow sensor circuit assembled and pulse counting confirmed via Serial | MQTT simulator publishing; subscriber receiving; DB rows inserting | Type definitions complete; mock data written; mock API toggle working |
| Week 3 | Voltage and current sensing circuits assembled (supervisor reviewed); RMS values appear on Serial | REST API endpoints for water and electricity operational; tested with curl | Dashboard and Water pages built; charts render with mock data |
| Week 4 | JSON payload assembled and published to local Mosquitto broker | Anomaly detection running; Socket.IO emitting events; API contract doc complete | All pages complete; Socket.IO mock hook working; responsive layout done |

### Phase 2 — Integration (Weeks 5–6)

#### Integration Event 1: Member 1 ↔ Member 2 (Backend-Hardware Integration)

**When:** Start of Week 5.

**Prerequisite from Member 1:** Firmware is fully working locally. MQTT messages are published correctly to Member 1's own local Mosquitto broker. JSON payload has been verified against the contract.

**Prerequisite from Member 2:** Backend MQTT subscriber is running and receiving simulator messages. All DB insertions are working. Member 2's Mosquitto broker is accessible on the LAN.

**What Member 2 provides to Member 1:** LAN IP address of Member 2's laptop (or a shared machine). Port number (1883). Confirmation that `allow_anonymous true` is set in `mosquitto.conf`.

**What Member 1 does:** Updates `MQTT_BROKER_IP` in `firmware/esp32/config.h` to Member 2's IP. Recompiles and flashes firmware. Powers on device.

**Acceptance test:** Member 2 runs `SELECT COUNT(*) FROM water_readings;` before and after turning on the ESP32 and confirms the count increments every 10 seconds. Member 2 also confirms anomaly rules are not falsely triggered by normal sensor readings.

**Point of contact if integration fails:** Check Serial Monitor for "MQTT Connected" message. If not connected, ping Member 2's IP from Member 1's machine. Check `mosquitto.log` on Member 2's machine for connection attempts.

---

#### Integration Event 2: Member 2 ↔ Member 3 (Frontend-Backend Integration)

**When:** Start of Week 5 (parallel to Event 1, or immediately after Member 2 confirms API is stable).

**Prerequisite from Member 2:** REST API is running on `http://localhost:3001`. All documented endpoints return data. CORS is configured to allow `http://localhost:3000`. Socket.IO is emitting `sensor:reading` events.

**Prerequisite from Member 3:** All pages are complete with mock data. `lib/api.ts` toggle is working.

**What Member 3 does:** Changes `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.local`. Restarts the Next.js dev server. Opens the dashboard in the browser.

**Acceptance test:** The Daily Water Consumption chart on the Dashboard page displays real data from the PostgreSQL database. The PowerChart updates with a new point every 10 seconds (driven by the MQTT simulator). The Anomaly count on the Anomalies page matches the actual count in the `anomalies` table.

**Point of contact if integration fails:** Check browser Network tab for failed fetch requests. Check CORS error messages in browser console. Check that Member 2's Express server is running. Confirm the `BACKEND_URL` in `.env.local` is correct.

---

#### Integration Event 3: Full End-to-End System Test

**When:** Week 6, Day 1.

**All three members are present (physically or on video call).**

**Test sequence:**
1. Member 2 starts Mosquitto broker and Node.js backend server.
2. Member 3 starts Next.js frontend with `USE_MOCK_API=false`.
3. Member 1 powers on the ESP32 device.
4. Observe: Within 30 seconds, Device Status panel on dashboard turns green "Online".
5. Observe: Flow rate MetricCard begins showing actual sensor readings.
6. Member 1 opens a water tap. Observe: Flow rate in the dashboard increases within 15 seconds.
7. Member 1 closes the tap. Observe: Flow rate drops back to near zero.
8. Member 1 turns on an electrical load. Observe: Power (W) reading increases.
9. Member 2 manually inserts an anomaly record into the DB for testing. Observe: AlertCard appears on Member 3's dashboard.
10. Member 1 powers off the ESP32. Observe: Within 90 seconds, Device Status turns red "Offline" and the offline banner appears.

**Acceptance of full integration:** All 10 test steps pass without any manual code changes during the test.

---

## 9. Communication Protocol Between Members

### 9.1 Daily Synchronization

The team must hold a **daily sync meeting** of 15 minutes maximum. The format is strict: each member answers only three questions: (1) What did I complete yesterday? (2) What will I complete today? (3) Is there any blocker that requires another member's help? If a blocker exists, it is escalated immediately — it is not allowed to persist past a 24-hour period without resolution.

Suggested timing: 15 minutes at the start of every lab/college session, or via voice call if not physically together.

### 9.2 Shared `.env.example` Contract

Every environment variable needed to run any part of the system must be documented in the corresponding `.env.example` file, committed to the Git repository. No member may use an undocumented environment variable in their code without first adding it to `.env.example`.

**`backend/.env.example`:**
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/water_electricity_monitor"
MQTT_BROKER_URL="mqtt://localhost:1883"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
ANOMALY_OFFLINE_TIMEOUT_SECONDS=60
```

**`frontend/.env.example`:**
```
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_USE_MOCK_SOCKET=true
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3001"
```

### 9.3 Shared Types File

`frontend/src/types/index.ts` is the canonical shared type definition file. It is owned by Member 3 but is reviewed by all members. If Member 2 changes a REST API response shape, Member 2 must:
1. Update `docs/API_CONTRACT.md`.
2. Notify Member 3 in the group chat immediately.
3. Member 3 updates `frontend/src/types/index.ts` and `frontend/src/lib/mockData.ts` accordingly.

If Member 1 changes the JSON payload schema, Member 1 must:
1. Update Section 3.2 of this document.
2. Notify Member 2 immediately (they must update their Zod schema).
3. Notify Member 3 immediately (they must update mock data and types).

### 9.4 Git Branch Strategy

All code lives in a single Git repository with the following branch structure:

```
main              ← production-ready, always deployable
dev               ← integration branch; all features merged here first
├── feat/m1-firmware        ← Member 1's firmware work
├── feat/m1-calibration     ← Member 1's calibration and docs
├── feat/m2-backend         ← Member 2's backend work
├── feat/m2-simulator       ← Member 2's simulator script
├── feat/m3-dashboard       ← Member 3's frontend work
└── feat/m3-realtime        ← Member 3's real-time hook work
```

**Rules:**
- Never commit directly to `main` or `dev`.
- Create a Pull Request (PR) to merge into `dev`. The other two members must review and approve.
- After integration testing passes, `dev` is merged into `main`.
- Commit messages must follow the format: `[M1] Add flow sensor ISR implementation` / `[M2] Add anomaly detection service` / `[M3] Add PowerChart component`.

### 9.5 Agreed JSON Contract — Zero-Change Policy

The JSON payload format documented in Section 3.2 and 3.3 is **frozen** from Week 2 onwards. No field names may be added, removed, or renamed without a unanimous team decision and an update to this document. This is because:
- Member 1 hardcodes the field names in C++ string constants (`config.h`).
- Member 2 hardcodes the field names in Zod schema property names.
- Member 3 hardcodes the field names in TypeScript interface definitions and mock data.

A unilateral change to any field name breaks two other members' code simultaneously.

### 9.6 Escalation and Issue Tracking

Use the team's shared Git repository's **Issues** tab (GitHub/GitLab) to track bugs, integration problems, and open questions. Every issue must be assigned to a specific member. Issues are labelled by category: `hardware`, `backend`, `frontend`, `integration`, `documentation`. An issue is closed only when the fix has been tested, not when the code is written.

### 9.7 Viva Preparation Protocol

In the two weeks before the college viva, each member must:
1. Read and understand (not just memorize) the viva questions for **all three members** in this document, not just their own section. The examiner may ask any member any question.
2. Be able to explain what the other members' components do at a high level.
3. Prepare a live demo script: Member 1 holds the device, Member 2 shows the database and API, Member 3 shows the dashboard — all running simultaneously and interacting in real time.
4. Be ready to explain the full data flow: "A water pulse on the ESP32 GPIO pin → ISR increments counter → JSON assembled → MQTT published → Node.js subscriber receives → Zod validates → Prisma inserts to PostgreSQL → Socket.IO emits → React state updates → Recharts re-renders."

---

*End of TEAM_TASK_DISTRIBUTION.md*  
*All three members must sign off on this document (add name and date below) before beginning implementation.*

| Member | Name | Date Acknowledged |
|--------|------|------------------|
| Member 1 — Hardware & Firmware | | |
| Member 2 — Backend & Database | | |
| Member 3 — Frontend & Dashboard | | |
