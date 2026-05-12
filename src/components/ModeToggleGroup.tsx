"use client";

import type { SiteMode } from "@/lib/mode-transforms";

const CYCLE: SiteMode[] = ["default", "genz", "braille", "binary"];
const LABEL: Record<SiteMode, string> = {
  default: "off",
  genz: "genz",
  braille: "blind",
  binary: "ai bot",
};

interface ModeCycleProps {
  mode: SiteMode;
  onChange: (mode: SiteMode) => void;
}

/**
 * Single cycling switch. Default state shows "mode: off".
 * Each click advances: off → genz → blind → ai bot → off.
 */
export function ModeCycle({ mode, onChange }: ModeCycleProps) {
  const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
  const active = mode !== "default";

  return (
    <button
      onClick={() => onChange(next)}
      className="group flex cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-1.5 transition-colors duration-200"
      style={{
        background: active ? "rgba(244,245,248,0.08)" : "rgba(244,245,248,0.03)",
        border: `1px solid rgba(244,245,248,${active ? 0.18 : 0.08})`,
      }}
    >
      <span className="text-[10px] uppercase tracking-widest text-[#F4F5F8]/40 group-hover:text-[#F4F5F8]/60 transition-colors">
        mode
      </span>
      <span
        className="relative inline-flex h-4 w-12 items-center rounded-full transition-colors duration-200"
        style={{
          backgroundColor: active ? "#F4F5F8" : "rgba(244, 245, 248, 0.15)",
        }}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full transition-transform duration-300"
          style={{
            backgroundColor: active ? "#131316" : "rgba(244, 245, 248, 0.6)",
            transform: `translateX(${3 + CYCLE.indexOf(mode) * 12}px)`,
          }}
        />
      </span>
      <span
        className="text-xs text-[#F4F5F8]/60 group-hover:text-[#F4F5F8]/90 transition-colors tabular-nums"
        style={{ minWidth: 38, textAlign: "left" }}
      >
        {LABEL[mode]}
      </span>
    </button>
  );
}
