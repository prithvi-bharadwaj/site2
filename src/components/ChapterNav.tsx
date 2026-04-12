"use client";

interface Chapter {
  id: string;
  label: string;
}

interface ChapterNavProps {
  chapters: readonly Chapter[];
  activeId: string;
  onChange: (id: string) => void;
}

export function ChapterNav({ chapters, activeId, onChange }: ChapterNavProps) {
  return (
    <nav
      className="flex gap-4 overflow-x-auto pb-3 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {chapters.map((ch) => {
        const active = ch.id === activeId;
        return (
          <button
            key={ch.id}
            onClick={() => onChange(ch.id)}
            className={`shrink-0 cursor-pointer whitespace-nowrap text-xs transition-colors duration-200 ${
              active
                ? "text-[#F4F5F8]/90"
                : "text-[#F4F5F8]/30 hover:text-[#F4F5F8]/60"
            }`}
            style={{
              background: "none",
              border: "none",
              borderBottom: active
                ? "1px solid rgba(244, 245, 248, 0.4)"
                : "1px solid transparent",
              padding: "0 0 4px",
              font: "inherit",
              fontWeight: active ? 500 : 400,
              transition:
                "color 200ms ease-out, border-color 200ms ease-out",
            }}
          >
            {ch.label}
          </button>
        );
      })}
    </nav>
  );
}
