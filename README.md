# Smart IoT-Based Water and Electricity Consumption Monitoring System

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-3.1.1-660066?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-Arduino-E7352C?style=for-the-badge&logo=arduino&logoColor=white)

---

## Overview

The **Smart IoT-Based Water and Electricity Consumption Monitoring System** is a college Project-Based Learning (PBL) prototype that demonstrates end-to-end integration of embedded systems, cloud-style backend services, real-time communication, and a modern web dashboard.

The system uses an **ESP32 microcontroller** wired to a **YF-S201 water flow sensor** and **ZMPT101B / ACS712 electricity sensors** to measure resource consumption in real time. Sensor readings are published over **Wi-Fi via the MQTT protocol** to a locally hosted **Mosquitto broker**, from where a **Node.js / TypeScript backend** subscribes, validates, persists data into **PostgreSQL** (via Prisma ORM), and exposes it through a **REST API** and **WebSocket (Socket.IO)** interface. A **Next.js 14 dashboard** visualises live and historical data, highlights anomalies, and shows device connectivity status.

### Key Capabilities

| Capability | Description |
|---|---|
| **Real-time sensing** | Water flow (L/min, total litres) and electricity (voltage, current, power, energy) sampled every 5 seconds |
| **MQTT messaging** | Lightweight publish-subscribe protocol; ESP32 publishes, backend subscribes |
| **Persistent storage** | All readings stored in a relational PostgreSQL database with time-series queries |
| **REST API** | JSON endpoints for current readings, historical data, analytics summaries |
| **Live dashboard** | Next.js dashboard with Recharts graphs, auto-refreshing metric cards, anomaly indicators |
| **Anomaly detection** | Rule-based + statistical (z-score) detection for spikes, leaks, and over-voltage |
| **Device status** | Online/offline tracking per device with last-seen timestamp |
| **Development mode** | Full mock-data mode enables frontend development without any hardware |

---

## Team

| Member | Role | Primary Responsibilities |
|---|---|---|
| **Member 1** | Hardware & Firmware Engineer | ESP32 setup and wiring, YF-S201 water flow sensor, ZMPT101B voltage sensor, ACS712 current sensor, Arduino/ESP-IDF firmware, MQTT publisher, GPIO pin assignment, sensor calibration, hardware testing |
| **Member 2** | Backend & Database Engineer | Node.js TypeScript project, Prisma ORM, PostgreSQL schema design, Mosquitto MQTT broker configuration, MQTT subscriber service, payload validation (Zod), REST API implementation (Express), analytics service, anomaly detection logic, Socket.IO server, device health monitoring |
| **Member 3** | Frontend & Dashboard Engineer | Next.js 14 App Router project, React component library, Recharts integration, real-time WebSocket client (Socket.IO-client), mock API mode, dashboard pages (overview, water, electricity, analytics), responsive layout, anomaly display, device status UI |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          HARDWARE LAYER                                      │
│                                                                              │
│   YF-S201          ZMPT101B         ACS712                                   │
│  (Water Flow)     (AC Voltage)    (AC Current)                               │
│      │                 │               │                                     │
│      └─────────────────┴───────────────┘                                    │
│                          │                                                   │
│                       ESP32                                                  │
│              (Arduino firmware, Wi-Fi + MQTT client)                         │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │  Wi-Fi (TCP/IP)
                               │  MQTT publish
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       BROKER LAYER (localhost)                               │
│                                                                              │
│                     Mosquitto MQTT Broker :1883                              │
│                   Topics: sensors/water, sensors/electricity                 │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │  MQTT subscribe
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER (Node.js / TypeScript)                  │
│                                                                              │
│   MQTT Subscriber  →  Validator (Zod)  →  Service Layer  →  PostgreSQL 15   │
│                                                  │          (Prisma ORM)    │
│                                          Analytics Service                  │
│                                          Anomaly Detection                  │
│                                          Device Health Monitor              │
│                                                  │                          │
│                               ┌──────────────────┴──────────────────┐       │
│                               │  Express REST API  │  Socket.IO WS   │       │
│                               │  :3001/api/v1      │  :3001          │       │
│                               └──────────────────┬──────────────────┘       │
└──────────────────────────────────────────────────┼───────────────────────────┘
                                                   │  HTTP / WebSocket
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER (Next.js 14 / React)                     │
│                                                                              │
│   Dashboard  │  Water Page  │  Electricity Page  │  Analytics Page          │
│                                                                              │
│   MetricCard │  LineChart   │  AreaChart         │  AnomalyList             │
│   DeviceStatus │ HistoryTable │ CostEstimate      │  SummaryStats            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Simplified One-Line View

```
Sensors → ESP32 → Wi-Fi → MQTT → Mosquitto → Node.js Backend → PostgreSQL
                                                      ↓
                                            REST API + WebSocket
                                                      ↓
                                            Next.js Dashboard
```

---

## Quick Start

### Prerequisites

Ensure the following are installed and available on your development machine before proceeding:

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20.x LTS or higher | [nodejs.org](https://nodejs.org) |
| npm | 10.x (bundled with Node 20) | Comes with Node.js |
| Docker Desktop | Latest | Runs PostgreSQL 15 and Mosquitto 2 through Compose |
| Git | 2.x | For version control |
| Arduino IDE / VS Code + PlatformIO | Latest | For ESP32 firmware (Member 1 only) |

---

### 1. Clone the Repository

```bash
git clone <repo-url>
cd smart-resource-monitor
```

---

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install all Node.js dependencies
npm install

# Copy the example environment file and fill in your values
cp .env.example .env
```

Open `.env` in your editor and set the following:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_monitor"

# MQTT broker settings
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_PORT=1883
MQTT_USERNAME=""
MQTT_PASSWORD=""

# Server port
PORT=3001

# CORS origin (your Next.js dev URL)
CORS_ORIGIN="http://localhost:3000"

# Anomaly detection thresholds
WATER_FLOW_MAX_LMIN=30
ELECTRICITY_VOLTAGE_MIN=180
ELECTRICITY_VOLTAGE_MAX=260
ELECTRICITY_POWER_MAX_W=3500
```

```bash
# Run the Prisma migration to create all database tables
npx prisma migrate dev --name init

# Generate the Prisma client
npx prisma generate

# Start the backend development server (with ts-node-dev hot-reload)
npm run dev
```

The backend API will be available at `http://localhost:3001`.

---

### 3. Frontend Setup

```bash
# Navigate to the frontend directory (from repo root)
cd frontend

# Install all dependencies
npm install

# Copy the example environment file
cp .env.example .env.local
```

Open `.env.local` in your editor:

```env
# URL of the backend REST API
NEXT_PUBLIC_API_URL=http://localhost:3001

# URL for Socket.IO WebSocket connection
NEXT_PUBLIC_WS_URL=http://localhost:3001

# Set to "true" to use mock data (no backend required)
NEXT_PUBLIC_USE_MOCK_API=false
```

> **Tip:** Set `NEXT_PUBLIC_USE_MOCK_API=true` if you want to develop the frontend without the backend running. All API calls will be served from `mockData.ts` automatically.

```bash
# Start the Next.js development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

### 4. MQTT Simulator (for Development Without ESP32)

If you do not have the ESP32 hardware ready, you can simulate sensor data using the included TypeScript simulator script. This publishes realistic, randomised MQTT messages at a 5-second interval.

```bash
# From the backend directory
cd backend
npx ts-node scripts/mqtt-simulator.ts
```

You should see output like:

```
[Simulator] Connected to MQTT broker at mqtt://localhost:1883
[Simulator] Published to sensors/water  → {"deviceId":"esp32-dev-01","timestamp":"2026-09-22T14:25:00.000Z","flowRate":3.72,"totalLitres":128.4,"unit":"L"}
[Simulator] Published to sensors/electricity → {"deviceId":"esp32-dev-01","timestamp":"2026-09-22T14:25:00.000Z","voltage":231.4,"current":4.12,"power":953.4,"energy":0.00133,"unit":"home"}
```

---

### 5. Mosquitto Broker

Ensure Mosquitto is installed and start it with the project configuration file:

```bash
# From the repo root
docker compose up -d
```

The Compose service uses [`docker/mosquitto/mosquitto.conf`](docker/mosquitto/mosquitto.conf).


---

## Documentation

All detailed documentation is located in the [`docs/`](docs/) directory. Each file is self-contained and suitable for viva questions, handover, and reference.

| Document | Description |
|---|---|
| [`docs/SOFTWARE_ARCHITECTURE.md`](docs/SOFTWARE_ARCHITECTURE.md) | Full software architecture, component responsibilities, design patterns, data flow diagrams |
| [`docs/TEAM_TASK_DISTRIBUTION.md`](docs/TEAM_TASK_DISTRIBUTION.md) | Detailed task breakdown per member, ownership matrix, collaboration points |
| [`docs/MQTT_PROTOCOL.md`](docs/MQTT_PROTOCOL.md) | MQTT topic names, QoS levels, full JSON payload schemas with field descriptions and constraints |
| [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) | Entity-relationship diagram, all table schemas, indexes, query patterns, migration guide |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Every REST API endpoint: method, path, request/response schemas, error codes, curl examples |
| [`docs/FRONTEND_SPECIFICATION.md`](docs/FRONTEND_SPECIFICATION.md) | Component hierarchy, page specifications, state management, mock mode, routing |
| [`docs/ANOMALY_DETECTION.md`](docs/ANOMALY_DETECTION.md) | Detection algorithms, thresholds, z-score calculation, alert types, response actions |
| [`docs/INTEGRATION_GUIDE.md`](docs/INTEGRATION_GUIDE.md) | Step-by-step guide to integrate all three layers; troubleshooting common integration failures |
| [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) | Pre-demo test checklist: unit tests, integration tests, end-to-end scenarios, hardware tests |
| [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) | Structured demo script, talking points per slide, expected outputs, demo fallback strategies |
| [`docs/VIVA_QA.md`](docs/VIVA_QA.md) | 50+ anticipated viva questions with detailed answers covering all layers of the system |
| [`docs/DEVELOPMENT_TIMELINE.md`](docs/DEVELOPMENT_TIMELINE.md) | Day-by-day plan, critical path, MVP definition, risk register, Git workflow |

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Microcontroller** | ESP32 (Espressif) | ESP32-WROOM-32 | Wi-Fi + sensor reading + MQTT publishing |
| **Firmware Language** | Arduino C++ | Arduino core 2.x | GPIO, sensor drivers, MQTT client |
| **MQTT Client (FW)** | PubSubClient | 2.8 | MQTT publish from ESP32 |
| **MQTT Broker** | Eclipse Mosquitto | 2.x | Message broker, topic routing |
| **Backend Runtime** | Node.js | 20 LTS | Server-side JavaScript runtime |
| **Backend Language** | TypeScript | 5.x | Type-safe backend development |
| **Backend Framework** | Express.js | 4.x | HTTP REST API server |
| **MQTT Client (BE)** | mqtt (npm) | 5.x | Subscribe to Mosquitto from Node.js |
| **ORM** | Prisma | 5.x | Type-safe database access, migrations |
| **Database** | PostgreSQL | 15 | Relational database for time-series data |
| **WebSocket** | Socket.IO | 4.x | Real-time push from backend to dashboard |
| **Validation** | Zod | 3.x | Runtime schema validation of MQTT payloads |
| **Frontend Framework** | Next.js | 14 (App Router) | React framework with SSR/CSR |
| **UI Language** | TypeScript + React | 18.x | Component-based UI |
| **Charting** | Recharts | 2.x | Line, area, bar charts for sensor data |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS framework |
| **WS Client** | socket.io-client | 4.x | Real-time connection to Socket.IO server |
| **HTTP Client** | Axios | 1.x | REST API calls from Next.js |
| **Package Manager** | npm | 10.x | Dependency management |
| **Version Control** | Git + GitHub | — | Source control and collaboration |

---

## Repository Structure

```
smart-resource-monitor/
│
├── README.md                          ← This file
├── mosquitto.conf                     ← Mosquitto broker configuration
├── .gitignore                         ← Root gitignore
│
├── docs/                              ← All project documentation
│   ├── SOFTWARE_ARCHITECTURE.md
│   ├── TEAM_TASK_DISTRIBUTION.md
│   ├── MQTT_PROTOCOL.md
│   ├── DATABASE_DESIGN.md
│   ├── API_DOCUMENTATION.md
│   ├── FRONTEND_SPECIFICATION.md
│   ├── ANOMALY_DETECTION.md
│   ├── INTEGRATION_GUIDE.md
│   ├── TESTING_CHECKLIST.md
│   ├── DEMO_GUIDE.md
│   ├── VIVA_QA.md
│   └── DEVELOPMENT_TIMELINE.md
│
├── firmware/                          ← ESP32 Arduino firmware (Member 1)
│   ├── smart_monitor/
│   │   ├── smart_monitor.ino          ← Main Arduino sketch
│   │   ├── config.h                   ← Wi-Fi SSID, MQTT host, pins
│   │   ├── sensors.h / sensors.cpp    ← Water + electricity sensor drivers
│   │   ├── mqtt_client.h / .cpp       ← MQTT publish wrapper
│   │   └── payload_builder.h / .cpp   ← JSON payload serialisation
│   └── README_firmware.md
│
├── backend/                           ← Node.js TypeScript backend (Member 2)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma              ← Database schema
│   │   └── migrations/                ← Auto-generated migration SQL files
│   ├── src/
│   │   ├── index.ts                   ← Entry point, server bootstrap
│   │   ├── config.ts                  ← Env-var configuration loader
│   │   ├── mqtt/
│   │   │   ├── mqttClient.ts          ← Mosquitto connection
│   │   │   ├── mqttSubscriber.ts      ← Topic subscription + dispatch
│   │   │   └── payloadValidator.ts    ← Zod schemas for water + electricity
│   │   ├── services/
│   │   │   ├── waterService.ts        ← Water CRUD + analytics
│   │   │   ├── electricityService.ts  ← Electricity CRUD + analytics
│   │   │   ├── anomalyService.ts      ← Anomaly detection logic
│   │   │   └── deviceService.ts       ← Device online/offline tracking
│   │   ├── routes/
│   │   │   ├── waterRoutes.ts         ← /api/v1/water/* endpoints
│   │   │   ├── electricityRoutes.ts   ← /api/v1/electricity/* endpoints
│   │   │   ├── analyticsRoutes.ts     ← /api/v1/analytics/* endpoints
│   │   │   ├── anomalyRoutes.ts       ← /api/v1/anomalies/* endpoints
│   │   │   └── deviceRoutes.ts        ← /api/v1/devices/* endpoints
│   │   ├── websocket/
│   │   │   └── socketServer.ts        ← Socket.IO event emitters
│   │   └── types/
│   │       └── index.ts               ← Shared TypeScript interfaces
│   └── scripts/
│       └── mqtt-simulator.ts          ← Dev MQTT message simulator
│
└── frontend/                          ← Next.js 14 dashboard (Member 3)
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── .env.example
    ├── public/
    │   └── icons/
    ├── src/
    │   ├── app/                       ← Next.js App Router pages
    │   │   ├── layout.tsx             ← Root layout with nav
    │   │   ├── page.tsx               ← Overview dashboard (/)
    │   │   ├── water/
    │   │   │   └── page.tsx           ← Water detail page
    │   │   ├── electricity/
    │   │   │   └── page.tsx           ← Electricity detail page
    │   │   └── analytics/
    │   │       └── page.tsx           ← Analytics + anomalies page
    │   ├── components/
    │   │   ├── MetricCard.tsx         ← Live KPI card component
    │   │   ├── SensorChart.tsx        ← Recharts line/area chart wrapper
    │   │   ├── AnomalyBadge.tsx       ← Colour-coded anomaly indicator
    │   │   ├── DeviceStatusCard.tsx   ← Online/offline status widget
    │   │   ├── HistoryTable.tsx       ← Paginated readings table
    │   │   ├── Navigation.tsx         ← Top navigation bar
    │   │   └── LoadingSpinner.tsx     ← Loading state component
    │   ├── lib/
    │   │   ├── api.ts                 ← Axios wrapper + mock/real toggle
    │   │   ├── mockData.ts            ← Realistic mock sensor datasets
    │   │   ├── socket.ts              ← Socket.IO-client singleton
    │   │   └── utils.ts               ← Formatting helpers (units, dates)
    │   └── types/
    │       └── index.ts               ← Shared TypeScript types (mirrors backend)
    └── README_frontend.md
```

---

## MQTT Contract

All sensor data is published by the ESP32 as **JSON strings** over MQTT. The backend subscribes and validates every message against a Zod schema before inserting into the database.

### Water Reading — Topic: `sensors/water`

```json
{
  "deviceId":    "esp32-dev-01",
  "timestamp":   "2026-09-22T14:25:00.000Z",
  "flowRate":    3.72,
  "totalLitres": 128.4,
  "unit":        "L"
}
```

| Field | Type | Unit | Description |
|---|---|---|---|
| `deviceId` | string | — | Unique ESP32 device identifier |
| `timestamp` | string (ISO 8601) | — | UTC timestamp when reading was taken |
| `flowRate` | number | L/min | Instantaneous flow rate from YF-S201 |
| `totalLitres` | number | L | Cumulative total litres since last reset |
| `unit` | string | — | Location tag (e.g., `"L"` for main line) |

### Electricity Reading — Topic: `sensors/electricity`

```json
{
  "deviceId":  "esp32-dev-01",
  "timestamp": "2026-09-22T14:25:00.000Z",
  "voltage":   231.4,
  "current":   4.12,
  "power":     953.4,
  "energy":    0.00133,
  "unit":      "home"
}
```

| Field | Type | Unit | Description |
|---|---|---|---|
| `deviceId` | string | — | Unique ESP32 device identifier |
| `timestamp` | string (ISO 8601) | — | UTC timestamp when reading was taken |
| `voltage` | number | V (RMS) | AC RMS voltage from ZMPT101B |
| `current` | number | A (RMS) | AC RMS current from ACS712 |
| `power` | number | W | Apparent power (V × I) |
| `energy` | number | kWh | Energy consumed in this sample interval |
| `unit` | string | — | Location tag (e.g., `"home"` for main panel) |

> For the full protocol specification — QoS levels, retained messages, Last Will and Testament config, topic hierarchy, and error payload format — see [`docs/MQTT_PROTOCOL.md`](docs/MQTT_PROTOCOL.md).

---

## Hardware Components

| Component | Model | Purpose | Interface |
|---|---|---|---|
| Microcontroller | ESP32-WROOM-32 | Main controller, Wi-Fi, MQTT | — |
| Water Flow Sensor | YF-S201 | Measures water flow rate | Digital pulse (GPIO) |
| Voltage Sensor | ZMPT101B | Measures AC mains voltage | Analog (ADC) |
| Current Sensor | ACS712 (30A) | Measures AC current | Analog (ADC) |
| Power Supply | 5V USB / LiPo | Powers ESP32 and sensors | — |
| Breadboard + Jumpers | — | Prototyping connections | — |
| Enclosure | Plastic project box | Safety isolation for AC sensing | — |

### GPIO Pin Assignment (ESP32)

| GPIO Pin | Connected To | Mode |
|---|---|---|
| GPIO 4 | YF-S201 signal pin | Digital Input (interrupt) |
| GPIO 34 | ZMPT101B output | Analog Input (ADC1) |
| GPIO 35 | ACS712 output | Analog Input (ADC1) |
| GPIO 2 | Onboard LED (status) | Digital Output |

---

## ⚠️ Safety Notice

> [!CAUTION]
> **This project involves prototype electricity sensing near mains AC voltage (230V / 50Hz).**
>
> - The ZMPT101B voltage sensor module and ACS712 current sensor module must be installed with proper **galvanic isolation** as specified in their datasheets.
> - **Never expose mains-voltage wiring on an open breadboard.** All connections carrying or adjacent to 230V AC must be inside a suitable **insulated, enclosed housing**.
> - All mains-side wiring must be performed **only by a qualified electrician or under direct qualified supervision**.
> - Double-check that the low-voltage (ESP32 / sensor signal) side is **fully isolated** from the mains side before powering on.
> - Use a **residual current device (RCD) / GFCI** protected outlet for all testing.
> - **When in doubt, do not power on.** Disconnect from mains first, then inspect.
>
> The authors accept no liability for injury or damage arising from improper handling of mains electrical systems.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `MQTT_BROKER_URL` | ✅ | `mqtt://localhost` | Mosquitto broker URL |
| `MQTT_PORT` | ✅ | `1883` | MQTT broker port |
| `MQTT_USERNAME` | ❌ | `""` | MQTT auth username (blank = anonymous) |
| `MQTT_PASSWORD` | ❌ | `""` | MQTT auth password |
| `PORT` | ✅ | `3001` | Express server port |
| `CORS_ORIGIN` | ✅ | `http://localhost:3000` | Allowed frontend origin for CORS |
| `WATER_FLOW_MAX_LMIN` | ✅ | `30` | Anomaly threshold: max flow rate (L/min) |
| `ELECTRICITY_VOLTAGE_MIN` | ✅ | `180` | Anomaly threshold: minimum voltage (V) |
| `ELECTRICITY_VOLTAGE_MAX` | ✅ | `260` | Anomaly threshold: maximum voltage (V) |
| `ELECTRICITY_POWER_MAX_W` | ✅ | `3500` | Anomaly threshold: max power draw (W) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:3001/api/v1` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | ✅ | `http://localhost:3001` | Socket.IO WebSocket server URL |
| `NEXT_PUBLIC_USE_MOCK_API` | ❌ | `false` | `true` = use mockData.ts instead of real API |

---

## API Overview

The backend exposes a versioned REST API at `/api/v1`. All responses are JSON.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/water/latest` | Most recent water reading for a device |
| `GET` | `/api/v1/water/history` | Paginated historical water readings |
| `GET` | `/api/v1/electricity/latest` | Most recent electricity reading |
| `GET` | `/api/v1/electricity/history` | Paginated historical electricity readings |
| `GET` | `/api/v1/analytics/daily-summary` | Aggregated daily water + electricity stats |
| `GET` | `/api/v1/anomalies` | List of detected anomaly events |
| `GET` | `/api/v1/devices` | List of all devices and their online/offline status |

> For full request/response schemas, query parameters, error codes, and `curl` examples, see [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

---

## Scripts Reference

### Backend Scripts (`backend/package.json`)

| Script | Command | Description |
|---|---|---|
| `dev` | `ts-node-dev src/index.ts` | Start backend with hot-reload |
| `build` | `tsc -p tsconfig.json` | Compile TypeScript to JavaScript |
| `start` | `node dist/index.js` | Run compiled production build |
| `prisma:migrate` | `npx prisma migrate dev` | Run pending database migrations |
| `prisma:studio` | `npx prisma studio` | Open Prisma visual DB browser |
| `simulate` | `npx ts-node scripts/mqtt-simulator.ts` | Run MQTT simulator |

### Frontend Scripts (`frontend/package.json`)

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start Next.js development server |
| `build` | `next build` | Build optimised production bundle |
| `start` | `next start` | Serve production build |
| `lint` | `next lint` | Run ESLint on all source files |

---

## License

This project is released under the **MIT License**.

```
MIT License

Copyright (c) 2026 Smart Monitor PBL Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

*Last updated: 22 September 2026 — Smart IoT PBL Team*
