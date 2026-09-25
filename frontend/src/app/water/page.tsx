"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SensorChart from "@/components/SensorChart";
import HistoryTable from "@/components/HistoryTable";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fetchWaterReadings } from "@/lib/data";
import { useSocket } from "@/lib/useSocket";

interface WaterReading {
  deviceId: string;
  timestamp: string;
  flowRate: number;
  totalLitres: number;
  unit: string;
}

export default function WaterPage() {
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleRealtimeReading = useCallback((data: unknown) => {
    const reading = data as WaterReading;

    setReadings((currentReadings) => {
      const updatedReadings = [...currentReadings, reading];

      // Keep only the latest 20 readings
      return updatedReadings.slice(-20);
    });
  }, []);

  useSocket(handleRealtimeReading);
  useEffect(() => {
    async function loadWaterData() {
      try {
        setLoading(true);

        const data = await fetchWaterReadings();

        setReadings(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load water sensor data.");
      } finally {
        setLoading(false);
      }
    }

    loadWaterData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <LoadingSpinner message="Loading water sensor data..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-lg font-semibold text-red-400">
            Water Monitoring Error
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  const latestReading = readings[readings.length - 1];

  const peakFlow =
    readings.length > 0
      ? Math.max(...readings.map((reading) => reading.flowRate))
      : 0;

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: reading.flowRate,
  }));

  const historyData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    waterFlow: reading.flowRate,
    power: 0,
    deviceId: reading.deviceId,
    status:
      reading.flowRate > 5
        ? ("Warning" as const)
        : ("Normal" as const),
  }));

  return (
    <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-cyan-400">
          WATER MONITORING
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Water Consumption
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Monitor real-time water flow and consumption.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Water Used"
          value={latestReading?.totalLitres.toFixed(1) || "0"}
          unit="L"
          icon="💧"
          subtitle="Latest cumulative reading"
          type="water"
        />

        <MetricCard
          title="Current Flow"
          value={latestReading?.flowRate.toFixed(2) || "0"}
          unit="L/min"
          icon="🌊"
          subtitle="Latest sensor reading"
          type="water"
        />

        <MetricCard
          title="Peak Flow"
          value={peakFlow.toFixed(2)}
          unit="L/min"
          icon="📈"
          subtitle="Highest recorded flow"
          type="water"
        />
      </div>

      {/* Chart */}
      <div className="mt-7">
        <SensorChart
          data={chartData}
          title="Water Flow Trend"
          subtitle="Water flow readings received from ESP32"
          unit="L/min"
          type="water"
        />
      </div>

      {/* Current Status */}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Current Water Flow
              </p>

              <h2 className="mt-2 text-3xl font-bold text-cyan-400">
                {latestReading?.flowRate.toFixed(2) || "0"} L/min
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
              <Droplets size={22} strokeWidth={1.8} aria-hidden="true" />
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
            Latest reading received from the water sensor.
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
          title="Water Sensor History"
          type="water"
        />
      </div>
    </main>
  );
}