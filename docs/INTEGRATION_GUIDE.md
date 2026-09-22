# Integration Guide

**Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System
**Document Type:** System Integration Reference
**Audience:** All three team members (Member 1 – Hardware/ESP32, Member 2 – Backend, Member 3 – Frontend)
**Last Updated:** 2026-09-22

---

> [!IMPORTANT]
> Every interface described in **Section 2 (The Integration Contract)** is binding. No member may change a topic name, endpoint path, JSON field name, or event name without notifying and getting agreement from the other two members first. Treat these contracts exactly like a public API.

---

## Table of Contents

1. [Integration Overview](#1-integration-overview)
2. [The Integration Contract](#2-the-integration-contract)
   - 2.1 [Contract A – Member 1 → Member 2 (MQTT)](#21-contract-a--member-1--member-2-mqtt)
   - 2.2 [Contract B – Member 2 → Member 3 (REST API)](#22-contract-b--member-2--member-3-rest-api)
   - 2.3 [Contract C – Member 2 → Member 3 (WebSocket)](#23-contract-c--member-2--member-3-websocket)
3. [Phase A – Software Integration (Before ESP32)](#3-phase-a--software-integration-before-esp32)
4. [Phase B – Full Hardware Integration (With ESP32)](#4-phase-b--full-hardware-integration-with-esp32)
5. [Integration Troubleshooting Guide](#5-integration-troubleshooting-guide)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Starting Everything Together](#7-starting-everything-together)
8. [Docker Compose (Optional)](#8-docker-compose-optional)
9. [Integration Checklist](#9-integration-checklist)

---

## 1. Integration Overview

The system is divided into **three distinct layers**, each owned by one team member:

| Layer | Owner | Technology | Responsibility |
|-------|-------|------------|----------------|
| **Layer 1 – Firmware** | Member 1 | ESP32 (C++ / Arduino) | Reads sensors, publishes readings over MQTT |
| **Layer 2 – Backend** | Member 2 | Node.js / Express / Prisma / Socket.IO | Subscribes to MQTT, stores data in PostgreSQL, serves REST API and WebSocket |
| **Layer 3 – Frontend** | Member 3 | Next.js / React / Recharts | Consumes REST API and WebSocket, renders live dashboard |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        System Architecture                              │
│                                                                         │
│  ┌──────────────┐   MQTT (topic: resource/readings)   ┌─────────────┐  │
│  │   ESP32      │ ──────────────────────────────────► │  Mosquitto  │  │
│  │  (Member 1)  │                                     │   Broker    │  │
│  └──────────────┘                                     └──────┬──────┘  │
│                                                              │          │
│                                              MQTT Subscribe  │          │
│                                                              ▼          │
│                                                    ┌─────────────────┐  │
│                                                    │  Node.js/Express│  │
│                                                    │   Backend       │  │
│                                                    │  (Member 2)     │  │
│                                                    │                 │  │
│                                                    │  ┌──────────┐  │  │
│                                                    │  │PostgreSQL│  │  │
│                                                    │  └──────────┘  │  │
│                                                    └────────┬────────┘  │
│                                                             │           │
│                                          REST API +         │           │
│                                          WebSocket          │           │
│                                                             ▼           │
│                                                    ┌─────────────────┐  │
│                                                    │  Next.js        │  │
│                                                    │  Dashboard      │  │
│                                                    │  (Member 3)     │  │
│                                                    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Phases

Integration happens in two clearly defined phases so that Member 2 and Member 3 can validate their work **before** the physical ESP32 hardware is introduced:

| Phase | What it tests | Who participates | Hardware needed |
|-------|---------------|-----------------|-----------------|
| **Phase A – Software Integration** | Backend ↔ Frontend communication using an MQTT simulator | Member 2 + Member 3 | Laptop only |
| **Phase B – Full Hardware Integration** | End-to-end: ESP32 sensors → MQTT → Backend → Frontend | All three members | ESP32 + sensors + laptop |

Both phases must be completed and verified before the project demonstration.

---

## 2. The Integration Contract

> [!CAUTION]
> The interfaces defined in this section are **frozen**. Any unilateral change to a field name, topic name, URL path, or Socket.IO event name will silently break another member's code. Always communicate before changing anything here.

---

### 2.1 Contract A – Member 1 → Member 2 (MQTT)

**Protocol:** MQTT v3.1.1
**Broker:** `localhost:1883` (development) / `<laptop-LAN-IP>:1883` (Phase B hardware integration)
**Topic (exact, case-sensitive):** `resource/readings`
**QoS Level:** 1 (at least once)
**Publish frequency:** Every **5 seconds**

#### 2.1.1 Payload Schema

The ESP32 must publish a **UTF-8 encoded JSON string** with the following exact structure. No extra or missing fields are allowed without updating this contract.

```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:23:01.000Z",
  "water": {
    "flowRate": 3.72,
    "totalVolume": 128.5,
    "unit": "L/min"
  },
  "electricity": {
    "voltage": 231.4,
    "current": 4.12,
    "power": 953.4,
    "energyConsumed": 0.265,
    "powerFactor": 0.97,
    "unit": "W"
  }
}
```

#### 2.1.2 Field Definitions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `deviceId` | `string` | — | Hardcoded identifier of the ESP32 device. Must be `"esp32-01"`. |
| `timestamp` | `string` | ISO 8601 UTC | Timestamp of the reading. Format: `YYYY-MM-DDTHH:mm:ss.sssZ`. Use NTP-synced time when possible; fall back to millis-based estimate if NTP is unavailable. |
| `water.flowRate` | `number` | L/min | Instantaneous volumetric flow rate measured by the YF-S201 sensor. |
| `water.totalVolume` | `number` | Litres | Cumulative volume since device boot (resets on reboot). |
| `water.unit` | `string` | — | Always `"L/min"`. |
| `electricity.voltage` | `number` | Volts (V) | RMS mains voltage measured by ZMPT101B sensor. |
| `electricity.current` | `number` | Amperes (A) | RMS load current measured by ACS712 sensor. |
| `electricity.power` | `number` | Watts (W) | Apparent/real power: `voltage × current`. |
| `electricity.energyConsumed` | `number` | kWh | Cumulative energy consumed since device boot. |
| `electricity.powerFactor` | `number` | — | Power factor (0.0–1.0). |
| `electricity.unit` | `string` | — | Always `"W"`. |

> [!NOTE]
> All numeric values must be **floating-point numbers** (not strings). Send `3.72`, not `"3.72"`. The backend will reject payloads that do not parse cleanly as numbers.

#### 2.1.3 Example Valid Payloads

**Normal reading:**
```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:23:01.000Z",
  "water": { "flowRate": 2.15, "totalVolume": 45.3, "unit": "L/min" },
  "electricity": { "voltage": 230.1, "current": 2.45, "power": 563.7, "energyConsumed": 0.078, "powerFactor": 0.95, "unit": "W" }
}
```

**Zero flow (tap closed):**
```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:23:06.000Z",
  "water": { "flowRate": 0.00, "totalVolume": 45.3, "unit": "L/min" },
  "electricity": { "voltage": 230.3, "current": 0.10, "power": 23.0, "energyConsumed": 0.079, "powerFactor": 0.91, "unit": "W" }
}
```

**Anomalous reading (high flow — for testing anomaly detection):**
```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:23:11.000Z",
  "water": { "flowRate": 32.00, "totalVolume": 46.0, "unit": "L/min" },
  "electricity": { "voltage": 231.0, "current": 18.50, "power": 4273.5, "energyConsumed": 0.095, "powerFactor": 0.99, "unit": "W" }
}
```

---

### 2.2 Contract B – Member 2 → Member 3 (REST API)

**Base URL (development):** `http://localhost:3001/api`
**Content-Type:** `application/json`
**Authentication:** None (development scope)

All endpoints return a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

On error:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

#### 2.2.1 Health Check

```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 3823.4,
    "timestamp": "2026-09-22T14:30:00.000Z",
    "db": "connected",
    "mqtt": "connected"
  }
}
```

Use this endpoint first when debugging. If this fails, the backend is not running.

---

#### 2.2.2 Get Latest Reading

```
GET /api/readings/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 142,
    "deviceId": "esp32-01",
    "timestamp": "2026-09-22T14:29:55.000Z",
    "water": {
      "flowRate": 2.15,
      "totalVolume": 98.7,
      "unit": "L/min"
    },
    "electricity": {
      "voltage": 230.4,
      "current": 3.21,
      "power": 740.0,
      "energyConsumed": 0.205,
      "powerFactor": 0.96,
      "unit": "W"
    }
  }
}
```

**Member 3 usage:** Poll this on dashboard mount to populate stat cards with the current snapshot. After initial load, switch to WebSocket events for real-time updates.

---

#### 2.2.3 Get Historical Readings

```
GET /api/readings?startDate=<ISO>&endDate=<ISO>&limit=<number>&deviceId=<string>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO 8601 string | No | 24 hours ago | Start of the time range |
| `endDate` | ISO 8601 string | No | now | End of the time range |
| `limit` | integer (1–1000) | No | 100 | Maximum number of records returned |
| `deviceId` | string | No | `"esp32-01"` | Filter by device |

**Example Request:**
```
GET /api/readings?startDate=2026-09-22T00:00:00Z&endDate=2026-09-22T23:59:59Z&limit=200
```

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": 1,
        "deviceId": "esp32-01",
        "timestamp": "2026-09-22T00:00:05.000Z",
        "water": { "flowRate": 0.00, "totalVolume": 0.0, "unit": "L/min" },
        "electricity": { "voltage": 230.0, "current": 0.50, "power": 115.0, "energyConsumed": 0.000, "powerFactor": 0.90, "unit": "W" }
      },
      {
        "id": 2,
        "deviceId": "esp32-01",
        "timestamp": "2026-09-22T00:00:10.000Z",
        "water": { "flowRate": 1.20, "totalVolume": 0.1, "unit": "L/min" },
        "electricity": { "voltage": 230.2, "current": 2.10, "power": 483.4, "energyConsumed": 0.001, "powerFactor": 0.94, "unit": "W" }
      }
    ],
    "count": 2,
    "startDate": "2026-09-22T00:00:00.000Z",
    "endDate": "2026-09-22T23:59:59.000Z"
  }
}
```

**Member 3 usage:** Fetch this on initial dashboard load to populate the historical charts (last 24 hours by default).

---

#### 2.2.4 Get Water Readings Only

```
GET /api/readings/water?startDate=<ISO>&endDate=<ISO>&limit=<number>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": 1,
        "deviceId": "esp32-01",
        "timestamp": "2026-09-22T14:00:00.000Z",
        "flowRate": 2.15,
        "totalVolume": 87.3,
        "unit": "L/min"
      }
    ],
    "count": 1
  }
}
```

---

#### 2.2.5 Get Electricity Readings Only

```
GET /api/readings/electricity?startDate=<ISO>&endDate=<ISO>&limit=<number>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": 1,
        "deviceId": "esp32-01",
        "timestamp": "2026-09-22T14:00:00.000Z",
        "voltage": 230.1,
        "current": 3.40,
        "power": 782.3,
        "energyConsumed": 0.108,
        "powerFactor": 0.95,
        "unit": "W"
      }
    ],
    "count": 1
  }
}
```

---

#### 2.2.6 Get Anomalies

```
GET /api/anomalies?resolved=<boolean>&limit=<number>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resolved` | boolean | No | `false` | Filter by resolution status |
| `limit` | integer | No | 50 | Maximum records returned |

**Response:**
```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "id": 7,
        "deviceId": "esp32-01",
        "type": "HIGH_FLOW",
        "severity": "HIGH",
        "message": "Water flow rate 32.00 L/min exceeds threshold of 15.00 L/min",
        "value": 32.00,
        "threshold": 15.00,
        "timestamp": "2026-09-22T13:45:00.000Z",
        "resolved": false,
        "resolvedAt": null
      },
      {
        "id": 6,
        "deviceId": "esp32-01",
        "type": "HIGH_POWER",
        "severity": "MEDIUM",
        "message": "Power consumption 4273.5 W exceeds threshold of 3000 W",
        "value": 4273.5,
        "threshold": 3000.0,
        "timestamp": "2026-09-22T13:44:55.000Z",
        "resolved": false,
        "resolvedAt": null
      }
    ],
    "count": 2
  }
}
```

**Anomaly `type` values:**

| Type | Description |
|------|-------------|
| `HIGH_FLOW` | Water flow rate exceeds 15 L/min |
| `HIGH_POWER` | Power consumption exceeds 3000 W |
| `HIGH_VOLTAGE` | Voltage exceeds 250 V |
| `LOW_VOLTAGE` | Voltage drops below 200 V |
| `HIGH_CURRENT` | Current exceeds 16 A |

**Anomaly `severity` values:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

---

#### 2.2.7 Resolve an Anomaly

```
PATCH /api/anomalies/:id/resolve
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "resolved": true,
    "resolvedAt": "2026-09-22T14:30:00.000Z"
  },
  "message": "Anomaly resolved"
}
```

---

#### 2.2.8 Get Device Status

```
GET /api/devices
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "esp32-01",
        "status": "ONLINE",
        "lastSeen": "2026-09-22T14:29:55.000Z",
        "ipAddress": "192.168.1.105",
        "firmwareVersion": "1.0.0"
      }
    ]
  }
}
```

**`status` values:** `ONLINE`, `OFFLINE`

A device is considered `OFFLINE` if no reading has been received in the last 30 seconds.

---

#### 2.2.9 Get Dashboard Summary

```
GET /api/dashboard/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "totalWaterVolume": 342.8,
      "totalEnergyConsumed": 3.76,
      "peakFlowRate": 8.40,
      "peakPower": 1520.0,
      "anomalyCount": 2
    },
    "device": {
      "deviceId": "esp32-01",
      "status": "ONLINE",
      "lastSeen": "2026-09-22T14:29:55.000Z"
    },
    "latestReading": {
      "timestamp": "2026-09-22T14:29:55.000Z",
      "water": { "flowRate": 2.15, "totalVolume": 342.8, "unit": "L/min" },
      "electricity": { "voltage": 230.4, "current": 3.21, "power": 740.0, "energyConsumed": 3.76, "powerFactor": 0.96, "unit": "W" }
    }
  }
}
```

**Member 3 usage:** Call this once on dashboard load to populate all summary cards and the device status banner in a single request.

---

### 2.3 Contract C – Member 2 → Member 3 (WebSocket)

**Server:** `http://localhost:3001`
**Library:** Socket.IO v4.x (client package: `socket.io-client`)
**Namespace:** `/` (default)
**Transport:** WebSocket with HTTP long-polling fallback

#### 2.3.1 Connecting

Member 3 connects using:

```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});
```

#### 2.3.2 Event: `water:reading`

Emitted by backend every time a new water reading is stored.

**Payload:**
```json
{
  "id": 143,
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:30:00.000Z",
  "flowRate": 2.15,
  "totalVolume": 98.9,
  "unit": "L/min"
}
```

**Member 3 usage:** Append to the water chart dataset and update the flow rate stat card.

---

#### 2.3.3 Event: `electricity:reading`

Emitted by backend every time a new electricity reading is stored.

**Payload:**
```json
{
  "id": 143,
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:30:00.000Z",
  "voltage": 230.4,
  "current": 3.21,
  "power": 740.0,
  "energyConsumed": 0.207,
  "powerFactor": 0.96,
  "unit": "W"
}
```

**Member 3 usage:** Append to the electricity chart dataset and update the power / energy stat cards.

---

#### 2.3.4 Event: `reading:update`

Emitted by backend as a combined update (both water and electricity together). Can be used instead of listening to both `water:reading` and `electricity:reading` separately.

**Payload:**
```json
{
  "id": 143,
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:30:00.000Z",
  "water": {
    "flowRate": 2.15,
    "totalVolume": 98.9,
    "unit": "L/min"
  },
  "electricity": {
    "voltage": 230.4,
    "current": 3.21,
    "power": 740.0,
    "energyConsumed": 0.207,
    "powerFactor": 0.96,
    "unit": "W"
  }
}
```

---

#### 2.3.5 Event: `anomaly:created`

Emitted immediately when the backend's anomaly detection logic flags a reading.

**Payload:**
```json
{
  "id": 8,
  "deviceId": "esp32-01",
  "type": "HIGH_FLOW",
  "severity": "HIGH",
  "message": "Water flow rate 32.00 L/min exceeds threshold of 15.00 L/min",
  "value": 32.00,
  "threshold": 15.00,
  "timestamp": "2026-09-22T14:30:05.000Z",
  "resolved": false
}
```

**Member 3 usage:** Add a toast notification and add the anomaly to the anomaly list panel without needing to re-fetch the REST endpoint.

---

#### 2.3.6 Event: `device:status`

Emitted when a device comes online or goes offline. The backend checks device liveness every 15 seconds.

**Payload:**
```json
{
  "deviceId": "esp32-01",
  "status": "OFFLINE",
  "lastSeen": "2026-09-22T14:28:55.000Z",
  "timestamp": "2026-09-22T14:29:25.000Z"
}
```

**`status` values:** `ONLINE`, `OFFLINE`

**Member 3 usage:** Update the device status banner at the top of the dashboard. When `OFFLINE`, show a red warning banner: *"ESP32 device is offline. Last seen: <time>"*.

---

#### 2.3.7 Connection Lifecycle Events

The following standard Socket.IO events must be handled by the frontend:

| Event | When | Member 3 Action |
|-------|------|-----------------|
| `connect` | Socket successfully connected | Show green connection indicator |
| `disconnect` | Socket disconnected (network issue) | Show yellow "Reconnecting…" indicator |
| `connect_error` | Connection attempt failed | Show red "Connection failed" indicator, log error |
| `reconnect` | Successfully reconnected after failure | Show green indicator, re-fetch latest data via REST |

---

## 3. Phase A – Software Integration (Before ESP32)

> [!NOTE]
> Phase A allows Member 2 and Member 3 to fully test the backend–frontend integration using a software MQTT simulator, so they are not blocked waiting for the ESP32 firmware to be ready.

### Step 1: Member 2 – Start Mosquitto and Backend

Open two separate terminal windows.

**Terminal 1 – Start Mosquitto MQTT Broker:**
```powershell
# Navigate to the directory containing mosquitto.conf
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"

# Start Mosquitto in verbose mode so you can see incoming messages
mosquitto -c mosquitto.conf -v
```

**Expected console output from Mosquitto:**
```
1727015400: mosquitto version 2.0.18 starting
1727015400: Config loaded from mosquitto.conf.
1727015400: Starting in local only mode. Connections will only be possible from clients running on this machine.
1727015400: Creating listen socket on IP 0.0.0.0 port 1883
1727015400: Opening ipv4 listen socket on port 1883.
1727015400: mosquitto version 2.0.18 running
```

Leave this terminal open. Mosquitto must remain running throughout all integration testing.

**Terminal 2 – Start Backend:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"

# Ensure dependencies are installed
npm install

# Run Prisma migrations (first time only)
npx prisma migrate dev --name init

# Start the development server
npm run dev
```

**Expected console output from Backend:**
```
[Backend] Server running on port 3001
[Backend] Connected to PostgreSQL database
[Backend] MQTT client connected to mqtt://localhost:1883
[Backend] Subscribed to topic: resource/readings
[Backend] Socket.IO server initialized
```

**Verify Backend is alive:**
```powershell
curl http://localhost:3001/api/health
```

Expected response:
```json
{ "success": true, "data": { "status": "ok", "db": "connected", "mqtt": "connected" } }
```

If `"mqtt": "connected"` appears, the backend successfully connected to Mosquitto. If `"mqtt": "disconnected"`, ensure Mosquitto is running (Terminal 1).

---

### Step 2: Member 2 – Run the MQTT Simulator

The simulator sends realistic JSON payloads to the `resource/readings` topic every 5 seconds, mimicking the ESP32. It also periodically injects anomalous values so Member 3 can test the anomaly alert UI.

**Terminal 3:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
npx ts-node scripts/mqtt-simulator.ts
```

**Expected console output:**
```
[Simulator] Connected to MQTT broker at mqtt://localhost:1883
[Simulator] Publishing to topic: resource/readings every 5000ms
[Simulator] [14:30:00] Published: { deviceId: 'esp32-01', water: { flowRate: 2.15, ... }, electricity: { power: 495.3, ... } }
[Simulator] [14:30:05] Published: { deviceId: 'esp32-01', water: { flowRate: 1.87, ... }, electricity: { power: 431.0, ... } }
[Simulator] [14:30:10] Published: { deviceId: 'esp32-01', water: { flowRate: 3.40, ... }, electricity: { power: 782.0, ... } }
[Simulator] [14:30:15] ⚠️  ANOMALY injected: HIGH_FLOW (flowRate: 32.00 L/min)
[Simulator] [14:30:20] Published: { deviceId: 'esp32-01', water: { flowRate: 2.10, ... }, electricity: { power: 484.3, ... } }
```

Simultaneously, **Mosquitto's terminal (Terminal 1)** should print:
```
1727015400: New connection from 127.0.0.1:52301 on port 1883.
1727015400: New client connected from 127.0.0.1:52301 as mqtt-simulator (p2, c1, k60).
1727015405: Client mqtt-simulator received PUBLISH (d0, q1, r0, m1, 'resource/readings', ...)
```

And **the backend terminal (Terminal 2)** should print:
```
[Backend] MQTT message received on topic: resource/readings
[Backend] Reading saved to DB: id=1, deviceId=esp32-01
[Backend] Emitting Socket.IO events: water:reading, electricity:reading, reading:update
[Backend] Anomaly check: all values within normal range
```

When the simulator injects an anomalous reading, the backend should print:
```
[Backend] ⚠️  ANOMALY DETECTED: HIGH_FLOW (32.00 L/min > threshold 15.00 L/min)
[Backend] Anomaly saved to DB: id=1
[Backend] Emitting Socket.IO event: anomaly:created
```

---

### Step 3: Member 3 – Connect Frontend to Backend

**Terminal 4:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\frontend"
npm install
```

Edit the file `frontend/.env.local`:
```env
# Change this line:
NEXT_PUBLIC_USE_MOCK_API=true
# to:
NEXT_PUBLIC_USE_MOCK_API=false

# Ensure these are correct:
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

Start the frontend:
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\frontend"
npm run dev
```

**Expected console output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.1s
```

Open browser: `http://localhost:3000`

**Expected result after this step:**
- The dashboard loads without errors
- Stat cards show real values from the backend (not zeros or mock data)
- Charts begin populating with data points
- Every 5 seconds, a new data point appears in the charts (driven by the simulator)
- When the simulator injects a HIGH_FLOW anomaly, a toast notification pops up in the top-right corner
- The anomaly appears in the Anomaly panel

---

### Step 4: Verify Phase A Integration

Work through this checklist together (Member 2 and Member 3 on the same screen):

**API Verification (run from terminal):**

```powershell
# Health check
curl http://localhost:3001/api/health

# Latest reading
curl http://localhost:3001/api/readings/latest

# Historical readings (last hour)
$start = (Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$end   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
curl "http://localhost:3001/api/readings?startDate=$start&endDate=$end&limit=50"

# Anomalies
curl http://localhost:3001/api/anomalies?resolved=false

# Dashboard summary
curl http://localhost:3001/api/dashboard/summary
```

**Frontend Verification (do in browser):**

- [ ] Open `http://localhost:3000` — dashboard loads, no blank screen
- [ ] **Flow Rate card** — shows a non-zero number (simulator is running)
- [ ] **Power card** — shows a non-zero number
- [ ] **Water chart** — shows a line graph with data points updating every 5 seconds
- [ ] **Electricity chart** — shows a line graph with data points updating every 5 seconds
- [ ] **Device Status banner** — shows `ONLINE` (green)
- [ ] Wait ~30 seconds — a `HIGH_FLOW` anomaly notification appears
- [ ] **Anomaly panel** — lists at least one anomaly
- [ ] Open **Browser DevTools → Network → WS** — see the Socket.IO WebSocket connection established
- [ ] Open **Browser DevTools → Console** — no CORS errors, no 404 errors

> [!TIP]
> If data is not updating in real time but REST API works, the issue is with Socket.IO. Check the browser DevTools Network tab — filter by "WS" to see if the WebSocket handshake succeeded.

---

## 4. Phase B – Full Hardware Integration (With ESP32)

> [!IMPORTANT]
> Do Phase B only after Phase A is verified and working. Phase B replaces the MQTT simulator with the real ESP32 hardware. Everything else (backend, frontend) remains the same.

### Step 1: Network Setup

All devices must be on the **same local Wi-Fi network**:
- The laptop running Mosquitto and the backend
- The ESP32 microcontroller

**Member 2: Find the laptop's LAN IP address**

Open PowerShell and run:
```powershell
ipconfig
```

Look for the section corresponding to your Wi-Fi adapter. Example output:
```
Wireless LAN adapter Wi-Fi:
   Connection-specific DNS Suffix  . :
   Link-local IPv6 Address . . . . . : fe80::1a2b:3c4d:5e6f:7a8b%12
   IPv4 Address. . . . . . . . . . . : 192.168.1.103
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
```

The **IPv4 Address** (e.g., `192.168.1.103`) is what Member 1 needs to put in the ESP32 firmware.

**Share this IP address with Member 1 before flashing the firmware.**

> [!WARNING]
> IP addresses assigned by a home/office router via DHCP can change after router reboot. If the ESP32 suddenly stops connecting, re-run `ipconfig` and check if the laptop's IP has changed. Consider setting a **static IP** on the laptop or using the router's DHCP reservation feature.

---

### Step 2: ESP32 Configuration (Member 1)

In the ESP32 firmware source file (typically `firmware/src/config.h` or at the top of `main.cpp`), update these constants:

```cpp
// ============================================================
// Wi-Fi Configuration
// ============================================================
#define WIFI_SSID       "YourWiFiNetworkName"   // Replace with your router SSID
#define WIFI_PASSWORD   "YourWiFiPassword"       // Replace with your Wi-Fi password

// ============================================================
// MQTT Broker Configuration
// ============================================================
// Set this to Member 2's laptop LAN IP (from Step 1 above)
#define MQTT_BROKER_IP  "192.168.1.103"          // ← REPLACE with actual laptop IP
#define MQTT_PORT       1883
#define MQTT_TOPIC      "resource/readings"       // Must match Contract A exactly
#define DEVICE_ID       "esp32-01"               // Must match Contract A exactly

// ============================================================
// Publish Interval
// ============================================================
#define PUBLISH_INTERVAL_MS  5000   // 5 seconds
```

After updating:
1. Save the file
2. Connect the ESP32 to the laptop via USB
3. In Arduino IDE (or PlatformIO), select the correct board and COM port
4. Click **Upload**
5. Open **Serial Monitor** (baud rate: 115200)

**Expected Serial Monitor output after boot:**
```
[ESP32] Booting Smart Monitor v1.0.0
[ESP32] Connecting to Wi-Fi: YourWiFiNetworkName ...
[ESP32] Wi-Fi connected!
[ESP32] IP Address: 192.168.1.105
[ESP32] Connecting to MQTT broker at 192.168.1.103:1883 ...
[ESP32] MQTT connected!
[ESP32] [14:35:00] Publishing to resource/readings ...
[ESP32] Payload: {"deviceId":"esp32-01","timestamp":"2026-09-22T09:05:00.000Z","water":{"flowRate":0.00,"totalVolume":0.0,"unit":"L/min"},"electricity":{"voltage":229.8,"current":0.12,"power":27.6,"energyConsumed":0.000,"powerFactor":0.91,"unit":"W"}}
[ESP32] Publish OK
[ESP32] [14:35:05] Publishing to resource/readings ...
```

If the Serial Monitor shows `Wi-Fi connected!` but then `MQTT connection failed`, the broker IP is wrong or port 1883 is blocked by the Windows Firewall (see troubleshooting Section 5).

---

### Step 3: Member 2 – Confirm Backend Is Receiving ESP32 Data

Stop the simulator (Ctrl+C in Terminal 3 if still running) and watch the **backend terminal (Terminal 2)**:

```
[Backend] MQTT message received on topic: resource/readings
[Backend] Reading saved to DB: id=287, deviceId=esp32-01
[Backend] Emitting Socket.IO events: water:reading, electricity:reading, reading:update
[Backend] Anomaly check: all values within normal range
```

Messages should appear every 5 seconds. The `deviceId` must be `"esp32-01"`.

If no messages appear, run this command to independently verify Mosquitto receives ESP32 messages:
```powershell
mosquitto_sub -h localhost -t resource/readings -v
```

This tool subscribes directly to the topic. If messages print here but the backend does not receive them, the problem is in the backend's MQTT subscription code.

---

### Step 4: Member 3 – Confirm Dashboard Updates with Real Data

In the browser:
1. Refresh `http://localhost:3000`
2. Watch the **Flow Rate** card — it should show `0.00 L/min` if no water is flowing (tap closed)
3. Watch the **Power** card — it should show the standby power of the connected load
4. Watch the **Device Status** banner — must show `ONLINE`

> [!TIP]
> Side-by-side the browser and the ESP32 Serial Monitor on the same screen during Phase B testing. You should see dashboard values change within 1-2 seconds of the Serial Monitor printing "Publish OK".

---

### Step 5: Full End-to-End Test Scenarios

Run these physical tests to verify the complete data path from sensor to screen:

#### Test Scenario 1 – Water Flow Test

**Objective:** Confirm the water flow sensor reading reaches the dashboard.

1. Connect the YF-S201 flow sensor in line with a water source (e.g., a garden hose or tap)
2. Open the tap so water flows through the sensor
3. **Observe Serial Monitor:** `flowRate` value should increase from `0.00` to a non-zero value (e.g., `2.15`)
4. **Observe backend terminal:** Receiving messages with `flowRate > 0`
5. **Observe browser dashboard:** Flow Rate stat card updates, water chart shows a rising line
6. Close the tap
7. **Observe dashboard:** Flow Rate card returns to `0.00 L/min`

#### Test Scenario 2 – Power Consumption Test

**Objective:** Confirm the electricity monitoring sensor reading reaches the dashboard.

1. Connect a load (e.g., a table lamp or a kettle) to the circuit being monitored by the ACS712 sensor
2. Turn the load OFF first
3. **Observe dashboard:** Power card should show standby current (< 30 W typically)
4. Turn the load ON
5. **Observe Serial Monitor:** `power` value should jump to the load's power rating
6. **Observe backend terminal:** Receiving messages with higher `power` values
7. **Observe browser dashboard:** Power stat card updates, electricity chart shows a spike
8. Turn the load OFF
9. **Observe dashboard:** Power card drops back to standby level

#### Test Scenario 3 – Anomaly Detection Test

**Objective:** Confirm anomaly detection and frontend alert work with real hardware.

1. Temporarily lower the anomaly threshold in `backend/src/services/anomaly.service.ts`:
   ```typescript
   const WATER_FLOW_THRESHOLD = 1.0; // temporarily low for testing
   ```
2. Open the tap — flow rate will likely exceed 1.0 L/min
3. **Observe backend terminal:** `⚠️ ANOMALY DETECTED: HIGH_FLOW`
4. **Observe browser:** Toast notification appears in top-right corner
5. **Observe Anomaly panel:** New anomaly entry added with correct message and timestamp
6. Restore the threshold to `15.0` after testing

#### Test Scenario 4 – Device Offline Test

**Objective:** Confirm the frontend correctly shows the device as offline when ESP32 is disconnected.

1. With ESP32 running and dashboard showing `ONLINE`, disconnect the ESP32 from power (or press the reset button and don't let it reconnect)
2. Wait 30 seconds (the backend's offline timeout)
3. **Observe backend terminal:** `[Backend] Device esp32-01 is now OFFLINE. Last seen: <timestamp>`
4. **Observe browser:** Device status banner turns red, shows "ESP32 device is offline. Last seen: <time>"
5. Reconnect the ESP32
6. Within 5-10 seconds: **Observe browser:** Banner turns green again, showing `ONLINE`

---

## 5. Integration Troubleshooting Guide

> [!NOTE]
> Work through problems systematically — start at the data source (ESP32 or simulator) and move toward the display (browser). Do not jump to the frontend to debug what is actually an MQTT or database issue.

---

### Problem: Backend Not Receiving MQTT Messages from ESP32

**Symptoms:** Backend terminal shows no "MQTT message received" lines. Mosquitto terminal shows no new clients connecting.

**Diagnostic checklist:**

**1. Is Mosquitto running?**
```powershell
mosquitto -c mosquitto.conf -v
```
If you see `bind: Only one usage of each socket address is normally permitted`, Mosquitto is already running. If the command is not found, install Mosquitto: https://mosquitto.org/download/

**2. Is the ESP32 connected to Wi-Fi?**

Open the Serial Monitor. You should see:
```
[ESP32] Wi-Fi connected!
[ESP32] IP Address: 192.168.1.105
```
If you see repeated `Connecting to Wi-Fi...` lines, the SSID or password is wrong. Double-check `WIFI_SSID` and `WIFI_PASSWORD` in the firmware.

**3. Is the broker IP correct in the ESP32 firmware?**

Compare the `MQTT_BROKER_IP` in the firmware with the IP obtained from `ipconfig` on the laptop. They must match exactly. A common mistake is using an old IP after the router reassigned it.

**4. Is port 1883 allowed through Windows Firewall?**

By default, Windows Firewall blocks incoming connections on port 1883. To add an exception:

Open PowerShell as **Administrator**:
```powershell
# Add inbound rule to allow MQTT on port 1883
New-NetFirewallRule `
  -DisplayName "MQTT Broker Port 1883" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 1883 `
  -Action Allow
```

To verify the rule exists:
```powershell
Get-NetFirewallRule -DisplayName "MQTT Broker Port 1883"
```

To temporarily disable the firewall for testing (do NOT leave this on):
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
# Re-enable after testing:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

**5. Verify Mosquitto receives messages independently:**
```powershell
mosquitto_sub -h localhost -t resource/readings -v
```
Run this on the same laptop. If messages arrive here but the backend misses them, the issue is in the backend's MQTT client code, not the broker or ESP32.

**6. Check Mosquitto config allows external connections:**

The default `mosquitto.conf` may restrict connections to `localhost`. Open `mosquitto.conf` and ensure it contains:
```
listener 1883 0.0.0.0
allow_anonymous true
```
The `0.0.0.0` binding means all interfaces (not just loopback), which is required for the ESP32 to connect from the LAN.

---

### Problem: Frontend Not Showing Data

**Symptoms:** Dashboard shows zeros, mock data, or a blank/error screen.

**Diagnostic checklist:**

**1. Is the backend running on port 3001?**
```powershell
curl http://localhost:3001/api/health
```
If this returns `Connection refused`, the backend is not running. Start it with `npm run dev` from the `backend/` directory.

**2. Is `NEXT_PUBLIC_API_URL` correct in `.env.local`?**

Open `frontend/.env.local` and verify:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```
Note: `http://localhost:3001` with **no trailing slash**. Some API call implementations break with a trailing slash.

**3. Is `NEXT_PUBLIC_USE_MOCK_API` set to `false`?**

Open `frontend/.env.local`:
```env
NEXT_PUBLIC_USE_MOCK_API=false
```
If this is `true`, the frontend uses hardcoded mock data and ignores the backend completely. Change to `false` and restart the frontend (`Ctrl+C`, then `npm run dev`).

> [!CAUTION]
> Next.js caches environment variables at build time. After changing `.env.local`, you **must** restart the dev server for changes to take effect. Simply refreshing the browser is not enough.

**4. Check browser console for CORS errors:**

Open browser DevTools (F12) → Console tab. Look for errors like:
```
Access to fetch at 'http://localhost:3001/api/readings' from origin 'http://localhost:3000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

If you see this, Member 2 must add CORS configuration to the backend:
```typescript
// In backend/src/index.ts
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
```

**5. Direct API test:**
```powershell
curl http://localhost:3001/api/readings/latest
curl http://localhost:3001/api/dashboard/summary
```
If these return data but the frontend still shows zeros, the problem is in how Member 3's code calls the API (wrong field name, not handling the `data` envelope, etc.).

---

### Problem: WebSocket Not Connecting

**Symptoms:** Charts do not update in real time. Browser shows stale data. REST API works but live updates don't appear.

**Diagnostic checklist:**

**1. Is `NEXT_PUBLIC_WS_URL` correct?**

Check `frontend/.env.local`:
```env
NEXT_PUBLIC_WS_URL=http://localhost:3001
```
This must point to the backend server (not the frontend). Socket.IO runs on the same port as Express.

**2. Check browser Network tab for WebSocket handshake:**

Open DevTools (F12) → Network tab → Filter by "WS" (WebSocket).

You should see a request to:
```
ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```
with status `101 Switching Protocols`.

If you see a `400` or `403` status, Socket.IO handshake is failing. Check backend CORS settings for Socket.IO:
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
```

**3. Check backend logs for Socket.IO connection messages:**

Backend terminal should show:
```
[Backend] Socket.IO client connected: socket_id_abc123
```
when the browser connects. If this never appears, the frontend is not reaching the Socket.IO server.

**4. Check the event names in frontend code:**

The event names must match **exactly** (case-sensitive):
- `water:reading`
- `electricity:reading`
- `reading:update`
- `anomaly:created`
- `device:status`

A common mistake is `waterReading` instead of `water:reading`.

**5. Test the `useSocket` hook in isolation:**

Add a temporary log to the hook to confirm events are received:
```typescript
socket.on('reading:update', (data) => {
  console.log('[useSocket] reading:update received:', data);
  // ... existing state update
});
```
Open the browser console. If this log appears but the chart does not update, the problem is in the React state update or chart rendering logic.

---

### Problem: JSON Parse Error in Backend

**Symptoms:** Backend logs show `SyntaxError: Unexpected token` or `JSON.parse error`. Readings are not stored in the database.

**Diagnostic checklist:**

**1. Print the raw JSON in ESP32 firmware:**
```cpp
Serial.println("[ESP32] Publishing payload:");
Serial.println(payload);
```
Open Serial Monitor and copy-paste the printed JSON.

**2. Validate the JSON:**

Paste the copied JSON at: https://jsonlint.com

Common issues:
- Trailing comma after the last field: `"unit": "W",}` ← invalid
- Single quotes instead of double quotes: `'deviceId'` ← invalid JSON
- Missing closing brace or bracket
- NaN or Infinity values (e.g., division by zero in sensor calculations): `"flowRate": nan` ← invalid JSON, must be `0.0`

**3. Verify field names match the contract exactly:**

Compare the firmware output field by field against the contract in Section 2.1. Common mistakes:
- `flow_rate` instead of `flowRate` (camelCase vs snake_case)
- `energy` instead of `energyConsumed`
- `pf` instead of `powerFactor`

---

### Problem: Charts Not Updating in Real Time

**Symptoms:** REST API data is correct, WebSocket connects, but charts remain static.

**Diagnostic checklist:**

**1. Confirm Socket.IO receives events in the browser:**
```javascript
// Temporary debug — add to your useSocket hook
socket.onAny((eventName, ...args) => {
  console.log('[Socket.IO] Event received:', eventName, args);
});
```
Open the browser console. You should see `water:reading`, `electricity:reading`, and `reading:update` events every 5 seconds.

**2. Confirm React state updates are triggering re-renders:**

Use React DevTools browser extension. Find the chart component in the component tree. After a Socket.IO event, its `data` prop should change.

**3. Check for stale closure in socket event handlers:**

A very common React bug with Socket.IO:
```typescript
// BUG: stale closure — chartData is captured once and never updated
socket.on('water:reading', (newPoint) => {
  setChartData([...chartData, newPoint]); // chartData is stale
});

// FIX: use functional state update
socket.on('water:reading', (newPoint) => {
  setChartData((prev) => [...prev, newPoint]); // always uses latest
});
```

**4. Check chart library's data update behavior:**

Recharts requires the `data` prop array reference to change for it to re-render. Mutating the existing array (e.g., `chartData.push(newPoint)`) will NOT trigger a re-render. Always create a new array.

---

## 6. Environment Variables Reference

> [!IMPORTANT]
> Never commit `.env` or `.env.local` files to the Git repository. Both files are listed in `.gitignore`. Share these values securely among team members (e.g., WhatsApp, in-person).

### `backend/.env`

Full file contents:
```env
# ============================================================
# Database
# ============================================================
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_monitor"

# ============================================================
# MQTT
# ============================================================
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_TOPIC="resource/readings"

# ============================================================
# Server
# ============================================================
PORT=3001
NODE_ENV=development

# ============================================================
# Anomaly Detection Thresholds
# ============================================================
WATER_FLOW_THRESHOLD=15.0
ELECTRICITY_POWER_THRESHOLD=3000
ELECTRICITY_CURRENT_THRESHOLD=16.0
ELECTRICITY_VOLTAGE_HIGH=250.0
ELECTRICITY_VOLTAGE_LOW=200.0

# ============================================================
# Device Settings
# ============================================================
DEVICE_OFFLINE_TIMEOUT_MS=30000
```

### `frontend/.env.local`

Full file contents:
```env
# ============================================================
# API Connection
# ============================================================
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001

# ============================================================
# Development Mode
# ============================================================
# Set to 'true' to use mock data (no backend needed)
# Set to 'false' to connect to real backend
NEXT_PUBLIC_USE_MOCK_API=false
```

### Variable Descriptions

| Variable | File | Description |
|----------|------|-------------|
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string. Change `password` to your actual PostgreSQL password. |
| `MQTT_BROKER_URL` | `backend/.env` | URL of the Mosquitto MQTT broker. In development, always `mqtt://localhost:1883`. |
| `MQTT_TOPIC` | `backend/.env` | MQTT topic to subscribe to. Must be `resource/readings`. |
| `PORT` | `backend/.env` | Port the Express server listens on. Frontend must match. |
| `NODE_ENV` | `backend/.env` | Node environment. Affects logging verbosity and error messages. |
| `WATER_FLOW_THRESHOLD` | `backend/.env` | L/min above which a HIGH_FLOW anomaly is triggered. |
| `ELECTRICITY_POWER_THRESHOLD` | `backend/.env` | Watts above which a HIGH_POWER anomaly is triggered. |
| `DEVICE_OFFLINE_TIMEOUT_MS` | `backend/.env` | Milliseconds of silence before a device is marked OFFLINE. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Base URL of the backend REST API. No trailing slash. |
| `NEXT_PUBLIC_WS_URL` | `frontend/.env.local` | URL of the Socket.IO server (same as backend). |
| `NEXT_PUBLIC_USE_MOCK_API` | `frontend/.env.local` | `false` for real backend; `true` for standalone mock data. |

---

## 7. Starting Everything Together

Follow this exact sequence every time you set up the system for testing or demonstration. Starting in a different order (e.g., backend before Mosquitto) will cause connection errors.

```
┌─────────────────────────────────────────────────────────────┐
│               Startup Sequence (Fixed Order)                │
│                                                             │
│  Step 1  ──►  PostgreSQL                                    │
│  Step 2  ──►  Mosquitto MQTT Broker                         │
│  Step 3  ──►  Backend (Node.js)                             │
│  Step 4  ──►  MQTT Simulator OR ESP32 (not both)            │
│  Step 5  ──►  Frontend (Next.js)                            │
│  Step 6  ──►  Browser                                       │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Start PostgreSQL

PostgreSQL is typically configured to auto-start with Windows. Verify it is running:
```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*
```

If the status shows `Stopped`:
```powershell
# Replace 'postgresql-x64-16' with your actual service name
Start-Service -Name "postgresql-x64-16"
```

Alternatively, open **pgAdmin 4** and verify you can connect to the `smart_monitor` database.

---

### Step 2: Start Mosquitto MQTT Broker

**Open Terminal 1:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
mosquitto -c mosquitto.conf -v
```

Wait for:
```
mosquitto version X.X.X running
```

Leave this terminal open. **Do not close it.**

---

### Step 3: Start Backend

**Open Terminal 2:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
npm run dev
```

Wait for:
```
[Backend] Server running on port 3001
[Backend] Connected to PostgreSQL database
[Backend] MQTT client connected to mqtt://localhost:1883
[Backend] Subscribed to topic: resource/readings
```

Verify:
```powershell
curl http://localhost:3001/api/health
```

Leave this terminal open. **Do not close it.**

---

### Step 4a: Start MQTT Simulator (Phase A — No ESP32)

**Open Terminal 3:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
npx ts-node scripts/mqtt-simulator.ts
```

Wait for:
```
[Simulator] Connected to MQTT broker at mqtt://localhost:1883
[Simulator] Publishing to topic: resource/readings every 5000ms
```

Leave this terminal open. **Do not close it.**

---

### Step 4b: Power on ESP32 (Phase B — With Hardware)

1. Connect the ESP32 to power (USB or battery)
2. Open Serial Monitor at 115200 baud
3. Confirm:
   ```
   [ESP32] Wi-Fi connected!
   [ESP32] MQTT connected!
   [ESP32] Publishing to resource/readings ...
   ```
4. Confirm backend terminal shows incoming messages

Do **not** run both the simulator and the ESP32 at the same time — they will both publish with `deviceId: "esp32-01"` which will confuse the anomaly detection baseline.

---

### Step 5: Start Frontend

**Open Terminal 4:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\frontend"
npm run dev
```

Wait for:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

---

### Step 6: Open the Dashboard

Open a browser and navigate to:
```
http://localhost:3000
```

**What you should see within 10 seconds:**
- Dashboard loads with a header, stat cards, and charts
- Stat cards show live values (not zeros)
- Charts have at least one data point
- Device status shows `ONLINE`
- No error banners

---

## 8. Docker Compose (Optional)

> [!NOTE]
> This Docker Compose file runs **PostgreSQL** and **Mosquitto** in containers, while the **backend** and **frontend** continue to run natively on the host machine. This is the recommended approach for development because it avoids the need to install and configure PostgreSQL and Mosquitto manually.

### Prerequisites

- Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
- Ensure Docker Desktop is running before using these commands.

### File: `docker-compose.yml`

Place this file in the project root: `d:\Work\Smart IoT Based Water and Electricity Monitoring\docker-compose.yml`

```yaml
version: '3.9'

# =============================================================
# Smart IoT Water and Electricity Monitor
# Docker Compose — Infrastructure Services
# (PostgreSQL + Mosquitto)
# Backend and Frontend run on host via npm run dev
# =============================================================

services:

  # -----------------------------------------------------------
  # PostgreSQL Database
  # -----------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: smart_monitor_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: smart_monitor
    ports:
      - "5432:5432"           # Host port 5432 → Container port 5432
    volumes:
      - postgres_data:/var/lib/postgresql/data   # Persist data across container restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # -----------------------------------------------------------
  # Mosquitto MQTT Broker
  # -----------------------------------------------------------
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: smart_monitor_mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"           # MQTT — Host port 1883 → Container port 1883
      - "9001:9001"           # WebSocket MQTT (optional, for browser-based MQTT clients)
    volumes:
      - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    healthcheck:
      test: ["CMD", "mosquitto_sub", "-t", "$$SYS/#", "-C", "1", "-i", "healthcheck", "-W", "3"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  mosquitto_data:
    driver: local
  mosquitto_log:
    driver: local
```

### Required: Mosquitto Config for Docker

Create the file `mosquitto/config/mosquitto.conf` in the project root:

```conf
# =============================================================
# Mosquitto Configuration for Docker
# =============================================================

# Allow anonymous connections (development only)
allow_anonymous true

# Listen on all interfaces on port 1883 (MQTT)
listener 1883 0.0.0.0

# Listen on port 9001 for WebSocket connections (optional)
listener 9001 0.0.0.0
protocol websockets

# Persistence
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
```

### Docker Commands

**Start infrastructure containers:**
```powershell
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring"

# Start PostgreSQL and Mosquitto in the background
docker compose up -d

# Check both containers are running
docker compose ps
```

Expected output:
```
NAME                        STATUS          PORTS
smart_monitor_mosquitto     Up (healthy)    0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
smart_monitor_postgres      Up (healthy)    0.0.0.0:5432->5432/tcp
```

**View logs:**
```powershell
# PostgreSQL logs
docker compose logs postgres -f

# Mosquitto logs
docker compose logs mosquitto -f
```

**Stop containers:**
```powershell
docker compose stop
```

**Stop and remove containers (data is preserved in volumes):**
```powershell
docker compose down
```

**Stop and remove containers AND all data (nuclear option — destroys all stored readings):**
```powershell
docker compose down -v
```

> [!WARNING]
> `docker compose down -v` deletes all PostgreSQL data permanently. Only use this when you want a completely fresh database (e.g., before a fresh demo setup).

### Backend `.env` Update for Docker

When using Docker for PostgreSQL, the `DATABASE_URL` in `backend/.env` stays the same because Docker maps container port 5432 to host port 5432:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_monitor"
```

When using Docker for Mosquitto, the `MQTT_BROKER_URL` in `backend/.env` stays the same because Docker maps container port 1883 to host port 1883:
```env
MQTT_BROKER_URL="mqtt://localhost:1883"
```

No changes to the backend or frontend code are needed when switching between native-installed and Docker-based infrastructure.

---

## 9. Integration Checklist

Use this checklist as a final verification pass **before the project demonstration**. All items must be checked. Do this with all three members present.

### Infrastructure

- [ ] PostgreSQL is running and the `smart_monitor` database exists
- [ ] Mosquitto is running and listening on port 1883
- [ ] Windows Firewall allows port 1883 inbound (verified with `mosquitto_sub` from another device)
- [ ] Backend starts without errors and shows `db: connected` and `mqtt: connected`
- [ ] `curl http://localhost:3001/api/health` returns `{ "success": true, "data": { "status": "ok" } }`
- [ ] Frontend starts without errors and loads at `http://localhost:3000`

### Hardware (Phase B)

- [ ] ESP32 connects to Wi-Fi (visible in Serial Monitor: `Wi-Fi connected!`)
- [ ] ESP32 connects to Mosquitto MQTT broker (`MQTT connected!`)
- [ ] ESP32 publishes a correctly formatted JSON payload every 5 seconds (verified by Serial Monitor)
- [ ] Mosquitto receives and logs messages from `deviceId: esp32-01`
- [ ] `mosquitto_sub -h localhost -t resource/readings` shows incoming payloads

### Data Pipeline

- [ ] Backend receives MQTT messages (backend terminal shows "Reading saved to DB")
- [ ] Readings appear in PostgreSQL: `SELECT COUNT(*) FROM "Reading";` returns a growing number
- [ ] `GET /api/readings/latest` returns a recent timestamp (within last 10 seconds)
- [ ] `GET /api/dashboard/summary` returns correct today totals

### Anomaly Detection

- [ ] Sending a HIGH_FLOW payload (flowRate > 15.0) triggers anomaly detection in backend logs
- [ ] Anomaly is stored in DB: `GET /api/anomalies` returns the anomaly
- [ ] Anomaly is broadcast via `anomaly:created` WebSocket event (visible in browser console log)
- [ ] Frontend anomaly panel shows the triggered anomaly
- [ ] Frontend shows a toast/alert notification when anomaly arrives

### Frontend Dashboard

- [ ] Dashboard loads without any blank sections or console errors
- [ ] **Flow Rate stat card** shows the current live value from ESP32
- [ ] **Power stat card** shows the current live value from ESP32
- [ ] **Energy stat card** shows today's cumulative kWh
- [ ] **Total Volume stat card** shows today's total water in litres
- [ ] **Water flow chart** shows a live updating line graph with last 24h data
- [ ] **Electricity chart** shows a live updating line graph with last 24h data
- [ ] Charts update within 2 seconds of a new reading (verified by watching chart while ESP32 publishes)
- [ ] **Device Status banner** shows `ONLINE` (green) when ESP32 is connected
- [ ] **Device Status banner** shows `OFFLINE` (red) within 30 seconds of disconnecting ESP32
- [ ] Status returns to `ONLINE` (green) within 10 seconds of reconnecting ESP32
- [ ] Anomaly panel lists unresolved anomalies
- [ ] Resolving an anomaly via the UI calls `PATCH /api/anomalies/:id/resolve` and removes it from the list

### Team Member Demo Readiness

- [ ] **Member 1** can explain: sensor wiring, Arduino/PlatformIO firmware, MQTT publish logic, JSON payload construction, Wi-Fi + MQTT connection code
- [ ] **Member 2** can explain: MQTT subscription, Prisma schema, Express routes, Prisma query for readings, anomaly detection thresholds, Socket.IO event emission
- [ ] **Member 3** can explain: `useSocket` hook implementation, React state management for charts, API data fetching, Recharts configuration, `.env.local` configuration
- [ ] All three members can describe what happens at each step when a water reading is taken (end-to-end flow)

---

*Document maintained by the project team. Update this guide when any interface contract, port, or configuration changes.*
