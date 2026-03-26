"use client";

import { useState } from "react";
import { AsciiCanvas } from "@/components/AsciiCanvas";
import { BioOverlay } from "@/components/BioOverlay";
import { DevPanel } from "@/components/DevPanel";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";

export default function Home() {
  const [renderer, setRenderer] = useState<AsciiRenderer | null>(null);

  return (
    <main>
      <AsciiCanvas videoSrc="/video/bg.mp4" onRendererReady={setRenderer} />
      <BioOverlay />
      <DevPanel renderer={renderer} />
    </main>
  );
}
