"use client";

interface GenZToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function GenZToggle({ enabled, onChange }: GenZToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="group flex cursor-pointer items-center gap-3 transition-colors duration-200"
      style={{
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
      }}
    >
      <span className="text-sm text-[#131316]/40 transition-colors group-hover:text-[#131316]/70">
        gen z mode
      </span>

      <span
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
        style={{
          backgroundColor: enabled
            ? "#131316"
            : "rgba(19, 19, 22, 0.15)",
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: enabled ? "#FFFFFF" : "rgba(19, 19, 22, 0.6)",
            transform: enabled ? "translateX(24px)" : "translateX(4px)",
          }}
        />
      </span>
    </button>
  );
}
