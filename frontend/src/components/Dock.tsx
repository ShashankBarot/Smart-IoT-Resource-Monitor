"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ReactNode, useEffect, useRef, useState } from "react";
import "./Dock.css";

export type DockItemData = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
};

type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
};

type DockItemProps = DockItemData & {
  mouseX: ReturnType<typeof useMotionValue<number>>;
  distance: number;
  magnification: number;
  baseItemSize: number;
};

function DockItem({ icon, label, onClick, className = "", mouseX, distance, magnification, baseItemSize }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hovered = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const distanceFromMouse = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect();
    return value - (rect?.x ?? 0) - baseItemSize / 2;
  });
  const targetSize = useTransform(distanceFromMouse, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, { mass: 0.1, stiffness: 150, damping: 12 });

  // Subscribe to motion value changes so React re-renders the label
  useEffect(() => {
    return hovered.on("change", (v) => setIsHovered(v === 1));
  }, [hovered]);

  const activate = () => onClick?.();
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-label={label}
      onClick={activate}
      onKeyDown={onKeyDown}
      onHoverStart={() => hovered.set(1)}
      onHoverEnd={() => hovered.set(0)}
      onFocus={() => hovered.set(1)}
      onBlur={() => hovered.set(0)}
    >
      <div className="dock-icon">{icon}</div>
      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="dock-label"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Dock({
  items,
  className = "",
  distance = 160,
  panelHeight = 52,
  baseItemSize = 38,
  dockHeight = 88,
  magnification = 56,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const hovered = useMotionValue(0);
  const heightRow = useTransform(hovered, [0, 1], [panelHeight, Math.max(dockHeight, magnification + 20)]);
  const height = useSpring(heightRow, { mass: 0.1, stiffness: 150, damping: 12 });
  const [activeHover, setActiveHover] = useState(false);

  return (
    <motion.div className="dock-outer" style={{ height }}>
      <motion.div
        className={`dock-panel ${className}`.trim()}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application navigation"
        onMouseMove={(event) => {
          hovered.set(1);
          setActiveHover(true);
          mouseX.set(event.clientX);
        }}
        onMouseLeave={() => {
          hovered.set(0);
          setActiveHover(false);
          mouseX.set(Infinity);
        }}
        data-hovered={activeHover}
      >
        {items.map((item) => (
          <DockItem
            key={item.label}
            {...item}
            mouseX={mouseX}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
