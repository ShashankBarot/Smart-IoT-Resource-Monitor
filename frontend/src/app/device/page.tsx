"use client";

import { useEffect, useState } from "react";
import DeviceStatusCard from "@/components/DeviceStatusCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fetchDeviceStatus } from "@/lib/data";

interface DeviceStatus {
  deviceId: string;
  status: "online" | "offline";
  lastSeen: string;
  rssi: number;
}

export default function DevicePage() {
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDeviceStatus() {
      try {
        setLoading(true);

        const data = await fetchDeviceStatus();

        setDevice(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load device status.");
      } finally {
        setLoading(false);
      }
    }

    loadDeviceStatus();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <LoadingSpinner message="Checking ESP32 device status..." />
      </main>
    );
  }

  if (error || !device) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-lg font-semibold text-red-400">
            Device Status Error
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {error || "Device information is unavailable."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-green-400">
          DEVICE MONITORING
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          ESP32 Device Status
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Monitor the connection and health of your IoT sensor device.
        </p>
      </div>

      {/* Main Device Card */}
      <div className="max-w-2xl">
        <DeviceStatusCard
          deviceId={device.deviceId}
          status={device.status}
          lastSeen={new Date(device.lastSeen).toLocaleString()}
          rssi={device.rssi}
        />
      </div>

      {/* Status Information */}
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
          <p className="text-sm text-slate-400">Connection Status</p>

          <h2 className="mt-2 text-2xl font-bold text-green-400">
            {device.status === "online" ? "Online" : "Offline"}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Current device connection
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="text-sm text-slate-400">Signal Strength</p>

          <h2 className="mt-2 text-2xl font-bold text-cyan-400">
            {device.rssi} dBm
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Wi-Fi signal received by ESP32
          </p>
        </div>

        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
          <p className="text-sm text-slate-400">Device ID</p>

          <h2 className="mt-2 text-xl font-bold text-purple-400">
            {device.deviceId}
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Registered sensor device
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-7 rounded-2xl border border-white/10 bg-[#0b1728] p-6">
        <h2 className="text-lg font-semibold text-white">
          Device Monitoring
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          The dashboard monitors whether the ESP32 sensor device is
          connected and available to transmit water and electricity
          readings. The device ID, connection status, signal strength,
          and last-seen time help verify the health of the IoT node.
        </p>
      </div>
    </main>
  );
}