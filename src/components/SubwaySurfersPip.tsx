"use client";

import { useState, useEffect } from "react";

const VIDEO_ID = "QPW3XwBoQlw";
const START_SECONDS = 1;

export function SubwaySurfersPip({ onDismiss }: { onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Slight delay so the PIP slides in after toggle
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (dismissed) return null;

  return (
    <div
      // Full size only at 2xl - narrower viewports don't have a free right
      // margin, so the pip stays small enough to mostly clear the text column.
      className="pointer-events-none fixed bottom-16 right-4 z-50 h-[285px] w-[160px] overflow-hidden rounded-xl shadow-2xl md:h-[320px] md:w-[180px] 2xl:h-[498px] 2xl:w-[280px]"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
      }}
    >
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="pointer-events-auto absolute right-1.5 top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs text-white/70 transition-colors hover:text-white"
        style={{ background: "rgba(0,0,0,0.5)", border: "none" }}
      >
        ×
      </button>

      <iframe
        src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&controls=0&playlist=${VIDEO_ID}&playsinline=1&start=${START_SECONDS}`}
        className="h-full w-full"
        allow="autoplay; encrypted-media"
        style={{ border: "none", pointerEvents: "none" }}
        title="subway surfers gameplay"
      />
    </div>
  );
}
