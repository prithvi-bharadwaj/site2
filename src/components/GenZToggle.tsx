"use client";

import { Switch } from "./Switch";

interface GenZToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function GenZToggle({ enabled, onChange }: GenZToggleProps) {
  return (
    <div
      className="group inline-flex cursor-pointer items-center gap-3 select-none"
      // Clicks on the switch itself are handled by the switch.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".switch")) return;
        onChange(!enabled);
      }}
    >
      <span
        className="text-xs transition-colors"
        style={{
          color: enabled ? "var(--ink)" : "rgb(var(--ink-rgb) / 0.4)",
        }}
      >
        gen z mode
      </span>
      <Switch checked={enabled} onChange={onChange} label="gen z mode" />
    </div>
  );
}
