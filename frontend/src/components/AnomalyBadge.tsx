interface AnomalyBadgeProps {
  severity: "low" | "medium" | "high";
  message?: string;
}

export default function AnomalyBadge({
  severity,
  message,
}: AnomalyBadgeProps) {
  const styles = {
    low: {
      badge: "bg-green-400/10 text-green-400 border-green-400/20",
      icon: "✓",
      label: "Low",
    },
    medium: {
      badge: "bg-orange-400/10 text-orange-400 border-orange-400/20",
      icon: "⚠",
      label: "Medium",
    },
    high: {
      badge: "bg-red-400/10 text-red-400 border-red-400/20",
      icon: "!",
      label: "High",
    },
  };

  const currentStyle = styles[severity];

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${currentStyle.badge}`}
      >
        <span>{currentStyle.icon}</span>
        {currentStyle.label}
      </span>

      {message && (
        <span className="text-sm text-slate-400">
          {message}
        </span>
      )}
    </div>
  );
}