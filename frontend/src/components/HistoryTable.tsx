interface HistoryReading {
  time: string;
  waterFlow?: number;
  power?: number;
  deviceId: string;
  status: "Normal" | "Warning" | "Critical";
}

interface HistoryTableProps {
  readings: HistoryReading[];
  title?: string;
  type?: "water" | "electricity";
}

export default function HistoryTable({
  readings,
  title = "Recent Sensor Readings",
  type = "water",
}: HistoryTableProps) {
  const statusStyles = {
    Normal: "bg-[#3fcb7f]/10 text-[#3fcb7f]",
    Warning: "bg-[#9984d8]/10 text-[#9984d8]",
    Critical: "bg-white/10 text-white",
  };

  const isWater = type === "water";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1728] shadow-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <h3 className="font-semibold text-white">{title}</h3>

        <p className="mt-1 text-xs text-slate-400">
          Latest readings received from the sensor device
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="border-b border-white/10">
              <th className="px-6 py-4 font-medium text-slate-400">
                Time
              </th>

              <th className="px-6 py-4 font-medium text-slate-400">
                {isWater ? "Water Flow" : "Power"}
              </th>

              <th className="px-6 py-4 font-medium text-slate-400">
                Device
              </th>

              <th className="px-6 py-4 font-medium text-slate-400">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {readings.length > 0 ? (
              readings.map((reading, index) => (
                <tr
                  key={`${reading.time}-${index}`}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 text-slate-300">
                    {reading.time}
                  </td>

                  <td
                    className={`px-6 py-4 ${
                      isWater ? "text-cyan-400" : "text-orange-400"
                    }`}
                  >
                    {isWater
                      ? `${(reading.waterFlow ?? 0).toFixed(2)} L/min`
                      : `${reading.power ?? 0} W`}
                  </td>

                  <td className="px-6 py-4 text-slate-300">
                    {reading.deviceId}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[reading.status]}`}
                    >
                      {reading.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  No sensor readings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}