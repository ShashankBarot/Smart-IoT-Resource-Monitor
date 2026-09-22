# VIVA Q&A — Smart IoT-Based Water and Electricity Consumption Monitoring System

> **Project:** Smart IoT-Based Water and Electricity Consumption Monitoring System  
> **Type:** College Project-Based Learning (PBL)  
> **Purpose:** Complete viva preparation guide — every question answered fully and accurately.

---

## Table of Contents

1. [System Architecture Questions](#1-system-architecture-questions)
2. [ESP32 and Hardware Questions](#2-esp32-and-hardware-questions)
3. [MQTT Questions](#3-mqtt-questions)
4. [Node.js Backend Questions](#4-nodejs-backend-questions)
5. [PostgreSQL and Prisma Questions](#5-postgresql-and-prisma-questions)
6. [REST API Questions](#6-rest-api-questions)
7. [WebSocket / Real-Time Questions](#7-websocket--real-time-questions)
8. [Next.js Frontend Questions](#8-nextjs-frontend-questions)
9. [Anomaly Detection Questions](#9-anomaly-detection-questions)
10. [Design Decision Questions](#10-design-decision-questions)
11. [Team Collaboration Questions](#11-team-collaboration-questions)
12. [Limitations and Future Work Questions](#12-limitations-and-future-work-questions)

---

## 1. System Architecture Questions

**Q: What is the overall architecture of your system?**  
**A:** Our system follows a four-layer IoT architecture. The first layer is the **Perception Layer**, which consists of the ESP32 microcontroller connected to the YF-S201 water flow sensor, the ZMPT101B voltage sensor, and the ACS712 current sensor — these sense physical quantities. The second layer is the **Network/Communication Layer**, where the ESP32 publishes sensor data as JSON payloads to a local Mosquitto MQTT broker over Wi-Fi. The third layer is the **Application Layer**, which is our Node.js backend that subscribes to the MQTT topics, validates and stores readings in a PostgreSQL database, runs anomaly detection logic, and exposes REST API endpoints. The fourth layer is the **Presentation Layer**, which is our Next.js dashboard that displays real-time gauges, historical charts, and alert notifications using WebSocket push and REST API polling.

---

**Q: Why did you choose a layered architecture?**  
**A:** A layered architecture enforces **separation of concerns** — each layer has a single, well-defined responsibility, which makes the system easier to develop, test, and maintain independently. It also allows the team to work in parallel: the hardware member works on the perception layer, the backend member works on the application layer, and the frontend member works on the presentation layer, all at the same time without blocking each other. Additionally, a layered design improves **replaceability** — for example, we could swap the ESP32 for a Raspberry Pi or replace Mosquitto with HiveMQ without changing any backend or frontend code, as long as the MQTT topic and payload contract remains the same. This architecture is the industry-standard pattern used in real IoT deployments, which validates our design choice.

---

**Q: What is the data flow from sensor to dashboard?**  
**A:** The data flows through the following steps in sequence. First, the physical sensors measure water flow pulses, mains voltage, and mains current; the ESP32 reads these values in its main loop. Second, the ESP32 calculates derived values — flow rate in L/min, total volume in liters, RMS voltage in volts, RMS current in amps, real power in watts, and cumulative energy in kWh — and publishes a JSON payload to the Mosquitto MQTT broker over Wi-Fi every five seconds. Third, the Node.js backend, which is subscribed to those topics, receives the payload, validates it with Zod, and inserts a row into the `WaterReading` or `ElectricityReading` table in PostgreSQL via Prisma ORM. Fourth, the backend runs anomaly detection on the new reading and, if an anomaly is detected, inserts an `Alert` record and emits a `new_alert` WebSocket event to all connected dashboard clients. Fifth, the Next.js frontend, which maintains a persistent Socket.IO connection, receives the push event and updates the real-time display; it also polls REST API endpoints periodically for historical chart data using SWR.

---

**Q: How many devices does your system support?**  
**A:** In the current prototype, the system is designed for **one physical ESP32 unit** monitoring one water line and one electrical circuit. However, the database schema and MQTT topic structure are designed with multi-device expansion in mind — readings are stored with a `deviceId` field, and the MQTT topics follow the pattern `home/<deviceId>/water` and `home/<deviceId>/electricity`, which means adding a second ESP32 only requires giving it a unique device ID and the existing backend will store its data in separate rows. The REST API and frontend would need minor updates to filter by device, but no architectural change would be required. For a production system with many devices, we would add a device registry table and modify the frontend to show a per-device dashboard view.

---

**Q: What happens if one component fails?**  
**A:** The system is designed to **degrade gracefully** at each layer. If the ESP32 loses Wi-Fi connectivity, it enters a reconnection loop and queues readings locally in a small buffer; readings resume publishing once the connection is restored, and the MQTT Last Will and Testament mechanism marks the device as offline in the backend. If the Mosquitto broker restarts, the ESP32 detects the disconnection and automatically reconnects with exponential backoff; retained messages ensure the broker has the latest known state once it comes back online. If the Node.js backend crashes, MQTT messages are buffered at the broker for QoS 1 subscribers and will be redelivered once the backend reconnects; no sensor data is lost during short outages. If the PostgreSQL database is temporarily unreachable, the backend logs the error and skips insertion for that cycle, and the MQTT simulator allows the frontend to continue functioning for demonstration purposes even with the backend down.

---

## 2. ESP32 and Hardware Questions

**Q: What is the ESP32 and why did you use it?**  
**A:** The ESP32 is a low-cost, ultra-low-power system-on-chip (SoC) microcontroller developed by Espressif Systems, featuring a dual-core 240 MHz Xtensa LX6 processor, 520 KB of SRAM, integrated 802.11 b/g/n Wi-Fi, and Bluetooth 4.2. We chose it for this project because it natively supports Wi-Fi without requiring an external module, which dramatically simplifies the hardware design compared to an Arduino with an ESP8266 shield. It has sufficient GPIO pins to simultaneously interface with the water flow sensor (digital interrupt pin), the ZMPT101B (ADC pin), and the ACS712 (ADC pin), and it supports the MQTT protocol through the Arduino `PubSubClient` library, making it a complete IoT node in a single, inexpensive chip costing approximately ₹300–₹500. The ESP32 also supports deep sleep modes that can reduce power consumption to under 10 µA, which is valuable for battery-powered deployments.

---

**Q: How does the YF-S201 water flow sensor work?**  
**A:** The YF-S201 is a hall-effect turbine flow sensor. Inside the sensor body, there is a small plastic turbine wheel that spins freely as water flows through it. A small magnet is embedded in the turbine, and a hall-effect sensor positioned outside the turbine detects each rotation of the magnet and generates a digital pulse on its signal output pin. The frequency of these pulses is directly proportional to the volumetric flow rate of water passing through the sensor — more pulses per second means a higher flow rate. The ESP32 counts these pulses using a hardware interrupt attached to the signal pin, which is the most accurate counting method because it does not miss pulses due to software delays. The raw pulse count is then converted to a flow rate in liters per minute by dividing the pulse frequency (pulses per second) by the sensor's calibration factor and multiplying by 60.

---

**Q: What is the YF-S201 calibration factor?**  
**A:** The calibration factor for the YF-S201 sensor is approximately **7.5 pulses per second per liter per minute** of flow, as specified in the manufacturer's datasheet. This means that if the sensor outputs 7.5 pulses every second, the flow rate is exactly 1 liter per minute. In our firmware, we store this as a constant `FLOW_CALIBRATION_FACTOR = 7.5`. The factor can vary slightly between individual units due to manufacturing tolerances, typically within ±2%, and can be verified by measuring a known volume of water — for example, collecting exactly 1 liter in a measuring jug while counting the total pulses and comparing to the expected count. For our prototype, we use the datasheet value, which gives a practical accuracy of ±3% for flow rates between 1 and 30 L/min, which is the sensor's rated operating range.

---

**Q: How do you calculate flow rate from pulses?**  
**A:** We use a time-window pulse counting approach. In the ESP32 firmware, a global volatile integer `pulseCount` is incremented by one inside an Interrupt Service Routine (ISR) every time the sensor signal pin goes HIGH. Every fixed interval — we use one second — the main loop reads and resets `pulseCount`, then calculates the flow rate using the formula:

```
flowRate (L/min) = (pulseCount / FLOW_CALIBRATION_FACTOR) × 60
```

Since we sample over one second, this simplifies to:

```
flowRate (L/min) = (pulses_in_one_second / 7.5) × 60
```

The `volatile` keyword on `pulseCount` is critical — it prevents the compiler from caching the variable in a CPU register and ensures the main loop always reads the latest value written by the ISR. We also disable interrupts momentarily while reading and resetting `pulseCount` to prevent a race condition where the ISR increments the counter between the read and the reset operations.

---

**Q: How do you calculate total water consumed?**  
**A:** Total water consumed is calculated by **accumulating the flow rate over time** using simple numerical integration. Every one-second sampling interval, after calculating the instantaneous flow rate in liters per minute, we add the volume that flowed during that one-second window:

```
volume_this_second (liters) = flowRate (L/min) / 60
totalVolume (liters) += volume_this_second
```

This is essentially the trapezoidal approximation of the integral of flow rate over time. The `totalVolume` variable is maintained in the ESP32's RAM and is included in every MQTT payload published to the broker. The backend receives the cumulative total and stores it directly in the database; it also stores the `dailyVolume` which is the total for the current calendar day, reset at midnight. A potential issue is that if the ESP32 resets, the in-RAM total is lost; a production improvement would be to periodically save the total to the ESP32's non-volatile storage (NVS) using the `Preferences` library.

---

**Q: What is the ZMPT101B and what does it measure?**  
**A:** The ZMPT101B is a precision miniature voltage transformer module designed to safely measure **AC mains voltage** (typically 230V AC in India) and output a scaled-down, isolated analog signal suitable for reading by a microcontroller ADC. The module uses a small toroidal transformer to provide galvanic isolation between the high-voltage mains side and the low-voltage microcontroller side, which is an essential safety feature. The transformer steps down the mains voltage to a small AC waveform centered around 1.65V (half of 3.3V), which the ESP32's 12-bit ADC can safely sample. By sampling the ADC at a high rate over a full AC cycle (20 ms for 50 Hz mains) and computing the Root Mean Square (RMS) value of the sampled waveform, we obtain the true RMS voltage that represents the effective AC voltage powering household appliances.

---

**Q: What is the ACS712 and what does it measure?**  
**A:** The ACS712 is a Hall-effect-based linear current sensor IC manufactured by Allegro MicroSystems. It measures **AC or DC current** flowing through a conductor by detecting the magnetic field generated by that current using the Hall effect, without making any direct electrical contact with the high-current circuit — the current path passes through a low-resistance internal conductor on the sensor, and the Hall element senses the resulting magnetic field. The sensor outputs an analog voltage proportional to the current: for the ACS712-30A variant (which measures up to ±30A), the sensitivity is 66 mV/A, centered at 2.5V (representing 0A). Like the voltage measurement, we sample the ACS712 output rapidly over a full 50 Hz cycle and compute the RMS value to obtain the true RMS current in amps. The IC provides approximately 100 dB of galvanic isolation between the high-current path and the signal output, protecting the ESP32.

---

**Q: How do you calculate power from voltage and current?**  
**A:** For a **resistive load** (such as a heater or incandescent bulb), real power is calculated as:

```
Power (W) = V_rms × I_rms
```

Where `V_rms` is the root mean square voltage in volts and `I_rms` is the root mean square current in amps. In our system, the ESP32 samples both the ZMPT101B and ACS712 outputs synchronously at a high rate (at least 20 samples per 50 Hz cycle) and calculates their RMS values independently, then multiplies them. However, this approach calculates **apparent power** (in VA), which equals real power only for a unity power factor (purely resistive loads). For loads with motors or capacitors (like fans or refrigerators) that have a phase difference between voltage and current, a true power meter must compute the instantaneous product `v(t) × i(t)` and average it over a full cycle — this is what our system does when both sensors are sampled synchronously, giving us the **real power** in watts. Our prototype assumes near-unity power factor for educational purposes, which is a stated limitation.

---

**Q: What is the difference between power and energy?**  
**A:** **Power** is the instantaneous rate at which electrical energy is being consumed, measured in **Watts (W)**. It tells you how much energy is being used at any given moment — for example, a 100-watt bulb consumes 100 joules of energy every second. **Energy**, on the other hand, is the total amount of electrical work done over a period of time, measured in **Watt-hours (Wh)** or **kilowatt-hours (kWh)**, which is what electricity bills are based on. The relationship is: `Energy = Power × Time`. A 100W bulb running for 10 hours consumes `100W × 10h = 1000 Wh = 1 kWh`, which is one "unit" on an electricity bill in India. In our system, we continuously accumulate energy by integrating the power readings over time, and the frontend displays both the current power draw (in watts) and the cumulative energy consumed (in kWh) for the day.

---

**Q: How do you calculate energy from power?**  
**A:** Energy is calculated by **numerically integrating the power readings over time**. In our firmware, every sampling interval (5 seconds), after computing the instantaneous real power in watts, we add the energy consumed during that interval to a running total:

```
energy_this_interval (Wh) = Power (W) × (interval_seconds / 3600)
totalEnergy (Wh) += energy_this_interval
```

Dividing by 3600 converts from watt-seconds (joules) to watt-hours. For example, if the instantaneous power is 500W and the sampling interval is 5 seconds:

```
energy = 500 × (5 / 3600) = 500 × 0.001389 ≈ 0.694 Wh per interval
```

The cumulative `totalEnergy` in kilowatt-hours (divided by 1000) is included in every MQTT payload and stored in the database. The daily energy is reset at midnight, and the backend also records hourly aggregates for time-series charting on the dashboard.

---

**Q: Why is mains AC measurement dangerous? What safety measures did you take?**  
**A:** Mains electricity in India operates at **230V AC, 50 Hz**, which is lethal — currents as low as 50 mA passing through the human body can cause cardiac arrest, and voltages above 50V AC are classified as hazardous by IEC 60950. Any direct contact between the mains circuit and a microcontroller without proper isolation would destroy the ESP32 instantly and pose a severe electrocution risk to the user and team members. We mitigated these risks with the following measures: (1) The **ZMPT101B** module uses a galvanically isolated transformer — there is no electrical connection between the mains side and the ESP32 signal side, only a magnetic coupling. (2) The **ACS712** sensor uses a Hall-effect element inside an isolation barrier, so the current path is physically separate from the measurement circuit. (3) During development and testing, we used a **variac (autotransformer)** set to a safe low voltage (e.g., 24V AC) for initial calibration rather than directly connecting to the mains socket. (4) All mains wiring is enclosed in insulated housings, and we never handled mains connections with the circuit energized. (5) The entire hardware assembly, including the mains connections, is enclosed in a non-conductive ABS plastic enclosure.

---

**Q: What is the accuracy of your water flow measurement?**  
**A:** The YF-S201 sensor is rated by its manufacturer for a flow rate accuracy of **±3%** within its operating range of 1 to 30 L/min. At very low flow rates (below 1 L/min), the turbine may not spin reliably due to surface tension and friction, causing under-counting, so we treat readings below our minimum threshold as zero. Our pulse counting implementation using hardware interrupts does not miss pulses (unlike software polling approaches), so the quantization error is limited to at most one pulse per sampling interval, which at a calibration factor of 7.5 pulses/L corresponds to a maximum error of `1/7.5 = 0.133 liters` per interval. For a typical household flow rate of 6 L/min, the sensor produces 0.75 pulses per second, and our 1-second counting window gives a practical resolution of about 0.133 L/min. Overall, the system achieves better than ±5% accuracy under normal usage conditions, which is acceptable for monitoring and anomaly detection purposes, though not suitable for utility billing.

---

**Q: What is the accuracy of your electricity measurement?**  
**A:** The accuracy of our electricity measurement is limited by two factors: ADC resolution and sensor accuracy. The ESP32's ADC is 12-bit (4096 levels) with a reference voltage of 3.3V, giving a voltage resolution of approximately 0.8 mV per bit. The ZMPT101B module has a transformer accuracy of approximately **±1%** for the voltage measurement. The ACS712-30A has a typical sensitivity error of **±1.5%** and a zero-current offset error that can drift with temperature. Combined, the real power measurement accuracy is approximately **±3–5%** under ideal conditions. A significant additional limitation is that our system does not measure power factor — it assumes unity power factor — which means for inductive loads like motors, fans, and transformers, the displayed power may be higher than the actual real power consumed. For purely resistive loads like heaters and incandescent bulbs, the accuracy is within ±5%. We explicitly state in our project documentation that these readings are **for monitoring and awareness purposes only, not for utility billing**.

---

**Q: Are your electricity readings billing-grade?**  
**A:** No, our readings are explicitly **not billing-grade**. Utility-grade energy meters in India must comply with **IS 13779** and achieve accuracy class 1 (±1%) or class 0.5 (±0.5%) as certified by the Bureau of Indian Standards (BIS). These meters use precision current transformers with tightly toleranced cores, temperature-compensated voltage references, and dedicated energy metering ICs such as the ATM90E32 or ADE7758 that compute real, reactive, and apparent power with hardware integration. Our prototype uses commodity sensors (ZMPT101B, ACS712), assumes unity power factor, and has no temperature compensation, giving a practical accuracy of ±5% under favorable conditions. Our system is designed for **consumption awareness and anomaly detection** — to alert users to unusual usage patterns — not for financial billing. A stated future improvement is to replace the current sensors with a dedicated energy metering IC to achieve better accuracy.

---

## 3. MQTT Questions

**Q: What is MQTT?**  
**A:** MQTT stands for **Message Queuing Telemetry Transport**. It is a lightweight, binary, publish-subscribe network protocol designed for constrained devices and low-bandwidth, high-latency, or unreliable networks. It was originally developed by IBM in 1999 for monitoring oil pipelines via satellite and was later standardized as an OASIS standard. In MQTT, clients do not communicate directly with each other; instead, they connect to a central server called a **broker**. A **publisher** sends a message to the broker on a specific **topic** string, and the broker forwards that message to all **subscribers** that have registered interest in that topic. MQTT has a very small header overhead — as little as 2 bytes — making it far more bandwidth-efficient than HTTP for IoT telemetry applications. It runs over TCP/IP and supports three levels of message delivery guarantee called Quality of Service (QoS).

---

**Q: Why did you use MQTT instead of HTTP for the ESP32?**  
**A:** We chose MQTT over HTTP for several technical reasons specific to IoT and microcontroller environments. First, MQTT has a **much smaller code footprint and message overhead** — an MQTT publish packet has as few as 2 bytes of fixed header, compared to hundreds of bytes of HTTP headers for every request, which matters on a constrained device like the ESP32. Second, MQTT uses **persistent TCP connections** — the ESP32 connects once to the broker and keeps the connection open, eliminating the overhead of TCP handshake and HTTP connection establishment for every data point sent every 5 seconds. Third, MQTT is inherently **asynchronous and non-blocking** in its publish pattern, whereas HTTP POST requires the ESP32 to wait for a response from the server before continuing, which would block sensor reading loops. Fourth, MQTT supports **Quality of Service levels** that guarantee message delivery without requiring the sensor device to implement retry logic. Fifth, MQTT's **Last Will and Testament** feature provides automatic offline detection, which has no equivalent in standard HTTP.

---

**Q: What is a Mosquitto broker?**  
**A:** Eclipse Mosquitto is a free, open-source, lightweight **MQTT message broker** (also called a server) developed by the Eclipse Foundation. It implements the MQTT protocol specifications versions 3.1, 3.1.1, and 5.0 and is designed to have a very small memory footprint — it can run on hardware as minimal as a Raspberry Pi Zero. In our project, Mosquitto runs on the same local machine as the Node.js backend; both the ESP32 (publisher) and the backend (subscriber) connect to Mosquitto over the local Wi-Fi network. Mosquitto handles all routing of messages between publishers and subscribers: when the ESP32 publishes to `home/esp32_01/water`, Mosquitto receives the message and immediately forwards it to our Node.js backend, which has subscribed to that topic. Mosquitto also handles retained messages and QoS guarantee, which means if our backend restarts, the broker can redeliver the last retained reading.

---

**Q: What is a topic in MQTT?**  
**A:** A topic in MQTT is a **UTF-8 string used to label and route messages** between publishers and subscribers. Topics are hierarchical and use the forward slash `/` as a level separator, similar to a file path. In our project, we use the following topic structure:
- `home/<deviceId>/water` — water flow and volume data from the ESP32
- `home/<deviceId>/electricity` — voltage, current, power, and energy data
- `home/<deviceId>/status` — device heartbeat and online/offline status

Subscribers can use **wildcards** to subscribe to multiple topics at once: the single-level wildcard `+` matches any single level (e.g., `home/+/water` subscribes to the water topic for all device IDs), and the multi-level wildcard `#` matches all remaining levels (e.g., `home/esp32_01/#` subscribes to all topics from that device). This hierarchical naming convention is an industry best practice for organizing IoT device telemetry and allows the backend to selectively subscribe to only the topics it needs.

---

**Q: What is QoS in MQTT? What level do you use and why?**  
**A:** QoS stands for **Quality of Service** — it defines the guarantee of message delivery between a publisher and the broker, or between the broker and a subscriber. MQTT defines three QoS levels: **QoS 0 ("At most once")** means the message is sent once with no acknowledgment and may be lost if the network is unreliable. **QoS 1 ("At least once")** means the message is acknowledged by the receiver and retransmitted by the sender until an acknowledgment is received, guaranteeing delivery but potentially causing duplicates. **QoS 2 ("Exactly once")** uses a four-step handshake to guarantee the message is delivered exactly once with no duplicates, but has the highest overhead. In our project, we use **QoS 1** for sensor data publications. We chose QoS 1 because we cannot afford to lose readings (a dropped reading would corrupt our energy accumulation total), but the small possibility of occasional duplicate readings is acceptable since our backend checks for and discards duplicate timestamps. QoS 2's additional overhead is unnecessary given our 5-second publish interval.

---

**Q: What is a retained message?**  
**A:** A retained message in MQTT is a message stored permanently by the broker on a specific topic. When a publisher sends a message with the **retain flag set to `true`**, the broker stores that message and immediately delivers it to any new subscriber that connects to that topic in the future — even if the original publisher has since disconnected. In our system, the ESP32 publishes the device status message (`home/<deviceId>/status`) with the retain flag set, so that when our Node.js backend starts up or restarts, it immediately receives the last known status of the device without having to wait for the next publish cycle. This is useful for quickly detecting whether the device was online before the backend restarted. We also use retained messages for the last known water and electricity readings, so the dashboard can display a value immediately upon page load rather than showing empty gauges while waiting for the next 5-second publish.

---

**Q: What is the MQTT Last Will and Testament?**  
**A:** The Last Will and Testament (LWT) is a feature of the MQTT protocol that allows a client to register a message with the broker **at connection time** that the broker will automatically publish if the client disconnects unexpectedly (i.e., without sending a proper DISCONNECT packet). This is used for offline detection — if the ESP32 crashes, loses power, or goes out of Wi-Fi range, the TCP connection will time out and the broker will detect the ungraceful disconnection. Mosquitto will then automatically publish the LWT message, which in our case is a JSON payload like `{"status": "offline", "deviceId": "esp32_01"}` to the topic `home/esp32_01/status`. Our Node.js backend is subscribed to this status topic, and upon receiving the LWT message, it updates the device's status to offline in the database and emits a `device_offline` WebSocket event to the frontend dashboard, which then shows a warning banner to the user. When the ESP32 reconnects, it publishes an explicit `{"status": "online"}` message to override the LWT.

---

**Q: How does the ESP32 reconnect if it loses connection to the broker?**  
**A:** The ESP32 firmware implements a **reconnection loop with exponential backoff** to avoid flooding the network with rapid reconnection attempts. In the main `loop()` function, before processing sensor readings, the code checks `if (!mqttClient.connected())` and, if true, calls a `reconnect()` function. The `reconnect()` function attempts `mqttClient.connect()` — which includes the device ID, LWT configuration, and optional credentials — and if the attempt fails, the firmware waits for an increasing delay (starting at 1 second, doubling up to a maximum of 30 seconds) before the next attempt. The ESP32 also checks and maintains its Wi-Fi connection — if `WiFi.status() != WL_CONNECTED`, it calls `WiFi.reconnect()` and waits. The non-blocking nature of the firmware loop ensures that during reconnection attempts, the sensor reading and accumulation logic continues running, so no pulse counts are missed even while the network is down. Once connected, the client resubscribes to any required incoming topics (e.g., remote configuration commands) because MQTT subscriptions do not survive a disconnect unless the client connects with the `cleanSession = false` flag.

---

## 4. Node.js Backend Questions

**Q: Why did you use Node.js for the backend?**  
**A:** We chose Node.js for the backend for several complementary reasons. First, Node.js uses an **event-driven, non-blocking I/O model** built on the V8 JavaScript engine, which makes it particularly efficient for I/O-bound tasks like subscribing to MQTT messages, querying a database, and serving API requests concurrently — all of which are the primary tasks of our backend. Second, because the frontend is also written in JavaScript/TypeScript (Next.js), using Node.js on the backend allows us to **share type definitions and validation schemas** (via Zod) between the backend and frontend, reducing duplication and preventing type mismatches. Third, the Node.js ecosystem provides excellent libraries for our exact use case: `mqtt` (MQTT client), `express` (HTTP server), `socket.io` (WebSocket), and `@prisma/client` (ORM), all of which are well-maintained and have excellent documentation. Fourth, all team members were already familiar with JavaScript from prior coursework, reducing the learning curve compared to a Python FastAPI or Java Spring Boot approach.

---

**Q: What is Express.js?**  
**A:** Express.js is a **minimal and flexible Node.js web application framework** that provides a set of utilities for building HTTP servers, RESTful APIs, and web applications. It adds a thin layer of abstraction over Node.js's built-in `http` module, providing routing, middleware support, request/response helpers, and error handling without imposing a rigid project structure. In our backend, we use Express.js to define and serve the REST API endpoints — for example, `app.get('/api/water/current', handler)` and `app.get('/api/electricity/today', handler)` — and to apply middleware such as `express.json()` for parsing JSON request bodies and a CORS middleware to allow the Next.js frontend (running on a different port) to access the API. Express is intentionally minimal — it does not include an ORM, database driver, or authentication system, so we integrate those ourselves using Prisma and other libraries.

---

**Q: What is TypeScript and why do you use it?**  
**A:** TypeScript is a **strongly-typed superset of JavaScript** developed by Microsoft. It adds optional static type annotations to JavaScript code, and the TypeScript compiler (`tsc`) checks these types at build time, catching type errors before the code runs. TypeScript is not a different language from JavaScript — it compiles down to plain JavaScript, which is what Node.js actually executes. We use TypeScript in both the backend and frontend for several important reasons: (1) **Early error detection** — TypeScript catches bugs like accessing a property that doesn't exist on an object, or passing a string where a number is expected, at compile time rather than at runtime. (2) **Better IDE support** — TypeScript enables rich autocomplete, inline documentation, and refactoring tools in VS Code, which significantly improves developer productivity. (3) **Self-documenting code** — type definitions serve as living documentation of the shape of data flowing through the system. (4) **Team safety** — in a team project where multiple members interact with shared interfaces, TypeScript prevents accidental breaking changes by ensuring all code conforms to the defined types.

---

**Q: How does the backend receive MQTT messages?**  
**A:** The backend uses the `mqtt` npm package, which is a pure-JavaScript MQTT client library. On startup, the backend creates an MQTT client instance and connects to the Mosquitto broker running locally: `const client = mqtt.connect('mqtt://localhost:1883')`. Once connected, it subscribes to the relevant sensor topics: `client.subscribe('home/+/water')` and `client.subscribe('home/+/electricity')`. The `+` wildcard means it subscribes to these topics for all device IDs simultaneously. When a new message arrives from the broker, the `client.on('message', (topic, payload) => { ... })` callback is invoked with the topic string and the raw binary payload (as a Node.js `Buffer`). Inside this callback, we convert the Buffer to a UTF-8 string, parse it as JSON, validate it against the appropriate Zod schema (checking for required fields, correct types, and reasonable value ranges), and if validation passes, call the Prisma ORM to insert the reading into PostgreSQL. If validation fails, the error is logged and the message is discarded without throwing.

---

**Q: What is Zod and why do you use it for validation?**  
**A:** Zod is a **TypeScript-first schema declaration and validation library** for Node.js and the browser. It allows you to define the expected shape of data — including field names, types, required/optional status, minimum/maximum values, and custom constraints — as a reusable schema object, and then call `.parse()` or `.safeParse()` on any incoming data to validate it against that schema. We use Zod in two places: validating incoming MQTT payloads from the ESP32, and validating query parameters in REST API request handlers. For MQTT payloads, a typical Zod schema might look like: `z.object({ deviceId: z.string(), flowRate: z.number().min(0).max(100), ... })`. The key advantage of Zod over manual `if` checks is that it **automatically generates TypeScript types** from the schema, ensuring that the validated data object has a correct TypeScript type, eliminating the need to write separate interface definitions. If a payload fails validation (e.g., the ESP32 sends a corrupted JSON), Zod returns a detailed error report rather than crashing the backend.

---

**Q: How does the backend handle a malformed MQTT payload?**  
**A:** The backend handles malformed payloads through a **defensive try-catch and Zod safeParse pattern**. Inside the `client.on('message', ...)` callback, the code first attempts to `JSON.parse()` the raw payload string inside a try-catch block — if the payload is not valid JSON (e.g., the ESP32 sent a partial transmission), the catch block logs a warning with the raw payload content and returns early, discarding the message. If JSON parsing succeeds, the code calls `schema.safeParse(data)`, which never throws — it returns an object with `{ success: true, data: ... }` on success or `{ success: false, error: ZodError }` on failure. If `success` is false, the backend logs the Zod error details (which field failed, what the expected type was, what value was received) and returns without attempting to write to the database. This design means that a bug in the ESP32 firmware that sends a malformed payload will never crash the backend; it will simply log a warning that can be used to diagnose the firmware issue.

---

**Q: What is the purpose of the MQTT simulator?**  
**A:** The MQTT simulator is a Node.js script that **generates realistic synthetic sensor data and publishes it to the Mosquitto broker** on the same topics that the real ESP32 uses. It was developed by the backend member (Member 2) to enable development and testing of the backend processing pipeline and the frontend dashboard without requiring the physical hardware to be present or connected. The simulator generates randomized but realistic readings — for example, water flow rate fluctuates around a baseline of 5 L/min with Gaussian noise, and power consumption follows a daily pattern with higher usage in the morning and evening. It also simulates anomalous events — randomly injecting high flow readings or power spikes — to test the anomaly detection pipeline end-to-end. The simulator runs continuously and publishes every 5 seconds, exactly mimicking the behavior of the real ESP32, which means the frontend developer (Member 3) can develop and test the dashboard with the simulator running and then switch to real hardware with zero code changes by simply stopping the simulator and powering on the ESP32.

---

**Q: How does the backend detect that the ESP32 has gone offline?**  
**A:** The backend detects ESP32 offline status through **two complementary mechanisms**. The primary mechanism is the **MQTT Last Will and Testament (LWT)**: when the ESP32 connects to the broker, it registers an LWT message on `home/<deviceId>/status` with payload `{"status": "offline"}`. If the ESP32 disconnects ungracefully (power loss, crash, network failure), Mosquitto automatically publishes this LWT after the keep-alive timeout (we configure 60 seconds). The backend, subscribed to the status topic, receives this and updates the device status in the database and emits a `device_offline` Socket.IO event to the frontend. The secondary mechanism is a **heartbeat timeout check**: the backend tracks the timestamp of the last received message from each device; a scheduled job (running every 30 seconds using `setInterval`) checks all known devices and flags any device whose last message is older than 90 seconds (3 missed publish cycles) as potentially offline. This second mechanism handles edge cases where the LWT is delayed or lost due to broker issues.

---

## 5. PostgreSQL and Prisma Questions

**Q: Why did you choose PostgreSQL over MongoDB or SQLite?**  
**A:** We chose PostgreSQL for three main reasons specific to our data model and query patterns. First, our sensor data is inherently **structured and relational** — each reading has a fixed schema (device ID, timestamp, flow rate, volume, etc.), there are no varying fields between records, and we perform joins between the readings table and the alerts table, which are natural operations for a relational database. MongoDB's document model would add unnecessary complexity for uniformly structured, fixed-schema telemetry data. Second, PostgreSQL has excellent support for **time-series queries** — specifically the `BETWEEN` operator on indexed timestamp columns, `DATE_TRUNC` for aggregating readings by hour or day, and window functions for computing running totals — which are the exact query patterns our dashboard uses. Third, PostgreSQL is **ACID-compliant**, meaning that even if the backend crashes mid-write, we will never have partially written, corrupted records in the database. We ruled out SQLite because it does not handle concurrent writes well (it uses file-level locking), and our backend has multiple concurrent async workers writing to the database.

---

**Q: What tables does your database have?**  
**A:** Our database has four tables, defined in the Prisma schema:

1. **`Device`** — stores registered devices with fields: `id` (cuid primary key), `deviceId` (unique string like `"esp32_01"`), `name`, `location`, `isOnline` (boolean), `lastSeen` (timestamp), and `createdAt`.

2. **`WaterReading`** — stores each water sensor reading with fields: `id`, `deviceId` (foreign key to Device), `timestamp`, `flowRate` (Float, L/min), `totalVolume` (Float, liters), `dailyVolume` (Float, liters), and `pulseCount` (Int).

3. **`ElectricityReading`** — stores each electricity sensor reading with fields: `id`, `deviceId`, `timestamp`, `voltage` (Float, V), `current` (Float, A), `power` (Float, W), `totalEnergy` (Float, kWh), `dailyEnergy` (Float, kWh), and `powerFactor` (Float).

4. **`Alert`** — stores detected anomalies with fields: `id`, `deviceId`, `type` (enum: `WATER_LEAK`, `HIGH_WATER_USAGE`, `HIGH_POWER`, `VOLTAGE_ANOMALY`), `severity` (enum: `LOW`, `MEDIUM`, `HIGH`), `message` (String), `value` (Float), `threshold` (Float), `isResolved` (boolean), `createdAt`, and `resolvedAt`.

---

**Q: What is Prisma ORM?**  
**A:** Prisma is a **next-generation Object-Relational Mapper (ORM)** for Node.js and TypeScript. It consists of three main components: (1) **Prisma Schema** — a declarative schema file (`schema.prisma`) where you define your database models, relationships, and field types in a clean, human-readable DSL (Domain-Specific Language). (2) **Prisma Migrate** — a migration tool that reads your schema and generates SQL `CREATE TABLE`, `ALTER TABLE` migrations, which are version-controlled and applied to the database automatically. (3) **Prisma Client** — an auto-generated, fully type-safe database client for Node.js that provides methods like `prisma.waterReading.create()`, `prisma.alert.findMany()`, and `prisma.electricityReading.aggregate()`. Prisma Client generates TypeScript types directly from the schema, meaning that if you try to access a field that doesn't exist in the database schema, the TypeScript compiler catches it at build time before the code ever runs.

---

**Q: Why use an ORM instead of raw SQL?**  
**A:** Using an ORM like Prisma provides several important advantages over writing raw SQL strings in the backend code. First, **type safety** — with raw SQL, a typo in a column name or a wrong data type is only detected at runtime when the query executes and the database returns an error; with Prisma, such errors are caught at compile time. Second, **SQL injection prevention** — Prisma automatically uses parameterized queries for all operations, eliminating the most common web security vulnerability; with raw SQL, developers must manually remember to parameterize every user-supplied value. Third, **database portability** — while we use PostgreSQL, Prisma supports SQLite, MySQL, and other databases; switching would only require changing the `provider` in `schema.prisma` with minimal code changes. Fourth, **developer productivity** — Prisma's auto-generated client with IDE autocomplete means writing database queries is faster and less error-prone than constructing SQL strings by hand. The trade-off is that for very complex queries involving advanced SQL features (like recursive CTEs or custom aggregate functions), raw SQL or Prisma's `$queryRaw` escape hatch may be more appropriate.

---

**Q: What indexes do you have and why?**  
**A:** We have the following indexes defined in the Prisma schema, each chosen for a specific query pattern:

1. **`WaterReading.timestamp` (B-tree index)** — Our most common query is fetching all readings for a time range (e.g., "last 24 hours"), which uses a `WHERE timestamp BETWEEN ? AND ?` clause. Without this index, PostgreSQL would perform a full table scan across potentially millions of rows; with the index, it performs a fast B-tree range scan in O(log n) time.

2. **`WaterReading.deviceId` (B-tree index)** — We always filter readings by device ID, so this index speeds up all per-device queries.

3. **`ElectricityReading.timestamp` and `ElectricityReading.deviceId`** — Same rationale as above for the electricity readings table.

4. **`Alert.deviceId` and `Alert.isResolved`** — The alerts panel queries for unresolved alerts per device frequently; a composite index on `(deviceId, isResolved)` makes this query very fast.

5. **`Device.deviceId` (unique index)** — Enforces uniqueness of device identifiers and speeds up device lookups by ID.

---

**Q: What is a database index? Why does it matter?**  
**A:** A database index is an **auxiliary data structure** — typically a B-tree (balanced tree) — maintained by the database engine alongside a table that maps the values of one or more columns to the physical locations of the rows containing those values. Without an index, to find all rows where `timestamp > '2026-09-22 00:00:00'`, PostgreSQL must read every single row in the table from disk and check the timestamp — this is called a **full table scan** with O(n) time complexity, where n is the number of rows. With a B-tree index on `timestamp`, PostgreSQL can binary-search the index tree in O(log n) time to find the first matching row and then scan forward sequentially, which is vastly faster. For our system, which stores a reading every 5 seconds and will accumulate over 17,000 rows per day, a full table scan for a 24-hour range query would be slow even on modern hardware, while an indexed query returns in milliseconds. The trade-off is that indexes consume additional disk space (typically 10–30% of the table size) and slightly slow down `INSERT` operations because the index must be updated with every new row.

---

**Q: How do you query readings for a specific time range?**  
**A:** We use Prisma's `findMany` method with a `where` clause that uses the `gte` (greater than or equal) and `lte` (less than or equal) comparison operators on the `timestamp` field. For example, to retrieve all water readings for the current day:

```typescript
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);

const readings = await prisma.waterReading.findMany({
  where: {
    deviceId: "esp32_01",
    timestamp: {
      gte: startOfDay,
      lte: endOfDay,
    },
  },
  orderBy: { timestamp: 'asc' },
});
```

Prisma translates this into the SQL: `SELECT * FROM "WaterReading" WHERE "deviceId" = $1 AND "timestamp" >= $2 AND "timestamp" <= $3 ORDER BY "timestamp" ASC`, with all values safely parameterized. For hourly aggregation (used by the chart endpoints), we use Prisma's `$queryRaw` with `DATE_TRUNC('hour', timestamp)` to group readings into hourly buckets and average the values within each bucket.

---

**Q: What is a cuid() and why use it as a primary key?**  
**A:** A CUID (Collision-Resistant Unique Identifier) is a string-format unique identifier generated by the `@paralleldrive/cuid2` library, designed to be globally unique without requiring coordination between servers. A typical CUID looks like `clzfj9x0t0000mj0h3b2c4d5e`. We use `@default(cuid())` as the primary key type in our Prisma schema instead of auto-incrementing integers for the following reasons: (1) **Distributed safety** — if we ever run multiple backend instances or shard the database, CUIDs are guaranteed unique across all instances without coordination, whereas auto-increment integers would conflict. (2) **No information leakage** — a sequential integer primary key (1, 2, 3...) reveals the total number of records in the table to anyone who sees an ID in an API response; a CUID reveals nothing. (3) **URL safety** — CUIDs contain only lowercase alphanumeric characters, making them safe to use directly in URLs without encoding. The trade-off compared to integers is slightly larger storage (a CUID is ~24 characters vs. 4–8 bytes for an integer) and marginally slower index lookups due to string comparison, which is acceptable at our data scale.

---

## 6. REST API Questions

**Q: What REST API endpoints does your system expose?**  
**A:** Our backend exposes the following REST API endpoints under the base path `/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/water/current` | Latest water reading for a device (flow rate, total volume) |
| `GET` | `/api/water/today` | Aggregated water consumption for the current day |
| `GET` | `/api/water/history` | Historical water readings for a time range (with `from`, `to`, `deviceId` query params) |
| `GET` | `/api/electricity/current` | Latest electricity reading (voltage, current, power) |
| `GET` | `/api/electricity/today` | Aggregated electricity consumption for the current day |
| `GET` | `/api/electricity/history` | Historical electricity readings for a time range |
| `GET` | `/api/alerts` | List of alerts, with optional `resolved`, `deviceId`, and `type` filters |
| `PUT` | `/api/alerts/:id/resolve` | Mark a specific alert as resolved |
| `GET` | `/api/devices` | List of all registered devices and their online status |
| `GET` | `/api/health` | Backend health check — returns `{ "status": "ok" }` |

All endpoints return JSON responses. Error responses follow a consistent structure: `{ "error": "message", "details": [...] }`.

---

**Q: What is the difference between GET /water/current and GET /water/today?**  
**A:** `GET /api/water/current` returns the **most recent single reading** from the `WaterReading` table — essentially a snapshot of what the sensor reported at the last publish interval. The response contains the instantaneous flow rate (e.g., 6.2 L/min), the cumulative total volume since the device was first powered on, and the timestamp of that reading. This endpoint is used by the real-time gauges on the dashboard. In contrast, `GET /api/water/today` returns **aggregated statistics for the current calendar day** — specifically: total daily volume consumed (in liters), average flow rate over all readings today, maximum and minimum flow rates, and an array of hourly volume buckets for the bar chart. This endpoint queries the database using `DATE_TRUNC('hour', timestamp)` and `GROUP BY` to aggregate multiple readings into hourly summaries, and its response is used to populate the "Today's Consumption" card and the hourly consumption chart on the dashboard.

---

**Q: What HTTP status code does your API return on validation error?**  
**A:** On a validation error — for example, when a required query parameter is missing, a parameter has the wrong type, or a value is outside the allowed range — our API returns **HTTP 422 Unprocessable Entity**. We chose 422 over 400 Bad Request because 400 is intended for syntactically malformed requests (e.g., invalid JSON body), while 422 specifically means the request was syntactically correct but the server could not process it due to semantic validation errors, which is precisely the meaning defined in RFC 4918. The response body contains a JSON object with an `"error"` string and a `"details"` array produced by Zod's `.error.issues` property, which lists each field that failed validation, the validation rule that failed, and a human-readable message. For example, if `from` is not a valid ISO 8601 date string, the response would be: `{ "error": "Validation failed", "details": [{ "path": ["from"], "message": "Invalid date string" }] }`.

---

**Q: How does the frontend fetch data from the API?**  
**A:** The frontend uses two different data-fetching strategies depending on the type of data. For **historical data** displayed in charts — such as today's hourly consumption breakdown or the 7-day trend — the frontend uses the **SWR** library (Stale-While-Revalidate) to fetch data from the REST API. SWR automatically handles caching, periodic revalidation (re-fetching at a configured interval, e.g., every 30 seconds), and loading/error states. For **real-time data** displayed in live gauges — such as the current flow rate and current power — the frontend uses the **Socket.IO WebSocket connection** to receive server-push updates the instant a new reading arrives. This two-pronged approach is deliberate: REST + SWR is sufficient for data that doesn't need subsecond freshness, while WebSocket push eliminates the need for aggressive polling for the live display. The Next.js frontend calls the REST API using the `fetch` API wrapped in SWR hooks, with the API base URL configured via an environment variable (`NEXT_PUBLIC_API_URL`).

---

**Q: Why did you not add authentication to the API?**  
**A:** We deliberately chose not to implement authentication for our current prototype for three reasons. First, this is a **local network deployment** — the Mosquitto broker, Node.js backend, and Next.js frontend all run on the same local area network (LAN) as the ESP32 device, behind a home router's firewall; the API is not exposed to the internet, so the threat surface is minimal. Second, implementing authentication properly (e.g., JWT-based OAuth 2.0 with refresh tokens, secure password hashing with bcrypt, and rate limiting) is a significant engineering effort that was outside the scope of this college project phase. Third, for a **single-user home monitoring system**, the security model is simple — if you're on the home network, you're an authorized user. That said, we acknowledge this is a major limitation for any production deployment; our stated future work includes adding JWT-based authentication for the REST API and a user login page to the dashboard, as well as enabling TLS encryption on the MQTT broker connection.

---

## 7. WebSocket / Real-Time Questions

**Q: How does the dashboard update in real-time without page refresh?**  
**A:** The dashboard uses **Socket.IO WebSockets** to receive server-push updates. When a user opens the dashboard in their browser, the Next.js frontend establishes a persistent WebSocket connection to the Node.js backend using the Socket.IO client library. This connection stays open for as long as the user has the page open. On the server side, whenever a new sensor reading is processed from the MQTT broker, the backend emits a Socket.IO event — for example, `socket.emit('water_update', readingData)` — to all connected clients. The frontend has registered event listener callbacks for these events, and when the event arrives, the React state is updated with the new data, causing React to re-render only the affected components (the gauge, the current value display) without requiring a full page reload or any user action. This gives the user the experience of watching the water and electricity values update live as the sensors report them.

---

**Q: What is a WebSocket?**  
**A:** A WebSocket is a **full-duplex, bidirectional communication protocol** that operates over a persistent TCP connection between a client (browser) and a server. Unlike HTTP, which is a request-response protocol where the client must initiate every communication, WebSockets allow the **server to push data to the client at any time** without the client having to ask. The WebSocket protocol starts with an HTTP handshake (an "upgrade" request), and once upgraded, the connection becomes a persistent, low-overhead binary protocol. Each WebSocket frame has a header of only 2–14 bytes, making it extremely efficient for high-frequency, small-message communication. WebSockets are ideal for our use case because sensor readings arrive every 5 seconds — using HTTP polling to achieve the same near-real-time experience would require the client to send an HTTP request every second or two, generating unnecessary network traffic and server load.

---

**Q: What is Socket.IO and why use it instead of raw WebSocket?**  
**A:** Socket.IO is a JavaScript library that provides **reliable event-driven communication over WebSockets** (with automatic fallback to HTTP long-polling if WebSockets are unavailable). It is built on top of the raw WebSocket API but adds several important features that the raw API lacks. First, **automatic reconnection** — if the WebSocket connection drops (e.g., the user switches from Wi-Fi to mobile data), Socket.IO automatically re-establishes the connection and re-syncs the client state; raw WebSockets require you to implement this yourself. Second, **named events** — instead of parsing raw message strings, Socket.IO allows you to emit and listen for named events like `water_update` and `new_alert`, making the code far more readable and maintainable. Third, **rooms and namespaces** — Socket.IO supports grouping clients into rooms so you can broadcast only to specific subsets of connected clients (e.g., all clients viewing device `esp32_01`), which is useful for multi-device setups. Fourth, **broadcasting** — `io.emit()` sends to all connected clients in one line; raw WebSockets require iterating over all connections manually.

---

**Q: What events does your WebSocket server emit?**  
**A:** Our Socket.IO server emits the following events to connected frontend clients:

| Event Name | Payload | Description |
|------------|---------|-------------|
| `water_update` | `{ deviceId, flowRate, totalVolume, dailyVolume, timestamp }` | Emitted every time a new water reading is processed from MQTT |
| `electricity_update` | `{ deviceId, voltage, current, power, dailyEnergy, timestamp }` | Emitted every time a new electricity reading is processed |
| `new_alert` | `{ id, type, severity, message, value, threshold, deviceId, createdAt }` | Emitted when the anomaly detection engine creates a new alert |
| `alert_resolved` | `{ id, deviceId, resolvedAt }` | Emitted when an alert is marked resolved via the REST API |
| `device_online` | `{ deviceId, timestamp }` | Emitted when the ESP32 connects and publishes an online status |
| `device_offline` | `{ deviceId, timestamp }` | Emitted when the LWT triggers or the heartbeat check fails |

The frontend listens for all these events using `socket.on('event_name', callback)` and updates the React component state in the callback, triggering a re-render with the new data.

---

**Q: What is the difference between polling and WebSocket push?**  
**A:** **HTTP polling** is a strategy where the client (browser) repeatedly sends HTTP requests to the server at a fixed interval — for example, every 2 seconds — asking "do you have new data?" The server responds to each request immediately (short polling) or holds the connection open until data is available (long polling). The key disadvantage of polling is **wasted bandwidth and server resources** — in short polling, most requests receive an empty or unchanged response; even with long polling, there is significant overhead from repeatedly establishing HTTP connections and sending full HTTP headers. **WebSocket push**, on the other hand, maintains a single persistent connection and the server sends data to the client only when new data actually exists — there is no request from the client and no empty responses. For our system, sensor readings arrive every 5 seconds; with WebSocket push, we send exactly one message per reading with minimal overhead. With 1-second polling to achieve comparable responsiveness, we would generate 5× more network traffic, 5× more server-side handler invocations, and the UI would still be up to 1 second behind, compared to the near-zero latency of push.

---

## 8. Next.js Frontend Questions

**Q: Why did you use Next.js instead of plain React?**  
**A:** We chose Next.js over a plain Create React App (CRA) setup for several practical advantages. First, Next.js provides **built-in server-side rendering (SSR) and static site generation (SSG)**, meaning the initial page load delivers pre-rendered HTML — the dashboard is visible to the user immediately rather than displaying a blank screen while JavaScript loads and the browser fetches data. This improves perceived performance, which matters for a monitoring dashboard where users expect instant status visibility. Second, Next.js has a **built-in API routes feature** — we could co-locate simple API handlers within the Next.js project if needed. Third, Next.js includes **built-in code splitting, image optimization, and font optimization** that CRA does not, reducing bundle size without manual configuration. Fourth, Next.js's **App Router** (introduced in v13) with React Server Components allows data fetching to happen on the server, sending pre-fetched data with the initial HTML response. Finally, Next.js is the industry-standard React framework used in production at companies like Vercel, Twitch, and Hulu, giving our project portfolio-ready credentials.

---

**Q: What is the Next.js App Router?**  
**A:** The App Router is the **file-system-based routing system introduced in Next.js 13** that uses the `app/` directory structure (as opposed to the older `pages/` directory). In the App Router, routing is determined by the folder structure — each folder represents a URL segment, and a `page.tsx` file inside that folder becomes the rendered page for that route. For example, `app/dashboard/page.tsx` is served at `/dashboard`. The App Router introduces **React Server Components** as the default — components rendered on the server that can directly `await` database queries or API calls without exposing logic to the browser. Client-side interactive components (those that use `useState`, `useEffect`, or browser APIs like Socket.IO) must be explicitly marked with the `"use client"` directive at the top of the file. In our project, the main dashboard layout, page titles, and data fetching for initial chart data are Server Components, while the real-time gauge components and alert notification components are Client Components because they use Socket.IO event listeners.

---

**Q: What is Tailwind CSS?**  
**A:** Tailwind CSS is a **utility-first CSS framework** that provides a comprehensive set of low-level CSS utility classes — such as `flex`, `p-4`, `text-xl`, `bg-blue-500`, `rounded-lg`, `shadow-md` — that you apply directly to HTML elements in your JSX code to compose any design, without writing any custom CSS. Unlike traditional frameworks like Bootstrap that provide pre-built components (buttons, navbars) with fixed styles, Tailwind gives you building blocks that you compose yourself. The major advantage is that Tailwind uses **PurgeCSS (tree-shaking) in production builds** — it scans all your source files, identifies every utility class that is actually used, and generates a final CSS file containing only those classes. A typical Tailwind production CSS file is only 10–30 KB, compared to Bootstrap's 150+ KB. We chose Tailwind because it integrates seamlessly with Next.js, all team members could learn it quickly since it is essentially inline CSS with a consistent naming convention, and it makes it easy to maintain a consistent design system (spacing, colors, typography) across all dashboard components without maintaining a separate CSS file.

---

**Q: What charting library do you use and why?**  
**A:** We use **Recharts**, a composable charting library for React built on top of D3.js SVG primitives. We chose Recharts for three main reasons. First, it is **React-first by design** — every chart, axis, line, and tooltip is a React component with props, which makes it easy to integrate with React state and update charts reactively when new data arrives via WebSocket. Second, Recharts handles **responsive containers** natively through its `ResponsiveContainer` wrapper component, automatically resizing charts to fill their parent container without custom resize event handling. Third, Recharts has excellent support for our specific chart types: the `LineChart` with `ReferenceLine` for the historical trend with anomaly markers, the `BarChart` for hourly consumption breakdown, the `AreaChart` for the power consumption timeline, and the `RadialBarChart` for the gauge-style displays. An alternative we considered was Chart.js with `react-chartjs-2`, but Recharts' fully declarative, React-idiomatic API was preferred by our frontend team member.

---

**Q: How did you develop the frontend without hardware?**  
**A:** The frontend was developed using a **mock data strategy** that completely decouples the frontend from the hardware and backend. The frontend codebase contains a `lib/mockData.ts` file that exports static and dynamically generated fake sensor readings in exactly the same JSON structure that the real REST API and WebSocket events return. A custom React hook — `useSensorData` — checks an environment variable `NEXT_PUBLIC_USE_MOCK_DATA`; when this is set to `"true"` in the `.env.local` file, the hook returns data from the mock generators instead of making real API calls or Socket.IO connections. The mock data generator creates realistic time-series data: a 24-hour array of hourly readings with natural variation (higher water usage in the morning and evening, higher power in the evening), occasional simulated anomalies, and continuously updating "current" values that increment every 5 seconds using `setInterval`. This allowed Member 3 to design and build the complete dashboard — including all charts, gauges, alert panels, and animations — and have it look fully functional in the browser before any real backend or hardware was available.

---

**Q: What is the mock data strategy?**  
**A:** The mock data strategy is the practice of **replacing real data sources with synthetic, locally generated data** during development, using a configuration switch (environment variable) to toggle between mock and real modes. In our project, the strategy has two layers. The first layer is the **MQTT simulator** (Node.js script) which publishes fake sensor data to the real Mosquitto broker — this allows the backend logic (MQTT processing, database writes, anomaly detection) to be tested without hardware. The second layer is the **frontend mock data module** (`lib/mockData.ts`) which bypasses both the backend and the WebSocket connection entirely, generating synthetic data directly in the browser — this allows the frontend to be developed with zero infrastructure dependencies. The key design principle is that mock data must conform to **exactly the same TypeScript types and JSON schemas** as the real data; this is enforced by importing and reusing the shared Zod schemas and TypeScript type definitions in both the mock module and the real data handlers. When the environment variable `NEXT_PUBLIC_USE_MOCK_DATA` is set to `"false"` (the default in production), all mock code paths are dead code and are tree-shaken out of the production bundle.

---

**Q: What is SWR and why use it for data fetching?**  
**A:** SWR (Stale-While-Revalidate) is a **React data fetching library** developed by Vercel that implements the HTTP stale-while-revalidate cache strategy. The name describes its behavior: when you request data, SWR immediately returns the previously cached (stale) data first so the UI renders instantly with content, then fetches fresh data in the background (revalidate), and when the fresh data arrives, it updates the UI with the new data. In our frontend, we use SWR with a custom `fetcher` function that calls `fetch()` on our REST API endpoints. We configure SWR to automatically re-fetch every 30 seconds (`refreshInterval: 30000`) for historical chart data, and to re-fetch when the browser window regains focus (the user switches back to the dashboard tab). SWR also handles loading states (`data === undefined`), error states (`error !== undefined`), and automatic retry on failure. The key reason we chose SWR over `useEffect` + `fetch` is that SWR eliminates a large amount of boilerplate state management code — you don't need `useState` for loading, error, and data states, and you don't need to manage cache invalidation manually.

---

**Q: How does Member 3 switch from mock data to real API?**  
**A:** The switch is a **single environment variable change** in the `.env.local` file. During development, Member 3's `.env.local` contains:
```
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```
To switch to the real backend (once Member 2's backend is running and Member 1's hardware is connected), Member 3 simply changes:
```
NEXT_PUBLIC_USE_MOCK_DATA=false
```
and restarts the Next.js development server. No code changes are required. The `useSensorData` hook checks this environment variable at startup and selects either the mock data generator or the real SWR fetcher + Socket.IO connection. This design was intentional — the integration contract (the JSON schema and Socket.IO event structure) was agreed upon by all three members in the `docs/INTEGRATION_CONTRACT.md` at the start of the project, and both the mock data and the real backend conform to this contract, making the switch seamless.

---

## 9. Anomaly Detection Questions

**Q: What type of anomaly detection do you use?**  
**A:** We use **rule-based statistical anomaly detection** with adaptive baselines. This means we define explicit numerical thresholds for each measurement type — for example, "if flow rate exceeds 20 L/min while the system has been idle for more than 30 minutes, trigger a potential leak alert." These rules are evaluated by the backend every time a new sensor reading is processed from the MQTT broker. We do not use machine learning or neural networks in the current prototype. The rules are divided into two categories: **static threshold rules** (absolute limits, such as voltage outside the 200–250V safe range) and **dynamic baseline rules** (comparing current consumption to a rolling baseline calculated from the past 7 days of historical data at the same time of day). This hybrid approach allows the system to adapt to different households' usage patterns while still having hard safety limits.

---

**Q: Is your anomaly detection AI or machine learning?**  
**A:** No — our current anomaly detection is **not AI or machine learning**. It is explicit, hand-crafted rule-based logic written in TypeScript that evaluates mathematical conditions (greater than, less than, rate of change) on incoming sensor readings. This is a deliberate design choice for our prototype: rule-based systems are **interpretable** (we can explain exactly why an alert was triggered), **deterministic** (the same inputs always produce the same output), **fast** (no model inference overhead), and require **no training data** (we don't need months of historical readings before the system can function). The trade-off is that our rules cannot automatically discover complex, non-obvious patterns — for example, a gradually increasing baseline leak that never exceeds a single threshold reading but accumulates significantly over a month. We explicitly acknowledge this limitation and describe in our future work section how we would implement ML-based anomaly detection using isolation forests or LSTM neural networks as the system accumulates sufficient historical data.

---

**Q: What is a baseline in your system?**  
**A:** A baseline in our system is a **statistical reference value for normal consumption** that is computed from historical sensor data. Instead of using a single fixed threshold for everyone — which would generate too many false positives in a high-consumption household and miss anomalies in a low-consumption one — we compute a personalized baseline that reflects each household's own typical usage patterns. Specifically, our baseline for a given hour of the day is the **arithmetic mean of all readings from the same hour of the day in the past 7 days**, calculated using a database query that groups readings by `DATE_TRUNC('hour', timestamp)` and averages the consumption values within each hour. For example, the baseline for "water flow at 7 AM" is the average of all water flow readings between 7:00–7:59 AM over the last 7 days. If the system has fewer than 3 days of historical data, it falls back to global static thresholds, as the baseline is not yet statistically meaningful.

---

**Q: How do you calculate the baseline?**  
**A:** The baseline is calculated by the backend's `AnomalyDetectionService` on a scheduled basis (every hour using `setInterval`) using a Prisma `$queryRaw` database query. The query groups historical readings by hour-of-day and computes the average and standard deviation of consumption for each hour:

```sql
SELECT
  EXTRACT(HOUR FROM timestamp) AS hour_of_day,
  AVG("flowRate") AS avg_flow,
  STDDEV("flowRate") AS std_flow
FROM "WaterReading"
WHERE
  "deviceId" = $1
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM timestamp)
ORDER BY hour_of_day;
```

The results are stored in an in-memory object (a Map from hour-of-day to `{avg, std}`). When a new reading arrives, the anomaly service looks up the baseline for the current hour and calculates how many standard deviations the current reading is from the mean — the **z-score**. A z-score above 2.0 triggers a "possible abnormal" alert (95th percentile), and above 3.0 triggers a "confirmed anomaly" alert (99.7th percentile under a normal distribution assumption).

---

**Q: What thresholds do you use for water anomaly?**  
**A:** Our water anomaly detection uses the following hierarchical threshold rules, evaluated in order of severity:

1. **Continuous flow alert (leak indicator):** If `flowRate > 0.5 L/min` for more than **30 continuous minutes** at a time when the baseline flow is effectively zero (late night, e.g., 1 AM–5 AM), trigger a `WATER_LEAK` alert with `HIGH` severity. This detects a continuously running tap, dripping toilet fill valve, or burst pipe that has been left running.

2. **High instantaneous flow:** If `flowRate > 25 L/min` (exceeding the maximum expected single-tap flow for household plumbing), trigger a `HIGH_WATER_USAGE` alert with `MEDIUM` severity. This detects a burst pipe or an open hose without a nozzle.

3. **Abnormal daily volume:** If `dailyVolume` exceeds `baseline_daily_volume × 2.5` (2.5× the 7-day average daily consumption), trigger a `HIGH_WATER_USAGE` alert with `LOW` severity. This detects gradual over-consumption over the course of a day.

4. **Z-score spike:** If the current 5-minute average flow rate is more than 3 standard deviations above the baseline for the current hour, trigger a spike alert.

---

**Q: What thresholds do you use for electricity anomaly?**  
**A:** Our electricity anomaly detection uses the following rules:

1. **Voltage out of safe range:** If `voltage < 200V` or `voltage > 250V`, trigger a `VOLTAGE_ANOMALY` alert with `HIGH` severity. The IS 12360 standard specifies ±6% tolerance around 230V (nominally 216.2V–243.8V), and we use slightly wider bounds (200–250V) to avoid over-alerting on brief transients.

2. **Overcurrent:** If `current > 15A` (the typical Indian household circuit breaker rating for a 15A fuse board), trigger a `HIGH_POWER` alert with `HIGH` severity, as this indicates risk of circuit overload.

3. **High instantaneous power:** If `power > 3000W` (unusual for a single monitored circuit without industrial equipment), trigger a `HIGH_POWER` alert with `MEDIUM` severity.

4. **Abnormal daily energy:** If `dailyEnergy > baseline_daily_energy × 2.0` (double the 7-day average daily energy consumption), trigger a `HIGH_POWER` alert with `LOW` severity. This detects appliances left on by accident (e.g., AC unit running all day while the user is at work).

5. **Z-score power spike:** If current power is more than 3 standard deviations above the hourly baseline power, trigger a power spike alert.

---

**Q: What is the difference between 'possible abnormal usage' and 'confirmed leak'?**  
**A:** These two alert types differ in **confidence level, duration, and evidence required**. A **"Possible Abnormal Usage"** alert (severity: `MEDIUM`) is triggered when a single reading or a short-term average (5 minutes) exceeds the statistical threshold for the current time-of-day baseline by more than 2 standard deviations. It is a **probabilistic warning** — there is a 1-in-20 chance (at the 2σ level) that this is a false positive caused by natural variation. It should prompt the user to check whether an unusual activity is underway (e.g., filling a large tank, watering the garden). A **"Confirmed Leak"** alert (severity: `HIGH`) is triggered only when **non-zero flow has been detected continuously for more than 30 minutes during a time window when baseline flow is expected to be zero** (typically 1 AM–5 AM when all household occupants are asleep). This multi-condition requirement makes a false positive extremely unlikely — it is very unlikely that a legitimate activity produces sustained flow in the early morning hours for half an hour. The confirmed leak alert triggers a high-priority notification and an email in our future roadmap.

---

**Q: How would you add machine learning to anomaly detection in the future?**  
**A:** We would approach ML-based anomaly detection in two phases. In the first phase, once the system has accumulated at least 3–6 months of sensor data, we would implement an **Isolation Forest** model — an unsupervised tree ensemble algorithm specifically designed for anomaly detection that works by isolating outlier data points that require fewer splits in a random decision tree. We would train it offline using Python's `scikit-learn` on the historical PostgreSQL data (exported as CSV), serialize the trained model to ONNX format, and serve inference via a lightweight Python FastAPI microservice that the Node.js backend calls via HTTP. In the second phase, for detecting temporal anomalies that have a time component (like a gradually increasing nightly leak over weeks), we would implement an **LSTM (Long Short-Term Memory) autoencoder** — a recurrent neural network that learns to reconstruct normal time-series patterns and flags readings with high reconstruction error as anomalous. The advantage of ML over our current rule-based approach is that ML can discover complex, non-linear patterns that no human-defined rule would capture.

---

**Q: What is duplicate suppression and why is it needed?**  
**A:** Duplicate suppression is a mechanism in the anomaly detection engine that **prevents the same anomaly condition from generating multiple alerts** within a short time window. Without it, if a water leak causes above-threshold flow readings for 30 minutes, the system would generate one alert for each 5-second MQTT reading during that 30-minute window — potentially 360 identical `WATER_LEAK` alerts flooding the dashboard. This would make the alerts panel unusable and cause alert fatigue. Our implementation suppresses duplicates by maintaining an in-memory `Map<string, Date>` called `lastAlertTime`, keyed by `deviceId + alertType`. Before creating a new alert, the anomaly service checks whether an alert of the same type for the same device was already created within a **cooldown period** — 15 minutes for `MEDIUM` severity and 30 minutes for `HIGH` severity. If the cooldown has not elapsed, the new alert is not created. The alert is also not suppressed if the existing alert has already been resolved by the user, since a new occurrence of the same issue after resolution is a new, distinct event.

---

**Q: What is a false positive? How do you minimize it?**  
**A:** A false positive is an alert that is triggered **when there is no actual anomaly** — the system incorrectly classifies normal behavior as abnormal. For example, if a user fills a large overhead water tank once a week, the high flow rate during filling might trigger a "High Water Usage" alert even though it is a completely normal, intentional activity. False positives are problematic because they cause **alert fatigue** — users start ignoring all alerts, including genuine ones, if too many false alarms occur. We minimize false positives through four strategies: (1) **Adaptive baselines** — using the 7-day rolling historical baseline means the system adapts to each household's specific usage patterns rather than using fixed global thresholds. (2) **Time-windowed rules** — confirmed leak alerts only trigger during late-night hours when legitimate flow is extremely unlikely. (3) **Duration requirements** — anomalies must persist for multiple consecutive readings (sustained condition) rather than triggering on a single spike. (4) **Duplicate suppression with cooldown periods** — prevents repeated alerting for the same ongoing condition. (5) **Conservative z-score thresholds** — using 2–3 standard deviations rather than 1 means only statistically extreme readings generate alerts.

---

## 10. Design Decision Questions

**Q: Why MQTT instead of HTTP for IoT data?**  
**A:** MQTT was chosen over HTTP because it is architecturally better suited for the specific constraints of our IoT use case. HTTP is a **request-response protocol**: the ESP32 would need to initiate an HTTP POST request every 5 seconds, wait for the server to respond, handle connection timeouts and retries, and re-establish a new TCP connection for each request. MQTT, in contrast, is a **publish-subscribe protocol** with a persistent connection: the ESP32 connects once and keeps the TCP connection alive, then publishes with 2-byte overhead messages. MQTT also provides QoS guarantees, Last Will and Testament, and retained messages — features that are built into the protocol and would require significant custom implementation to replicate over HTTP. For a sensor publishing data continuously at a fixed interval for months or years, MQTT's connection efficiency and protocol-level reliability features make it the clear engineering choice. This is also why MQTT is the de facto standard for IoT protocols in the industry, used by AWS IoT Core, Azure IoT Hub, and Google Cloud IoT.

---

**Q: Why not connect the ESP32 directly to PostgreSQL?**  
**A:** Connecting the ESP32 directly to PostgreSQL is technically infeasible and architecturally incorrect for several reasons. First, the PostgreSQL wire protocol is a complex, stateful, authentication-heavy TCP protocol that requires a significant client library — the libpq library alone is 500+ KB, far exceeding the ESP32's 520 KB of SRAM. There is no stable PostgreSQL client that fits within the ESP32's memory constraints. Second, PostgreSQL is designed to be accessed over a secure, reliable local or VPN connection — exposing it directly to an IoT device that connects over Wi-Fi from a field environment would be a severe security risk (database credentials in firmware, no TLS, risk of direct SQL injection). Third, direct database connections are **not scalable** — a PostgreSQL server supports a limited number of concurrent connections (typically 100); if we had many IoT devices, each holding an open database connection would exhaust the connection pool. Fourth, architecturally, the backend application layer serves as a **data gateway** that validates, transforms, enriches, and rate-limits incoming data before it reaches the database, protecting the database from malformed input or flooding.

---

**Q: Why PostgreSQL instead of MongoDB?**  
**A:** We chose PostgreSQL over MongoDB because our data model is **inherently relational and uniformly structured**, which plays to PostgreSQL's strengths. Every sensor reading has the same fixed fields — there are no optional or variable attributes that would benefit from MongoDB's flexible document model. Our query patterns — time-range filtering, hourly aggregation with GROUP BY, joining readings with alerts, computing averages and sums — are precisely the operations that relational databases with SQL are optimized for. MongoDB's aggregation pipeline can perform these operations, but the syntax is significantly more complex than SQL for standard analytical queries. PostgreSQL's `DATE_TRUNC`, window functions, and strong ACID guarantees for financial-grade data make it the better tool for this use case. MongoDB would have been a better choice if we needed to store variable-format data (e.g., device telemetry with different fields per device type) or needed horizontal sharding at massive scale from day one, neither of which applies to our project.

---

**Q: Why Node.js instead of Python?**  
**A:** We chose Node.js over Python (Flask/FastAPI) as our primary backend because of **team familiarity and ecosystem fit**. All three team members already know JavaScript from web development coursework, so using Node.js eliminated the need to learn a new language for the backend, reducing the project's risk. From an ecosystem perspective, the Node.js npm ecosystem has mature, well-maintained libraries for every component of our backend: `mqtt` for MQTT, `socket.io` for WebSockets, `express` for REST API, and `@prisma/client` for the ORM. The Node.js **event loop model** is particularly well-suited for our backend's workload, which is I/O-bound (waiting for MQTT messages, database queries, and API requests) rather than CPU-bound (no heavy computation). Python would have been a stronger choice if we were doing significant numerical computing, data science, or ML inference, since libraries like NumPy, Pandas, and scikit-learn are unmatched in Python. We do plan to use Python for the ML-based anomaly detection service in a future phase, running it as a separate microservice.

---

**Q: Why Next.js instead of Create React App?**  
**A:** We chose Next.js over Create React App (CRA) because Next.js provides **server-side rendering and superior developer experience** without requiring manual configuration. CRA is a client-side-only React setup — the server sends an almost-empty HTML file with a large JavaScript bundle, and the browser must download, parse, and execute the JavaScript before the user sees any content. For a monitoring dashboard, this means a blank screen for several seconds on the initial load, which is poor UX. Next.js's Server-Side Rendering (SSR) sends fully-rendered HTML on the first request — the user sees the complete dashboard structure, including pre-fetched chart data, immediately. Additionally, Create React App was officially deprecated by the React team in 2023 and is no longer recommended for new projects; the React documentation now recommends framework-based approaches like Next.js. Next.js also provides automatic code splitting, route-based lazy loading, image optimization, and built-in TypeScript support, all of which would require manual webpack and babel configuration in a CRA project.

---

**Q: Why Prisma instead of raw SQL or Sequelize?**  
**A:** We chose Prisma over raw SQL because we wanted **compile-time type safety for all database operations**, which raw SQL strings cannot provide. With raw SQL, a typo in a column name is a runtime error; with Prisma, it is a compile-time TypeScript error. We considered Sequelize (the older Node.js ORM) but chose Prisma for three reasons: (1) Prisma's schema-first approach with `schema.prisma` provides a **single source of truth** for the database structure that auto-generates both the migration SQL and the TypeScript client types, whereas Sequelize requires you to define your models separately in JavaScript classes. (2) Prisma's generated client has **superior TypeScript types** — every query result is fully typed based on the selected fields, including nested relations. (3) Prisma's **Prisma Studio** GUI provides a visual database browser for exploring and editing data during development, which was very useful for our team. The main downside of Prisma is that very complex queries (recursive CTEs, advanced window functions) require using `$queryRaw`, which loses type safety; we use this escape hatch only for the hourly aggregation queries.

---

**Q: Why Socket.IO instead of raw WebSocket?**  
**A:** We chose Socket.IO over raw WebSockets because Socket.IO provides **automatic reconnection, named events, and cross-browser compatibility** that raw WebSocket does not. Raw WebSocket's browser API does not automatically reconnect when the connection drops — you must write the reconnection logic yourself (typically an exponential backoff loop). Socket.IO handles reconnection transparently on both the client and server side. Raw WebSocket sends raw strings or binary buffers — you must implement your own message-type routing by including a type field in every message and writing a dispatch switch statement. Socket.IO's named event system (`socket.on('water_update', ...)`) handles this routing automatically and cleanly. Finally, Socket.IO falls back to HTTP long-polling in environments where WebSocket connections are blocked by a corporate proxy or firewall, ensuring connectivity in edge cases. The trade-off is that Socket.IO adds a small library overhead (about 40 KB on the client), but this is negligible for a dashboard application.

---

**Q: Why did you not use cloud MQTT (like HiveMQ or AWS IoT)?**  
**A:** We deliberately chose a **local Mosquitto broker** over a cloud MQTT service for reasons specific to our college project context. First, using a cloud service introduces **cost and account dependencies** — cloud IoT services like AWS IoT Core charge per message, per connection, or per device, and require creating and managing cloud accounts, IAM roles, and TLS certificates. For a college demonstration project, this adds unnecessary complexity and potential cost. Second, our project is designed as a **local area network system** where the ESP32, broker, and backend all reside on the same home network, which eliminates internet latency entirely and makes the system functional even during internet outages. Third, a local broker gives us complete control over configuration and is sufficient for a single-device prototype. Fourth, the architecture is designed so that migrating to a cloud broker in the future would require only changing the broker URL in the ESP32 firmware and backend configuration — no code changes to the MQTT logic itself, because MQTT is a standard protocol regardless of broker.

---

**Q: Why did you choose rule-based anomaly detection over ML?**  
**A:** We chose rule-based detection over ML for four practical reasons specific to our project stage. First, **data availability**: machine learning models require large amounts of labeled training data to learn normal and anomalous patterns — at the start of this project, we had zero historical readings. Rule-based systems work from day one. Second, **interpretability**: when our system generates an alert, we can explain exactly why — "flow rate was 18.5 L/min at 2 AM against a baseline of 0.3 L/min." ML models, especially neural networks, are black boxes — they generate anomaly scores without clear explanations, which is problematic for a safety-critical monitoring application. Third, **computational simplicity**: rule evaluation is a few arithmetic comparisons that execute in microseconds; ML inference on an IoT-relevant dataset requires a trained model, a runtime environment (Python + sklearn or TensorFlow), and at least hundreds of milliseconds of inference time per reading. Fourth, **project scope**: implementing, training, validating, and deploying an ML model is a significant engineering and data science effort that was beyond the scope of a one-semester college PBL project. ML is explicitly listed in our future work.

---

**Q: Why did you not add user authentication?**  
**A:** Authentication was excluded from the current prototype because it is a **local network home monitoring system**, not a publicly accessible web application. The system runs on a private home LAN behind a router's NAT firewall — the dashboard is only accessible from within the home network, and the intended user population is a single family. Implementing authentication correctly — with secure password hashing (bcrypt), session management, CSRF protection, JWT refresh token rotation, and account recovery — is a non-trivial security engineering problem where mistakes can be worse than no authentication at all (e.g., storing passwords in plain text, using weak secrets for JWT signing). Given the project's primary educational focus on IoT sensor integration, MQTT protocols, and real-time data visualization, we prioritized getting the core technical features working over adding authentication. We acknowledge this is a significant gap for any production or internet-facing deployment, and our future work section describes a planned JWT-based authentication system using NextAuth.js for the frontend and a bearer token middleware for the REST API.

---

## 11. Team Collaboration Questions

**Q: How did you work as a team when Member 1 has hardware and others don't?**  
**A:** We addressed this challenge through **interface-first contract design and mock data layers**. At the project's kickoff, all three members collaboratively defined and documented the **integration contract** in `docs/INTEGRATION_CONTRACT.md` — specifying the exact JSON payload format for every MQTT topic, the exact shape of every REST API response, and every Socket.IO event and its payload structure. Once these contracts were agreed upon and version-controlled, each member could work independently. Member 1 (hardware) built the ESP32 firmware to produce payloads matching the MQTT contract. Member 2 (backend) built the processing pipeline using the MQTT simulator to generate realistic fake data matching the same contract, without needing the ESP32. Member 3 (frontend) built the dashboard using the mock data module that returns data in the same format as the real API. Integration happened once per sprint — Member 1 connected the ESP32 to the local network with the Mosquitto broker, and the team verified end-to-end data flow from sensor to dashboard in a joint testing session.

---

**Q: What is the integration contract between members?**  
**A:** The integration contract is a formal agreement documented in `docs/INTEGRATION_CONTRACT.md` that specifies the exact data interfaces between all system components. It defines three things. First, the **MQTT payload schemas**: the exact JSON structure, field names, data types, and units for the `water` and `electricity` MQTT topics — for example, `flowRate` is a Number in L/min (not mL/min, not a String). Second, the **REST API specification**: for every endpoint, the contract defines the URL, HTTP method, request parameters (names, types, required/optional), the response JSON structure, and the HTTP status codes for success and error cases. Third, the **Socket.IO event catalogue**: for every WebSocket event, the contract defines the event name string, the payload structure, and when the event is emitted. Any change to these interfaces requires a discussion and a version update to the contract document — no member can unilaterally rename a field or change a data type without updating the contract and notifying the team, because such a change would silently break the other members' code.

---

**Q: How did you ensure API compatibility between frontend and backend?**  
**A:** We ensured API compatibility through **shared TypeScript types and runtime validation with Zod**. The project is structured as a monorepo with a shared `packages/types` directory containing the Zod schemas and TypeScript types for all API request/response shapes. Both the backend (which creates API responses) and the frontend (which consumes them) import types from this shared package. When the backend changes a response shape, it updates the shared type, which immediately causes TypeScript compilation errors in the frontend wherever the old type was used — the TypeScript compiler effectively enforces API compatibility across the codebase. Additionally, the backend validates all API response objects against the Zod schemas before sending them (in development mode), and the frontend validates API responses on receipt using `safeParse`, so type mismatches are caught with clear error messages rather than undefined property errors. We also wrote a simple integration test that starts the backend, calls every API endpoint, and validates the response against the shared Zod schema.

---

**Q: What would have happened if a member changed a field name unilaterally?**  
**A:** If a member changed a field name in their component without updating the shared contract — for example, if Member 2 renamed the JSON field `flowRate` to `flow_rate` in the backend API response without telling Member 3 — the consequence would depend on whether TypeScript caught it. Since both members import from the shared type definitions in `packages/types`, changing `flowRate` to `flow_rate` in the shared type would cause TypeScript compilation errors immediately in the frontend wherever `data.flowRate` is referenced — the compiler would say "Property 'flowRate' does not exist on type ...". This is the **happy path**: TypeScript catches the breaking change before it ever reaches production. However, if the shared types were not updated (the member only changed the backend code, not the shared type), the TypeScript type would still say `flowRate` exists, so there would be no compile error — instead, `data.flowRate` would silently return `undefined` at runtime, causing chart gauges to show "NaN" or "--" values. This scenario — the subtle runtime failure mode — is why we also have the runtime Zod validation on the frontend: `safeParse` would detect the missing `flowRate` field and log a clear error.

---

**Q: How did you use Git for team collaboration?**  
**A:** We used Git with a **feature-branch workflow** hosted on GitHub. The repository has three long-lived branches: `main` (production-ready, stable), `dev` (integration branch where all feature branches are merged), and `hardware` (Member 1's firmware code that does not need frequent merging with the others). Each team member works on short-lived feature branches named according to the pattern `feature/<member>-<description>` — for example, `feature/member2-anomaly-detection` or `feature/member3-dashboard-charts`. When a feature is complete, the member opens a **Pull Request (PR)** targeting the `dev` branch, the other members do a brief code review, and the PR is merged with a squash commit. We use `.gitignore` to exclude `node_modules/`, `.env*` files, `prisma/migrations/` build artifacts, and compiled TypeScript output. Environment-specific configuration (database connection strings, MQTT broker address, API URLs) is managed through `.env` files that are not committed; instead, a `.env.example` file with placeholder values is committed, and each member fills in their actual values locally.

---

## 12. Limitations and Future Work Questions

**Q: What are the limitations of your current system?**  
**A:** Our current system has the following documented limitations:

1. **Single device only** — the dashboard and database schema currently assume one ESP32 unit; multi-device support requires additional filtering UI and database queries, though the architecture supports it.
2. **No authentication** — the REST API and dashboard are accessible to anyone on the local network without a login, which is unsuitable for internet-facing deployment.
3. **Unity power factor assumption** — the electricity measurement assumes all loads are purely resistive, which underestimates power consumption for inductive loads (motors, fans, compressors) and overstates it for capacitive loads.
4. **Non-billing-grade accuracy** — sensor accuracy of ±3–5% is unsuitable for financial billing or utility dispute resolution.
5. **In-RAM energy accumulation** — if the ESP32 resets, the in-RAM cumulative energy and volume totals are lost until the backend recalculates them from stored readings.
6. **Rule-based anomaly detection** — cannot discover complex, gradual, or non-obvious anomaly patterns that ML would detect.
7. **No MQTT TLS** — communication between the ESP32 and Mosquitto is unencrypted, making it vulnerable to eavesdropping on the LAN (though not over the internet).
8. **No mobile app** — the dashboard is a responsive web application but is not available as a native mobile push notification app.

---

**Q: How would you improve anomaly detection?**  
**A:** We would improve anomaly detection in three progressive stages. In the **short term**, we would add more sophisticated rule refinements — specifically, detecting gradual trends using a linear regression over the past 24 readings (slope-based leak detection) and adding seasonality awareness (weekday vs. weekend baselines). In the **medium term**, once the system has 3+ months of data, we would implement an **Isolation Forest** or **One-Class SVM** model trained offline on normal readings, serialized to ONNX, and served by a Python microservice. The Node.js backend would call this microservice with each new reading and receive an anomaly score. In the **long term**, we would implement an **LSTM Autoencoder** — a sequence-to-sequence neural network trained on multi-variate time-series windows (water + electricity together) that learns normal joint patterns. A burst pipe event, for example, produces a characteristic joint signature (high water flow + normal power) that the LSTM can learn to distinguish from normal morning shower usage (brief high water flow + high power from the geyser). We would also add **user feedback**: when a user resolves an alert as a false positive, that label is stored and used to retrain or fine-tune the model over time.

---

**Q: How would you make this production-ready?**  
**A:** Making this system production-ready would require improvements across all layers. At the **security layer**: add MQTT TLS (enable SSL on Mosquitto with Let's Encrypt certificates), add JWT-based authentication to the REST API and dashboard (using NextAuth.js), and validate ESP32 device identity with X.509 certificates. At the **reliability layer**: deploy the backend and database in Docker containers with a `docker-compose.yml` that handles restarts on failure; configure PostgreSQL with regular automated backups using `pg_dump`; add a process manager (PM2 or systemd) to ensure Node.js restarts after crashes; and persist the ESP32's energy and volume accumulators to NVS flash. At the **observability layer**: add structured logging (using `pino` or `winston`) with log shipping to a centralized log aggregator; add health check endpoints; and configure alerting on backend health metrics. At the **accuracy layer**: replace the ZMPT101B + ACS712 combination with a dedicated energy metering IC (ATM90E32) for ±1% accuracy. At the **scalability layer**: add a connection pooler (PgBouncer) in front of PostgreSQL and implement horizontal scaling for the Node.js backend behind a load balancer.

---

**Q: How would you scale to 100 devices?**  
**A:** Scaling to 100 ESP32 devices requires changes at the broker, backend, and database layers. At the **MQTT broker layer**: a single Mosquitto instance can handle thousands of concurrent connections, so 100 devices is well within its capacity; we would configure persistence and a dedicated bridge for high availability. At the **backend layer**: a single Node.js process can handle the MQTT subscriber load for 100 devices, but we would restructure the message processing into a **queue-based architecture** (using BullMQ with Redis) — the MQTT subscriber enqueues readings, and a pool of worker processes dequeues and processes them in parallel, isolating the message ingestion layer from the processing layer. At the **database layer**: 100 devices × 12 readings/minute × 60 × 24 = 1,728,000 rows per day in the readings tables — this is manageable with PostgreSQL, but we would add **table partitioning by month** on the timestamp column, so queries for recent data only scan the current month's partition. We would also add a **TimescaleDB extension** to PostgreSQL, which is purpose-built for time-series data and provides automatic partitioning, compression (10–90% space savings), and optimized time-series aggregate queries. At the **frontend layer**: the dashboard would need a device selector to filter the display to one device at a time.

---

**Q: What features would you add next?**  
**A:** The immediate next features we would add, in priority order, are:

1. **Email and push notifications for alerts** — integrating with an email service (Nodemailer + Gmail SMTP or SendGrid) and a push notification service (Firebase Cloud Messaging or Web Push API) so that high-severity alerts (confirmed leak, overvoltage) are delivered to the user's phone even when the dashboard is not open.

2. **User authentication** — adding a login page with JWT-based authentication using NextAuth.js on the frontend and a bearer token middleware on the backend REST API, so the dashboard is not accessible without credentials.

3. **Billing integration** — adding a user-configurable tariff screen where the user enters their electricity rate per kWh (e.g., ₹6.50/kWh) and water rate per kiloliter, and the dashboard automatically calculates and displays the estimated bill for the current month alongside the consumption data.

4. **Mobile app** — building a React Native companion app using Expo that shows a simplified dashboard and receives native push notifications for alerts.

5. **Multi-room support** — supporting multiple ESP32 units (one per room or per appliance circuit) with a room-by-room breakdown view on the dashboard.

6. **Automated daily and monthly PDF reports** — generating a PDF summary of daily and monthly consumption statistics and emailing it to the user using a scheduled cron job.

7. **Machine learning anomaly detection** — as described in the anomaly detection section, implementing an Isolation Forest model once sufficient historical data has been collected.

---

*End of VIVA Q&A Document*

---

> **Prepared for:** Smart IoT-Based Water and Electricity Consumption Monitoring System — College PBL  
> **Document version:** 1.0  
> **Last updated:** September 2026
