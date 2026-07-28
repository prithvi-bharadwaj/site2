"use client";

import { useRef } from "react";
import { trackInteraction } from "@/lib/analytics";

interface EditPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function EditPanel({ label, value, onChange }: EditPanelProps) {
  const valueOnFocus = useRef(value);
  // Estimate rows from content length (monospace ~70 chars/row at typical width)
  const rows = Math.max(2, Math.min(8, Math.ceil(value.length / 70)));

  return (
    <div className="mb-1">
      <label className="block text-[10px] uppercase tracking-wider text-(--ink)/25 mb-1">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          valueOnFocus.current = value;
          trackInteraction("content_edit_started", { field: label });
        }}
        onBlur={() => {
          trackInteraction("content_edit_finished", {
            field: label,
            changed: value !== valueOnFocus.current,
          });
        }}
        spellCheck={false}
        className="ph-no-capture w-full bg-(--ink)/[0.03] border border-(--ink)/10 rounded-md px-3 py-2 text-xs text-(--ink)/70 font-mono leading-relaxed resize-vertical focus:outline-none focus:border-(--ink)/25 transition-colors"
      />
    </div>
  );
}
