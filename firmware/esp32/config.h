/**
 * @file config.h
 * @brief Central configuration file for the Smart IoT Water & Electricity Monitor.
 *
 * All hardware pin assignments, network credentials, MQTT broker settings,
 * timing intervals, and sensor calibration constants are defined here.
 * Change values in this file to adapt the firmware to your deployment
 * without modifying main.cpp.
 *
 * Project : Smart IoT Based Water and Electricity Monitoring
 * Target  : ESP32 (ESP-WROOM-32 / ESP32-DevKitC)
 * Author  : Team
 * Date    : 2026-09-22
 */

#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// DEVICE IDENTITY
// =============================================================================

/** Unique identifier for this node. Must match the value expected by the
 *  backend / dashboard. Change to "esp32-02", "esp32-03" etc. for
 *  additional nodes in the same deployment. */
#define DEVICE_ID "esp32-01"

// =============================================================================
// WI-FI CREDENTIALS
// =============================================================================

/** SSID (name) of your 2.4 GHz Wi-Fi network.
 *  ESP32 does NOT support 5 GHz bands. */
#define WIFI_SSID "YOUR_WIFI_SSID"

/** WPA2 passphrase for the Wi-Fi network above. */
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

/** Maximum time (ms) to wait for a Wi-Fi connection before rebooting.
 *  30 seconds is a safe default for most home / lab routers. */
#define WIFI_CONNECT_TIMEOUT_MS 30000UL

// =============================================================================
// MQTT BROKER SETTINGS
// =============================================================================

/** IP address or hostname of your MQTT broker.
 *  For a local Mosquitto broker running on a Raspberry Pi, this is typically
 *  something like "192.168.1.10". Do NOT include "mqtt://" prefix. */
#define MQTT_BROKER_HOST "192.168.1.100"

/** Standard unencrypted MQTT port. Change to 8883 for TLS. */
#define MQTT_BROKER_PORT 1883

/** Client-ID must be unique per connected device on the broker.
 *  Using DEVICE_ID keeps it consistent with the JSON payload. */
#define MQTT_CLIENT_ID DEVICE_ID

/** Optional MQTT broker username. Leave as "" if authentication is disabled. */
#define MQTT_USERNAME ""

/** Optional MQTT broker password. Leave as "" if authentication is disabled. */
#define MQTT_PASSWORD ""

/** How long (seconds) the broker should wait before it considers the client
 *  disconnected after the last PINGREQ. PubSubClient sends PINGREQs
 *  automatically within this window. */
#define MQTT_KEEPALIVE_SEC 60

// =============================================================================
// MQTT TOPICS
// =============================================================================

/** Topic for publishing sensor readings JSON payload every PUBLISH_INTERVAL_MS. */
#define MQTT_TOPIC_READINGS "resource/readings"

/** Topic for publishing heartbeat / online status every HEARTBEAT_INTERVAL_MS. */
#define MQTT_TOPIC_STATUS "resource/status"

/** Last Will and Testament (LWT) topic. The broker publishes this message
 *  automatically if the device disconnects unexpectedly. */
#define MQTT_TOPIC_LWT "resource/status"

/** LWT message payload — indicates the device is offline. */
#define MQTT_LWT_MESSAGE "{\"deviceId\":\"" DEVICE_ID "\",\"status\":\"offline\"}"

/** QoS level for published messages.
 *   0 = at most once  (fire-and-forget, fastest)
 *   1 = at least once (acknowledged, recommended for sensor data)
 *   2 = exactly once  (heavy overhead, rarely needed for telemetry)  */
#define MQTT_QOS 1

/** Set to 1 to retain the readings message on the broker so new subscribers
 *  immediately receive the last known value. Set to 0 to disable. */
#define MQTT_RETAIN 0

// =============================================================================
// TIMING INTERVALS
// =============================================================================

/** Interval (ms) between sensor readings publications.
 *  5 000 ms = 5 seconds. */
#define PUBLISH_INTERVAL_MS 5000UL

/** Interval (ms) between heartbeat / status publications.
 *  30 000 ms = 30 seconds. */
#define HEARTBEAT_INTERVAL_MS 30000UL

/** Delay (ms) between MQTT reconnection attempts to avoid hammering the broker. */
#define MQTT_RECONNECT_DELAY_MS 5000UL

// =============================================================================
// GPIO PIN DEFINITIONS
// =============================================================================

/** GPIO pin connected to the YF-S201 water flow sensor signal (yellow) wire.
 *  Must be an interrupt-capable pin. GPIO 27 is a safe choice on ESP32-WROOM-32.
 *  Pull-up to 3.3 V via a 10 kΩ resistor is recommended on the signal line. */
#define PIN_FLOW_SENSOR 27

/** GPIO pin connected to the ZMPT101B voltage sensor module output.
 *  Must be an ADC1 channel (GPIO 32–39). GPIO 34 is input-only, no internal
 *  pull-up, which is ideal for this sensor.
 *  ADC2 pins cannot be used while Wi-Fi is active on ESP32. */
#define PIN_VOLTAGE_SENSOR 34

/** GPIO pin connected to the ACS712 current sensor output.
 *  Same ADC1 restriction applies. GPIO 35 is input-only. */
#define PIN_CURRENT_SENSOR 35

/** Built-in LED pin on most ESP32-DevKitC boards (GPIO 2).
 *  Used as a status indicator: blinks on publish, stays ON when MQTT is
 *  connected, stays OFF when disconnected. */
#define PIN_STATUS_LED 2

// =============================================================================
// ADC CONFIGURATION
// =============================================================================

/** ESP32 ADC full-scale reference voltage (mV).
 *  With attenuation set to ADC_ATTEN_DB_11 the usable input range is
 *  ~150 mV – 3 100 mV. Nominal VRef is 3300 mV but varies ±5 % per chip.
 *  Calibrate using the ESP32 ADC calibration API or measure with a multimeter. */
#define ADC_VREF_MV 3300

/** ESP32 ADC resolution in bits. Default is 12-bit (0–4095 counts). */
#define ADC_RESOLUTION_BITS 12

/** Number of ADC samples averaged per RMS calculation window.
 *  1 000 samples at ~10 µs per sample ≈ 10 ms window.
 *  Increase for more accurate RMS; decrease for faster response. */
#define ADC_SAMPLE_COUNT 1000

// =============================================================================
// YF-S201 WATER FLOW SENSOR CALIBRATION
// =============================================================================

/** Pulses emitted by the YF-S201 per litre of water flow.
 *  Factory specification: ~450 pulses / litre at nominal flow rate.
 *  Divide by 60 to get pulses per second per litre-per-minute:
 *    F(Hz) = Q(L/min) × 7.5
 *  So: CALIBRATION_FACTOR = 7.5 Hz / (L/min).
 *
 *  Calibration procedure:
 *    1. Flow exactly 1 litre of water through the sensor.
 *    2. Count the total pulses (print to Serial).
 *    3. Your factor = pulse_count / 60.
 *  Adjust this value per your specific sensor unit. */
#define FLOW_CALIBRATION_FACTOR 7.5f

/** Interval (ms) at which flow rate is recalculated from the pulse count.
 *  Must match PUBLISH_INTERVAL_MS for consistent L/min readings.
 *  Do NOT set below 1 000 ms — too short an interval makes L/min inaccurate. */
#define FLOW_CALC_INTERVAL_MS PUBLISH_INTERVAL_MS

// =============================================================================
// ZMPT101B VOLTAGE SENSOR CALIBRATION
// =============================================================================
//
// ⚠️  SAFETY WARNING — MAINS AC VOLTAGE ⚠️
// The ZMPT101B module steps down mains AC (110 V / 230 V) via a miniature
// transformer. The PRIMARY side of the transformer is at LETHAL voltage.
// NEVER touch or probe the primary side while the system is energised.
// Always work with the mains side fully de-energised and discharged.
// Use an earthed enclosure and RCD-protected outlet for all testing.
//
// The module output is a sinusoidal AC signal centred around VCC/2 (≈1.65 V
// for 3.3 V supply). The ADC reads a biased sine wave. We compute true RMS
// by sampling, removing the DC offset (midpoint), squaring, averaging, and
// taking the square root, then scaling.
//
/** ADC midpoint count when no AC signal is applied (pure DC bias ≈ VCC/2).
 *  Read this value with the mains disconnected and the sensor powered.
 *  Typical value ≈ 2048 for a 12-bit ADC with VCC = 3.3 V. */
#define VOLTAGE_ADC_OFFSET 2048

/** Voltage calibration factor that maps ADC RMS counts to real-world RMS volts.
 *  Derivation:
 *    Measure actual mains RMS voltage with a trusted multimeter → V_real.
 *    Read the ADC RMS count from the firmware Serial output → adc_rms.
 *    VOLTAGE_SCALE = V_real / adc_rms
 *  Default 0.5f is a starting-point placeholder. You MUST calibrate per module. */
#define VOLTAGE_SCALE_FACTOR 0.5f

// =============================================================================
// ACS712 CURRENT SENSOR CALIBRATION
// =============================================================================
//
// The ACS712 outputs VCC/2 (≈1.65 V at 3.3 V) at zero current.
// Sensitivity depends on the module variant:
//   ACS712-05B : 185 mV/A
//   ACS712-20A : 100 mV/A   ← most common for home energy monitoring
//   ACS712-30A :  66 mV/A
//
/** ACS712 sensitivity in mV per Ampere. Adjust for your variant. */
#define CURRENT_SENSITIVITY_MV_PER_A 100.0f

/** ADC midpoint count when the sensor carries zero current (VCC/2 bias).
 *  Read this with no load connected and calibrate per device.
 *  Typical value ≈ 2048 for 12-bit ADC at VCC = 3.3 V. */
#define CURRENT_ADC_OFFSET 2048

/** Minimum current (A) below which the reading is treated as zero.
 *  Avoids spurious non-zero readings caused by ADC noise at idle. */
#define CURRENT_NOISE_THRESHOLD_A 0.05f

// =============================================================================
// NTP TIME CONFIGURATION
// =============================================================================

/** Primary NTP server hostname. Uses pool.ntp.org by default.
 *  Change to your local NTP server for isolated networks. */
#define NTP_SERVER_PRIMARY "pool.ntp.org"

/** Secondary NTP server used as fallback. */
#define NTP_SERVER_SECONDARY "time.google.com"

/** UTC offset in seconds. Set to 0 for UTC timestamps in the JSON payload.
 *  The backend / dashboard should handle timezone conversion.
 *  IST = 5h30m = 19800 seconds. */
#define NTP_UTC_OFFSET_SEC 0L

/** Daylight-saving time offset in seconds.
 *  India does not observe DST, so this is 0. Adjust for your region. */
#define NTP_DST_OFFSET_SEC 0L

// =============================================================================
// SERIAL DEBUG
// =============================================================================

/** Baud rate for USB-Serial debug output. Must match monitor_speed in platformio.ini. */
#define SERIAL_BAUD_RATE 115200

/** Set to 1 to enable verbose Serial debug prints; 0 to silence them for
 *  production firmware. Verbose output slightly increases loop latency. */
#define DEBUG_SERIAL 1

#if DEBUG_SERIAL
  #define DEBUG_PRINT(x)   Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

#endif // CONFIG_H
