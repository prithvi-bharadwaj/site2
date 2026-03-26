"use client";

import { useState } from "react";
import { AsciiCanvas } from "@/components/AsciiCanvas";
import { BioOverlay } from "@/components/BioOverlay";
import { DevPanel } from "@/components/DevPanel";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";
import { DESKTOP_CONFIG, MOBILE_CONFIG } from "@/lib/ascii-renderer/config";

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
      <DevPanel renderer={renderer} />
    </main>
  );
}
