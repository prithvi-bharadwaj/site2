"use client";

import { GENZ_UNLOCK_XP, emitXpFx } from "@/lib/xp";

interface GenZToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** Locked until the visitor earns enough discovery xp. */
  locked?: boolean;
}

export function GenZToggle({ enabled, onChange, locked = false }: GenZToggleProps) {
  return (
    <button
      onClick={() => {
        if (locked) {
          emitXpFx({ text: `locked · ${GENZ_UNLOCK_XP} xp` });
          return;
        }
        onChange(!enabled);
      }}
      role="switch"
      aria-checked={enabled}
      aria-disabled={locked}
      title={locked ? `unlocks at ${GENZ_UNLOCK_XP} xp` : undefined}
      className="group flex cursor-pointer items-center gap-3 transition-colors duration-200"
      style={{
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
      }}
    >
      <span className="text-xs text-(--ink)/40 transition-colors group-hover:text-(--ink)/70">
        gen z mode
        {locked && <span className="ml-1.5 opacity-60">🔒</span>}
      </span>

      <span
        className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200"
        style={{
          backgroundColor: enabled
            ? "var(--ink)"
            : "rgb(var(--ink-rgb) / 0.15)",
          opacity: locked ? 0.5 : 1,
        }}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: enabled ? "var(--bg)" : "rgb(var(--ink-rgb) / 0.6)",
            transform: enabled ? "translateX(18px)" : "translateX(3px)",
          }}
        />
      </span>
    </button>
  );
}
