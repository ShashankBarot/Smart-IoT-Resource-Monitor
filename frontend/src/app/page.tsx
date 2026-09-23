"use client";
import { useCallback } from "react";
import { useSocket } from "@/lib/useSocket";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const waterData = [
  { time: "08:00", usage: 2.4 },
  { time: "09:00", usage: 3.1 },
  { time: "10:00", usage: 2.8 },
  { time: "11:00", usage: 4.2 },
  { time: "12:00", usage: 3.6 },
  { time: "13:00", usage: 5.1 },
  { time: "14:00", usage: 4.4 },
];

const electricityData = [
  { time: "08:00", power: 420 },
  { time: "09:00", power: 510 },
  { time: "10:00", power: 470 },
  { time: "11:00", power: 620 },
  { time: "12:00", power: 580 },
  { time: "13:00", power: 710 },
  { time: "14:00", power: 650 },
];

export default function Home() {
  const handleRealtimeReading = useCallback((data: unknown) => {
    console.log("Real-time sensor reading received:", data);
  }, []);

  useSocket(handleRealtimeReading);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 flex-col border-r border-white/10 bg-[#0b1728] p-5 md:flex">

          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl shadow-lg shadow-cyan-500/20">
                ⚡
              </div>

              <div>
                <h1 className="font-bold">SMART IoT</h1>
                <p className="text-xs text-slate-400">Resource Monitor</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">

            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-medium shadow-lg shadow-blue-500/20">
              🏠 <span className="ml-2">Overview</span>
            </div>

            <div className="cursor-pointer rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
              💧 <span className="ml-2">Water Monitor</span>
            </div>

            <div className="cursor-pointer rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
              ⚡ <span className="ml-2">Electricity</span>
            </div>

            <div className="cursor-pointer rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
              📊 <span className="ml-2">Analytics</span>
            </div>

            <div className="cursor-pointer rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
              🚨 <span className="ml-2">Alerts</span>
            </div>

          </nav>

          <div className="mt-auto rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
              <span className="text-sm font-medium text-green-400">
                System Online
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              ESP32 sensor node is connected and transmitting data.
            </p>
          </div>

        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1">

          {/* HEADER */}
          <header className="border-b border-white/10 bg-[#0b1728]/80 px-6 py-5 backdrop-blur md:px-8">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-cyan-400">
                  SMART MONITORING SYSTEM
                </p>

                <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                  Resource Overview
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Monitor water and electricity consumption in real time.
                </p>
              </div>

              <div className="hidden items-center gap-3 rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 sm:flex">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400"></span>
                <span className="text-sm font-medium text-green-400">
                  LIVE
                </span>
              </div>

            </div>

          </header>

          {/* DASHBOARD CONTENT */}
          <div className="p-6 md:p-8">

            {/* WELCOME */}
            <div className="mb-7">
              <h3 className="text-xl font-semibold">
                Today's Overview 👋
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Here's what's happening with your resources today.
              </p>
            </div>

            {/* METRIC CARDS */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {/* WATER */}
              <div className="group relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-blue-500/5 p-5 transition hover:-translate-y-1 hover:border-cyan-400/40">

                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl"></div>

                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-xl">
                    💧
                  </div>

                  <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs text-green-400">
                    Normal
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Water Consumption
                </p>

                <h4 className="mt-1 text-3xl font-bold">
                  128.4
                  <span className="ml-1 text-base font-medium text-slate-400">
                    L
                  </span>
                </h4>

                <p className="mt-2 text-xs text-cyan-400">
                  ↑ 8.2% compared with yesterday
                </p>

              </div>

              {/* ELECTRICITY */}
              <div className="group relative overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/15 to-yellow-500/5 p-5 transition hover:-translate-y-1 hover:border-orange-400/40">

                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-400/10 blur-2xl"></div>

                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-400/15 text-xl">
                    ⚡
                  </div>

                  <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs text-green-400">
                    Normal
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Electricity Usage
                </p>

                <h4 className="mt-1 text-3xl font-bold">
                  4.82
                  <span className="ml-1 text-base font-medium text-slate-400">
                    kWh
                  </span>
                </h4>

                <p className="mt-2 text-xs text-orange-400">
                  Current power: 650 W
                </p>

              </div>

              {/* DEVICE */}
              <div className="group relative overflow-hidden rounded-2xl border border-green-400/20 bg-gradient-to-br from-green-500/15 to-emerald-500/5 p-5 transition hover:-translate-y-1 hover:border-green-400/40">

                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-400/15 text-xl">
                    📡
                  </div>

                  <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs text-green-400">
                    Connected
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Device Status
                </p>

                <h4 className="mt-1 text-3xl font-bold">
                  Online
                </h4>

                <p className="mt-2 text-xs text-green-400">
                  ESP32-dev-01 • Signal strong
                </p>

              </div>

              {/* ALERT */}
              <div className="group relative overflow-hidden rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/15 to-orange-500/5 p-5 transition hover:-translate-y-1 hover:border-red-400/40">

                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/15 text-xl">
                    🚨
                  </div>

                  <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-xs text-orange-400">
                    Attention
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Active Alerts
                </p>

                <h4 className="mt-1 text-3xl font-bold">
                  1
                </h4>

                <p className="mt-2 text-xs text-orange-400">
                  Unusual consumption detected
                </p>

              </div>

            </div>

            {/* CHARTS */}
            <div className="mt-7 grid gap-6 xl:grid-cols-2">

              {/* WATER CHART */}
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 shadow-xl">

                <div className="mb-5 flex items-start justify-between">

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-400"></span>

                      <h3 className="font-semibold">
                        Water Flow Rate
                      </h3>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      Hourly consumption pattern
                    </p>
                  </div>

                  <span className="rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-400">
                    L/min
                  </span>

                </div>

                <div className="h-72">

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waterData}>

                      <defs>
                        <linearGradient
                          id="waterGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22d3ee"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#22d3ee"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                      />

                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />

                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1d31",
                          border: "1px solid #334155",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="usage"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        fill="url(#waterGradient)"
                      />

                    </AreaChart>
                  </ResponsiveContainer>

                </div>

              </div>

              {/* ELECTRICITY CHART */}
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 shadow-xl">

                <div className="mb-5 flex items-start justify-between">

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-400"></span>

                      <h3 className="font-semibold">
                        Electricity Power
                      </h3>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      Hourly power consumption
                    </p>
                  </div>

                  <span className="rounded-lg bg-orange-400/10 px-3 py-1.5 text-xs text-orange-400">
                    Watts
                  </span>

                </div>

                <div className="h-72">

                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={electricityData}>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                      />

                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />

                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1d31",
                          border: "1px solid #334155",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="power"
                        stroke="#fb923c"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#fb923c",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 7 }}
                      />

                    </LineChart>
                  </ResponsiveContainer>

                </div>

              </div>

            </div>

            {/* BOTTOM SECTION */}
            <div className="mt-7 grid gap-6 lg:grid-cols-3">

              {/* DEVICE CARD */}
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">

                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      ESP32 Device
                    </h3>

                    <p className="text-xs text-slate-400">
                      Device health
                    </p>
                  </div>

                  <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs text-green-400">
                    Online
                  </span>
                </div>

                <div className="space-y-4">

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">
                      Device ID
                    </span>

                    <span className="text-sm">
                      esp32-dev-01
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">
                      Signal
                    </span>

                    <span className="text-sm text-green-400">
                      Strong
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">
                      Last update
                    </span>

                    <span className="text-sm">
                      Just now
                    </span>
                  </div>

                </div>

              </div>

              {/* ALERT CARD */}
              <div className="rounded-2xl border border-orange-400/20 bg-[#0b1728] p-6">

                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Latest Alert
                    </h3>

                    <p className="text-xs text-slate-400">
                      Monitoring system
                    </p>
                  </div>

                  <span className="text-xl">
                    ⚠️
                  </span>
                </div>

                <div className="rounded-xl border border-orange-400/10 bg-orange-400/5 p-4">

                  <p className="text-sm font-medium text-orange-300">
                    Unusual water consumption
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Water flow is currently above the normal baseline.
                    Check the sensor readings for further details.
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Detected recently
                  </p>

                </div>

              </div>

              {/* QUICK STATS */}
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">

                <div className="mb-5">
                  <h3 className="font-semibold">
                    Quick Statistics
                  </h3>

                  <p className="text-xs text-slate-400">
                    Current system readings
                  </p>
                </div>

                <div className="space-y-4">

                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-400">
                        Average Flow
                      </span>

                      <span className="text-cyan-400">
                        3.72 L/min
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full w-[62%] rounded-full bg-cyan-400"></div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-400">
                        Power Load
                      </span>

                      <span className="text-orange-400">
                        650 W
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full w-[72%] rounded-full bg-orange-400"></div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}