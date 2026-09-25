# Demo Guide — Smart IoT-Based Water and Electricity Consumption Monitoring System

> **Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System
> **Type:** College Project-Based Learning (PBL) Prototype
> **Audience:** Internal Evaluators / External Examiners
> **Document Version:** 1.0
> **Last Updated:** 2026-09-22

---

## Table of Contents

1. [Demo Overview](#1-demo-overview)
2. [Pre-Demo Setup Checklist](#2-pre-demo-setup-checklist)
3. [Demo Script — Step by Step](#3-demo-script--step-by-step)
   - [Step 1 — Introduction](#step-1-introduction-30-seconds)
   - [Step 2 — Show the Physical Hardware](#step-2-show-the-physical-hardware-45-seconds)
   - [Step 3 — Start ESP32 and Show Wi-Fi / MQTT Connection](#step-3-start-esp32--show-wi-fi-and-mqtt-connection-30-seconds)
   - [Step 4 — Show MQTT Messages in Mosquitto Terminal](#step-4-show-mqtt-messages-in-mosquitto-terminal-30-seconds)
   - [Step 5 — Show Backend Receiving Messages](#step-5-show-backend-receiving-messages-30-seconds)
   - [Step 6 — Show PostgreSQL Records](#step-6-show-postgresql-records-30-seconds)
   - [Step 7 — Show Dashboard Current Readings](#step-7-show-dashboard--current-readings-30-seconds)
   - [Step 8 — Run Water Through Flow Sensor](#step-8-run-water-through-flow-sensor-45-seconds)
   - [Step 9 — Show Electricity Readings](#step-9-show-electricity-readings-30-seconds)
   - [Step 10 — Trigger Water Flow Anomaly](#step-10-trigger-water-flow-anomaly-45-seconds)
   - [Step 11 — Trigger Electricity Anomaly (Optional)](#step-11-trigger-electricity-anomaly-optional-30-seconds)
   - [Step 12 — Demonstrate ESP32 Offline Detection](#step-12-demonstrate-esp32-offline-detection-45-seconds)
   - [Step 13 — Summary](#step-13-summary-30-seconds)
4. [Backup Plans](#4-backup-plans)
5. [Common Demo Day Questions From Evaluators](#5-common-demo-day-questions-from-evaluators)
6. [Timing Guide](#6-timing-guide)

---

## 1. Demo Overview

| Attribute             | Detail                                                                 |
|-----------------------|------------------------------------------------------------------------|
| **Total Demo Time**   | 6–7 minutes (strict); aim for 6 minutes to leave 1 minute buffer      |
| **Team Members**      | 3 members present simultaneously; each has a defined speaking role     |
| **Mode**              | Live hardware demo preferred; MQTT simulator as fallback               |
| **Setup Time Needed** | Minimum 20 minutes before evaluators arrive                            |
| **Key Objective**     | Show the full end-to-end IoT pipeline: physical sensor → ESP32 → MQTT → Backend → Database → Real-time Dashboard |

### What the Demo Must Prove

The evaluators need to walk away understanding — and having **seen** — the following:

1. **Physical sensor data capture** — The ESP32 reads from real sensors.
2. **Wireless data transmission** — MQTT over Wi-Fi to a local broker.
3. **Backend processing** — Validation, analytics, anomaly detection, database storage.
4. **Persistent storage** — PostgreSQL records with timestamps visible.
5. **Real-time frontend updates** — Dashboard updates via Socket.IO WebSocket without page refresh.
6. **Anomaly detection** — A triggered anomaly appears immediately on the dashboard.
7. **Device offline detection** — Unplugging the ESP32 marks it offline within one heartbeat cycle.

### Props / Equipment Needed at the Demo Table

| Item                            | Purpose                                                    |
|---------------------------------|------------------------------------------------------------|
| Laptop (running all services)   | Hosts PostgreSQL, Mosquitto, Node.js backend, Next.js frontend |
| ESP32 DevKit V1 board           | Microcontroller — reads sensors and publishes MQTT         |
| YF-S201 water flow sensor       | Measures water flow via hall-effect pulse counting         |
| Small water container (~2L)     | Reservoir for water loop                                   |
| Small submersible pump (5V/12V DC) | Drives water through the flow sensor                   |
| Tubing / hose                   | Connects container → pump → flow sensor → container (loop) |
| ZMPT101B voltage sensor module  | Reads AC voltage — **must be enclosed and isolated**       |
| ACS712 current sensor module    | Reads current — safely wired to a low-voltage test circuit |
| Safe test load                  | LED array, DC motor, or lamp — **NOT raw mains wiring**    |
| USB cable for ESP32             | Power + serial monitor connection                          |
| Power bank or USB hub           | Clean power for ESP32                                      |
| Laptop charger                  | Keep laptop at 100% power, not on battery                  |
| Backup phone (hotspot)          | If venue Wi-Fi fails                                       |

> [!CAUTION]
> **Do NOT demonstrate with exposed mains-voltage (230V AC) wiring during the demo.** The ZMPT101B and ACS712 must be properly enclosed in an insulated housing. For the demo, either use a low-voltage safe test setup (e.g., a DC circuit with ACS712 only) or have the electrical sensors pre-connected and encased. Safety is non-negotiable — evaluators will penalise unsafe setups.

---

## 2. Pre-Demo Setup Checklist

Complete every item on this list **before** evaluators approach the demo station. Assign one team member as the "setup lead" who verifies every checkbox.

### 2.1 Software Services

- [ ] **PostgreSQL** is running and accessible.
  - Verify: Open a terminal and run `psql -U postgres -d iot_monitor -c "SELECT NOW();"` — should return a timestamp.
- [ ] **Mosquitto MQTT Broker** is running.
  - Verify from the repository root: `docker compose ps`. The `smart_monitor_mqtt` container should be running.
- [ ] **Backend (Node.js / Express / TypeScript)** is running.
  - Start with: `npm run dev` from the `backend/` directory.
  - Verify: Terminal shows the backend listening on port `3001` and `[MQTT] Connected to broker`.
  - Keep this terminal **visible on screen** during the demo.
- [ ] **Frontend (Next.js)** is running.
  - Start with: `npm run dev` from the `frontend/` directory.
  - Verify: Terminal shows `ready - started server on 0.0.0.0:3000`.
- [ ] **Browser** is open at `http://localhost:3000/`.
  - Verify: Dashboard loads, no loading spinners stuck indefinitely, device status card is visible.
- [ ] **Browser DevTools** (optional but impressive) open on the **Network** tab, filtered to `WS` (WebSocket), so evaluators can see live Socket.IO frames arriving.
- [ ] **Prisma Studio** is open at `http://localhost:5555` **OR** a `psql` terminal is ready with the command `SELECT * FROM water_readings ORDER BY timestamp DESC LIMIT 5;` pre-typed and ready to execute.
- [ ] **Arduino IDE / Serial Monitor** (or PlatformIO Monitor) is open and connected to the ESP32's COM port.
  - Baud rate: 115200 (match firmware setting).
- [ ] All terminal windows are **arranged and sized** so they can all be shown on screen or switched to quickly. Suggested layout:
  - Left half: Mosquitto terminal (top) + Backend terminal (bottom).
  - Right half: Browser with dashboard.
  - Have psql / Prisma Studio in a separate tab ready to switch to.

### 2.2 Hardware

- [ ] ESP32 is powered via USB and connected to the laptop or a power bank.
- [ ] Serial Monitor shows the ESP32 boot sequence (reset it once to show a clean boot during demo).
- [ ] Wi-Fi connection is confirmed — Serial Monitor shows `WiFi connected. IP: 192.168.x.x`.
- [ ] MQTT connection is confirmed — Serial Monitor shows `MQTT connected.` and initial publish messages.
- [ ] Water container is filled with water (approximately 1–1.5 litres is enough for the loop).
- [ ] Tubing is securely connected: **Container → Pump → YF-S201 Sensor → Container** (closed loop so water recirculates and does not spill).
- [ ] Pump has been tested — water flows through the sensor when powered.
- [ ] Electrical test circuit is safely assembled and isolated. If using ZMPT101B + ACS712:
  - All connections are inside the enclosure.
  - Only safe, labelled terminals are exposed.
  - Test load (e.g., a small lamp or LED array) is connected.
- [ ] All loose wires are secured with cable ties or tape — no dangling wires near water.

### 2.3 Backup Readiness

- [ ] **MQTT Simulator script** (`backend/scripts/mqtt-simulator.ts`) is tested and ready to run with `npm run simulate` from `backend/`.
- [ ] Simulator produces valid payloads on the correct MQTT topic (`resource/readings`).
- [ ] Screenshots of the working system (dashboard with live data, anomalies) are saved on the desktop as a last-resort visual backup.
- [ ] A short screen-recording video (~2 minutes) of the system working is saved locally.
- [ ] Phone hotspot credentials are saved and tested — know the SSID and password. ESP32 firmware `WIFI_SSID` and `WIFI_PASSWORD` can be changed in `firmware/esp32/config.h` if needed (requires re-flash).

> [!IMPORTANT]
> The single most common cause of demo failure is **network issues**. If you are at a venue with restricted or unreliable Wi-Fi, plan to use a phone hotspot from the start. Do not gamble on venue Wi-Fi.

---

## 3. Demo Script — Step by Step

> **Notation used below:**
> - **Speaker:** Which team member speaks.
> - **Show:** What should be visible on screen or physically displayed.
> - **Action:** What a team member physically does.
> - **Speaking Points:** The actual words to say (memorise the key phrases; do not read from paper).

---

### Step 1: Introduction (30 seconds)

**Speaker:** All three members together (brief self-introduction), then the designated "host" (Member 1 or whoever is most comfortable presenting) takes over.

**Show:** Dashboard visible in the background on the laptop screen.

**Speaking Points:**

> *"Good [morning / afternoon]. We are [Name 1], [Name 2], and [Name 3] — Team [Team Number/Name]. We are presenting the Smart IoT-Based Water and Electricity Consumption Monitoring System as our Project-Based Learning submission.*
>
> *This prototype demonstrates real-time monitoring of household water flow and electrical consumption using an ESP32 microcontroller, the MQTT messaging protocol, a Node.js backend with TypeScript, a PostgreSQL database, and a Next.js real-time web dashboard.*
>
> *We will walk you through the complete pipeline — from the physical sensors all the way to the live dashboard — in approximately six minutes. Let's begin."*

**Tips:**
- Speak clearly and at a measured pace. Nervousness causes people to rush — consciously slow down.
- Make eye contact with the evaluators, not at the laptop screen.
- Both non-speaking members should stand confidently and not fidget.

---

### Step 2: Show the Physical Hardware (45 seconds)

**Speaker:** Member 1

**Show:** Pick up each hardware component and briefly hold it up as you name it. Keep the enclosure for the electrical sensors closed — do not open it in front of evaluators.

**Action:** Member 1 points to or holds up: ESP32 board, YF-S201 sensor, pump + tubing assembly, ZMPT101B + ACS712 enclosure.

**Speaking Points:**

> *"Let me show you the physical hardware. This is our ESP32 DevKit V1 microcontroller — it is the brain of our sensor node. It has built-in Wi-Fi, which we use to transmit data wirelessly."*
>
> *"This is the YF-S201 water flow sensor. It uses a hall-effect mechanism — water flowing through it spins a small rotor, and a magnetic hall-effect sensor generates electrical pulses. Our ESP32 counts these pulses using a hardware interrupt on GPIO [pin number, e.g., GPIO 14]. The pulse frequency is proportional to flow rate — approximately 7.5 pulses per second per litre per minute."*
>
> *"For electricity monitoring, we use two sensors inside this enclosure: the ZMPT101B for voltage measurement, and the ACS712 for current measurement. These are properly isolated. The ESP32 reads their analogue output signals through its ADC pins and computes voltage RMS, current RMS, and apparent power."*
>
> *"The ESP32 packages all readings into a JSON payload and publishes it to our MQTT broker over Wi-Fi every few seconds."*

**Tips:**
- Keep the hardware enclosure closed. If evaluators ask to see inside, explain that it is sealed for safety and offer to show circuit diagrams instead.
- Do not apologise for prototype-grade wiring. Present it confidently.

---

### Step 3: Start ESP32 — Show Wi-Fi and MQTT Connection (30 seconds)

**Speaker:** Member 1

**Show:** Switch focus to the **Serial Monitor** (Arduino IDE / PlatformIO terminal). Press the **EN/RST button** on the ESP32 to trigger a clean reboot and show the boot sequence live.

**Speaking Points:**

> *"Let me reset the ESP32 so you can see its startup sequence."*
>
> *[Press RST button on ESP32.]*
>
> *"You can see the boot log here in the serial monitor. First it initialises the sensors — you can see 'YF-S201 sensor initialised' and the ADC channels configured for the voltage and current sensors."*
>
> *"Then it connects to Wi-Fi. You can see 'Connecting to WiFi...' followed by 'WiFi connected. IP: [IP address]'. This confirms the ESP32 has joined our local network."*
>
> *"Next, it connects to the Mosquitto MQTT broker running on this laptop. You can see 'MQTT connected.' The broker's IP address is the same laptop's local IP — [IP address], port 1883."*
>
> *"After that, the ESP32 immediately begins reading sensors and publishing data. You can see 'Published: resource/readings' appearing every few seconds."*

**Tips:**
- If the ESP32 fails to connect to MQTT on the first boot (this can happen), press RST again. It is normal for one retry.
- If Serial Monitor shows garbage characters, check the baud rate — set it to 115200.

---

### Step 4: Show MQTT Messages in Mosquitto Terminal (30 seconds)

**Speaker:** Member 2

**Show:** Switch to the **Mosquitto broker terminal** (the terminal running `mosquitto -v` or `mosquitto_sub -t "resource/readings" -v`).

**Speaking Points:**

> *"Now let's look at the MQTT broker. This is our Mosquitto broker terminal. You can see it is logging incoming PUBLISH messages from the ESP32 on the topic 'resource/readings'."*
>
> *"Each message is a JSON payload. Let me highlight what you can see here. The payload contains: a device ID — which uniquely identifies this ESP32 unit — a UTC timestamp, and a nested object with water flow data including flow rate in litres per minute and total volume, and another nested object with electricity data including voltage, current, power, and accumulated energy."*
>
> *"MQTT is a lightweight publish-subscribe protocol designed for IoT. It is ideal here because it has very low overhead — the ESP32 only sends data, it does not maintain an HTTP connection. Our backend subscribes to this topic and receives every message the moment it is published."*

**Example of what the evaluator should see (Mosquitto verbose output):**

```
1695123456: New client connected from 192.168.1.105 as ESP32_DEVICE_001 (p2, c1, k60).
1695123457: Received PUBLISH from ESP32_DEVICE_001 (d0, q0, r0, m0, 'resource/readings', ... (187 bytes))
```

**And the corresponding JSON payload (shown in `mosquitto_sub` terminal):**

```json
{
  "deviceId": "ESP32_DEVICE_001",
  "timestamp": "2026-09-22T14:22:37.000Z",
  "water": {
    "flowRate": 2.34,
    "totalVolume": 0.85,
    "unit": "L/min"
  },
  "electricity": {
    "voltage": 221.4,
    "current": 1.12,
    "power": 248.0,
    "energy": 0.0021,
    "powerFactor": 1.0
  }
}
```

**Tips:**
- Run `mosquitto_sub -h localhost -t "resource/readings" -v` in a separate terminal if the Mosquitto verbose log is too noisy. `mosquitto_sub` shows only the topic and payload cleanly.
- Pre-scroll the terminal so the most recent messages are visible.

---

### Step 5: Show Backend Receiving Messages (30 seconds)

**Speaker:** Member 2

**Show:** Switch to the **Backend terminal** (the Node.js process running `npm run dev` in the `backend/` directory).

**Speaking Points:**

> *"Our backend is a Node.js application written in TypeScript using the Express framework. It runs as a separate service on this laptop. You can see it is printing log lines every time it receives a message from the MQTT broker."*
>
> *"The log lines you can see are — '[MQTT] Received message on resource/readings' — that confirms the backend received the raw JSON payload. Then '[Validation] Payload validated successfully' — our backend validates every incoming payload using the Zod library, which ensures the data has the correct structure and types before we process it."*
>
> *"After validation, the backend calculates derived analytics — like energy consumption using E = P × Δt — and then persists the reading to PostgreSQL. You can see '[DB] Stored WaterReading id=...' and '[DB] Stored ElectricityReading id=...' confirming the database write succeeded."*
>
> *"Finally, '[Socket.IO] Emitted water:reading to all clients' — the backend broadcasts the new reading to the dashboard via Socket.IO WebSocket, which is why the dashboard updates instantly without a page refresh."*

**Tips:**
- Have `DEBUG=*` or a verbose log level set in your `.env` so these log lines are actually visible in the terminal.
- If the terminal has too many lines, clear it with `Ctrl+L` just before the demo starts so the evaluator sees a clean stream of recent messages.

---

### Step 6: Show PostgreSQL Records (30 seconds)

**Speaker:** Member 2

**Show:** Switch to either **Prisma Studio** (`http://localhost:5555`) in the browser, or a **psql terminal** with the query already typed.

**If using psql:**

```sql
SELECT id, device_id, flow_rate, total_volume, timestamp
FROM water_readings
ORDER BY timestamp DESC
LIMIT 5;
```

```sql
SELECT id, device_id, voltage, current_ampere, power_watts, energy_kwh, timestamp
FROM electricity_readings
ORDER BY timestamp DESC
LIMIT 5;
```

**Speaking Points:**

> *"Here is our PostgreSQL database. We are using Prisma ORM for type-safe database access — our schema defines models for WaterReading, ElectricityReading, Device, and Anomaly."*
>
> *"You can see the 'water_readings' table. Each row has a unique ID, the device ID, the flow rate in litres per minute, total accumulated volume, and a precise UTC timestamp. A new row is inserted for every MQTT message received."*
>
> *"Similarly, the 'electricity_readings' table stores voltage, current, power in watts, and energy in kilowatt-hours."*
>
> *"Having this historical data in a relational database means we can run time-series queries, generate reports, and compute baseline averages for our anomaly detection — which we will demonstrate in a moment."*

**Tips:**
- If using Prisma Studio, it has a clean table UI that evaluators find intuitive and impressive. Open the `WaterReading` model and sort by `timestamp` descending. New rows will appear as the demo proceeds.
- If the database shows 0 rows when you open it, the backend may not be running correctly. This is why you verify everything in the pre-demo setup checklist.

---

### Step 7: Show Dashboard — Current Readings (30 seconds)

**Speaker:** Member 3

**Show:** Switch the browser to `http://localhost:3000/dashboard`. Make the browser full-screen. Walk the evaluators through the UI sections.

**Speaking Points:**

> *"This is our real-time monitoring dashboard, built with Next.js, React, and TypeScript. We use Tailwind CSS for styling and Recharts for the real-time graphs."*
>
> *"At the top you can see the Device Status card — it shows 'ESP32_DEVICE_001' and its current status: 'ONLINE'. Last heartbeat time is also displayed."*
>
> *"Below that are the current readings cards. The Water Flow card shows the current flow rate — [current value] litres per minute — and the accumulated total volume since the session started."*
>
> *"The Electricity section shows the current voltage — approximately [value] volts — current in amperes, calculated power in watts, and accumulated energy in kilowatt-hours. All of these values are updating in real-time as the ESP32 sends new readings."*
>
> *"On the right side — or below on smaller screens — you can see the time-series chart showing the last few minutes of readings. Notice the chart updates automatically. This is powered by Socket.IO WebSocket — the backend pushes data to the browser. There is no polling — no page refresh needed."*

**Tips:**
- If the dashboard shows stale or no data, open the DevTools Console to check for WebSocket connection errors.
- In DevTools → Network → WS, show the evaluator the live Socket.IO frames if they seem technically curious — it is a strong detail.

---

### Step 8: Run Water Through Flow Sensor (45 seconds)

**Speaker:** Member 1 (operates the pump), Member 3 (narrates what is happening on the dashboard)

**Action:** Member 1 powers on the submersible pump. Water begins flowing through the YF-S201 sensor and back into the container in a closed loop.

**Show:** Dashboard — the Water Flow card should change from 0 L/min (or near-zero idle) to a positive flow rate reading (typically 1–4 L/min depending on pump pressure). The chart line rises. Total volume begins to accumulate.

**Speaking Points (Member 1):**

> *"We are now powering the water pump. Water is flowing from the container, through the YF-S201 flow sensor, and back into the container in a closed loop — so no water is wasted."*
>
> *"The YF-S201 generates pulses as the water flow spins its rotor. Our ESP32 firmware counts these pulses using a hardware interrupt — this is much more accurate than polling. The pulse count is converted to flow rate using the sensor's calibration factor of approximately 7.5 pulses per second per litre per minute. The formula is: Flow Rate (L/min) = Pulse Count per second ÷ 7.5."*

**Speaking Points (Member 3):**

> *"You can see the flow rate has changed on the dashboard — it now reads approximately [value] litres per minute. The chart is updating in real-time."*
>
> *"The total volume counter is also incrementing — it accumulates volume using the formula: Volume += Flow Rate × Time Interval, where the time interval is the reading period in minutes."*
>
> *"This update is happening via Socket.IO. When the backend receives the MQTT message, it emits a 'water:reading' event to all connected browser clients. Our React component has a listener for this event and updates the state — causing a re-render with the new values. No HTTP request, no page reload."*

**Tips:**
- If the flow rate shows 0 even with the pump running, check:
  - Is the sensor interrupt pin correctly wired? (Common mistake: swapped signal and power wires.)
  - Is the pump strong enough to push water fully through the sensor? Try a shorter tube length.
- If the value fluctuates wildly, it is normal for a prototype — acknowledge it and note that a production system would apply smoothing/filtering algorithms.

---

### Step 9: Show Electricity Readings (30 seconds)

**Speaker:** Member 1 and Member 3

**Show:** Dashboard — Electricity section. Turn a safe test load on and off if possible to show the values change.

**Action:** If safe to do so, Member 1 toggles the test load (lamp, fan, LED bank) on and off while Member 3 watches the dashboard.

**Speaking Points:**

> *"Now let's look at the electricity monitoring section. The ZMPT101B and ACS712 sensors are connected to a safe low-voltage test circuit — not directly to mains AC during the demo, for safety reasons."*
>
> *"You can see the voltage reading — approximately [value] volts — and the current — approximately [value] amperes. Our firmware reads these sensors via the ESP32's ADC and computes the RMS values — Root Mean Square — which is the correct way to measure AC signals."*
>
> *"Power is calculated as P = V × I. For AC systems, this gives apparent power. In a more advanced version, we would compute real power using the power factor, but for this prototype, apparent power is used. Our dashboard displays this as [value] watts."*
>
> *"Energy accumulates over time. Every reading period, energy is incremented by E = P × Δt — power multiplied by the time interval. This is integrated over the session and displayed in kilowatt-hours. In a production billing system, this would be combined with the electricity tariff to compute cost."*
>
> *"These are prototype-grade readings. The ACS712 and ZMPT101B are suitable for demonstration and low-precision monitoring, not for billing-grade accuracy. We document this limitation clearly in our project report."*

---

### Step 10: Trigger Water Flow Anomaly (45 seconds)

**Speaker:** Member 2 (explains the logic), Member 3 (points at dashboard when anomaly appears)

**Action (Option A — Hardware):** Keep the pump running continuously. After 5 minutes of sustained flow, the anomaly detection rule triggers. If the demo is time-constrained, pre-configure the threshold to 1 minute for the demo.

**Action (Option B — Simulator):** Run the MQTT simulator to publish a payload simulating sustained high flow that crosses the anomaly threshold. This is faster and more reliable during a demo.

```bash
# Run from project root — simulator sends a sustained flow reading
node scripts/simulate_mqtt.js --scenario water-anomaly
```

**Show:** Anomaly section on the dashboard — a new anomaly card appears with:
- Severity: LOW (for sustained flow) or HIGH
- Resource: WATER
- Message: *"Possible abnormal water usage detected — sustained flow for over 5 minutes without interruption."*
- Actual Value (the flow rate or duration)
- Expected Baseline (the normal baseline)
- Timestamp

**Speaking Points (Member 2):**

> *"Our system includes rule-based anomaly detection running in the backend. For water flow, we monitor for two conditions: first, if the instantaneous flow rate exceeds a configured threshold — for example, 10 litres per minute — which would suggest a burst pipe; and second, if water flow is sustained continuously for more than 5 minutes without stopping, which may indicate a tap was left open or there is a slow leak."*
>
> *"When either condition is met, the backend creates an Anomaly record in the database and broadcasts it to all dashboard clients via Socket.IO."*
>
> *"We deliberately use the phrase 'possible abnormal usage' rather than 'leak detected', because our prototype cannot physically confirm an actual leak. We document this distinction clearly — it is important in engineering to be precise about what your system can and cannot claim."*

**Speaking Points (Member 3):**

> *"You can see the anomaly card has appeared on the dashboard. It shows the resource type — WATER — the severity level — LOW — a human-readable description, the actual value, the expected baseline, and the timestamp of when it was detected."*
>
> *"Because this is broadcast via Socket.IO, every browser viewing the dashboard would see this anomaly simultaneously — which would be useful in a real home automation or building management system."*

**Tips:**
- For a clean demo, lower the anomaly threshold in the backend `.env` to something that triggers quickly (e.g., `WATER_FLOW_ANOMALY_DURATION_SECONDS=60` instead of 300).
- Remember to reset it back to realistic values after the demo.

---

### Step 11: Trigger Electricity Anomaly (Optional, 30 seconds)

**Speaker:** Member 2

**Action:** Use the MQTT simulator to publish a reading with an abnormally high power value that exceeds the configured threshold (e.g., 5000 watts when the threshold is 2000 watts).

```bash
node scripts/simulate_mqtt.js --scenario electricity-anomaly
```

**Show:** A new anomaly card appears on the dashboard for ELECTRICITY with HIGH severity.

**Speaking Points:**

> *"We can also trigger an electricity anomaly in the same way. Our threshold for electricity is configurable — currently set to 2000 watts in the backend environment configuration. When the reported power exceeds this threshold, an anomaly is generated."*
>
> *"The anomaly compares the current reading against a rolling 24-hour baseline average. This makes the detection more intelligent — if the baseline itself is low, even a moderately high spike will be flagged. If a device is consistently high-consumption, the baseline adjusts and prevents constant false positives."*
>
> *"In a future version, we could replace these rule-based thresholds with a machine learning model trained on historical data — for example, an LSTM neural network for time-series anomaly detection. However, for this prototype, rule-based thresholds are sufficient, transparent, and explainable."*

---

### Step 12: Demonstrate ESP32 Offline Detection (45 seconds)

**Speaker:** Member 1 (performs the action), Member 3 (narrates the dashboard)

**Action:** Member 1 physically unplugs the ESP32's USB power cable (or presses the power switch if one was added). Keep the Serial Monitor visible briefly so evaluators see it go silent.

**Show:** Wait approximately 30–60 seconds (depending on your heartbeat timeout configuration). Watch the Device Status card on the dashboard.

**Speaking Points (Member 1):**

> *"One important real-world scenario is device failure or power loss. Let me demonstrate how our system handles that. I am now disconnecting power from the ESP32."*
>
> *[Unplug ESP32 USB.]*
>
> *"The ESP32 is now powered off. The Serial Monitor has gone silent. The MQTT broker will detect that the client connection has dropped — you can see the Mosquitto terminal now shows 'Client ESP32_DEVICE_001 disconnected'."*
>
> *"Our backend uses a heartbeat mechanism. The ESP32 is designed to publish a dedicated status message to the topic 'device/status' every 30 seconds. The backend tracks the timestamp of the last heartbeat received for each device."*
>
> *"If no heartbeat is received within 60 seconds — two missed heartbeats — the backend marks the device as OFFLINE in the database and emits a 'device:status' event with status 'offline' via Socket.IO."*

**Speaking Points (Member 3):**

> *"[After timeout fires] — You can see the Device Status card has now changed. It now shows 'OFFLINE' with a red indicator and the timestamp of the last heartbeat received."*
>
> *"In a production system, this offline event could trigger a push notification to the homeowner's mobile app, an email alert, or integration with a home automation platform like Home Assistant."*
>
> *"[Reconnect the ESP32 USB] — Now I am reconnecting the ESP32. It will reboot, reconnect to Wi-Fi and MQTT, and the dashboard will automatically update back to 'ONLINE' as soon as the first heartbeat is received."*

**Tips:**
- If your heartbeat timeout is 60 seconds, this step takes about 1 minute. To keep the demo within time, pre-configure the heartbeat timeout to 30 seconds (`DEVICE_HEARTBEAT_TIMEOUT_SECONDS=30`) for the demo day.
- While waiting for the timeout, use the time to answer a question from the evaluator or briefly explain the database schema — do not stand in silence.

---

### Step 13: Summary (30 seconds)

**Speaker:** All three members contribute a sentence each.

**Show:** Dashboard visible in the background — live, with data, anomalies visible.

**Speaking Points:**

> **Member 1:** *"To summarise — we have demonstrated the complete IoT pipeline. The ESP32 reads from real physical sensors and transmits data wirelessly using MQTT. The system handles device connectivity, reading intervals, and offline detection."*
>
> **Member 2:** *"Our backend processes every reading — it validates, stores to PostgreSQL, detects anomalies using configurable thresholds, and pushes real-time updates to the frontend using Socket.IO WebSockets. The entire backend is written in TypeScript with strong type safety."*
>
> **Member 3:** *"The dashboard gives a clear, real-time view of all sensor data, historical charts, and anomaly alerts. The system is fully modular — the hardware can be replaced with the MQTT simulator for development and testing without changing any backend or frontend code. Thank you for your time. We are happy to answer any questions."*

---

## 4. Backup Plans

Every demo can encounter unexpected failures. Know these recovery procedures by heart before the demo day.

### 4.1 If ESP32 Fails to Connect (Wi-Fi or MQTT)

**Symptoms:** Serial Monitor shows repeated `Connecting to WiFi...` or `MQTT connection failed`.

**Recovery:**
1. Check that the laptop's Wi-Fi or hotspot is active and broadcasting on the correct SSID.
2. Verify the ESP32 firmware `config.h` has the correct `WIFI_SSID`, `WIFI_PASSWORD`, and `MQTT_BROKER_IP`.
3. Press the ESP32 RST button to retry.
4. If Wi-Fi still fails, switch to phone hotspot immediately — do not waste more than 30 seconds on venue Wi-Fi.
5. If all else fails, **activate the MQTT simulator**:
   ```bash
   node scripts/simulate_mqtt.js --interval 3000
   ```
   Announce: *"We are demonstrating with our software simulator, which publishes identical JSON payloads to the MQTT broker. The backend, database, and dashboard all function identically."*

### 4.2 If Mosquitto Broker Crashes or Is Not Running

**Symptoms:** Backend terminal shows `MQTT connection error: Connection refused`.

**Recovery:**
1. Open a new terminal and run:
   ```bash
   mosquitto -v -c mosquitto.conf
   ```
2. Wait 5 seconds. The backend should automatically reconnect (it has retry logic with exponential backoff).
3. If Mosquitto is installed as a Windows Service:
   ```powershell
   Start-Service -Name mosquitto
   ```
4. Restart should take under 30 seconds. Continue the demo normally.

### 4.3 If PostgreSQL / Database Fails

**Symptoms:** Backend terminal shows `Prisma error`, `Connection refused on port 5432`, or `DB` log lines stop appearing.

**Recovery:**
1. Restart PostgreSQL:
   ```powershell
   Start-Service -Name postgresql-x64-15  # Adjust version number
   ```
2. Restart the backend:
   ```bash
   # Stop current process with Ctrl+C, then:
   npm run dev
   ```
3. Prisma will reconnect automatically on the next query.
4. If the database cannot be recovered quickly, note: the dashboard still receives and displays data via Socket.IO even if the database write temporarily fails (the backend has a try-catch that logs the error but still emits the WebSocket event). Use this to continue the demo and fix the database in the background.

### 4.4 If the Frontend / Dashboard Fails

**Symptoms:** Browser shows blank page, 404, or the data stops updating.

**Recovery:**
1. Hard refresh: `Ctrl + Shift + R`.
2. Check `.env.local` in the `frontend/` directory — verify `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_SOCKET_URL` are correct.
3. If the Next.js dev server crashed, restart it:
   ```bash
   npm run dev
   ```
4. Last resort: demonstrate the backend API directly using `curl` or a REST client (Postman / Insomnia). Show that the API endpoints return correct data:
   ```bash
   curl http://localhost:4000/api/water/readings?limit=5
   curl http://localhost:4000/api/electricity/readings?limit=5
   curl http://localhost:4000/api/anomalies
   ```
   Announce: *"While we restart the dashboard, you can see the backend API is working correctly — here are the last 5 water readings returned as JSON from our REST endpoint."*

### 4.5 If the Water Pump Fails

**Symptoms:** Pump is powered but water does not flow. Flow sensor reads 0.

**Recovery:**
1. Check pump power supply connections.
2. Check that the pump inlet is submerged in water.
3. Prime the pump if needed — disconnect the outlet tube briefly to let air escape.
4. If pump is fully dead: use the MQTT simulator to publish water flow readings. Announce: *"We are simulating the water flow sensor output. The sensor was functional during our testing — here is its output simulated."*

### 4.6 If Wi-Fi at the Venue Is Unavailable

**Recovery (Pre-planned):**
1. Switch to phone hotspot immediately.
2. The MQTT broker (`localhost`) does not require external internet access — all communication is local.
3. The ESP32 just needs to reach the laptop's IP address on the local network. Update the ESP32 firmware `MQTT_BROKER_IP` to the laptop's IP on the hotspot network and re-flash **before the demo if this is anticipated**.
4. Alternatively, connect the ESP32 to the laptop via USB-OTG or use a USB-to-UART adapter and test the entire system on a single shared hotspot network.

> [!TIP]
> **The golden rule of backup plans:** Never apologise excessively. Calmly say: *"Let me switch to our backup mode."* Then proceed. Evaluators respect teams that recover gracefully far more than teams that panic.

---

## 5. Common Demo Day Questions From Evaluators

Prepare concise, confident answers to each of these questions. Practice them aloud at least twice before the demo.

---

### Q1: "What happens if the Wi-Fi goes down?"

> **Answer:** *"If Wi-Fi goes down, the ESP32 loses its connection to the MQTT broker and data transmission stops. The ESP32 firmware has a reconnection loop — it continuously attempts to reconnect to Wi-Fi every few seconds. If Wi-Fi is restored, it automatically reconnects without any manual intervention. On the backend side, if the MQTT broker loses the connection from the ESP32, the device heartbeat will time out and the dashboard will show the device as 'OFFLINE'. In a production deployment, we could also add local data buffering on the ESP32 — storing readings in SPIFFS or EEPROM — and then transmitting the buffered readings as a batch once connectivity is restored. This prevents data loss during brief outages."*

---

### Q2: "What is the accuracy of the sensors?"

> **Answer:** *"The YF-S201 flow sensor has a manufacturer-stated accuracy of approximately ±3% at flow rates between 1 and 30 litres per minute. In practice, the accuracy is better when the sensor is properly oriented vertically and the water pressure is consistent. For electricity, the ACS712 current sensor has a sensitivity of 66 mV/A (for the 30A version) with a typical total error of about 1–1.5%. The ZMPT101B voltage sensor provides reasonably stable readings but requires proper calibration for accurate RMS computation. For billing-grade electricity monitoring, you would use a dedicated energy metering IC such as the ATM90E32 or ADE7758, which provide much higher accuracy — below 0.5% error. Our system is explicitly documented as prototype-grade, not billing-grade, in our project report."*

---

### Q3: "Can this scale to many devices?"

> **Answer:** *"Yes, the architecture scales well. MQTT is designed for high-volume, many-client scenarios — Mosquitto can handle thousands of concurrent clients on modest hardware. Each device simply publishes to the same topic with its unique device ID in the payload — or to a device-specific sub-topic like 'resource/ESP32_DEVICE_002/readings'. The backend processes all messages from the topic and uses the device ID to associate readings with the correct device in the database. For large-scale deployments, we would upgrade from a single Mosquitto instance to a clustered broker like HiveMQ or EMQX, use a message queue like RabbitMQ or Apache Kafka between the broker and the backend to handle high throughput, and consider time-series databases like TimescaleDB (a PostgreSQL extension) or InfluxDB for efficient storage and querying of high-frequency sensor data."*

---

### Q4: "Is this AI-based anomaly detection?"

> **Answer:** *"In our current prototype, the anomaly detection is rule-based — not AI or machine learning. We use configurable threshold comparisons and duration-based rules, which are simple, transparent, and explainable. We made this choice deliberately — for a prototype, rule-based detection is easier to validate, debug, and explain. However, the architecture is designed so that an ML model can be plugged in at the anomaly detection layer. In future work, we could implement a statistical anomaly detection algorithm such as Isolation Forest, or a time-series model such as an LSTM autoencoder, trained on historical readings stored in our PostgreSQL database. The data pipeline to support this already exists."*

---

### Q5: "How is the data secured?"

> **Answer:** *"In this prototype, security is minimal — appropriate for a local network lab environment. MQTT is running without TLS and without authentication. For a production deployment, we would enable Mosquitto's TLS support with SSL certificates, require username and password authentication for all MQTT clients, use HTTPS for the REST API and dashboard, and implement JWT-based authentication for the backend API. The database would have strict access controls — the backend would connect with a least-privilege database user, not as the superuser. The ESP32 firmware would store credentials in NVS (Non-Volatile Storage) encrypted partition rather than hardcoded in source code. We document these security considerations and the steps to address them in our project report."*

---

### Q6: "What is the power consumption of the ESP32?"

> **Answer:** *"The ESP32 in active mode with Wi-Fi transmitting consumes approximately 160–260 milliamps at 3.3 volts — so roughly 0.5 to 0.85 watts. In our application, since the ESP32 needs to respond to sensor interrupts continuously, it runs in active mode. However, the ESP32 supports several low-power modes. In Light Sleep mode with Wi-Fi kept alive, consumption drops to around 2 milliamps. In Deep Sleep mode — where the ESP32 powers off almost everything except the RTC — it can consume as little as 10 microamps. For a battery-powered deployment, we could implement a wake-up timer — for example, wake every 60 seconds, take a reading, transmit, and go back to deep sleep. This would allow the system to run for weeks on a standard LiPo battery."*

---

### Q7: "How would you add user authentication?"

> **Answer:** *"We would implement JWT (JSON Web Token) based authentication on the backend. A user would log in via a POST request to an `/api/auth/login` endpoint, providing a username and password. The backend would verify the credentials against a Users table in PostgreSQL — passwords stored as bcrypt hashes, never in plaintext. On success, the server returns a signed JWT with an expiry time. All subsequent API requests and Socket.IO connections include this JWT in the Authorization header or as a query parameter. The backend middleware verifies the token on every request. The Next.js frontend would use NextAuth.js to handle the session and token refresh logic. Role-based access control could then be layered on top — for example, 'viewer' can only see data, 'admin' can configure thresholds."*

---

### Q8: "What is MQTT?"

> **Answer:** *"MQTT stands for Message Queuing Telemetry Transport. It is a lightweight publish-subscribe messaging protocol designed for constrained devices and low-bandwidth networks — which makes it ideal for IoT applications. In MQTT, a device called the broker sits at the centre. Clients — like our ESP32 and our Node.js backend — connect to the broker. The ESP32 publishes messages to a named channel called a topic. The backend subscribes to that topic. Every time the ESP32 publishes, the broker instantly forwards the message to all subscribers. MQTT is extremely efficient — a minimal publish packet can be as small as 2 bytes of header overhead — which is why it is widely used in IoT, from smart home devices to industrial sensors to satellite telemetry."*

---

### Q9: "Why not send data directly to the database from the ESP32?"

> **Answer:** *"There are several strong reasons not to do that. First, security — exposing a PostgreSQL database directly to the network requires opening port 5432 to the internet, which is a major security risk. A direct ESP32-to-database connection would bypass all validation and authentication layers. Second, capability — the ESP32 does not have a PostgreSQL client library, and its limited RAM and flash memory would make such a library impractical. It would need to form raw SQL queries as strings, which is error-prone and vulnerable to injection. Third, coupling — by placing an MQTT broker and backend between the sensor and the database, we decouple the data source from the storage layer. We can change the database, add caching, change the schema, or add a data processing step without modifying the ESP32 firmware at all. Fourth, scalability — the MQTT broker can queue messages if the backend is temporarily slow, preventing data loss under load."*

---

### Q10: "How does the real-time update work without page refresh?"

> **Answer:** *"The real-time updates are powered by Socket.IO, which is a library built on top of WebSockets. When the user opens the dashboard in their browser, the Next.js frontend establishes a persistent WebSocket connection to our Node.js backend. Unlike HTTP, a WebSocket connection stays open — allowing the server to push data to the browser at any time without the browser needing to ask. When the backend receives a new sensor reading from the MQTT broker, it emits a named event — for example, 'water:reading' — with the data payload to all connected clients via Socket.IO. In the React component on the dashboard, we register an event listener for 'water:reading'. When the event fires, it updates the React state, which triggers a re-render of just the affected component — not the entire page. This gives us sub-second latency from sensor to dashboard."*

---

## 6. Timing Guide

Use this table as a strict time budget during the demo. Assign one team member to quietly track time — they can give a subtle signal if the team is running long.

| Step | Description                                      | Speaker(s)          | Allocated Time | Cumulative Time |
|------|--------------------------------------------------|---------------------|----------------|-----------------|
| 1    | Introduction                                     | All                 | 30 sec         | 0:30            |
| 2    | Show Physical Hardware                           | Member 1            | 45 sec         | 1:15            |
| 3    | ESP32 Boot — Wi-Fi and MQTT Connection           | Member 1            | 30 sec         | 1:45            |
| 4    | Mosquitto Terminal — MQTT Messages               | Member 2            | 30 sec         | 2:15            |
| 5    | Backend Terminal — Processing Messages           | Member 2            | 30 sec         | 2:45            |
| 6    | PostgreSQL — Show Database Records               | Member 2            | 30 sec         | 3:15            |
| 7    | Dashboard — Current Readings Overview            | Member 3            | 30 sec         | 3:45            |
| 8    | Run Water Through Flow Sensor (Live)             | Member 1 + Member 3 | 45 sec         | 4:30            |
| 9    | Show Electricity Readings                        | Member 1 + Member 3 | 30 sec         | 5:00            |
| 10   | Trigger Water Flow Anomaly                       | Member 2 + Member 3 | 45 sec         | 5:45            |
| 11   | Trigger Electricity Anomaly (Optional)           | Member 2            | 30 sec         | 6:15            |
| 12   | ESP32 Offline Detection                          | Member 1 + Member 3 | 45 sec         | 7:00            |
| 13   | Summary and Thank You                            | All                 | 30 sec         | 7:30            |

> [!NOTE]
> **Step 11 (Electricity Anomaly) is optional.** If you are running short on time, skip it — you have already demonstrated anomaly detection in Step 10. If the demo is going smoothly and quickly, include it for completeness. Keep the total demo to **6–7 minutes maximum**, leaving time for evaluator questions.

### Time Management Tips

- **Do not read from notes or a script.** Evaluators react negatively to this. Know your speaking points well enough to say them naturally.
- **Avoid unnecessary filler words** ("umm", "so basically", "like"). Silence is better than filler.
- **If something takes longer than expected** (e.g., the heartbeat timeout in Step 12), use the waiting time productively — ask if evaluators have questions, briefly explain the database schema, or show a related feature.
- **Do not over-explain the code.** The evaluators can read code. Focus on demonstrating the working system and explaining the design decisions.
- **Practice the full demo at least twice end-to-end** — including the hardware — before the actual day. Time yourselves. It almost always runs longer in practice than it seems on paper.

---

## Appendix A: Quick Command Reference

The following commands should be memorised or kept in a sticky note for fast recovery on demo day.

### Start All Services (Windows PowerShell)

```powershell
# Terminal 1 — Mosquitto Broker (keep visible)
mosquitto -v -c "C:\Program Files\mosquitto\mosquitto.conf"

# Terminal 2 — Backend
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
npm run dev

# Terminal 3 — Frontend
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\frontend"
npm run dev

# Terminal 4 — Prisma Studio (optional, for DB demo)
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\backend"
npx prisma studio

# Terminal 5 — MQTT Subscriber (to show raw messages cleanly)
mosquitto_sub -h localhost -t "resource/readings" -v

# Terminal 6 — MQTT Simulator (backup)
cd "d:\Work\Smart IoT Based Water and Electricity Monitoring\scripts"
node simulate_mqtt.js --interval 3000
```

### Useful psql Queries

```sql
-- Show last 5 water readings
SELECT id, device_id, flow_rate, total_volume, timestamp
FROM water_readings
ORDER BY timestamp DESC
LIMIT 5;

-- Show last 5 electricity readings
SELECT id, device_id, voltage, current_ampere, power_watts, energy_kwh, timestamp
FROM electricity_readings
ORDER BY timestamp DESC
LIMIT 5;

-- Show all anomalies
SELECT id, resource_type, severity, description, actual_value, threshold_value, timestamp
FROM anomalies
ORDER BY timestamp DESC
LIMIT 10;

-- Show device status
SELECT device_id, status, last_heartbeat, updated_at
FROM devices;
```

### MQTT Simulator Scenarios

```bash
# Normal readings (continuous)
node simulate_mqtt.js --interval 3000

# Water flow anomaly (sustained high flow)
node simulate_mqtt.js --scenario water-anomaly

# Electricity anomaly (spike in power)
node simulate_mqtt.js --scenario electricity-anomaly

# Device offline simulation (stop publishing — backend will time out)
# Just kill the simulator process with Ctrl+C
```

---

## Appendix B: Role Summary

| Team Member | Primary Demo Role                                          | Sections Responsible For        |
|-------------|------------------------------------------------------------|---------------------------------|
| Member 1    | Hardware presenter — operates ESP32, pump, physical kit    | Steps 2, 3, 8, 9, 12           |
| Member 2    | Backend / data flow presenter — narrates MQTT, DB, anomaly | Steps 4, 5, 6, 10, 11          |
| Member 3    | Dashboard / frontend presenter — narrates UI updates       | Steps 7, 8, 9, 10, 12          |
| All         | Introduction and Summary                                   | Steps 1, 13                    |

> [!TIP]
> Each member should also be able to cover for another if someone freezes. Cross-train — make sure each member understands all sections well enough to explain them briefly if needed.

---

*End of DEMO_GUIDE.md*
