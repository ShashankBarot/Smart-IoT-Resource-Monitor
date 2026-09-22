# DATABASE DESIGN

**Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System  
**Document:** Database Design Reference  
**Version:** 1.0  
**Date:** 2026-09-22  
**Stack:** PostgreSQL 15+ · Prisma ORM · TypeScript (Node.js / Next.js API)

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Why Prisma ORM?](#2-why-prisma-orm)
3. [Entity Relationship Diagram](#3-entity-relationship-diagram)
4. [Complete Prisma Schema](#4-complete-prisma-schema)
5. [Table Descriptions](#5-table-descriptions)
6. [Database Indexes — Detailed Explanation](#6-database-indexes--detailed-explanation)
7. [Common Queries (with Prisma Code)](#7-common-queries-with-prisma-code)
8. [Database Setup Instructions](#8-database-setup-instructions)
9. [Data Retention Policy](#9-data-retention-policy)
10. [Sample Data (SQL INSERT Examples)](#10-sample-data-sql-insert-examples)

---

## 1. Database Overview

### Technology Choice: PostgreSQL 15+

This project uses **PostgreSQL 15** as its primary relational database. PostgreSQL was selected over alternatives (MySQL, SQLite, MongoDB) for the following reasons:

| Criterion | PostgreSQL | MySQL | SQLite | MongoDB |
|---|---|---|---|---|
| **ACID Compliance** | ✅ Full | ✅ Full (InnoDB) | ✅ Full | ⚠️ Partial |
| **Time-series Queries** | ✅ Excellent (window functions, `date_trunc`) | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| **JSON Support** | ✅ Native `jsonb` | ⚠️ Partial | ❌ None | ✅ Native |
| **Free & Open Source** | ✅ BSD License | ✅ GPL | ✅ Public Domain | ✅ SSPL |
| **Industry Adoption** | ✅ Extremely high | ✅ High | ⚠️ Embedded only | ✅ High |
| **Concurrent Connections** | ✅ Excellent | ✅ Good | ❌ Poor | ✅ Good |
| **Prisma ORM Support** | ✅ First-class | ✅ Good | ✅ Good | ✅ Good |

### Why PostgreSQL for IoT Time-Series Data?

IoT sensor data is inherently time-series: readings are timestamped, queries are almost always filtered by time range, and aggregate functions (SUM, AVG, MIN, MAX over time windows) are the primary access pattern. PostgreSQL handles these patterns with:

- **`date_trunc()`** — truncate timestamps to hour/day/week/month for bucketed aggregation.
- **Window functions** — `LAG()`, `LEAD()`, `ROW_NUMBER() OVER (PARTITION BY ...)` for trend analysis.
- **Partial indexes** — index only rows matching a condition (e.g., only unresolved anomalies).
- **Composite indexes** — index `(deviceId, timestamp)` together, dramatically speeding up the most common query pattern.
- **`jsonb` columns** — store variable metadata from devices (firmware version, hardware revision, etc.) without altering the schema.

### Database Name

```
smart_monitor
```

### Schema Organisation

All tables live in the default `public` schema. Prisma maps model names to snake_case table names via `@@map()`.

---

## 2. Why Prisma ORM?

**Prisma** is a next-generation Node.js / TypeScript ORM. It replaces hand-written SQL or lower-level query builders (Knex, Sequelize) with a fully type-safe client auto-generated from a schema definition file (`schema.prisma`).

### Key Advantages

#### 2.1 End-to-End Type Safety

Prisma generates a TypeScript client from the schema. Every query, every field, every relation is typed. If you try to access a column that doesn't exist, TypeScript catches it **at compile time** — not at runtime in production.

```typescript
// TypeScript knows exactly what this returns: WaterReading | null
const reading = await prisma.waterReading.findFirst({
  where: { deviceId: 'esp32-001' },
  orderBy: { timestamp: 'desc' },
});

// reading.flowRateLpm is typed as `number` — no casting needed
console.log(reading?.flowRateLpm);
```

#### 2.2 Schema as Code (Single Source of Truth)

The `schema.prisma` file is the **single source of truth** for the database structure. Everything — column types, defaults, relations, indexes — is declared once. From this single file Prisma generates:

- SQL migration files
- The TypeScript client
- Documentation (via `prisma-docs-generator`)

#### 2.3 Declarative Migrations

```bash
npx prisma migrate dev --name add_rssi_column
```

This single command:

1. Diffs the current `schema.prisma` against the last applied migration.
2. Generates a new `.sql` migration file under `prisma/migrations/`.
3. Applies the migration to the database.
4. Regenerates the TypeScript client.

Migration files are committed to version control, giving a complete, auditable history of every schema change — essential for a team project.

#### 2.4 Prisma Studio — Visual Database Browser

```bash
npx prisma studio
```

Opens a browser-based GUI at `http://localhost:5555` to browse, filter, edit, and delete records. Invaluable during development and debugging — no need for a separate DB GUI tool.

#### 2.5 Works Perfectly with Next.js / Node.js

Prisma's client is instantiated once and reused (singleton pattern), which fits perfectly into the Next.js API route architecture used in this project. It supports connection pooling natively and has first-class support for Vercel deployments (via `DATABASE_URL` environment variable).

---

## 3. Entity Relationship Diagram

The diagram below shows all entities, their primary attributes, and the relationships between them. Cardinality is shown using standard ERD crow's-foot notation.

```mermaid
erDiagram
    Device {
        String id PK
        String deviceId UK
        String name
        String status
        DateTime lastSeenAt
        Int rssi
        Int freeHeap
        DateTime createdAt
        DateTime updatedAt
    }

    WaterReading {
        String id PK
        String deviceId FK
        Float flowRateLpm
        Float totalLitres
        DateTime timestamp
        DateTime createdAt
    }

    ElectricityReading {
        String id PK
        String deviceId FK
        Float voltage
        Float current
        Float power
        Float energyKwh
        DateTime timestamp
        DateTime createdAt
    }

    Anomaly {
        String id PK
        String deviceId FK
        String resourceType
        String severity
        String message
        Float actualValue
        Float baselineValue
        Float threshold
        DateTime resolvedAt
        DateTime timestamp
        DateTime createdAt
    }

    WaterDailyAggregate {
        String id PK
        String deviceId FK
        DateTime date
        Float totalLitres
        Float avgFlowRateLpm
        Float maxFlowRateLpm
        Int readingCount
        DateTime createdAt
        DateTime updatedAt
    }

    ElectricityDailyAggregate {
        String id PK
        String deviceId FK
        DateTime date
        Float totalEnergyKwh
        Float avgPower
        Float maxPower
        Float avgVoltage
        Float avgCurrent
        Int readingCount
        DateTime createdAt
        DateTime updatedAt
    }

    Device ||--o{ WaterReading : "has"
    Device ||--o{ ElectricityReading : "has"
    Device ||--o{ Anomaly : "triggers"
    Device ||--o{ WaterDailyAggregate : "aggregated into"
    Device ||--o{ ElectricityDailyAggregate : "aggregated into"
```

### Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| `Device` → `WaterReading` | One-to-Many | One device records many water flow readings over time |
| `Device` → `ElectricityReading` | One-to-Many | One device records many electricity readings over time |
| `Device` → `Anomaly` | One-to-Many | One device can trigger many anomaly events |
| `Device` → `WaterDailyAggregate` | One-to-Many | Pre-aggregated daily summaries per device |
| `Device` → `ElectricityDailyAggregate` | One-to-Many | Pre-aggregated daily electricity summaries per device |

> [!NOTE]
> Anomalies are linked to a `Device` via `deviceId`. Although a reading triggers the anomaly in application logic, the database does not enforce a foreign key to `WaterReading` or `ElectricityReading` directly. This keeps the schema simpler and avoids cascading deletes deleting anomaly records when old readings are purged during data retention.

---

## 4. Complete Prisma Schema

The following is the **complete, production-ready** `schema.prisma` file. Place this file at `prisma/schema.prisma` in the project root.

```prisma
// =============================================================================
// schema.prisma
// Smart IoT-Based Water and Electricity Consumption Monitoring System
// =============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// DEVICE
// Represents a physical ESP32 device registered in the system.
// One device can publish both water and electricity sensor data.
// =============================================================================
model Device {
  id          String    @id @default(cuid())
  deviceId    String    @unique               // e.g. "esp32-water-01"
  name        String?                         // Human-readable label
  status      String    @default("offline")   // "online" | "offline"
  lastSeenAt  DateTime?                       // Last MQTT heartbeat timestamp
  rssi        Int?                            // WiFi signal strength (dBm)
  freeHeap    Int?                            // Free ESP32 heap memory (bytes)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  waterReadings           WaterReading[]
  electricityReadings     ElectricityReading[]
  anomalies               Anomaly[]
  waterDailyAggregates    WaterDailyAggregate[]
  electricityDailyAggregates ElectricityDailyAggregate[]

  @@index([deviceId])
  @@map("devices")
}

// =============================================================================
// WATER READING
// One record per sensor publish event from the flow sensor (YF-S201).
// Typical publish rate: every 5 seconds.
// =============================================================================
model WaterReading {
  id           String   @id @default(cuid())
  deviceId     String                         // FK → devices.deviceId
  device       Device   @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)
  flowRateLpm  Float                          // Instantaneous flow rate (litres/min)
  totalLitres  Float                          // Cumulative total since device boot (litres)
  timestamp    DateTime                       // Sensor reading timestamp (from ESP32 NTP)
  createdAt    DateTime @default(now())       // DB insert timestamp

  @@index([deviceId, timestamp])
  @@index([timestamp])
  @@map("water_readings")
}

// =============================================================================
// ELECTRICITY READING
// One record per sensor publish event from the PZEM-004T energy meter.
// Typical publish rate: every 5 seconds.
// =============================================================================
model ElectricityReading {
  id          String   @id @default(cuid())
  deviceId    String                          // FK → devices.deviceId
  device      Device   @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)
  voltage     Float                           // RMS voltage (Volts)
  current     Float                           // RMS current (Amperes)
  power       Float                           // Active power (Watts)
  energyKwh   Float                           // Cumulative energy (kWh) since PZEM reset
  timestamp   DateTime                        // Sensor reading timestamp (from ESP32 NTP)
  createdAt   DateTime @default(now())        // DB insert timestamp

  @@index([deviceId, timestamp])
  @@index([timestamp])
  @@map("electricity_readings")
}

// =============================================================================
// ANOMALY
// Represents a detected anomaly event for water or electricity.
// Created by the anomaly detection service when a reading breaches a threshold.
// =============================================================================
model Anomaly {
  id            String    @id @default(cuid())
  deviceId      String                         // FK → devices.deviceId
  device        Device    @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)
  resourceType  String                         // "water" | "electricity"
  severity      String                         // "low" | "medium" | "high"
  message       String                         // Human-readable description
  actualValue   Float                          // The reading value that triggered the anomaly
  baselineValue Float                          // The expected/normal value
  threshold     Float                          // The threshold that was breached
  resolvedAt    DateTime?                      // NULL = still active; non-null = resolved
  timestamp     DateTime                       // When the anomaly was detected
  createdAt     DateTime  @default(now())

  @@index([deviceId, timestamp])
  @@index([resourceType])
  @@index([timestamp])
  @@map("anomalies")
}

// =============================================================================
// WATER DAILY AGGREGATE (Optional — for dashboard performance)
// Pre-computed daily summaries. Populated by a background cron job or
// database trigger to avoid scanning millions of raw rows on every dashboard load.
// =============================================================================
model WaterDailyAggregate {
  id             String   @id @default(cuid())
  deviceId       String                        // FK → devices.deviceId
  device         Device   @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)
  date           DateTime                      // Midnight UTC of the day (e.g. 2026-09-22T00:00:00Z)
  totalLitres    Float                         // Total water consumed that day
  avgFlowRateLpm Float                         // Average flow rate for the day
  maxFlowRateLpm Float                         // Peak flow rate recorded that day
  readingCount   Int                           // Number of raw readings included
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([deviceId, date])                   // One aggregate row per device per day
  @@index([deviceId, date])
  @@map("water_daily_aggregates")
}

// =============================================================================
// ELECTRICITY DAILY AGGREGATE (Optional — for dashboard performance)
// Pre-computed daily summaries for electricity consumption.
// =============================================================================
model ElectricityDailyAggregate {
  id              String   @id @default(cuid())
  deviceId        String                       // FK → devices.deviceId
  device          Device   @relation(fields: [deviceId], references: [deviceId], onDelete: Cascade)
  date            DateTime                     // Midnight UTC of the day
  totalEnergyKwh  Float                        // Total energy consumed that day (kWh)
  avgPower        Float                        // Average power draw (Watts)
  maxPower        Float                        // Peak power draw (Watts)
  avgVoltage      Float                        // Average voltage (Volts)
  avgCurrent      Float                        // Average current (Amperes)
  readingCount    Int                          // Number of raw readings included
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([deviceId, date])                   // One aggregate row per device per day
  @@index([deviceId, date])
  @@map("electricity_daily_aggregates")
}
```

> [!IMPORTANT]
> The `deviceId` field on `WaterReading`, `ElectricityReading`, and `Anomaly` is a **String foreign key referencing `Device.deviceId`** (the human-readable device identifier like `"esp32-water-01"`), **not** the internal `Device.id` (CUID). This is intentional — the ESP32 firmware publishes its own device ID string in every MQTT payload, so this avoids a lookup join on every insert.

> [!TIP]
> `onDelete: Cascade` ensures that if a device record is deleted from the system, all its readings and anomalies are automatically removed. This simplifies device decommissioning.

---

## 5. Table Descriptions

### 5.1 `devices`

The central registry of all ESP32 hardware units. Each row represents one physical device. Both the water sensor subsystem and the electricity sensor subsystem on the same ESP32 publish under the same `deviceId`.

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Internal primary key. CUID (collision-resistant unique ID) generated by Prisma client. Not exposed in URLs. |
| `deviceId` | `String` | `TEXT` | ❌ | — | **Business-level unique identifier.** Set in ESP32 firmware (e.g., `"esp32-lab-01"`). Used as FK in child tables. Must be unique. |
| `name` | `String?` | `TEXT` | ✅ | `NULL` | Optional human-readable label assigned by the user (e.g., `"Kitchen Flow Meter"`). |
| `status` | `String` | `TEXT` | ❌ | `"offline"` | Current connectivity status. Valid values: `"online"` or `"offline"`. Updated by the MQTT `will` message and heartbeat handler. |
| `lastSeenAt` | `DateTime?` | `TIMESTAMPTZ` | ✅ | `NULL` | Timestamp of the last MQTT message received from this device. `NULL` if the device has never connected. |
| `rssi` | `Int?` | `INTEGER` | ✅ | `NULL` | WiFi Received Signal Strength Indicator in dBm. Published with each heartbeat. Typical range: `-100` (very weak) to `-30` (excellent). |
| `freeHeap` | `Int?` | `INTEGER` | ✅ | `NULL` | Free heap memory on the ESP32 in bytes. Useful for monitoring memory leaks in firmware. |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Row creation timestamp. Set automatically by the database. |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | (auto) | Automatically updated by Prisma on every write. Tracks last modification time. |

---

### 5.2 `water_readings`

Stores every individual water flow sensor reading published by an ESP32. With a 5-second publish interval, a single device generates **~17,280 rows/day** and **~6.3 million rows/year**. This table is the largest in the database by row count.

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Primary key. CUID. |
| `deviceId` | `String` | `TEXT` | ❌ | — | Foreign key → `devices.deviceId`. Identifies which device produced this reading. |
| `flowRateLpm` | `Float` | `DOUBLE PRECISION` | ❌ | — | **Instantaneous flow rate** measured at the moment of reading, in **litres per minute (L/min)**. Calculated from the YF-S201 pulse count. A value of `0.0` indicates no flow. |
| `totalLitres` | `Float` | `DOUBLE PRECISION` | ❌ | — | **Cumulative total volume** in litres since the device last booted or the pulse counter was reset. Monotonically increasing. Used to compute consumption over a period: `endTotal - startTotal`. |
| `timestamp` | `DateTime` | `TIMESTAMPTZ` | ❌ | — | **Sensor reading timestamp** in UTC. Set by the ESP32 using NTP-synced time. This is the authoritative time of the physical measurement, distinct from `createdAt` (DB insert time). |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Database insert timestamp. May lag slightly behind `timestamp` due to MQTT transit and processing time. |

---

### 5.3 `electricity_readings`

Stores every individual electricity reading from the PZEM-004T energy monitor. Row volume is identical to `water_readings` if published at the same rate.

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Primary key. CUID. |
| `deviceId` | `String` | `TEXT` | ❌ | — | Foreign key → `devices.deviceId`. |
| `voltage` | `Float` | `DOUBLE PRECISION` | ❌ | — | **RMS voltage** in Volts (V). Typical Indian mains: `220–240 V`. Values significantly outside this range indicate a supply issue. |
| `current` | `Float` | `DOUBLE PRECISION` | ❌ | — | **RMS current** in Amperes (A). Reflects the total load on the monitored circuit. |
| `power` | `Float` | `DOUBLE PRECISION` | ❌ | — | **Active (real) power** in Watts (W). `power = voltage × current × power_factor`. This is what the electricity meter (and bill) measures. |
| `energyKwh` | `Float` | `DOUBLE PRECISION` | ❌ | — | **Cumulative energy** in kilowatt-hours (kWh) as tracked by the PZEM-004T's internal counter. Monotonically increasing until manually reset. Used to compute consumption over a period: `endEnergy - startEnergy`. |
| `timestamp` | `DateTime` | `TIMESTAMPTZ` | ❌ | — | Sensor reading timestamp in UTC (NTP-synced on ESP32). |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Database insert timestamp. |

---

### 5.4 `anomalies`

Records every anomaly event detected by the server-side anomaly detection service. An anomaly is created when a reading's value breaches a configured threshold (e.g., flow rate exceeds 15 L/min, voltage drops below 190 V).

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Primary key. CUID. |
| `deviceId` | `String` | `TEXT` | ❌ | — | Foreign key → `devices.deviceId`. The device whose reading triggered this anomaly. |
| `resourceType` | `String` | `TEXT` | ❌ | — | Category of the anomaly. Valid values: `"water"` or `"electricity"`. Used for filtering on the dashboard. |
| `severity` | `String` | `TEXT` | ❌ | — | Importance level of the anomaly. Valid values: `"low"`, `"medium"`, `"high"`. Determines alert styling (yellow / orange / red). |
| `message` | `String` | `TEXT` | ❌ | — | Human-readable description of the anomaly, e.g., `"Flow rate 18.3 L/min exceeds high threshold of 15 L/min"`. |
| `actualValue` | `Float` | `DOUBLE PRECISION` | ❌ | — | The sensor reading value that triggered the anomaly (e.g., `18.3` for flow rate). |
| `baselineValue` | `Float` | `DOUBLE PRECISION` | ❌ | — | The expected or normal reference value (e.g., `5.0` for average flow). Used to show how far the reading deviated. |
| `threshold` | `Float` | `DOUBLE PRECISION` | ❌ | — | The configured threshold that was breached (e.g., `15.0`). |
| `resolvedAt` | `DateTime?` | `TIMESTAMPTZ` | ✅ | `NULL` | `NULL` while the anomaly is **active**. Set to a timestamp when the anomaly is marked as resolved (either automatically when readings normalise, or manually by a user). |
| `timestamp` | `DateTime` | `TIMESTAMPTZ` | ❌ | — | UTC timestamp of when the anomaly was first detected. |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Database insert timestamp. |

---

### 5.5 `water_daily_aggregates` (Optional)

Pre-computed summary rows, one per device per calendar day. Populated by a background job (e.g., a Node.js cron running at midnight UTC). Avoids full table scans of `water_readings` for dashboard charts showing "last 30 days of daily consumption."

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Primary key. |
| `deviceId` | `String` | `TEXT` | ❌ | — | FK → `devices.deviceId`. |
| `date` | `DateTime` | `TIMESTAMPTZ` | ❌ | — | Midnight UTC of the represented day (e.g., `2026-09-22T00:00:00.000Z`). |
| `totalLitres` | `Float` | `DOUBLE PRECISION` | ❌ | — | Total water consumed that day in litres: `MAX(totalLitres) - MIN(totalLitres)`. |
| `avgFlowRateLpm` | `Float` | `DOUBLE PRECISION` | ❌ | — | Mean flow rate across all readings that day. |
| `maxFlowRateLpm` | `Float` | `DOUBLE PRECISION` | ❌ | — | Peak instantaneous flow rate recorded that day. |
| `readingCount` | `Int` | `INTEGER` | ❌ | — | Number of raw `water_readings` rows included in this aggregate. |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Row creation timestamp. |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | (auto) | Last update timestamp (for re-aggregation). |

---

### 5.6 `electricity_daily_aggregates` (Optional)

Pre-computed daily electricity summaries, analogous to `water_daily_aggregates`.

| Column | Prisma Type | SQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | `String` | `TEXT` | ❌ | `cuid()` | Primary key. |
| `deviceId` | `String` | `TEXT` | ❌ | — | FK → `devices.deviceId`. |
| `date` | `DateTime` | `TIMESTAMPTZ` | ❌ | — | Midnight UTC of the represented day. |
| `totalEnergyKwh` | `Float` | `DOUBLE PRECISION` | ❌ | — | Total energy consumed that day in kWh: `MAX(energyKwh) - MIN(energyKwh)`. |
| `avgPower` | `Float` | `DOUBLE PRECISION` | ❌ | — | Average power draw across the day in Watts. |
| `maxPower` | `Float` | `DOUBLE PRECISION` | ❌ | — | Peak power draw recorded that day in Watts. |
| `avgVoltage` | `Float` | `DOUBLE PRECISION` | ❌ | — | Average mains voltage for the day in Volts. |
| `avgCurrent` | `Float` | `DOUBLE PRECISION` | ❌ | — | Average current for the day in Amperes. |
| `readingCount` | `Int` | `INTEGER` | ❌ | — | Number of raw `electricity_readings` rows included. |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | `now()` | Row creation timestamp. |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | ❌ | (auto) | Last update timestamp. |

---

## 6. Database Indexes — Detailed Explanation

A **database index** is a separate data structure (typically a B-Tree in PostgreSQL) that allows the database engine to find rows matching a condition without scanning every row in the table (a "sequential scan"). The trade-off is: indexes speed up reads (`SELECT`) but slow down writes (`INSERT`, `UPDATE`, `DELETE`) because the index must be maintained on every write.

For an IoT system with a **high write rate** (thousands of inserts per hour) and frequent **time-range reads** (dashboard queries), choosing the right indexes is critical.

---

### 6.1 Index: `@@index([deviceId, timestamp])` on `water_readings` and `electricity_readings`

**Purpose:** Speed up time-range queries scoped to a specific device.

**Columns Indexed:** `(device_id, timestamp)` — a **composite index**, sorted first by `device_id`, then by `timestamp` within each device group.

**Why this specific order?**

When PostgreSQL evaluates `WHERE device_id = 'X' AND timestamp >= '...' AND timestamp <= '...'`, it can use this composite index to:

1. Jump directly to the section of the B-Tree for `device_id = 'X'` — eliminating all rows for other devices in one step.
2. Within that section, perform a range scan on `timestamp` — returning only rows in the requested time window.

This is the **most frequently used query pattern** in this application. Almost every dashboard query asks: *"Give me all readings for device X between time A and time B."*

**Example query it helps:**

```typescript
// "Get all water readings for device esp32-lab-01 in the last hour"
const readings = await prisma.waterReading.findMany({
  where: {
    deviceId: 'esp32-lab-01',           // ← uses first part of composite index
    timestamp: {
      gte: new Date(Date.now() - 3600_000), // ← uses second part
    },
  },
  orderBy: { timestamp: 'asc' },
});
```

**Equivalent SQL:**

```sql
-- PostgreSQL query plan: "Index Scan using water_readings_device_id_timestamp_idx"
SELECT * FROM water_readings
WHERE device_id = 'esp32-lab-01'
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp ASC;
```

**Without this index:** PostgreSQL would scan all rows in `water_readings` (potentially millions), filter by device ID, then filter by timestamp. Query time: seconds.

**With this index:** PostgreSQL goes directly to matching rows. Query time: milliseconds.

**Write overhead:** Every `INSERT INTO water_readings` must also update this index (one B-Tree insertion). Negligible compared to the read benefit.

---

### 6.2 Index: `@@index([timestamp])` on `water_readings` and `electricity_readings`

**Purpose:** Speed up **global** time-range queries — queries across all devices.

**Columns Indexed:** `(timestamp)` — single-column index.

**When is this used?**

When a query does not filter by `deviceId` but needs all readings in a time window across all devices. Examples: "Show me every reading in the last 5 minutes" (for a live feed on the dashboard), or the anomaly detection service scanning recent readings from all devices.

**Example query it helps:**

```typescript
// "Get all readings from all devices in the last 5 minutes"
const recent = await prisma.waterReading.findMany({
  where: {
    timestamp: { gte: new Date(Date.now() - 300_000) },
    // No deviceId filter
  },
  orderBy: { timestamp: 'desc' },
  take: 100,
});
```

**Note on composite index vs single-column index:** The composite index `(deviceId, timestamp)` cannot be used efficiently for queries that **only** filter by `timestamp` (without `deviceId`), because `deviceId` is the leading column. Hence, a separate single-column `timestamp` index is needed for global queries.

**Write overhead:** Same as above — one additional B-Tree update per insert. Acceptable.

---

### 6.3 Index: `@@index([deviceId])` on `devices`

**Purpose:** Speed up lookups of the `devices` table by `deviceId`.

**Columns Indexed:** `(device_id)` — single-column index.

**Note:** `deviceId` already has a `@unique` constraint, which **automatically creates a unique index** in PostgreSQL. The explicit `@@index([deviceId])` in the Prisma schema is therefore somewhat redundant but serves as documentation intent.

**When is this used?**

- Every MQTT message arrives with a `deviceId`. Before inserting a reading, the API first looks up (or upserts) the device record: `WHERE device_id = '...'`.
- Device status updates (`UPDATE devices SET status = 'online' WHERE device_id = '...'`).

**Example query it helps:**

```typescript
const device = await prisma.device.findUnique({
  where: { deviceId: 'esp32-lab-01' },
});
```

**Without this index:** Full table scan of `devices`. With 100 devices, negligible. But the unique constraint index makes this an index scan regardless.

**Write overhead:** Minimal — the `devices` table has very few writes (only on device registration or status update, not on every sensor reading).

---

### 6.4 Index: `@@index([resourceType])` on `anomalies`

**Purpose:** Speed up filtering anomalies by resource type.

**Columns Indexed:** `(resource_type)` — single-column index.

**Why needed?**

The `anomalies` table will accumulate many rows over time. The dashboard "Anomalies" page commonly shows anomalies filtered by type: "Show only water anomalies" or "Show only electricity anomalies." Without this index, PostgreSQL must scan all anomaly rows and filter by `resource_type`.

**Example query it helps:**

```typescript
// "Get the 20 most recent water anomalies"
const waterAnomalies = await prisma.anomaly.findMany({
  where: { resourceType: 'water' },   // ← uses this index
  orderBy: { timestamp: 'desc' },
  take: 20,
});
```

**Cardinality consideration:** `resource_type` has very low cardinality (only 2 values: `"water"` and `"electricity"`). PostgreSQL's query planner may sometimes choose a sequential scan for very low-cardinality columns if the selectivity is low (e.g., if 90% of anomalies are `"water"` type, an index scan is not much better than a full scan). For this reason, a **composite index** `(resourceType, timestamp)` would be even more effective for queries that filter by type and sort by time — a future optimisation.

**Write overhead:** One B-Tree update per anomaly insert. Anomalies are rare events (orders of magnitude fewer rows than readings), so this cost is negligible.

---

### 6.5 Index Summary Table

| Index | Table | Columns | Query Pattern Optimised | Write Overhead |
|---|---|---|---|---|
| `water_readings_device_id_timestamp_idx` | `water_readings` | `(device_id, timestamp)` | Per-device time-range reads | Low |
| `water_readings_timestamp_idx` | `water_readings` | `(timestamp)` | Global time-range reads | Low |
| `electricity_readings_device_id_timestamp_idx` | `electricity_readings` | `(device_id, timestamp)` | Per-device time-range reads | Low |
| `electricity_readings_timestamp_idx` | `electricity_readings` | `(timestamp)` | Global time-range reads | Low |
| `anomalies_device_id_timestamp_idx` | `anomalies` | `(device_id, timestamp)` | Per-device anomaly history | Very Low |
| `anomalies_resource_type_idx` | `anomalies` | `(resource_type)` | Filter by water/electricity | Very Low |
| `anomalies_timestamp_idx` | `anomalies` | `(timestamp)` | Recent anomalies across all devices | Very Low |
| `devices_device_id_idx` (unique) | `devices` | `(device_id)` | Device lookup by ID | Very Low |

---

## 7. Common Queries (with Prisma Code)

The following queries cover the most common access patterns in the application. Each query includes TypeScript Prisma code, an explanation, and the equivalent SQL for reference.

> [!NOTE]
> All timestamps in the database are stored as **UTC**. The application layer converts to the user's local timezone for display. All `new Date()` calls in the examples produce UTC timestamps.

---

### Query 1: Get Latest Water Reading for a Device

**Use case:** Display the current flow rate on the device's live data card.

```typescript
// lib/queries/water.ts
import { prisma } from '@/lib/prisma';

export async function getLatestWaterReading(deviceId: string) {
  const reading = await prisma.waterReading.findFirst({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
  });
  return reading; // WaterReading | null
}
```

**Equivalent SQL:**

```sql
SELECT *
FROM water_readings
WHERE device_id = 'esp32-lab-01'
ORDER BY timestamp DESC
LIMIT 1;
```

**Index used:** `water_readings_device_id_timestamp_idx` — the composite index allows PostgreSQL to find the latest row for this device in O(log n) time.

---

### Query 2: Get Water Readings for Today for a Device

**Use case:** Plot today's flow rate over time on the dashboard chart.

```typescript
export async function getWaterReadingsToday(deviceId: string) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0); // Midnight UTC today

  const readings = await prisma.waterReading.findMany({
    where: {
      deviceId,
      timestamp: { gte: startOfToday },
    },
    orderBy: { timestamp: 'asc' },
  });
  return readings; // WaterReading[]
}
```

**Equivalent SQL:**

```sql
SELECT *
FROM water_readings
WHERE device_id = 'esp32-lab-01'
  AND timestamp >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
ORDER BY timestamp ASC;
```

**Index used:** `water_readings_device_id_timestamp_idx`.

---

### Query 3: Get Water Readings for Last 7 Days

**Use case:** Show a week's trend on a line chart.

```typescript
export async function getWaterReadingsLast7Days(deviceId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const readings = await prisma.waterReading.findMany({
    where: {
      deviceId,
      timestamp: { gte: sevenDaysAgo },
    },
    orderBy: { timestamp: 'asc' },
    // For charting, downsample — take one reading every N minutes
    // Full data: remove 'take' or use aggregation
  });
  return readings;
}
```

> [!TIP]
> For a 7-day chart, fetching every raw reading (~120,960 rows at 5-second intervals) is too much for a browser. In production, use `SELECT date_trunc('hour', timestamp), AVG(flow_rate_lpm) FROM water_readings GROUP BY 1` via Prisma's `$queryRaw` to get hourly averages instead.

**Equivalent SQL:**

```sql
SELECT *
FROM water_readings
WHERE device_id = 'esp32-lab-01'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp ASC;
```

---

### Query 4: Get Total Water Consumed Today

**Use case:** Show "X litres consumed today" on the dashboard summary card.

```typescript
export async function getTotalWaterConsumedToday(deviceId: string) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  // Strategy: MAX(totalLitres) - MIN(totalLitres) for the day.
  // This works because totalLitres is a monotonically increasing cumulative counter.
  const result = await prisma.waterReading.aggregate({
    where: {
      deviceId,
      timestamp: { gte: startOfToday },
    },
    _max: { totalLitres: true },
    _min: { totalLitres: true },
  });

  const max = result._max.totalLitres ?? 0;
  const min = result._min.totalLitres ?? 0;
  return max - min; // litres consumed today
}
```

**Equivalent SQL:**

```sql
SELECT
  MAX(total_litres) - MIN(total_litres) AS consumed_today_litres
FROM water_readings
WHERE device_id = 'esp32-lab-01'
  AND timestamp >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
```

---

### Query 5: Get Latest Electricity Reading

**Use case:** Display live voltage, current, and power on the dashboard.

```typescript
export async function getLatestElectricityReading(deviceId: string) {
  const reading = await prisma.electricityReading.findFirst({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
  });
  return reading; // ElectricityReading | null
}
```

**Equivalent SQL:**

```sql
SELECT *
FROM electricity_readings
WHERE device_id = 'esp32-lab-01'
ORDER BY timestamp DESC
LIMIT 1;
```

---

### Query 6: Get Electricity Readings for Today

**Use case:** Plot voltage and power over today's time range.

```typescript
export async function getElectricityReadingsToday(deviceId: string) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  return prisma.electricityReading.findMany({
    where: {
      deviceId,
      timestamp: { gte: startOfToday },
    },
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      voltage: true,
      current: true,
      power: true,
      energyKwh: true,
    },
  });
}
```

**Note:** Using `select` to return only the needed columns reduces data transfer between the database and the Node.js process — important when returning thousands of rows.

---

### Query 7: Get Recent Anomalies (Last 20, All Devices)

**Use case:** Populate the "Recent Alerts" panel on the main dashboard.

```typescript
export async function getRecentAnomalies(limit: number = 20) {
  return prisma.anomaly.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      device: {
        select: { deviceId: true, name: true },
      },
    },
  });
}
```

**Equivalent SQL:**

```sql
SELECT a.*, d.device_id, d.name AS device_name
FROM anomalies a
JOIN devices d ON d.device_id = a.device_id
ORDER BY a.timestamp DESC
LIMIT 20;
```

---

### Query 8: Get Anomalies in Last 24 Hours, Filtered by Resource Type

**Use case:** Dashboard filter: "Show only water anomalies in the last 24 hours."

```typescript
export async function getAnomaliesByType(
  resourceType: 'water' | 'electricity',
  hours: number = 24
) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return prisma.anomaly.findMany({
    where: {
      resourceType,                    // uses @@index([resourceType])
      timestamp: { gte: since },      // uses @@index([timestamp])
    },
    orderBy: { timestamp: 'desc' },
  });
}
```

**Equivalent SQL:**

```sql
SELECT *
FROM anomalies
WHERE resource_type = 'water'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

---

### Query 9: Update Device Status to Online

**Use case:** Called by the MQTT message handler when a device publishes its heartbeat or any reading.

```typescript
export async function setDeviceOnline(
  deviceId: string,
  rssi?: number,
  freeHeap?: number
) {
  return prisma.device.update({
    where: { deviceId },
    data: {
      status: 'online',
      lastSeenAt: new Date(),
      ...(rssi !== undefined && { rssi }),
      ...(freeHeap !== undefined && { freeHeap }),
    },
  });
}
```

**Equivalent SQL:**

```sql
UPDATE devices
SET
  status       = 'online',
  last_seen_at = NOW(),
  rssi         = -65,           -- if provided
  free_heap    = 204800,        -- if provided
  updated_at   = NOW()
WHERE device_id = 'esp32-lab-01';
```

---

### Query 10: Upsert Device on New MQTT Connection

**Use case:** When an MQTT message arrives from a `deviceId` that may or may not already exist in the database, use an upsert to either create or update the record atomically.

```typescript
export async function upsertDevice(
  deviceId: string,
  options?: { name?: string; rssi?: number; freeHeap?: number }
) {
  return prisma.device.upsert({
    where: { deviceId },
    create: {
      deviceId,
      name: options?.name ?? null,
      status: 'online',
      lastSeenAt: new Date(),
      rssi: options?.rssi ?? null,
      freeHeap: options?.freeHeap ?? null,
    },
    update: {
      status: 'online',
      lastSeenAt: new Date(),
      ...(options?.rssi !== undefined && { rssi: options.rssi }),
      ...(options?.freeHeap !== undefined && { freeHeap: options.freeHeap }),
    },
  });
}
```

**Equivalent SQL:**

```sql
INSERT INTO devices (id, device_id, name, status, last_seen_at, rssi, free_heap, created_at, updated_at)
VALUES (gen_random_uuid(), 'esp32-lab-01', NULL, 'online', NOW(), -65, 204800, NOW(), NOW())
ON CONFLICT (device_id) DO UPDATE SET
  status       = 'online',
  last_seen_at = NOW(),
  rssi         = EXCLUDED.rssi,
  free_heap    = EXCLUDED.free_heap,
  updated_at   = NOW();
```

> [!IMPORTANT]
> The `upsert` approach is **essential** for the MQTT handler. Device registration should be implicit — the device should not need to be pre-registered in the UI before it can start publishing data. The first MQTT message from a new device automatically creates its record.

---

## 8. Database Setup Instructions

Follow these steps in order to set up the PostgreSQL database for local development on Windows.

### Step 1: Install PostgreSQL 15 on Windows

1. Download the PostgreSQL 15 installer from the official EnterpriseDB download page:  
   `https://www.enterprisedb.com/downloads/postgres-postgresql-downloads`

2. Run the installer. When prompted:
   - **Installation Directory:** Accept the default (`C:\Program Files\PostgreSQL\15`)
   - **Data Directory:** Accept the default (`C:\Program Files\PostgreSQL\15\data`)
   - **Password:** Set a strong password for the `postgres` superuser. **Remember this password.**
   - **Port:** Accept the default (`5432`)
   - **Locale:** Accept the default

3. Complete the installer. **Do not** install Stack Builder unless you need additional tools.

4. Verify the installation by opening **pgAdmin 4** (installed alongside PostgreSQL) or by opening a new PowerShell window and running:

   ```powershell
   # Add PostgreSQL bin to PATH if not already added
   $env:PATH += ";C:\Program Files\PostgreSQL\15\bin"
   psql --version
   # Expected output: psql (PostgreSQL) 15.x
   ```

---

### Step 2: Create the `smart_monitor` Database

Open a PowerShell terminal and connect to PostgreSQL as the superuser:

```powershell
psql -U postgres -h localhost
```

Enter the password you set during installation. You will see the `postgres=#` prompt. Run the following SQL commands:

```sql
-- Create the database
CREATE DATABASE smart_monitor;

-- Create a dedicated application user (do not use the superuser in your app)
CREATE USER smart_monitor_user WITH PASSWORD 'your_secure_password_here';

-- Grant all privileges on the database to the application user
GRANT ALL PRIVILEGES ON DATABASE smart_monitor TO smart_monitor_user;

-- Connect to the new database to grant schema privileges
\c smart_monitor

-- Grant schema usage and creation privileges
GRANT USAGE ON SCHEMA public TO smart_monitor_user;
GRANT CREATE ON SCHEMA public TO smart_monitor_user;

-- Exit
\q
```

> [!CAUTION]
> Do not use the `postgres` superuser in your application's `DATABASE_URL`. Always use a dedicated user with only the required privileges. This follows the **principle of least privilege** and limits damage in case of SQL injection attacks.

---

### Step 3: Create the `.env` File

In the root of your project (`d:\Work\Smart IoT Based Water and Electricity Monitoring\`), create a file named `.env`:

```env
# .env
# =====================================================================
# DATABASE
# =====================================================================

# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL="postgresql://smart_monitor_user:your_secure_password_here@localhost:5432/smart_monitor?schema=public"

# =====================================================================
# OTHER ENVIRONMENT VARIABLES (add as needed)
# =====================================================================

# MQTT Broker
MQTT_BROKER_URL="mqtt://localhost:1883"

# Next.js
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

> [!CAUTION]
> **Never commit `.env` to version control.** Ensure `.env` is listed in your `.gitignore` file. Only commit `.env.example` (with placeholder values) to show teammates what variables are required.

---

### Step 4: Run `prisma migrate dev`

Ensure you are in the project root directory and have already run `npm install` (which installs `prisma` and `@prisma/client`). Then run:

```powershell
npx prisma migrate dev --name init
```

This command will:

1. **Read** `prisma/schema.prisma`.
2. **Compare** it against the current database state (initially empty).
3. **Generate** a new SQL migration file at `prisma/migrations/TIMESTAMP_init/migration.sql`.
4. **Apply** the migration to the `smart_monitor` database (creating all tables and indexes).
5. **Generate** the Prisma Client TypeScript code in `node_modules/@prisma/client`.

**Expected output (abbreviated):**

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "smart_monitor"

Applying migration `20260922000000_init`

The following migration(s) have been applied:

migrations/
  └─ 20260922000000_init/
       └─ migration.sql

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 250ms
```

> [!TIP]
> The generated `migration.sql` file is stored in version control. Every time you change `schema.prisma` and run `prisma migrate dev --name <descriptive-name>`, a new migration file is added. Team members pull the repo and run `npx prisma migrate deploy` to apply all pending migrations to their local database.

---

### Step 5: Generate the Prisma Client

If you have not run `migrate dev` (e.g., in a CI/CD environment after applying migrations with `migrate deploy`), generate the client separately:

```powershell
npx prisma generate
```

This re-generates the TypeScript types in `node_modules/@prisma/client` from the current `schema.prisma`. Run this any time you change the schema, even without a migration (e.g., if you only changed a `// comment`).

---

### Step 6: Verify with Prisma Studio

```powershell
npx prisma studio
```

This opens a web-based database browser at `http://localhost:5555`. You can:

- Browse all tables (`devices`, `water_readings`, etc.).
- Filter and sort records.
- Edit or delete individual rows.
- Verify that tables and columns were created correctly.

After setup, the `devices` table will be empty. You can manually insert a device record here for testing, or let the MQTT handler create one automatically when the ESP32 connects.

---

### Step 7: Create the Prisma Client Singleton

Create the file `lib/prisma.ts` in your Next.js project:

```typescript
// lib/prisma.ts
// Singleton Prisma client instance for Next.js.
// Prevents creating multiple instances during hot module reloading in development.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

Import this singleton in all API routes and server components:

```typescript
import { prisma } from '@/lib/prisma';
```

---

## 9. Data Retention Policy

### For the College Prototype

**No automated data retention policy is implemented.** For the duration of the college PBL demonstration period (typically a few weeks), the volume of data will remain manageable:

| Sensor | Publish Rate | Rows/Day | Rows/Month |
|---|---|---|---|
| Water (YF-S201) | Every 5 seconds | ~17,280 | ~518,400 |
| Electricity (PZEM-004T) | Every 5 seconds | ~17,280 | ~518,400 |
| **Total** | | **~34,560** | **~1,036,800** |

At approximately 200 bytes per row (CUID + Float columns + timestamps), 1 million rows consumes roughly **200 MB** of disk space — well within the capacity of any development machine.

### For a Production System

If this project were deployed in a real home or building for a full year, the raw readings tables would accumulate **~12.6 million rows/year per device**. At that scale, the following strategies should be considered:

#### 9.1 Table Partitioning by Month

PostgreSQL supports **declarative table partitioning**. Partition `water_readings` and `electricity_readings` by month:

```sql
-- Example: partition water_readings by range on timestamp
CREATE TABLE water_readings (
  id           TEXT NOT NULL,
  device_id    TEXT NOT NULL,
  flow_rate_lpm DOUBLE PRECISION NOT NULL,
  total_litres  DOUBLE PRECISION NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE TABLE water_readings_2026_09
  PARTITION OF water_readings
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

With partitioning, queries like `WHERE timestamp >= '2026-09-01'` only scan the September partition, not the entire table.

#### 9.2 Archiving Old Data

Move raw readings older than 6 months to a cold-storage table (or a separate archive database). Retain only daily aggregates for older periods.

#### 9.3 Use TimescaleDB

For serious IoT deployments, consider **TimescaleDB** — a PostgreSQL extension that adds native time-series capabilities (automatic partitioning by time, continuous aggregates, data retention policies) without changing the query syntax. The Prisma schema would remain identical.

#### 9.4 Continuous Aggregation

Schedule a PostgreSQL `pg_cron` job to populate the `water_daily_aggregates` and `electricity_daily_aggregates` tables every night, then delete raw readings older than 30 days (keeping only the aggregate summaries for older data).

---

## 10. Sample Data (SQL INSERT Examples)

Use the following SQL to populate the database with realistic test data. Run these statements in `psql` or **pgAdmin** after running Prisma migrations.

> [!NOTE]
> Prisma uses `TEXT` for all `String` primary keys (CUIDs). For testing with raw SQL, we use `gen_random_uuid()` as a stand-in, or hard-coded CUID-like strings. In the actual application, CUIDs are generated by the Prisma client.

---

### 10.1 Insert Test Devices

```sql
-- Insert two test devices
INSERT INTO devices (id, device_id, name, status, last_seen_at, rssi, free_heap, created_at, updated_at)
VALUES
  (
    'clzabc123000001device001',
    'esp32-lab-01',
    'Lab Water & Electricity Meter',
    'online',
    NOW(),
    -65,
    212000,
    NOW(),
    NOW()
  ),
  (
    'clzabc123000002device002',
    'esp32-lab-02',
    'Spare ESP32 (Offline Test)',
    'offline',
    NOW() - INTERVAL '2 hours',
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 hours'
  );
```

---

### 10.2 Insert Sample Water Readings

```sql
-- Insert 12 water readings for esp32-lab-01 over the last hour (every 5 minutes)
INSERT INTO water_readings (id, device_id, flow_rate_lpm, total_litres, timestamp, created_at)
VALUES
  ('clzwr00000001wr001', 'esp32-lab-01', 0.00,  125.30, NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '60 minutes'),
  ('clzwr00000002wr002', 'esp32-lab-01', 2.45,  125.50, NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '55 minutes'),
  ('clzwr00000003wr003', 'esp32-lab-01', 4.10,  125.95, NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes'),
  ('clzwr00000004wr004', 'esp32-lab-01', 5.30,  126.55, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  ('clzwr00000005wr005', 'esp32-lab-01', 5.10,  127.10, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '40 minutes'),
  ('clzwr00000006wr006', 'esp32-lab-01', 0.00,  127.10, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
  ('clzwr00000007wr007', 'esp32-lab-01', 0.00,  127.10, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
  ('clzwr00000008wr008', 'esp32-lab-01', 3.75,  127.45, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes'),
  ('clzwr00000009wr009', 'esp32-lab-01', 18.90, 129.30, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),  -- Anomalous spike!
  ('clzwr00000010wr010', 'esp32-lab-01', 4.20,  129.75, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
  ('clzwr00000011wr011', 'esp32-lab-01', 4.05,  130.18, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
  ('clzwr00000012wr012', 'esp32-lab-01', 3.95,  130.57, NOW() - INTERVAL '5 minutes',  NOW() - INTERVAL '5 minutes');
```

---

### 10.3 Insert Sample Electricity Readings

```sql
-- Insert 12 electricity readings for esp32-lab-01 over the last hour (every 5 minutes)
INSERT INTO electricity_readings (id, device_id, voltage, current, power, energy_kwh, timestamp, created_at)
VALUES
  ('clzer00000001er001', 'esp32-lab-01', 231.5, 1.20, 277.8,  0.4200, NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '60 minutes'),
  ('clzer00000002er002', 'esp32-lab-01', 230.8, 1.22, 281.6,  0.4225, NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '55 minutes'),
  ('clzer00000003er003', 'esp32-lab-01', 229.7, 1.25, 287.1,  0.4250, NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes'),
  ('clzer00000004er004', 'esp32-lab-01', 232.1, 1.18, 273.9,  0.4273, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  ('clzer00000005er005', 'esp32-lab-01', 231.3, 2.85, 659.2,  0.4328, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '40 minutes'),  -- High load
  ('clzer00000006er006', 'esp32-lab-01', 228.9, 2.90, 664.0,  0.4383, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
  ('clzer00000007er007', 'esp32-lab-01', 230.5, 2.88, 663.8,  0.4439, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
  ('clzer00000008er008', 'esp32-lab-01', 229.8, 1.20, 275.8,  0.4461, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes'),
  ('clzer00000009er009', 'esp32-lab-01', 185.2, 1.35, 250.0,  0.4482, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),  -- Low voltage anomaly!
  ('clzer00000010er010', 'esp32-lab-01', 231.0, 1.21, 279.5,  0.4505, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
  ('clzer00000011er011', 'esp32-lab-01', 230.7, 1.19, 274.5,  0.4528, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
  ('clzer00000012er012', 'esp32-lab-01', 231.2, 1.21, 279.8,  0.4551, NOW() - INTERVAL '5 minutes',  NOW() - INTERVAL '5 minutes');
```

---

### 10.4 Insert Sample Anomalies

```sql
-- Anomaly 1: Water flow spike (from reading 9 above)
INSERT INTO anomalies (id, device_id, resource_type, severity, message, actual_value, baseline_value, threshold, resolved_at, timestamp, created_at)
VALUES (
  'clzan00000001an001',
  'esp32-lab-01',
  'water',
  'high',
  'Flow rate 18.90 L/min exceeds high threshold of 15.00 L/min. Possible pipe burst or tap left open.',
  18.90,
  4.50,
  15.00,
  NULL,
  NOW() - INTERVAL '20 minutes',
  NOW() - INTERVAL '20 minutes'
);

-- Anomaly 2: Low voltage (from electricity reading 9 above)
INSERT INTO anomalies (id, device_id, resource_type, severity, message, actual_value, baseline_value, threshold, resolved_at, timestamp, created_at)
VALUES (
  'clzan00000002an002',
  'esp32-lab-01',
  'electricity',
  'medium',
  'Voltage 185.2 V is below the low threshold of 190.0 V. Possible brownout or wiring issue.',
  185.20,
  231.00,
  190.00,
  NOW() - INTERVAL '15 minutes',  -- resolved after one reading
  NOW() - INTERVAL '20 minutes',
  NOW() - INTERVAL '20 minutes'
);

-- Anomaly 3: Historical resolved water anomaly (for testing filter UI)
INSERT INTO anomalies (id, device_id, resource_type, severity, message, actual_value, baseline_value, threshold, resolved_at, timestamp, created_at)
VALUES (
  'clzan00000003an003',
  'esp32-lab-01',
  'water',
  'low',
  'No water flow detected for 45 minutes during expected usage hours. Possible sensor disconnection.',
  0.00,
  3.50,
  0.10,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
);
```

---

### 10.5 Verify the Inserted Data

Run these queries in `psql` or pgAdmin to confirm the data was inserted correctly:

```sql
-- Count rows in each table
SELECT 'devices'              AS table_name, COUNT(*) AS row_count FROM devices
UNION ALL
SELECT 'water_readings',                    COUNT(*)              FROM water_readings
UNION ALL
SELECT 'electricity_readings',              COUNT(*)              FROM electricity_readings
UNION ALL
SELECT 'anomalies',                         COUNT(*)              FROM anomalies;

-- Latest water reading
SELECT device_id, flow_rate_lpm, total_litres, timestamp
FROM water_readings
ORDER BY timestamp DESC
LIMIT 1;

-- Active (unresolved) anomalies
SELECT device_id, resource_type, severity, message, timestamp
FROM anomalies
WHERE resolved_at IS NULL
ORDER BY timestamp DESC;

-- Total water consumed today
SELECT
  device_id,
  ROUND(CAST(MAX(total_litres) - MIN(total_litres) AS NUMERIC), 2) AS consumed_today_litres
FROM water_readings
WHERE timestamp >= DATE_TRUNC('day', NOW())
GROUP BY device_id;
```

---

*End of DATABASE_DESIGN.md*  
*Document maintained by: Smart IoT Project Team*  
*Last updated: 2026-09-22*
