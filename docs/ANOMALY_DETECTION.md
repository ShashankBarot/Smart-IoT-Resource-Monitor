# Anomaly Detection — Smart IoT-Based Water and Electricity Monitoring System

> **Project Type:** College Project-Based Learning (PBL) Prototype  
> **Detection Method:** Rule-Based (Threshold + Baseline Comparison)  
> **Last Updated:** September 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Important Disclaimers](#2-important-disclaimers)
3. [Why Rule-Based for This Prototype](#3-why-rule-based-for-this-prototype)
4. [Water Anomaly Detection](#4-water-anomaly-detection)
   - 4.1 [Scenarios That Trigger Water Anomaly](#41-scenarios-that-trigger-water-anomaly)
   - 4.2 [Water Detection Algorithm](#42-water-detection-algorithm)
   - 4.3 [Water Thresholds Configuration](#43-water-thresholds-configuration)
5. [Electricity Anomaly Detection](#5-electricity-anomaly-detection)
   - 5.1 [Scenarios That Trigger Electricity Anomaly](#51-scenarios-that-trigger-electricity-anomaly)
   - 5.2 [Electricity Detection Algorithm](#52-electricity-detection-algorithm)
   - 5.3 [Electricity Thresholds Configuration](#53-electricity-thresholds-configuration)
6. [Baseline Calculation](#6-baseline-calculation)
7. [Anomaly Severity Levels](#7-anomaly-severity-levels)
8. [Anomaly Record Structure](#8-anomaly-record-structure)
9. [Duplicate Suppression](#9-duplicate-suppression)
10. [Detection Pipeline](#10-detection-pipeline)
11. [Future ML Extension](#11-future-ml-extension)
12. [Testing the Anomaly Detector](#12-testing-the-anomaly-detector)
13. [Viva Questions for Anomaly Detection](#13-viva-questions-for-anomaly-detection)

---

## 1. Overview

The anomaly detection subsystem is a core component of the Smart IoT-Based Water and Electricity Monitoring System. Its purpose is to automatically identify readings that deviate from expected normal behavior and raise alerts so that users can take timely corrective action.

### What This System Does

- Continuously evaluates each new sensor reading as it arrives via MQTT.
- Compares readings against **configurable static thresholds** (e.g., maximum allowable flow rate, maximum allowable power draw).
- Compares readings against a **rolling historical baseline** derived from recent database records.
- Classifies any detected deviation as a **low**, **medium**, or **high** severity anomaly.
- Stores anomaly records in the database for audit and historical review.
- Emits real-time anomaly events over **Socket.IO** so the frontend dashboard can display live alerts.

### What This System Does NOT Do

- It does **not** use Machine Learning, Neural Networks, or any AI-based technique.
- It does **not** confirm the cause of an anomaly. It can only indicate that a reading is outside expected bounds.
- It does **not** provide billing-grade accuracy.
- It does **not** physically control any valves or circuit breakers in this prototype.

### Detection Method Summary

| Method | Description | Used in This System |
|---|---|---|
| Static Threshold | Compare reading to a fixed configured limit | ✅ Yes |
| Rolling Baseline | Compare reading to average of recent N readings | ✅ Yes |
| Daily Accumulator | Compare daily total to a configured daily limit | ✅ Yes |
| Continuous Duration | Track how long a condition has persisted | ✅ Yes |
| Machine Learning (e.g. Isolation Forest) | Statistical or model-based anomaly scoring | ❌ Not implemented |
| Deep Learning (LSTM, Autoencoder) | Sequence-based pattern anomaly detection | ❌ Not implemented |

---

## 2. Important Disclaimers

> [!IMPORTANT]
> Read these disclaimers before interpreting any output from this anomaly detection system. Failure to understand these limitations may lead to incorrect conclusions during demonstrations or viva examinations.

### 2.1 Anomaly Does Not Confirm a Leak

When the water anomaly detector fires with the message **"Possible abnormal water usage: continuous flow detected"**, it means that the YF-S201 flow sensor has been reporting a non-zero flow rate for longer than the configured threshold.

This **could** mean:
- There is a genuine pipe leak somewhere in the system.
- A tap was left open by mistake.
- The tank is being filled legitimately and it takes a long time.

This **does not mean**:
- A leak has been confirmed.
- The system has physically inspected the pipe.
- An automatic shutdown has occurred.

The system surfaces a **possibility** for human follow-up. A human must verify the actual situation.

### 2.2 Anomaly Does Not Confirm the Cause of High Consumption

When the electricity anomaly detector fires with **"Abnormal electricity consumption: power exceeded threshold"**, it means the PZEM-004T sensor reported a wattage above the configured limit.

This **could** mean:
- A high-load appliance was switched on (e.g., an air conditioner, electric water heater).
- A genuine fault condition in the electrical circuit.
- A transient spike due to motor start-up.

This does **not** confirm the cause. Only a human inspection of connected appliances can determine the cause.

### 2.3 Prototype-Grade Readings

Sensor readings in this system are collected using:
- **YF-S201** water flow sensor (±3–5% accuracy)
- **PZEM-004T** electrical energy meter (±1% accuracy for current measurement)

These sensors are suitable for educational prototype purposes. They are **not** certified for commercial billing. Do not present consumption figures as billing-grade data.

### 2.4 Appropriate Scope

This system is designed as a **college PBL prototype**. It demonstrates the concept of IoT-based monitoring and threshold anomaly detection. It is not a production system, and claims made about it should be proportionate to its actual scope and capabilities.

---

## 3. Why Rule-Based for This Prototype

### 3.1 The Case for Machine Learning

Machine learning (ML)-based anomaly detection is a well-studied field. Algorithms such as Isolation Forest, One-Class SVM, LSTM Autoencoders, and Prophet (for time-series forecasting) can learn complex patterns in sensor data and detect anomalies that a simple threshold would miss.

For example, an ML model could learn that:
- Power consumption always peaks between 6 PM and 9 PM on weekdays.
- Water usage is near-zero between midnight and 5 AM.
- A sudden flow reading at 3 AM on a weekday is anomalous, even if it is below the static threshold.

### 3.2 Why ML Is Not Used in This Prototype

Despite its advantages, ML-based detection is **not appropriate** for this prototype for the following concrete reasons:

#### 3.2.1 Insufficient Historical Data

ML anomaly detection models require **weeks or months of historical data** to establish meaningful patterns. An Isolation Forest, for instance, requires hundreds of clean, representative samples to learn the "normal" distribution before it can meaningfully score outliers.

A college PBL project is set up fresh. There is no pre-existing database of sensor readings. At the time of demonstration, the system may have at most a few hours to a few days of data. Training an ML model on 2 hours of readings would be statistically meaningless and would generate far more false positives than a simple threshold.

#### 3.2.2 Cold Start Problem

ML models suffer from the "cold start" problem: they cannot make useful predictions on the very first reading. Rule-based detection works **immediately from the first reading**. This is essential for a prototype that needs to demonstrate anomaly detection during a limited-duration demo session.

#### 3.2.3 Explainability

Rule-based detection is fully **explainable**. If an anomaly fires, the system can say exactly:

> "Flow rate was 15 LPM. The configured threshold is 10 LPM. Therefore an anomaly was triggered."

This is directly verifiable during a viva examination. An ML model (especially a black-box model) would require the examiner to understand model internals, scoring functions, and training datasets — none of which exist or are feasible in this context.

#### 3.2.4 Debuggability

If a rule-based system misfires, the developer can immediately trace which threshold was evaluated, what the reading was, and why the condition evaluated to true. Debugging an ML model misfire requires inspecting feature vectors, model weights, and decision boundaries — not appropriate for a prototype timeline.

#### 3.2.5 Honest Representation

Claiming ML-based detection without a real trained model would be academically dishonest and technically incorrect. Rule-based detection is what this system actually implements, and documenting it accurately is the correct approach.

### 3.3 Summary Comparison

| Criterion | Rule-Based (This System) | ML-Based (Not Implemented) |
|---|---|---|
| Works immediately on fresh install | ✅ Yes | ❌ Requires training data |
| Requires historical data | ❌ No (uses configurable defaults) | ✅ Weeks to months |
| Explainable to examiner | ✅ Fully explainable | ❌ Often a black box |
| Tunable without retraining | ✅ Change config values | ❌ Requires model retraining |
| Detects novel time-based patterns | ❌ Limited | ✅ Yes |
| Appropriate for college PBL | ✅ Yes | ❌ Out of scope |

---

## 4. Water Anomaly Detection

### 4.1 Scenarios That Trigger Water Anomaly

The water anomaly checker evaluates three categories of abnormal conditions. Each incoming water sensor reading can trigger one or more of these scenarios simultaneously.

---

#### Scenario 1 — Continuous Flow Duration

Water flowing continuously without interruption for an extended period is a strong indicator of a possible leak or a tap that was left open. Normal household or lab water usage involves intermittent flow — filling a glass, washing hands, filling a tank — followed by zero flow.

The system tracks how long the flow sensor has been reporting a flow rate above the minimum detectable threshold of **0.1 LPM** (litres per minute) continuously, without any reading returning to zero.

| Duration of Continuous Flow | Severity | Rationale |
|---|---|---|
| > 5 minutes | `low` | Unusual but could be intentional tank filling |
| > 15 minutes | `medium` | Strongly unusual, recommend checking |
| > 30 minutes | `high` | Very likely abnormal, immediate attention recommended |

**Alert Message:**
```
Possible abnormal water usage: continuous flow detected
```

> [!NOTE]
> The continuous flow timer resets to zero as soon as a reading with `flowRateLpm <= 0.1` is received. This means a brief pause in flow (even a single reading showing zero) is sufficient to reset the timer. This prevents the timer from escalating severity for a legitimate prolonged tank-filling operation that has natural pauses.

---

#### Scenario 2 — Unusually High Flow Rate

Even if the duration of flow is short, an instantaneous flow rate that is dramatically higher than what is physically plausible for the connected pipe and sensor indicates a possible abnormal condition (burst pipe, sensor malfunction, or large simultaneous open taps).

| Condition | Threshold | Severity |
|---|---|---|
| `flowRateLpm > HIGH_FLOW_THRESHOLD` | Default: 10 LPM | `medium` |

**Alert Message:**
```
Possible abnormal water usage: unusually high flow rate
```

> [!NOTE]
> The YF-S201 flow sensor is rated for 1–30 LPM. A reading of 10 LPM or above in a typical residential or lab setting is considered anomalous. This threshold is configurable for different installation contexts. For a larger building or industrial installation, this value should be raised accordingly.

---

#### Scenario 3 — Daily Total Volume Exceeded

The system accumulates the total litres consumed since midnight (00:00:00) of the current day. If the running daily total exceeds the configured daily limit, it raises a medium severity anomaly.

| Condition | Threshold | Severity |
|---|---|---|
| `totalLitresToday > DAILY_WATER_LIMIT` | Default: 200 L/day | `medium` |

**Alert Message:**
```
Possible abnormal water usage: daily limit exceeded
```

> [!NOTE]
> The daily accumulator is reset at midnight. The system uses the `timestamp` field from the reading record to determine which calendar day the reading belongs to, using the local server timezone.

---

### 4.2 Water Detection Algorithm

#### Pseudocode

```
FUNCTION checkWaterAnomaly(reading, deviceId):

  anomalies = []

  // --- Scenario 1: Continuous flow duration ---
  IF reading.flowRateLpm > 0.1:
    continuousFlowMinutes = getContinuousFlowDuration(deviceId)
    IF continuousFlowMinutes > 30:
      ADD anomaly(severity=HIGH, message='...continuous flow detected')
    ELSE IF continuousFlowMinutes > 15:
      ADD anomaly(severity=MEDIUM, message='...continuous flow detected')
    ELSE IF continuousFlowMinutes > 5:
      ADD anomaly(severity=LOW, message='...continuous flow detected')
  ELSE:
    resetContinuousFlowTimer(deviceId)

  // --- Scenario 2: High instantaneous flow rate ---
  IF reading.flowRateLpm > WATER_THRESHOLDS.highFlowRateLpm:
    ADD anomaly(severity=MEDIUM, message='...unusually high flow rate')

  // --- Scenario 3: Daily total exceeded ---
  totalToday = getDailyTotal(deviceId, today)
  IF totalToday > WATER_THRESHOLDS.dailyLimitLitres:
    ADD anomaly(severity=MEDIUM, message='...daily limit exceeded')

  FOR EACH anomaly IN anomalies:
    IF NOT recentAnomalyExists(deviceId, anomaly.type, cooldownMinutes=10):
      saveAnomaly(anomaly)
      emitSocketEvent('anomaly:created', anomaly)

  RETURN anomalies
```

#### TypeScript Implementation

```typescript
// src/anomaly/waterAnomalyChecker.ts

import { PrismaClient, Severity } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

const prisma = new PrismaClient();

// ─── Thresholds ────────────────────────────────────────────────────────────────
const WATER_THRESHOLDS = {
  highFlowRateLpm: 10,                           // LPM above which flow is flagged as high
  continuousFlowMinutes: { low: 5, medium: 15, high: 30 },
  dailyLimitLitres: 200,                         // Total litres per day before alert
  minFlowRateLpm: 0.1,                           // Below this, flow is considered zero/stopped
};

const ANOMALY_COOLDOWN_MINUTES = 10;             // Suppress duplicate anomalies within this window

// ─── In-memory continuous flow tracker ────────────────────────────────────────
// Maps deviceId → timestamp of when continuous flow started (or null if flow has stopped)
const continuousFlowStartMap = new Map<string, Date | null>();

// ─── Helper: Get continuous flow duration in minutes ──────────────────────────
function getContinuousFlowMinutes(deviceId: string): number {
  const startTime = continuousFlowStartMap.get(deviceId);
  if (!startTime) return 0;
  const now = new Date();
  return (now.getTime() - startTime.getTime()) / (1000 * 60);
}

// ─── Helper: Check if a recent anomaly of same type already exists ─────────────
async function recentAnomalyExists(
  deviceId: string,
  message: string,
  cooldownMinutes: number
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const existing = await prisma.anomaly.findFirst({
    where: {
      deviceId,
      message,
      timestamp: { gte: since },
    },
  });
  return existing !== null;
}

// ─── Helper: Get today's total litres consumed for a device ───────────────────
async function getDailyTotalLitres(deviceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await prisma.waterReading.aggregate({
    _sum: { litresDelta: true },
    where: {
      deviceId,
      timestamp: { gte: startOfDay },
    },
  });

  return result._sum.litresDelta ?? 0;
}

// ─── Helper: Save anomaly record and emit Socket.IO event ─────────────────────
async function saveAndEmitAnomaly(
  io: SocketIOServer,
  data: {
    deviceId: string;
    resourceType: 'WATER' | 'ELECTRICITY';
    severity: Severity;
    message: string;
    actualValue: number;
    baselineValue: number | null;
    threshold: number | null;
  }
): Promise<void> {
  const record = await prisma.anomaly.create({
    data: {
      deviceId: data.deviceId,
      resourceType: data.resourceType,
      severity: data.severity,
      message: data.message,
      actualValue: data.actualValue,
      baselineValue: data.baselineValue,
      threshold: data.threshold,
      timestamp: new Date(),
    },
  });

  // Emit real-time event to all connected frontend clients
  io.emit('anomaly:created', record);
}

// ─── Main Water Anomaly Checker ───────────────────────────────────────────────

/**
 * Evaluates a newly received water sensor reading for anomalous conditions.
 *
 * This function is called immediately after a water reading has been validated
 * and persisted to the database. It checks three scenarios:
 *   1. Continuous flow duration (possible leak / tap left open)
 *   2. Instantaneous high flow rate
 *   3. Daily total volume limit exceeded
 *
 * @param io       - Socket.IO server instance for real-time event emission
 * @param deviceId - The device that produced this reading
 * @param reading  - The validated sensor reading object
 */
export async function checkWaterAnomaly(
  io: SocketIOServer,
  deviceId: string,
  reading: {
    flowRateLpm: number;
    totalLitres: number;
    litresDelta: number;
    timestamp: Date;
  }
): Promise<void> {
  const { flowRateLpm, litresDelta } = reading;

  // ── Scenario 1: Continuous flow duration ──────────────────────────────────
  if (flowRateLpm > WATER_THRESHOLDS.minFlowRateLpm) {
    // Flow is active — start or continue the continuous flow timer
    if (!continuousFlowStartMap.has(deviceId) || continuousFlowStartMap.get(deviceId) === null) {
      // Flow just started — record the start time
      continuousFlowStartMap.set(deviceId, new Date());
    }

    const durationMinutes = getContinuousFlowMinutes(deviceId);
    const continuousMsg = 'Possible abnormal water usage: continuous flow detected';

    let severity: Severity | null = null;
    if (durationMinutes > WATER_THRESHOLDS.continuousFlowMinutes.high) {
      severity = 'high';
    } else if (durationMinutes > WATER_THRESHOLDS.continuousFlowMinutes.medium) {
      severity = 'medium';
    } else if (durationMinutes > WATER_THRESHOLDS.continuousFlowMinutes.low) {
      severity = 'low';
    }

    if (severity) {
      const alreadyLogged = await recentAnomalyExists(deviceId, continuousMsg, ANOMALY_COOLDOWN_MINUTES);
      if (!alreadyLogged) {
        await saveAndEmitAnomaly(io, {
          deviceId,
          resourceType: 'WATER',
          severity,
          message: continuousMsg,
          actualValue: durationMinutes,
          baselineValue: null,
          threshold: durationMinutes > WATER_THRESHOLDS.continuousFlowMinutes.high
            ? WATER_THRESHOLDS.continuousFlowMinutes.high
            : durationMinutes > WATER_THRESHOLDS.continuousFlowMinutes.medium
              ? WATER_THRESHOLDS.continuousFlowMinutes.medium
              : WATER_THRESHOLDS.continuousFlowMinutes.low,
        });
      }
    }
  } else {
    // Flow has stopped — reset the continuous flow timer for this device
    continuousFlowStartMap.set(deviceId, null);
  }

  // ── Scenario 2: Instantaneous high flow rate ───────────────────────────────
  if (flowRateLpm > WATER_THRESHOLDS.highFlowRateLpm) {
    const highFlowMsg = 'Possible abnormal water usage: unusually high flow rate';
    const alreadyLogged = await recentAnomalyExists(deviceId, highFlowMsg, ANOMALY_COOLDOWN_MINUTES);
    if (!alreadyLogged) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'WATER',
        severity: 'medium',
        message: highFlowMsg,
        actualValue: flowRateLpm,
        baselineValue: null,
        threshold: WATER_THRESHOLDS.highFlowRateLpm,
      });
    }
  }

  // ── Scenario 3: Daily total volume exceeded ────────────────────────────────
  const totalToday = await getDailyTotalLitres(deviceId);
  if (totalToday > WATER_THRESHOLDS.dailyLimitLitres) {
    const dailyMsg = 'Possible abnormal water usage: daily limit exceeded';
    const alreadyLogged = await recentAnomalyExists(deviceId, dailyMsg, ANOMALY_COOLDOWN_MINUTES);
    if (!alreadyLogged) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'WATER',
        severity: 'medium',
        message: dailyMsg,
        actualValue: totalToday,
        baselineValue: null,
        threshold: WATER_THRESHOLDS.dailyLimitLitres,
      });
    }
  }
}
```

---

### 4.3 Water Thresholds Configuration

All water detection thresholds are centralised in a single configuration object. To tune the system for a different installation (e.g., a larger building, an industrial plant), only these values need to be changed.

```typescript
// src/anomaly/thresholds.ts

export const WATER_THRESHOLDS = {
  /**
   * Flow rates above this value (in LPM) will trigger a "high flow rate" anomaly.
   * Default: 10 LPM — appropriate for a single residential tap / lab installation.
   * Increase this value for larger pipe networks.
   */
  highFlowRateLpm: 10,

  /**
   * Duration thresholds (in minutes) for continuous flow anomaly escalation.
   * low    → 5 min  : worth monitoring, could be legitimate tank filling
   * medium → 15 min : likely abnormal
   * high   → 30 min : strongly abnormal, immediate attention recommended
   */
  continuousFlowMinutes: {
    low: 5,
    medium: 15,
    high: 30,
  },

  /**
   * Maximum acceptable total water consumption per calendar day, in litres.
   * Default: 200 L — approximate daily usage for a 2–3 person household / lab.
   */
  dailyLimitLitres: 200,

  /**
   * Flow rates at or below this value are treated as "no flow" for the
   * continuous flow timer. This prevents sensor noise near zero from
   * continuously extending the timer.
   * Default: 0.1 LPM
   */
  minFlowRateLpm: 0.1,
};
```

---

## 5. Electricity Anomaly Detection

### 5.1 Scenarios That Trigger Electricity Anomaly

The electricity anomaly checker evaluates four categories of abnormal conditions for each incoming PZEM-004T reading.

---

#### Scenario 1 — Power Exceeds Absolute Threshold

If the instantaneous power reading exceeds a configured maximum, it is considered anomalous regardless of what the historical baseline is.

| Condition | Threshold | Severity |
|---|---|---|
| `powerWatts > HIGH_POWER_THRESHOLD` | Default: 2000 W | `medium` |

**Alert Message:**
```
Abnormal electricity consumption: power exceeded threshold
```

> [!NOTE]
> 2000 W is approximately the combined draw of a desktop computer, several lights, a fan, and a phone charger. In a residential or lab setting, consistently exceeding 2000 W simultaneously suggests either a high-load appliance is running (e.g., a 1500 W electric kettle) or a genuine fault. Adjust this threshold based on the total connected load capacity of the monitored circuit.

---

#### Scenario 2 — Power Significantly Above Baseline

Even if the absolute threshold is not exceeded, a reading that is dramatically higher than the **device's own recent average** is suspicious. This catches scenarios like:
- All lights and computers being left on overnight when the building is empty.
- A sudden large load being added unexpectedly.

| Condition | Multiplier | Severity |
|---|---|---|
| `powerWatts > rollingAverage × BASELINE_MULTIPLIER` | Default: 2.0× | `medium` |

**Alert Message:**
```
Abnormal electricity consumption: significantly above recent average
```

> [!NOTE]
> The baseline is calculated from the last 100 electricity readings for the same device. If fewer than 10 readings exist in the database, the baseline comparison is **skipped entirely** to prevent false positives on a fresh installation. See [Section 6](#6-baseline-calculation) for full details.

---

#### Scenario 3 — Voltage Out of Normal Range

The Indian residential mains supply is nominally **230 V AC, 50 Hz**. Acceptable operating range under normal grid conditions is approximately **190 V to 260 V**. Readings outside this range indicate either a grid-side fault (overvoltage or undervoltage) or a sensor wiring issue.

| Condition | Threshold | Severity |
|---|---|---|
| `voltage < 190 V` OR `voltage > 260 V` | 190–260 V nominal | `low` |

**Alert Message:**
```
Voltage reading outside normal range
```

> [!NOTE]
> Voltage anomalies are severity `low` because they do not by themselves indicate dangerous overconsumption. They are informational — indicating that grid supply conditions are abnormal or that sensor calibration may be needed. However, sustained undervoltage or overvoltage can damage connected equipment over time.

---

#### Scenario 4 — Daily Energy Consumption Exceeded

The system accumulates the total energy consumed (in kWh) since midnight of the current calendar day. If this total exceeds the configured daily limit, a medium-severity anomaly is raised.

| Condition | Threshold | Severity |
|---|---|---|
| `energyKwhToday > DAILY_ENERGY_LIMIT` | Default: 10 kWh/day | `medium` |

**Alert Message:**
```
Abnormal electricity consumption: daily energy limit exceeded
```

> [!NOTE]
> 10 kWh/day is approximately the average daily consumption of a modest 2-bedroom household in India. For a lab circuit monitoring only a few workstations and lights, a lower daily limit (e.g., 2–3 kWh) would be more appropriate and should be configured accordingly.

---

### 5.2 Electricity Detection Algorithm

#### Pseudocode

```
FUNCTION checkElectricityAnomaly(reading, deviceId):

  anomalies = []

  // --- Scenario 1: Absolute power threshold ---
  IF reading.powerWatts > ELECTRICITY_THRESHOLDS.highPowerWatts:
    ADD anomaly(severity=MEDIUM, message='...power exceeded threshold',
                actual=reading.powerWatts,
                threshold=ELECTRICITY_THRESHOLDS.highPowerWatts)

  // --- Scenario 2: Baseline comparison ---
  baseline = getBaseline(deviceId, lastN=100, minRequired=10)
  IF baseline IS NOT NULL:
    IF reading.powerWatts > baseline * ELECTRICITY_THRESHOLDS.baselineMultiplier:
      ADD anomaly(severity=MEDIUM, message='...significantly above recent average',
                  actual=reading.powerWatts, baseline=baseline,
                  threshold=baseline * ELECTRICITY_THRESHOLDS.baselineMultiplier)

  // --- Scenario 3: Voltage out of range ---
  IF reading.voltage < ELECTRICITY_THRESHOLDS.voltageMinV OR
     reading.voltage > ELECTRICITY_THRESHOLDS.voltageMaxV:
    ADD anomaly(severity=LOW, message='Voltage reading outside normal range',
                actual=reading.voltage,
                threshold=NULL)

  // --- Scenario 4: Daily energy total ---
  energyToday = getDailyEnergyKwh(deviceId, today)
  IF energyToday > ELECTRICITY_THRESHOLDS.dailyEnergyLimitKwh:
    ADD anomaly(severity=MEDIUM, message='...daily energy limit exceeded',
                actual=energyToday,
                threshold=ELECTRICITY_THRESHOLDS.dailyEnergyLimitKwh)

  FOR EACH anomaly IN anomalies:
    IF NOT recentAnomalyExists(deviceId, anomaly.message, cooldownMinutes=10):
      saveAnomaly(anomaly)
      emitSocketEvent('anomaly:created', anomaly)

  RETURN anomalies
```

#### TypeScript Implementation

```typescript
// src/anomaly/electricityAnomalyChecker.ts

import { PrismaClient, Severity } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

const prisma = new PrismaClient();

// ─── Thresholds ────────────────────────────────────────────────────────────────
const ELECTRICITY_THRESHOLDS = {
  highPowerWatts: 2000,         // Watts above which power reading is flagged
  baselineMultiplier: 2.0,      // Multiplier applied to rolling average for comparison
  voltageMinV: 190,             // Minimum acceptable mains voltage (Volts)
  voltageMaxV: 260,             // Maximum acceptable mains voltage (Volts)
  dailyEnergyLimitKwh: 10,      // Maximum acceptable daily energy consumption (kWh)
  baselineWindowSize: 100,      // Number of recent readings to compute rolling baseline
  baselineMinReadings: 10,      // Minimum readings required before baseline is used
};

const ANOMALY_COOLDOWN_MINUTES = 10;

// ─── Helper: Check if a recent anomaly of same type already exists ─────────────
async function recentAnomalyExists(
  deviceId: string,
  message: string,
  cooldownMinutes: number
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const existing = await prisma.anomaly.findFirst({
    where: {
      deviceId,
      message,
      timestamp: { gte: since },
    },
  });
  return existing !== null;
}

// ─── Helper: Calculate rolling average baseline for electricity power ──────────
/**
 * Computes the rolling average power (in Watts) from the last N electricity readings
 * for this device. Returns null if insufficient readings exist to form a meaningful
 * baseline, preventing false positives on a fresh installation.
 */
async function getElectricityBaseline(deviceId: string): Promise<number | null> {
  const readings = await prisma.electricityReading.findMany({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
    take: ELECTRICITY_THRESHOLDS.baselineWindowSize,
    select: { powerWatts: true },
  });

  if (readings.length < ELECTRICITY_THRESHOLDS.baselineMinReadings) {
    // Not enough data — skip baseline comparison to avoid false positives
    return null;
  }

  const sum = readings.reduce((acc, r) => acc + r.powerWatts, 0);
  return sum / readings.length;
}

// ─── Helper: Get today's total energy consumption for a device ────────────────
async function getDailyEnergyKwh(deviceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await prisma.electricityReading.aggregate({
    _sum: { energyKwhDelta: true },
    where: {
      deviceId,
      timestamp: { gte: startOfDay },
    },
  });

  return result._sum.energyKwhDelta ?? 0;
}

// ─── Helper: Save anomaly record and emit Socket.IO event ─────────────────────
async function saveAndEmitAnomaly(
  io: SocketIOServer,
  data: {
    deviceId: string;
    resourceType: 'WATER' | 'ELECTRICITY';
    severity: Severity;
    message: string;
    actualValue: number;
    baselineValue: number | null;
    threshold: number | null;
  }
): Promise<void> {
  const record = await prisma.anomaly.create({
    data: {
      deviceId: data.deviceId,
      resourceType: data.resourceType,
      severity: data.severity,
      message: data.message,
      actualValue: data.actualValue,
      baselineValue: data.baselineValue,
      threshold: data.threshold,
      timestamp: new Date(),
    },
  });

  io.emit('anomaly:created', record);
}

// ─── Main Electricity Anomaly Checker ─────────────────────────────────────────

/**
 * Evaluates a newly received electricity sensor reading for anomalous conditions.
 *
 * This function is called immediately after an electricity reading has been
 * validated and persisted to the database. It checks four scenarios:
 *   1. Instantaneous power above absolute threshold
 *   2. Power significantly above rolling historical baseline
 *   3. Mains voltage outside the acceptable operating range
 *   4. Daily energy total exceeds configured daily limit
 *
 * @param io       - Socket.IO server instance for real-time event emission
 * @param deviceId - The device that produced this reading
 * @param reading  - The validated electricity sensor reading object
 */
export async function checkElectricityAnomaly(
  io: SocketIOServer,
  deviceId: string,
  reading: {
    voltage: number;
    currentAmps: number;
    powerWatts: number;
    energyKwhDelta: number;
    frequencyHz: number;
    timestamp: Date;
  }
): Promise<void> {
  const { powerWatts, voltage } = reading;

  // ── Scenario 1: Absolute power threshold ──────────────────────────────────
  if (powerWatts > ELECTRICITY_THRESHOLDS.highPowerWatts) {
    const msg = 'Abnormal electricity consumption: power exceeded threshold';
    const alreadyLogged = await recentAnomalyExists(deviceId, msg, ANOMALY_COOLDOWN_MINUTES);
    if (!alreadyLogged) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'ELECTRICITY',
        severity: 'medium',
        message: msg,
        actualValue: powerWatts,
        baselineValue: null,
        threshold: ELECTRICITY_THRESHOLDS.highPowerWatts,
      });
    }
  }

  // ── Scenario 2: Baseline comparison ───────────────────────────────────────
  const baseline = await getElectricityBaseline(deviceId);
  if (baseline !== null) {
    const baselineThreshold = baseline * ELECTRICITY_THRESHOLDS.baselineMultiplier;
    if (powerWatts > baselineThreshold) {
      const msg = 'Abnormal electricity consumption: significantly above recent average';
      const alreadyLogged = await recentAnomalyExists(deviceId, msg, ANOMALY_COOLDOWN_MINUTES);
      if (!alreadyLogged) {
        await saveAndEmitAnomaly(io, {
          deviceId,
          resourceType: 'ELECTRICITY',
          severity: 'medium',
          message: msg,
          actualValue: powerWatts,
          baselineValue: baseline,
          threshold: baselineThreshold,
        });
      }
    }
  }

  // ── Scenario 3: Voltage out of range ──────────────────────────────────────
  if (
    voltage < ELECTRICITY_THRESHOLDS.voltageMinV ||
    voltage > ELECTRICITY_THRESHOLDS.voltageMaxV
  ) {
    const msg = 'Voltage reading outside normal range';
    const alreadyLogged = await recentAnomalyExists(deviceId, msg, ANOMALY_COOLDOWN_MINUTES);
    if (!alreadyLogged) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'ELECTRICITY',
        severity: 'low',
        message: msg,
        actualValue: voltage,
        baselineValue: null,
        threshold: null, // Two-sided range, not a single threshold
      });
    }
  }

  // ── Scenario 4: Daily energy limit exceeded ────────────────────────────────
  const energyToday = await getDailyEnergyKwh(deviceId);
  if (energyToday > ELECTRICITY_THRESHOLDS.dailyEnergyLimitKwh) {
    const msg = 'Abnormal electricity consumption: daily energy limit exceeded';
    const alreadyLogged = await recentAnomalyExists(deviceId, msg, ANOMALY_COOLDOWN_MINUTES);
    if (!alreadyLogged) {
      await saveAndEmitAnomaly(io, {
        deviceId,
        resourceType: 'ELECTRICITY',
        severity: 'medium',
        message: msg,
        actualValue: energyToday,
        baselineValue: null,
        threshold: ELECTRICITY_THRESHOLDS.dailyEnergyLimitKwh,
      });
    }
  }
}
```

---

### 5.3 Electricity Thresholds Configuration

```typescript
// src/anomaly/thresholds.ts (electricity section)

export const ELECTRICITY_THRESHOLDS = {
  /**
   * Instantaneous power (in Watts) above which a "high power" anomaly is raised.
   * Default: 2000 W.
   * Tune this based on the total connected load of the monitored circuit.
   * For a single workstation + peripherals, 500 W may be more appropriate.
   * For a full apartment with air conditioning, 5000 W may be more appropriate.
   */
  highPowerWatts: 2000,

  /**
   * A reading is considered anomalously high if it exceeds the rolling baseline
   * multiplied by this factor.
   * Default: 2.0 (i.e., more than double the recent average triggers an alert).
   * Increase this value to reduce sensitivity; decrease it to increase sensitivity.
   */
  baselineMultiplier: 2.0,

  /**
   * Minimum acceptable mains voltage (Volts).
   * Below this level, the voltage is considered abnormally low.
   * Default: 190 V (Indian standard lower tolerance limit).
   */
  voltageMinV: 190,

  /**
   * Maximum acceptable mains voltage (Volts).
   * Above this level, the voltage is considered abnormally high.
   * Default: 260 V (Indian standard upper tolerance limit).
   */
  voltageMaxV: 260,

  /**
   * Maximum acceptable energy consumption per calendar day (kWh).
   * Default: 10 kWh/day.
   * For a lab circuit, consider reducing this to 2–3 kWh.
   */
  dailyEnergyLimitKwh: 10,

  /**
   * Number of most recent electricity readings to include when computing
   * the rolling average baseline for a device.
   * Default: 100 readings.
   */
  baselineWindowSize: 100,

  /**
   * Minimum number of readings required before the baseline comparison is used.
   * If fewer readings exist, the baseline check is skipped entirely.
   * Default: 10 readings.
   * This prevents spurious anomalies on a fresh installation with no history.
   */
  baselineMinReadings: 10,
};
```

---

## 6. Baseline Calculation

### 6.1 What Is a Baseline?

A **baseline** is the expected "normal" value for a metric, computed from historical observations of that same metric on the same device.

In this system, the baseline for a device's electricity consumption is the **simple arithmetic mean (average) of the most recent N power readings** stored in the database for that device.

```
Baseline = (P₁ + P₂ + P₃ + ... + Pₙ) / n
```

Where `P₁` through `Pₙ` are the `powerWatts` values of the most recent `n` electricity readings for the device, ordered from most recent to oldest.

### 6.2 Rolling Window

The system uses a **rolling window** of the last `N` readings (default N = 100). This means:
- As new readings arrive, the oldest readings fall out of the window.
- The baseline reflects **recent** normal behavior, not all-time average.
- If a device is newly installed and only has 20 readings, the window covers all 20.

### 6.3 Minimum Readings Requirement

If fewer than 10 readings exist in the database for a given device, the baseline comparison is **completely skipped** for that device.

**Rationale:** With very few readings, the average is not statistically meaningful. Imagine a device starts up and its first reading is 2000 W. The baseline would be 2000 W. The second reading of 1800 W would appear to be 90% of the baseline — not anomalous. But if the third reading is 500 W, the baseline drops to 1433 W, and suddenly 2000 W looks like 140% of baseline. These wild fluctuations in a tiny dataset lead to both missed anomalies and false positives.

Requiring at least 10 readings before using the baseline ensures some minimal stability in the computed average before it is trusted.

### 6.4 Prisma Query for Baseline Calculation

```typescript
// Query to fetch last N readings for baseline calculation

const readings = await prisma.electricityReading.findMany({
  where: {
    deviceId: deviceId,  // Scoped to this specific device only
  },
  orderBy: {
    timestamp: 'desc',   // Most recent first
  },
  take: ELECTRICITY_THRESHOLDS.baselineWindowSize,  // Limit to N readings
  select: {
    powerWatts: true,    // Only fetch the field we need — minimise data transfer
  },
});

// Count check — skip baseline if insufficient data
if (readings.length < ELECTRICITY_THRESHOLDS.baselineMinReadings) {
  return null;  // Not enough data to compute a meaningful baseline
}

// Compute the arithmetic mean
const sum = readings.reduce((accumulator, reading) => accumulator + reading.powerWatts, 0);
const baseline = sum / readings.length;

// baseline is now the rolling average power in Watts
```

### 6.5 Why Not Use a Time-Window Baseline?

An alternative approach is to compute the baseline as the average of all readings from the **last 24 hours** rather than the last N readings.

| Approach | Advantage | Disadvantage |
|---|---|---|
| Last N readings (used here) | Always works even if readings are infrequent | May represent a shorter or longer real-time span depending on reading frequency |
| Last 24-hour time window | Represents a fixed real-time span | If readings are very infrequent, the window may contain too few readings to be stable |

The last-N-readings approach was chosen because it guarantees a minimum sample size (N) regardless of how frequently the sensors are publishing. This is more robust for a prototype where the MQTT publishing interval may be adjusted during development.

### 6.6 Water Baseline

Currently, water anomaly detection does not use a rolling baseline for comparison. It uses only static thresholds (flow rate, continuous duration, daily total). Adding a water power baseline is a potential future enhancement.

---

## 7. Anomaly Severity Levels

The system classifies every detected anomaly into one of three severity levels. This classification affects how the anomaly is displayed on the dashboard and how urgently the user should respond.

| Severity | Display Colour | Meaning | Expected User Action |
|---|---|---|---|
| `low` | 🟡 Yellow | A condition that is outside normal but may not be a problem. Worth monitoring. | Monitor and observe. No immediate action required. |
| `medium` | 🟠 Orange | A condition that is likely abnormal and probably requires attention. | Investigate the device or meter. Check for open taps, high-load appliances, grid issues. |
| `high` | 🔴 Red | A condition that is strongly abnormal. Immediate attention is strongly recommended. | Immediately inspect the premises. Check for leaks, faults, or equipment malfunction. |

### Severity Assignment Rationale

| Anomaly Type | Severity | Rationale |
|---|---|---|
| Continuous flow > 5 min | `low` | Could be legitimate tank filling — not immediately alarming |
| Continuous flow > 15 min | `medium` | Unlikely to be routine — requires checking |
| Continuous flow > 30 min | `high` | Almost certainly not normal residential/lab usage |
| High instantaneous flow rate | `medium` | Suggests unusual demand or a burst pipe event |
| Daily water limit exceeded | `medium` | May indicate leakage or unusual activity over the day |
| Power above absolute threshold | `medium` | High load observed; needs investigation |
| Power above 2× baseline | `medium` | Significantly elevated vs recent normal; needs investigation |
| Voltage out of range | `low` | Grid issue, not necessarily dangerous immediately; monitor |
| Daily energy limit exceeded | `medium` | Cumulative over-consumption for the day |

---

## 8. Anomaly Record Structure

Every detected anomaly is persisted in the `Anomaly` table in the PostgreSQL database via Prisma. The following fields are recorded:

### 8.1 Prisma Schema (Anomaly Model)

```prisma
// prisma/schema.prisma

model Anomaly {
  id            String        @id @default(cuid())

  /// The device that produced the anomalous reading
  deviceId      String

  /// Whether this anomaly is related to water or electricity
  resourceType  ResourceType  // enum: WATER | ELECTRICITY

  /// Severity classification
  severity      Severity      // enum: low | medium | high

  /// Human-readable description of what was detected
  message       String

  /// The raw sensor value that caused the anomaly to trigger
  /// For power anomalies: value in Watts
  /// For flow anomalies: value in LPM or total litres
  /// For duration anomalies: duration in minutes
  /// For daily total anomalies: accumulated daily value
  actualValue   Float

  /// The computed baseline (rolling average) at the time of detection.
  /// Null if the anomaly was triggered by a static threshold check
  /// and not a baseline comparison.
  baselineValue Float?

  /// The specific threshold value that was exceeded.
  /// Null for voltage range anomalies (two-sided, no single threshold).
  threshold     Float?

  /// Timestamp when the anomaly was detected (server-side UTC time)
  timestamp     DateTime      @default(now())

  // Relation to the Device
  device        Device        @relation(fields: [deviceId], references: [id])

  @@index([deviceId, timestamp])
  @@index([resourceType, severity])
}

enum ResourceType {
  WATER
  ELECTRICITY
}

enum Severity {
  low
  medium
  high
}
```

### 8.2 Field Descriptions

| Field | Type | Description | Example Value |
|---|---|---|---|
| `id` | String (CUID) | Unique identifier for this anomaly record | `"clx3a8f0k0000xyz..."` |
| `deviceId` | String | Foreign key to the Device that produced the reading | `"device-living-room-01"` |
| `resourceType` | Enum | Whether this is a water or electricity anomaly | `"ELECTRICITY"` |
| `severity` | Enum | `low`, `medium`, or `high` | `"medium"` |
| `message` | String | Human-readable description of the anomaly | `"Abnormal electricity consumption: power exceeded threshold"` |
| `actualValue` | Float | The sensor value that triggered the anomaly | `2450.0` (watts) |
| `baselineValue` | Float? | Rolling average at the time of detection (null if N/A) | `800.0` (watts) |
| `threshold` | Float? | The threshold value that was exceeded (null if N/A) | `2000.0` (watts) |
| `timestamp` | DateTime | UTC timestamp of when the anomaly was recorded | `2026-09-22T14:15:00.000Z` |

### 8.3 Example Anomaly Records

**Example 1 — Power threshold exceeded:**
```json
{
  "id": "clx3a8f0k0000abcdef123456",
  "deviceId": "device-living-room-01",
  "resourceType": "ELECTRICITY",
  "severity": "medium",
  "message": "Abnormal electricity consumption: power exceeded threshold",
  "actualValue": 2450.0,
  "baselineValue": null,
  "threshold": 2000.0,
  "timestamp": "2026-09-22T14:15:00.000Z"
}
```

**Example 2 — Baseline comparison:**
```json
{
  "id": "clx3b1k2m0001abcdef789012",
  "deviceId": "device-living-room-01",
  "resourceType": "ELECTRICITY",
  "severity": "medium",
  "message": "Abnormal electricity consumption: significantly above recent average",
  "actualValue": 1900.0,
  "baselineValue": 820.0,
  "threshold": 1640.0,
  "timestamp": "2026-09-22T18:42:00.000Z"
}
```

**Example 3 — Continuous water flow:**
```json
{
  "id": "clx3c2n4p0002abcdef345678",
  "deviceId": "device-bathroom-flow-01",
  "resourceType": "WATER",
  "severity": "high",
  "message": "Possible abnormal water usage: continuous flow detected",
  "actualValue": 32.5,
  "baselineValue": null,
  "threshold": 30.0,
  "timestamp": "2026-09-22T09:31:00.000Z"
}
```

---

## 9. Duplicate Suppression

### 9.1 The Problem

Without suppression, a sustained anomalous condition would generate one new anomaly record for **every single sensor reading**. Since the sensors publish every 5–10 seconds, a 10-minute sustained high-power event would generate 60–120 anomaly records for the same event.

This creates several problems:
- The database grows rapidly with redundant records.
- The dashboard floods with repeated alerts for the same event, making it difficult to identify new events.
- The alert stream becomes meaningless noise.

### 9.2 The Solution — Cooldown Period

Before inserting a new anomaly record, the system checks whether an anomaly with the **exact same `message` string** for the **same `deviceId`** already exists in the database with a `timestamp` within the last **10 minutes**.

```typescript
async function recentAnomalyExists(
  deviceId: string,
  message: string,
  cooldownMinutes: number
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const existing = await prisma.anomaly.findFirst({
    where: {
      deviceId: deviceId,
      message: message,               // Same anomaly type (identified by message text)
      timestamp: { gte: since },      // Within the cooldown window
    },
  });

  return existing !== null;           // true = suppress; false = allow insertion
}
```

If a matching record is found within the cooldown window, the new anomaly is **silently dropped**. No new record is inserted and no new Socket.IO event is emitted.

If no matching record is found within the window, the anomaly is **inserted** and emitted normally.

### 9.3 Cooldown Configuration

| Parameter | Default Value | Effect |
|---|---|---|
| `ANOMALY_COOLDOWN_MINUTES` | 10 minutes | Minimum time between two anomaly records for the same condition on the same device |

### 9.4 Severity Escalation During Cooldown

A limitation of the current cooldown implementation is that if an anomaly escalates in severity during the cooldown window (e.g., from `low` to `medium` for continuous flow), the escalated severity anomaly will be suppressed until the cooldown expires.

This is an acceptable trade-off for the prototype. In a production system, the cooldown check could additionally consider whether the **severity** has increased, allowing escalation to always be recorded even within the cooldown window.

### 9.5 Effect on Dashboard Display

The frontend dashboard subscribes to the `anomaly:created` Socket.IO event. Because duplicate anomalies are suppressed at the server level, the frontend naturally receives only non-duplicate events. There is no additional deduplication logic needed on the client side.

---

## 10. Detection Pipeline

The anomaly detection step sits between data persistence and real-time notification in the data processing pipeline.

### 10.1 Pipeline Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           MQTT MESSAGE RECEIVED                               │
│                    Topic: iot/device/{deviceId}/water                         │
│                    Topic: iot/device/{deviceId}/electricity                   │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              PAYLOAD VALIDATION                               │
│  ✓ Check required fields present (flowRateLpm, voltage, powerWatts, etc.)    │
│  ✓ Check numeric types                                                        │
│  ✓ Check plausible ranges (e.g. voltage > 0, flowRate >= 0)                  │
│  ✗ If invalid: log warning, discard, do NOT store                            │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            STORE TO DATABASE                                  │
│  prisma.waterReading.create(...)                                              │
│  prisma.electricityReading.create(...)                                        │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         ANOMALY DETECTION CALL                                │
│  await checkWaterAnomaly(io, deviceId, reading)                               │
│        OR                                                                     │
│  await checkElectricityAnomaly(io, deviceId, reading)                        │
│                                                                               │
│  ├── Evaluate Scenario 1                                                     │
│  ├── Evaluate Scenario 2                                                     │
│  ├── Evaluate Scenario 3                                                     │
│  └── Evaluate Scenario 4 (electricity only)                                  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
              ┌──────────────────┐      ┌──────────────────────┐
              │  NO ANOMALY      │      │  ANOMALY DETECTED     │
              │  DETECTED        │      │                       │
              │                  │      │  ✓ Check cooldown     │
              │  Pipeline ends   │      │  ✓ Insert to DB       │
              │  for this reading│      │  ✓ Emit Socket.IO     │
              └──────────────────┘      │    'anomaly:created'  │
                                        └──────────┬───────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │  FRONTEND DASHBOARD   │
                                        │  receives live alert  │
                                        │  via Socket.IO        │
                                        └──────────────────────┘
```

### 10.2 Integration Point in Code

The anomaly checkers are called inside the MQTT message handler, immediately after the reading is saved to the database:

```typescript
// src/mqtt/mqttHandler.ts (simplified)

mqttClient.on('message', async (topic: string, payload: Buffer) => {
  const data = JSON.parse(payload.toString());
  const deviceId = extractDeviceId(topic);

  if (topic.includes('/water')) {
    // Step 1: Validate
    const reading = validateWaterPayload(data);
    if (!reading) return; // Discard invalid

    // Step 2: Store
    const savedReading = await prisma.waterReading.create({ data: { ...reading, deviceId } });

    // Step 3: Emit live reading to dashboard (separate from anomaly)
    io.emit('reading:water', savedReading);

    // Step 4: Run anomaly detection
    await checkWaterAnomaly(io, deviceId, savedReading);

  } else if (topic.includes('/electricity')) {
    // Step 1: Validate
    const reading = validateElectricityPayload(data);
    if (!reading) return;

    // Step 2: Store
    const savedReading = await prisma.electricityReading.create({ data: { ...reading, deviceId } });

    // Step 3: Emit live reading
    io.emit('reading:electricity', savedReading);

    // Step 4: Run anomaly detection
    await checkElectricityAnomaly(io, deviceId, savedReading);
  }
});
```

### 10.3 Socket.IO Event Format

When an anomaly is detected and the cooldown is clear, the backend emits the following event to all connected frontend clients:

**Event name:** `anomaly:created`

**Payload:**
```typescript
{
  id: string;            // Anomaly record CUID
  deviceId: string;      // Device that triggered the anomaly
  resourceType: string;  // "WATER" or "ELECTRICITY"
  severity: string;      // "low" | "medium" | "high"
  message: string;       // Human-readable anomaly description
  actualValue: number;   // Observed value that triggered the anomaly
  baselineValue: number | null;
  threshold: number | null;
  timestamp: string;     // ISO 8601 datetime string
}
```

**Frontend subscription example:**
```typescript
// Frontend: React component using Socket.IO client
useEffect(() => {
  socket.on('anomaly:created', (anomaly) => {
    // Add anomaly to the alerts panel
    setAnomalies(prev => [anomaly, ...prev]);

    // Show toast notification with appropriate color based on severity
    toast({
      title: `${anomaly.severity.toUpperCase()} Anomaly`,
      description: anomaly.message,
      variant: anomaly.severity === 'high' ? 'destructive' : 'warning',
    });
  });

  return () => { socket.off('anomaly:created'); };
}, []);
```

---

## 11. Future ML Extension

> [!CAUTION]
> Everything in this section describes a **future enhancement that is NOT implemented** in the current prototype. Do not claim during a viva or demonstration that ML-based detection is present in this system. It is not.

### 11.1 When ML Becomes Feasible

Machine learning becomes a viable option for anomaly detection in this system once sufficient historical data has been collected. A reasonable milestone is **4 or more weeks of continuous sensor data** at the current publishing frequency.

At a publishing interval of 10 seconds:
- 1 day → ~8,640 readings per device
- 1 week → ~60,480 readings per device
- 4 weeks → ~241,920 readings per device

This volume of data is sufficient to train several classical anomaly detection models.

### 11.2 ML Extension Roadmap

#### Step 1 — Collect 4+ Weeks of Baseline Data

Continue running the system with rule-based detection. Allow the database to accumulate clean, representative readings across different times of day, days of the week, and usage patterns. Label any confirmed anomalies manually if possible (e.g., mark a reading as confirmed-leak = true via an admin UI).

#### Step 2 — Feature Engineering

For each reading, compute derived features that capture temporal context:

```python
# Example feature engineering in Python (future sidecar script)

features = {
    'powerWatts': reading.powerWatts,
    'hour_of_day': reading.timestamp.hour,          # 0–23: captures time-of-day patterns
    'day_of_week': reading.timestamp.weekday(),      # 0–6: weekday vs weekend patterns
    'rolling_mean_1h': compute_rolling_mean(readings, window='1h'),
    'rolling_std_1h': compute_rolling_std(readings, window='1h'),
    'rate_of_change': (reading.powerWatts - prev_reading.powerWatts),
    'is_night': 1 if 0 <= reading.timestamp.hour < 6 else 0,
}
```

These features allow the model to learn that "2000 W at 8 PM on a weekday is normal" but "2000 W at 3 AM is anomalous."

#### Step 3 — Train an Isolation Forest Model

Isolation Forest is an unsupervised anomaly detection algorithm that works by isolating observations. Anomalous readings are easier to isolate (they require fewer random splits) than normal readings.

```python
# Future Python training script (NOT part of current prototype)
from sklearn.ensemble import IsolationForest
import pandas as pd
import joblib

# Load historical readings from database
df = pd.read_sql("SELECT * FROM electricity_readings WHERE timestamp > NOW() - INTERVAL '4 weeks'", conn)

# Feature matrix
X = df[['powerWatts', 'hour_of_day', 'day_of_week', 'rolling_mean_1h', 'rate_of_change']]

# Train model
model = IsolationForest(contamination=0.02, random_state=42)
model.fit(X)

# Save model for deployment
joblib.dump(model, 'models/electricity_anomaly_model.pkl')
```

The `contamination` parameter (0.02 = 2%) tells the model to expect approximately 2% of readings to be anomalous. This should be tuned based on your actual observed anomaly rate.

#### Step 4 — Score Each New Reading

In production, each new reading would be scored by the trained model:

```python
# Future inference script (NOT part of current prototype)

score = model.decision_function([feature_vector])
# score < -0.1: anomaly (negative scores indicate increasing anomalousness)
# score > 0: normal

prediction = model.predict([feature_vector])
# prediction == -1: anomaly
# prediction == 1: normal
```

For Node.js compatibility, the model can be exported to ONNX format using `sklearn-onnx` and scored using the `onnxruntime` npm package, avoiding the need for a Python process at inference time.

#### Step 5 — Anomaly Score Thresholding

The raw anomaly score from the model is a continuous value. A threshold must be chosen to convert it to a binary anomaly/normal classification:

```
IF anomaly_score < SCORE_THRESHOLD (e.g. -0.15):
  → FLAG as anomaly
  → Severity: map score range to low/medium/high
ELSE:
  → Normal reading
```

The score threshold should be tuned on a validation dataset to balance false positive rate and true positive rate for the specific deployment context.

#### Step 6 — Gradual Replacement of Rule-Based Rules

ML detection should not immediately replace rule-based detection. A phased approach:

1. **Phase 1 (Current):** Rule-based only. Immediate, explainable.
2. **Phase 2 (Data collection):** Rule-based active. ML model training in background.
3. **Phase 3 (Parallel operation):** Both active. Compare outputs. Tune ML model.
4. **Phase 4 (ML primary):** ML as primary detector. Rule-based as safety net.
5. **Phase 5 (Rule-based retired):** ML primary with human-in-the-loop for tuning.

### 11.3 Why Not Implement ML Now?

| Reason | Detail |
|---|---|
| No training data | The prototype database is empty at start. ML cannot train. |
| Project timeline | College PBL duration is typically 1 semester. Insufficient for data collection + model development. |
| Out of scope | The learning objective of this PBL is IoT integration, not ML model development. |
| Honest scope | Implementing a fake or untrained ML wrapper would be academically dishonest. |

---

## 12. Testing the Anomaly Detector

This section describes how to verify that the anomaly detection system is working correctly, both during development and during a project demonstration.

### 12.1 Prerequisites

- Backend server running locally (`npm run dev` or `node dist/index.js`)
- PostgreSQL database connected and migrated (`npx prisma migrate deploy`)
- At least one device registered in the `Device` table
- MQTT broker running (Mosquitto locally, or HiveMQ cloud)
- Frontend dashboard running (for Socket.IO event verification)

### 12.2 Test 1 — Electricity High Power Anomaly

**Objective:** Confirm that a power reading above 2000 W triggers a medium severity electricity anomaly.

**Method — Using the Device Simulator:**

```bash
# Publish a high-power electricity reading via MQTT
mosquitto_pub \
  -h localhost \
  -t "iot/device/device-living-room-01/electricity" \
  -m '{
    "voltage": 230,
    "currentAmps": 22,
    "powerWatts": 5000,
    "energyKwhDelta": 0.014,
    "frequencyHz": 50
  }'
```

**Expected Result:**
1. Backend console logs: `Electricity anomaly detected: Abnormal electricity consumption: power exceeded threshold`
2. `Anomaly` table in database contains a new record with `severity = 'medium'`, `actualValue = 5000`, `threshold = 2000`
3. Frontend dashboard displays an orange anomaly alert card
4. Browser devtools WebSocket frame shows `anomaly:created` event received

**Verification Query:**
```sql
SELECT id, "resourceType", severity, message, "actualValue", threshold, timestamp
FROM "Anomaly"
ORDER BY timestamp DESC
LIMIT 5;
```

---

### 12.3 Test 2 — Water Continuous Flow Anomaly

**Objective:** Confirm that continuous water flow for over 5/15/30 minutes triggers escalating anomalies.

> [!TIP]
> For demo purposes, temporarily lower the `continuousFlowMinutes.low` threshold to 0.5 minutes (30 seconds) to avoid waiting the full 5 minutes. Remember to restore the threshold to the original values after testing.

**Method — Using the Device Simulator:**

```typescript
// Simulator: publish continuous water flow readings every 5 seconds for 6+ minutes

async function simulateContinuousFlow(deviceId: string, durationMinutes: number) {
  const intervalMs = 5000; // 5 seconds between readings
  const iterations = (durationMinutes * 60 * 1000) / intervalMs;

  for (let i = 0; i < iterations; i++) {
    await mqttClient.publishAsync(
      `iot/device/${deviceId}/water`,
      JSON.stringify({
        flowRateLpm: 3.5,      // Continuous non-zero flow
        totalLitres: 100 + (i * 3.5 * 5 / 60),  // Accumulating total
        litresDelta: 3.5 * 5 / 60,
      })
    );
    await sleep(intervalMs);
  }
}

await simulateContinuousFlow('device-bathroom-flow-01', 6);
// After 5 minutes: expect low severity anomaly
// After 15 minutes: expect medium severity anomaly
// After 30 minutes: expect high severity anomaly
```

**Expected Result:**
- After 5+ minutes: `low` severity water anomaly in DB and on dashboard
- After 15+ minutes: `medium` severity water anomaly (new record after cooldown clears)
- After 30+ minutes: `high` severity water anomaly

---

### 12.4 Test 3 — Baseline Comparison Anomaly

**Objective:** Confirm that a reading significantly above the rolling average baseline triggers an anomaly.

**Method:**

1. First, populate the database with 15+ low-power readings (to establish a baseline):
   ```bash
   # Publish 20 readings at ~200 W
   for i in {1..20}; do
     mosquitto_pub -h localhost \
       -t "iot/device/device-living-room-01/electricity" \
       -m '{"voltage":230,"currentAmps":0.87,"powerWatts":200,"energyKwhDelta":0.00056,"frequencyHz":50}'
     sleep 2
   done
   ```

2. Then publish one high-power reading:
   ```bash
   mosquitto_pub -h localhost \
     -t "iot/device/device-living-room-01/electricity" \
     -m '{"voltage":230,"currentAmps":5.0,"powerWatts":1150,"energyKwhDelta":0.0032,"frequencyHz":50}'
   ```

   At this point: baseline ≈ 200 W. Baseline × 2.0 = 400 W. 1150 W > 400 W → anomaly should fire.

**Expected Result:**
- DB record with `message = 'Abnormal electricity consumption: significantly above recent average'`
- `actualValue = 1150`, `baselineValue ≈ 200`, `threshold ≈ 400`

---

### 12.5 Test 4 — Verify Anomaly Table in Database

```bash
# Connect to PostgreSQL and inspect the anomaly table
psql -U postgres -d iot_monitoring -c \
  "SELECT id, \"deviceId\", \"resourceType\", severity, message, \"actualValue\", \"baselineValue\", threshold, timestamp
   FROM \"Anomaly\"
   ORDER BY timestamp DESC
   LIMIT 10;"
```

---

### 12.6 Test 5 — Verify Socket.IO Event on Frontend

Open browser developer tools → **Network** tab → filter for **WS** (WebSocket).

Click on the WebSocket connection to the backend (e.g., `ws://localhost:3001/socket.io`).

In the **Messages** sub-tab, observe incoming frames. When an anomaly fires, you should see:

```json
42["anomaly:created",{
  "id": "clx3a8f0k0000...",
  "deviceId": "device-living-room-01",
  "resourceType": "ELECTRICITY",
  "severity": "medium",
  "message": "Abnormal electricity consumption: power exceeded threshold",
  "actualValue": 5000,
  "baselineValue": null,
  "threshold": 2000,
  "timestamp": "2026-09-22T14:15:00.000Z"
}]
```

The `42` prefix is Socket.IO protocol framing (message type 4, event type 2).

---

### 12.7 Test 6 — Verify Duplicate Suppression

1. Send the same high-power reading 5 times within 2 minutes.
2. Query the `Anomaly` table.
3. Confirm that only **one** anomaly record was created for that event (subsequent ones suppressed by cooldown).

```sql
-- Count anomaly records created in the last 5 minutes
SELECT COUNT(*) FROM "Anomaly"
WHERE timestamp > NOW() - INTERVAL '5 minutes'
AND message = 'Abnormal electricity consumption: power exceeded threshold';
-- Expected result: 1 (not 5)
```

---

## 13. Viva Questions for Anomaly Detection

The following questions are representative of what an examiner may ask during a college project viva examination regarding the anomaly detection component of this system. Answers are provided based on the actual implementation.

---

**Q1. What is anomaly detection in the context of this IoT system?**

**A:** Anomaly detection is the process of automatically identifying sensor readings that deviate significantly from expected or normal values. In this system, every incoming sensor reading is evaluated after it is stored in the database. If the reading exceeds a configured threshold or is significantly higher than the device's recent historical average, it is classified as an anomaly and an alert is raised. The system covers water flow anomalies (continuous flow, high flow rate, daily total) and electricity anomalies (high power, above baseline, voltage out of range, daily energy total).

---

**Q2. Does this system use machine learning or AI for anomaly detection?**

**A:** No. This system uses rule-based (also called threshold-based) anomaly detection. Every rule is a simple logical comparison: "Is this value greater than X?" or "Has this condition persisted for longer than Y minutes?" There is no trained model, no learning from data, and no statistical inference. This is honest and deliberate — ML requires weeks of historical training data that a fresh college prototype cannot provide. Rule-based detection works correctly from the very first reading.

---

**Q3. What is a baseline, and how is it calculated in this system?**

**A:** A baseline is the expected "normal" value for a metric, derived from the device's own recent history. In this system, the electricity baseline is the arithmetic mean (simple average) of the most recent 100 power readings for that device, as stored in the database. For example, if the last 100 readings averaged 350 W, the baseline is 350 W. A new reading of 800 W (which is 350 × 2.3 — above the 2.0× multiplier threshold) would trigger a "significantly above baseline" anomaly. Water anomaly detection currently uses only static thresholds and does not compute a rolling baseline.

---

**Q4. Why does the system skip baseline comparison when fewer than 10 readings exist?**

**A:** When a device is first installed, there are very few readings in the database. The average of 1, 2, or 3 readings is not statistically meaningful. If the first reading happens to be a high-load event (e.g., the electric kettle was on when the device was first powered), the baseline would be artificially high, causing the system to miss future anomalies. Conversely, if the first few readings are very low, the baseline would be too low, causing every subsequent normal reading to appear anomalous. Requiring at least 10 readings before using the baseline prevents these false positives and false negatives on a fresh installation.

---

**Q5. What is the difference between a false positive and a false negative in anomaly detection?**

**A:** A **false positive** is when the system raises an anomaly alert for a reading that is actually normal. For example, if the daily water limit is set too low (e.g., 50 L) and the household uses water normally, the system would alert unnecessarily. A **false negative** is when the system fails to detect a genuinely abnormal reading. For example, if the power threshold is set too high (e.g., 10,000 W) and a 3,000 W leak goes undetected. Tuning thresholds involves a trade-off: lowering thresholds reduces false negatives but increases false positives, and vice versa. The default thresholds in this system are set conservatively to minimise false positives (which are more disruptive in a prototype demo) while still detecting clearly abnormal events.

---

**Q6. What happens if a tap is left open for 2 hours? Walk me through the anomaly detection process.**

**A:** 
1. At t=0 min: First reading arrives with `flowRateLpm = 4.0`. The continuous flow timer starts for this device.
2. At t=5 min: Continuous flow timer exceeds the `low` threshold (5 min). A `low` severity anomaly is created: "Possible abnormal water usage: continuous flow detected." Socket.IO emits `anomaly:created` to the dashboard.
3. At t=15 min: Timer exceeds the `medium` threshold (15 min). The cooldown has expired (it was 10 minutes). A new `medium` severity anomaly is created and emitted.
4. At t=30 min: Timer exceeds the `high` threshold (30 min). A new `high` severity anomaly is created with a red alert on the dashboard.
5. Every 10 minutes thereafter (the cooldown period), if the flow is still active, a new `high` severity anomaly is created.
6. When the tap is finally closed (`flowRateLpm ≤ 0.1`): the continuous flow timer resets to zero. No further flow-duration anomalies fire.

---

**Q7. Why is the anomaly cooldown period needed? What would happen without it?**

**A:** Without a cooldown period, every single sensor reading that exceeds a threshold would create a new anomaly record in the database. Since sensors publish every 5–10 seconds, a 10-minute sustained high-power event would generate approximately 60–120 anomaly records for the same event. This would flood the database with redundant data, cause the dashboard to show hundreds of identical alerts (making it impossible to distinguish new events from sustained ones), and potentially cause performance issues from rapid database writes. The 10-minute cooldown means that for any sustained anomalous condition, a new record is created at most once every 10 minutes, making the anomaly log clean and readable.

---

**Q8. How would you tune the anomaly thresholds for a different building or environment?**

**A:** All thresholds are defined in a centralised configuration object (`WATER_THRESHOLDS` and `ELECTRICITY_THRESHOLDS` in `src/anomaly/thresholds.ts`). To tune for a different environment:

- **Large office building:** Raise `highPowerWatts` to 20,000 W, raise `dailyEnergyLimitKwh` to 100 kWh, raise `dailyLimitLitres` to 2000 L.
- **Single workstation monitoring:** Lower `highPowerWatts` to 300 W, `baselineMultiplier` to 1.5.
- **Industrial pipe network:** Raise `highFlowRateLpm` from 10 to 50+.
- **More sensitive leak detection:** Lower `continuousFlowMinutes.low` from 5 to 2.

Changes take effect immediately without any redeployment if thresholds are loaded from a configuration file or environment variables. No retraining is needed (unlike ML models).

---

**Q9. What does `severity: 'high'` mean? Does it automatically shut off the water supply?**

**A:** `severity: 'high'` means the system has detected a condition that is strongly abnormal and recommends immediate human attention. In this prototype, it results in: (1) a red-coloured alert card on the dashboard, (2) an anomaly record in the database, and (3) a Socket.IO `anomaly:created` event. It does **not** automatically shut off any valve or breaker. The system has no actuator control capability in this prototype. A human must see the alert and take physical action. Actuator control (e.g., a motorised valve or a smart relay) would be a logical future extension.

---

**Q10. How does the continuous flow timer work? How does the system know flow has been going for 30 minutes?**

**A:** The system uses an in-memory JavaScript `Map` called `continuousFlowStartMap`. This maps each `deviceId` to the `Date` object representing when the continuous flow started for that device. When a reading arrives with `flowRateLpm > 0.1`, the system checks this map. If no start time exists (or it is null), it records `new Date()` as the start time. If a start time already exists, it calculates `(now - startTime)` in minutes to get the duration. When a reading arrives with `flowRateLpm <= 0.1`, the start time is reset to `null`. This is purely in-memory, which means the timer resets if the backend server restarts. A more robust implementation would persist the start time to the database.

---

**Q11. What data is stored in the Anomaly table for each detection event?**

**A:** Each anomaly record stores: `id` (unique CUID), `deviceId` (which device triggered it), `resourceType` (WATER or ELECTRICITY), `severity` (low/medium/high), `message` (human-readable description like "power exceeded threshold"), `actualValue` (the raw sensor value that triggered the anomaly, e.g., 5000 for 5000 W), `baselineValue` (the computed rolling average at that moment, or null if not applicable), `threshold` (the specific threshold that was exceeded, or null for range checks), and `timestamp` (UTC datetime when the anomaly was recorded).

---

**Q12. If the system has been running for 1 week and suddenly the power usage doubles due to a new air conditioner being installed, will the system falsely trigger anomalies forever?**

**A:** Initially, yes — the new higher power readings will trigger "significantly above baseline" anomalies because the baseline (computed from the last 100 readings) reflects the old, lower usage pattern. However, as more readings at the new higher level accumulate in the database, they replace older readings in the rolling window, and the baseline gradually rises to reflect the new normal. After approximately 100 new readings (which, at 10-second intervals, is about 17 minutes of operation), the baseline will have fully absorbed the new usage pattern and will stop triggering baseline-comparison anomalies. This is a natural and correct behavior — the system adapts to new normal usage over a short period. For the absolute-threshold check (`highPowerWatts = 2000 W`), if the air conditioner draws more than 2000 W, that threshold check will continue to fire. The threshold should be manually raised to accommodate the new appliance.

---

**Q13. What is the difference between a "static threshold" anomaly and a "baseline comparison" anomaly?**

**A:** A **static threshold** anomaly fires when a reading exceeds a fixed, pre-configured value that does not change based on historical data. For example: "If `powerWatts > 2000`, fire an anomaly." This is absolute and simple. A **baseline comparison** anomaly fires when a reading exceeds a dynamically calculated value — the device's own recent average multiplied by a factor. For example: "If `powerWatts > (rollingAverage × 2.0)`, fire an anomaly." This is relative and context-aware. Both types are complementary: static thresholds catch extreme absolute values regardless of history; baseline comparison catches unusual deviations even if the absolute value is not extreme (e.g., 800 W is not extreme in isolation, but it is suspicious if this device's normal usage is 100 W).

---

**Q14. Why not set the power threshold to 0 and flag every deviation as an anomaly?**

**A:** A threshold of 0 would flag every single reading as an anomaly, since any non-zero power consumption would exceed 0 W. The purpose of a threshold is to distinguish **significant** deviations from acceptable, expected variation. Some variation in readings is normal and expected — sensor noise, minor fluctuations in appliance load, transient spikes when motors start. An anomaly should represent a deviation that is large enough to be meaningful and actionable for the user. Setting the threshold too low causes so many false positives that users lose trust in the system and begin ignoring alerts — a well-known problem called "alert fatigue."

---

**Q15. What would you improve in the anomaly detection system if given more time?**

**A:** Several improvements could be made:
1. **Persist the continuous flow timer** to the database so it survives backend restarts.
2. **Severity escalation during cooldown:** Allow escalation from `low` → `medium` → `high` to always be recorded, even within the cooldown window.
3. **Configurable thresholds via admin UI:** Allow thresholds to be changed at runtime through the dashboard without editing code or config files.
4. **Per-device thresholds:** Currently all devices of the same type share thresholds. Allow per-device threshold overrides.
5. **ML integration:** Once 4+ weeks of data exist, train an Isolation Forest model for more nuanced pattern-based detection.
6. **Alert notifications:** Send push notifications or email/SMS alerts for high-severity anomalies (e.g., via Twilio or Firebase Cloud Messaging).
7. **Anomaly acknowledgement:** Allow users to mark an anomaly as "acknowledged" or "false positive" via the dashboard.
8. **Water baseline comparison:** Extend baseline comparison to water flow data, not just electricity.

---

**Q16. Can two different anomaly types fire simultaneously for the same reading?**

**A:** Yes. A single reading can trigger multiple anomaly records. For example, an electricity reading with `powerWatts = 3000` might simultaneously trigger:
- Scenario 1: "Power exceeded threshold" (3000 > 2000)
- Scenario 2: "Significantly above recent average" (3000 > baseline × 2.0, if baseline is 1000)

Both anomalies are checked independently. If neither has a recent record within the 10-minute cooldown, both are inserted into the `Anomaly` table and both `anomaly:created` events are emitted. On the dashboard, both alert cards would appear. This provides maximum information to the user — the anomaly is both absolutely high and relatively elevated above normal.

---

*End of ANOMALY_DETECTION.md*

---

> **Document Status:** Complete | **Version:** 1.0 | **Suitable for:** College PBL Viva, Project Documentation, Developer Reference
