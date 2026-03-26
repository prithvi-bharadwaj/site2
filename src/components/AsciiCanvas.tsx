"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { createAsciiRenderer, type AsciiRenderer } from "@/lib/ascii-renderer/renderer";
import { type AsciiConfig } from "@/lib/ascii-renderer/config";

interface AsciiCanvasProps {
  desktopSrc: string;
  mobileSrc: string;
  breakpoint?: number; // px width threshold, default 768
  desktopConfig?: Partial<AsciiConfig>;
  mobileConfig?: Partial<AsciiConfig>;
  onRendererReady?: (renderer: AsciiRenderer) => void;
}

function useIsMobile(breakpoint: number) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export function AsciiCanvas({
  desktopSrc,
  mobileSrc,
  breakpoint = 768,
  desktopConfig,
  mobileConfig,
  onRendererReady,
}: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);
  const isMobile = useIsMobile(breakpoint);

  const videoSrc = isMobile ? mobileSrc : desktopSrc;
  const config = isMobile ? mobileConfig : desktopConfig;

  const handleResize = useCallback((width: number, height: number) => {
    rendererRef.current?.resize(width, height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // Update video source
    video.src = videoSrc;
    video.load();

    const renderer = createAsciiRenderer(canvas, video, config);
    rendererRef.current = renderer;
    onRendererReady?.(renderer);

    video.play().catch(() => {});

    const maxDpr = Math.min(window.devicePixelRatio, 2);

    const observer = new ResizeObserver((entries) => {
      if (!canvasRef.current) return;
      const entry = entries[0];
      const width = Math.round(entry.contentRect.width * maxDpr);
      const height = Math.round(entry.contentRect.height * maxDpr);
      handleResize(width, height);
    });

    observer.observe(canvas);

    return () => {
      observer.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [videoSrc, handleResize]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </>
  );
}
