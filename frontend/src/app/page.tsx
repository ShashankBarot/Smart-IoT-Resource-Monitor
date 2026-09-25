"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Cpu,
  Droplets,
  Gauge,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnomalies, fetchDeviceStatus, fetchElectricityReadings, fetchWaterReadings } from "@/lib/data";
import { useSocket } from "@/lib/useSocket";

interface WaterReading {
  deviceId: string;
  timestamp: string;
  flowRate: number;
  totalLitres: number;
  unit: string;
}

interface ElectricityReading {
  deviceId: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  unit: string;
}

interface DeviceStatus {
  deviceId: string;
  status: "online" | "offline";
  lastSeen: string;
  rssi: number;
}

interface Anomaly {
  id: string;
  severity: "low" | "medium" | "high";
}

interface RealtimeReading {
  water?: WaterReading;
  electricity?: ElectricityReading;
  flowRate?: number;
  totalLitres?: number;
  power?: number;
  voltage?: number;
  current?: number;
  energy?: number;
  deviceId?: string;
  timestamp?: string;
}

const tooltipStyle = {
  backgroundColor: "#040916",
  border: "1px solid rgba(56, 189, 248, 0.25)",
  borderRadius: "12px",
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
};

export default function Home() {
  const [water, setWater] = useState<WaterReading[]>([]);
  const [electricity, setElectricity] = useState<ElectricityReading[]>([]);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleReading = useCallback((payload: unknown) => {
    const reading = payload as RealtimeReading;
    const timestamp = reading.timestamp ?? new Date().toISOString();
    const deviceId = reading.deviceId ?? device?.deviceId ?? "esp32-01";

    if (reading.water || reading.flowRate !== undefined) {
      const source = reading.water ?? reading;
      setWater((current) => [...current, {
        deviceId: source.deviceId ?? deviceId,
        timestamp: source.timestamp ?? timestamp,
        flowRate: source.flowRate ?? 0,
        totalLitres: source.totalLitres ?? reading.totalLitres ?? 0,
        unit: "L",
      }].slice(-24));
    }
    if (reading.electricity || reading.power !== undefined) {
      const source = reading.electricity ?? reading;
      setElectricity((current) => [...current, {
        deviceId: source.deviceId ?? deviceId,
        timestamp: source.timestamp ?? timestamp,
        voltage: source.voltage ?? reading.voltage ?? 0,
        current: source.current ?? reading.current ?? 0,
        power: source.power ?? reading.power ?? 0,
        energy: source.energy ?? reading.energy ?? 0,
        unit: "home",
      }].slice(-24));
    }
  }, [device?.deviceId]);

  const handleAnomaly = useCallback((payload: unknown) => {
    const anomaly = payload as Anomaly;
    setAnomalies((current) => current.some((item) => item.id === anomaly.id) ? current : [anomaly, ...current]);
  }, []);

  useSocket(handleReading, handleAnomaly);

  useEffect(() => {
    Promise.all([fetchWaterReadings(), fetchElectricityReadings(), fetchDeviceStatus(), fetchAnomalies()])
      .then(([waterReadings, electricityReadings, deviceStatus, recentAnomalies]) => {
        setWater(waterReadings);
        setElectricity(electricityReadings);
        setDevice(deviceStatus);
        setAnomalies(recentAnomalies);
      })
      .catch(() => setError("Live data is unavailable. Check the backend connection."))
      .finally(() => setLoading(false));
  }, []);

  const latestWater = water[water.length - 1];
  const latestElectricity = electricity[electricity.length - 1];
  const waterChart = water.slice(-12).map((reading) => ({ time: formatTime(reading.timestamp), value: reading.flowRate }));
  const electricityChart = electricity.slice(-12).map((reading) => ({ time: formatTime(reading.timestamp), value: reading.power }));
  const isLive = device?.status === "online";

  return (
    <main className="min-h-screen px-5 py-7 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex max-w-[1400px] items-start justify-between border-b border-white/10 pb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#38bdf8]">Smart monitoring system</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-[50px]">Resource overview</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#94a3b8]">A live control room for water flow, electricity demand, device health, and anomalies.</p>
        </div>
        <div className="hidden items-center gap-3 rounded-full border border-sky-500/30 bg-sky-950/40 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#38bdf8] backdrop-blur-md sm:flex">
          <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-emerald-400" : "bg-[#f7be00]"}`} />
          {loading ? "SYNCING" : isLive ? "LIVE" : "OFFLINE"}
        </div>
      </header>

      {error && <div className="mx-auto mt-5 max-w-[1400px] rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">{error}</div>}

      <section className="mx-auto mt-7 grid max-w-[1400px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric href="/water" label="Water consumed" value={latestWater ? latestWater.totalLitres.toFixed(1) : "--"} unit="L" icon={Droplets} tone="blue" />
        <Metric href="/electricity" label="Current power" value={latestElectricity ? latestElectricity.power.toFixed(0) : "--"} unit="W" icon={Zap} tone="amber" />
        <Metric href="/device" label="Device status" value={isLive ? "Online" : "Offline"} unit={device?.deviceId ?? "Awaiting device"} icon={Cpu} tone="green" />
        <Metric href="/anomalies" label="Active alerts" value={String(anomalies.length)} unit={anomalies.length === 1 ? "attention item" : "attention items"} icon={Bell} tone="red" />
      </section>

      <section className="mx-auto mt-7 grid max-w-[1400px] gap-5 xl:grid-cols-2">
        <ChartPanel title="Water flow" subtitle="Latest sensor samples" unit="L/min" data={waterChart} color="#38bdf8" />
        <ChartPanel title="Electricity power" subtitle="Current demand profile" unit="W" data={electricityChart} color="#f59e0b" />
      </section>

      <section className="mx-auto mt-5 grid max-w-[1400px] gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-b from-[#0a182e]/85 via-[#040916]/90 to-[#02050c]/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">Signal desk</p>
              <h2 className="mt-2 text-xl font-semibold">Connected node</h2>
            </div>
            <Activity size={22} className="text-[#38bdf8]" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Detail label="Node" value={device?.deviceId ?? "--"} />
            <Detail label="Signal" value={device?.rssi ? `${device.rssi} dBm` : "--"} />
            <Detail label="Last seen" value={device?.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : "--"} />
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#0a182e]/85 via-[#040916]/90 to-[#02050c]/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400">Attention queue</p>
          <h2 className="mt-2 text-xl font-semibold">{anomalies.length ? `${anomalies.length} recent alert${anomalies.length === 1 ? "" : "s"}` : "No active alerts"}</h2>
          <p className="mt-3 text-sm leading-6 text-[#94a3b8]">Backend detections appear here as the sensor stream changes.</p>
          <Link href="/anomalies" className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-300">
            Open alerts <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Metric({ href, label, value, unit, icon: Icon, tone }: { href: string; label: string; value: string; unit: string; icon: typeof Gauge; tone: "blue" | "amber" | "green" | "red" }) {
  const styles = {
    blue: "border-sky-500/20 text-sky-400 group-hover:border-sky-400/40",
    amber: "border-amber-500/20 text-amber-400 group-hover:border-amber-400/40",
    green: "border-emerald-500/20 text-emerald-400 group-hover:border-emerald-400/40",
    red: "border-rose-500/20 text-rose-400 group-hover:border-rose-400/40",
  };
  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-gradient-to-b from-[#0a182e]/85 via-[#040916]/90 to-[#02050c]/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:from-[#0f2444]/90 hover:via-[#060e1f]/95 hover:to-[#030610]/98 ${styles[tone]}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-[0.16em] text-[#94a3b8]">{label}</p>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-white">
        {value}
        <span className="ml-2 text-sm font-medium text-[#94a3b8]">{unit}</span>
      </p>
      <p className="mt-4 flex items-center gap-1 text-xs text-[#cbd5e1]">
        View detail <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </p>
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[#94a3b8]">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ChartPanel({ title, subtitle, unit, data, color }: { title: string; subtitle: string; unit: string; data: Array<{ time: string; value: number }>; color: string }) {
  const gradientId = `fill-${title.replaceAll(" ", "-")}`;
  return (
    <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-b from-[#0a182e]/85 via-[#040916]/90 to-[#02050c]/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="mt-2 text-sm text-[#94a3b8]">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#cbd5e1]">{unit}</span>
      </div>
      <div className="mt-5 h-64">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-[#94a3b8]">
            Waiting for live readings
          </div>
        )}
      </div>
    </div>
  );
}
