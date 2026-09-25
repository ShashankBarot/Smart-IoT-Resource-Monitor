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
  backgroundColor: "#11042a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#fff",
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#39a7ff]">Smart monitoring system</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-[50px]">Resource overview</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#cfcfd4]">A live control room for water flow, electricity demand, device health, and anomalies.</p>
        </div>
        <div className="hidden items-center gap-3 rounded-full border border-[#007bff]/40 bg-[#007bff]/10 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#66b9ff] sm:flex">
          <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-emerald-400" : "bg-[#f7be00]"}`} />
          {loading ? "SYNCING" : isLive ? "LIVE" : "OFFLINE"}
        </div>
      </header>

      {error && <div className="mx-auto mt-5 max-w-[1400px] rounded-xl border border-[#f7be00]/30 bg-[#f7be00]/10 px-4 py-3 text-sm text-[#f7be00]">{error}</div>}

      <section className="mx-auto mt-7 grid max-w-[1400px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric href="/water" label="Water consumed" value={latestWater ? latestWater.totalLitres.toFixed(1) : "--"} unit="L" icon={Droplets} tone="blue" />
        <Metric href="/electricity" label="Current power" value={latestElectricity ? latestElectricity.power.toFixed(0) : "--"} unit="W" icon={Zap} tone="amber" />
        <Metric href="/device" label="Device status" value={isLive ? "Online" : "Offline"} unit={device?.deviceId ?? "Awaiting device"} icon={Cpu} tone="green" />
        <Metric href="/anomalies" label="Active alerts" value={String(anomalies.length)} unit={anomalies.length === 1 ? "attention item" : "attention items"} icon={Bell} tone="red" />
      </section>

      <section className="mx-auto mt-7 grid max-w-[1400px] gap-5 xl:grid-cols-2">
        <ChartPanel title="Water flow" subtitle="Latest sensor samples" unit="L/min" data={waterChart} color="#39d5ff" />
        <ChartPanel title="Electricity power" subtitle="Current demand profile" unit="W" data={electricityChart} color="#f7a928" />
      </section>

      <section className="mx-auto mt-5 grid max-w-[1400px] gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-[#0d0021]/70 p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-[0.18em] text-[#89898e]">Signal desk</p><h2 className="mt-2 text-xl font-semibold">Connected node</h2></div>
            <Activity size={22} className="text-[#39a7ff]" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Detail label="Node" value={device?.deviceId ?? "--"} />
            <Detail label="Signal" value={device?.rssi ? `${device.rssi} dBm` : "--"} />
            <Detail label="Last seen" value={device?.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : "--"} />
          </div>
        </div>
        <div className="rounded-2xl border border-[#f7be00]/20 bg-[#f7be00]/[0.06] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#f7be00]">Attention queue</p>
          <h2 className="mt-2 text-xl font-semibold">{anomalies.length ? `${anomalies.length} recent alert${anomalies.length === 1 ? "" : "s"}` : "No active alerts"}</h2>
          <p className="mt-3 text-sm leading-6 text-[#cfcfd4]">Backend detections appear here as the sensor stream changes.</p>
          <Link href="/anomalies" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f7be00] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ffd54d]">Open alerts <ArrowUpRight size={14} /></Link>
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
    blue: "border-[#39d5ff]/25 text-[#39d5ff]",
    amber: "border-[#f7a928]/25 text-[#f7a928]",
    green: "border-emerald-400/25 text-emerald-400",
    red: "border-[#d92d20]/35 text-[#ff756b]",
  };
  return <Link href={href} className={`group rounded-2xl border bg-[#0d0021]/70 p-5 transition hover:-translate-y-0.5 hover:bg-[#11042a] ${styles[tone]}`}><div className="flex items-start justify-between"><p className="text-xs uppercase tracking-[0.16em] text-[#89898e]">{label}</p><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></div><p className="mt-5 text-3xl font-bold tracking-tight text-white">{value}<span className="ml-2 text-sm font-medium text-[#89898e]">{unit}</span></p><p className="mt-4 flex items-center gap-1 text-xs text-[#cfcfd4]">View detail <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></p></Link>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-[0.14em] text-[#89898e]">{label}</p><p className="mt-2 truncate text-sm font-semibold text-white">{value}</p></div>;
}

function ChartPanel({ title, subtitle, unit, data, color }: { title: string; subtitle: string; unit: string; data: Array<{ time: string; value: number }>; color: string }) {
  const gradientId = `fill-${title.replaceAll(" ", "-")}`;
  return <div className="rounded-2xl border border-white/10 bg-[#0d0021]/70 p-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><h2 className="text-lg font-semibold">{title}</h2></div><p className="mt-2 text-sm text-[#89898e]">{subtitle}</p></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#cfcfd4]">{unit}</span></div><div className="mt-5 h-64">{data.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.32} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fill: "#89898e", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#89898e", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-[#89898e]">Waiting for live readings</div>}</div></div>;
}
