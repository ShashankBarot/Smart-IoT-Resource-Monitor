"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    name: "Overview",
    href: "/",
    icon: "🏠",
  },
  {
    name: "Water Monitor",
    href: "/water",
    icon: "💧",
  },
  {
    name: "Electricity",
    href: "/electricity",
    icon: "⚡",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: "📊",
  },
  {
    name: "Alerts",
    href: "/anomalies",
    icon: "🚨",
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0b1728] p-5 md:flex">
        {/* Logo */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl shadow-lg shadow-cyan-500/20">
              ⚡
            </div>

            <div>
              <h1 className="font-bold text-white">SMART IoT</h1>
              <p className="text-xs text-slate-400">
                Resource Monitor
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-xl px-4 py-3 font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span className="ml-3">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div className="mt-auto rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />

            <span className="text-sm font-medium text-green-400">
              System Online
            </span>
          </div>

          <p className="text-xs leading-5 text-slate-400">
            ESP32 sensor node is connected and transmitting data.
          </p>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1728]/95 px-3 py-3 backdrop-blur md:hidden">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-lg">
            ⚡
          </div>

          <div>
            <h1 className="text-sm font-bold text-white">
              SMART IoT
            </h1>

            <p className="text-[10px] text-slate-400">
              Resource Monitor
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}