"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartPoint {
  time: string;
  value: number;
}

interface SensorChartProps {
  data: ChartPoint[];
  title: string;
  subtitle?: string;
  unit: string;
  type?: "water" | "electricity";
}

export default function SensorChart({
  data,
  title,
  subtitle,
  unit,
  type = "water",
}: SensorChartProps) {
  const isWater = type === "water";

  const chartColor = isWater ? "#9984d8" : "#3fcb7f";
  const gradientId = isWater ? "waterChartGradient" : "electricityChartGradient";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 shadow-xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: chartColor }}
            />

            <h3 className="font-semibold text-white">{title}</h3>
          </div>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>

        <span
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{
            backgroundColor: `${chartColor}18`,
            color: chartColor,
          }}
        >
          {unit}
        </span>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={chartColor}
                  stopOpacity={0.35}
                />

                <stop
                  offset="100%"
                  stopColor={chartColor}
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
              tick={{
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />

            <YAxis
              stroke="#64748b"
              tick={{
                fill: "#94a3b8",
                fontSize: 12,
              }}
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
              dataKey="value"
              stroke={chartColor}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}