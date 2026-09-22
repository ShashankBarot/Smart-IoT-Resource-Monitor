# MQTT Protocol Documentation

**Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System  
**Document Version:** 1.0.0  
**Last Updated:** 2026-09-22  
**Status:** Binding API Contract — All team members must follow this document exactly.

---

## Table of Contents

1. [What is MQTT?](#1-what-is-mqtt)
2. [Why MQTT Instead of HTTP?](#2-why-mqtt-instead-of-http)
3. [Mosquitto Broker Setup](#3-mosquitto-broker-setup)
4. [MQTT Topics](#4-mqtt-topics)
5. [MQTT Payload Contract (THE API Contract)](#5-mqtt-payload-contract-the-api-contract)
   - [5.1 resource/readings Payload](#51-resourcereadings-payload)
   - [5.2 resource/status Payload](#52-resourcestatus-payload)
6. [QoS Levels](#6-qos-levels)
7. [MQTT Connection Parameters](#7-mqtt-connection-parameters)
8. [Publish Interval](#8-publish-interval)
9. [ESP32 MQTT Code Pattern](#9-esp32-mqtt-code-pattern)
10. [Backend MQTT Subscriber Pattern](#10-backend-mqtt-subscriber-pattern)
11. [MQTT Simulator for Development](#11-mqtt-simulator-for-development)
12. [Troubleshooting](#12-troubleshooting)
13. [MQTT Glossary](#13-mqtt-glossary)

---

## 1. What is MQTT?

**MQTT** (Message Queuing Telemetry Transport) is a lightweight, binary, publish-subscribe messaging protocol designed from the ground up for constrained devices and unreliable, low-bandwidth networks. It was originally developed by IBM in the late 1990s to monitor oil pipelines via satellite and has since become the de-facto standard for IoT communication.

### 1.1 Core Architecture: Publish-Subscribe

MQTT does **not** use a direct client-to-client communication model. Instead, it introduces a middleman called the **broker**:

```
 [ESP32 Sensor]  ---publish--->  [MQTT Broker]  ---deliver--->  [Backend Server]
                                  (Mosquitto)
                                      |
                                      +----------deliver--->  [Dashboard / Any Subscriber]
```

- **Publishers** send messages to the broker on a named channel called a **topic**.
- **Subscribers** tell the broker which topics they are interested in.
- The broker routes each published message to all matching subscribers.
- Publishers and subscribers never communicate directly — they remain fully decoupled.

This decoupling is fundamental to IoT systems: the sensor does not know (or care) how many dashboards are watching its data.

### 1.2 Transport Layer

MQTT runs over **TCP/IP**, which means it requires a reliable, ordered, connection-oriented transport. The default (unencrypted) port is **1883**. The TLS-encrypted variant uses port **8883**. In this project we use port **1883** on the local network (LAN), which is acceptable for a college prototype.

### 1.3 Topics

A **topic** is a UTF-8 string that acts as an address for messages. Topics are hierarchical, using the forward-slash (`/`) as a separator:

```
resource/readings
resource/status
home/floor1/room2/temperature
```

Subscribers can use **wildcards**:
- `+` — single-level wildcard (matches exactly one level): `resource/+` matches `resource/readings` and `resource/status`.
- `#` — multi-level wildcard (matches zero or more levels, must be the last character): `resource/#` matches everything under `resource/`.

In this project, topics are **fixed** and documented in [Section 4](#4-mqtt-topics). Wildcards are used only on the backend subscriber for convenience.

### 1.4 QoS Levels (Overview)

MQTT defines three Quality of Service levels that control delivery guarantees:

| QoS Level | Name | Guarantee |
|---|---|---|
| 0 | At most once | Fire and forget — no acknowledgement |
| 1 | At least once | Acknowledged — message may be duplicated |
| 2 | Exactly once | Full handshake — no duplication, highest overhead |

Full details are in [Section 6](#6-qos-levels).

### 1.5 Retained Messages

When a message is published with the **retained flag** set to `true`, the broker stores the **last retained message** for that topic. Any new subscriber who subscribes to that topic immediately receives the most recently retained message, even if it was published long before the subscriber connected. This is extremely useful for device status topics — a new dashboard connecting at any time can immediately know whether the ESP32 is online or offline.

### 1.6 The Broker: Mosquitto

This project uses **Eclipse Mosquitto** as the MQTT broker. Mosquitto is:
- Open-source (EPL/EDL licensed)
- Lightweight (runs comfortably on a Raspberry Pi or a laptop)
- Fully MQTT 3.1.1 and MQTT 5.0 compliant
- Available on Windows, Linux, macOS, and Docker
- The most widely used broker for college and prototype IoT projects

---

## 2. Why MQTT Instead of HTTP?

This is a common exam and viva question. The answer requires understanding the nature of sensor data and the constraints of embedded devices.

### 2.1 The Core Difference: Communication Model

| Dimension | HTTP | MQTT |
|---|---|---|
| **Model** | Request-Response (client must ask) | Publish-Subscribe (broker pushes to all subscribers) |
| **Connection** | Stateless — new TCP connection per request | Persistent — single long-lived TCP connection |
| **Direction** | Typically unidirectional (client → server per request) | Bidirectional over one connection |
| **Real-time data** | Requires polling (client repeatedly asks "any new data?") | Event-driven — message delivered instantly when published |
| **Header overhead** | 200–1200+ bytes per request/response | **2 bytes minimum** fixed header |
| **Protocol complexity** | Full HTTP headers, methods (GET/POST), status codes, content negotiation | Binary framing — minimal fields |
| **Server requirement** | Full HTTP/REST server required | Lightweight MQTT broker |
| **Authentication** | TLS + JWT/OAuth (complex) | Username/password or TLS certificate |
| **Duplicate detection** | Application-layer responsibility | Built-in with QoS 2 |
| **Last Will / offline detection** | Not natively supported — requires heartbeat polling | Built-in LWT mechanism |
| **Retained messages** | Not supported natively | First-class feature |
| **Fan-out (1 publisher → N consumers)** | Requires separate HTTP calls or WebSockets | Native — broker delivers to all subscribers automatically |

### 2.2 Why Polling (HTTP) Fails for IoT Sensor Data

Imagine an HTTP-based approach: the backend sends a GET request to the ESP32's HTTP server every 5 seconds.

**Problems:**
1. **The ESP32 must run an HTTP server** — this consumes significant RAM and flash. The ESP32 has only 320 KB of usable RAM; a full HTTP server stack with JSON parsing can consume 40–80 KB.
2. **The server must know the ESP32's IP address** — this changes on reconnection. DHCP makes it unstable. MQTT inverts this: the ESP32 knows the broker's fixed IP.
3. **Polling wastes bandwidth** — if the sensor hasn't changed, the poll returns empty data. You're transmitting headers (hundreds of bytes) to get no useful payload.
4. **Polling introduces latency** — if you poll every 5 seconds, your average latency is 2.5 seconds. Events happening between polls are delayed.
5. **Polling does not scale** — with 10 devices, the backend makes 10 × (3600/5) = 7,200 HTTP requests per hour, regardless of whether anything changed.

### 2.3 Why MQTT is Right for ESP32

The ESP32 microcontroller has specific constraints that make MQTT the ideal fit:

| Constraint | HTTP Impact | MQTT Solution |
|---|---|---|
| **Limited RAM (~320 KB usable)** | HTTP + TLS stack consumes 40–80 KB | MQTT client (PubSubClient) uses ~5–10 KB |
| **Wi-Fi reconnects** (ESP32 Wi-Fi stack drops connection under load) | Each reconnect loses server session; pending POSTs are dropped | MQTT QoS 1 + clean session = broker retries delivery |
| **CPU is single-core (240 MHz)** | Full HTTP parsing (headers, chunked encoding) is CPU-intensive | Binary MQTT frames are trivially parsed |
| **Publish frequency** | Each HTTP POST = TCP setup → TLS handshake → headers → body → response → teardown | Single persistent connection — publish is just sending a few bytes |
| **Battery-powered variants** | HTTP's TCP setup overhead wastes power on every reading | MQTT's persistent connection + `PINGREQ`/`PINGRESP` keep-alive is minimal |
| **Multiple consumers** | Each consumer requires a separate HTTP endpoint or pull | All consumers subscribe to the same topic — zero extra code on ESP32 |

### 2.4 Summary Verdict

> For a system publishing sensor readings every 5–30 seconds over a local network to multiple consumers (backend, dashboard, logging service), MQTT is unambiguously superior to HTTP polling. HTTP would be appropriate only for a REST configuration API or for sending commands to the device from an external system — which is a different use case entirely.

---

## 3. Mosquitto Broker Setup

The MQTT broker must be running before the ESP32, simulator, or backend can communicate. Follow the instructions for your platform.

### 3.1 Windows Installation

#### Step 1 — Download Mosquitto

1. Navigate to **[https://mosquitto.org/download/](https://mosquitto.org/download/)**.
2. Under the **Windows** section, download the latest **64-bit installer** (e.g., `mosquitto-2.0.x-install-windows-x64.exe`).
3. Run the installer. Accept defaults. Default installation path: `C:\Program Files\mosquitto\`.

> [!NOTE]
> The installer may prompt you to also install **OpenSSL** and **pthreads** as dependencies. Accept these — they are required for Mosquitto to run correctly.

#### Step 2 — Create the Configuration File

Mosquitto requires a configuration file to allow connections. By default, Mosquitto 2.x **does not allow anonymous connections** without explicit configuration.

Create the file `C:\Program Files\mosquitto\mosquitto.conf` with the following content (or edit the existing one):

```conf
# mosquitto.conf
# Minimal configuration for local development

# Listen on the default MQTT port on all interfaces
listener 1883

# Allow connections without a username/password
# WARNING: Only use this on a trusted local network
allow_anonymous true

# Uncomment to enable verbose logging (useful for debugging)
# log_type all
```

> [!WARNING]
> `allow_anonymous true` is acceptable **only** for local development and college demonstrations. In a production deployment, configure username/password authentication or TLS client certificates.

#### Step 3 — Start Mosquitto

Open **PowerShell** or **Command Prompt** as Administrator and run:

```powershell
# Navigate to the Mosquitto installation directory
cd "C:\Program Files\mosquitto"

# Start Mosquitto with the config file and verbose output
.\mosquitto.exe -c mosquitto.conf -v
```

Expected output (verbose mode):

```
1758312000: mosquitto version 2.0.18 starting
1758312000: Config loaded from mosquitto.conf.
1758312000: Opening ipv4 listen socket on port 1883.
1758312000: Opening ipv6 listen socket on port 1883.
1758312000: mosquitto version 2.0.18 running
```

Leave this terminal window open. Mosquitto runs in the foreground when using `-v`.

#### Step 4 — Test with mosquitto_pub and mosquitto_sub

Open **two additional terminals** (do not close the Mosquitto terminal).

**Terminal A — Subscribe to a test topic:**

```powershell
cd "C:\Program Files\mosquitto"
.\mosquitto_sub.exe -h localhost -p 1883 -t "test/hello" -v
```

The `-v` flag prints both the topic and the message payload.

**Terminal B — Publish a test message:**

```powershell
cd "C:\Program Files\mosquitto"
.\mosquitto_pub.exe -h localhost -p 1883 -t "test/hello" -m "Hello from Mosquitto!"
```

**Expected output in Terminal A:**

```
test/hello Hello from Mosquitto!
```

If you see this, Mosquitto is working correctly.

#### Step 5 — Test the Project Topics

Subscribe to the actual project topics to verify end-to-end before connecting the ESP32:

```powershell
# Subscribe to all resource topics using wildcard
.\mosquitto_sub.exe -h localhost -p 1883 -t "resource/#" -v
```

#### Step 6 — (Optional) Run Mosquitto as a Windows Service

To have Mosquitto start automatically with Windows:

```powershell
# Run as Administrator
cd "C:\Program Files\mosquitto"
.\mosquitto.exe install
net start mosquitto
```

To stop the service:

```powershell
net stop mosquitto
```

### 3.2 Docker Setup

If you prefer Docker (recommended for a consistent team environment), add the following service to your `docker-compose.yml`:

```yaml
version: "3.9"

services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: iot-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"     # WebSocket port (for browser-based MQTT clients)
    volumes:
      - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
```

Create `./mosquitto/config/mosquitto.conf`:

```conf
listener 1883
allow_anonymous true

# WebSocket support (optional — useful for browser dashboards)
listener 9001
protocol websockets
allow_anonymous true

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_type all
```

Start the broker:

```bash
docker compose up -d mosquitto
```

Verify it is running:

```bash
docker logs iot-mosquitto
```

### 3.3 Firewall Configuration (Windows)

If the ESP32 cannot reach the broker on the laptop/PC, the Windows Firewall may be blocking port 1883. Run in PowerShell as Administrator:

```powershell
New-NetFirewallRule -DisplayName "Mosquitto MQTT" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow
```

Verify that all devices (laptop and ESP32) are on the **same Wi-Fi network / LAN**.

---

## 4. MQTT Topics

This section is the definitive reference for all MQTT topics used in the project. Do not create or use any topics not listed here without updating this document and notifying the team.

### 4.1 Topic List

| Topic | Publisher | Subscriber(s) | QoS | Retained | Publish Interval | Purpose |
|---|---|---|---|---|---|---|
| `resource/readings` | ESP32 Sensor Node *or* MQTT Simulator | Backend API, Dashboard | 1 | No | Every 5–30 seconds | Sensor readings payload (water flow + electricity metrics) |
| `resource/status` | ESP32 Sensor Node *or* LWT broker | Backend API, Dashboard | 1 | **Yes** | On connect, on disconnect | Device heartbeat / online-offline status |

### 4.2 Topic Design Rationale

**Why `resource/` as prefix?**  
In a multi-device deployment, the prefix would be the device ID (e.g., `esp32-01/readings`). For this single-device prototype, `resource/` is used as a logical namespace that groups all device-related topics and allows the backend to subscribe with the wildcard `resource/#`.

**Why is `resource/readings` NOT retained?**  
Sensor readings are time-sensitive. A retained reading published 10 minutes ago is stale and misleading. We never retain readings — each message is valid only at the instant it was produced.

**Why is `resource/status` retained?**  
A retained status message allows any subscriber (e.g., the dashboard) that connects *after* the ESP32 has already announced its online status to immediately know the current state without waiting for the next periodic status publish.

---

## 5. MQTT Payload Contract (THE API Contract)

> [!IMPORTANT]
> This section is the **binding API contract** for the entire project. Every team member — hardware, backend, and frontend — must use the **exact field names, exact types, and exact topic strings** documented here. Any deviation will cause silent failures (JSON parse errors, undefined fields in the database, broken dashboard displays). If a field needs to change, update this document and inform the entire team before changing any code.

All payloads are **UTF-8 encoded JSON strings**. The maximum payload size is 256 KB (Mosquitto default), but realistic payloads in this system are under 300 bytes.

---

### 5.1 `resource/readings` Payload

This is the primary data payload. It is published by the ESP32 (or the simulator) at regular intervals and consumed by the backend to persist to MongoDB.

#### Example Payload

```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:00:00.000Z",
  "water": {
    "flowRateLpm": 2.15,
    "totalLitres": 5.72
  },
  "electricity": {
    "voltage": 230.2,
    "current": 0.82,
    "power": 187.4,
    "energyKwh": 0.014
  }
}
```

#### Field Reference Table

| Field | Type | Unit | Normal Range | Required | Set By | Description |
|---|---|---|---|---|---|---|
| `deviceId` | `string` | — | `"esp32-01"` | **Yes** | ESP32 firmware / Simulator config | Unique identifier for the publishing device. Used by the backend to associate readings with a specific node. Must match the device ID configured in the backend. |
| `timestamp` | `string` | — | ISO 8601 UTC | **Yes** | ESP32 (via NTP) / Simulator | ISO 8601 timestamp in UTC with millisecond precision. **Always UTC.** The ESP32 must sync time via NTP before publishing. The backend stores this as the authoritative event time, not the server-receive time. |
| `water` | `object` | — | — | **Yes** | ESP32 / Simulator | Container object for all water meter sensor data. |
| `water.flowRateLpm` | `number` (float) | Litres per minute (L/min) | `0.0` – `30.0` | **Yes** | Calculated by ESP32 from YF-S201 pulse count | Instantaneous water flow rate at the moment of reading. A value of `0.0` indicates no water flowing. Values above `30.0` should be treated as sensor errors. |
| `water.totalLitres` | `number` (float) | Litres (L) | `0.0` – `99999.9` | **Yes** | Accumulated on ESP32; resets on device restart | Cumulative total litres measured since the last device boot. **Note:** This is a session total, not a global total. The backend accumulates the true running total in the database. |
| `electricity` | `object` | — | — | **Yes** | ESP32 / Simulator | Container object for all electricity meter sensor data. |
| `electricity.voltage` | `number` (float) | Volts (V) | `210.0` – `250.0` | **Yes** | Measured by ZMPT101B voltage sensor | RMS mains voltage. Normal Indian household supply is 220–240 V. Values outside 200–260 V indicate a sensor calibration issue or genuine power quality problem. |
| `electricity.current` | `number` (float) | Amperes (A) | `0.0` – `15.0` | **Yes** | Measured by ACS712 current sensor | RMS load current. A value of `0.0` indicates no load. The ACS712-20A variant has a maximum of 20 A. |
| `electricity.power` | `number` (float) | Watts (W) | `0.0` – `3450.0` | **Yes** | Calculated: `voltage × current` (approximate apparent power) | Instantaneous power consumption. Calculated on the ESP32 as `voltage × current`. For a purely resistive load this equals real power; for reactive loads it is apparent power. For this prototype, we do not measure power factor. |
| `electricity.energyKwh` | `number` (float) | Kilowatt-hours (kWh) | `0.0` – `999.99` | **Yes** | Accumulated on ESP32: `(power × intervalSec) / 3,600,000` | Cumulative energy consumed since the last device boot, in kilowatt-hours. Like `totalLitres`, this is a session accumulator. The backend maintains the true running total. |

#### Behaviour When a Field is Missing

The backend must apply the following rules when a field is absent or `null`:

| Scenario | Backend Action |
|---|---|
| `deviceId` missing | **Reject the message.** Log an error. Do not persist to DB. |
| `timestamp` missing | **Use server receive time** as a fallback. Log a warning. |
| `water` object missing | Persist the record with `null` for all water fields. Alert via logs. |
| `electricity` object missing | Persist the record with `null` for all electricity fields. Alert via logs. |
| Any individual numeric field missing (e.g. `water.flowRateLpm`) | Persist the record with `null` for that field. Dashboard must handle `null` gracefully (display `"N/A"`). |

---

### 5.2 `resource/status` Payload

This payload is published by the ESP32 when it connects (status: `"online"`) and automatically by the broker's Last Will and Testament mechanism when the device disconnects unexpectedly (status: `"offline"`). See [Section 7.2](#72-last-will-and-testament-lwt) for LWT configuration.

#### Example Payload — Online

```json
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T14:00:00.000Z",
  "status": "online",
  "uptime": 3600,
  "rssi": -65,
  "freeHeap": 180000
}
```

#### Example Payload — Offline (LWT / Broker-generated)

```json
{
  "deviceId": "esp32-01",
  "status": "offline"
}
```

> [!NOTE]
> The offline payload is **minimal by design** — it is pre-registered as the LWT message during connection setup (before the device knows the timestamp or heap status). The backend must handle the absence of `timestamp`, `uptime`, `rssi`, and `freeHeap` gracefully when `status` is `"offline"`.

#### Field Reference Table

| Field | Type | Unit | Normal Range | Required | Set By | Description |
|---|---|---|---|---|---|---|
| `deviceId` | `string` | — | `"esp32-01"` | **Yes** | ESP32 firmware | Unique device identifier. Must match the `deviceId` in `resource/readings`. |
| `timestamp` | `string` | — | ISO 8601 UTC | Yes (online only) | ESP32 (via NTP) | Timestamp of the status event. Not present in LWT (offline) messages. |
| `status` | `string` | — | `"online"` or `"offline"` | **Yes** | ESP32 (online) / Broker LWT (offline) | Current operational status of the device. Only these two values are valid. The backend should update a device status collection in MongoDB on every status message. |
| `uptime` | `number` (integer) | Seconds | `0` – `2,147,483,647` | Yes (online only) | ESP32 (`millis() / 1000`) | Number of seconds since the ESP32 last booted. Useful for detecting unexpected reboots. Not present in LWT messages. |
| `rssi` | `number` (integer) | dBm (decibels relative to 1 milliwatt) | `-30` (excellent) to `-90` (poor) | Yes (online only) | ESP32 (`WiFi.RSSI()`) | Wi-Fi received signal strength indicator. Indicates the quality of the ESP32's Wi-Fi connection. Values more negative than `-80` dBm indicate a weak connection prone to dropouts. Not present in LWT messages. |
| `freeHeap` | `number` (integer) | Bytes | `100,000` – `270,000` | Yes (online only) | ESP32 (`ESP.getFreeHeap()`) | Free heap memory on the ESP32 in bytes. Useful for detecting memory leaks. If this value decreases significantly over time without recovering, the firmware has a memory leak. Not present in LWT messages. |

---

## 6. QoS Levels

### 6.1 QoS 0 — At Most Once (Fire and Forget)

```
Publisher ──[PUBLISH]──► Broker ──[PUBLISH]──► Subscriber
           (no ACK)                 (no ACK)
```

- The publisher sends the message once and forgets it.
- The broker makes no attempt to confirm delivery to subscribers.
- If the network drops the packet, the message is **permanently lost**.
- **Overhead:** Minimum. No retransmission bookkeeping.
- **Use case:** High-frequency telemetry where occasional loss is acceptable (e.g., a temperature reading every second — losing one sample is not critical).
- **Not used in this project** for primary data because we want reliable delivery of readings.

### 6.2 QoS 1 — At Least Once (Acknowledged)

```
Publisher ──[PUBLISH]──► Broker                    ──[PUBACK]──► Publisher
                           │
                           └──[PUBLISH]──► Subscriber ──[PUBACK]──► Broker
```

- The publisher sends the message and **waits for a PUBACK** (Publish Acknowledgement) from the broker.
- If the PUBACK does not arrive within a timeout, the publisher **retransmits** (with the `DUP` flag set).
- The subscriber similarly acknowledges receipt.
- A message **may be received more than once** if the PUBACK is lost in transit (the publisher retransmits). The subscriber/backend must be idempotent or deduplicate if necessary.
- **Overhead:** One ACK round-trip per message.
- **Used in this project** for `resource/readings` and `resource/status`.

### 6.3 QoS 2 — Exactly Once (Four-Way Handshake)

```
Publisher ──[PUBLISH]──► Broker ──[PUBREC]──► Publisher ──[PUBREL]──► Broker ──[PUBCOMP]──► Publisher
                           (and separately delivers to subscriber with its own handshake)
```

- Full four-way handshake guarantees **exactly one delivery** — no loss, no duplicates.
- Highest network overhead and latency.
- The broker must store message state across the handshake, consuming memory.
- **Not used in this project.** For sensor readings, occasional duplicates are far less problematic than the complexity and overhead of QoS 2. The backend can deduplicate by timestamp + deviceId if needed.

### 6.4 Why This Project Uses QoS 1

| Requirement | QoS 0 | QoS 1 | QoS 2 |
|---|---|---|---|
| Reliable delivery of readings | ✗ | ✓ | ✓ |
| Works with ESP32's limited RAM | ✓ | ✓ | ✗ (state overhead) |
| Acceptable latency for 5–30 s publish intervals | ✓ | ✓ | ✓ |
| Backend can tolerate occasional duplicates | N/A | ✓ | N/A |
| Simple firmware implementation | ✓ | ✓ | ✗ |

**Conclusion:** QoS 1 gives us the reliability guarantee (readings are not silently dropped) with manageable overhead and no firmware complexity. The backend simply checks for and ignores duplicate timestamps if they arrive.

---

## 7. MQTT Connection Parameters

### 7.1 Connection Settings

All MQTT clients (ESP32, backend, simulator) must connect to the broker using these parameters:

| Parameter | Value | Notes |
|---|---|---|
| **Broker Host** | `192.168.x.x` (your laptop's LAN IP) | Find with `ipconfig` on Windows. Must be reachable from ESP32 on the same subnet. |
| **Broker Port** | `1883` | Standard unencrypted MQTT port. |
| **Protocol** | MQTT 3.1.1 | Used by PubSubClient (Arduino) and most Node.js MQTT libraries. |
| **Keep-Alive Interval** | `60` seconds | The client sends a PINGREQ to the broker every 60 seconds if no other messages are sent. If the broker doesn't receive a PINGREQ within 1.5 × 60 = 90 seconds, it considers the client dead and fires the LWT. |
| **Clean Session** | `true` | The broker does not store subscription state between sessions. The client re-subscribes on every reconnect. Appropriate for this project since the backend always re-subscribes on startup. |
| **Username** | (none) | `allow_anonymous true` in Mosquitto config. |
| **Password** | (none) | `allow_anonymous true` in Mosquitto config. |

#### Client IDs

Client IDs must be **unique** across all connected clients. Using a duplicate client ID causes the existing client to be disconnected.

| Client | Client ID | Notes |
|---|---|---|
| ESP32 Sensor Node | `esp32-sensor-01` | Hard-coded in firmware. |
| Backend MQTT Subscriber | `backend-subscriber-01` | Set in `mqtt-client.ts` or equivalent. |
| MQTT Simulator | `simulator-01` | Set in `mqtt-simulator.ts`. |
| Mosquitto CLI (`mosquitto_sub`) | Auto-generated or specify with `-i` flag | For manual testing only. |

### 7.2 Last Will and Testament (LWT)

The **Last Will and Testament** (LWT) is a message pre-registered with the broker at connection time. If the broker detects that the client has disconnected **abnormally** (i.e., without sending an MQTT `DISCONNECT` packet — for example, due to a power cut, Wi-Fi dropout, or crash), the broker automatically publishes the LWT message on behalf of the dead client.

This is critical for the dashboard to display an accurate "Device Offline" indicator without requiring the ESP32 to explicitly notify anyone when it loses power.

**How it works:**

```
1. ESP32 connects to broker.
2. ESP32 registers its LWT: "If I die silently, publish this to resource/status".
3. ESP32 goes about its business, publishing readings every 5–30 seconds.
4. Power cuts to ESP32. No DISCONNECT packet is sent.
5. Broker notices keep-alive timeout (90 seconds with 60s keep-alive).
6. Broker publishes the LWT message to resource/status.
7. Backend receives the offline status. Dashboard shows "Device Offline".
```

**LWT Configuration Parameters:**

| Parameter | Value |
|---|---|
| **LWT Topic** | `resource/status` |
| **LWT Payload** | `{"deviceId": "esp32-01", "status": "offline"}` |
| **LWT QoS** | `1` |
| **LWT Retained** | `true` |

Because the LWT is published with `retained: true`, any dashboard that connects to the broker after the device has gone offline will immediately receive the `"offline"` status message — no polling required.

**Arduino / PubSubClient LWT setup:**

```cpp
// Set the LWT BEFORE calling mqttClient.connect()
// Parameters: topic, payload, qos, retained
mqttClient.setWill(
  "resource/status",
  "{\"deviceId\":\"esp32-01\",\"status\":\"offline\"}",
  true,   // retained
  1       // QoS 1
);

// Then connect
mqttClient.connect("esp32-sensor-01");
```

---

## 8. Publish Interval

### 8.1 Recommended Intervals

| Environment | Publish Interval | Notes |
|---|---|---|
| **Active Development** | Every **5 seconds** | Fast feedback loop. Easy to see data flowing. Higher DB write rate — acceptable for short dev sessions. |
| **College Demo / Viva** | Every **10 seconds** | Balance between visible real-time updates and stable system load. |
| **Long-Running Demo / Showcase** | Every **30 seconds** | Sustainable for hours. Database does not fill up quickly. |

### 8.2 Why Not Publish Faster?

**Do not publish more frequently than every 5 seconds** unless you have a specific justification:

1. **Database write rate:** MongoDB can handle high write throughput, but each document insertion has overhead. At 1-second intervals, you're creating 86,400 documents per sensor per day. At 10-second intervals: 8,640. The latter is far easier to query and visualise.
2. **Network load:** Each MQTT publish, including the TCP ACK for QoS 1, generates ~200–400 bytes of traffic. At 1-second intervals on a home Wi-Fi network shared by the team, this is negligible — but it is unnecessary.
3. **ESP32 sensor sampling:** The YF-S201 flow sensor measures pulses over an interval. A very short interval (< 1 second) gives a less accurate flow rate calculation because there are fewer pulses to count. A 5–10 second window gives a more stable reading.
4. **Dashboard rendering:** A React/Angular dashboard re-renders on each new data point. Re-rendering faster than every 3–5 seconds provides no perceptible user experience improvement.

### 8.3 Why Not Publish Slower?

**Do not publish less frequently than every 60 seconds for a demo:**

1. **Dashboard responsiveness:** If a viva examiner asks "what happens if I turn on the tap?" — they expect to see the flow rate change within a few seconds, not minutes.
2. **Keep-alive detection:** With a 60-second keep-alive, the broker already sends periodic PINGs. If you publish every 120 seconds, there may be long periods where no data is flowing and the dashboard appears frozen.
3. **Anomaly detection latency:** If the system is meant to alert on high consumption, a slow publish rate means alerts are delayed.

### 8.4 Configuring the Interval

In the ESP32 firmware, the interval is controlled by a constant:

```cpp
const unsigned long PUBLISH_INTERVAL_MS = 10000; // 10 seconds
```

In the simulator (`mqtt-simulator.ts`), the interval is controlled by:

```typescript
const PUBLISH_INTERVAL_MS = 10000; // 10 seconds
```

Change it in one place before a demo. Do not hard-code different values in different files.

---

## 9. ESP32 MQTT Code Pattern

This section documents the standard MQTT connection and publish pattern for the ESP32 firmware. The library used is **PubSubClient** by Nick O'Leary (available in Arduino Library Manager).

### 9.1 Required Libraries

```cpp
#include <WiFi.h>           // ESP32 Wi-Fi (built-in)
#include <PubSubClient.h>   // MQTT client (install via Arduino Library Manager)
#include <ArduinoJson.h>    // JSON serialization (install via Arduino Library Manager)
```

### 9.2 Full ESP32 MQTT Sketch Outline

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ─── Configuration ───────────────────────────────────────────────────────────
const char* WIFI_SSID        = "YourWiFiSSID";
const char* WIFI_PASSWORD    = "YourWiFiPassword";
const char* MQTT_BROKER_IP   = "192.168.1.100";  // Your laptop's IP on LAN
const int   MQTT_PORT        = 1883;
const char* MQTT_CLIENT_ID   = "esp32-sensor-01";
const char* DEVICE_ID        = "esp32-01";
const char* TOPIC_READINGS   = "resource/readings";
const char* TOPIC_STATUS     = "resource/status";
const unsigned long PUBLISH_INTERVAL_MS = 10000;  // 10 seconds

// ─── LWT Payload ─────────────────────────────────────────────────────────────
const char* LWT_PAYLOAD = "{\"deviceId\":\"esp32-01\",\"status\":\"offline\"}";

// ─── MQTT Client ─────────────────────────────────────────────────────────────
WiFiClient   espWifiClient;
PubSubClient mqttClient(espWifiClient);

unsigned long lastPublishMs = 0;
float sessionTotalLitres    = 0.0f;
float sessionEnergyKwh      = 0.0f;

// ─── Wi-Fi Connection ─────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("[WiFi] Connected. IP: ");
  Serial.println(WiFi.localIP());
}

// ─── MQTT Reconnect ───────────────────────────────────────────────────────────
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection...");

    // Set the Last Will and Testament BEFORE calling connect()
    // Parameters: topic, payload, qos, retained
    mqttClient.setWill(TOPIC_STATUS, LWT_PAYLOAD, true, 1);

    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("connected.");

      // Publish online status immediately after connecting
      String onlinePayload = buildStatusPayload("online");
      mqttClient.publish(TOPIC_STATUS, onlinePayload.c_str(), true); // retained

      Serial.println("[MQTT] Published online status.");
    } else {
      Serial.print("failed. rc=");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ─── Payload Builders ─────────────────────────────────────────────────────────
String buildStatusPayload(const char* status) {
  StaticJsonDocument<200> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();   // Implement using NTP/time.h
  doc["status"]    = status;
  doc["uptime"]    = (unsigned long)(millis() / 1000);
  doc["rssi"]      = WiFi.RSSI();
  doc["freeHeap"]  = (int)ESP.getFreeHeap();

  String output;
  serializeJson(doc, output);
  return output;
}

String buildReadingsPayload(float flowRateLpm, float totalLitres,
                            float voltage, float current,
                            float power, float energyKwh) {
  StaticJsonDocument<384> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();  // Implement using NTP/time.h

  JsonObject water = doc.createNestedObject("water");
  water["flowRateLpm"] = serialized(String(flowRateLpm, 2));
  water["totalLitres"] = serialized(String(totalLitres, 2));

  JsonObject electricity = doc.createNestedObject("electricity");
  electricity["voltage"]   = serialized(String(voltage, 1));
  electricity["current"]   = serialized(String(current, 2));
  electricity["power"]     = serialized(String(power, 1));
  electricity["energyKwh"] = serialized(String(energyKwh, 3));

  String output;
  serializeJson(doc, output);
  return output;
}

// ─── Sensor Reading (Replace with real sensor reads) ─────────────────────────
void readSensorsAndPublish() {
  // TODO: Replace with actual ADC reads from YF-S201 and ACS712/ZMPT101B
  float flowRateLpm = readWaterFlowRate();
  float voltage     = readVoltage();
  float current     = readCurrent();
  float power       = voltage * current;

  // Accumulate session totals
  float intervalSec = PUBLISH_INTERVAL_MS / 1000.0f;
  sessionTotalLitres += flowRateLpm * (intervalSec / 60.0f);
  sessionEnergyKwh   += (power * intervalSec) / 3600000.0f;

  String payload = buildReadingsPayload(
    flowRateLpm, sessionTotalLitres,
    voltage, current, power, sessionEnergyKwh
  );

  Serial.print("[MQTT] Publishing to ");
  Serial.print(TOPIC_READINGS);
  Serial.print(": ");
  Serial.println(payload);

  // QoS 1 — PubSubClient's publish does QoS 0 by default.
  // For QoS 1, use the overloaded publish with retained=false:
  mqttClient.publish(TOPIC_READINGS, payload.c_str(), false);
}

// ─── Arduino Entry Points ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  connectWiFi();

  mqttClient.setServer(MQTT_BROKER_IP, MQTT_PORT);
  mqttClient.setKeepAlive(60);         // 60-second keep-alive
  mqttClient.setBufferSize(512);       // Increase buffer for larger payloads

  reconnectMQTT();
}

void loop() {
  // Ensure Wi-Fi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected. Reconnecting...");
    connectWiFi();
  }

  // Ensure MQTT is still connected
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }

  // CRITICAL: Call loop() on every iteration to process incoming messages
  // and maintain the keep-alive heartbeat.
  mqttClient.loop();

  // Publish at the configured interval (non-blocking, uses millis())
  unsigned long now = millis();
  if (now - lastPublishMs >= PUBLISH_INTERVAL_MS) {
    lastPublishMs = now;
    readSensorsAndPublish();
  }
}
```

### 9.3 Key Points for the ESP32 Pattern

1. **`mqttClient.setWill()` must be called before `mqttClient.connect()`** — the LWT is registered during the CONNECT handshake. Calling it after does nothing.
2. **`mqttClient.loop()` must be called on every `loop()` iteration** — it processes incoming messages and sends keep-alive PINGREQs. Blocking `delay()` calls in `loop()` will cause the keep-alive to miss its deadline, triggering the LWT unnecessarily. Always use non-blocking timing with `millis()`.
3. **`setBufferSize(512)`** — the default PubSubClient buffer is 256 bytes. Our JSON payload is ~250 bytes. Increase it to 512 to avoid silent truncation.
4. **NTP time sync** — the ESP32 does not have a real-time clock. Use the `time.h` library with `configTime()` and an NTP server (`pool.ntp.org`) to get accurate UTC timestamps before publishing the first message.

---

## 10. Backend MQTT Subscriber Pattern

The backend Node.js/TypeScript service subscribes to MQTT topics, validates the incoming payload, and persists readings to MongoDB.

### 10.1 MQTT.js Library

Install the MQTT.js library:

```bash
npm install mqtt
npm install --save-dev @types/mqtt   # if using TypeScript
```

### 10.2 TypeScript MQTT Subscriber

```typescript
import mqtt, { MqttClient } from 'mqtt';

const BROKER_URL      = 'mqtt://localhost:1883';
const CLIENT_ID       = 'backend-subscriber-01';
const TOPIC_READINGS  = 'resource/readings';
const TOPIC_STATUS    = 'resource/status';

// ─── Connect to Broker ────────────────────────────────────────────────────────
const client: MqttClient = mqtt.connect(BROKER_URL, {
  clientId:      CLIENT_ID,
  clean:         true,         // Clean session — re-subscribe on each connect
  keepalive:     60,           // 60-second keep-alive interval
  reconnectPeriod: 3000,       // Retry connection every 3 seconds on failure
  connectTimeout: 10000,       // Wait up to 10 seconds for initial connection
});

// ─── Connection Events ────────────────────────────────────────────────────────
client.on('connect', () => {
  console.log(`[MQTT] Connected to broker at ${BROKER_URL}`);

  // Subscribe to all resource topics using a wildcard
  client.subscribe('resource/#', { qos: 1 }, (err, granted) => {
    if (err) {
      console.error('[MQTT] Subscription error:', err.message);
      return;
    }
    granted.forEach(g => {
      console.log(`[MQTT] Subscribed to '${g.topic}' at QoS ${g.qos}`);
    });
  });
});

client.on('reconnect', () => {
  console.warn('[MQTT] Connection lost. Reconnecting...');
});

client.on('error', (err: Error) => {
  console.error('[MQTT] Client error:', err.message);
});

client.on('offline', () => {
  console.warn('[MQTT] Client is offline (broker unreachable).');
});

// ─── Message Handler ──────────────────────────────────────────────────────────
client.on('message', (topic: string, messageBuffer: Buffer) => {
  const raw = messageBuffer.toString('utf8');
  console.log(`[MQTT] Received on '${topic}': ${raw}`);

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(raw);
  } catch (parseError) {
    console.error(`[MQTT] Failed to parse JSON on topic '${topic}':`, raw);
    return;
  }

  switch (topic) {
    case TOPIC_READINGS:
      handleReadings(payload);
      break;
    case TOPIC_STATUS:
      handleStatus(payload);
      break;
    default:
      console.warn(`[MQTT] Received message on unexpected topic: ${topic}`);
  }
});

// ─── Handler: Sensor Readings ─────────────────────────────────────────────────
async function handleReadings(payload: Record<string, unknown>): Promise<void> {
  // Validate required fields
  if (!payload.deviceId) {
    console.error('[Readings] Missing deviceId — discarding message.');
    return;
  }

  // TODO: Insert into MongoDB using Mongoose / native driver
  // await ReadingModel.create(payload);
  console.log('[Readings] Persisted reading for device:', payload.deviceId);
}

// ─── Handler: Device Status ───────────────────────────────────────────────────
async function handleStatus(payload: Record<string, unknown>): Promise<void> {
  if (!payload.deviceId || !payload.status) {
    console.error('[Status] Invalid status payload — discarding.');
    return;
  }

  // TODO: Update device status in MongoDB
  // await DeviceModel.findOneAndUpdate({ deviceId: payload.deviceId }, { status: payload.status, lastSeen: new Date() }, { upsert: true });
  console.log(`[Status] Device '${payload.deviceId}' is now '${payload.status}'.`);
}
```

### 10.3 Key Points for the Backend Pattern

1. **Always specify `{ qos: 1 }` in `client.subscribe()`** — the subscription QoS determines the maximum QoS the broker will use when delivering messages to this subscriber. If you subscribe at QoS 0, you will receive messages at QoS 0 even if they were published at QoS 1.
2. **Use `messageBuffer.toString('utf8')`** — the `message` event delivers a `Buffer`, not a string. Always decode explicitly.
3. **Wrap `JSON.parse()` in try-catch** — a malformed payload (e.g., from a misbehaving client or a truncated message) will throw and crash your handler if not caught.
4. **Use `reconnectPeriod: 3000`** — MQTT.js will automatically reconnect and re-subscribe. Your handler code does not need to manage reconnection manually.
5. **`resource/#` wildcard subscription** — subscribing with a wildcard is convenient for the backend. However, always switch on the `topic` argument in the message handler so readings and status are processed by different functions.

---

## 11. MQTT Simulator for Development

### 11.1 Purpose

The MQTT simulator (`mqtt-simulator.ts`) is a Node.js script that **impersonates an ESP32 sensor node**. It publishes realistic, randomly generated sensor readings to the same MQTT topics the real ESP32 uses.

**Why it exists:**
- Hardware development (soldering, sensor calibration, firmware debugging) often takes longer than backend or frontend development.
- The simulator allows the backend and dashboard developers to work independently without waiting for the physical ESP32 to be ready.
- It lets you demo the full system — real-time chart updates, database persistence, anomaly alerts — even if the ESP32 is not present.
- It can be used to stress-test the system by increasing the publish rate or generating anomalous values.

### 11.2 What the Simulator Publishes

On every tick (default: every 10 seconds), the simulator publishes a `resource/readings` payload with:

| Field | Simulated Behaviour |
|---|---|
| `deviceId` | Fixed: `"esp32-01"` |
| `timestamp` | Current UTC time in ISO 8601 format |
| `water.flowRateLpm` | Random float between `0.5` and `5.0` L/min, occasionally `0.0` (tap off) |
| `water.totalLitres` | Running accumulation of simulated flow rate × elapsed time |
| `electricity.voltage` | Random float between `218.0` and `242.0` V (realistic Indian mains variation) |
| `electricity.current` | Random float between `0.1` and `8.0` A |
| `electricity.power` | Calculated: `voltage × current` |
| `electricity.energyKwh` | Running accumulation of power × elapsed time |

On startup, the simulator also publishes a `resource/status` payload with `status: "online"`.

### 11.3 Running the Simulator

Ensure the Mosquitto broker is running first (see [Section 3](#3-mosquitto-broker-setup)).

```bash
# From the project root
cd simulator
npm install           # First time only
npx ts-node mqtt-simulator.ts
```

Or, if using `tsx`:

```bash
npx tsx mqtt-simulator.ts
```

### 11.4 Expected Console Output

```
[Simulator] Connecting to mqtt://localhost:1883...
[Simulator] Connected. Client ID: simulator-01
[Simulator] Published online status.
[Simulator] [2026-09-22T08:30:00.000Z] Published readings:
{
  "deviceId": "esp32-01",
  "timestamp": "2026-09-22T08:30:00.000Z",
  "water": { "flowRateLpm": 2.34, "totalLitres": 0.39 },
  "electricity": { "voltage": 231.4, "current": 3.21, "power": 742.8, "energyKwh": 0.0021 }
}
[Simulator] [2026-09-22T08:30:10.000Z] Published readings:
...
```

### 11.5 Verifying Simulator Output with Mosquitto CLI

While the simulator is running, open a separate terminal:

```powershell
cd "C:\Program Files\mosquitto"
.\mosquitto_sub.exe -h localhost -p 1883 -t "resource/#" -v
```

You should see simulator messages arriving every 10 seconds.

---

## 12. Troubleshooting

### 12.1 ESP32 Cannot Connect to the Broker

**Symptom:** Serial monitor shows `[MQTT] Attempting connection... failed. rc=-2` repeatedly.

| Possible Cause | Diagnostic | Fix |
|---|---|---|
| Wrong broker IP | `ping 192.168.x.x` from your laptop. Try `ipconfig` to find the correct LAN IP. | Update `MQTT_BROKER_IP` in the firmware. |
| ESP32 and laptop on different networks | Check ESP32 connects to the same SSID as the laptop. | Use a phone hotspot and connect both laptop and ESP32 to it. |
| Windows Firewall blocking port 1883 | `Test-NetConnection -ComputerName 192.168.x.x -Port 1883` from another machine. | Run the firewall rule command in [Section 3.3](#33-firewall-configuration-windows). |
| Mosquitto not running | Check the Mosquitto terminal window. | Restart Mosquitto. |
| Incorrect SSID or password in firmware | — | Double-check `WIFI_SSID` and `WIFI_PASSWORD` constants. |
| PubSubClient buffer overflow | The `rc` code will be `-1` (connection lost immediately after connecting). | Call `mqttClient.setBufferSize(512)` in `setup()`. |

**`mqttClient.state()` error codes:**

| Code | Meaning |
|---|---|
| `-4` | `MQTT_CONNECTION_TIMEOUT` — broker not responding |
| `-3` | `MQTT_CONNECTION_LOST` — connection dropped mid-session |
| `-2` | `MQTT_CONNECT_FAILED` — TCP connection refused (broker not running or wrong IP/port) |
| `-1` | `MQTT_DISCONNECTED` — not yet connected |
| `0` | `MQTT_CONNECTED` — healthy |
| `1` | `MQTT_CONNECT_BAD_PROTOCOL` — broker rejected MQTT version |
| `2` | `MQTT_CONNECT_BAD_CLIENT_ID` — client ID rejected (duplicate or invalid characters) |
| `5` | `MQTT_CONNECT_UNAUTHORIZED` — broker requires credentials |

---

### 12.2 Messages Published but Not Received by Subscriber

**Symptom:** `mosquitto_pub` returns no error, but the subscriber terminal shows nothing.

| Possible Cause | Diagnostic | Fix |
|---|---|---|
| Topic name mismatch | Topics are **case-sensitive** and **exact-match**. `Resource/Readings` ≠ `resource/readings`. | Compare publisher topic string and subscriber topic string character by character. |
| Subscriber not running when message was published | MQTT without retained flag does not store messages for late subscribers. | Start subscriber before publisher. Or use `retained: true` on the topic (not appropriate for readings). |
| Subscribed to wrong topic | Verify the `mosquitto_sub` command uses the exact topic or a matching wildcard. | Use `resource/#` to catch all subtopics while debugging. |
| QoS mismatch causing broker to drop | Unlikely with anonymous Mosquitto. | Check Mosquitto verbose logs for `PUBLISH` and `SUBSCRIBE` entries. |

---

### 12.3 Backend Not Receiving Messages

**Symptom:** Mosquitto CLI receives messages but the Node.js backend does not log them.

| Possible Cause | Diagnostic | Fix |
|---|---|---|
| Backend MQTT client not started | Check server startup logs for `[MQTT] Connected to broker`. | Ensure the MQTT subscriber module is imported and `connectMQTTClient()` is called in `main.ts` / `app.ts`. |
| Backend using duplicate client ID | If another client (e.g., a second backend instance or the simulator) uses the same `clientId`, the broker will disconnect the older one. | Ensure all client IDs are unique. |
| Wrong broker URL in backend config | — | Check `BROKER_URL` in the backend config. Must be `mqtt://` (not `http://` or `ws://`). |
| Mosquitto stopped | — | Restart Mosquitto. |

---

### 12.4 JSON Parse Error in Backend

**Symptom:** Backend logs `[MQTT] Failed to parse JSON on topic 'resource/readings'`.

| Possible Cause | Diagnostic | Fix |
|---|---|---|
| ESP32 payload truncated due to small buffer | Print the raw payload in the backend before parsing. If it ends mid-field, the buffer is too small. | Add `mqttClient.setBufferSize(512)` on the ESP32. |
| Wrong field name (typo) | The payload will parse correctly but subsequent code will fail silently (e.g., `payload.water` is `undefined`). | Compare payload field names against [Section 5](#5-mqtt-payload-contract-the-api-contract) exactly. Check for `flowrate` vs `flowRateLpm`, `kwh` vs `energyKwh`, etc. |
| Non-JSON payload published | A manual `mosquitto_pub -m "hello"` to the readings topic will cause a parse error. | Ensure only the ESP32 and simulator publish to `resource/readings`. |
| ArduinoJson serialization bug | `StaticJsonDocument` too small for the payload. | Increase document size: `StaticJsonDocument<512> doc;`. |

---

### 12.5 Dashboard Shows Stale or No Data

**Symptom:** Dashboard is connected to the backend via WebSocket/HTTP but data does not update.

| Possible Cause | Diagnostic | Fix |
|---|---|---|
| Backend not persisting to MongoDB | Check backend logs for DB insert confirmations. | Verify `MONGO_URI` in `.env` and that MongoDB is running. |
| Dashboard polling wrong API endpoint | Check browser DevTools Network tab. | Verify API URL and route handler. |
| CORS blocking API response | Browser console shows CORS error. | Add the dashboard origin to the backend CORS allowlist. |
| Publish interval too long | Data arrives but infrequently. | Reduce `PUBLISH_INTERVAL_MS` to `5000` during development. |

---

## 13. MQTT Glossary

| Term | Definition |
|---|---|
| **Broker** | The central server that receives all MQTT messages from publishers and routes them to the appropriate subscribers. In this project: **Eclipse Mosquitto**. The broker does not process or store message content (beyond retained messages). It is purely a message routing layer. |
| **Topic** | A UTF-8 string that acts as the address/channel for MQTT messages. Publishers publish to a topic; subscribers subscribe to a topic. Topics are hierarchical, separated by `/`. Examples: `resource/readings`, `home/sensor/temperature`. Topics are case-sensitive. |
| **Publisher** | An MQTT client that sends (publishes) messages to the broker on a given topic. In this project: the **ESP32** or the **MQTT Simulator**. A publisher does not know or care who is subscribed to the topic. |
| **Subscriber** | An MQTT client that expresses interest in a topic and receives all messages published to that topic (while the subscription is active). In this project: the **Backend Node.js service** and optionally the **Dashboard**. A subscriber can match topics using wildcards (`+`, `#`). |
| **QoS (Quality of Service)** | A protocol-level delivery guarantee for MQTT messages. Three levels: **QoS 0** (fire and forget, no guarantee), **QoS 1** (at-least-once delivery, acknowledged), **QoS 2** (exactly-once delivery, four-way handshake). This project uses **QoS 1** for reliable sensor data delivery. |
| **Retained Message** | A message published with `retained: true`. The broker stores the **last retained message** for each topic and immediately delivers it to any new subscriber. Used in this project for `resource/status` so dashboards always know the device's current state on first load. |
| **Last Will and Testament (LWT)** | A message pre-registered with the broker at connection time. If the broker detects the client has disconnected abnormally (crash, power loss, network failure) without sending a proper DISCONNECT packet, it automatically publishes the LWT message. Used in this project to publish `{"status": "offline"}` when the ESP32 dies silently. |
| **Payload** | The content of an MQTT message. MQTT payloads are raw bytes — the protocol does not enforce a specific format. In this project, all payloads are **UTF-8 encoded JSON strings**. The structure is defined precisely in [Section 5](#5-mqtt-payload-contract-the-api-contract). |
| **Client ID** | A unique string that identifies each MQTT client to the broker. Must be unique per connected client. If two clients connect with the same Client ID, the broker disconnects the older one. Maximum length: 23 characters in MQTT 3.1.1 (though Mosquitto supports longer IDs). |
| **Keep-Alive** | A time interval (in seconds) negotiated during MQTT connection setup. If the client does not send any MQTT packets for `keep-alive` seconds, it must send a **PINGREQ** control packet. The broker responds with **PINGRESP**. If no packet is received within `1.5 × keep-alive` seconds, the broker considers the client dead and fires the LWT. This project uses a **60-second keep-alive**. |
| **Clean Session** | A flag in the MQTT CONNECT packet. If `true`, the broker discards all session state (subscriptions, queued QoS 1/2 messages) when the client disconnects. On reconnection, the client starts fresh. If `false`, the broker persists session state. This project uses **clean session = true** for simplicity. |
| **PINGREQ / PINGRESP** | MQTT control packets used to maintain the keep-alive heartbeat. The client sends PINGREQ; the broker responds with PINGRESP. These packets are tiny (2 bytes each) and are handled automatically by the MQTT client library. |
| **Will Message** | Synonymous with **Last Will and Testament (LWT)** — the message the broker publishes on behalf of a client that disconnects abnormally. |
| **Wildcard Subscription** | A subscription using the `+` (single-level) or `#` (multi-level) wildcards to match multiple topics with a single subscription. Example: `resource/#` matches `resource/readings`, `resource/status`, and any other topic under `resource/`. |

---

*Document maintained by the Smart IoT Monitoring System PBL Team.  
For corrections or additions, update this file and commit to the repository.*

