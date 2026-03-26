"use client";

import { useRef, useEffect, useCallback } from "react";
import { createAsciiRenderer, type AsciiRenderer } from "@/lib/ascii-renderer/renderer";
import { type AsciiConfig } from "@/lib/ascii-renderer/config";

interface AsciiCanvasProps {
  videoSrc: string;
  config?: Partial<AsciiConfig>;
  onRendererReady?: (renderer: AsciiRenderer) => void;
}

export function AsciiCanvas({ videoSrc, config, onRendererReady }: AsciiCanvasProps) {
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
