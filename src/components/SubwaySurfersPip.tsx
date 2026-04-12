"use client";

import { useState, useEffect } from "react";

const VIDEO_ID = "z8aiT2lsuQc";

export function SubwaySurfersPip() {
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
      className="fixed bottom-4 right-4 z-50 overflow-hidden rounded-xl shadow-2xl"
      style={{
        width: 160,
        height: 284,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs text-white/70 transition-colors hover:text-white"
        style={{ background: "rgba(0,0,0,0.5)", border: "none" }}
      >
        ×
      </button>

      <iframe
        src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&controls=0&playlist=${VIDEO_ID}&playsinline=1`}
        className="h-full w-full"
        allow="autoplay; encrypted-media"
        style={{ border: "none", pointerEvents: "none" }}
        title="subway surfers gameplay"
      />
    </div>
  );
}
