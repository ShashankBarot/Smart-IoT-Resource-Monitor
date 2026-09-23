"use client";

import { useCallback, useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import SensorChart from "@/components/SensorChart";
import HistoryTable from "@/components/HistoryTable";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fetchElectricityReadings } from "@/lib/data";
import { useSocket } from "@/lib/useSocket";

interface ElectricityReading {
  deviceId: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  unit: string;
}

export default function ElectricityPage() {
  const [readings, setReadings] = useState<ElectricityReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleRealtimeReading = useCallback((data: unknown) => {
    const reading = data as ElectricityReading;

    setReadings((currentReadings) => {
      const updatedReadings = [...currentReadings, reading];

      // Keep only the latest 20 readings
      return updatedReadings.slice(-20);
    });
  }, []);

  useSocket(handleRealtimeReading);

  useEffect(() => {
    async function loadElectricityData() {
      try {
        setLoading(true);

        const data = await fetchElectricityReadings();

        setReadings(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load electricity sensor data.");
      } finally {
        setLoading(false);
      }
    }

    loadElectricityData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <LoadingSpinner message="Loading electricity sensor data..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-lg font-semibold text-red-400">
            Electricity Monitoring Error
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  const latestReading = readings[readings.length - 1];

  const peakPower =
    readings.length > 0
      ? Math.max(...readings.map((reading) => reading.power))
      : 0;

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: reading.power,
  }));

  const historyData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    waterFlow: 0,
    power: reading.power,
    deviceId: reading.deviceId,
    status:
      reading.power > 700
        ? ("Warning" as const)
        : ("Normal" as const),
  }));

  return (
    <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-400">
          ELECTRICITY MONITORING
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Electricity Consumption
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Monitor real-time power and energy consumption.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Current Energy"
          value={latestReading?.energy.toFixed(2) || "0"}
          unit="kWh"
          icon="⚡"
          subtitle="Latest energy reading"
          type="electricity"
        />

        <MetricCard
          title="Current Power"
          value={latestReading?.power.toFixed(0) || "0"}
          unit="W"
          icon="🔌"
          subtitle="Latest power reading"
          type="electricity"
        />

        <MetricCard
          title="Voltage"
          value={latestReading?.voltage.toFixed(1) || "0"}
          unit="V"
          icon="🔋"
          subtitle="Current voltage"
          type="electricity"
        />
      </div>

      {/* Chart */}
      <div className="mt-7">
        <SensorChart
          data={chartData}
          title="Power Consumption Trend"
          subtitle="Power readings received from ESP32"
          unit="W"
          type="electricity"
        />
      </div>

      {/* Current Status */}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Current Power
              </p>

              <h2 className="mt-2 text-3xl font-bold text-orange-400">
                {latestReading?.power.toFixed(0) || "0"} W
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10 text-2xl">
              ⚡
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />

            <span className="text-sm text-green-400">
              Sensor Active
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">
          <p className="text-sm text-slate-400">
            Connected Device
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            {latestReading?.deviceId || "No device"}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Latest reading received from the electricity sensor.
          </p>

          <div className="mt-5 rounded-xl bg-green-400/5 p-3">
            <p className="text-xs text-green-400">
              Device data is being loaded through the frontend
              data layer.
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mt-7">
        <HistoryTable
          readings={historyData}
          title="Electricity Sensor History"
          type="electricity"
        />
      </div>
    </main>
  );
}