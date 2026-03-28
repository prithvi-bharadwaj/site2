"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  prepareDissolve,
  renderRadialDissolve,
  type DissolveState,
  type PointerState,
} from "@/lib/ascii-dissolve";

interface AsciiDissolveProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fontSize?: number;
  radius?: number;
}

export function AsciiDissolve({
  src,
  alt,
  width,
  height,
  className,
  fontSize = 10,
  radius = 60,
}: AsciiDissolveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DissolveState | null>(null);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number>(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      stateRef.current = prepareDissolve(img, width, height, fontSize);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && stateRef.current) {
        renderRadialDissolve(ctx, stateRef.current, pointerRef.current, radius);
      }
    };
    img.src = src;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, width, height, fontSize, radius]);

  const renderFrame = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && stateRef.current) {
      renderRadialDissolve(ctx, stateRef.current, pointerRef.current, radius);
    }
  }, [radius]);

  const startLoop = useCallback(() => {
    const loop = () => {
      renderFrame();
      if (pointerRef.current.active) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [renderFrame]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (reducedMotion.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
      if (!rafRef.current) startLoop();
    },
    [startLoop]
  );

  const handleMouseEnter = useCallback(() => {
    if (reducedMotion.current) return;
    pointerRef.current = { ...pointerRef.current, active: true };
    startLoop();
  }, [startLoop]);

  const handleMouseLeave = useCallback(() => {
    pointerRef.current = { ...pointerRef.current, active: false };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    renderFrame();
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={alt}
      className={className}
      style={{ display: "block" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
