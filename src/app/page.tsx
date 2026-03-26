"use client";

import { useState, lazy, Suspense } from "react";
import { AsciiCanvas } from "@/components/AsciiCanvas";
import { BioOverlay } from "@/components/BioOverlay";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";
import { DESKTOP_CONFIG, MOBILE_CONFIG } from "@/lib/ascii-renderer/config";

const DevPanel = process.env.NODE_ENV === "development"
  ? lazy(() => import("@/components/DevPanel").then((m) => ({ default: m.DevPanel })))
  : () => null;

export default function Home() {
  const [renderer, setRenderer] = useState<AsciiRenderer | null>(null);

  return (
    <main>
      <AsciiCanvas
        desktopSrc="/video/bg-desktop.mp4"
        mobileSrc="/video/bg-mobile.mp4"
        desktopConfig={DESKTOP_CONFIG}
        mobileConfig={MOBILE_CONFIG}
        onRendererReady={setRenderer}
      />
      <BioOverlay />
      <Suspense fallback={null}>
        <DevPanel renderer={renderer} />
      </Suspense>
    </main>
  );
}
