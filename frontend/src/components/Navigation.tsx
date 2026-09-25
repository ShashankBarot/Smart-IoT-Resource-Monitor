"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChartNoAxesCombined, Cpu, Droplets, LayoutDashboard, Zap } from "lucide-react";
import Dock from "@/components/Dock";

const navigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Water", href: "/water", icon: Droplets },
  { name: "Electricity", href: "/electricity", icon: Zap },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Alerts", href: "/anomalies", icon: Bell },
  { name: "Device", href: "/device", icon: Cpu },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dockItems = navigationItems.map((item) => ({
    label: item.name,
    icon: <item.icon size={17} strokeWidth={1.8} aria-hidden="true" />,
    className: pathname === item.href ? "dock-item-active" : "",
    onClick: () => router.push(item.href),
  }));

  return (
    <header className="control-nav">
      <div className="control-nav-inner">
        <Link href="/" className="brand-lockup" aria-label="Smart IoT overview">
          <Image src="/brand-mark.svg" alt="" width={32} height={32} priority />
          <span className="brand-name">SMART IoT</span>
        </Link>

        <Dock items={dockItems} panelHeight={48} baseItemSize={36} magnification={52} distance={130} />

        <div className="live-pill"><span />Live</div>
      </div>
    </header>
  );
}
