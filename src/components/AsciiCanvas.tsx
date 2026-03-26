"use client";

import { useRef, useEffect, useCallback } from "react";
import { createAsciiRenderer, type AsciiRenderer } from "@/lib/ascii-renderer/renderer";

interface AsciiCanvasProps {
  videoSrc: string;
}

export function AsciiCanvas({ videoSrc }: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);

  const handleResize = useCallback((width: number, height: number) => {
    rendererRef.current?.resize(width, height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const renderer = createAsciiRenderer(canvas, video);
    rendererRef.current = renderer;

    // Start video playback
    video.play().catch(() => {
      // Autoplay may be blocked — silent fail for background video
    });

    // ResizeObserver for responsive canvas
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
        src={videoSrc}
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
