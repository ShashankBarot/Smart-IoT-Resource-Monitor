interface DeviceStatusCardProps {
  deviceId: string;
  status: "online" | "offline";
  lastSeen?: string;
  rssi?: number;
}

export default function DeviceStatusCard({
  deviceId,
  status,
  lastSeen,
  rssi,
}: DeviceStatusCardProps) {
  const isOnline = status === "online";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 shadow-xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">
            ESP32 Device
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Device health and connection
          </p>
        </div>

        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            isOnline
              ? "bg-green-400/10 text-green-400"
              : "bg-red-400/10 text-red-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
            }`}
          />

          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* Device Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-sm text-slate-400">
            Device ID
          </span>

          <span className="text-sm font-medium text-white">
            {deviceId}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-sm text-slate-400">
            Connection
          </span>

          <span
            className={`text-sm font-medium ${
              isOnline ? "text-green-400" : "text-red-400"
            }`}
          >
            {isOnline ? "Connected" : "Disconnected"}
          </span>
        </div>

        {rssi !== undefined && (
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-sm text-slate-400">
              Signal Strength
            </span>

            <span className="text-sm font-medium text-cyan-400">
              {rssi} dBm
            </span>
          </div>
        )}

        {lastSeen && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Last Seen
            </span>

            <span className="text-sm text-white">
              {lastSeen}
            </span>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div
        className={`mt-5 rounded-xl border p-3 ${
          isOnline
            ? "border-green-400/10 bg-green-400/5"
            : "border-red-400/10 bg-red-400/5"
        }`}
      >
        <p
          className={`text-xs ${
            isOnline ? "text-green-400" : "text-red-400"
          }`}
        >
          {isOnline
            ? "ESP32 is connected and ready to transmit sensor readings."
            : "ESP32 is currently offline. No live sensor data is being received."}
        </p>
      </div>
    </div>
  );
}
