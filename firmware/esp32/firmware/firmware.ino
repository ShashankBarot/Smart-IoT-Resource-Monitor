/**
 * Smart IoT Water and Electricity Monitor.
 *
 * Publishes the combined telemetry contract on resource/readings and device
 * status on resource/status. Configure Wi-Fi, broker, pins, and calibration in
 * config.h before flashing.
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

volatile uint32_t intervalPulseCount = 0;
portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;
float cumulativeWaterLitres = 0.0f;
float cumulativeEnergyKwh = 0.0f;
unsigned long lastReadingAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastMqttAttemptAt = 0;

void IRAM_ATTR onWaterPulse() {
	portENTER_CRITICAL_ISR(&pulseMux);
	intervalPulseCount++;
	portEXIT_CRITICAL_ISR(&pulseMux);
}

void connectWiFi() {
	if (WiFi.status() == WL_CONNECTED) return;

	WiFi.mode(WIFI_STA);
	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
	DEBUG_PRINTF("[WiFi] Connecting to %s", WIFI_SSID);

	const unsigned long startedAt = millis();
	while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
		delay(250);
		DEBUG_PRINT(".");
	}

	if (WiFi.status() == WL_CONNECTED) {
		DEBUG_PRINTF("\n[WiFi] Connected. IP: %s, RSSI: %d dBm\n",
								 WiFi.localIP().toString().c_str(), WiFi.RSSI());
		configTime(NTP_UTC_OFFSET_SEC, NTP_DST_OFFSET_SEC,
							 NTP_SERVER_PRIMARY, NTP_SERVER_SECONDARY);
		digitalWrite(PIN_STATUS_LED, HIGH);
	} else {
		DEBUG_PRINTLN("\n[WiFi] Connection timed out.");
		digitalWrite(PIN_STATUS_LED, LOW);
	}
}

String isoTimestamp() {
	struct tm timeInfo;
	if (getLocalTime(&timeInfo, 100)) {
		char formatted[25];
		strftime(formatted, sizeof(formatted), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
		return String(formatted);
	}

	const unsigned long elapsedSeconds = millis() / 1000UL;
	const unsigned long hours = (elapsedSeconds / 3600UL) % 24UL;
	const unsigned long minutes = (elapsedSeconds / 60UL) % 60UL;
	const unsigned long seconds = elapsedSeconds % 60UL;
	char fallback[25];
	snprintf(fallback, sizeof(fallback), "1970-01-01T%02lu:%02lu:%02luZ", hours, minutes, seconds);
	return String(fallback);
}

float readVoltageRms() {
	double sumSquares = 0.0;
	for (uint16_t sample = 0; sample < ADC_SAMPLE_COUNT; sample++) {
		const int centered = analogRead(PIN_VOLTAGE_SENSOR) - VOLTAGE_ADC_OFFSET;
		sumSquares += static_cast<double>(centered) * centered;
		delayMicroseconds(20);
	}

	const float adcRms = sqrt(sumSquares / ADC_SAMPLE_COUNT);
	const float voltage = adcRms * VOLTAGE_SCALE_FACTOR;
	return voltage < 20.0f ? 0.0f : voltage;
}

float readCurrentRms() {
	double sumSquares = 0.0;
	for (uint16_t sample = 0; sample < ADC_SAMPLE_COUNT; sample++) {
		const int centered = analogRead(PIN_CURRENT_SENSOR) - CURRENT_ADC_OFFSET;
		sumSquares += static_cast<double>(centered) * centered;
		delayMicroseconds(20);
	}

	const float adcRms = sqrt(sumSquares / ADC_SAMPLE_COUNT);
	const float mVRms = (adcRms * ADC_VREF_MV) / ((1 << ADC_RESOLUTION_BITS) - 1);
	const float current = mVRms / CURRENT_SENSITIVITY_MV_PER_A;
	return current < CURRENT_NOISE_THRESHOLD_A ? 0.0f : current;
}

void publishHeartbeat() {
	if (!mqttClient.connected()) return;

	StaticJsonDocument<256> document;
	document["deviceId"] = DEVICE_ID;
	document["timestamp"] = isoTimestamp();
	document["status"] = "online";
	document["uptime"] = millis() / 1000UL;
	document["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -100;
	document["freeHeap"] = ESP.getFreeHeap();

	char payload[256];
	const size_t length = serializeJson(document, payload, sizeof(payload));
	mqttClient.publish(MQTT_TOPIC_STATUS, (const uint8_t*)payload, length, MQTT_STATUS_RETAIN);
	DEBUG_PRINTLN("[MQTT] Heartbeat published.");
}

void publishTelemetry() {
	if (!mqttClient.connected()) return;

	const unsigned long now = millis();
	const float elapsedSeconds = lastReadingAt == 0
		? PUBLISH_INTERVAL_MS / 1000.0f
		: (now - lastReadingAt) / 1000.0f;
	lastReadingAt = now;

	uint32_t pulses;
	portENTER_CRITICAL(&pulseMux);
	pulses = intervalPulseCount;
	intervalPulseCount = 0;
	portEXIT_CRITICAL(&pulseMux);

	const float flowRateLpm = pulses / (elapsedSeconds * FLOW_CALIBRATION_FACTOR);
	cumulativeWaterLitres += pulses / 450.0f;

	const float voltage = readVoltageRms();
	const float current = readCurrentRms();
	const float power = voltage * current;
	cumulativeEnergyKwh += (power * elapsedSeconds) / 3600000.0f;

	StaticJsonDocument<512> document;
	document["deviceId"] = DEVICE_ID;
	document["timestamp"] = isoTimestamp();

	JsonObject water = document.createNestedObject("water");
	water["flowRateLpm"] = flowRateLpm;
	water["totalLitres"] = cumulativeWaterLitres;

	JsonObject electricity = document.createNestedObject("electricity");
	electricity["voltage"] = voltage;
	electricity["current"] = current;
	electricity["power"] = power;
	electricity["energyKwh"] = cumulativeEnergyKwh;

	char payload[512];
	const size_t length = serializeJson(document, payload, sizeof(payload));
	const bool published = mqttClient.publish(MQTT_TOPIC_READINGS, (const uint8_t*)payload, length, MQTT_RETAIN);

	DEBUG_PRINTF("[MQTT] Reading %s: flow=%.2f L/min, voltage=%.1f V, current=%.2f A, power=%.1f W\n",
							 published ? "published" : "failed", flowRateLpm, voltage, current, power);
}

void connectMQTT() {
	if (mqttClient.connected() || WiFi.status() != WL_CONNECTED) return;
	if (millis() - lastMqttAttemptAt < MQTT_RECONNECT_DELAY_MS) return;
	lastMqttAttemptAt = millis();

	DEBUG_PRINTF("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER_HOST, MQTT_BROKER_PORT);

	bool connected;
	if (strlen(MQTT_USERNAME) > 0) {
		connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD,
																	   MQTT_TOPIC_LWT, MQTT_QOS, MQTT_STATUS_RETAIN, MQTT_LWT_MESSAGE);
	} else {
		connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_TOPIC_LWT, MQTT_QOS,
																	   MQTT_STATUS_RETAIN, MQTT_LWT_MESSAGE);
	}

	if (connected) {
		DEBUG_PRINTLN("[MQTT] Connected to broker.");
		digitalWrite(PIN_STATUS_LED, HIGH);
		publishHeartbeat();
	} else {
		DEBUG_PRINTF("[MQTT] Connection failed, state=%d\n", mqttClient.state());
		digitalWrite(PIN_STATUS_LED, LOW);
	}
}

void setup() {
	pinMode(PIN_STATUS_LED, OUTPUT);
	pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
	attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), onWaterPulse, FALLING);

	analogSetAttenuation(ADC_11db);
	analogReadResolution(ADC_RESOLUTION_BITS);
	Serial.begin(SERIAL_BAUD_RATE);
	delay(500);

	DEBUG_PRINTF("\nSmart IoT Monitor, device=%s\n", DEVICE_ID);
	mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
	mqttClient.setKeepAlive(MQTT_KEEPALIVE_SEC);
	mqttClient.setBufferSize(768);

	connectWiFi();
	connectMQTT();
	lastReadingAt = millis();
	lastHeartbeatAt = millis();
}

void loop() {
	connectWiFi();
	connectMQTT();
	mqttClient.loop();

	if (mqttClient.connected() && millis() - lastReadingAt >= PUBLISH_INTERVAL_MS) {
		publishTelemetry();
	}
	if (mqttClient.connected() && millis() - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
		lastHeartbeatAt = millis();
		publishHeartbeat();
	}
	delay(5);
}
