# API Documentation — Smart IoT-Based Water and Electricity Monitoring System

> **Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System
> **Document Type:** REST API & WebSocket Reference
> **Backend Runtime:** Node.js with Express.js
> **Database:** PostgreSQL 15 (via Prisma ORM)
> **Real-Time Layer:** Socket.IO
> **Version:** 1.0.0 (Prototype)
> **Last Updated:** 2026-09-22
> **Author:** Member 2 — Backend & Hardware Integration

> [!IMPORTANT]
> Current integration uses `/api/v1` (also available as `/api`), PostgreSQL, Prisma, and direct JSON responses. Historical sections that mention SQLite, Sequelize, numeric IDs, response envelopes, or `/current` and `/today` routes are not implemented by the current backend.

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Standard Response Formats](#2-standard-response-formats)
3. [Health Check](#3-health-check)
4. [Device Endpoints](#4-device-endpoints)
5. [Water Endpoints](#5-water-endpoints)
6. [Electricity Endpoints](#6-electricity-endpoints)
7. [Anomaly Endpoints](#7-anomaly-endpoints)
8. [WebSocket Events (Socket.IO)](#8-websocket-events-socketio)
9. [Error Codes Reference](#9-error-codes-reference)
10. [Rate Limiting](#10-rate-limiting)
11. [Complete TypeScript Type Definitions](#11-complete-typescript-type-definitions)
12. [Example curl Commands](#12-example-curl-commands)

---

## 1. API Overview

### Base Configuration

| Property         | Value                              |
|------------------|------------------------------------|
| **Base URL**     | `http://localhost:3001/api/v1`     |
| **Protocol**     | HTTP/1.1                           |
| **Data Format**  | JSON (`application/json`)          |
| **Authentication** | None (prototype — open access)   |
| **CORS**         | Enabled for all origins (`*`)      |
| **Socket.IO URL**| `http://localhost:3001`            |

### How This API Fits Into the System

The Node.js/Express backend serves as the central hub of the monitoring system:

```
ESP32 Hardware  ──(MQTT)──►  Mosquitto  ──►  Express Backend  ──(Prisma)──►  PostgreSQL DB
                                       │
                                       ├──(REST GET)──►  React Dashboard
                                       └──(Socket.IO)──► React Dashboard (live)
```

The ESP32 microcontroller periodically `POST`s sensor readings to internal routes (see backend source). The React dashboard (Member 3) consumes **only** the `GET` endpoints documented here, plus receives real-time events over Socket.IO.

> [!IMPORTANT]
> All timestamps returned by the API are **ISO 8601 UTC strings**, e.g. `"2026-09-22T14:19:30.000Z"`. The frontend must convert these to the local timezone (IST, UTC+5:30) for display.

### Error Response Format

Every error from this API follows a consistent shape:

```json
{
  "error": "Human-readable error message",
  "details": "<optional — validation errors array or extra context>"
}
```

The `details` field is present only when the error involves validation failures (e.g., missing required query parameters). For simple errors such as 404, only `error` is returned.

---

## 2. Standard Response Formats

### 2.1 Success Response

There is no envelope wrapper for simple resource responses. The resource (or array of resources) is returned directly at the top level. For summary/aggregated endpoints, a clearly named object is returned.

**Single resource (e.g., GET /api/devices/:id):**

```json
{
  "id": 1,
  "deviceId": "esp32-01",
  "name": "Main Controller",
  "status": "online",
  "lastSeenAt": "2026-09-22T14:19:30.000Z",
  "rssi": -62,
  "freeHeap": 182340,
  "createdAt": "2026-09-01T08:00:00.000Z",
  "updatedAt": "2026-09-22T14:19:30.000Z"
}
```

**Array resource (e.g., GET /api/devices):**

```json
[
  { ... },
  { ... }
]
```

**Summary response (e.g., GET /api/water/today):**

```json
{
  "readings": [ ... ],
  "totalLitres": 142.5,
  "avgFlowRate": 3.2,
  "peakFlowRate": 8.7,
  "readingCount": 48
}
```

### 2.2 Error Response

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "from", "message": "'from' is required and must be an ISO datetime string" },
    { "field": "to",   "message": "'to' is required and must be an ISO datetime string" }
  ]
}
```

### 2.3 Pagination

This prototype does **not** implement cursor-based or page-number pagination. Instead, endpoints that may return large datasets accept a `limit` query parameter to cap the number of records returned. The response includes a `count` field indicating how many records were returned.

If the dataset is expected to grow in a production version, the following envelope would be adopted:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalRecords": 4820,
    "totalPages": 49,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 3. Health Check

### `GET /api/health`

**Purpose:** Verify that the Express backend is running and that its SQLite database connection is healthy. This endpoint is also used by the React dashboard's startup sequence to confirm the backend is reachable before attempting data fetches.

**Authentication:** None

**Request Body:** None

**Query Parameters:** None

---

#### Success Response — `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-09-22T14:19:30.123Z",
  "uptime": 3482.91,
  "database": "connected"
}
```

| Field        | Type     | Description                                                                 |
|--------------|----------|-----------------------------------------------------------------------------|
| `status`     | `string` | Always `"ok"` when the service is healthy.                                  |
| `timestamp`  | `string` | ISO 8601 UTC timestamp of the moment the health check was processed.        |
| `uptime`     | `number` | Number of seconds since the Node.js process started (`process.uptime()`).  |
| `database`   | `string` | `"connected"` if Sequelize can authenticate; `"disconnected"` otherwise.   |

---

#### Error Response — `500 Internal Server Error`

Returned if the database connection cannot be verified (e.g., file locked, corrupted database).

```json
{
  "status": "error",
  "timestamp": "2026-09-22T14:19:30.123Z",
  "uptime": 3482.91,
  "database": "disconnected",
  "error": "Database authentication failed"
}
```

---

## 4. Device Endpoints

Devices represent physical ESP32 hardware units. Each device registers itself automatically on first contact with the backend. The device record stores metadata such as connection quality and heap memory, which help diagnose hardware health.

---

### `GET /api/devices`

**Purpose:** Return a list of all registered ESP32 devices known to the backend.

**Authentication:** None

**Request Body:** None

**Query Parameters:** None

---

#### Success Response — `200 OK`

Returns a JSON array. If no devices are registered yet, returns an empty array `[]`.

```json
[
  {
    "id": 1,
    "deviceId": "esp32-01",
    "name": "Main Controller",
    "status": "online",
    "lastSeenAt": "2026-09-22T14:19:30.000Z",
    "rssi": -62,
    "freeHeap": 182340,
    "createdAt": "2026-09-01T08:00:00.000Z",
    "updatedAt": "2026-09-22T14:19:30.000Z"
  }
]
```

#### Device Object Field Reference

| Field        | Type              | Description                                                                          |
|--------------|-------------------|--------------------------------------------------------------------------------------|
| `id`         | `number`          | Auto-incremented primary key (internal database ID).                                 |
| `deviceId`   | `string`          | Human-readable device identifier. Configured in ESP32 firmware (e.g. `"esp32-01"`). |
| `name`       | `string`          | Friendly display name for the device (e.g. `"Main Controller"`).                    |
| `status`     | `"online" \| "offline"` | Current connectivity status. Set to `"offline"` if `lastSeenAt` is > 5 minutes ago. |
| `lastSeenAt` | `string`          | ISO 8601 UTC timestamp of the last received reading from this device.                |
| `rssi`       | `number \| null`  | Wi-Fi signal strength in dBm (e.g. `-62`). `null` if not reported.                  |
| `freeHeap`   | `number \| null`  | Free heap memory on the ESP32 in bytes. Useful for diagnosing memory leaks.          |
| `createdAt`  | `string`          | ISO 8601 UTC timestamp when the device first registered.                             |
| `updatedAt`  | `string`          | ISO 8601 UTC timestamp of the most recent record update.                             |

---

### `GET /api/devices/:id`

**Purpose:** Retrieve a single device record by its `deviceId` string (not its numeric primary key).

**Authentication:** None

**Request Body:** None

**URL Parameters:**

| Parameter | Type     | Required | Description                                               |
|-----------|----------|----------|-----------------------------------------------------------|
| `id`      | `string` | Yes      | The `deviceId` of the device (e.g. `esp32-01`).          |

---

#### Success Response — `200 OK`

```json
{
  "id": 1,
  "deviceId": "esp32-01",
  "name": "Main Controller",
  "status": "online",
  "lastSeenAt": "2026-09-22T14:19:30.000Z",
  "rssi": -62,
  "freeHeap": 182340,
  "createdAt": "2026-09-01T08:00:00.000Z",
  "updatedAt": "2026-09-22T14:19:30.000Z"
}
```

---

#### Error Response — `404 Not Found`

```json
{
  "error": "Device not found"
}
```

---

## 5. Water Endpoints

These endpoints expose data from the YF-S201 hall-effect water flow sensor attached to the ESP32. Flow rate is measured in litres per minute (L/min) and cumulative volume in litres (L).

---

### `GET /api/water/current`

**Purpose:** Return the single most recent water flow reading recorded in the database. Used by the React dashboard to display the live flow rate gauge and total volume counter.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                                            |
|------------|----------|----------|--------------|--------------------------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this specific device.               |

---

#### Success Response — `200 OK`

```json
{
  "id": 5842,
  "deviceId": "esp32-01",
  "flowRateLpm": 3.74,
  "totalLitres": 1842.56,
  "timestamp": "2026-09-22T14:19:25.000Z",
  "createdAt": "2026-09-22T14:19:25.412Z"
}
```

#### WaterReading Field Reference

| Field          | Type     | Description                                                                              |
|----------------|----------|------------------------------------------------------------------------------------------|
| `id`           | `number` | Auto-incremented primary key.                                                            |
| `deviceId`     | `string` | The device that generated this reading.                                                  |
| `flowRateLpm`  | `number` | Instantaneous flow rate in litres per minute at the time of the reading.                 |
| `totalLitres`  | `number` | Cumulative total litres passed through the sensor since the ESP32 was last reset.        |
| `timestamp`    | `string` | ISO 8601 UTC — the moment the ESP32 captured the sensor reading.                        |
| `createdAt`    | `string` | ISO 8601 UTC — the moment the backend stored the record (may differ from `timestamp`).  |

---

#### Error Response — `404 Not Found`

```json
{
  "error": "No readings found"
}
```

---

### `GET /api/water/today`

**Purpose:** Return all water flow readings from midnight of the current calendar day (local server time, IST) up to the current moment, along with a computed summary. Used to populate the "Today's Usage" card on the dashboard.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                        |
|------------|----------|----------|--------------|------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this device.    |

---

#### Success Response — `200 OK`

```json
{
  "readings": [
    {
      "id": 5800,
      "deviceId": "esp32-01",
      "flowRateLpm": 0.00,
      "totalLitres": 1799.10,
      "timestamp": "2026-09-22T00:00:05.000Z",
      "createdAt": "2026-09-22T00:00:05.312Z"
    },
    {
      "id": 5842,
      "deviceId": "esp32-01",
      "flowRateLpm": 3.74,
      "totalLitres": 1842.56,
      "timestamp": "2026-09-22T14:19:25.000Z",
      "createdAt": "2026-09-22T14:19:25.412Z"
    }
  ],
  "totalLitres": 43.46,
  "avgFlowRate": 2.18,
  "peakFlowRate": 8.91,
  "readingCount": 42
}
```

#### Response Fields

| Field          | Type               | Description                                                                              |
|----------------|--------------------|------------------------------------------------------------------------------------------|
| `readings`     | `WaterReading[]`   | Ordered array of all readings from midnight to now (ascending by `timestamp`).           |
| `totalLitres`  | `number`           | Total litres consumed today: `lastReading.totalLitres - firstReading.totalLitres`.       |
| `avgFlowRate`  | `number`           | Average of all `flowRateLpm` values recorded today.                                      |
| `peakFlowRate` | `number`           | Maximum `flowRateLpm` recorded today.                                                    |
| `readingCount` | `number`           | Total number of individual readings in today's window.                                   |

---

### `GET /api/water/history`

**Purpose:** Return all water readings within a user-specified time window. Used by the dashboard's historical chart view to plot flow rate over time.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                                                       |
|------------|----------|----------|--------------|-------------------------------------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this device.                                   |
| `from`     | `string` | **Yes**  | —            | Start of time range as an ISO 8601 datetime string (inclusive).   |
| `to`       | `string` | **Yes**  | —            | End of time range as an ISO 8601 datetime string (inclusive).     |
| `limit`    | `number` | No       | `100`        | Maximum number of records to return. Capped at `500`.             |

> [!IMPORTANT]
> Both `from` and `to` are **required**. Omitting either will result in a `400 Bad Request` response. The `from` value must be earlier than `to`.

---

#### Success Response — `200 OK`

```json
{
  "readings": [
    {
      "id": 5100,
      "deviceId": "esp32-01",
      "flowRateLpm": 1.22,
      "totalLitres": 1620.10,
      "timestamp": "2026-09-21T06:00:00.000Z",
      "createdAt": "2026-09-21T06:00:00.211Z"
    }
  ],
  "count": 1,
  "from": "2026-09-21T00:00:00.000Z",
  "to": "2026-09-21T23:59:59.000Z"
}
```

| Field      | Type             | Description                                                          |
|------------|------------------|----------------------------------------------------------------------|
| `readings` | `WaterReading[]` | Readings within the specified range, ordered by `timestamp` ASC.     |
| `count`    | `number`         | Number of readings returned (may be less than `limit`).              |
| `from`     | `string`         | The `from` query param echoed back (for frontend confirmation).      |
| `to`       | `string`         | The `to` query param echoed back.                                    |

---

#### Error Response — `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "from", "message": "'from' is required and must be a valid ISO datetime string" },
    { "field": "to",   "message": "'to' is required and must be a valid ISO datetime string" }
  ]
}
```

---

### `GET /api/water/summary`

**Purpose:** Return one aggregated summary record per calendar day for the last N days. This powers the weekly/monthly bar chart on the dashboard, showing daily consumption at a glance.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                                                     |
|------------|----------|----------|--------------|-----------------------------------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter data to this device.                                     |
| `days`     | `number` | No       | `7`          | Number of past days to summarise (including today). Max `30`.   |

---

#### Success Response — `200 OK`

```json
{
  "summary": [
    {
      "date": "2026-09-16",
      "totalLitres": 198.34,
      "avgFlowRate": 2.97,
      "peakFlowRate": 9.12,
      "readingCount": 143
    },
    {
      "date": "2026-09-17",
      "totalLitres": 175.22,
      "avgFlowRate": 2.63,
      "peakFlowRate": 7.55,
      "readingCount": 138
    },
    {
      "date": "2026-09-22",
      "totalLitres": 43.46,
      "avgFlowRate": 2.18,
      "peakFlowRate": 8.91,
      "readingCount": 42
    }
  ],
  "period": "2026-09-16 to 2026-09-22"
}
```

| Field                   | Type                       | Description                                                                                 |
|-------------------------|----------------------------|---------------------------------------------------------------------------------------------|
| `summary`               | `WaterDailySummary[]`      | One entry per calendar day, ordered ascending by `date`.                                    |
| `summary[].date`        | `string`                   | Calendar date in `YYYY-MM-DD` format (local server timezone, IST).                          |
| `summary[].totalLitres` | `number`                   | Total litres consumed on that day.                                                          |
| `summary[].avgFlowRate` | `number`                   | Average flow rate (L/min) across all readings on that day.                                  |
| `summary[].peakFlowRate`| `number`                   | Maximum instantaneous flow rate (L/min) recorded on that day.                               |
| `summary[].readingCount`| `number`                   | Number of individual sensor readings on that day.                                           |
| `period`                | `string`                   | Human-readable summary of the date range covered (e.g. `"2026-09-16 to 2026-09-22"`).       |

> [!NOTE]
> Days with zero readings will still appear in the `summary` array with all numeric fields set to `0`. This ensures the frontend bar chart always has a fixed number of bars to render.

---

## 6. Electricity Endpoints

These endpoints expose data from the PZEM-004T v3 energy monitoring module (or ACS712 current sensor + ZMPT101B voltage sensor, depending on build configuration). All power values are in watts (W) and energy in kilowatt-hours (kWh).

---

### `GET /api/electricity/current`

**Purpose:** Return the single most recent electricity reading from the database. Used for live voltage, current, and power display on the dashboard.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                         |
|------------|----------|----------|--------------|-------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this device.     |

---

#### Success Response — `200 OK`

```json
{
  "id": 6021,
  "deviceId": "esp32-01",
  "voltage": 231.4,
  "current": 2.13,
  "power": 491.9,
  "energyKwh": 4.812,
  "timestamp": "2026-09-22T14:19:28.000Z",
  "createdAt": "2026-09-22T14:19:28.511Z"
}
```

#### ElectricityReading Field Reference

| Field        | Type     | Description                                                                                     |
|--------------|----------|-------------------------------------------------------------------------------------------------|
| `id`         | `number` | Auto-incremented primary key.                                                                   |
| `deviceId`   | `string` | The device that generated this reading.                                                         |
| `voltage`    | `number` | RMS voltage in volts (V). Typical range: 210–240 V for Indian grid.                            |
| `current`    | `number` | RMS current in amperes (A).                                                                     |
| `power`      | `number` | Active power in watts (W). Derived as `voltage × current × powerFactor` on the ESP32.          |
| `energyKwh`  | `number` | Cumulative energy consumed in kilowatt-hours since the ESP32 was last reset.                    |
| `timestamp`  | `string` | ISO 8601 UTC — the moment the ESP32 captured the sensor reading.                               |
| `createdAt`  | `string` | ISO 8601 UTC — the moment the backend stored the record.                                       |

---

#### Error Response — `404 Not Found`

```json
{
  "error": "No readings found"
}
```

---

### `GET /api/electricity/today`

**Purpose:** Return all electricity readings from midnight of the current day to now, along with computed aggregates. Used by the dashboard's energy summary card.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                        |
|------------|----------|----------|--------------|------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this device.    |

---

#### Success Response — `200 OK`

```json
{
  "readings": [
    {
      "id": 5900,
      "deviceId": "esp32-01",
      "voltage": 230.1,
      "current": 0.05,
      "power": 11.5,
      "energyKwh": 4.762,
      "timestamp": "2026-09-22T00:00:04.000Z",
      "createdAt": "2026-09-22T00:00:04.211Z"
    }
  ],
  "totalEnergyKwh": 0.87,
  "avgPower": 312.4,
  "peakPower": 1450.0,
  "avgVoltage": 230.8,
  "avgCurrent": 1.35,
  "readingCount": 56
}
```

#### Response Fields

| Field             | Type                      | Description                                                                                   |
|-------------------|---------------------------|-----------------------------------------------------------------------------------------------|
| `readings`        | `ElectricityReading[]`    | All readings from midnight to now, ordered by `timestamp` ASC.                                |
| `totalEnergyKwh`  | `number`                  | Total energy consumed today: `lastReading.energyKwh - firstReading.energyKwh`.                |
| `avgPower`        | `number`                  | Mean of all `power` values recorded today (W).                                                |
| `peakPower`       | `number`                  | Maximum `power` value recorded today (W).                                                     |
| `avgVoltage`      | `number`                  | Mean of all `voltage` values recorded today (V).                                              |
| `avgCurrent`      | `number`                  | Mean of all `current` values recorded today (A).                                              |
| `readingCount`    | `number`                  | Total number of individual readings in today's window.                                        |

---

### `GET /api/electricity/history`

**Purpose:** Return electricity readings within a specified time window. Used by the dashboard to render historical power/voltage/current charts.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                                                       |
|------------|----------|----------|--------------|-------------------------------------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter readings to this device.                                   |
| `from`     | `string` | **Yes**  | —            | Start of time range as an ISO 8601 datetime string (inclusive).   |
| `to`       | `string` | **Yes**  | —            | End of time range as an ISO 8601 datetime string (inclusive).     |
| `limit`    | `number` | No       | `100`        | Maximum number of records to return. Capped at `500`.             |

---

#### Success Response — `200 OK`

```json
{
  "readings": [
    {
      "id": 5300,
      "deviceId": "esp32-01",
      "voltage": 229.8,
      "current": 1.87,
      "power": 430.0,
      "energyKwh": 3.201,
      "timestamp": "2026-09-21T08:00:00.000Z",
      "createdAt": "2026-09-21T08:00:00.317Z"
    }
  ],
  "count": 1,
  "from": "2026-09-21T00:00:00.000Z",
  "to": "2026-09-21T23:59:59.000Z"
}
```

| Field      | Type                   | Description                                                       |
|------------|------------------------|-------------------------------------------------------------------|
| `readings` | `ElectricityReading[]` | Readings within the specified range, ordered by `timestamp` ASC.  |
| `count`    | `number`               | Number of readings returned.                                      |
| `from`     | `string`               | Echoed `from` parameter.                                          |
| `to`       | `string`               | Echoed `to` parameter.                                            |

---

#### Error Response — `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "from", "message": "'from' is required and must be a valid ISO datetime string" },
    { "field": "to",   "message": "'to' is required and must be a valid ISO datetime string" }
  ]
}
```

---

### `GET /api/electricity/summary`

**Purpose:** Return one aggregated electricity summary per calendar day for the last N days. Used for the daily energy consumption bar chart.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default      | Description                                                     |
|------------|----------|----------|--------------|-----------------------------------------------------------------|
| `deviceId` | `string` | No       | `"esp32-01"` | Filter data to this device.                                     |
| `days`     | `number` | No       | `7`          | Number of past days to summarise (including today). Max `30`.   |

---

#### Success Response — `200 OK`

```json
{
  "summary": [
    {
      "date": "2026-09-16",
      "totalEnergyKwh": 3.41,
      "avgPower": 327.8,
      "peakPower": 1480.0,
      "avgVoltage": 230.2,
      "avgCurrent": 1.42,
      "readingCount": 287
    },
    {
      "date": "2026-09-17",
      "totalEnergyKwh": 2.98,
      "avgPower": 286.4,
      "peakPower": 1210.0,
      "avgVoltage": 231.0,
      "avgCurrent": 1.24,
      "readingCount": 276
    },
    {
      "date": "2026-09-22",
      "totalEnergyKwh": 0.87,
      "avgPower": 312.4,
      "peakPower": 1450.0,
      "avgVoltage": 230.8,
      "avgCurrent": 1.35,
      "readingCount": 56
    }
  ],
  "period": "2026-09-16 to 2026-09-22"
}
```

| Field                      | Type                          | Description                                                                  |
|----------------------------|-------------------------------|------------------------------------------------------------------------------|
| `summary`                  | `ElectricityDailySummary[]`   | One entry per calendar day, ordered ascending by `date`.                     |
| `summary[].date`           | `string`                      | Calendar date in `YYYY-MM-DD` format.                                        |
| `summary[].totalEnergyKwh` | `number`                      | Total energy consumed on that day (kWh).                                     |
| `summary[].avgPower`       | `number`                      | Average active power (W) across all readings on that day.                    |
| `summary[].peakPower`      | `number`                      | Maximum instantaneous power (W) recorded on that day.                        |
| `summary[].avgVoltage`     | `number`                      | Average RMS voltage (V) on that day.                                         |
| `summary[].avgCurrent`     | `number`                      | Average RMS current (A) on that day.                                         |
| `summary[].readingCount`   | `number`                      | Number of individual readings on that day.                                   |
| `period`                   | `string`                      | Human-readable date range covered.                                           |

---

## 7. Anomaly Endpoints

The backend includes a lightweight rule-based anomaly detection engine that runs on every incoming sensor reading. Anomalies are stored in the `Anomalies` table and surfaced via these endpoints. The dashboard uses them to populate the alerts/notification panel.

**Anomaly Detection Rules:**

| Resource    | Rule                                                                 | Severity |
|-------------|----------------------------------------------------------------------|----------|
| Water       | Flow rate > 15 L/min (possible burst or leak)                        | `high`   |
| Water       | Flow rate > 8 L/min sustained for > 30 s                            | `medium` |
| Water       | Non-zero flow between 01:00–04:00 local time (unusual usage)         | `low`    |
| Electricity | Power > 3000 W (above typical household peak)                        | `high`   |
| Electricity | Voltage < 180 V or voltage > 260 V (grid instability)               | `medium` |
| Electricity | Power spike > 200% of rolling 5-min average                         | `medium` |

---

### `GET /api/anomalies`

**Purpose:** Return a filtered, paginated list of detected anomalies. Used by the dashboard alerts panel and historical alert log.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter      | Type                               | Required | Default | Description                                                           |
|----------------|------------------------------------|----------|---------|-----------------------------------------------------------------------|
| `deviceId`     | `string`                           | No       | all     | Filter anomalies to a specific device.                                |
| `resourceType` | `"water" \| "electricity"`         | No       | all     | Filter by sensor type.                                                |
| `severity`     | `"low" \| "medium" \| "high"`     | No       | all     | Filter by severity level.                                             |
| `from`         | `string`                           | No       | —       | Filter anomalies with `timestamp` >= this ISO 8601 datetime.          |
| `to`           | `string`                           | No       | —       | Filter anomalies with `timestamp` <= this ISO 8601 datetime.          |
| `limit`        | `number`                           | No       | `50`    | Maximum number of records to return. Capped at `200`.                 |
| `resolved`     | `boolean`                          | No       | all     | `true` = only resolved anomalies; `false` = only unresolved.          |

---

#### Success Response — `200 OK`

```json
{
  "anomalies": [
    {
      "id": 42,
      "deviceId": "esp32-01",
      "resourceType": "water",
      "severity": "high",
      "message": "Flow rate 17.3 L/min exceeds threshold of 15 L/min — possible pipe burst or open tap",
      "actualValue": 17.3,
      "baselineValue": 3.2,
      "threshold": 15.0,
      "resolvedAt": null,
      "timestamp": "2026-09-22T11:34:12.000Z",
      "createdAt": "2026-09-22T11:34:12.887Z"
    },
    {
      "id": 41,
      "deviceId": "esp32-01",
      "resourceType": "electricity",
      "severity": "medium",
      "message": "Voltage 172.4 V is below safe minimum of 180 V — possible grid undervoltage event",
      "actualValue": 172.4,
      "baselineValue": 230.0,
      "threshold": 180.0,
      "resolvedAt": "2026-09-22T11:20:00.000Z",
      "timestamp": "2026-09-22T11:15:00.000Z",
      "createdAt": "2026-09-22T11:15:01.201Z"
    }
  ],
  "count": 2
}
```

#### Anomaly Object Field Reference

| Field           | Type                               | Description                                                                                    |
|-----------------|------------------------------------|------------------------------------------------------------------------------------------------|
| `id`            | `number`                           | Auto-incremented primary key.                                                                  |
| `deviceId`      | `string`                           | The device that triggered this anomaly.                                                        |
| `resourceType`  | `"water" \| "electricity"`         | Which sensor type triggered the anomaly.                                                       |
| `severity`      | `"low" \| "medium" \| "high"`     | Severity classification based on rule thresholds.                                              |
| `message`       | `string`                           | Human-readable description of the anomaly, including measured and threshold values.            |
| `actualValue`   | `number`                           | The measured sensor value that triggered the anomaly.                                          |
| `baselineValue` | `number`                           | The expected/normal value for comparison context.                                              |
| `threshold`     | `number`                           | The rule threshold that was exceeded.                                                          |
| `resolvedAt`    | `string \| null`                   | ISO 8601 UTC timestamp when the condition returned to normal. `null` if still active.          |
| `timestamp`     | `string`                           | ISO 8601 UTC — the time the anomalous reading was captured.                                    |
| `createdAt`     | `string`                           | ISO 8601 UTC — the time the anomaly record was written.                                        |

---

### `GET /api/anomalies/recent`

**Purpose:** Shortcut endpoint returning all anomalies detected within the last 24 hours. Used by the dashboard notification badge to show a quick count of recent issues.

**Authentication:** None

**Request Body:** None

**Query Parameters:**

| Parameter  | Type     | Required | Default | Description                                              |
|------------|----------|----------|---------|----------------------------------------------------------|
| `deviceId` | `string` | No       | all     | Filter anomalies to a specific device.                   |

---

#### Success Response — `200 OK`

```json
{
  "anomalies": [
    {
      "id": 42,
      "deviceId": "esp32-01",
      "resourceType": "water",
      "severity": "high",
      "message": "Flow rate 17.3 L/min exceeds threshold of 15 L/min — possible pipe burst or open tap",
      "actualValue": 17.3,
      "baselineValue": 3.2,
      "threshold": 15.0,
      "resolvedAt": null,
      "timestamp": "2026-09-22T11:34:12.000Z",
      "createdAt": "2026-09-22T11:34:12.887Z"
    }
  ],
  "count": 1
}
```

---

## 8. WebSocket Events (Socket.IO)

In addition to the REST API, the backend exposes a **Socket.IO** server on the same port (`3001`). The React dashboard connects to this for real-time updates without polling. All events are emitted on the default namespace (`/`).

### Connecting from the Frontend

```javascript
// React Dashboard (Member 3)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);

  // Optional: subscribe to a specific device room
  socket.emit('subscribe', { deviceId: 'esp32-01' });
});

socket.on('disconnect', (reason) => {
  console.warn('Socket disconnected:', reason);
});
```

---

### Server → Client Events

These events are **emitted by the backend** and **received by the React dashboard**.

---

#### `water:reading`

**Trigger:** Emitted immediately after a new water flow reading is successfully validated and persisted to the database.

**Purpose:** Allows the dashboard's live flow rate gauge and total volume counter to update in real time without polling `GET /api/water/current`.

**Payload:** A complete `WaterReading` object.

```json
{
  "id": 5843,
  "deviceId": "esp32-01",
  "flowRateLpm": 4.12,
  "totalLitres": 1843.10,
  "timestamp": "2026-09-22T14:19:35.000Z",
  "createdAt": "2026-09-22T14:19:35.409Z"
}
```

---

#### `electricity:reading`

**Trigger:** Emitted immediately after a new electricity reading is successfully persisted.

**Purpose:** Allows the dashboard's live voltage, current, and power meters to update in real time.

**Payload:** A complete `ElectricityReading` object.

```json
{
  "id": 6022,
  "deviceId": "esp32-01",
  "voltage": 231.0,
  "current": 2.15,
  "power": 496.7,
  "energyKwh": 4.813,
  "timestamp": "2026-09-22T14:19:38.000Z",
  "createdAt": "2026-09-22T14:19:38.502Z"
}
```

---

#### `reading:update`

**Trigger:** Emitted after every new reading of either type. This is a combined/summary event that the dashboard can listen to for a single update stream instead of subscribing to both `water:reading` and `electricity:reading` separately.

**Purpose:** Allows the dashboard to efficiently refresh summary cards (today's totals) without making a REST call.

**Payload:**

```json
{
  "type": "water",
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:19:35.000Z",
  "water": {
    "flowRateLpm": 4.12,
    "totalLitres": 1843.10
  }
}
```

Or for electricity:

```json
{
  "type": "electricity",
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:19:38.000Z",
  "electricity": {
    "voltage": 231.0,
    "current": 2.15,
    "power": 496.7,
    "energyKwh": 4.813
  }
}
```

| Field         | Type                         | Description                                                         |
|---------------|------------------------------|---------------------------------------------------------------------|
| `type`        | `"water" \| "electricity"`   | Which sensor type generated this update.                            |
| `deviceId`    | `string`                     | The device that sent the reading.                                   |
| `timestamp`   | `string`                     | ISO 8601 UTC timestamp of the reading.                              |
| `water`       | `object \| undefined`        | Present only when `type === "water"`. Contains key summary fields.  |
| `electricity` | `object \| undefined`        | Present only when `type === "electricity"`. Contains key fields.    |

---

#### `anomaly:created`

**Trigger:** Emitted when the anomaly detection engine identifies and persists a new anomaly record.

**Purpose:** Allows the dashboard to immediately display an alert notification (toast/banner) to the user when something abnormal is detected, without waiting for a polling interval.

**Payload:** A complete `Anomaly` object.

```json
{
  "id": 43,
  "deviceId": "esp32-01",
  "resourceType": "electricity",
  "severity": "high",
  "message": "Power 3120 W exceeds maximum threshold of 3000 W — possible overload",
  "actualValue": 3120.0,
  "baselineValue": 312.4,
  "threshold": 3000.0,
  "resolvedAt": null,
  "timestamp": "2026-09-22T14:20:01.000Z",
  "createdAt": "2026-09-22T14:20:01.741Z"
}
```

---

#### `device:status`

**Trigger:** Emitted when the backend detects a change in device connectivity. The backend runs a background watchdog timer that marks a device `"offline"` if no reading is received within a configurable timeout (default: 5 minutes). It also emits `"online"` when a device sends its first reading after being offline.

**Purpose:** Allows the dashboard to display a connection status indicator for each device.

**Payload:**

```json
{
  "deviceId": "esp32-01",
  "status": "offline",
  "timestamp": "2026-09-22T14:25:00.000Z"
}
```

Or:

```json
{
  "deviceId": "esp32-01",
  "status": "online",
  "timestamp": "2026-09-22T14:31:12.000Z"
}
```

| Field      | Type                         | Description                                                           |
|------------|------------------------------|-----------------------------------------------------------------------|
| `deviceId` | `string`                     | The device whose status changed.                                      |
| `status`   | `"online" \| "offline"`      | New connectivity status.                                              |
| `timestamp`| `string`                     | ISO 8601 UTC timestamp of when the status change was detected.        |

---

### Client → Server Events

These events are **emitted by the React dashboard** and **received by the backend**.

---

#### `subscribe`

**Purpose:** Optionally join a device-specific Socket.IO room. When subscribed to a room, the client only receives events for readings/anomalies originating from that specific `deviceId`. Without subscribing, the client receives events for all devices.

**Payload:**

```json
{
  "deviceId": "esp32-01"
}
```

**Example usage in React:**

```javascript
socket.emit('subscribe', { deviceId: 'esp32-01' });
```

> [!NOTE]
> Room subscription is optional for this prototype since there is only one device (`esp32-01`). It is implemented to support future multi-device expansion without breaking the frontend contract.

---

## 9. Error Codes Reference

The following HTTP status codes may be returned by any endpoint in this API.

| HTTP Status Code | Status Text             | When It Occurs                                                                                      | Example Response Body                                                      |
|------------------|-------------------------|------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| `200`            | OK                      | Request succeeded. Resource or data is returned.                                                    | Resource object or array.                                                  |
| `400`            | Bad Request             | The request was malformed. Typically caused by missing required query params or invalid data types.  | `{ "error": "Validation failed", "details": [...] }`                      |
| `404`            | Not Found               | The requested resource does not exist in the database.                                               | `{ "error": "Device not found" }` or `{ "error": "No readings found" }`   |
| `500`            | Internal Server Error   | An unexpected error occurred on the server (database failure, unhandled exception, etc.).            | `{ "error": "Internal server error" }`                                     |

> [!NOTE]
> This prototype does not implement `401 Unauthorized`, `403 Forbidden`, or `429 Too Many Requests`, as authentication and rate limiting are outside the scope of the college PBL prototype. These codes are reserved for the production version.

---

## 10. Rate Limiting

**Current status: Not implemented in this prototype.**

No rate limiting is applied to any endpoint. All requests are served as fast as the database can respond.

### Future Implementation Plan

For a production deployment, the following rate limiting strategy is recommended:

| Endpoint Category              | Limit                         | Window     | Strategy           |
|--------------------------------|-------------------------------|------------|--------------------|
| Health Check (`/api/health`)   | 60 requests                   | Per minute | IP-based           |
| Device Endpoints               | 120 requests                  | Per minute | IP-based           |
| Water/Electricity Current      | 60 requests                   | Per minute | IP-based           |
| Water/Electricity History      | 30 requests                   | Per minute | IP-based           |
| Anomaly Endpoints              | 60 requests                   | Per minute | IP-based           |

**Recommended library:** [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit)

```javascript
// Future implementation example (not active in prototype)
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use('/api', limiter);
```

When rate limiting is active, exceeded requests will receive a `429 Too Many Requests` response:

```json
{
  "error": "Too many requests, please slow down.",
  "retryAfter": 42
}
```

---

## 11. Complete TypeScript Type Definitions

These type definitions represent the **shared contract** between the backend (Member 2) and the React dashboard (Member 3). Member 3 must import and use these types for all API calls and Socket.IO event handlers to ensure type safety across the codebase.

> [!IMPORTANT]
> Create a shared file at `src/types/api.ts` in the React project and paste these definitions there. Do not redefine them inline in individual components.

```typescript
// ============================================================
// src/types/api.ts
// Shared API Type Definitions
// Smart IoT Water and Electricity Monitoring System
// DO NOT MODIFY without coordinating with Member 2 (Backend)
// ============================================================

// ------------------------------------------------------------
// CORE RESOURCE TYPES
// ------------------------------------------------------------

/**
 * Represents a registered ESP32 hardware device.
 */
export interface Device {
  /** Auto-incremented database primary key. */
  id: number;

  /** Human-readable device identifier set in ESP32 firmware (e.g. "esp32-01"). */
  deviceId: string;

  /** Friendly display name for UI rendering. */
  name: string;

  /** Current connectivity status. "offline" if lastSeenAt > 5 minutes ago. */
  status: 'online' | 'offline';

  /** ISO 8601 UTC string — last time a reading was received from this device. */
  lastSeenAt: string;

  /** Wi-Fi signal strength in dBm. Null if not reported by firmware. */
  rssi: number | null;

  /** Free heap memory on the ESP32 in bytes. Null if not reported. */
  freeHeap: number | null;

  /** ISO 8601 UTC string — when the device first registered with the backend. */
  createdAt: string;

  /** ISO 8601 UTC string — when the device record was last modified. */
  updatedAt: string;
}

/**
 * A single water flow sensor reading from the YF-S201 sensor.
 */
export interface WaterReading {
  /** Auto-incremented database primary key. */
  id: number;

  /** The deviceId of the ESP32 that captured this reading. */
  deviceId: string;

  /** Instantaneous flow rate in litres per minute (L/min). */
  flowRateLpm: number;

  /**
   * Cumulative total litres passed through the sensor since last ESP32 reset.
   * To calculate today's consumption: lastReading.totalLitres - firstReading.totalLitres
   */
  totalLitres: number;

  /** ISO 8601 UTC string — when the ESP32 captured this reading. */
  timestamp: string;

  /** ISO 8601 UTC string — when the backend stored this record. */
  createdAt: string;
}

/**
 * A single electricity sensor reading (PZEM-004T or ACS712 + ZMPT101B).
 */
export interface ElectricityReading {
  /** Auto-incremented database primary key. */
  id: number;

  /** The deviceId of the ESP32 that captured this reading. */
  deviceId: string;

  /** RMS mains voltage in volts (V). Typical Indian grid: 210–240 V. */
  voltage: number;

  /** RMS current draw in amperes (A). */
  current: number;

  /** Active power in watts (W). Derived from voltage × current × power factor. */
  power: number;

  /**
   * Cumulative energy consumed in kilowatt-hours (kWh) since last ESP32 reset.
   * To calculate today's usage: lastReading.energyKwh - firstReading.energyKwh
   */
  energyKwh: number;

  /** ISO 8601 UTC string — when the ESP32 captured this reading. */
  timestamp: string;

  /** ISO 8601 UTC string — when the backend stored this record. */
  createdAt: string;
}

/**
 * A detected sensor anomaly, generated by the backend's rule-based engine.
 */
export interface Anomaly {
  /** Auto-incremented database primary key. */
  id: number;

  /** The deviceId of the ESP32 that triggered this anomaly. */
  deviceId: string;

  /** Which sensor type triggered the anomaly. */
  resourceType: 'water' | 'electricity';

  /** Severity classification. "high" = immediate attention needed. */
  severity: 'low' | 'medium' | 'high';

  /** Human-readable description including measured and threshold values. */
  message: string;

  /** The measured sensor value that triggered the rule. */
  actualValue: number;

  /** The expected/baseline value for context. */
  baselineValue: number;

  /** The rule threshold that was exceeded. */
  threshold: number;

  /**
   * ISO 8601 UTC string — when the condition returned to normal.
   * null if the anomaly is still active.
   */
  resolvedAt: string | null;

  /** ISO 8601 UTC string — when the anomalous reading was captured. */
  timestamp: string;

  /** ISO 8601 UTC string — when the anomaly record was written to the database. */
  createdAt: string;
}

// ------------------------------------------------------------
// WATER API RESPONSE TYPES
// ------------------------------------------------------------

/**
 * Response shape from GET /api/water/today
 */
export interface WaterTodaySummary {
  /** All individual readings from midnight to now. */
  readings: WaterReading[];

  /** Total litres consumed today (delta between first and last reading's totalLitres). */
  totalLitres: number;

  /** Average flow rate (L/min) across all readings today. */
  avgFlowRate: number;

  /** Maximum instantaneous flow rate (L/min) recorded today. */
  peakFlowRate: number;

  /** Number of individual sensor readings in today's window. */
  readingCount: number;
}

/**
 * Response shape from GET /api/water/history
 */
export interface WaterHistoryResponse {
  /** All readings within the specified [from, to] time window. */
  readings: WaterReading[];

  /** Total count of readings returned. */
  count: number;

  /** The 'from' query parameter echoed back (ISO 8601 UTC string). */
  from: string;

  /** The 'to' query parameter echoed back (ISO 8601 UTC string). */
  to: string;
}

/**
 * One day's aggregated water data — an element in the WaterSummaryResponse.summary array.
 */
export interface WaterDailySummary {
  /** Calendar date in YYYY-MM-DD format (local IST). */
  date: string;

  /** Total litres consumed on this day. */
  totalLitres: number;

  /** Average flow rate (L/min) on this day. */
  avgFlowRate: number;

  /** Peak flow rate (L/min) on this day. */
  peakFlowRate: number;

  /** Number of readings recorded on this day. */
  readingCount: number;
}

/**
 * Response shape from GET /api/water/summary
 */
export interface WaterSummaryResponse {
  /** One entry per calendar day, ordered ascending by date. */
  summary: WaterDailySummary[];

  /** Human-readable date range covered, e.g. "2026-09-16 to 2026-09-22". */
  period: string;
}

// ------------------------------------------------------------
// ELECTRICITY API RESPONSE TYPES
// ------------------------------------------------------------

/**
 * Response shape from GET /api/electricity/today
 */
export interface ElectricityTodaySummary {
  /** All individual readings from midnight to now. */
  readings: ElectricityReading[];

  /** Total energy consumed today (kWh delta between first and last reading). */
  totalEnergyKwh: number;

  /** Average active power (W) across all readings today. */
  avgPower: number;

  /** Maximum instantaneous power (W) recorded today. */
  peakPower: number;

  /** Average RMS voltage (V) across all readings today. */
  avgVoltage: number;

  /** Average RMS current (A) across all readings today. */
  avgCurrent: number;

  /** Number of individual sensor readings in today's window. */
  readingCount: number;
}

/**
 * Response shape from GET /api/electricity/history
 */
export interface ElectricityHistoryResponse {
  /** All readings within the specified [from, to] time window. */
  readings: ElectricityReading[];

  /** Total count of readings returned. */
  count: number;

  /** The 'from' query parameter echoed back (ISO 8601 UTC string). */
  from: string;

  /** The 'to' query parameter echoed back (ISO 8601 UTC string). */
  to: string;
}

/**
 * One day's aggregated electricity data — an element in ElectricitySummaryResponse.summary.
 */
export interface ElectricityDailySummary {
  /** Calendar date in YYYY-MM-DD format (local IST). */
  date: string;

  /** Total energy consumed on this day (kWh). */
  totalEnergyKwh: number;

  /** Average active power (W) on this day. */
  avgPower: number;

  /** Peak power (W) recorded on this day. */
  peakPower: number;

  /** Average RMS voltage (V) on this day. */
  avgVoltage: number;

  /** Average RMS current (A) on this day. */
  avgCurrent: number;

  /** Number of readings recorded on this day. */
  readingCount: number;
}

/**
 * Response shape from GET /api/electricity/summary
 */
export interface ElectricitySummaryResponse {
  /** One entry per calendar day, ordered ascending by date. */
  summary: ElectricityDailySummary[];

  /** Human-readable date range covered. */
  period: string;
}

// ------------------------------------------------------------
// ANOMALY API RESPONSE TYPES
// ------------------------------------------------------------

/**
 * Response shape from GET /api/anomalies and GET /api/anomalies/recent
 */
export interface AnomalyListResponse {
  /** Array of anomaly records matching the query filters. */
  anomalies: Anomaly[];

  /** Total count of anomalies returned. */
  count: number;
}

// ------------------------------------------------------------
// HEALTH CHECK RESPONSE TYPE
// ------------------------------------------------------------

/**
 * Response shape from GET /api/health
 */
export interface HealthCheckResponse {
  /** "ok" when healthy, "error" when degraded. */
  status: 'ok' | 'error';

  /** ISO 8601 UTC timestamp of when the check was processed. */
  timestamp: string;

  /** Seconds since the Node.js process started (process.uptime()). */
  uptime: number;

  /** Database connectivity status. */
  database: 'connected' | 'disconnected';

  /** Present only when status === "error". */
  error?: string;
}

// ------------------------------------------------------------
// SOCKET.IO EVENT PAYLOAD TYPES
// ------------------------------------------------------------

/**
 * Payload for the reading:update Socket.IO event.
 * Emitted after every new reading of either sensor type.
 */
export interface ReadingUpdatePayload {
  /** Which sensor type generated this update. */
  type: 'water' | 'electricity';

  /** The device that sent the reading. */
  deviceId: string;

  /** ISO 8601 UTC timestamp of the reading. */
  timestamp: string;

  /**
   * Present only when type === "water".
   * Summary fields from the water reading.
   */
  water?: {
    flowRateLpm: number;
    totalLitres: number;
  };

  /**
   * Present only when type === "electricity".
   * Summary fields from the electricity reading.
   */
  electricity?: {
    voltage: number;
    current: number;
    power: number;
    energyKwh: number;
  };
}

/**
 * Payload for the device:status Socket.IO event.
 * Emitted when a device goes online or offline.
 */
export interface DeviceStatusPayload {
  /** The device whose status changed. */
  deviceId: string;

  /** New connectivity status. */
  status: 'online' | 'offline';

  /** ISO 8601 UTC timestamp of when the change was detected. */
  timestamp: string;
}

/**
 * Payload emitted by the client to subscribe to a device room.
 */
export interface SubscribePayload {
  /** The deviceId to subscribe to. */
  deviceId: string;
}

/**
 * Complete map of all Socket.IO events — both directions.
 * Use this with typed Socket.IO clients for full type safety.
 *
 * Usage with socket.io-client v4+:
 *   import { Socket } from 'socket.io-client';
 *   const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(...);
 */
export interface ServerToClientEvents {
  /** New water reading stored. Payload: complete WaterReading object. */
  'water:reading': (data: WaterReading) => void;

  /** New electricity reading stored. Payload: complete ElectricityReading object. */
  'electricity:reading': (data: ElectricityReading) => void;

  /** Combined update event after any new reading. */
  'reading:update': (data: ReadingUpdatePayload) => void;

  /** New anomaly detected. Payload: complete Anomaly object. */
  'anomaly:created': (data: Anomaly) => void;

  /** Device connectivity status changed. */
  'device:status': (data: DeviceStatusPayload) => void;
}

export interface ClientToServerEvents {
  /** Subscribe to events from a specific device room. */
  subscribe: (payload: SubscribePayload) => void;
}
```

---

## 12. Example curl Commands

All commands below use `curl` and can be run from PowerShell (Windows) or any Unix terminal. Ensure the backend server is running on `http://localhost:3001` before executing.

> [!TIP]
> On Windows PowerShell, use backtick `` ` `` for line continuation instead of `\`. All commands below are single-line for universal compatibility.

---

### Health Check

```bash
# GET /api/health — Check backend and database status
curl -s -X GET "http://localhost:3001/api/health" -H "Accept: application/json" | python -m json.tool
```

---

### Device Endpoints

```bash
# GET /api/devices — List all registered devices
curl -s -X GET "http://localhost:3001/api/devices" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/devices/:id — Get device by deviceId
curl -s -X GET "http://localhost:3001/api/devices/esp32-01" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/devices/:id — 404 example (non-existent device)
curl -s -X GET "http://localhost:3001/api/devices/esp32-99" -H "Accept: application/json" | python -m json.tool
```

---

### Water Endpoints

```bash
# GET /api/water/current — Get the latest water reading (default device)
curl -s -X GET "http://localhost:3001/api/water/current" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/current — Get latest water reading for a specific device
curl -s -X GET "http://localhost:3001/api/water/current?deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/today — Get today's water readings and summary
curl -s -X GET "http://localhost:3001/api/water/today" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/today — Filter by device
curl -s -X GET "http://localhost:3001/api/water/today?deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/history — Get readings for a specific time range
curl -s -X GET "http://localhost:3001/api/water/history?from=2026-09-22T00:00:00.000Z&to=2026-09-22T23:59:59.000Z" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/history — With device filter, limit, and time range
curl -s -X GET "http://localhost:3001/api/water/history?deviceId=esp32-01&from=2026-09-21T00:00:00.000Z&to=2026-09-21T23:59:59.000Z&limit=50" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/history — 400 error example (missing required params)
curl -s -X GET "http://localhost:3001/api/water/history" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/summary — Get last 7 days of daily water summaries (default)
curl -s -X GET "http://localhost:3001/api/water/summary" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/summary — Get last 14 days of daily summaries
curl -s -X GET "http://localhost:3001/api/water/summary?days=14" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/water/summary — Get last 30 days (maximum)
curl -s -X GET "http://localhost:3001/api/water/summary?days=30&deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

---

### Electricity Endpoints

```bash
# GET /api/electricity/current — Get the latest electricity reading (default device)
curl -s -X GET "http://localhost:3001/api/electricity/current" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/current — Filter by deviceId
curl -s -X GET "http://localhost:3001/api/electricity/current?deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/today — Get today's electricity readings and summary
curl -s -X GET "http://localhost:3001/api/electricity/today" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/today — Filter by device
curl -s -X GET "http://localhost:3001/api/electricity/today?deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/history — Get readings for a time range
curl -s -X GET "http://localhost:3001/api/electricity/history?from=2026-09-22T00:00:00.000Z&to=2026-09-22T23:59:59.000Z" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/history — With device filter and limit
curl -s -X GET "http://localhost:3001/api/electricity/history?deviceId=esp32-01&from=2026-09-21T00:00:00.000Z&to=2026-09-21T23:59:59.000Z&limit=200" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/history — 400 error example (missing 'to')
curl -s -X GET "http://localhost:3001/api/electricity/history?from=2026-09-22T00:00:00.000Z" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/summary — Get last 7 days of daily electricity summaries (default)
curl -s -X GET "http://localhost:3001/api/electricity/summary" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/summary — Get last 30 days
curl -s -X GET "http://localhost:3001/api/electricity/summary?days=30" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/electricity/summary — Specific device, last 14 days
curl -s -X GET "http://localhost:3001/api/electricity/summary?deviceId=esp32-01&days=14" -H "Accept: application/json" | python -m json.tool
```

---

### Anomaly Endpoints

```bash
# GET /api/anomalies — Get all anomalies (no filter)
curl -s -X GET "http://localhost:3001/api/anomalies" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by resourceType = water
curl -s -X GET "http://localhost:3001/api/anomalies?resourceType=water" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by resourceType = electricity
curl -s -X GET "http://localhost:3001/api/anomalies?resourceType=electricity" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by severity = high
curl -s -X GET "http://localhost:3001/api/anomalies?severity=high" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by severity = medium
curl -s -X GET "http://localhost:3001/api/anomalies?severity=medium" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by device and severity
curl -s -X GET "http://localhost:3001/api/anomalies?deviceId=esp32-01&severity=high" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Filter by time range
curl -s -X GET "http://localhost:3001/api/anomalies?from=2026-09-22T00:00:00.000Z&to=2026-09-22T23:59:59.000Z" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Only unresolved anomalies
curl -s -X GET "http://localhost:3001/api/anomalies?resolved=false" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Only resolved anomalies
curl -s -X GET "http://localhost:3001/api/anomalies?resolved=true" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies — Combined filters: device + type + severity + unresolved + limit
curl -s -X GET "http://localhost:3001/api/anomalies?deviceId=esp32-01&resourceType=water&severity=high&resolved=false&limit=10" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies/recent — Get anomalies from last 24 hours
curl -s -X GET "http://localhost:3001/api/anomalies/recent" -H "Accept: application/json" | python -m json.tool
```

```bash
# GET /api/anomalies/recent — Filter by device
curl -s -X GET "http://localhost:3001/api/anomalies/recent?deviceId=esp32-01" -H "Accept: application/json" | python -m json.tool
```

---

### Verifying Socket.IO Events (Node.js one-liner)

To test WebSocket events from the command line, use the Socket.IO CLI client:

```bash
# Install the Socket.IO client CLI globally (one-time setup)
npm install -g socket.io-client-tool

# Listen to all events from the server
npx socket.io-client http://localhost:3001
```

Alternatively, paste this into a temporary `test-socket.js` file and run with `node test-socket.js`:

```javascript
// test-socket.js — Run with: node test-socket.js
const { io } = require('socket.io-client');

const socket = io('http://localhost:3001', { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[Connected] Socket ID:', socket.id);
  socket.emit('subscribe', { deviceId: 'esp32-01' });
});

socket.on('water:reading',       (d) => console.log('[water:reading]',       JSON.stringify(d, null, 2)));
socket.on('electricity:reading', (d) => console.log('[electricity:reading]', JSON.stringify(d, null, 2)));
socket.on('reading:update',      (d) => console.log('[reading:update]',      JSON.stringify(d, null, 2)));
socket.on('anomaly:created',     (d) => console.log('[anomaly:created]',     JSON.stringify(d, null, 2)));
socket.on('device:status',       (d) => console.log('[device:status]',       JSON.stringify(d, null, 2)));
socket.on('disconnect',          (r) => console.log('[Disconnected]', r));
```

---

*End of API Documentation — Smart IoT-Based Water and Electricity Monitoring System*
