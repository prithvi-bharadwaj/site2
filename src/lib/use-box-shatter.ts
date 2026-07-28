"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  createShatter,
  shardAlpha,
  shardOutline,
  stepShatter,
  type Shard,
} from "@/lib/box-shatter";
import { createRibbonRenderer, type RibbonRenderer } from "@/lib/ink-ribbon-gl";

// Canvas geometry — mirrors .crumb-shatter in globals.css.
const PAD_X = 60;
const PAD_TOP = 40;
const CANVAS_HEIGHT = 520;
// Matches the .crumb-brick border stroke (1px, ink at 0.18).
const STROKE = 1;
const STROKE_ALPHA = 0.18;
// Beat where the box is cracked but still standing, before it lets go.
const HOLD_MS = 150;
const MAX_DPR = 3;

interface ShatterBox {
  width: number;
  height: number;
  radius: number;
}

/**
 * The allow-cookies button breaking apart. Until it goes the CSS border draws
 * the box; on impact the button's border turns transparent and this canvas takes
 * over with shards that tile the same outline, so the handoff frame is identical
 * apart from the crack lines appearing. Then they hold for a beat and fall.
 */
export function useBoxShatter(
  active: boolean,
  box: ShatterBox,
  buttonRef: RefObject<HTMLButtonElement | null>,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shardsRef = useRef<Shard[] | null>(null);
  const rendererRef = useRef<RibbonRenderer | null>(null);
  const rafRef = useRef(0);
  const { width, height, radius } = box;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    shardsRef.current = null;
    buttonRef.current?.removeAttribute("data-shattered");
    const ink = getComputedStyle(document.documentElement)
      .getPropertyValue("--ink-rgb")
      .trim()
      .split(/\s+/)
      .map((channel) => Number(channel) / 255);
    const color: [number, number, number] = Number.isFinite(ink[2])
      ? [ink[0], ink[1], ink[2]]
      : [0.07, 0.07, 0.09];
    const renderer = createRibbonRenderer(canvas, color);
    rendererRef.current = renderer;
    renderer?.resize(width + PAD_X * 2, CANVAS_HEIGHT, Math.min(window.devicePixelRatio || 1, MAX_DPR));
    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer?.dispose();
      rendererRef.current = null;
      shardsRef.current = null;
    };
  }, [active, buttonRef, width, height, radius]);

  /** Crack the box open, then let the pieces go after a beat. */
  const shatter = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || shardsRef.current) return;
    const shards = createShatter({ width, height, radius, offsetX: PAD_X, offsetY: PAD_TOP });
    shardsRef.current = shards;
    // Same frame the CSS border goes transparent, so the handoff has no seam.
    buttonRef.current?.setAttribute("data-shattered", "");

    const start = performance.now();
    let previous = start;
    const frame = (now: number) => {
      if (now - start >= HOLD_MS) stepShatter(shards, now - previous);
      previous = now;
      renderer.draw(
        shards
          .map((shard) => ({
            points: shardOutline(shard),
            thickness: STROKE,
            alpha: STROKE_ALPHA * shardAlpha(shard),
          }))
          .filter((strip) => strip.alpha > 0.001),
      );
      rafRef.current = requestAnimationFrame(frame);
    };
    frame(start);
  }, [buttonRef, width, height, radius]);

  const isShattered = useCallback(() => shardsRef.current !== null, []);

  return { canvasRef, shatter, isShattered };
}
