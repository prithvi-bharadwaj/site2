"use client";

import { useState, useEffect } from "react";

const VIDEO_ID = "z8aiT2lsuQc";
const EXIT_MS = 280;

interface SubwaySurfersPipProps {
  onDismiss: () => void;
}

export function SubwaySurfersPip({ onDismiss }: SubwaySurfersPipProps) {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDismiss, EXIT_MS);
  };

  const visible = mounted && !exiting;

  return (
    <div
      className="
        fixed z-50 overflow-hidden
        top-0 left-0 right-0 h-[40vh]
        md:top-auto md:left-auto md:bottom-4 md:right-4
        md:h-[498px] md:w-[280px] md:rounded-xl md:shadow-2xl
      "
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.96)",
        transition: `opacity ${EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`,
      }}
    >
      <button
        onClick={handleDismiss}
        aria-label="turn off gen z mode"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sm text-white/80 transition-colors hover:text-white md:right-1.5 md:top-1.5 md:h-5 md:w-5 md:text-xs md:text-white/70"
        style={{ background: "rgba(0,0,0,0.55)", border: "none" }}
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
