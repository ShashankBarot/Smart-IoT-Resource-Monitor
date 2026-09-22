# SOFTWARE_ARCHITECTURE.md
# Smart IoT-Based Water and Electricity Consumption Monitoring System

> **Document Type:** Software Architecture Specification  
> **Project Type:** College Project-Based Learning (PBL)  
> **Version:** 1.0.0  
> **Date:** September 2026  
> **Status:** Active — MVP Prototype

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Data Flow — Step by Step](#5-data-flow--step-by-step)
6. [Component Responsibilities](#6-component-responsibilities)
7. [Communication Protocols](#7-communication-protocols)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Security Considerations](#9-security-considerations)
10. [Scalability Notes](#10-scalability-notes)
11. [Design Decisions](#11-design-decisions)
12. [Constraints and Assumptions](#12-constraints-and-assumptions)

---

## 1. Project Overview

### 1.1 Brief Description

The **Smart IoT-Based Water and Electricity Consumption Monitoring System** is a prototype IoT solution that enables real-time monitoring of household or laboratory water and electricity usage. An ESP32 microcontroller reads data from a flow sensor (for water) and a current/voltage sensor (for electricity), then publishes structured JSON payloads over MQTT to a local Mosquitto broker. A Node.js backend subscribes to these MQTT topics, validates and persists the data in a PostgreSQL database via Prisma ORM, exposes a REST API for historical queries, and broadcasts live readings over WebSocket (Socket.IO) to a Next.js dashboard that renders real-time charts and summary cards.

### 1.2 Problem Statement

Conventional utility meters in homes, hostels, and small laboratories provide no real-time visibility into consumption patterns. Users receive their bills at month-end with no actionable insight into which time-of-day, appliance, or event caused a spike in usage. Wastage — dripping taps, always-on appliances, invisible leaks — is discovered only after the damage is done. This project addresses that gap by providing a low-cost, always-on, real-time monitoring layer that runs entirely on a local area network, requiring no subscription, no cloud account, and no proprietary hardware.

### 1.3 Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | Read water flow rate in real time | Sensor polling every 1 s, MQTT publish every 5 s |
| G2 | Read RMS current and voltage in real time | ADC sampling at 1 kHz, publish every 5 s |
| G3 | Persist all readings with timestamps in a relational database | 100% of published payloads stored |
| G4 | Expose a REST API for historical data retrieval | Response < 200 ms for queries up to 30 days |
| G5 | Display a live dashboard with charts updating ≤ 2 s behind real world | WebSocket push on every new reading |
| G6 | Detect simple anomalies (threshold breach) and flag them | Alert flag stored and surfaced in UI |
| G7 | Keep the entire system runnable on a single developer laptop | Docker Compose + npm dev scripts |

### 1.4 Scope

**In Scope (MVP):**
- Single ESP32 device reading one flow sensor and one current/voltage sensor pair.
- MQTT over plain TCP on a local Wi-Fi network.
- Node.js backend with MQTT subscriber, REST API, and WebSocket server.
- PostgreSQL database with time-series-style readings table.
- Next.js frontend dashboard with live charts, daily totals, and threshold alerts.
- Docker Compose for local Mosquitto broker and PostgreSQL database.
- An MQTT simulator script (`mqtt-simulator.ts`) for testing without physical hardware.
- Basic threshold-based anomaly detection (e.g., flow rate > X L/min, power > Y W).

### 1.5 What Is Explicitly NOT in Scope (MVP)

> [!IMPORTANT]
> The following features are intentionally excluded from the MVP. They are documented in [Section 10](#10-scalability-notes) as future enhancements.

| Excluded Feature | Reason for Exclusion |
|-----------------|----------------------|
| Machine Learning / AI anomaly detection | Requires significant training data and infrastructure; out of scope for prototype |
| Cloud deployment (AWS, Azure, GCP, Firebase) | Adds cost, complexity, and account dependencies; local-first is sufficient for PBL |
| User authentication & authorization | MVP has a single known user (the developer/lab); auth adds weeks of work |
| HTTPS / TLS on REST API | Local-only network; TLS termination is deferred to production stage |
| MQTT username/password or TLS | Broker is on localhost; security is documented but not implemented |
| Multi-device / multi-ESP32 support | Architecture allows it, but MVP tests with one device |
| Billing-grade measurement accuracy | Consumer-grade sensors (ACS712, YF-S201) have ±2–5% error; not suitable for billing |
| Mobile application | Browser-based dashboard is sufficient for prototype evaluation |
| Push notifications (email / SMS / WhatsApp) | Deferred to future; UI alert is sufficient for MVP |
| OTA (Over-the-Air) firmware updates | Manual serial flash is acceptable for prototype stage |

---

## 2. System Architecture Diagram

### 2.1 ASCII Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                  SMART IoT RESOURCE MONITORING — SYSTEM ARCHITECTURE            ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                          PHYSICAL LAYER                                      │
  │                                                                              │
  │   ┌─────────────┐       ┌──────────────────┐                                │
  │   │  YF-S201    │       │  ACS712 / ZMPT101B│                               │
  │   │ Flow Sensor │       │  Current + Voltage│                               │
  │   │ (pulse out) │       │  Sensor (analog)  │                               │
  │   └──────┬──────┘       └────────┬─────────┘                                │
  │          │ GPIO pulse count       │ ADC pin (0–3.3 V)                        │
  │          └───────────┬───────────┘                                           │
  │                      ▼                                                       │
  │              ┌───────────────┐                                               │
  │              │    ESP32      │  (Espressif ESP32-WROOM-32D)                  │
  │              │  Microcontroller                                              │
  │              │  - WiFi STA   │                                               │
  │              │  - MQTT Client│                                               │
  │              │  - PubSubClient│                                              │
  │              └───────┬───────┘                                               │
  └──────────────────────┼───────────────────────────────────────────────────────┘
                         │
                         │  Wi-Fi (IEEE 802.11 b/g/n)
                         │  TCP/IP — Port 1883 (MQTT)
                         │
  ┌──────────────────────▼───────────────────────────────────────────────────────┐
  │                          BROKER LAYER                                        │
  │                                                                              │
  │              ┌────────────────────────────┐                                  │
  │              │   Eclipse Mosquitto 2.x    │                                  │
  │              │   MQTT Broker              │                                  │
  │              │   localhost:1883           │                                  │
  │              │   (Docker container)       │                                  │
  │              └───────────┬────────────────┘                                  │
  └──────────────────────────┼───────────────────────────────────────────────────┘
                             │
                             │  MQTT subscription (internal TCP)
                             │  Topics: home/water/#, home/electricity/#
                             │
  ┌──────────────────────────▼───────────────────────────────────────────────────┐
  │                          BACKEND LAYER                                       │
  │                                                                              │
  │   ┌────────────────────────────────────────────────────────────────────┐    │
  │   │                      Node.js (TypeScript)                          │    │
  │   │                                                                    │    │
  │   │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │    │
  │   │  │  MQTT Sub    │  │  REST API        │  │  WebSocket Server    │  │    │
  │   │  │  (mqtt.js)   │→ │  (Express.js)    │  │  (Socket.IO)         │  │    │
  │   │  └──────┬───────┘  └────────┬────────┘  └──────────┬───────────┘  │    │
  │   │         │                   │                        │              │    │
  │   │         ▼                   ▼                        │              │    │
  │   │  ┌──────────────┐  ┌────────────────┐               │              │    │
  │   │  │  Validation  │  │  Analytics &   │               │              │    │
  │   │  │  (Zod)       │  │  Anomaly Detect│───────────────┘              │    │
  │   │  └──────┬───────┘  └────────────────┘                              │    │
  │   │         │                                                           │    │
  │   │         ▼                                                           │    │
  │   │  ┌──────────────┐                                                   │    │
  │   │  │  Prisma ORM  │                                                   │    │
  │   │  └──────┬───────┘                                                   │    │
  │   └─────────┼──────────────────────────────────────────────────────────┘    │
  └─────────────┼─────────────────────────────────────────────────────────────── ┘
                │
                │  PostgreSQL wire protocol (TCP port 5432)
                │
  ┌─────────────▼───────────────────────────────────────────────────────────────┐
  │                          DATABASE LAYER                                     │
  │                                                                             │
  │              ┌─────────────────────────────┐                               │
  │              │   PostgreSQL 15             │                               │
  │              │   (Docker container)        │                               │
  │              │   localhost:5432            │                               │
  │              │   DB: smart_monitor         │                               │
  │              └─────────────────────────────┘                               │
  └─────────────────────────────────────────────────────────────────────────────┘
                │
                │  HTTP REST (port 3001) + WebSocket (Socket.IO, port 3001)
                │
  ┌─────────────▼───────────────────────────────────────────────────────────────┐
  │                          FRONTEND LAYER                                     │
  │                                                                             │
  │              ┌─────────────────────────────────────────┐                   │
  │              │   Next.js 14 (App Router)               │                   │
  │              │   localhost:3000                        │                   │
  │              │                                         │                   │
  │              │  ┌─────────────┐  ┌──────────────────┐ │                   │
  │              │  │  React      │  │   Recharts /     │ │                   │
  │              │  │  Server &   │  │   Chart.js       │ │                   │
  │              │  │  Client     │  │   (live charts)  │ │                   │
  │              │  │  Components │  └──────────────────┘ │                   │
  │              │  └─────────────┘                        │                   │
  │              └─────────────────────────────────────────┘                   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mermaid Flowchart — Complete Data Flow

```mermaid
flowchart TD
    subgraph HW["🔌 Physical Layer"]
        FS["YF-S201 Flow Sensor\n(pulse output)"]
        CS["ACS712 Current Sensor\n(0–5V analog)"]
        VS["ZMPT101B Voltage Sensor\n(0–3.3V analog)"]
    end

    subgraph FW["⚙️ Firmware — ESP32"]
        GPIO["GPIO Interrupt\nPulse Counter"]
        ADC["ADC Sampling\n1 kHz, 1000 samples"]
        CALC["RMS Calculation\n& Flow Rate Math"]
        PAYLOAD["Build JSON Payload"]
        MQTTPUB["MQTT Publish\nevery 5 s"]
    end

    subgraph BROKER["📡 Broker Layer"]
        MOSQ["Eclipse Mosquitto 2.x\nlocalhost:1883\nDocker"]
    end

    subgraph BACKEND["🖥️ Backend — Node.js / TypeScript"]
        MQTTSUB["MQTT Subscriber\n(mqtt.js)"]
        VALID["Payload Validation\n(Zod schema)"]
        SVC["Reading Service\nBusiness Logic"]
        PRISMA["Prisma ORM\nPostgreSQL client"]
        ANALYTICS["Analytics Service\nDaily totals, averages"]
        ANOMALY["Anomaly Detector\nThreshold checks"]
        REST["Express REST API\nGET /readings, /analytics"]
        WSS["Socket.IO Server\nReal-time broadcast"]
    end

    subgraph DB["🗄️ Database — PostgreSQL 15"]
        PG["smart_monitor DB\nReadings, Devices, Alerts"]
    end

    subgraph FE["🌐 Frontend — Next.js 14"]
        SOCKET["Socket.IO Client\nuseSocket hook"]
        STATE["React State\nuseReadings hook"]
        CHART["Recharts\nReal-time line charts"]
        CARDS["Summary Cards\nkWh, Litres, Cost est."]
        ALERT_UI["Alert Banner\nThreshold breach UI"]
    end

    FS -->|"pulse/tick"| GPIO
    CS -->|"analog V"| ADC
    VS -->|"analog V"| ADC
    GPIO --> CALC
    ADC --> CALC
    CALC --> PAYLOAD
    PAYLOAD --> MQTTPUB
    MQTTPUB -->|"TCP 1883\nhome/water/flow\nhome/electricity/power"| MOSQ
    MOSQ -->|"MQTT subscribe"| MQTTSUB
    MQTTSUB --> VALID
    VALID -->|"valid payload"| SVC
    VALID -->|"invalid — log & discard"| MQTTSUB
    SVC --> PRISMA
    SVC --> ANALYTICS
    SVC --> ANOMALY
    PRISMA -->|"INSERT"| PG
    ANALYTICS -->|"upsert daily summary"| PG
    ANOMALY -->|"INSERT alert"| PG
    SVC -->|"emit reading event"| WSS
    ANOMALY -->|"emit alert event"| WSS
    PG -->|"SELECT"| REST
    REST -->|"JSON response"| FE
    WSS -->|"WebSocket push"| SOCKET
    SOCKET --> STATE
    STATE --> CHART
    STATE --> CARDS
    STATE --> ALERT_UI
```

### 2.3 Mermaid Sequence Diagram — Single Reading Cycle

```mermaid
sequenceDiagram
    participant S as Sensor
    participant E as ESP32
    participant M as Mosquitto
    participant B as Node.js Backend
    participant D as PostgreSQL
    participant F as Next.js Frontend

    Note over S,E: Every 5 seconds
    S->>E: Pulse count / ADC voltage
    E->>E: Calculate flow rate & RMS power
    E->>E: Serialize to JSON
    E->>M: PUBLISH home/water/flow {flowRate, totalLitres, ts}
    E->>M: PUBLISH home/electricity/power {voltage, current, power, ts}
    M->>B: Deliver to subscriber
    B->>B: Validate with Zod
    B->>D: INSERT reading (Prisma)
    B->>B: Compute daily analytics
    B->>D: UPSERT daily_summary
    B->>B: Check anomaly thresholds
    alt Anomaly detected
        B->>D: INSERT alert record
        B->>F: EMIT socket alert_triggered
    end
    B->>F: EMIT socket reading_received
    F->>F: Update React state
    F->>F: Re-render chart & cards
    Note over F: Dashboard updates ≤ 2 s after sensor event
```

---

## 3. Technology Stack

### 3.1 Hardware Layer

| Component | Part / Model | Purpose | Reason for Choice |
|-----------|-------------|---------|-------------------|
| Microcontroller | **Espressif ESP32-WROOM-32D** | Central processing unit, Wi-Fi, ADC, GPIO | Built-in Wi-Fi + Bluetooth, dual-core Xtensa LX6 @ 240 MHz, 34 GPIO, 12-bit ADC (18 channels), 4 MB Flash. Industry-standard for IoT prototypes. Available for ~₹350. |
| Flow Sensor | **YF-S201** | Measures water flow rate via Hall-effect pulses | 1–30 L/min range, 5 V supply, pulse frequency ∝ flow rate (F = 7.5 × Q Hz). Widely available, easy to interface with GPIO interrupt. ~₹150. |
| Current Sensor | **ACS712-05B** (5A range) | Measures AC/DC current via Hall effect | Ratiometric analog output (2.5 V ± sensitivity × I), 5 A range suitable for household circuits up to ~1100 W at 230 V. Safe isolated measurement. ~₹80. |
| Voltage Sensor | **ZMPT101B** | Measures AC mains voltage | Isolated transformer + op-amp, outputs 0–3.3 V AC waveform readable by ESP32 ADC. Required for true power calculation. ~₹60. |
| Voltage Regulator | **AMS1117-3.3** on dev board | Power supply for ESP32 | ESP32 dev board includes regulator; USB 5 V → 3.3 V for MCU and sensors. |
| Resistors / Capacitors | Assorted | Signal conditioning, voltage dividers | Protect ADC pins from overvoltage; RC filter for ADC inputs. |

> [!WARNING]
> **Electrical Safety:** The ZMPT101B and ACS712 interface with or near mains AC voltage (230 V, 50 Hz). This circuitry **must never** be assembled on an open breadboard. Use a proper insulated enclosure, work under qualified electrical supervision, and follow all applicable safety codes. See [Section 9](#9-security-considerations) for full safety documentation.

### 3.2 Firmware Layer

| Technology | Version | Purpose | Reason |
|-----------|---------|---------|--------|
| **C++ (Arduino framework)** | C++17 via PlatformIO | Firmware language | Arduino ecosystem has the broadest ESP32 library support. Familiar syntax for college-level embedded projects. |
| **PlatformIO** | 6.x (VS Code extension) | Build system and dependency manager | Superior to Arduino IDE for multi-file projects: proper CMake, library management via `platformio.ini`, serial monitor, linting. |
| **Arduino ESP32 Core** | 2.x (Espressif) | HAL for ESP32 peripherals | Official Espressif-maintained Arduino core for ESP32. Provides WiFi.h, analogRead(), attachInterrupt(). |
| **PubSubClient** (knolleary) | 2.8.0 | MQTT client library | Lightweight MQTT 3.1.1 client, widely used, compatible with ESP32. Supports publish, subscribe, QoS 0/1. |
| **ArduinoJson** | 7.x | JSON serialization for payloads | Efficient, zero-allocation JSON builder for embedded. Produces compact payloads suitable for MQTT. |
| **WiFiManager** (tzapu) | 2.0.x | Wi-Fi provisioning (optional) | Allows Wi-Fi credentials to be set via captive portal without reflashing; useful for demos. |

### 3.3 Broker Layer

| Technology | Version | Purpose | Reason |
|-----------|---------|---------|--------|
| **Eclipse Mosquitto** | 2.0.x | MQTT message broker | The reference open-source MQTT broker. Lightweight (<1 MB RAM), runs in Docker, supports MQTT 3.1.1 and 5.0, persistent sessions, QoS 0/1/2. No license cost. |
| **Docker** | 24.x | Container runtime for Mosquitto | Ensures Mosquitto runs identically on any developer machine. Single `docker-compose up` command. |

### 3.4 Backend Layer

| Technology | Version | Purpose | Reason |
|-----------|---------|---------|--------|
| **Node.js** | 20.x LTS | Backend runtime | Non-blocking event loop is ideal for I/O-heavy workloads (MQTT messages, DB writes, WebSocket broadcasting). Large ecosystem. LTS ensures stability. |
| **TypeScript** | 5.x | Language | Static typing catches payload shape errors at compile time, critical when working with sensor data that may be malformed. |
| **Express.js** | 4.x | HTTP REST API framework | Minimal, well-understood, huge middleware ecosystem. Sufficient for prototype; could be swapped for Fastify for production. |
| **mqtt.js** | 5.x | MQTT client for Node.js | The canonical MQTT client for Node.js. Supports MQTT 5.0, reconnect logic, QoS. Maintained by the MQTT.js org. |
| **Socket.IO** | 4.x | WebSocket server | Provides room-based event broadcasting with automatic fallback to long-polling. Works seamlessly with Next.js Socket.IO client. |
| **Zod** | 3.x | Schema validation | Runtime validation of MQTT payloads and REST request bodies. TypeScript-first; infers types from schemas automatically. |
| **Prisma ORM** | 5.x | Database ORM | Type-safe database client, auto-generated from schema. Migrations via `prisma migrate`. Eliminates raw SQL for CRUD operations. |
| **ts-node / tsx** | latest | TypeScript runner | Run TypeScript directly in development without pre-compilation step. `tsx` is faster than `ts-node` for watch mode. |
| **dotenv** | 16.x | Environment variable loading | Load `.env` values at runtime for DB URL, MQTT host, ports. |

### 3.5 Database Layer

| Technology | Version | Purpose | Reason |
|-----------|---------|---------|--------|
| **PostgreSQL** | 15.x | Relational database | ACID compliance ensures no reading is lost even if the backend crashes mid-write. JSON column support for flexible alert metadata. Superior time-series query performance over MongoDB for ordered, typed data. Row-level timestamping via `TIMESTAMPTZ`. |
| **Docker** | 24.x | Container runtime for PostgreSQL | Reproducible database environment. Volume-mounted for data persistence across restarts. |

### 3.6 Frontend Layer

| Technology | Version | Purpose | Reason |
|-----------|---------|---------|--------|
| **Next.js** | 14.x (App Router) | React framework | Server Components for initial data load (SSR); Client Components for live charts. File-based routing. Zero-config build. |
| **React** | 18.x | UI library | Component model and hooks (`useState`, `useEffect`, `useRef`) are ideal for managing streaming sensor data in UI. |
| **TypeScript** | 5.x | Language | Shared types between backend and frontend (via a `types/` package) prevent API contract mismatches. |
| **Recharts** | 2.x | Charting library | Declarative, React-native chart library. `LineChart` with real-time data append works well for streaming sensor readings. |
| **Socket.IO Client** | 4.x | WebSocket client | Pairs with the backend Socket.IO server. Auto-reconnect, event-based API. |
| **Tailwind CSS** | 3.x | Styling | Utility-first CSS eliminates the need to write custom SCSS. Consistent, responsive layout with minimal boilerplate. |
| **ShadCN/UI** | latest | UI component library | Pre-built, accessible components (Card, Badge, Alert) styled with Tailwind. Reduces UI development time. |
| **date-fns** | 3.x | Date formatting | Lightweight date manipulation for chart X-axis labels and timestamp formatting. |

---

## 4. Repository Structure

### 4.1 Complete Directory Tree

```
smart-resource-monitor/
│
├── firmware/
│   └── esp32/
│       ├── platformio.ini          # PlatformIO project config: board, framework, lib deps
│       ├── src/
│       │   ├── main.cpp            # Entry point: setup() and loop(); orchestrates all modules
│       │   ├── config.h            # All compile-time constants: Wi-Fi SSID/pass, MQTT host,
│       │   │                       #   topic strings, sensor pins, calibration factors
│       │   ├── sensors.h / .cpp    # Sensor abstraction: readFlowRate(), readRMSCurrent(),
│       │   │                       #   readRMSVoltage(), buildWaterPayload(), buildPowerPayload()
│       │   ├── mqtt_client.h/.cpp  # MQTT wrapper: connect(), reconnect(), publish(),
│       │   │                       #   callback() for incoming messages (future use)
│       │   └── wifi_manager.h/.cpp # Wi-Fi connection: connectWiFi(), isConnected(),
│       │                           #   reconnectWiFi(); manages WiFiClient instance
│       └── test/                   # PlatformIO unit tests (optional)
│           └── test_sensors.cpp    # Unit tests for sensor math functions
│
├── backend/
│   ├── src/
│   │   ├── server.ts               # HTTP server bootstrap: creates Express app, attaches
│   │   │                           #   Socket.IO, starts listening on PORT env var
│   │   ├── app.ts                  # Express app factory: registers middleware (cors, json,
│   │   │                           #   helmet), mounts routers, attaches error handler
│   │   │
│   │   ├── mqtt/
│   │   │   ├── mqttClient.ts       # Singleton MQTT client: connects to Mosquitto,
│   │   │   │                       #   handles reconnect, exposes publish() helper
│   │   │   └── mqttSubscriber.ts   # Subscribes to home/water/# and home/electricity/#;
│   │   │                           #   routes incoming messages to appropriate handlers
│   │   │
│   │   ├── controllers/
│   │   │   ├── readingController.ts    # Express route handlers for /api/readings endpoints;
│   │   │   │                           #   parses query params, calls service, returns JSON
│   │   │   ├── analyticsController.ts  # Handlers for /api/analytics: daily totals, averages,
│   │   │   │                           #   peak hours
│   │   │   └── alertController.ts      # Handlers for /api/alerts: list and acknowledge alerts
│   │   │
│   │   ├── services/
│   │   │   ├── readingService.ts   # Business logic for persisting readings: calls Prisma,
│   │   │   │                       #   triggers analytics update, emits Socket.IO event
│   │   │   ├── waterService.ts     # Water-domain logic: litres-per-pulse conversion,
│   │   │   │                       #   cumulative total calculation
│   │   │   └── electricityService.ts # Electricity-domain logic: kWh accumulation,
│   │   │                             #   apparent vs real power, power factor
│   │   │
│   │   ├── analytics/
│   │   │   ├── analyticsService.ts # Computes and upserts daily summary records:
│   │   │   │                       #   total kWh, total litres, peak power, peak flow
│   │   │   └── anomalyDetector.ts  # Threshold-based anomaly detection: checks each
│   │   │                           #   reading against configured limits; creates Alert records
│   │   │
│   │   ├── validation/
│   │   │   ├── waterPayloadSchema.ts     # Zod schema for MQTT water payload
│   │   │   ├── electricityPayloadSchema.ts # Zod schema for MQTT electricity payload
│   │   │   └── querySchemas.ts           # Zod schemas for REST API query parameters
│   │   │
│   │   ├── routes/
│   │   │   ├── readingRoutes.ts    # Express Router: GET /api/readings, GET /api/readings/:id
│   │   │   ├── analyticsRoutes.ts  # Express Router: GET /api/analytics/daily,
│   │   │   │                       #   GET /api/analytics/hourly
│   │   │   └── alertRoutes.ts      # Express Router: GET /api/alerts, PATCH /api/alerts/:id
│   │   │
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma Client singleton (prevents multiple instances
│   │   │   │                       #   in dev due to hot-reload)
│   │   │   ├── socketio.ts         # Socket.IO server instance, exported for use in services
│   │   │   └── logger.ts           # Winston logger configuration: console + file transports
│   │   │
│   │   └── types/
│   │       ├── water.types.ts      # TypeScript interfaces: WaterReading, WaterPayload
│   │       └── electricity.types.ts # TypeScript interfaces: ElectricityReading, PowerPayload
│   │
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema: datasource, generator, all models
│   │   └── migrations/             # Auto-generated migration SQL files (do not edit manually)
│   │       └── 20260901_init/
│   │           └── migration.sql
│   │
│   ├── scripts/
│   │   └── mqtt-simulator.ts       # Development tool: publishes simulated sensor payloads
│   │                               #   to Mosquitto every 5 s; mimics real ESP32 behavior
│   │
│   ├── package.json                # Backend dependencies and npm scripts
│   ├── tsconfig.json               # TypeScript compiler options for backend
│   └── .env.example                # Template for environment variables (no secrets)
│
├── frontend/
│   ├── app/                        # Next.js 14 App Router directory
│   │   ├── layout.tsx              # Root layout: HTML shell, global CSS import, providers
│   │   ├── page.tsx                # Home page (/) — main dashboard view
│   │   ├── history/
│   │   │   └── page.tsx            # Historical data page with date-range picker + table
│   │   └── alerts/
│   │       └── page.tsx            # Alerts page: list of threshold breach events
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── WaterGauge.tsx      # Real-time flow rate gauge component
│   │   │   ├── ElectricityGauge.tsx # Real-time power / voltage / current display
│   │   │   ├── FlowChart.tsx       # LineChart of flow rate over last 60 readings
│   │   │   ├── PowerChart.tsx      # LineChart of power consumption over last 60 readings
│   │   │   └── SummaryCards.tsx    # Card grid: total kWh today, total litres today,
│   │   │                           #   estimated cost (INR), active alerts count
│   │   ├── alerts/
│   │   │   ├── AlertBanner.tsx     # Fixed top banner shown when active alert exists
│   │   │   └── AlertList.tsx       # Table/list of all alerts with timestamp + acknowledge btn
│   │   ├── history/
│   │   │   ├── DateRangePicker.tsx # Date range input; triggers API fetch on change
│   │   │   └── ReadingsTable.tsx   # Sortable, paginated table of historical readings
│   │   └── ui/                     # ShadCN/UI components (auto-generated, do not edit)
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── button.tsx
│   │
│   ├── hooks/
│   │   ├── useSocket.ts            # Custom hook: initialises Socket.IO client, manages
│   │   │                           #   connect/disconnect lifecycle, returns socket instance
│   │   ├── useReadings.ts          # Custom hook: maintains a rolling buffer of last N
│   │   │                           #   readings for chart rendering; updated via socket events
│   │   ├── useAlerts.ts            # Custom hook: maintains alert list, handles new-alert events
│   │   └── useAnalytics.ts         # Custom hook: fetches daily analytics from REST API on mount
│   │
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrapper: baseURL, error handling,
│   │   │                           #   request/response interceptors
│   │   └── utils.ts                # Utility functions: formatKwh(), formatLitres(),
│   │                               #   formatTimestamp(), estimateCost()
│   │
│   ├── types/
│   │   ├── reading.types.ts        # Frontend TypeScript types matching backend API responses
│   │   └── alert.types.ts          # Alert type definitions for frontend use
│   │
│   ├── public/                     # Static assets: favicon, icons
│   ├── package.json                # Frontend dependencies and npm scripts
│   ├── tsconfig.json               # TypeScript compiler options for Next.js
│   ├── tailwind.config.ts          # Tailwind CSS configuration: content paths, theme
│   └── next.config.js              # Next.js configuration: API rewrites for dev proxy
│
├── docker/
│   ├── mosquitto/
│   │   ├── mosquitto.conf          # Mosquitto broker configuration: listener port 1883,
│   │   │                           #   allow_anonymous true, persistence true, log settings
│   │   └── data/                   # Mosquitto persistent message store (volume mount)
│   └── postgres/
│       └── init.sql                # Optional: initial DB/user creation (handled by Prisma migrate)
│
├── docker-compose.yml              # Defines mosquitto and postgres services; volume mounts;
│                                   #   network; port bindings
├── .gitignore                      # Excludes: node_modules, .env, build/, .next/,
│                                   #   firmware/.pio/, prisma/migrations data, Docker volumes
├── .env.example                    # Project-wide env variable template
└── README.md                       # Project overview, hardware wiring guide, setup steps,
                                    #   how to run, API reference summary
```

### 4.2 Key File Explanations

#### `firmware/esp32/src/config.h`
Central configuration file for all compile-time constants. Changing the MQTT broker IP or a sensor pin requires editing only this file. It defines:
- `WIFI_SSID`, `WIFI_PASSWORD`
- `MQTT_BROKER_IP`, `MQTT_PORT` (1883)
- `TOPIC_WATER_FLOW`, `TOPIC_ELECTRICITY_POWER`
- `FLOW_SENSOR_PIN` (GPIO with interrupt), `CURRENT_SENSOR_PIN` (ADC), `VOLTAGE_SENSOR_PIN` (ADC)
- `PUBLISH_INTERVAL_MS` (5000)
- `FLOW_CALIBRATION_FACTOR` (pulses per litre for YF-S201: 450)
- `ACS712_SENSITIVITY` (0.185 V/A for 5A module)
- `ZMPT101B_OFFSET` (ADC midpoint voltage for AC zero crossing)

#### `backend/prisma/schema.prisma`
Defines all database models. Prisma reads this file to generate the TypeScript client and produce SQL migration files. See [Section 5](#5-data-flow--step-by-step) for the full schema.

#### `backend/scripts/mqtt-simulator.ts`
A critical development tool. Since not every developer has physical hardware, this script connects to the local Mosquitto broker and publishes realistic simulated payloads every 5 seconds. It introduces small random variations to simulate real sensor noise. Run with: `npx tsx scripts/mqtt-simulator.ts`.

#### `docker-compose.yml`
Single command (`docker compose up -d`) starts both Mosquitto and PostgreSQL. Volumes ensure data persists between container restarts. The backend and frontend run outside Docker for faster hot-reload during development.

---

## 5. Data Flow — Step by Step

This section describes every step in the complete pipeline from physical sensor event to pixel on screen.

### Step 1 — Physical Sensor Event

**Water:** The YF-S201 flow sensor contains a Hall-effect sensor and a rotor. When water flows, the rotor spins and the Hall sensor outputs a square wave pulse train. The frequency of pulses is proportional to the flow rate: `F (Hz) = 7.5 × Q (L/min)`. At 5 L/min, the sensor outputs 37.5 pulses per second.

**Electricity:** The ACS712 current sensor uses the Hall effect to produce a DC-biased analog voltage proportional to the current through a conductor. At 0 A, it outputs 2.5 V (midpoint). Each amp of current shifts the output by 185 mV (for the 5A module). The ZMPT101B transformer outputs a scaled, isolated replica of the mains AC voltage waveform, centred at a DC bias.

### Step 2 — ESP32 GPIO / ADC Capture

**Water (GPIO Interrupt):** `attachInterrupt(FLOW_SENSOR_PIN, pulseISR, RISING)` registers an Interrupt Service Routine that increments a volatile counter (`pulseCount`) on every rising edge. This is done in hardware interrupt context — no samples are missed, even at high flow rates. The main loop reads and resets this counter every `PUBLISH_INTERVAL_MS` milliseconds.

**Electricity (ADC Sampling):** The `analogRead()` function is called 1000 times in a tight loop with 1 ms delay between samples, collecting 1 second of data from both the current and voltage pins. The ESP32 has a 12-bit SAR ADC (0–4095 counts for 0–3.3 V).

### Step 3 — Calculation

**Flow Rate:**
```
flowRate (L/min) = (pulseCount / FLOW_CALIBRATION_FACTOR) × (60000 / PUBLISH_INTERVAL_MS)
totalLitres     += (flowRate / 60) × (PUBLISH_INTERVAL_MS / 1000)
```

**RMS Current (Irms):**
```
// Remove DC bias (ACS712 zero-current offset)
for each sample i:
    sample[i] = (adcCount[i] / 4095.0) × 3.3    // convert to volts
    sample[i] -= ACS712_OFFSET                    // remove 2.5V bias
    current[i] = sample[i] / ACS712_SENSITIVITY  // convert V → A

Irms = sqrt( (1/N) × Σ current[i]² )
```

**RMS Voltage (Vrms):**
```
// Similar process for ZMPT101B
Vrms = sqrt( (1/N) × Σ voltage[i]² ) × ZMPT101B_CALIBRATION_FACTOR
```

**Real Power:**
```
Power (W) = Vrms × Irms × powerFactor
// For resistive loads, powerFactor ≈ 1.0 (prototype assumption)
```

### Step 4 — JSON Payload Construction

ArduinoJson is used to build a compact JSON document. Two separate payloads are constructed:

**Water Payload (published to `home/water/flow`):**
```json
{
  "deviceId": "esp32-001",
  "timestamp": 1756789234,
  "flowRate": 3.42,
  "totalLitres": 127.6,
  "unit": "L/min"
}
```

**Electricity Payload (published to `home/electricity/power`):**
```json
{
  "deviceId": "esp32-001",
  "timestamp": 1756789234,
  "voltage": 229.4,
  "current": 2.18,
  "power": 500.3,
  "energy": 0.00069,
  "powerFactor": 1.0,
  "unit": "W"
}
```

> [!NOTE]
> `timestamp` is a Unix epoch integer (seconds). The ESP32 uses `millis()` offset from an NTP-synced base time. NTP sync is performed once at startup using the `configTime()` function from the Arduino ESP32 core.

### Step 5 — MQTT Publish

`mqttClient.publish(topic, payload, retained)` is called for each payload. QoS 0 (fire-and-forget) is used for the prototype. If the MQTT connection is dropped, `PubSubClient::loop()` handles reconnection on the next iteration. Retained flag is set to `false` — the broker does not need to cache the last reading for new subscribers.

### Step 6 — Mosquitto Broker Receives and Routes

The Mosquitto broker receives the PUBLISH packet from the ESP32. It looks up all active subscriptions matching the topic (`home/water/flow` and `home/electricity/power`). The backend's subscription uses wildcards (`home/water/#` and `home/electricity/#`), which match both topics. Mosquitto forwards a copy of each message to the backend's TCP connection.

### Step 7 — Backend MQTT Subscriber Receives Message

`mqtt.js` fires the `message` event callback with three arguments: `topic: string`, `message: Buffer`, `packet: IPublishPacket`. The subscriber in `mqttSubscriber.ts` parses the topic string to determine whether it is a water or electricity reading, then routes the raw buffer to the appropriate handler.

```typescript
// mqttSubscriber.ts (simplified)
client.on('message', (topic, message) => {
  const raw = message.toString();
  if (topic.startsWith('home/water')) {
    handleWaterMessage(raw);
  } else if (topic.startsWith('home/electricity')) {
    handleElectricityMessage(raw);
  }
});
```

### Step 8 — Payload Validation (Zod)

Before any database operation, the raw JSON string is parsed and validated against the Zod schema. If validation fails (e.g., missing field, wrong type, out-of-range value), the message is logged as a warning and discarded. No database write occurs. This protects the database from malformed data and provides a clear audit trail.

```typescript
// waterPayloadSchema.ts
const WaterPayloadSchema = z.object({
  deviceId:    z.string().min(1).max(50),
  timestamp:   z.number().int().positive(),
  flowRate:    z.number().min(0).max(50),       // max 50 L/min physical limit
  totalLitres: z.number().min(0),
  unit:        z.literal('L/min'),
});
```

### Step 9 — Prisma DB Write

On successful validation, `readingService.ts` calls the Prisma client to insert a new row:

```typescript
// readingService.ts (simplified)
await prisma.waterReading.create({
  data: {
    deviceId:    payload.deviceId,
    flowRate:    payload.flowRate,
    totalLitres: payload.totalLitres,
    recordedAt:  new Date(payload.timestamp * 1000),
  },
});
```

Prisma generates parameterised SQL (`INSERT INTO "WaterReading" (...) VALUES ($1, $2, $3, $4)`) and executes it against PostgreSQL. The database assigns a UUID primary key and stores the record with nanosecond-precision timestamps.

**Prisma Schema (full `schema.prisma`):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Device {
  id          String           @id @default(uuid())
  deviceId    String           @unique
  name        String
  location    String?
  createdAt   DateTime         @default(now())
  waterReadings    WaterReading[]
  powerReadings    PowerReading[]
  alerts           Alert[]
}

model WaterReading {
  id          String   @id @default(uuid())
  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [deviceId])
  flowRate    Float                      // L/min at time of reading
  totalLitres Float                      // cumulative since power-on
  recordedAt  DateTime                   // UTC timestamp from sensor
  createdAt   DateTime @default(now())   // server-side insert time

  @@index([deviceId, recordedAt])
  @@index([recordedAt])
}

model PowerReading {
  id          String   @id @default(uuid())
  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [deviceId])
  voltage     Float                      // Vrms in volts
  current     Float                      // Irms in amps
  power       Float                      // real power in watts
  energy      Float                      // kWh for this interval
  powerFactor Float    @default(1.0)
  recordedAt  DateTime
  createdAt   DateTime @default(now())

  @@index([deviceId, recordedAt])
  @@index([recordedAt])
}

model DailySummary {
  id              String   @id @default(uuid())
  deviceId        String
  date            DateTime @db.Date                // date only (no time)
  totalLitres     Float    @default(0)
  totalKwh        Float    @default(0)
  peakFlowRate    Float    @default(0)
  peakPower       Float    @default(0)
  readingCount    Int      @default(0)
  updatedAt       DateTime @updatedAt

  @@unique([deviceId, date])
  @@index([deviceId, date])
}

model Alert {
  id          String      @id @default(uuid())
  deviceId    String
  device      Device      @relation(fields: [deviceId], references: [deviceId])
  type        AlertType
  metric      String                     // e.g., "flowRate", "power"
  value       Float                      // the value that triggered the alert
  threshold   Float                      // the threshold that was breached
  message     String
  acknowledged Boolean    @default(false)
  triggeredAt DateTime
  createdAt   DateTime    @default(now())

  @@index([deviceId, triggeredAt])
  @@index([acknowledged])
}

enum AlertType {
  HIGH_FLOW
  HIGH_POWER
  HIGH_VOLTAGE
  LOW_VOLTAGE
  NO_DATA
}
```

### Step 10 — Analytics Computation

After every successful DB write, `analyticsService.ts` performs an UPSERT on the `DailySummary` table for today's date:

```typescript
await prisma.dailySummary.upsert({
  where: { deviceId_date: { deviceId, date: today } },
  update: {
    totalLitres:  { increment: deltaLitres },
    totalKwh:     { increment: deltaKwh },
    peakFlowRate: Math.max(current.peakFlowRate, payload.flowRate),
    readingCount: { increment: 1 },
    updatedAt:    new Date(),
  },
  create: {
    deviceId,
    date:         today,
    totalLitres:  deltaLitres,
    totalKwh:     deltaKwh,
    peakFlowRate: payload.flowRate,
    readingCount: 1,
  },
});
```

### Step 11 — Anomaly Detection

`anomalyDetector.ts` compares the validated reading against pre-configured thresholds (stored in environment variables or a config object):

```typescript
const THRESHOLDS = {
  maxFlowRate:  15,    // L/min — alert if tap is running too fast
  maxPower:     2000,  // W     — alert if appliance draws >2 kW
  maxVoltage:   260,   // Vrms  — alert on overvoltage
  minVoltage:   200,   // Vrms  — alert on undervoltage
};
```

If a threshold is breached, an `Alert` record is inserted into the database and the alert is emitted to all connected Socket.IO clients via the `alert_triggered` event.

### Step 12 — REST API Layer

The Express REST API exposes the stored data for historical queries. Controllers receive HTTP requests, validate query parameters with Zod, call the relevant Prisma queries, and return JSON responses.

**Key Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/readings/water` | Paginated water readings. Query params: `from`, `to`, `deviceId`, `page`, `limit` |
| `GET` | `/api/readings/electricity` | Paginated electricity readings |
| `GET` | `/api/analytics/daily` | Daily summaries. Query params: `deviceId`, `days` (default 7) |
| `GET` | `/api/analytics/hourly` | Hourly breakdown for a specific date |
| `GET` | `/api/alerts` | All alerts. Filter: `acknowledged=false` |
| `PATCH` | `/api/alerts/:id` | Acknowledge a specific alert |
| `GET` | `/api/health` | Health check: returns DB ping status + MQTT connection status |

### Step 13 — WebSocket Broadcast (Socket.IO)

Every time a new reading is saved, `readingService.ts` calls:

```typescript
io.emit('reading_received', {
  type:    'water' | 'electricity',
  payload: validatedPayload,
});
```

Every connected browser receives this event within milliseconds. The Socket.IO server manages all client connections, so the reading service does not need to know how many clients are connected or their socket IDs.

When an anomaly is detected:
```typescript
io.emit('alert_triggered', {
  alertId:   alert.id,
  type:      alert.type,
  message:   alert.message,
  value:     alert.value,
  threshold: alert.threshold,
});
```

### Step 14 — Frontend React State Update

The `useSocket` hook initialises the Socket.IO client and registers event listeners. The `useReadings` hook maintains a rolling buffer (last 60 readings) in `React.useState`:

```typescript
// useReadings.ts (simplified)
export function useReadings(type: 'water' | 'electricity') {
  const [readings, setReadings] = useState<Reading[]>([]);
  const socket = useSocket();

  useEffect(() => {
    socket.on('reading_received', (event) => {
      if (event.type !== type) return;
      setReadings(prev => {
        const updated = [...prev, event.payload];
        return updated.slice(-60); // keep last 60 readings
      });
    });
    return () => { socket.off('reading_received'); };
  }, [socket, type]);

  return readings;
}
```

### Step 15 — Chart Render

The `FlowChart` and `PowerChart` components receive the readings array as a prop and pass it directly to Recharts' `<LineChart>`:

```tsx
<LineChart data={readings} width={800} height={300}>
  <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
  <YAxis unit=" L/min" />
  <Line type="monotone" dataKey="flowRate" stroke="#3b82f6" dot={false} isAnimationActive={false} />
  <Tooltip />
</LineChart>
```

`isAnimationActive={false}` is critical for performance with real-time data — Recharts' default animation would cause visible lag when appending a new point every 5 seconds.

---

## 6. Component Responsibilities

### 6.1 ESP32 Firmware

**DOES:**
- Read the YF-S201 flow sensor via GPIO interrupt.
- Sample the ACS712 and ZMPT101B sensors via the ADC at 1 kHz.
- Calculate flow rate (L/min), RMS current (A), RMS voltage (V), and real power (W).
- Accumulate total litres since power-on.
- Serialize readings into ArduinoJson payloads.
- Connect to Wi-Fi and maintain the connection (auto-reconnect).
- Connect to Mosquitto broker and maintain the connection (auto-reconnect).
- Publish two MQTT messages every 5 seconds (one water, one electricity).
- Sync time via NTP at startup for accurate timestamps.

**DOES NOT:**
- Store any readings locally (no SD card, no SPIFFS logging in MVP).
- Perform anomaly detection or threshold evaluation.
- Communicate with the PostgreSQL database directly.
- Implement any security (no TLS, no MQTT auth in MVP).
- Serve any HTTP endpoints (no web server on ESP32 in MVP).
- Manage OTA updates (manual flash only in prototype).
- Control any actuators (no relays, no solenoid valves in MVP).

### 6.2 Eclipse Mosquitto Broker

**DOES:**
- Accept MQTT CONNECT packets from both the ESP32 (publisher) and the Node.js backend (subscriber).
- Receive PUBLISH packets from the ESP32.
- Route messages to all matching subscribers (backend).
- Maintain TCP connections and respond to MQTT PINGREQ keepalives.
- Log connection and publish events to the Docker console output.
- Persist session state between container restarts (when configured).

**DOES NOT:**
- Parse or understand the JSON payload content.
- Authenticate clients (anonymous access in prototype).
- Apply access control lists.
- Transform or filter messages.
- Forward data to any external system.
- Store message history beyond the MQTT retain flag (retained messages disabled in prototype).

### 6.3 Node.js Backend

**DOES:**
- Subscribe to MQTT topics and receive all sensor readings.
- Validate every payload against strict Zod schemas.
- Persist all valid readings to PostgreSQL via Prisma.
- Compute and maintain daily summary analytics.
- Evaluate threshold-based anomaly rules and create alert records.
- Expose a REST API for historical data retrieval.
- Manage a Socket.IO server and broadcast live readings and alerts to all connected frontends.
- Log all operations (info, warn, error) via Winston.
- Expose a health check endpoint.

**DOES NOT:**
- Render any HTML or serve the frontend (that is Next.js's job).
- Handle user authentication or sessions in MVP.
- Implement HTTPS in MVP.
- Communicate with external APIs (billing, weather, utility provider) in MVP.
- Perform ML-based anomaly detection.
- Control hardware (no actuation commands sent back to ESP32 in MVP).

### 6.4 PostgreSQL Database

**DOES:**
- Store water readings, electricity readings, daily summaries, and alerts durably.
- Enforce data integrity via primary keys, foreign keys, and unique constraints.
- Respond to parameterised queries from Prisma.
- Provide indexed lookups on `deviceId` and `recordedAt` for time-range queries.
- Handle concurrent reads (REST API + analytics) and writes (MQTT handler) safely via MVCC.

**DOES NOT:**
- Push data proactively (no PostgreSQL NOTIFY used in MVP; Socket.IO handles real-time push from the backend).
- Apply any business logic or calculation.
- Communicate with the ESP32.
- Store firmware or configuration.

### 6.5 Next.js Frontend

**DOES:**
- Connect to the Socket.IO server and listen for `reading_received` and `alert_triggered` events.
- Maintain a rolling buffer of the last 60 readings for each sensor type.
- Render real-time line charts using Recharts.
- Display summary cards: total litres today, total kWh today, estimated cost, active alert count.
- Fetch historical data from the REST API on the history page.
- Display a sortable, paginated table of historical readings.
- Display and allow acknowledgement of alerts.
- Provide a responsive, mobile-compatible layout.

**DOES NOT:**
- Store data locally (no localStorage, no IndexedDB in MVP).
- Implement user login or authentication in MVP.
- Communicate with Mosquitto directly.
- Communicate with PostgreSQL directly.
- Perform any sensor calculation or data transformation beyond formatting for display.

---

## 7. Communication Protocols

### 7.1 ESP32 ↔ Mosquitto: MQTT over TCP

| Property | Value |
|----------|-------|
| Protocol | MQTT 3.1.1 |
| Transport | TCP |
| Port | 1883 (plaintext, no TLS) |
| Client Library (firmware) | PubSubClient 2.8 |
| QoS Level | 0 (at-most-once delivery) |
| Retain | false |
| Keepalive | 60 seconds |
| Clean Session | true |
| Publisher Topic (water) | `home/water/flow` |
| Publisher Topic (electricity) | `home/electricity/power` |
| Publish Interval | 5 seconds |
| Authentication | None (anonymous) |

**Why QoS 0?** For continuous sensor data published every 5 seconds, an occasional dropped message is acceptable. The value of a reading is its recency; retransmitting a 10-second-old reading at QoS 1 adds complexity without significant benefit for a prototype. A production system should use QoS 1.

**Payload format:** UTF-8 encoded JSON string, typically 150–250 bytes. This is well within MQTT's 256 MB maximum message size and the ESP32's heap capacity.

**Reconnect logic (firmware):** If `PubSubClient::connected()` returns false, the `reconnect()` function in `mqtt_client.cpp` attempts `client.connect(clientId)` in a loop with a 5-second delay between attempts, then resubscribes to any topics the firmware needs to receive commands on.

### 7.2 Backend (Node.js) ↔ Mosquitto: MQTT over TCP

| Property | Value |
|----------|-------|
| Protocol | MQTT 3.1.1 |
| Client Library | mqtt.js 5.x |
| Subscription Topic | `home/water/#` (wildcard) |
| Subscription Topic | `home/electricity/#` (wildcard) |
| QoS (subscribe) | 0 |
| Connection | Persistent, auto-reconnect with exponential backoff |

**Node.js MQTT connection string:** `mqtt://localhost:1883`

### 7.3 Backend ↔ Frontend: REST (HTTP) + WebSocket (Socket.IO)

#### 7.3.1 REST API

| Property | Value |
|----------|-------|
| Protocol | HTTP/1.1 |
| Port | 3001 |
| Format | JSON |
| Encoding | UTF-8 |
| CORS | Enabled for `http://localhost:3000` in development |
| Authentication | None (MVP) |
| Versioning | `/api/` prefix; no versioning in MVP |

**REST is used for:** Historical queries, analytics summaries, alert management. These are on-demand, request-response interactions where the client explicitly asks for data.

#### 7.3.2 WebSocket (Socket.IO)

| Property | Value |
|----------|-------|
| Protocol | Socket.IO 4.x (WebSocket with long-poll fallback) |
| Port | 3001 (same server as REST, via `http.Server` attachment) |
| Events (server → client) | `reading_received`, `alert_triggered` |
| Events (client → server) | `subscribe_device` (future: filter by deviceId) |
| Namespace | `/` (default, no namespacing in MVP) |
| Rooms | Not used in MVP |
| Authentication | None (MVP) |

**WebSocket is used for:** Live data push. The server initiates the data transfer when a new reading arrives; the client does not need to poll. This is fundamentally different from REST, where the client always initiates.

### 7.4 Backend ↔ PostgreSQL: Prisma ORM

| Property | Value |
|----------|-------|
| Protocol | PostgreSQL wire protocol (libpq) |
| Port | 5432 |
| Driver | `@prisma/client` (generated) + `pg` (underlying) |
| Connection | Pooled (Prisma manages a connection pool) |
| Query Type | Parameterised (SQL injection safe) |
| Authentication | Username/password (Docker compose sets defaults) |
| SSL | None (local Docker connection in development) |
| Connection String | `postgresql://postgres:password@localhost:5432/smart_monitor` |

---

## 8. Deployment Architecture

### 8.1 Overview

For the MVP prototype, the entire system runs on a **single developer laptop or desktop** connected to the same Wi-Fi network as the ESP32. There is no cloud, no remote server, and no external dependency beyond npm packages and Docker Hub images.

```
Developer Laptop (Windows / macOS / Linux)
├── Docker Desktop
│   ├── Container: mosquitto   → localhost:1883
│   └── Container: postgres    → localhost:5432
│
├── Node.js process (backend)  → localhost:3001
│   └── npm run dev (tsx watch)
│
└── Next.js process (frontend) → localhost:3000
    └── npm run dev

ESP32 (physical hardware, same Wi-Fi LAN)
└── Connects to laptop's local IP (e.g., 192.168.1.100):1883
```

> [!IMPORTANT]
> The ESP32 connects to Mosquitto using the **laptop's local IP address** on the LAN (e.g., `192.168.1.100`), not `localhost`. `localhost` from the ESP32's perspective is itself. Configure `MQTT_BROKER_IP` in `firmware/esp32/src/config.h` with the correct LAN IP.

### 8.2 Prerequisites

The following must be installed on the developer machine before running the project:

| Software | Minimum Version | Installation |
|----------|-----------------|-------------|
| Docker Desktop | 4.x | https://docker.com/get-started |
| Node.js | 20.x LTS | https://nodejs.org |
| npm | 10.x (ships with Node 20) | Included |
| VS Code | Latest | https://code.visualstudio.com |
| PlatformIO extension | Latest | VS Code Extensions |
| Git | 2.x | https://git-scm.com |

### 8.3 Step-by-Step Local Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/smart-resource-monitor.git
cd smart-resource-monitor
```

#### Step 2: Start Infrastructure (Docker Compose)
```bash
docker compose up -d
```
This starts:
- **Mosquitto** on `localhost:1883` with config from `docker/mosquitto/mosquitto.conf`
- **PostgreSQL** on `localhost:5432` with database `smart_monitor`, user `postgres`, password `password`

Verify:
```bash
docker compose ps
# Both services should show status "running"
```

#### Step 3: Configure Backend Environment
```bash
cd backend
cp .env.example .env
# Edit .env if needed (defaults work for Docker Compose setup)
```

`.env` contents:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_monitor"
MQTT_BROKER_URL="mqtt://localhost:1883"
BACKEND_PORT=3001
CORS_ORIGIN="http://localhost:3000"
ALERT_MAX_FLOW_RATE=15
ALERT_MAX_POWER=2000
ALERT_MAX_VOLTAGE=260
ALERT_MIN_VOLTAGE=200
```

#### Step 4: Run Database Migrations
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

#### Step 5: Start Backend
```bash
npm run dev
# Backend starts on http://localhost:3001
# MQTT subscriber connects to localhost:1883
# Verify: "Connected to MQTT broker" and "Database ready" in console
```

#### Step 6: Configure and Start Frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
npm run dev
# Frontend starts on http://localhost:3000
```

#### Step 7: Flash ESP32 Firmware (Physical Hardware)
```bash
cd ../firmware/esp32
# Edit src/config.h: set WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER_IP (your laptop's LAN IP)
# Connect ESP32 via USB
pio run --target upload
pio device monitor  # Watch serial output
```

#### Step 7 (Alternative): Run MQTT Simulator (No Hardware)
```bash
cd backend
npx tsx scripts/mqtt-simulator.ts
# Simulated payloads appear on dashboard within seconds
```

#### Step 8: Access Dashboard
Open browser: **http://localhost:3000**

### 8.4 Docker Compose File Reference

```yaml
# docker-compose.yml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: smart-monitor-mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"   # WebSocket port (for browser MQTT clients, future use)
    volumes:
      - ./docker/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: smart-monitor-postgres
    environment:
      POSTGRES_DB:       smart_monitor
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mosquitto_data:
  mosquitto_log:
  postgres_data:
```

### 8.5 Mosquitto Configuration Reference

```ini
# docker/mosquitto/mosquitto.conf
listener 1883
allow_anonymous true

# WebSocket listener (future browser MQTT use)
listener 9001
protocol websockets

persistence true
persistence_location /mosquitto/data/

log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
```

### 8.6 npm Scripts Reference

**Backend (`backend/package.json`):**
```json
{
  "scripts": {
    "dev":        "tsx watch src/server.ts",
    "build":      "tsc -p tsconfig.json",
    "start":      "node dist/server.js",
    "simulate":   "tsx scripts/mqtt-simulator.ts",
    "migrate":    "prisma migrate dev",
    "studio":     "prisma studio",
    "lint":       "eslint src --ext .ts",
    "typecheck":  "tsc --noEmit"
  }
}
```

**Frontend (`frontend/package.json`):**
```json
{
  "scripts": {
    "dev":   "next dev",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint"
  }
}
```

---

## 9. Security Considerations

> [!CAUTION]
> This section documents both software security gaps (intentional for MVP) and **mandatory electrical safety requirements** (non-negotiable regardless of project stage).

### 9.1 MQTT Security — Prototype Limitations

The Mosquitto broker is configured with `allow_anonymous true` and runs on plaintext TCP port 1883 with no TLS. This means:

- **Any device on the same Wi-Fi network can publish to any MQTT topic**, including malicious payloads designed to confuse the backend.
- **Any device can subscribe to all topics** and read all sensor data.
- **There is no mutual authentication** between the ESP32 and the broker.

**This is explicitly acceptable for the MVP prototype** because:
- The system runs on a controlled local network (home/lab), not the public internet.
- The network itself (Wi-Fi WPA2) provides the first layer of access control.
- Implementing MQTT TLS requires certificate management, which is out of scope for the prototype.

> [!NOTE]
> For a production deployment, the following MQTT security measures should be implemented: (1) MQTT username/password authentication, (2) TLS/SSL on port 8883, (3) per-client ACLs restricting topics, (4) client certificate authentication for ESP32.

### 9.2 REST API and WebSocket Security — Prototype Limitations

The backend REST API and Socket.IO server run on HTTP (not HTTPS). This means:
- All data transmitted between the frontend and backend is in plaintext on the network.
- There is no user authentication — anyone who knows `http://<laptop-ip>:3001` can call the API.

**This is explicitly acceptable for the MVP** because the system is accessed only from the same machine (localhost) or controlled LAN.

> [!NOTE]
> For a production or internet-facing deployment: (1) Deploy behind an HTTPS reverse proxy (Nginx with Let's Encrypt), (2) Implement JWT-based authentication on REST endpoints and Socket.IO handshake, (3) Rate-limit the API to prevent DoS.

### 9.3 Database Security — Prototype Limitations

PostgreSQL runs in Docker with default credentials (`postgres` / `password`). The database port (5432) is bound to `localhost` only (not exposed to the network by Docker). This is acceptable for development.

> [!NOTE]
> For production: (1) Use a strong, randomly generated password, (2) Use a dedicated non-superuser role with only the permissions needed, (3) Do not bind port 5432 to a public interface, (4) Enable `pg_hba.conf` host-based authentication.

### 9.4 Electrical Safety — MANDATORY (Non-Negotiable)

> [!CAUTION]
> **The following safety rules are non-negotiable and apply regardless of whether the system is a prototype or a production device. Violations can cause death, serious injury, or fire.**

#### 9.4.1 Mains AC Wiring

- **NEVER assemble mains voltage (230 V AC, 50 Hz) circuits on an open breadboard.** Breadboards are rated for low-voltage DC (typically 5–12 V). Mains AC on a breadboard creates a lethal shock hazard and a fire risk.
- All mains-connected components (ZMPT101B voltage sensor, ACS712 current transformer clamp placement) must be housed in a **properly rated insulated enclosure** with a closure rating appropriate for the environment (minimum IP20 for indoor lab use).
- All internal connections at mains voltage must use appropriately rated wire (minimum 0.75 mm² for ≤6A circuits), properly crimped terminals, and strain relief.
- The mains-side enclosure must be clearly labelled **"DANGER — 230V AC — DO NOT OPEN WHILE POWERED."**

#### 9.4.2 Qualified Supervision

- All mains wiring and connection work must be performed under the **direct supervision of a qualified electrical engineer or licensed electrician**.
- Students must NOT perform mains wiring independently, regardless of how simple the connection appears.
- All mains wiring must be verified by the supervising engineer before the system is energised.

#### 9.4.3 Isolation

- Use the ACS712 in **clamp/split-core configuration** where possible, so the sensor clamps around the conductor without breaking the circuit. This avoids splicing into live mains wires.
- The ZMPT101B provides galvanic isolation between the mains voltage and the ESP32 ADC input. Verify that the specific module you purchase has this isolation intact.
- The 3.3 V and GND of the ESP32 must NEVER be connected to the mains neutral or ground conductors.

#### 9.4.4 Testing Protocol

1. Build and verify the low-voltage (5 V / 3.3 V) ESP32 circuitry first, using a lab DC power supply.
2. Test firmware and MQTT communication with the low-voltage circuit before introducing mains.
3. Only connect mains under supervision, with a properly rated isolating transformer (variac) during initial testing.
4. Never leave the system running unsupervised during the prototype phase.

#### 9.4.5 Prototype Measurement Accuracy Disclaimer

The ACS712 and ZMPT101B are consumer-grade sensors with typical accuracy of ±2–5%. This system is **NOT suitable for billing purposes** or any application where measurement accuracy has financial or safety implications. It is a monitoring and awareness tool only.

---

## 10. Scalability Notes

All items in this section are **future enhancements** — they are intentionally NOT in the MVP. They are documented here to demonstrate that the architecture was designed with extensibility in mind.

### 10.1 Cloud MQTT Broker

**Current:** Mosquitto runs locally on the developer's machine.  
**Future:** Replace with a cloud MQTT broker (AWS IoT Core, HiveMQ Cloud, EMQX Cloud). The ESP32 firmware change is minimal — update `MQTT_BROKER_IP` and add TLS support via `WiFiClientSecure`. The backend `mqtt.js` connection string changes to the cloud broker URL. This makes the system accessible from anywhere without port-forwarding.

### 10.2 User Authentication and Multi-Tenancy

**Current:** No authentication; single user implied.  
**Future:** Implement JWT-based authentication (JSON Web Tokens). Add a `User` model to the Prisma schema. Associate `Device` records with users. Implement `POST /api/auth/login` and `POST /api/auth/register`. Protect all other API routes with an authentication middleware. Socket.IO handshake authentication via query parameter token. This enables multi-user, multi-household deployments.

### 10.3 Machine Learning Anomaly Detection

**Current:** Simple threshold comparison (e.g., power > 2000 W → alert).  
**Future:** Collect 30+ days of readings. Train an anomaly detection model (Isolation Forest, LSTM autoencoder) on the historical baseline. Deploy the model as a Python microservice (Flask/FastAPI). The Node.js backend calls the Python service via REST for each new reading. This enables detection of subtle, contextual anomalies (e.g., abnormal consumption for this time of day on this day of week) that fixed thresholds cannot catch.

### 10.4 Multi-Device Support

**Current:** Single ESP32 device, hardcoded `deviceId: "esp32-001"`.  
**Future:** The MQTT topic structure `home/{deviceId}/water/flow` and database schema `Device` table already support multiple devices. Each additional ESP32 requires a unique `deviceId` in its `config.h`. The backend's wildcard subscription `home/+/water/#` (using MQTT single-level wildcard) catches all devices. The frontend adds a device selector dropdown.

### 10.5 Billing Integration

**Current:** Estimated cost displayed using a hardcoded unit rate (e.g., ₹8/kWh for electricity, ₹5/1000L for water).  
**Future:** Integrate with the local electricity distribution company's API (or scrape the public tariff table) to apply tiered pricing. For water, integrate with municipal corporation tariff slabs. Implement monthly billing report generation as a PDF export using `pdfmake` or `puppeteer`.

### 10.6 Time-Series Database

**Current:** PostgreSQL with a readings table and manual indexes.  
**Future:** For deployments with multiple devices publishing at 1-second intervals, PostgreSQL may become a bottleneck for write throughput. Migrate to TimescaleDB (a PostgreSQL extension for time-series data) or InfluxDB. TimescaleDB is a drop-in extension — existing Prisma queries continue to work, with the addition of hypertable-based automatic partitioning.

### 10.7 Containerising the Backend and Frontend

**Current:** Backend and frontend run as native Node.js processes outside Docker.  
**Future:** Add `Dockerfile` for the backend and frontend. Update `docker-compose.yml` to include all five services (mosquitto, postgres, backend, frontend, nginx reverse proxy). This enables a single `docker compose up` to spin up the entire stack, including for demos on a different machine.

### 10.8 Push Notifications

**Current:** Alert banner visible only when the dashboard browser tab is open.  
**Future:** Integrate with a notification service: (1) WhatsApp Business API via Twilio for threshold breach SMS/WhatsApp messages, (2) Web Push Notifications via the Browser Push API and a service worker, so alerts are delivered even when the tab is closed, (3) Email via Nodemailer (SMTP).

---

## 11. Design Decisions

### 11.1 Why MQTT Instead of HTTP?

A common alternative to MQTT for IoT data publishing is having the ESP32 make direct HTTP POST requests to the backend. MQTT was chosen instead for the following reasons:

| Factor | MQTT | HTTP POST from ESP32 |
|--------|------|---------------------|
| **Overhead** | Fixed 2-byte header, ~150 bytes total per message | HTTP headers alone are 200–400 bytes; TLS handshake adds latency |
| **Connection model** | Single persistent TCP connection; broker handles routing | New TCP connection per publish (or HTTP keep-alive, complex on embedded) |
| **Decoupling** | ESP32 publishes to a topic; it doesn't care who subscribes | ESP32 must know the backend's IP and port; tightly coupled |
| **Scalability** | Add more subscribers (analytics, logging) without changing firmware | Must add more POST endpoints or fan-out logic in the backend |
| **Reliability** | QoS 1/2 provide delivery guarantees; clean/persistent sessions | HTTP POST either succeeds or the response must be handled by firmware |
| **Broker buffering** | If the backend restarts, the broker can hold messages (QoS 1, persistent session) | HTTP POST fails if the backend is down; data is lost |

MQTT's publish-subscribe model means the ESP32 is completely decoupled from the backend. Adding a data logger, a second dashboard, or an analytics service requires only a new MQTT subscriber — the firmware does not change.

### 11.2 Why PostgreSQL Instead of MongoDB?

MongoDB (document store) is often suggested for IoT data because of its flexible schema. PostgreSQL was chosen instead:

- **Structured data:** Sensor readings have a fixed, known schema (`flowRate`, `totalLitres`, `timestamp`). There is no benefit to schema flexibility; rigid typing actually prevents bugs.
- **Time-range queries:** `WHERE recordedAt BETWEEN $1 AND $2 ORDER BY recordedAt` with a B-tree index is highly optimised in PostgreSQL. MongoDB's query planner for time ranges is comparable but less mature for ordered time-series.
- **Joins and aggregations:** `GROUP BY DATE(recordedAt)` for daily summaries, `AVG(flowRate)` for hourly averages — these are SQL's native strength. MongoDB requires the aggregation pipeline, which is verbose for the same result.
- **ACID transactions:** If the backend crashes between inserting a reading and updating the daily summary, PostgreSQL's transaction rollback ensures data consistency. MongoDB multi-document transactions are available but add complexity.
- **Team familiarity:** SQL is a universal skill taught in college databases courses. Prisma makes PostgreSQL as easy as MongoDB's query API.

### 11.3 Why Node.js?

- **Non-blocking I/O:** MQTT subscriber, database writes, and WebSocket broadcasts all happen concurrently on a single thread via the event loop. No multi-threading complexity.
- **Ecosystem:** `mqtt.js`, `Socket.IO`, `Prisma`, `Express`, and `Zod` are all first-class Node.js libraries with excellent TypeScript support.
- **Shared language with frontend:** TypeScript types can be shared between backend and frontend, preventing API contract drift.
- **Speed of development:** For a college PBL project on a tight timeline, Node.js with TypeScript is the fastest path to a working prototype.

### 11.4 Why Next.js?

- **Unified framework:** Server Components handle the initial historical data fetch (SSR/SSG), eliminating the need for a loading spinner on page load. Client Components handle real-time Socket.IO updates.
- **File-based routing:** No routing configuration required. Adding a new page is adding a new file in `app/`.
- **API Routes (not used in MVP):** Next.js has built-in API routes that could proxy backend calls, useful for production same-origin deployment.
- **Vercel-ready:** If the project is later deployed to Vercel for a demo, zero configuration is needed.
- **React 18:** Latest concurrent features (`useTransition`, `useDeferredValue`) are available for optimising chart renders with high-frequency data in the future.

### 11.5 Why Prisma?

- **Type safety:** Prisma generates a TypeScript client from the schema. Every query result is fully typed — no `any` types leaking from database results.
- **Migration management:** `prisma migrate dev` generates and runs SQL migration files automatically. The migration history is version-controlled in `prisma/migrations/`.
- **Developer experience:** `prisma studio` provides a GUI for browsing and editing database records during development.
- **Abstraction:** Switching from PostgreSQL to another SQL database (e.g., SQLite for local testing without Docker) requires changing one line in `schema.prisma`.

### 11.6 Why Not Direct ESP32-to-Database Connection?

It might seem simpler to have the ESP32 directly INSERT rows into PostgreSQL, bypassing the MQTT/Node.js layer entirely. This approach has critical problems:

1. **No PostgreSQL library for ESP32:** The PostgreSQL wire protocol is complex. There is no stable Arduino library for it. Implementing it from scratch would take weeks.
2. **Security:** Database credentials would need to be hardcoded in the ESP32 firmware. Since firmware can be read from flash memory, this would expose the database password.
3. **Fragility:** The ESP32 would need the database IP, port, and credentials in its flash. Changing the database host means reflashing all ESP32 devices.
4. **No decoupling:** The ESP32 would be tightly coupled to the database schema. Any schema migration would require firmware updates.
5. **No buffering:** If the database is temporarily unavailable, the ESP32 has no retry mechanism beyond a simple loop. MQTT with QoS 1 provides broker-side buffering.

The MQTT → Backend → Database pipeline adds only 10–50 ms of latency but provides enormous benefits in reliability, security, and maintainability.

---

## 12. Constraints and Assumptions

### 12.1 Hardware Constraints

| Constraint | Detail |
|-----------|--------|
| **Single ESP32 device** | The MVP is designed and tested with one ESP32 (one water sensor, one electricity sensor). The architecture supports multiple devices, but this has not been validated. |
| **Single-phase electricity only** | The ACS712 + ZMPT101B measures one phase of a single-phase AC supply. Three-phase monitoring is not in scope. |
| **Consumer-grade sensor accuracy** | YF-S201: ±2–3% accuracy at steady flow. ACS712: ±1.5% full-scale accuracy (but ADC noise adds to this). ZMPT101B: ±0.2% with calibration. Overall system accuracy: ±5% at best. |
| **Maximum measurable flow** | YF-S201 rated for 1–30 L/min. Readings below 1 L/min or above 30 L/min may be inaccurate. |
| **Maximum measurable current** | ACS712-05B rated for 0–5 A (≈ 0–1150 W at 230 V). Larger loads require the 20A or 30A module. |
| **5 V power required for YF-S201** | The YF-S201 and ACS712 require 5 V supply. The ESP32 GPIO is 3.3 V tolerant. A voltage divider is required on the YF-S201 signal pin to prevent over-voltage damage to the ESP32 GPIO. |
| **ADC non-linearity** | The ESP32's ADC is known to have non-linearity near the rails (< 0.1 V and > 3.1 V). Sensor circuits should be designed to keep ADC input within 0.2–2.9 V. |

### 12.2 Network Constraints

| Constraint | Detail |
|-----------|--------|
| **Local network only** | All components (ESP32, Mosquitto, backend, frontend) must be on the same Wi-Fi LAN or be accessible via the LAN. No internet connectivity is required or assumed for operation. |
| **Wi-Fi dependency** | If the Wi-Fi access point goes down, the ESP32 cannot publish. Readings during the outage are lost (no local buffering). |
| **Single Wi-Fi SSID and password** | The ESP32 firmware has hardcoded Wi-Fi credentials. Changing networks requires reflashing. |
| **MQTT QoS 0** | Messages may be lost if the Mosquitto broker or backend is briefly unavailable. This is acceptable for a 5-second publish interval in a prototype. |
| **No internet access required** | The system is fully air-gappable. This is a deliberate design choice for privacy and simplicity. |

### 12.3 Software Constraints

| Constraint | Detail |
|-----------|--------|
| **No ML in MVP** | Anomaly detection is limited to fixed threshold comparisons. Historical pattern analysis and predictive detection are deferred. |
| **No authentication in MVP** | All REST API endpoints and the WebSocket connection are unauthenticated. The system is intended for a trusted single-user environment only. |
| **No HTTPS in MVP** | All HTTP and WebSocket traffic is plaintext. Suitable for local network use only. |
| **No OTA firmware updates** | Firmware changes require physical USB connection to the ESP32 and a PlatformIO flash command. |
| **No data export in MVP** | Users cannot download their data as CSV or PDF from the UI. Raw data is accessible via the REST API for technical users. |
| **Single database instance** | There is no database replication or backup strategy in the MVP. Data loss will occur if the Docker volume is deleted. |
| **Development environment only** | The npm `dev` mode (`tsx watch`, `next dev`) is not suitable for production. No production build or deployment pipeline is defined in the MVP. |

### 12.4 Measurement Assumptions

| Assumption | Detail |
|-----------|--------|
| **Resistive load (power factor = 1.0)** | Real power is calculated as `Vrms × Irms × 1.0`. For inductive loads (motors, compressors, washing machines), the actual power factor is less than 1.0, leading to overestimation of real power. Measuring true power factor requires phase-angle measurement between current and voltage waveforms — deferred to future. |
| **Stable mains frequency** | RMS calculations assume a stable 50 Hz mains frequency. Frequency deviations are not compensated for. |
| **Single water circuit** | The flow sensor is placed on a single pipe and measures total flow through that pipe. Flows through parallel branch pipes are not captured. |
| **Cumulative litres reset on ESP32 reboot** | `totalLitres` in the ESP32 firmware is a RAM variable. It resets to 0 on power cycle. The backend accumulates daily totals from the delta between readings, so reboots cause a momentary dip in the total but do not corrupt the overall daily count (a reboot detection flag is recommended for future improvement). |
| **NTP time synchronisation** | The ESP32 uses NTP to obtain UTC time. If the local network has no internet access, NTP will fail and the ESP32 will use `millis()`-based relative time, which may drift. An RTC module (DS3231) is recommended if NTP is unavailable. |
| **Billing estimate is approximate** | The cost estimate displayed on the dashboard (`kWh × unit_rate`) uses a hardcoded unit rate and does not account for fixed charges, fuel adjustment charges, taxes, or progressive slab pricing. It is indicative only. |

---

## Appendix A: MQTT Topic Hierarchy

```
home/
├── {deviceId}/          (e.g., esp32-001)
│   ├── water/
│   │   └── flow         → water payload JSON
│   └── electricity/
│       └── power        → electricity payload JSON
```

Backend subscribes to: `home/#` (wildcard — all topics under home/)  
This structure allows future topics like `home/esp32-001/electricity/energy` to be added without backend changes.

---

## Appendix B: JSON Payload Schemas (Canonical Reference)

### Water Payload
```json
{
  "deviceId":    "string  — unique device identifier, e.g. 'esp32-001'",
  "timestamp":   "integer — Unix epoch seconds (UTC), from NTP",
  "flowRate":    "float   — current flow rate in L/min (range: 0.0–30.0)",
  "totalLitres": "float   — cumulative litres since last ESP32 boot (range: 0.0–∞)",
  "unit":        "string  — always 'L/min'"
}
```

### Electricity Payload
```json
{
  "deviceId":    "string  — unique device identifier",
  "timestamp":   "integer — Unix epoch seconds (UTC)",
  "voltage":     "float   — RMS voltage in Volts (range: 180.0–270.0)",
  "current":     "float   — RMS current in Amps (range: 0.0–5.0)",
  "power":       "float   — real power in Watts (range: 0.0–1150.0)",
  "energy":      "float   — energy for this interval in kWh",
  "powerFactor": "float   — assumed 1.0 in MVP",
  "unit":        "string  — always 'W'"
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **ADC** | Analog-to-Digital Converter. The ESP32 has a 12-bit ADC capable of reading 0–3.3 V signals. |
| **ACS712** | A Hall-effect based linear current sensor IC manufactured by Allegro. Produces an analog output proportional to AC or DC current. |
| **MQTT** | Message Queuing Telemetry Transport. A lightweight publish-subscribe messaging protocol designed for constrained devices and low-bandwidth networks. |
| **Mosquitto** | An open-source MQTT message broker developed by the Eclipse Foundation. |
| **ORM** | Object-Relational Mapper. Software that provides a type-safe programmatic interface to a relational database, generating SQL automatically. |
| **Prisma** | A modern ORM for Node.js/TypeScript that generates a fully typed client from a declarative schema file. |
| **QoS** | Quality of Service. MQTT defines three QoS levels: 0 (at most once), 1 (at least once), 2 (exactly once). |
| **RMS** | Root Mean Square. A statistical measure of the magnitude of a varying quantity. For AC signals, Vrms and Irms give the equivalent DC values for power calculation. |
| **Socket.IO** | A JavaScript library for real-time, bidirectional, event-based communication between browser clients and a Node.js server. |
| **YF-S201** | A Hall-effect water flow sensor that outputs a pulse train whose frequency is proportional to water flow rate. |
| **ZMPT101B** | A voltage transformer module that provides an isolated, scaled analog representation of the AC mains voltage for microcontroller ADC measurement. |
| **Zod** | A TypeScript-first schema declaration and validation library for Node.js. |

---

*End of SOFTWARE_ARCHITECTURE.md*  
*Document maintained by the project team. Last updated: September 2026.*
