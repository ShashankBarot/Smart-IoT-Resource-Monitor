"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnomalyBadge from "@/components/AnomalyBadge";
import { fetchAnomalies } from "@/lib/data";
import { useSocket } from "@/lib/useSocket";

interface Anomaly {
  id: string;
  type: "water" | "electricity";
  severity: "low" | "medium" | "high";
  message: string;
  value: number;
  unit: string;
  timestamp: string;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Receive new anomalies in real time
  const handleRealtimeAnomaly = useCallback((data: unknown) => {
    const newAnomaly = data as Anomaly;

    setAnomalies((currentAnomalies) => {
      // Prevent duplicate anomaly entries
      const alreadyExists = currentAnomalies.some(
        (anomaly) => anomaly.id === newAnomaly.id
      );

      if (alreadyExists) {
        return currentAnomalies;
      }

      // Put newest anomaly at the top
      return [newAnomaly, ...currentAnomalies];
    });
  }, []);

  useSocket(undefined, handleRealtimeAnomaly);

  useEffect(() => {
    async function loadAnomalies() {
      try {
        setLoading(true);

        const data = await fetchAnomalies();

        setAnomalies(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load anomaly data.");
      } finally {
        setLoading(false);
      }
    }

    loadAnomalies();
  }, []);

  const highCount = anomalies.filter(
    (anomaly) => anomaly.severity === "high"
  ).length;

  const mediumCount = anomalies.filter(
    (anomaly) => anomaly.severity === "medium"
  ).length;

  const lowCount = anomalies.filter(
    (anomaly) => anomaly.severity === "low"
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <LoadingSpinner message="Loading anomaly data..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-lg font-semibold text-red-400">
            Anomaly Monitoring Error
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] p-6 text-white md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-red-400">
          ANOMALY MONITORING
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Anomaly Detection
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Monitor unusual water and electricity consumption patterns.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
          <p className="text-sm text-slate-400">
            Total Anomalies
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {anomalies.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
          <p className="text-sm text-slate-400">
            High Severity
          </p>

          <h2 className="mt-2 text-3xl font-bold text-red-400">
            {highCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5">
          <p className="text-sm text-slate-400">
            Medium Severity
          </p>

          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {mediumCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
          <p className="text-sm text-slate-400">
            Low Severity
          </p>

          <h2 className="mt-2 text-3xl font-bold text-green-400">
            {lowCount}
          </h2>
        </div>
      </div>

      {/* Real-time status */}
      <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />

          <p className="text-sm text-cyan-400">
            Real-time anomaly monitoring is enabled
          </p>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1728] shadow-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="font-semibold text-white">
            Recent Anomalies
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Latest unusual sensor readings detected by the system
          </p>
        </div>

        <div className="divide-y divide-white/5">
          {anomalies.length > 0 ? (
            anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="p-6 transition hover:bg-white/[0.02]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AnomalyBadge
                        severity={anomaly.severity}
                      />

                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {anomaly.type === "water"
                          ? "Water"
                          : "Electricity"}
                      </span>
                    </div>

                    <h4 className="mt-3 font-medium text-white">
                      {anomaly.message}
                    </h4>

                    <p className="mt-2 text-sm text-slate-400">
                      Detected value:{" "}
                      <span className="text-white">
                        {anomaly.value} {anomaly.unit}
                      </span>
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(
                        anomaly.timestamp
                      ).toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      ID: {anomaly.id}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                No anomalies detected.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}