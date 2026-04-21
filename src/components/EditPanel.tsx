"use client";

interface EditPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function EditPanel({ label, value, onChange }: EditPanelProps) {
  // Estimate rows from content length (monospace ~70 chars/row at typical width)
  const rows = Math.max(2, Math.min(8, Math.ceil(value.length / 70)));

  return (
    <div className="mb-1">
      <label className="block text-[10px] uppercase tracking-wider text-[#F4F5F8]/25 mb-1">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full bg-[#F4F5F8]/[0.03] border border-[#F4F5F8]/10 rounded-md px-3 py-2 text-xs text-[#F4F5F8]/70 font-mono leading-relaxed resize-vertical focus:outline-none focus:border-[#F4F5F8]/25 transition-colors"
      />
    </div>
  );
}
