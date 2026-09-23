interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  subtitle?: string;
  type?: "water" | "electricity" | "device" | "alert";
  status?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  icon,
  subtitle,
  type = "water",
  status,
}: MetricCardProps) {
  const styles = {
    water: {
      border: "border-cyan-400/20",
      background: "from-cyan-500/15 to-blue-500/5",
      iconBackground: "bg-cyan-400/15",
      accent: "text-cyan-400",
    },

    electricity: {
      border: "border-orange-400/20",
      background: "from-orange-500/15 to-yellow-500/5",
      iconBackground: "bg-orange-400/15",
      accent: "text-orange-400",
    },

    device: {
      border: "border-green-400/20",
      background: "from-green-500/15 to-emerald-500/5",
      iconBackground: "bg-green-400/15",
      accent: "text-green-400",
    },

    alert: {
      border: "border-red-400/20",
      background: "from-red-500/15 to-orange-500/5",
      iconBackground: "bg-red-400/15",
      accent: "text-orange-400",
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${currentStyle.border} bg-gradient-to-br ${currentStyle.background} p-5 transition duration-300 hover:-translate-y-1`}
    >
      {/* Icon and Status */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${currentStyle.iconBackground} text-xl`}
        >
          {icon}
        </div>

        {status && (
          <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs font-medium text-green-400">
            {status}
          </span>
        )}
      </div>

      {/* Metric Information */}
      <p className="mt-5 text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-1 text-3xl font-bold text-white">
        {value}

        {unit && (
          <span className="ml-1 text-base font-medium text-slate-400">
            {unit}
          </span>
        )}
      </h3>

      {subtitle && (
        <p className={`mt-2 text-xs ${currentStyle.accent}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}