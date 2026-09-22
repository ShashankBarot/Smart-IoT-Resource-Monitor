# DEVELOPMENT_TIMELINE.md — Smart IoT Water & Electricity Monitor

> **Project Deadline: Thursday** (Day 4 from project start)
> **Team Size:** 3 members
> **Goal:** Deliver an integrated, working prototype — hardware sensing, backend API, live dashboard — all connected end-to-end.

---

## Overview

This document is the **master operational plan** for the 4-day sprint. It defines who does what, in what order, and what must be true by end of each day. Every team member must read this document completely before starting work.

The project is feasible in 4 days only if:
1. Everyone starts on the **same shared contracts** (MQTT payload, API response shape, database schema).
2. No one waits idly — every member has clearly scoped independent work each day.
3. Integration is tested **continuously**, not just on Day 4.
4. The **Minimum Viable Prototype (MVP)** is prioritised over optional features.

---

## Critical Path

The **critical path** is the sequence of tasks where a delay in any one task directly delays the project completion date. All three members must be aware of these dependencies.

```
[Member 2] Database schema design
        ↓  (unblocks all backend service and API work)
[All 3]  MQTT JSON contract agreed
        ↓  (unblocks Member 1 firmware + Member 2 subscriber)
[Member 2] API contract agreed and documented
        ↓  (unblocks Member 3 frontend — can build against mock)
[Member 2] Backend MQTT subscriber working + DB insertion confirmed
        ↓  (unblocks Member 2 REST APIs + Member 3 switching to real data)
[Member 1] ESP32 MQTT publisher working over Wi-Fi
        ↓  (unblocks hardware integration test)
[All 3]  Hardware integration test (ESP32 → MQTT → Backend → DB → Dashboard)
        ↓  (unblocks final demo rehearsal)
[All 3]  Full end-to-end demo rehearsal
```

> [!IMPORTANT]
> **MQTT contract and API contract must be finalised on Day 1 morning.** If these slip to the afternoon or Day 2, both Member 1 and Member 3 will be blocked. Do not compromise on this.

---

## Minimum Viable Prototype (MVP)

The MVP is the **smallest set of features that constitutes a working, demonstrable system**. Anything outside the MVP is optional and should only be attempted after all MVP items are complete.

### MVP Checklist — Must-Have for Demo

- [ ] ESP32 reads water flow sensor (YF-S201) and publishes `sensors/water` MQTT messages every 5 seconds
- [ ] ESP32 reads electricity sensors (ZMPT101B voltage + ACS712 current) and publishes `sensors/electricity` MQTT messages every 5 seconds
- [ ] Mosquitto MQTT broker is running and routing messages correctly
- [ ] Backend Node.js MQTT subscriber receives both topics
- [ ] Backend validates payload with Zod schema (rejects malformed messages gracefully)
- [ ] Backend inserts valid readings into PostgreSQL via Prisma
- [ ] REST API: `GET /api/v1/water/latest` — returns most recent water reading
- [ ] REST API: `GET /api/v1/water/history` — returns paginated historical water readings
- [ ] REST API: `GET /api/v1/electricity/latest` — returns most recent electricity reading
- [ ] REST API: `GET /api/v1/electricity/history` — returns paginated historical electricity readings
- [ ] Dashboard overview page: shows current flow rate, total litres, voltage, current, power
- [ ] Dashboard water page: shows historical water flow chart (last 1 hour)
- [ ] Dashboard electricity page: shows historical power chart (last 1 hour)
- [ ] Basic anomaly detection: flag readings that exceed configured thresholds
- [ ] Anomalies visible on dashboard (badge or alert indicator)
- [ ] Device online/offline status tracked and displayed on dashboard

### Optional (Nice-to-Have, Post-MVP)

These features should only be attempted once **every MVP item above is checked off**:

- [ ] Advanced analytics — daily/weekly water and electricity summaries
- [ ] Cost estimation (electricity cost in ₹ based on per-kWh rate)
- [ ] Mobile-responsive dashboard layout
- [ ] Docker Compose deployment file
- [ ] Support for multiple ESP32 devices simultaneously
- [ ] User authentication (JWT-based login for dashboard)
- [ ] Cloud deployment (Railway, Render, or Vercel + Supabase)
- [ ] Email/SMS alert on anomaly detection
- [ ] Data export to CSV

---

## Day-by-Day Plan

---

### DAY 1 — Foundation

> **Target: All three members can work completely independently by end of day.**
> By end of Day 1, Member 1 is writing firmware, Member 2 has a running backend skeleton with database, and Member 3 has a running dashboard showing mock data.

---

#### All Members — Morning Session (2 hours together)

This is the most important 2 hours of the project. Do not skip or shorten this session.

**Agenda:**

1. **Read** this `DEVELOPMENT_TIMELINE.md` and `MQTT_PROTOCOL.md` together — everyone must understand the full system.
2. **Finalise and freeze** the MQTT JSON payload for both topics (`sensors/water` and `sensors/electricity`). Write the agreed schema into `docs/MQTT_PROTOCOL.md`. No changes after this point without team consensus.
3. **Finalise and freeze** the API response shapes for `/water/latest`, `/water/history`, `/electricity/latest`, `/electricity/history`. Member 2 writes the agreed shapes into `docs/API_DOCUMENTATION.md` (even as a draft). Member 3 mirrors them in `frontend/src/types/index.ts` and `frontend/src/lib/mockData.ts`.
4. **Set up Git repository**: create `main` branch, create `feature/esp32-firmware`, `feature/backend`, `feature/frontend` branches. All members push a first commit from their branch.
5. **Share `.env.example` files**: Member 2 writes `backend/.env.example`; Member 3 writes `frontend/.env.example`. Both committed to `main` branch.
6. **Confirm development environment**: every member verifies Node.js 20, npm, PostgreSQL, Mosquitto, and their IDE are working.

---

#### Member 1 — Day 1 (Hardware & Firmware Foundation)

**Goal: Sensor circuit assembled and readings visible on Serial Monitor, independent of network.**

| # | Task | Detail |
|---|---|---|
| 1 | Hardware setup: water circuit | Wire YF-S201 to ESP32 GPIO 4 (signal), 5V (power), GND. Confirm pulse output visible with oscilloscope or multimeter. |
| 2 | Hardware setup: electricity sensing | Under qualified supervision — connect ZMPT101B to GPIO 34 (ADC), ACS712 to GPIO 35 (ADC). Install in enclosure. Never open connections to mains while powered. |
| 3 | Arduino IDE / PlatformIO setup | Install ESP32 board package, verify board communicates via USB serial at 115200 baud. |
| 4 | Water sensor test sketch | Write a minimal sketch that reads pulse count from YF-S201 ISR, converts to L/min using calibration factor (K=7.5 for YF-S201), prints to Serial every 1s. Confirm readings make physical sense (open tap → non-zero flow). |
| 5 | Electricity sensor test sketch | Write ADC-reading sketch for ZMPT101B and ACS712. Sample at 1000Hz for 20ms (one AC cycle at 50Hz), compute RMS. Print V, A, W to Serial. Confirm values are in expected range (200–240V, reasonable current). |
| 6 | GPIO pin assignment documented | Write `firmware/smart_monitor/config.h` with all pin #defines. Commit to `feature/esp32-firmware`. |
| 7 | Sensor calibration notes | Record calibration factor for YF-S201. Record voltage divider ratio / calibration offset for ZMPT101B and ACS712 (refer to datasheets). Document in `firmware/README_firmware.md`. |

---

#### Member 2 — Day 1 (Backend & Database Foundation)

**Goal: PostgreSQL running, Prisma migrated, Mosquitto tested, Node.js TypeScript project bootstrapped, MQTT subscriber skeleton can receive test messages.**

| # | Task | Detail |
|---|---|---|
| 1 | PostgreSQL setup | Create database: `CREATE DATABASE smart_monitor;`. Confirm connection with `psql`. |
| 2 | Mosquitto installation and test | Install Mosquitto. Start with `mosquitto -c mosquitto.conf -v`. In two terminals, run `mosquitto_sub -t sensors/water` and `mosquitto_pub -t sensors/water -m '{"test":1}'`. Confirm message received. |
| 3 | Node.js TypeScript project init | `npm init -y`, install: `typescript ts-node-dev express @types/express mqtt zod prisma @prisma/client socket.io cors dotenv`. Initialise TypeScript config (`tsc --init`). |
| 4 | Prisma schema | Write `prisma/schema.prisma` with models: `Device`, `WaterReading`, `ElectricityReading`, `AnomalyEvent`. See `docs/DATABASE_DESIGN.md` for full schema. |
| 5 | Prisma migration | Run `npx prisma migrate dev --name init`. Verify tables created in PostgreSQL with `\dt`. Run `npx prisma generate`. |
| 6 | MQTT subscriber skeleton | Write `src/mqtt/mqttClient.ts` (connect to broker) and `src/mqtt/mqttSubscriber.ts` (subscribe to `sensors/water` and `sensors/electricity`, log received messages to console). Test by publishing a test message with `mosquitto_pub`. |
| 7 | Zod validation schemas | Write `src/mqtt/payloadValidator.ts` with `WaterPayloadSchema` and `ElectricityPayloadSchema` using Zod. Test with a valid and an invalid payload in a quick unit test. |
| 8 | Write `.env.example` | Commit to `main` so Member 3 can use it as a reference. |
| 9 | Write `scripts/mqtt-simulator.ts` skeleton | Basic script that connects to Mosquitto and publishes one water + one electricity message. Full randomisation can come on Day 2. |

---

#### Member 3 — Day 1 (Frontend Foundation)

**Goal: Next.js project running at localhost:3000, showing a dashboard with realistic mock data, all type definitions in place.**

| # | Task | Detail |
|---|---|---|
| 1 | Next.js project init | `npx create-next-app@14 frontend --typescript --tailwind --app --eslint`. Verify `npm run dev` works. |
| 2 | Install additional dependencies | `npm install recharts socket.io-client axios`. |
| 3 | Type definitions | Create `src/types/index.ts` — define interfaces: `WaterReading`, `ElectricityReading`, `Device`, `AnomalyEvent`, `DailySummary`, `ApiResponse<T>`. Mirror the API contracts agreed in the morning session exactly. |
| 4 | Mock data | Create `src/lib/mockData.ts` with: 50 water reading objects (spanning last 2 hours, realistic flow rates 0–15 L/min), 50 electricity reading objects (220–240V, varying power), 2 device objects, 3 anomaly objects. Use realistic timestamps. |
| 5 | API client with mock toggle | Create `src/lib/api.ts`. Implement `getWaterLatest()`, `getWaterHistory()`, `getElectricityLatest()`, `getElectricityHistory()`, `getDevices()`, `getAnomalies()`. Each function checks `process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'` and returns mock data if true, or makes an Axios HTTP call if false. |
| 6 | MetricCard component | Create `src/components/MetricCard.tsx`. Props: `title: string`, `value: string \| number`, `unit: string`, `trend?: 'up' \| 'down' \| 'stable'`, `anomaly?: boolean`. Renders a styled card with value prominently displayed, coloured border if anomaly. |
| 7 | Navigation component | Create `src/components/Navigation.tsx`. Links to: `/` (Overview), `/water` (Water), `/electricity` (Electricity), `/analytics` (Analytics). Highlight active route. |
| 8 | Root layout | Update `src/app/layout.tsx` to include `<Navigation />` and a main content wrapper. |
| 9 | Dashboard overview page | Implement `src/app/page.tsx`. Call `getWaterLatest()` and `getElectricityLatest()` (mock mode). Render 4–6 MetricCards: Flow Rate, Total Litres, Voltage, Current, Power, Device Status. Show loading skeleton while fetching. |
| 10 | Write `.env.example` | With `NEXT_PUBLIC_USE_MOCK_API=true` for development default. Commit to `main`. |

---

#### End of Day 1 — Checkpoints

All three members verify the following before ending Day 1:

- [ ] **C1.1** Member 1: Water flow sensor reading correctly displayed on Serial Monitor — flow rate in L/min changes when tap is opened/closed.
- [ ] **C1.2** Member 1: Electricity sensor reading non-zero, plausible values for V and A on Serial Monitor.
- [ ] **C1.3** Member 2: `mosquitto_pub -t sensors/water -m '{"test":1}'` received and logged by the Node.js MQTT subscriber running in terminal.
- [ ] **C1.4** Member 2: `npx prisma studio` opens and shows all four tables (`Device`, `WaterReading`, `ElectricityReading`, `AnomalyEvent`) with correct columns.
- [ ] **C1.5** Member 3: `http://localhost:3000` shows overview dashboard with MetricCards populated with mock data.
- [ ] **C1.6** Member 3: `types/index.ts` committed and shared with Member 2 so backend types can be matched.
- [ ] **C1.7** All: Git branches `feature/esp32-firmware`, `feature/backend`, `feature/frontend` all have at least one commit from their respective owners.
- [ ] **C1.8** All: MQTT JSON contract is written and committed to `docs/MQTT_PROTOCOL.md` — no further changes without team discussion.

---

### DAY 2 — Core Features

> **Target: Backend fully functional (MQTT → DB → REST API). Frontend showing real API data. ESP32 sending MQTT messages over Wi-Fi.**

---

#### Member 1 — Day 2 (ESP32 Firmware: Wi-Fi + MQTT)

**Goal: ESP32 connects to Wi-Fi and publishes properly formatted JSON to both MQTT topics.**

| # | Task | Detail |
|---|---|---|
| 1 | Wi-Fi connection code | Add `WiFi.begin(ssid, password)` to firmware. Implement retry loop with timeout. Print IP address to Serial on success. |
| 2 | MQTT client setup | Install `PubSubClient` library. Connect to Mosquitto broker IP (Member 2's laptop IP on shared network). Set client ID to `"esp32-dev-01"`. |
| 3 | Water sensor MQTT publish | In main loop, every 5000ms: read flow rate, build JSON string `{"deviceId":"esp32-dev-01","timestamp":"...","flowRate":X.XX,"totalLitres":Y.YY,"unit":"L"}`, publish to `sensors/water`. |
| 4 | Electricity sensor MQTT publish | In main loop, every 5000ms: compute V_rms, I_rms, power, energy increment; build JSON string; publish to `sensors/electricity`. |
| 5 | Timestamp generation | Since ESP32 has no RTC, use NTP: add `configTime()` and `getLocalTime()` to generate ISO 8601 UTC timestamps. |
| 6 | MQTT reconnect logic | If MQTT connection drops, attempt reconnect with exponential backoff. Use onboard LED (GPIO 2) to indicate: solid = connected, blinking = connecting. |
| 7 | Integration test with Member 2 | Confirm Member 2 is receiving ESP32 messages in their MQTT subscriber console. Fix any payload format mismatches. |
| 8 | Code cleanup | Move all credentials to `config.h`. Add comments. Commit to `feature/esp32-firmware`. |

---

#### Member 2 — Day 2 (Backend: Complete MQTT Pipeline + REST APIs)

**Goal: Backend receives MQTT, validates, stores to DB, serves complete REST API. Simulator publishing realistic data.**

| # | Task | Detail |
|---|---|---|
| 1 | Complete MQTT subscriber | In `mqttSubscriber.ts`, on message received: parse JSON, run Zod validation. If valid → call service layer to insert. If invalid → log error with reason, do NOT crash. |
| 2 | `waterService.ts` — create reading | `insertWaterReading(payload: WaterPayload): Promise<WaterReading>`. Upsert device record, insert `WaterReading` row. |
| 3 | `electricityService.ts` — create reading | `insertElectricityReading(payload: ElectricityPayload): Promise<ElectricityReading>`. Upsert device record, insert `ElectricityReading` row. |
| 4 | `waterRoutes.ts` — GET `/water/latest` | Query `WaterReading` where `deviceId = ?`, order by `timestamp DESC`, take 1. Return JSON. |
| 5 | `waterRoutes.ts` — GET `/water/history` | Query with pagination (`page`, `limit` query params), optional `deviceId` filter, optional `from`/`to` date range. Return array + total count. |
| 6 | `electricityRoutes.ts` — GET `/electricity/latest` | Same pattern as water. |
| 7 | `electricityRoutes.ts` — GET `/electricity/history` | Same pattern as water. |
| 8 | `deviceRoutes.ts` — GET `/devices` | Return all Device records with `isOnline`, `lastSeen`, `deviceId`. |
| 9 | Device online/offline tracking | In `deviceService.ts`: when a reading is received, mark device as online, update `lastSeen`. Run a cron-style `setInterval` every 30s: any device with `lastSeen` > 60s ago → mark offline. |
| 10 | MQTT simulator — complete | In `scripts/mqtt-simulator.ts`: every 5000ms publish randomised but realistic values for both topics. Add Gaussian noise around baseline values (e.g., flow 0–12 L/min, voltage 220–240V). Occasionally publish a spike to test anomaly detection. |
| 11 | Test with Member 3 | Share Postman / curl examples of working API endpoints. Confirm Member 3 can switch `NEXT_PUBLIC_USE_MOCK_API=false` and see real data. |
| 12 | Write `API_DOCUMENTATION.md` (draft) | Document all working endpoints with request/response examples. |

---

#### Member 3 — Day 2 (Frontend: All Pages + Real API Integration)

**Goal: All pages and components built. Dashboard switched to real API and displaying live data.**

| # | Task | Detail |
|---|---|---|
| 1 | `SensorChart.tsx` component | Recharts `<LineChart>` or `<AreaChart>` wrapper. Props: `data: WaterReading[] \| ElectricityReading[]`, `dataKey: string`, `unit: string`, `color: string`, `title: string`. Renders responsive chart with X-axis as formatted timestamp, Y-axis as value, tooltip with unit. |
| 2 | `HistoryTable.tsx` component | Paginated table showing sensor readings. Props: `data: any[]`, `columns: Column[]`. Renders timestamp, value, deviceId. Supports Next/Prev page buttons. |
| 3 | `DeviceStatusCard.tsx` component | Shows device ID, online indicator (green dot / red dot), last seen timestamp. Props: `device: Device`. |
| 4 | `AnomalyBadge.tsx` component | Coloured pill badge: `severity: 'low' \| 'medium' \| 'high'`. Maps to yellow / orange / red. Shows anomaly type text. |
| 5 | Water detail page (`/water/page.tsx`) | Calls `getWaterLatest()` and `getWaterHistory()`. Shows MetricCards for flow rate and total litres. Shows SensorChart for flow rate over time. Shows HistoryTable below chart. |
| 6 | Electricity detail page (`/electricity/page.tsx`) | Calls `getElectricityLatest()` and `getElectricityHistory()`. Shows MetricCards for voltage, current, power. Shows SensorChart for power over time. Shows HistoryTable. |
| 7 | Analytics page (`/analytics/page.tsx`) | Calls `getAnomalies()`. Shows list of anomaly events with AnomalyBadge. Placeholder for daily summary charts (to be filled Day 3). |
| 8 | Switch to real API | Set `NEXT_PUBLIC_USE_MOCK_API=false`. Confirm all pages load data from backend. Fix any type mismatches between mock types and real API response. |
| 9 | Auto-refresh | Add `setInterval` polling every 10 seconds on the overview page to re-fetch latest readings and update MetricCards without page reload. (Socket.IO will replace this on Day 3.) |
| 10 | Error handling | If API fetch fails (network error or non-200), show a clear error banner on the page. Do not crash the dashboard. |
| 11 | `LoadingSpinner.tsx` | Show a spinner during initial data fetch on each page. |
| 12 | Navigation styling | Highlight active route in Navigation. |

---

#### End of Day 2 — Checkpoints

- [ ] **C2.1** Member 1: ESP32 is publishing MQTT messages to `sensors/water` and `sensors/electricity` every 5 seconds over Wi-Fi, confirmed visible in Mosquitto broker logs.
- [ ] **C2.2** Member 2: Running `curl http://localhost:3001/api/v1/water/latest` returns a JSON object with real sensor data from PostgreSQL.
- [ ] **C2.3** Member 2: Running `curl http://localhost:3001/api/v1/water/history?limit=10` returns an array of 10 reading objects.
- [ ] **C2.4** Member 2: Prisma Studio shows rows being inserted in `WaterReading` and `ElectricityReading` tables in real time (refreshing manually).
- [ ] **C2.5** Member 3: Dashboard overview page at `localhost:3000` shows live data fetched from Member 2's API (not mock data).
- [ ] **C2.6** Member 3: `/water` and `/electricity` pages both render charts with real historical data.
- [ ] **C2.7** Member 3: If the backend is stopped, dashboard shows a graceful error banner rather than crashing.
- [ ] **C2.8** All: MQTT simulator (`npx ts-node scripts/mqtt-simulator.ts`) works as a drop-in replacement for the ESP32 — backend and frontend behave identically whether the source is the simulator or the real hardware.

---

### DAY 3 — Integration + Analytics

> **Target: Full end-to-end system working — ESP32 hardware → MQTT → Backend → Database → API → Dashboard — with real-time updates and anomaly detection.**

---

#### Member 1 — Day 3 (Hardware Integration + Calibration)

**Goal: Complete, calibrated firmware committed. Hardware verified working with Member 2's live backend.**

| # | Task | Detail |
|---|---|---|
| 1 | Final firmware review | Code review of all firmware files. Ensure no hardcoded test values. Ensure all `#define`s in `config.h`. Remove all debug-only `Serial.println` that are not useful for demo. |
| 2 | Hardware integration test | Connect ESP32 to Member 2's running backend. Open a tap or simulate water flow. Watch Member 2's PostgreSQL receive rows. Watch Member 3's dashboard update. Confirm full pipeline works. |
| 3 | Water sensor calibration | Compare YF-S201 reading (total litres) against a measured volume (e.g., fill a 1-litre bottle). Adjust calibration factor K if needed. Document calibration factor in `config.h` comment. |
| 4 | Electricity sensor calibration | Compare ZMPT101B voltage reading against a known-good multimeter reading. Adjust scaling factor. Document offset/gain values. |
| 5 | Edge case firmware | Test and handle: what happens if Wi-Fi drops? (reconnect logic), what happens if MQTT disconnects? (reconnect with LWT), what happens on ESP32 reset? (totalLitres resets — document this known limitation). |
| 6 | Hardware stress test | Leave the system running for 30 minutes continuously. Monitor for crashes, memory leaks (heap usage via `ESP.getFreeHeap()`), and MQTT disconnections. Fix any stability issues. |
| 7 | Document wiring diagram | Sketch the wiring diagram (component connections, pin labels) in `firmware/README_firmware.md`. This is required for the viva. |
| 8 | Final commit | `git add -A && git commit -m "feat: complete calibrated firmware v1.0"` to `feature/esp32-firmware`. Create PR to `main`. |

---

#### Member 2 — Day 3 (Analytics + Anomaly Detection + WebSocket)

**Goal: Analytics API, anomaly detection service, Socket.IO real-time push all working.**

| # | Task | Detail |
|---|---|---|
| 1 | `analyticsRoutes.ts` — daily summary | `GET /api/v1/analytics/daily-summary?deviceId=&date=YYYY-MM-DD`. Query: `AVG(flowRate)`, `SUM(energy)`, `MAX(power)`, `MIN(voltage)`, `COUNT(readings)` for the day. Return as JSON. |
| 2 | `analyticsRoutes.ts` — weekly summary | `GET /api/v1/analytics/weekly-summary?deviceId=`. Returns array of 7 daily summaries. |
| 3 | `anomalyService.ts` — rule-based detection | On every new reading insertion: check against threshold rules (water flowRate > `WATER_FLOW_MAX_LMIN`, voltage < `ELECTRICITY_VOLTAGE_MIN` or > `ELECTRICITY_VOLTAGE_MAX`, power > `ELECTRICITY_POWER_MAX_W`). If rule triggered → insert `AnomalyEvent` row. |
| 4 | `anomalyService.ts` — z-score detection | Maintain a rolling window of the last 50 readings per device per metric. Compute z-score of new reading against window mean/std. If `|z| > 3.0` → insert `AnomalyEvent` with `type: 'STATISTICAL_SPIKE'`. |
| 5 | `anomalyRoutes.ts` | `GET /api/v1/anomalies?deviceId=&severity=&limit=`. Returns paginated anomaly events ordered by timestamp DESC. |
| 6 | Socket.IO server | In `src/websocket/socketServer.ts`: set up Socket.IO on the same Express server. On new water reading → `io.emit('water:new', readingObject)`. On new electricity reading → `io.emit('electricity:new', readingObject)`. On anomaly → `io.emit('anomaly:new', anomalyObject)`. On device status change → `io.emit('device:status', deviceObject)`. |
| 7 | Device offline detection | `setInterval` every 30s: for each device in DB, if `lastSeen < (now - 60s)` and currently `isOnline = true` → update to `isOnline = false`, emit `device:status` via Socket.IO. |
| 8 | Performance test | Insert 1000 rows of dummy water data via a script. Test that `GET /water/history?limit=50&page=20` responds in < 200ms. Add a PostgreSQL index on `(deviceId, timestamp)` if not already present in schema. |
| 9 | Error middleware | Add Express error-handling middleware. All unhandled errors return `{ error: { code, message } }` JSON rather than HTML stack trace. |
| 10 | Integration verification | With the ESP32 running for 10 minutes, verify anomaly rows are being created when a spike is simulated (e.g., briefly connecting a high-power device). |

---

#### Member 3 — Day 3 (Real-time Updates + Analytics Display + Polish)

**Goal: Dashboard receives live Socket.IO updates without polling. Analytics page complete. Anomaly display working. Device status live.**

| # | Task | Detail |
|---|---|---|
| 1 | Socket.IO client singleton | Create `src/lib/socket.ts`. Initialise `io(NEXT_PUBLIC_WS_URL)` once. Export the socket instance. Handle `connect`, `disconnect`, `connect_error` events with console logs. |
| 2 | Real-time MetricCards | In overview `page.tsx`: on `socket.on('water:new', ...)` → update water MetricCard state. On `socket.on('electricity:new', ...)` → update electricity MetricCards. Remove the `setInterval` polling added on Day 2. |
| 3 | Real-time chart updates | In SensorChart: maintain a local state array of readings (last 60 data points). On new Socket.IO reading event → append to array, drop oldest if > 60. Recharts will re-render automatically via React state update. |
| 4 | Anomaly display — live | On `socket.on('anomaly:new', ...)` → add anomaly to a local state list. Show a dismissible toast/notification at the top of the page. On the Analytics page, show the running list of anomalies. |
| 5 | Device status — live | On `socket.on('device:status', ...)` → update DeviceStatusCard state. Green = online, Red = offline. Show time since last seen. |
| 6 | Analytics page — complete | Fetch `GET /analytics/daily-summary` and `GET /analytics/weekly-summary`. Show: total water consumed today (litres), total energy consumed today (kWh), estimated electricity cost today (₹ based on ₹6/kWh), weekly water chart (BarChart), weekly energy chart (BarChart). List of anomaly events with AnomalyBadge. |
| 7 | Offline state handling | If Socket.IO disconnects → show a yellow "Reconnecting..." banner at the top of the page. Hide banner on reconnect. Continue showing last known data while disconnected. |
| 8 | Page titles and metadata | Add `<title>` tags using Next.js `metadata` export for each page (`Overview | Smart Monitor`, `Water | Smart Monitor`, etc.). |
| 9 | Responsive layout | Test dashboard on a smaller window (1024px width). Fix any layout overflow issues using Tailwind responsive classes. |
| 10 | Code cleanup | Remove all `console.log` debug statements. Fix any TypeScript `any` types. Run `npm run lint` and fix all ESLint warnings. |

---

#### End of Day 3 — Checkpoints

- [ ] **C3.1** Full end-to-end pipeline verified: open a tap → ESP32 detects flow → MQTT message published → backend receives and stores → REST API returns the reading → dashboard displays updated value within 10 seconds.
- [ ] **C3.2** Socket.IO real-time: new readings appear on the dashboard within 1–2 seconds of ESP32 publishing (without page refresh).
- [ ] **C3.3** Anomaly detection: artificially spike a sensor reading via the MQTT simulator → an anomaly event appears in the database and a live notification appears on the dashboard.
- [ ] **C3.4** Device offline detection: kill the MQTT simulator or disconnect the ESP32 → within 90 seconds, the dashboard shows the device as offline (red indicator).
- [ ] **C3.5** Analytics page: shows today's total water consumed (in litres) and today's total energy consumed (in kWh) computed from the database.
- [ ] **C3.6** All three `feature/*` branches have been reviewed and pull requests opened to `main`.
- [ ] **C3.7** No unhandled promise rejections or TypeScript compilation errors in backend.
- [ ] **C3.8** No ESLint errors in frontend (`npm run lint` passes clean).

---

### DAY 4 (THURSDAY) — Final Preparation

> **Target: Demo-ready system. All members rehearsed. Fallback strategies prepared. Repository tagged.**

---

#### Morning — Full System Test (All Members Together, ~2 hours)

Run the complete system from scratch, as if it were the first time:

1. **Clean start test**: on a fresh terminal with no processes running, start Mosquitto → start backend → start frontend → power on ESP32. Verify everything comes up without manual intervention.
2. **End-to-end scenario test**: run through the full demo scenario described in `docs/DEMO_GUIDE.md`. Each member plays their part.
3. **Bug triage**: note any bugs found. Prioritise: P1 (demo-breaking, must fix), P2 (visible but not breaking, fix if time), P3 (cosmetic, skip).
4. **Fix P1 bugs only**: time-box bug fixing to 45 minutes. Do not start new features.

---

#### Afternoon — Demo Rehearsal (~2 hours)

1. **Full demo rehearsal**: one member presents as if to the evaluator panel. Others observe and note timing, clarity, and any system hiccups.
2. **Time the demo**: aim for 8–12 minutes. Cut sections if longer.
3. **Prepare talking points** for each system layer:
   - Hardware: "The ESP32 reads from the YF-S201 sensor using an interrupt-driven pulse counter. The calibration factor is K=7.5, giving us flow rate in L/min."
   - Backend: "The Node.js service subscribes to two MQTT topics. Every message is validated against a Zod schema before being persisted via Prisma to PostgreSQL."
   - Frontend: "The Next.js dashboard uses Socket.IO for sub-second real-time updates. The anomaly detection service flags any reading beyond our configured thresholds."
4. **Backup system preparation**:
   - Ensure MQTT simulator is ready as ESP32 hardware fallback.
   - Ensure `NEXT_PUBLIC_USE_MOCK_API=true` mode is tested as full fallback.
   - Record a 2-minute screen capture of the full working system (video backup).
   - Export 5 screenshots of the dashboard showing key features.

---

#### Evening / Night — Final Commit and Tag

1. **Merge all feature branches** to `main` via pull requests. Resolve any merge conflicts.
2. **Final `npm run lint`** on frontend — fix any remaining warnings.
3. **Final TypeScript check** on backend — `npx tsc --noEmit` — resolve any type errors.
4. **Update README.md** if any setup steps changed during the sprint.
5. **Commit final documentation** — ensure `docs/VIVA_QA.md` is complete.
6. **Tag the release**:
   ```bash
   git tag -a v1.0.0 -m "PBL prototype v1.0.0 — demo ready"
   git push origin main --tags
   ```
7. **Prepare demo environment**:
   - Laptop charged and power adapter available.
   - All terminals pre-arranged and ready to start (Mosquitto, backend, frontend).
   - Browser open at `http://localhost:3000`.
   - ESP32 charged / USB cable available.
   - Network plan: use a mobile hotspot if venue Wi-Fi is unavailable — update `config.h` SSID and backend IP accordingly.

---

## Git Branch Strategy

```
main (protected — no direct pushes)
├── feature/esp32-firmware   (Member 1)
├── feature/backend          (Member 2)
└── feature/frontend         (Member 3)
```

### Rules

- **Never push directly to `main`**. All changes go through a pull request.
- Each member owns their branch. Only they push to it.
- PRs require at least one other member to review before merge.
- Merge `main` into your feature branch daily to stay up to date and avoid large merge conflicts.
- `main` must always be in a working, deployable state.

### Commit Message Convention

All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

| Prefix | When to Use | Example |
|---|---|---|
| `feat:` | A new feature or capability | `feat: add water flow MQTT publisher` |
| `fix:` | A bug fix | `fix: handle MQTT reconnect on Wi-Fi drop` |
| `docs:` | Documentation changes only | `docs: add GPIO pin assignment table` |
| `test:` | Adding or fixing tests | `test: add Zod schema validation unit tests` |
| `refactor:` | Code restructuring (no behaviour change) | `refactor: extract sensor reading into helper function` |
| `chore:` | Build system, config, dependencies | `chore: add prisma migrate script to package.json` |
| `style:` | Formatting, whitespace, no logic change | `style: format waterService.ts with prettier` |

---

### Suggested Commit Sequence (Chronological, 15+ commits)

| Day | Who | Commit Message |
|---|---|---|
| Day 1 AM | All | `docs: add MQTT payload contract and API response shapes` |
| Day 1 PM | Member 2 | `feat: initialise Node.js TypeScript backend project` |
| Day 1 PM | Member 2 | `feat: add Prisma schema with Device, WaterReading, ElectricityReading, AnomalyEvent` |
| Day 1 PM | Member 2 | `feat: add MQTT subscriber skeleton — connects and logs received messages` |
| Day 1 PM | Member 3 | `feat: initialise Next.js 14 project with Tailwind and TypeScript` |
| Day 1 PM | Member 3 | `feat: add shared type definitions in types/index.ts` |
| Day 1 PM | Member 3 | `feat: add mockData.ts with 50 water and electricity readings` |
| Day 1 PM | Member 3 | `feat: add api.ts with mock/real toggle and all fetch functions` |
| Day 1 PM | Member 3 | `feat: add MetricCard and Navigation components` |
| Day 1 PM | Member 1 | `feat: add water flow sensor test sketch with ISR pulse counter` |
| Day 2 | Member 1 | `feat: add Wi-Fi connection and NTP time sync to firmware` |
| Day 2 | Member 1 | `feat: add MQTT client — publishes water and electricity JSON every 5s` |
| Day 2 | Member 2 | `feat: add Zod validation schemas for water and electricity payloads` |
| Day 2 | Member 2 | `feat: complete waterService and electricityService with DB insertion` |
| Day 2 | Member 2 | `feat: add REST API routes for water and electricity — GET latest and history` |
| Day 2 | Member 2 | `feat: complete MQTT simulator with randomised realistic values` |
| Day 2 | Member 3 | `feat: add SensorChart component using Recharts LineChart` |
| Day 2 | Member 3 | `feat: add water and electricity detail pages with chart and table` |
| Day 2 | Member 3 | `fix: align WaterReading type with real API response (add totalLitres field)` |
| Day 3 | Member 2 | `feat: add anomaly detection — rule-based and z-score statistical` |
| Day 3 | Member 2 | `feat: add Socket.IO server emitting water:new, electricity:new, anomaly:new` |
| Day 3 | Member 2 | `feat: add device offline detection with 60s timeout` |
| Day 3 | Member 3 | `feat: integrate Socket.IO client for real-time MetricCard updates` |
| Day 3 | Member 3 | `feat: complete analytics page with daily and weekly summaries` |
| Day 3 | Member 1 | `fix: adjust YF-S201 calibration factor from 7.5 to 6.8 based on measured volume test` |
| Day 4 | All | `fix: resolve merge conflicts between backend and frontend branches` |
| Day 4 | All | `chore: tag v1.0.0 release — demo ready` |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| **ESP32 firmware bug causing incorrect MQTT payload** | Medium | High | Use MQTT simulator as fallback. Backend's Zod validation will reject malformed payloads — check validation error logs to diagnose. |
| **Wi-Fi connectivity issues at demo venue** | Medium | High | Use a mobile phone hotspot. Update `config.h` SSID/password and backend machine IP before demo. Test this configuration on Day 4. |
| **PostgreSQL setup or migration failure** | Low | Medium | Use Docker as fallback: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:15`. Prisma migrations work identically against Docker PostgreSQL. |
| **YF-S201 sensor calibration significantly off** | Medium | Medium | Calibrate against a measured volume on Day 3. If calibration cannot be resolved, display raw pulse count and disclaim calibration in the demo. |
| **ACS712 / ZMPT101B readings noisy or incorrect** | Medium | Medium | Add software averaging (mean of 100 ADC samples per reading). If still incorrect, use known resistive load (e.g., a 100W bulb) and reverse-calculate expected V and I for comparison. |
| **Electricity sensor hardware failure / short** | Low | High | Do all mains-side wiring in advance under supervision. Have a pre-built, tested module ready. If hardware completely fails, demo using simulator only — clearly state the hardware is simulated. |
| **Backend crashes under continuous load** | Low | High | Run 30-minute stress test on Day 3. Add `try/catch` around all async DB calls. Use `process.on('uncaughtException')` as last resort to log and not crash. |
| **Frontend Socket.IO not receiving events** | Medium | Medium | Fallback to 10-second `setInterval` polling (already tested on Day 2). CORS misconfiguration is the most common cause — verify `CORS_ORIGIN` in backend `.env`. |
| **Team member absent on Day 3 or Day 4** | Low | High | Each member maintains a `README` for their own module. All code is documented with comments. Any member can demo any layer with 30 minutes of reading. |
| **Git merge conflict causing data loss** | Low | Medium | Use feature branches. Never force push. If conflict arises, both members resolve together on a call. Keep commits small and frequent. |
| **Demo laptop failure** | Very Low | High | Upload code to GitHub. Any laptop can clone and run within 10 minutes. Have a video recording as absolute last resort. |

---

## Time Budget Summary

| Day | Member 1 Hours | Member 2 Hours | Member 3 Hours |
|---|---|---|---|
| Day 1 | ~6h (2h joint + 4h hw) | ~6h (2h joint + 4h be) | ~6h (2h joint + 4h fe) |
| Day 2 | ~5h | ~7h | ~7h |
| Day 3 | ~5h | ~6h | ~6h |
| Day 4 | ~4h (joint) | ~4h (joint) | ~4h (joint) |
| **Total** | **~20h** | **~23h** | **~23h** |

> [!TIP]
> If any member finishes their Day 2 tasks early, the best use of spare time is: writing viva Q&A answers in `docs/VIVA_QA.md` for their own layer, or helping another member debug integration issues. Do NOT start optional features until MVP is confirmed complete.

---

## Definition of "Done"

A feature is **done** when:
1. It works correctly in the integrated system (not just in isolation).
2. It handles error cases gracefully (does not crash on bad input).
3. Code is committed to the feature branch with a descriptive commit message.
4. The corresponding checkpoint item in this document is checked off.

A day is **done** when:
1. All end-of-day checkpoints are verified and ticked.
2. Each member has pushed their work to their feature branch.
3. A brief (5-minute) verbal sync between all team members confirms no blockers for the next day.

---

*Document Owner: All Team Members*
*Last Updated: 22 September 2026*
*Version: 1.0*
