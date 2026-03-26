"use client";

import { useState, lazy, Suspense } from "react";
import { AsciiCanvas } from "@/components/AsciiCanvas";
import { BioOverlay } from "@/components/BioOverlay";
import { ParticleOverlay } from "@/components/ParticleOverlay";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";
import { DESKTOP_CONFIG, MOBILE_CONFIG } from "@/lib/ascii-renderer/config";

const DevPanel = process.env.NODE_ENV === "development"
  ? lazy(() => import("@/components/DevPanel").then((m) => ({ default: m.DevPanel })))
  : () => null;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  if (typeof window !== "undefined") {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    if (mql.matches !== isMobile) setIsMobile(mql.matches);
  }
  return isMobile;
}

export default function Home() {
  const [renderer, setRenderer] = useState<AsciiRenderer | null>(null);
  const isMobile = useIsMobile();
  const activeConfig = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;

  return (
    <main>
      <AsciiCanvas
        desktopSrc="/video/bg-desktop.mp4"
        mobileSrc="/video/bg-mobile.mp4"
        desktopConfig={DESKTOP_CONFIG}
        mobileConfig={MOBILE_CONFIG}
        onRendererReady={setRenderer}
      />
      <ParticleOverlay config={activeConfig} renderer={renderer} />
      <BioOverlay />
      <Suspense fallback={null}>
        <DevPanel renderer={renderer} />
      </Suspense>
    </main>
  );
}
