"use client";

interface GenZToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function GenZToggle({ enabled, onChange }: GenZToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="group flex cursor-pointer items-center gap-2 transition-colors duration-200"
      style={{
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
      }}
    >
      <span className="text-xs text-[#F4F5F8]/40 transition-colors group-hover:text-[#F4F5F8]/60">
        genz mode
      </span>

      <span
        className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200"
        style={{
          backgroundColor: enabled
            ? "#F4F5F8"
            : "rgba(244, 245, 248, 0.15)",
        }}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: enabled ? "#131316" : "rgba(244, 245, 248, 0.6)",
            transform: enabled ? "translateX(14px)" : "translateX(3px)",
          }}
        />
      </span>
    </button>
  );
}
