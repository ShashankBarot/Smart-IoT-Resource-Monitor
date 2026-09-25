# TESTING CHECKLIST
## Smart IoT-Based Water and Electricity Consumption Monitoring System
### College Project-Based Learning (PBL) — Quality Assurance Document

---

> **Document Version:** 1.0  
> **Last Updated:** 2026-09-22  
> **Project Phase:** Full-Stack Integration & Pre-Demo Verification  
> **Authors:** Member 1 (Hardware/Firmware), Member 2 (Backend/DB), Member 3 (Frontend/Dashboard)

> [!NOTE]
> Current automated checks are run from `backend/` with `npm run build`, `npm test`, and `npx prisma validate`. The frontend uses `npm run lint` and `npm run build`; the remaining checklist items are manual hardware and end-to-end checks.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Member 1 — Hardware + ESP32 + Firmware](#2-member-1-testing-checklist--hardware--esp32--firmware)
3. [Member 2 — Backend + Database + Analytics](#3-member-2-testing-checklist--backend--database--analytics)
4. [Member 3 — Frontend + Dashboard](#4-member-3-testing-checklist--frontend--dashboard)
5. [End-to-End Integration Test Scenarios](#5-end-to-end-integration-test-scenarios)
6. [Pre-Demo Verification Checklist](#6-pre-demo-verification-checklist)

---

## 1. Overview

### 1.1 Why Testing Matters

In a real-time IoT monitoring system, failures at any layer — sensor, firmware, network, backend, database, or frontend — cascade silently into incorrect dashboards and missed anomalies. A viva examiner or industry evaluator will probe every assumption. Systematic testing before integration saves hours of debugging during the demonstration and proves engineering rigor.

This checklist exists for three reasons:

1. **Confidence before demo day.** Every checkbox is a claim you can stand behind in a viva.
2. **Isolation of faults.** By testing each layer independently first, any integration failure can be localised to the exact boundary between two layers.
3. **Evidence of process.** A filled-in checklist — even with some items marked as known limitations — demonstrates that the team followed a structured software engineering process, not "it worked on my machine."

### 1.2 How to Use This Checklist

- **Work through phases in order.** Each phase is a prerequisite for the next. Do not skip to Phase 3 Wi-Fi tests if Phase 2 sensor tests are failing.
- **Mark each item** using one of these states:

  | Symbol | Meaning |
  |--------|---------|
  | `- [ ]` | Not yet tested |
  | `- [x]` | Passed |
  | `- [~]` | Partial pass / known limitation |
  | `- [!]` | Failed — action required |

- **Record evidence.** For every test, note the Serial Monitor output, terminal log line, or screenshot filename beside the checkbox as a brief comment. Example: `- [x] MQTT connected ← log line: "MQTT connected to 192.168.1.10:1883"`.
- **Each member owns their section.** Do not sign off on another member's tests unless you have physically observed the test pass.
- **Joint tests** (Section 5) must be executed together with all three members present.

### 1.3 What Constitutes a Passed Test

A test is considered **passed** if and only if **all** of the following are true:

1. **The expected output matches the actual output** — exactly, not approximately. Numerical readings may vary within ±5% tolerance unless otherwise stated.
2. **The pass is reproducible.** Run the test at least twice. If it passes once and fails once, it is a flaky test — mark `[~]` and investigate.
3. **No suppressed errors.** If an error is logged but the system appears to work, this is a conditional pass at best. The error must be resolved or explicitly documented as a known limitation.
4. **Side effects are clean.** For example, a database insertion test must not leave duplicate or corrupt records that break subsequent tests.
5. **The tester has not modified the system** to force the test to pass (e.g., hardcoding a sensor value instead of reading real hardware).

> [!IMPORTANT]
> Safety-critical items marked ⚠️ **SAFETY** must be verified by a qualified adult supervisor before any mains-voltage components are powered. A failed safety test is a project stop — no further hardware testing proceeds until the safety item is resolved.

---

## 2. Member 1 Testing Checklist — Hardware + ESP32 + Firmware

**Owner:** Member 1  
**Tools Required:** Arduino IDE / PlatformIO, Serial Monitor (115200 baud), multimeter, regulated 5 V DC supply, small water pump or syringe for flow testing, clamp meter (optional).

---

### Phase 1: Basic Hardware Verification

> [!NOTE]
> Complete this phase with power OFF. Verify wiring visually and with a multimeter in continuity mode before applying any voltage. The ZMPT101B and mains side of the electricity circuit must only be handled by a qualified adult supervisor.

- [ ] **Power supply voltage verified** — Measure Vcc at the ESP32's 3.3 V pin with a multimeter. Expected: 3.28–3.35 V. Record reading: `_______ V`
- [ ] **Water pump powers on correctly** — Connect pump to rated voltage (typically 5 V DC). Pump spins without grinding noise, vibration is normal.
- [ ] **YF-S201 / YF-S401 sensor plumbing is correct** — Flow direction arrow on sensor body matches actual water flow direction in the circuit. Arrow must not be reversed.
- [ ] **YF-S201 / YF-S401 signal wire connected to correct GPIO** — Signal (yellow wire) connected to GPIO pin defined as `FLOW_SENSOR_PIN` in firmware. Pull-up resistor (4.7 kΩ or internal INPUT_PULLUP) present.
- [ ] ⚠️ **SAFETY — ZMPT101B mains isolation verified** — Transformer primary side is not accessible to bare hands. Mains wiring is insulated, no exposed conductors on breadboard. Verified by qualified supervisor: `Name: _________________ Date: _________________`
- [ ] ⚠️ **SAFETY — No exposed mains voltage on breadboard** — 230 V AC side of ZMPT101B is routed away from all other components. Tape/heatshrink used on all mains terminals.
- [ ] **ZMPT101B output pin connected to ADC-capable ESP32 pin** — Connected to GPIO 34 or 35 (input-only ADC pins) or the pin defined as `VOLTAGE_SENSOR_PIN`. Confirm pin is ADC1 (ADC2 conflicts with Wi-Fi on ESP32).
- [ ] **ACS712 installed correctly in series with load** — Current sensor is in the live (phase) wire of the load circuit, not the neutral. VCC = 5 V, GND = GND, OUT connected to `CURRENT_SENSOR_PIN`.
- [ ] **ACS712 VCC confirmed at 5 V** — ACS712 requires 5 V, not 3.3 V. Measure at VCC pin: `_______ V`. Note: ACS712 OUT is referenced to VCC/2 ≈ 2.5 V; verify ESP32 ADC pin is 3.3 V tolerant or a voltage divider is used.
- [ ] **All GPIO connections match the pin assignment table** — Cross-check every wire against the pin mapping in `docs/CIRCUIT_DIAGRAM.md`. Use continuity mode on multimeter to verify each connection end-to-end.

  | Signal | Defined Pin | Measured Continuity |
  |--------|-------------|---------------------|
  | Flow sensor signal | GPIO `___` | ☐ |
  | ZMPT101B out | GPIO `___` | ☐ |
  | ACS712 out | GPIO `___` | ☐ |
  | Built-in LED | GPIO 2 | ☐ |

- [ ] **Decoupling capacitors present** — 100 nF ceramic capacitors placed near VCC pins of each sensor to reduce ADC noise.
- [ ] **Ground common to all components** — ESP32 GND, sensor GNDs, and power supply GND all share a common ground node. Verify with continuity test.
- [ ] **USB cable is data-capable** — Firmware can be uploaded via the USB cable used (not a charge-only cable). Test by checking if ESP32 appears as a COM port in Device Manager.

---

### Phase 2: Sensor Tests (Without Wi-Fi)

> [!NOTE]
> Comment out or disable all Wi-Fi and MQTT code for this phase. Set `WIFI_ENABLED false` or equivalent flag. This isolates sensor logic from network dependencies. Use `Serial.begin(115200)` and Serial Monitor for all observations.

#### 2A — Water Flow Sensor Tests

- [ ] **Flow sensor interrupt attaches without error** — `attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING)` registers with no compile or runtime error.
- [ ] **Pulse count increments on water flow** — With no water flowing, pulse count = 0. Blow gently through the flow sensor (or push water with a syringe). Serial Monitor shows pulse count incrementing. Record: `Pulses counted in 5 seconds of gentle flow: _______`
- [ ] **YF-S201 calibration factor is correct** — YF-S201 datasheet: 7.5 pulses per second per litre per minute. At exactly 1 L/min, sensor produces ~7.5 Hz. Verify firmware formula:
  ```
  flowRateLpm = (pulseCount / 7.5) * (1000 / sampleIntervalMs) * 60
  ```
  Alternative: `flowRateLpm = (pulseCount / calibrationFactor)` where `calibrationFactor = 7.5`.
- [ ] **Flow rate calculates to a reasonable value** — At measured flow from a calibrated container, firmware-reported LPM matches manual measurement within ±10%. Record:
  - Manual: `_______ L/min`
  - Firmware reported: `_______ L/min`
  - Error: `_______ %`
- [ ] **Total litres accumulates correctly** — Run water through sensor for exactly 60 seconds at a known flow rate. `totalLitres` reported by firmware = `flowRateLpm × 1 min` within ±10%. Record:
  - Expected: `_______ L`
  - Reported: `_______ L`
- [ ] **Pulse counter resets between intervals** — After each calculation interval, `pulseCount` is reset to 0. Confirmed by Serial Monitor showing fresh count each interval.
- [ ] **Zero flow correctly reported** — When no water flows for a full interval, `flowRateLpm = 0.00` and `totalLitres` does not change.

#### 2B — Electricity Sensor Tests (⚠️ Supervisor Required for Mains)

- [ ] ⚠️ **ZMPT101B reads non-zero value with mains connected** — With mains voltage applied (supervisor present), `voltage` reading is non-zero. Serial Monitor output: `_______ V` (calibrated expected: 220–240 V for Indian mains).
- [ ] **ZMPT101B reads near 0 V with mains disconnected** — With nothing connected to primary, raw ADC reads near midpoint (≈2048 for 12-bit). After RMS calculation and offset subtraction, firmware reports `~0 V` or a small noise value (< 5 V).
- [ ] **ZMPT101B calibration constant is applied** — Firmware multiplies raw RMS by a calibration factor to yield voltage in Volts. Calibration factor is documented in code comments with the method used (e.g., measured with multimeter and adjusted).
- [ ] **ACS712 reads ≈ 0.00 A with no load** — With ACS712 VCC = 5 V and no load in circuit, output ≈ 2.5 V (midpoint). Firmware should report: `current ≈ 0.00 A`. Acceptable range: `-0.1 A` to `+0.1 A` (noise). Record: `_______ A`
- [ ] **ACS712 reads correctly with a safe test load** — ⚠️ Use a low-power resistive load (e.g., a 60 W incandescent lamp or a resistor bank) at safe low voltage if possible, or mains load with supervisor. Measure actual current with clamp meter. Firmware-reported current vs clamp meter:
  - Clamp meter: `_______ A`
  - Firmware reported: `_______ A`
  - Error: `_______ %` (acceptable: ≤ 10%)
- [ ] **ACS712 sensitivity constant matches sensor variant** — ACS712-05B: 185 mV/A. ACS712-20A: 100 mV/A. ACS712-30A: 66 mV/A. Confirm the correct value is used in firmware: `Sensitivity used: _______ mV/A`
- [ ] **Power calculation is correct** — With known V and I, verify `P = V × I × powerFactor`. For a purely resistive load, power factor = 1.0. Check formula in firmware. Record:
  - V = `_______ V`, I = `_______ A`, Expected P = `_______ W`
  - Firmware reported P: `_______ W`
- [ ] **Energy accumulation is correct** — Over a 5-minute test period with a known steady load, energy should accumulate as `E = P × t`. Formula: `energyKwh += (power / 1000.0) * (intervalMs / 3600000.0)`. Verify the accumulation is proportional to time elapsed.
- [ ] **Energy does not reset on interval** — Unlike flow rate, energy is cumulative. Confirm `energyKwh` is never reset to 0 within a session (only on ESP32 reboot or explicit reset command).

#### 2C — Combined Serial Output Format Test

- [ ] **Serial output is readable and structured** — Each print cycle outputs a block like:
  ```
  === Reading ===
  Flow Rate: 2.31 L/min
  Total Litres: 0.192 L
  Voltage: 228.4 V
  Current: 0.83 A
  Power: 189.6 W
  Energy: 0.000016 kWh
  ===============
  ```
- [ ] **Output interval is correct** — Readings are printed at the configured interval (e.g., every 2000 ms). Verify with Serial Monitor timestamp.
- [ ] **No garbage/corrupted characters in Serial output** — Baud rate in Serial Monitor matches `Serial.begin()` in firmware (115200). No `????` or random characters.

---

### Phase 3: Wi-Fi Tests

> [!NOTE]
> Re-enable Wi-Fi code. Keep MQTT disabled. Test Wi-Fi connectivity independently.

- [ ] **`WiFi.begin(ssid, password)` called with correct credentials** — SSID and password match the router/hotspot being used for the demo. These are stored in `config.h` or `secrets.h`, not hardcoded in main source file.
- [ ] **ESP32 connects to Wi-Fi SSID successfully** — Serial Monitor shows connection progress dots followed by `WiFi connected`.
- [ ] **Serial Monitor shows "WiFi connected"** — Exact (or near-exact) log message confirmed. Record exact message: `"_______________________"`
- [ ] **IP address is assigned and printed** — `WiFi.localIP()` returns a valid LAN IP (e.g., `192.168.1.x`). Not `0.0.0.0`. Record: `_______._______._______._______`
- [ ] **ESP32 is reachable from Member 2's machine** — From Member 2's computer on the same network, run `ping <ESP32 IP>`. Expected: 4 replies with TTL~128, latency < 50 ms.
- [ ] **Wi-Fi reconnect test** — Disable the router/hotspot (or change the password temporarily). Observe ESP32 drops connection. Re-enable router. Confirm ESP32 reconnects automatically without a manual reboot. Time to reconnect: `_______ seconds` (expected: < 30 s).
- [ ] **Wi-Fi does not block sensor reading loop** — Sensor readings continue to be calculated and printed to Serial even while Wi-Fi is reconnecting (non-blocking reconnect logic).

---

### Phase 4: MQTT Tests

> [!NOTE]
> Ensure Member 2's Mosquitto broker is running before starting this phase. Confirm broker IP with Member 2 before testing.

- [ ] **MQTT broker IP and port are correctly configured in firmware** — `mqtt_server` = `_______._______._______._______`, `mqtt_port` = `1883`. Confirm these match the broker machine's LAN IP.
- [ ] **MQTT client connects to broker** — Serial Monitor shows MQTT connection attempt and success message.
- [ ] **Serial Monitor shows "MQTT connected"** — Exact log message confirmed: `"_______________________"`
- [ ] **MQTT client ID is unique** — Client ID (e.g., `"esp32-water-monitor"`) does not collide with other devices. If multiple ESP32s are used, each has a distinct client ID.
- [ ] **Message published to `resource/readings`** — `client.publish("resource/readings", payload)` called each interval. Serial Monitor confirms publish: e.g., `"Published to resource/readings"`.
- [ ] **Member 2 confirms message received via subscriber** — Member 2 runs:
  ```bash
  mosquitto_sub -h <broker-ip> -t resource/readings
  ```
  And sees the JSON payload in the terminal. Member 2 signature: `_______________________`
- [ ] **Published JSON format is valid** — Copy a sample payload and paste into [jsonlint.com](https://jsonlint.com). Result: `Valid JSON`. Paste sample payload here:
  ```json
  
  ```
- [ ] **All required fields present in payload** — Verify the JSON contains every field:
  - [ ] `deviceId` (string, e.g., `"esp32-01"`)
  - [ ] `timestamp` (string, ISO 8601)
  - [ ] `water.flowRateLpm` (number)
  - [ ] `water.totalLitres` (number)
  - [ ] `electricity.voltage` (number)
  - [ ] `electricity.current` (number)
  - [ ] `electricity.power` (number)
  - [ ] `electricity.energyKwh` (number)
- [ ] **Timestamp is ISO 8601 format with Z suffix** — Example: `"2026-09-22T14:23:11Z"`. Verify via NTP sync or manual construction. `Z` indicates UTC. If using `configTime()` with NTP, confirm NTP server is reachable.
- [ ] **NTP time synchronisation working** — `getLocalTime(&timeInfo)` returns true. Printed time is within 5 minutes of actual UTC time. Record: `NTP-reported UTC time: _______________________`
- [ ] **MQTT reconnect test** — Stop the Mosquitto broker on Member 2's machine. Observe ESP32 logs a reconnect attempt. Restart Mosquitto. Confirm ESP32 reconnects within 30 seconds and resumes publishing without manual reboot.
- [ ] **`resource/status` heartbeat published every 30 seconds** — A separate topic `resource/status` receives a heartbeat payload (e.g., `{"deviceId":"esp32-01","status":"online","uptime":120}`) every 30 seconds. Verify with `mosquitto_sub -t resource/status`.
- [ ] **Publish interval is correct** — MQTT messages are published at the configured interval (e.g., every 5 seconds). Verify by counting messages over 60 seconds: expected 12 messages at 5 s interval. Observed: `_______ messages`.

---

### Phase 5: Integration Tests (Hardware → Full Stack)

> [!NOTE]
> This phase requires Member 2's backend and Member 3's frontend to both be running. Schedule a joint integration session.

- [ ] **Real water flow shown on dashboard** — While water flows through YF-S201, Member 3's dashboard `WaterFlowCard` updates with a non-zero `flowRateLpm` value within 5–10 seconds.
- [ ] **Real electricity reading shown on dashboard** — With a load connected to ACS712, dashboard `ElectricityCard` shows non-zero voltage, current, and power values.
- [ ] **`totalLitres` increases on dashboard** — Run water for 2 minutes. Dashboard `totalLitres` value increases monotonically.
- [ ] **`energyKwh` increases on dashboard** — With a steady load, `energyKwh` increases monotonically on dashboard.
- [ ] **Anomaly triggered by sustained water flow** — Run water continuously for the anomaly detection threshold duration (configured in backend). Member 3's dashboard shows an anomaly card for water. Record: `Threshold configured: _______ minutes`.
- [ ] **Anomaly triggered by high power reading** — Simulate high power by modifying firmware's calibration factor temporarily to output 5000 W (or connect a large load if safe). Dashboard shows electricity anomaly card.
- [ ] **ESP32 reconnect reflected on dashboard** — Power off ESP32 for > offline timeout. Dashboard shows device as `OFFLINE`. Power ESP32 back on. Dashboard returns to `ONLINE`.

---

## 3. Member 2 Testing Checklist — Backend + Database + Analytics

**Owner:** Member 2  
**Tools Required:** Node.js ≥ 18, PostgreSQL 14+, Prisma CLI, Mosquitto broker, Postman or `curl`, `npx ts-node`, VS Code terminal.

---

### Phase 1: Environment Setup Tests

- [ ] **PostgreSQL service is running** — Run: `pg_isready -h localhost -p 5432`. Expected output: `localhost:5432 - accepting connections`. Or check Windows Services / `sudo systemctl status postgresql`.
- [ ] **`smart_monitor` database created** — Run: `psql -U postgres -c "\l"`. Database `smart_monitor` appears in list.
- [ ] **`.env` file is present and correctly configured** — `DATABASE_URL`, `MQTT_BROKER_URL`, `PORT`, `CORS_ORIGIN` are all set. No placeholder values remain (e.g., `<your-password>`).
- [ ] **`npm install` completes without errors** — No `ERESOLVE` or peer dependency errors. `node_modules/` folder created.
- [ ] **`npx prisma migrate dev` runs without error** — All migrations applied. Output ends with: `Your database is now in sync with your schema.`
- [ ] **`npx prisma generate` completes** — Prisma client generated. No type errors.
- [ ] **`npx prisma studio` opens and shows all tables** — Browser opens at `http://localhost:5555`. Tables visible: `Device`, `WaterReading`, `ElectricityReading`, `Anomaly`. Each table can be browsed.
- [ ] **Mosquitto broker starts on port 1883** — Run: `netstat -an | findstr 1883` (Windows) or `ss -tlnp | grep 1883` (Linux). Port 1883 shown as `LISTENING`.
- [ ] **Mosquitto `mosquitto.conf` allows anonymous connections** — `allow_anonymous true` set in config (for local dev). Or MQTT authentication credentials are configured and used in both firmware and backend.
- [ ] **Backend starts: `npm run dev` — no errors** — Terminal shows server started message, no `TypeError`, no `Cannot find module`, no uncaught exception.
- [ ] **Backend PORT is correct** — Server listens on configured port (default `3001`). Check terminal for: `Server running on port 3001` or similar.
- [ ] **`GET http://localhost:3001/api/health` returns 200** — Run:
  ```bash
  curl -s http://localhost:3001/api/health
  ```
  Expected response: `{"status":"ok","timestamp":"...","uptime":...}` with HTTP 200.

---

### Phase 2: MQTT Simulator Tests

> [!TIP]
> Use the simulator for all backend tests before real ESP32 hardware is available. This decouples Member 2's testing from Member 1's hardware readiness.

- [ ] **`npx ts-node scripts/mqtt-simulator.ts` runs without error** — No TypeScript compilation errors. Simulator connects to broker and begins publishing.
- [ ] **Simulator publishes to `resource/readings` every 5 seconds** — Terminal output shows a publish log line every 5 seconds.
- [ ] **Verify with `mosquitto_sub`** — In a separate terminal, run:
  ```bash
  mosquitto_sub -h localhost -t resource/#
  ```
  Messages appear every 5 seconds on `resource/readings` and every 30 seconds on `resource/status`.
- [ ] **Simulator JSON includes all required fields** — Verify the simulator payload (copy from terminal) matches the firmware's schema: `deviceId`, `timestamp`, `water.*`, `electricity.*` all present and correctly typed.
- [ ] **Scenario: Normal operation simulated** — Simulator's "normal" scenario outputs plausible readings: `flowRateLpm` 0–5, `voltage` 210–240, `current` 0–5, `power` 0–1200.
- [ ] **Scenario: Water anomaly simulated** — Simulator's "water anomaly" scenario outputs `flowRateLpm > anomaly threshold` (e.g., 15 L/min for sustained period).
- [ ] **Scenario: Electricity anomaly simulated** — Simulator's "electricity anomaly" scenario outputs `power > 4500 W` or configured threshold.
- [ ] **Scenario: Offline simulated** — Simulator's "offline" scenario stops publishing for > configured offline timeout (e.g., 60 seconds). Device status should transition to offline.
- [ ] **All 4 scenarios can be cycled** — Simulator can switch between scenarios (via command-line argument, environment variable, or interactive prompt) without restarting the backend.

---

### Phase 3: MQTT Subscriber Tests

- [ ] **Backend receives MQTT messages** — With simulator running, backend console shows a log line for each received message, e.g.:
  ```
  [MQTT] Received message on resource/readings
  ```
- [ ] **Message parsing succeeds** — No `JSON.parse` errors in backend log for valid simulator payloads.
- [ ] **Invalid JSON payload is rejected gracefully** — Publish a deliberately malformed payload:
  ```bash
  mosquitto_pub -h localhost -t resource/readings -m "NOT JSON {"
  ```
  Backend catches the parse error, logs it (e.g., `[ERROR] Invalid JSON received`), and does **not** crash. Server continues running. Verify HTTP health endpoint still returns 200.
- [ ] **Missing field in payload is caught by validator** — Publish a valid JSON object missing a required field (e.g., `electricity.voltage`):
  ```bash
  mosquitto_pub -h localhost -t resource/readings -m '{"deviceId":"esp32-01","timestamp":"2026-09-22T14:00:00Z","water":{"flowRateLpm":1.5,"totalLitres":0.5}}'
  ```
  Backend logs a validation warning, skips storage or stores partial data per schema constraints. Does not crash.
- [ ] **Valid payload is accepted and logged** — Publish a complete valid payload manually. Backend logs successful receipt and proceeds to database insertion.
- [ ] **`resource/status` heartbeat processed** — Backend receives `resource/status` messages and updates `Device.lastSeenAt` and `Device.status`.
- [ ] **Subscription to `resource/#` wildcard works** — Backend subscribes with wildcard and receives both `resource/readings` and `resource/status` topics.

---

### Phase 4: Database Insertion Tests

> [!NOTE]
> Use Prisma Studio (`npx prisma studio`) at `http://localhost:5555` to visually verify each insertion after running the simulator for 30 seconds.

- [ ] **`WaterReading` record created for each MQTT message** — After 5 simulator messages (25 seconds at 5 s interval), Prisma Studio shows exactly 5 new `WaterReading` rows. Columns: `id`, `deviceId`, `flowRateLpm`, `totalLitres`, `timestamp`, `createdAt`.
- [ ] **`ElectricityReading` record created for each MQTT message** — Similarly, 5 new `ElectricityReading` rows. Columns: `id`, `deviceId`, `voltage`, `current`, `power`, `energyKwh`, `powerFactor`, `timestamp`, `createdAt`.
- [ ] **`Device` record created on first message** — On first message from a new `deviceId`, a `Device` row is created with `status: 'online'`, `lastSeenAt: <now>`. Verify in Prisma Studio.
- [ ] **`Device` record is not duplicated** — Sending 10 messages from the same `deviceId` results in exactly 1 `Device` row (upsert logic). Verify count in Prisma Studio.
- [ ] **`Device.lastSeenAt` updates with each message** — After each MQTT message, `Device.lastSeenAt` timestamp advances. Verify by refreshing Prisma Studio between messages.
- [ ] **`Device.status` is `'online'` on message receipt** — After sending a message, `Device.status` column = `'online'`. Verify in Prisma Studio.
- [ ] **Data types stored correctly** — `flowRateLpm`, `voltage`, `current`, `power`, `energyKwh` are stored as numeric/float, not strings. Verify column types in Prisma Studio.
- [ ] **Timestamps stored in UTC** — `timestamp` column in database stores UTC time. Cross-check with the `Z`-suffixed timestamp from the payload.
- [ ] **No duplicate `WaterReading` rows** — Each MQTT publish produces exactly one `WaterReading` row. No duplicates from retry logic. Check with:
  ```sql
  SELECT timestamp, COUNT(*) FROM "WaterReading" GROUP BY timestamp HAVING COUNT(*) > 1;
  ```
  Expected: 0 rows returned.
- [ ] **Database transaction integrity** — If `WaterReading` insertion succeeds but `ElectricityReading` insertion fails (simulate by temporarily renaming the table), the transaction rolls back. No orphaned `WaterReading` without corresponding `ElectricityReading` for the same message (if implemented as a transaction).

---

### Phase 5: REST API Tests

> [!TIP]
> Use Postman or `curl` for all API tests. Import the base URL `http://localhost:3001` as a Postman environment variable for efficiency.

#### Health & Device Endpoints

- [ ] **`GET /api/health` → 200** — Response body: `{"status":"ok","timestamp":"...","uptime":<seconds>}`. HTTP status: 200.
- [ ] **`GET /api/devices` → 200, array** — Response: JSON array. If simulator has run, contains at least one device object with `id`, `deviceId`, `status`, `lastSeenAt`.
- [ ] **`GET /api/devices/esp32-01` → 200, device object** — Response: single device object for `esp32-01`. Contains `deviceId: "esp32-01"`, `status`, `lastSeenAt`.
- [ ] **`GET /api/devices/nonexistent-device` → 404** — Request for a `deviceId` that does not exist returns HTTP 404 with error body: `{"error":"Device not found"}` or similar.

#### Water Endpoints

- [ ] **`GET /api/water/current` → 200, reading object** — Returns the most recent `WaterReading` from the database. Contains `flowRateLpm`, `totalLitres`, `timestamp`.
- [ ] **`GET /api/water/today` → 200, summary with `totalLitres`** — Returns a summary of today's water consumption. Contains `totalLitres` (sum or latest value for today), `readingCount`.
- [ ] **`GET /api/water/history?from=2026-09-22T00:00:00Z&to=2026-09-22T23:59:59Z` → 200, array** — Returns an array of `WaterReading` objects within the date range. Array is not empty if simulator has run today.
- [ ] **`GET /api/water/history` with no date params → uses default range** — API uses a sensible default (e.g., last 24 hours) and returns 200 without error.
- [ ] **`GET /api/water/summary?days=7` → 200, 7-element array** — Returns daily summary for the last 7 days. Array length = 7. Each element has `date`, `totalLitres`, `avgFlowRate`.
- [ ] **`GET /api/water/summary?days=1` → 200, 1-element array** — Edge case: single day summary.

#### Electricity Endpoints

- [ ] **`GET /api/electricity/current` → 200** — Returns most recent `ElectricityReading`. Contains `voltage`, `current`, `power`, `energyKwh`.
- [ ] **`GET /api/electricity/today` → 200** — Returns today's electricity summary. Contains `totalEnergyKwh`, `avgPower`, `peakPower`.
- [ ] **`GET /api/electricity/history?from=...&to=...` → 200, array** — Returns filtered history. Array is non-empty.
- [ ] **`GET /api/electricity/summary?days=7` → 200, 7-element array** — Returns daily electricity summary for the last 7 days.

#### Anomaly Endpoints

- [ ] **`GET /api/anomalies` → 200** — Returns HTTP 200 with an array (even if empty when no anomalies detected yet). Response body: `[]` or array of anomaly objects.
- [ ] **`GET /api/anomalies?resourceType=water` → 200, filtered** — Returns only water anomalies. All items in array have `resourceType: "water"`.
- [ ] **`GET /api/anomalies?resourceType=electricity` → 200, filtered** — Returns only electricity anomalies.
- [ ] **`GET /api/anomalies?resourceType=invalid` → 400** — Invalid `resourceType` returns HTTP 400 with a descriptive error message.
- [ ] **`GET /api/anomalies?severity=HIGH` → 200, filtered** — Returns only anomalies with `severity: "HIGH"`.
- [ ] **`GET /api/water/history?from=invalid-date` → 400** — Invalid date string in query param returns 400 with clear message: e.g., `{"error":"Invalid date format for 'from' parameter"}`.
- [ ] **All API responses include `Content-Type: application/json`** — Verify in Postman response headers.
- [ ] **All API responses have correct CORS headers** — `Access-Control-Allow-Origin` header present for the frontend origin (e.g., `http://localhost:3000`).

---

### Phase 6: Anomaly Detection Tests

- [ ] **High power anomaly detection — threshold configuration verified** — Backend configuration shows `electricity.powerThresholdW` set to a documented value (e.g., `4500`). Confirm in config file or environment variable.
- [ ] **Send `power = 5000 W` via simulator → anomaly record created** — Set simulator to electricity anomaly scenario. After backend processes the message, query:
  ```bash
  curl http://localhost:3001/api/anomalies?resourceType=electricity
  ```
  Response array contains at least 1 anomaly with `resourceType: "electricity"`.
- [ ] **Sustained water flow anomaly → water anomaly created** — Run simulator water anomaly scenario for longer than the configured duration threshold. `GET /api/anomalies?resourceType=water` returns anomaly record.
- [ ] **Anomaly has correct `severity`** — For power > 4500 W, `severity` = `"HIGH"`. For borderline cases, `severity` = `"MEDIUM"`. Verify severity levels match the documented thresholds.
- [ ] **Anomaly has correct `resourceType`** — Water anomalies: `resourceType = "water"`. Electricity anomalies: `resourceType = "electricity"`.
- [ ] **Anomaly has a human-readable `message`** — `message` field is not null or empty. Example: `"High power consumption detected: 5000W exceeds threshold of 4500W"`. Verify message is informative.
- [ ] **Anomaly has `detectedAt` timestamp** — `detectedAt` field is a valid UTC ISO timestamp close to the time of the test.
- [ ] **Anomaly has `deviceId` linking to correct device** — `deviceId` in anomaly record matches the `deviceId` of the device that triggered it (`"esp32-01"`).
- [ ] **Duplicate anomaly suppression (cooldown)** — Send 10 consecutive high-power readings. Only 1 anomaly record should be created (within the cooldown window, e.g., 5 minutes). Verify with `GET /api/anomalies` — count does not grow unboundedly. Record cooldown window: `_______ minutes`.
- [ ] **After cooldown, new anomaly can be created** — Wait for cooldown period to expire (or temporarily set cooldown to 0 for test). Send another high-power reading. A new anomaly record is created.
- [ ] **`GET /api/anomalies` returns the created anomaly** — The anomaly record appears in the API response with all fields populated.

---

### Phase 7: WebSocket / Socket.IO Tests

- [ ] **WebSocket server starts without error** — Backend console shows no Socket.IO startup error. Check for: `Socket.IO server initialised on port <PORT>` or similar log line.
- [ ] **Frontend connects to Socket.IO** — When Member 3's frontend loads, backend console shows: `[Socket.IO] Client connected: <socket-id>`. Record socket ID: `_______________________`
- [ ] **`water:reading` event received in browser DevTools** — Open Browser DevTools → Network tab → WS connection → Messages. After each MQTT message, a `water:reading` frame appears with the reading data.
- [ ] **`electricity:reading` event received in browser DevTools** — Similarly, `electricity:reading` frame appears after each MQTT message.
- [ ] **`anomaly:created` event received when anomaly is triggered** — Trigger an anomaly via simulator. Browser DevTools shows an `anomaly:created` WebSocket frame within 2 seconds.
- [ ] **`device:status` event received** — Backend emits `device:status` event when device comes online. Browser DevTools shows this event on page load or reconnect.
- [ ] **Multiple frontend clients receive events** — Open dashboard in two browser tabs simultaneously. Both tabs receive the same `water:reading` events (Socket.IO broadcast). Verify both update simultaneously.
- [ ] **Disconnected client cleaned up** — Close one browser tab. Backend console shows `[Socket.IO] Client disconnected: <socket-id>`. No error thrown.

---

### Phase 8: Device Offline Detection Tests

- [ ] **Offline detection timer is configured** — Backend has a scheduled job or timeout (e.g., `setInterval` or `node-cron`) that checks `Device.lastSeenAt`. Offline threshold is documented: `_______ seconds`.
- [ ] **Device marked offline after no heartbeat for configured timeout** — Stop the simulator. Wait for the offline timeout to elapse. Query: `GET /api/devices/esp32-01`. Response shows `status: "offline"`. Record time taken: `_______ seconds`.
- [ ] **`device:status` event with `status: 'offline'` sent to frontend** — When device transitions to offline, backend emits `device:status` Socket.IO event. Browser DevTools shows this frame with `status: "offline"`.
- [ ] **Dashboard shows OFFLINE state** — Member 3's `DeviceStatus` component updates to show `OFFLINE` badge/indicator within a few seconds of the backend event.
- [ ] **Device transitions back to ONLINE** — Restart simulator. Within one offline check interval, `Device.status` returns to `"online"`. Dashboard shows `ONLINE`.
- [ ] **Offline event is not repeatedly emitted** — If device remains offline, `device:status: offline` event is emitted only once (or at a low frequency), not spammed every second.

---

## 4. Member 3 Testing Checklist — Frontend + Dashboard

**Owner:** Member 3  
**Tools Required:** Node.js ≥ 18, npm, Browser (Chrome recommended), Browser DevTools, TypeScript compiler.

---

### Phase 1: Setup Tests

- [ ] **`npm install` completes without errors** — No unresolved peer dependencies. `node_modules/.pnp.js` or `node_modules/` folder present.
- [ ] **`npm run dev` starts without errors** — Next.js development server starts. Terminal shows: `▲ Next.js <version>` and `ready - started server on 0.0.0.0:3000`.
- [ ] **Browser opens `http://localhost:3000` without errors** — Page loads successfully. No blank white screen. No `404 Not Found` for the root route.
- [ ] **`NEXT_PUBLIC_USE_MOCK_API=true` — dashboard loads with mock data** — Set environment variable (in `.env.local`). Reload page. All cards show data without backend running. Useful for UI development and demo fallback.
- [ ] **No TypeScript errors: `npx tsc --noEmit`** — Run in project root. Output: no errors (exit code 0). If there are errors, list them and resolve before demo.
- [ ] **No ESLint errors: `npm run lint`** — Run ESLint. Zero errors. Warnings are acceptable but should be reviewed.
- [ ] **No console errors in browser** — Open DevTools → Console. Page load produces zero red errors. Yellow warnings are acceptable.
- [ ] **`.env.local` is correctly configured** — Contains: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_USE_MOCK_API`. No placeholder values.

---

### Phase 2: Dashboard Component Rendering Tests

> [!NOTE]
> Use `NEXT_PUBLIC_USE_MOCK_API=true` for this phase so tests are independent of backend availability.

#### MetricCards

- [ ] **All MetricCards render with correct labels** — Cards for Flow Rate, Total Litres, Voltage, Power are all visible with their correct label text.
- [ ] **MetricCard values display with correct units** — Flow rate shows `L/min`, volume shows `L`, power shows `W` or `kW`, energy shows `kWh`.
- [ ] **MetricCard loading skeleton shown while data fetches** — On hard refresh, a skeleton/shimmer placeholder appears before data loads. Not a blank space.
- [ ] **MetricCard error state displayed on API failure** — With mock API disabled and backend stopped, card shows an error indicator (e.g., `--`, `N/A`, or error icon) rather than crashing.

#### WaterFlowCard

- [ ] **WaterFlowCard renders `flowRateLpm` value** — Value is displayed with 2 decimal places. Unit `L/min` shown.
- [ ] **WaterFlowCard renders `totalLitres` value** — Cumulative litres shown. Updates when data refreshes.
- [ ] **WaterFlowCard shows zero-flow state distinctly** — When `flowRateLpm = 0`, component shows a "No flow" or dimmed state rather than displaying `0.00` ambiguously.

#### ElectricityCard

- [ ] **ElectricityCard renders all 4 values** — Voltage (V), Current (A), Power (W), Energy (kWh) are all displayed and labelled correctly.
- [ ] **ElectricityCard values are formatted correctly** — Voltage to 1 decimal (e.g., `228.4 V`), current to 2 decimals (e.g., `0.83 A`), power rounded (e.g., `190 W`), energy to 4 decimals (e.g., `0.0016 kWh`).

#### Charts

- [ ] **ConsumptionChart (water) renders correctly** — Line or bar chart visible with time on X-axis and litres/flow on Y-axis. Axes labelled. Chart title present.
- [ ] **ConsumptionChart shows mock data points** — At least 6 data points visible in the chart in mock mode.
- [ ] **PowerChart (electricity) renders correctly** — Chart visible with time on X-axis and watts on Y-axis.
- [ ] **Charts do not crash with empty data** — Pass an empty array to charts. No JavaScript error. Chart renders with "No data available" message or empty axes.
- [ ] **Charts do not crash with a single data point** — Pass an array with exactly 1 item. Chart renders without error.

#### Device Status

- [ ] **DeviceStatus component shows correct status badge** — `ONLINE` shown as green badge, `OFFLINE` as red/grey badge, `UNKNOWN` as yellow badge.
- [ ] **DeviceStatus shows `lastSeenAt` timestamp** — Human-readable timestamp displayed (e.g., `Last seen: 2 minutes ago` using relative time formatting).
- [ ] **DeviceStatus shows `deviceId`** — `esp32-01` or configured device ID displayed.

#### AnomalyCard

- [ ] **AnomalyCard renders when anomalies are present** — In mock mode with mock anomalies, AnomalyCard is visible.
- [ ] **AnomalyCard shows correct severity color** — `HIGH` → red background/border, `MEDIUM` → orange, `LOW` → yellow. Check Tailwind classes or CSS.
- [ ] **AnomalyCard shows anomaly message** — Human-readable message text displayed (not raw JSON).
- [ ] **AnomalyCard shows `detectedAt` timestamp** — Relative or absolute timestamp displayed.
- [ ] **AnomalyCard is not shown when no anomalies** — With empty anomaly array, AnomalyCard component returns null or shows an "All clear" / empty state message.

---

### Phase 3: Navigation Tests

- [ ] **`/dashboard` page loads without error** — Navigate to `http://localhost:3000/dashboard`. Page renders. No 404, no blank page.
- [ ] **`/water` page loads without error** — `http://localhost:3000/water` renders the water monitoring page with relevant components.
- [ ] **`/electricity` page loads without error** — `http://localhost:3000/electricity` renders the electricity monitoring page.
- [ ] **`/analytics` page loads without error** — `http://localhost:3000/analytics` renders analytics charts/summaries.
- [ ] **`/anomalies` page loads without error** — `http://localhost:3000/anomalies` renders the anomaly list. Shows empty state if no anomalies.
- [ ] **Navigation sidebar/navbar links work** — Clicking each nav link navigates to the correct route. Active route is highlighted in navbar.
- [ ] **Browser back/forward button works** — Navigate forward through multiple pages. Press Back. Correct previous page loads.
- [ ] **Page title updates on navigation** — Browser tab title changes to reflect current page (e.g., "Water Monitoring | Smart IoT System").
- [ ] **Root `/` redirects to `/dashboard`** — Navigating to `http://localhost:3000` redirects to `/dashboard` (or loads the dashboard directly).

---

### Phase 4: API Integration Tests (with Real Backend)

> [!IMPORTANT]
> Ensure Member 2's backend is running and `NEXT_PUBLIC_USE_MOCK_API=false` before starting this phase.

- [ ] **Set `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.local`** — Change value and restart `npm run dev`.
- [ ] **Dashboard loads real data from API** — MetricCards and charts display data from the real database (Member 2's backend). Values should match what `mosquitto_sub` shows.
- [ ] **Charts show real historical data** — ConsumptionChart and PowerChart display database records from the last 24 hours (or configured default window).
- [ ] **Time range selector changes data shown** — If the frontend has a time range picker (Last Hour / Today / Last 7 Days), switching ranges triggers a new API call and the chart data updates accordingly.
- [ ] **API data refreshes periodically** — Without any user interaction, data updates every polling interval (e.g., every 5–10 seconds). Confirm by watching MetricCard values update as simulator continues publishing.
- [ ] **Correct API base URL used** — All API calls go to `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:3001`). Confirm in DevTools → Network tab that XHR/fetch requests target the correct host.

---

### Phase 5: Real-Time Tests (Socket.IO)

- [ ] **Socket.IO connects without error** — DevTools → Console shows no Socket.IO connection errors. Backend log shows client connected.
- [ ] **Water reading updates in UI within 5 seconds of MQTT publish** — With simulator running, observe the `flowRateLpm` MetricCard value change within 5 seconds of a new MQTT message being published. Time measured: `_______ seconds`.
- [ ] **Electricity reading updates in UI** — Power and voltage values on dashboard update within 5 seconds of MQTT publish.
- [ ] **Anomaly card appears in real-time when backend detects anomaly** — Trigger an electricity anomaly via simulator. Without refreshing the page, an AnomalyCard appears on the dashboard within 3 seconds.
- [ ] **Device status updates to OFFLINE in real-time** — Stop the simulator. Wait for offline timeout. Without refreshing the page, DeviceStatus badge changes to `OFFLINE`.
- [ ] **Device status updates to ONLINE in real-time** — Restart simulator. Without refreshing, DeviceStatus badge returns to `ONLINE`.
- [ ] **Socket.IO reconnects after backend restart** — Stop and restart Member 2's backend. Frontend Socket.IO client reconnects automatically. Data resumes updating. No manual page reload required.
- [ ] **No memory leaks from Socket.IO listeners** — Navigate between pages multiple times. Backend log should not show an ever-growing number of connected clients per page load (listeners must be cleaned up in `useEffect` return function).

---

### Phase 6: Edge Case Tests

- [ ] **Loading skeleton shown while initial data fetches** — On hard refresh (`Ctrl+Shift+R`), a visible loading skeleton or spinner is shown for 1–3 seconds before data appears. No layout shift or blank space.
- [ ] **Error state shown if API call fails** — Stop Member 2's backend. Reload frontend. Cards/charts show an error indicator or message (e.g., `"Unable to fetch data. Retrying..."`) instead of crashing or showing `undefined`.
- [ ] **Offline device state displayed correctly** — When `deviceStatus = 'offline'`, the DeviceStatus component shows red badge, and a warning banner or alert is shown to the user.
- [ ] **Empty state shown if no readings yet** — On a fresh database with no readings, charts and history tables show an appropriate empty state message (e.g., "No data available yet. Waiting for device readings...") instead of crashing.
- [ ] **Very high values display without layout breaking** — Render `flowRateLpm = 9999.99`, `power = 99999 W`, `energyKwh = 9999.9999`. Cards display the numbers without overflowing their container or breaking the layout.
- [ ] **Zero values display correctly** — `flowRateLpm = 0.00`, `voltage = 0.00` etc. render without showing `NaN`, `undefined`, or `null`.
- [ ] **Negative values handled gracefully** — If a sensor glitch produces `current = -0.05`, the UI displays it (or clamps to 0) rather than crashing.
- [ ] **Long device ID does not break DeviceStatus layout** — If `deviceId = "esp32-device-building-a-floor-2-meter-1"`, the text is truncated with ellipsis, not overflowing the card.

---

### Phase 7: Responsive Design Tests

> [!TIP]
> Use Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) to test different viewport widths efficiently.

- [ ] **Dashboard is correct on 1920×1080 (Full HD)** — All cards visible in a multi-column grid layout. No unnecessary whitespace. Charts are appropriately wide.
- [ ] **Dashboard is correct on 1366×768 (Common Laptop)** — Cards may reduce to 3 columns. Charts still fully visible. No horizontal scrollbar.
- [ ] **Dashboard is usable on 768px (Tablet)**  — Layout switches to 2-column or 1-column grid. All information accessible without horizontal scrolling. Touch targets (buttons, tabs) are sufficiently large (≥ 44px height).
- [ ] **Dashboard has no horizontal scrollbar on 360px (Mobile)** — All content fits within viewport width. Text does not overflow. Charts are responsive (use percentage width, not fixed pixel width).
- [ ] **Navigation is accessible on mobile** — Navbar collapses to hamburger menu or bottom navigation on small screens. All routes still accessible.
- [ ] **Font sizes are readable on all screen sizes** — Minimum 14px for body text, 12px for labels on all breakpoints. Verify with browser zoom set to 100%.
- [ ] **Charts resize dynamically on window resize** — Drag browser window to change size. Charts re-render at correct dimensions without page refresh.

---

## 5. End-to-End Integration Test Scenarios

> [!IMPORTANT]
> These scenarios require **all three members** to be present. Member 1's ESP32 (or simulator as substitute), Member 2's backend, and Member 3's frontend must all be running simultaneously. Designate one person to observe each layer.

---

### Scenario 1: Normal Operation

**Objective:** Verify that the complete data pipeline works correctly under normal, steady-state conditions.

**Prerequisites:**
- [ ] Member 2's backend is running (`npm run dev` — no errors)
- [ ] Mosquitto broker is running and accessible
- [ ] Member 3's frontend is running (`npm run dev` — no errors) with `NEXT_PUBLIC_USE_MOCK_API=false`
- [ ] Member 1's ESP32 is powered and connected to Wi-Fi, OR simulator is running in "normal" scenario
- [ ] All team members at their respective machines

**Steps:**

| Step | Action | Observer |
|------|--------|----------|
| 1 | Power on ESP32 / start simulator in normal mode | Member 1 |
| 2 | Watch Serial Monitor for "MQTT connected" message | Member 1 |
| 3 | Watch backend console for received MQTT messages | Member 2 |
| 4 | Watch Prisma Studio for new `WaterReading` and `ElectricityReading` rows | Member 2 |
| 5 | Watch dashboard for MetricCard values updating | Member 3 |
| 6 | Wait 2 minutes, observe charts updating with time-series data | All |

**Expected Outputs:**
- Serial Monitor: `"MQTT connected"`, `"Published to resource/readings"` every 5 seconds
- Backend console: `"[MQTT] Received message on resource/readings"` every 5 seconds
- Database: 24+ rows in `WaterReading` and `ElectricityReading` after 2 minutes (at 5 s interval)
- Frontend: MetricCards show live updating values. Charts show a growing time-series line.
- Device status: `ONLINE` (green badge)

**Pass Criteria:**
- [ ] Data appears on dashboard within 10 seconds of first MQTT publish
- [ ] Dashboard values match (within ±5%) the values shown in Serial Monitor / simulator output
- [ ] Charts accumulate data points over time without freezing or errors
- [ ] No errors in Serial Monitor, backend console, or browser console during the 2-minute window
- [ ] `totalLitres` and `energyKwh` increase monotonically

---

### Scenario 2: Water Flow Anomaly

**Objective:** Verify that a sustained, high water flow rate is detected as an anomaly and surfaced on the dashboard in real-time.

**Prerequisites:**
- [ ] Scenario 1 passed
- [ ] Anomaly detection threshold for water flow confirmed: `_______ L/min for _______ minutes`

**Steps:**

| Step | Action | Observer |
|------|--------|----------|
| 1 | Switch simulator to "water anomaly" scenario (or simulate high flow from ESP32 hardware) | Member 1 |
| 2 | Watch backend console for anomaly detection log | Member 2 |
| 3 | Query `GET /api/anomalies?resourceType=water` | Member 2 |
| 4 | Watch dashboard for AnomalyCard appearance | Member 3 |
| 5 | Check browser DevTools WebSocket frames for `anomaly:created` event | Member 3 |
| 6 | Return simulator to normal scenario | Member 1 |
| 7 | Verify AnomalyCard remains visible (anomaly persists until acknowledged or auto-cleared) | Member 3 |

**Expected Outputs:**
- Backend console: `"[ANOMALY] Water anomaly detected: flow rate X L/min exceeds threshold"` (or similar)
- `GET /api/anomalies?resourceType=water`: Returns array with at least 1 anomaly, `severity: "HIGH"`, `message` contains threshold and observed value
- Frontend: AnomalyCard appears on dashboard within 5 seconds of backend detection. Card shows red/orange border, anomaly message, and timestamp.
- Browser DevTools: `anomaly:created` WebSocket frame visible

**Pass Criteria:**
- [ ] Anomaly detected within 1 interval of threshold being exceeded (for power anomaly) or within configured time window (for sustained flow)
- [ ] AnomalyCard appears on dashboard without page refresh, within 5 seconds of backend detection
- [ ] AnomalyCard displays the correct `resourceType` (`water`), `severity`, and human-readable `message`
- [ ] `GET /api/anomalies` returns the new record with all fields populated
- [ ] No duplicate anomaly created within cooldown window: run scenario twice without waiting — only 1 anomaly record created

---

### Scenario 3: High Electricity Consumption

**Objective:** Verify that abnormally high power consumption is detected and reported as an electricity anomaly.

**Prerequisites:**
- [ ] Scenario 1 passed
- [ ] Electricity anomaly threshold confirmed: `_______ W`

**Steps:**

| Step | Action | Observer |
|------|--------|----------|
| 1 | Switch simulator to "electricity anomaly" scenario (power > threshold, e.g., 5000 W) | Member 1 |
| 2 | Watch backend console for electricity anomaly detection | Member 2 |
| 3 | Query `GET /api/anomalies?resourceType=electricity` | Member 2 |
| 4 | Watch dashboard `/anomalies` page and main dashboard for anomaly card | Member 3 |
| 5 | Verify anomaly card shows `resourceType: electricity` and `severity: HIGH` | Member 3 |
| 6 | Navigate to `/anomalies` page — confirm anomaly listed there too | Member 3 |
| 7 | Return simulator to normal scenario | Member 1 |

**Expected Outputs:**
- Backend: `"[ANOMALY] Electricity anomaly: Power 5000W exceeds threshold 4500W"` log line
- API response for `GET /api/anomalies?resourceType=electricity`: array with new record, `severity: "HIGH"`, `detectedAt` within last 60 seconds
- Dashboard: AnomalyCard with red border/badge, message referencing `5000W` and threshold
- `/anomalies` page: Anomaly listed in the anomaly table/list with correct details

**Pass Criteria:**
- [ ] Anomaly detected on the first MQTT message where `power > threshold`
- [ ] AnomalyCard appears on main dashboard in real-time (no page refresh)
- [ ] `/anomalies` page lists the anomaly with correct `resourceType`, `severity`, `message`, `detectedAt`
- [ ] After returning to normal simulator scenario, no new electricity anomalies are created
- [ ] Dashboard power chart shows the spike in power during the anomaly window

---

### Scenario 4: ESP32 Offline Detection

**Objective:** Verify that when the ESP32 (or simulator) stops publishing, the system correctly marks the device as offline and reflects this on the dashboard.

**Prerequisites:**
- [ ] Scenario 1 passed and running (device currently ONLINE)
- [ ] Offline detection timeout confirmed: `_______ seconds`

**Steps:**

| Step | Action | Observer |
|------|--------|----------|
| 1 | Confirm dashboard shows device as `ONLINE` | Member 3 |
| 2 | Power off ESP32 / stop the MQTT simulator | Member 1 |
| 3 | Wait for the offline detection timeout + 5 seconds | All |
| 4 | Watch backend console for offline detection log | Member 2 |
| 5 | Query `GET /api/devices/esp32-01` | Member 2 |
| 6 | Watch dashboard DeviceStatus component | Member 3 |
| 7 | Check browser DevTools for `device:status` WebSocket frame | Member 3 |
| 8 | Power on ESP32 / restart simulator | Member 1 |
| 9 | Verify device returns to ONLINE state on dashboard | Member 3 |

**Expected Outputs:**
- Backend console (after timeout): `"[DEVICE] esp32-01 has gone offline (no heartbeat for X seconds)"`
- `GET /api/devices/esp32-01`: `status: "offline"`, `lastSeenAt` shows the time of last MQTT message
- Frontend: DeviceStatus badge changes from green `ONLINE` to red/grey `OFFLINE` without page refresh. Warning banner may appear.
- Browser DevTools: `device:status` WebSocket frame with `{ "deviceId": "esp32-01", "status": "offline" }`
- After ESP32 restarts: Dashboard returns to `ONLINE` within one polling interval

**Pass Criteria:**
- [ ] Device transitions to `"offline"` in database after `offlineThreshold + 5 seconds` (not before timeout)
- [ ] Frontend DeviceStatus updates to `OFFLINE` without page refresh within 5 seconds of backend detection
- [ ] `device:status` event visible in browser DevTools
- [ ] After device comes back online, frontend transitions back to `ONLINE` in real-time
- [ ] No crash or error in backend, frontend, or Serial Monitor during the offline period

---

## 6. Pre-Demo Verification Checklist

> [!CAUTION]
> Complete this checklist **at the actual demo venue** (not just at home) at least **30 minutes before** the demonstration begins. Network conditions, power availability, and projector connections may differ from your development environment. Do not assume the demo environment matches your home setup.

### Network & Connectivity

- [ ] **Wi-Fi network name (SSID) and password confirmed at demo venue** — If using a personal hotspot, confirm the hotspot device is fully charged and the SSID/password in ESP32 firmware matches. Record: `SSID: _______________________`
- [ ] **All devices are on the same LAN subnet** — ESP32, Member 2's laptop, Member 3's laptop must all be on the same local network. Verify IP addresses are all in the same subnet (e.g., `192.168.x.x`). Do NOT rely on the college's internet Wi-Fi blocking LAN traffic.
- [ ] **Broker IP hardcoded in ESP32 firmware matches demo machine's LAN IP** — Member 2 runs `ipconfig` (Windows) or `ifconfig` (Linux) at the demo venue. LAN IP noted: `_______._______._______._______`. This must match `mqtt_server` in firmware. If different, reflash firmware.
- [ ] **Mosquitto broker firewall rule confirmed** — Windows Defender Firewall (or Linux `ufw`) allows inbound connections on port 1883. Test from a second machine: `mosquitto_sub -h <broker-ip> -t test` — no connection refused error.
- [ ] **Backend CORS origin updated for demo** — If using a different machine for frontend and backend, `CORS_ORIGIN` in backend `.env` includes the frontend's URL. No CORS errors in browser console.

### Service Health

- [ ] **PostgreSQL is running at demo venue** — `pg_isready -h localhost -p 5432` returns `accepting connections`. Database has the latest migration applied.
- [ ] **Mosquitto broker is running** — `mosquitto_sub -h localhost -t test` connects without error (even if no messages arrive).
- [ ] **Backend `npm run dev` or `npm start` is running** — `GET http://localhost:3001/api/health` returns 200. Terminal shows no errors.
- [ ] **Frontend `npm run dev` or `npm start` is running** — Browser opens `http://localhost:3000` and shows the dashboard.
- [ ] **ESP32 Serial Monitor shows "MQTT connected"** — ESP32 has connected to the demo Wi-Fi and published at least one message. Confirm in Arduino IDE / PlatformIO Serial Monitor.
- [ ] **`mosquitto_sub -t resource/readings` shows live messages** — Run in a terminal to visually confirm the data pipeline is active before the demo begins.

### Data & Dashboard State

- [ ] **Dashboard shows real-time live data (not mock data)** — `NEXT_PUBLIC_USE_MOCK_API=false` in production `.env.local`. Cards show actual sensor readings, not static mock values.
- [ ] **Charts have sufficient historical data for demo** — Run the system for at least 15 minutes before the demo. Charts should show a meaningful time-series, not just 1–2 data points.
- [ ] **At least one test anomaly is visible (or can be triggered live)** — Either have a pre-existing anomaly record, OR be prepared to demonstrate anomaly creation live by switching to the anomaly simulator scenario.
- [ ] **Device status shows ONLINE** — Dashboard DeviceStatus is green/`ONLINE` at demo start.
- [ ] **No stale or incorrect data from previous test sessions** — If needed, clear old anomaly records that might confuse the demo. Keep water and electricity readings from today's session.

### Demonstration Readiness

- [ ] **Demo script is prepared and rehearsed** — Each member knows exactly which part of the system they will demonstrate and what they will say. Rehearsed at least once end-to-end.
- [ ] **Backup plan ready: simulator can substitute for ESP32** — If ESP32 hardware fails during demo, Member 1 can start the MQTT simulator immediately. Simulator is tested and ready to run.
- [ ] **Projector / screen sharing is working** — If projecting from a laptop, test the HDMI/display connection. Resolution is set correctly. Both backend terminal and browser dashboard are visible.
- [ ] **Browser is zoomed to readable level on projected screen** — Browser zoom set to 110–125% so the dashboard is readable from the back of the room.
- [ ] **All unnecessary browser tabs and applications are closed** — Only the dashboard and one terminal (for Serial Monitor or simulator) are open during the demo. No distraction from notifications.
- [ ] **Arduino IDE / PlatformIO Serial Monitor is open and readable** — If showing the ESP32 live, Serial Monitor is open, scrolling, and font size is readable on the projector.
- [ ] **Viva question preparation: Each member can answer these** — Be prepared to answer:
  - Why did you choose the YF-S201 sensor for water flow measurement?
  - How does the ZMPT101B work? What is it measuring?
  - What protocol does MQTT use? Why MQTT over HTTP for IoT?
  - How does your anomaly detection algorithm work?
  - What is the purpose of Prisma ORM in your backend?
  - How does Socket.IO enable real-time updates?
  - What would you improve with more time?

---

*End of Testing Checklist.*

---

> **Document maintained by:** All three project members  
> **Next review:** Before each integration session and before the final demo  
> **Status key:** `[ ]` Not tested · `[x]` Passed · `[~]` Partial · `[!]` Failed
