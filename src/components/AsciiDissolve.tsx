"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  prepareDissolve,
  renderDissolve,
  type DissolveState,
} from "@/lib/ascii-dissolve";

interface AsciiDissolveProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fontSize?: number;
}

export function AsciiDissolve({
  src,
  alt,
  width,
  height,
  className,
  fontSize = 10,
}: AsciiDissolveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DissolveState | null>(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
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
        renderDissolve(ctx, stateRef.current, 0);
      }
    };
    img.src = src;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, width, height, fontSize]);

  const animate = useCallback(() => {
    const target = targetRef.current;
    const current = progressRef.current;
    const diff = target - current;

    if (Math.abs(diff) < 0.01) {
      progressRef.current = target;
    } else {
      progressRef.current += diff * 0.12;
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && stateRef.current) {
      renderDissolve(ctx, stateRef.current, progressRef.current);
    }

    if (Math.abs(targetRef.current - progressRef.current) > 0.005) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, []);

  const startAnimation = useCallback(
    (target: number) => {
      if (reducedMotion.current) {
        progressRef.current = target;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && stateRef.current) {
          renderDissolve(ctx, stateRef.current, target);
        }
        return;
      }
      targetRef.current = target;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    },
    [animate]
  );

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={alt}
      className={className}
      style={{ display: "block" }}
      onMouseEnter={() => startAnimation(1)}
      onMouseLeave={() => startAnimation(0)}
    />
  );
}
