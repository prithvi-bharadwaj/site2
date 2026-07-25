"use client";

interface GenZToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function GenZToggle({ enabled, onChange }: GenZToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      role="switch"
      aria-checked={enabled}
      // Vertical padding + negative margin: ~44px touch target, zero layout shift.
      className="group -my-3 -mr-3 flex cursor-pointer items-center gap-3 py-3 pr-3 transition-colors duration-200"
      style={{
        background: "none",
        border: "none",
        font: "inherit",
      }}
    >
      <span className="text-xs text-(--ink)/40 transition-colors group-hover:text-(--ink)/70">
        gen z mode
      </span>

      <span
        className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200"
        style={{
          backgroundColor: enabled
            ? "var(--ink)"
            : "rgb(var(--ink-rgb) / 0.15)",
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
