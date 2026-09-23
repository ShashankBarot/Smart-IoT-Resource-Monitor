"use client";

import { useEffect, useState } from "react";
import SensorChart from "@/components/SensorChart";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  fetchWaterAnalytics,
  fetchElectricityAnalytics,
} from "@/lib/data";

interface ChartPoint {
  time: string;
  value: number;
}

export default function AnalyticsPage() {
  const [waterData, setWaterData] = useState<ChartPoint[]>([]);
  const [electricityData, setElectricityData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);

        const [water, electricity] = await Promise.all([
          fetchWaterAnalytics(),
          fetchElectricityAnalytics(),
        ]);

        setWaterData(water);
        setElectricityData(electricity);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load analytics data.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <LoadingSpinner message="Loading analytics..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-lg font-semibold text-red-400">
            Analytics Error
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  const totalWater = waterData.reduce(
    (total, item) => total + item.value,
    0
  );

  const totalElectricity = electricityData.reduce(
    (total, item) => total + item.value,
    0
  );

  const peakWater =
    waterData.length > 0
      ? Math.max(...waterData.map((item) => item.value))
      : 0;

  const peakElectricity =
    electricityData.length > 0
      ? Math.max(...electricityData.map((item) => item.value))
      : 0;

  return (
    <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-purple-400">
          RESOURCE ANALYTICS
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Usage Analytics
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Analyze water and electricity consumption trends.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="text-sm text-slate-400">
            Water Total
          </p>

          <h2 className="mt-2 text-3xl font-bold text-cyan-400">
            {totalWater.toFixed(1)} L/min
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Based on available readings
          </p>
        </div>

        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5">
          <p className="text-sm text-slate-400">
            Electricity Total
          </p>

          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {totalElectricity.toFixed(2)} kWh
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Based on available readings
          </p>
        </div>

        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
          <p className="text-sm text-slate-400">
            Peak Water Flow
          </p>

          <h2 className="mt-2 text-3xl font-bold text-purple-400">
            {peakWater.toFixed(2)} L/min
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Highest available reading
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
          <p className="text-sm text-slate-400">
            Peak Electricity
          </p>

          <h2 className="mt-2 text-3xl font-bold text-yellow-400">
            {peakElectricity.toFixed(0)} W
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Highest available reading
          </p>
        </div>
      </div>

      {/* Water Chart */}
      <div className="mt-7">
        <SensorChart
          data={waterData}
          title="Water Flow Analytics"
          subtitle="Water readings received from the sensor"
          unit="L/min"
          type="water"
        />
      </div>

      {/* Electricity Chart */}
      <div className="mt-7">
        <SensorChart
          data={electricityData}
          title="Electricity Energy Analytics"
          subtitle="Energy readings received from the sensor"
          unit="kWh"
          type="electricity"
        />
      </div>

      {/* Insights */}
      <div className="mt-7 rounded-2xl border border-white/10 bg-[#0b1728] p-6">
        <h2 className="text-lg font-semibold text-white">
          Usage Insights
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-cyan-400/5 p-4">
            <p className="text-sm font-medium text-cyan-400">
              Water Monitoring
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Water flow readings are collected from the sensor
              and displayed as a trend for easier monitoring.
            </p>
          </div>

          <div className="rounded-xl bg-orange-400/5 p-4">
            <p className="text-sm font-medium text-orange-400">
              Electricity Monitoring
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Electricity energy readings can be analyzed to
              understand resource consumption patterns.
            </p>
          </div>

          <div className="rounded-xl bg-purple-400/5 p-4">
            <p className="text-sm font-medium text-purple-400">
              Data Analysis
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Analytics can help identify changes and unusual
              resource usage over time.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}