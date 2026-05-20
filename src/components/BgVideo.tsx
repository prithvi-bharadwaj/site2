"use client";

import { useEffect, useRef } from "react";

export function BgVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  const maskGradient =
    "radial-gradient(ellipse 95% 95% at 100% 100%, #000 45%, transparent 92%)";

  return (
    <div
      aria-hidden
      className="fixed bottom-0 right-0 pointer-events-none select-none"
      style={{
        width: "min(680px, 58vw)",
        aspectRatio: "1 / 1",
        zIndex: -1,
        WebkitMaskImage: maskGradient,
        maskImage: maskGradient,
      }}
    >
      <video
        ref={videoRef}
        src="/videos/bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="block w-full h-full object-cover"
      />
    </div>
  );
}
