import { Activity, Droplets, Gauge, PlugZap, TrendingUp, Zap } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  subtitle?: string;
  type?: "water" | "electricity" | "device" | "alert";
  status?: string;
}

export default function MetricCard({ title, value, unit, icon, subtitle, type = "water", status }: MetricCardProps) {
  const styles = {
    water: { border: "border-[#9984d8]/35", background: "bg-[#050607]", iconBackground: "bg-[#9984d8]/10", accent: "text-[#9984d8]" },
    electricity: { border: "border-[#3fcb7f]/35", background: "bg-[#050607]", iconBackground: "bg-[#3fcb7f]/10", accent: "text-[#3fcb7f]" },
    device: { border: "border-[#3fcb7f]/35", background: "bg-[#050607]", iconBackground: "bg-[#3fcb7f]/10", accent: "text-[#3fcb7f]" },
    alert: { border: "border-[#9984d8]/35", background: "bg-[#050607]", iconBackground: "bg-[#9984d8]/10", accent: "text-[#9984d8]" },
  };
  const icons = { "💧": Droplets, "🌊": Gauge, "📈": TrendingUp, "⚡": Zap, "🔌": PlugZap, "🔋": Activity } as const;
  const currentStyle = styles[type];
  const Icon = icons[icon as keyof typeof icons] ?? Activity;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${currentStyle.border} ${currentStyle.background} p-5 transition duration-300 hover:border-white/40`}>
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${currentStyle.iconBackground}`}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
        {status && <span className="rounded-full bg-[#3fcb7f]/10 px-2.5 py-1 text-xs font-medium text-[#3fcb7f]">{status}</span>}
      </div>
      <p className="mt-5 text-sm text-[#b3b3b3]">{title}</p>
      <h3 className="mt-1 text-3xl font-semibold text-white">{value}{unit && <span className="ml-1 text-base font-normal text-[#b3b3b3]">{unit}</span>}</h3>
      {subtitle && <p className={`mt-2 text-xs ${currentStyle.accent}`}>{subtitle}</p>}
    </div>
  );
}
