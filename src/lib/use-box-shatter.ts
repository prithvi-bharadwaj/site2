"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  createBlastParticles,
  createShatter,
  shardAlpha,
  shardOutline,
  stepShatter,
  type Shard,
} from "@/lib/box-shatter";
import { createRibbonRenderer, type RibbonRenderer } from "@/lib/ink-ribbon-gl";

// Canvas geometry — mirrors .crumb-shatter in globals.css. Padded out past the
// dialog on every side so the blast is clipped by .crumb-scene's edge (which is
// the dialog's edge, and reads as debris leaving frame) rather than by the
// canvas, which would read as debris hitting an invisible wall.
const PAD_X = 280;
const PAD_TOP = 200;
const CANVAS_HEIGHT = 760;
// Matches the .crumb-brick border stroke (2px, ink at 0.64).
const STROKE = 2;
const STROKE_ALPHA = 0.64;
// Dust keeps a hairline stroke so it reads finer than the fragments, and sits
// below border ink so the specks read as debris, not confetti-sized fragments.
const DUST_STROKE = 1;
const DUST_ALPHA = 0.4;
// One frame of intact-but-cracked box before it goes. Any longer and the hit
// reads as a slow break instead of a bang.
const HOLD_MS = 50;
const MAX_DPR = 2;

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
    // Dust waits out the hold: on the cracked-but-intact frames it would just
    // be specks floating inside a whole box.
    const dust = createBlastParticles({ width, height, offsetX: PAD_X, offsetY: PAD_TOP });
    shardsRef.current = shards;
    // Same frame the CSS border goes transparent, so the handoff has no seam.
    buttonRef.current?.setAttribute("data-shattered", "");

    const start = performance.now();
    let previous = start;
    const frame = (now: number) => {
      const detonated = now - start >= HOLD_MS;
      if (detonated) {
        stepShatter(shards, now - previous);
        stepShatter(dust, now - previous);
      }
      previous = now;
      const strips = shards.map((shard) => ({
        points: shardOutline(shard),
        thickness: STROKE,
        alpha: STROKE_ALPHA * shardAlpha(shard),
      }));
      if (detonated) {
        for (const mote of dust) {
          strips.push({
            points: shardOutline(mote),
            thickness: DUST_STROKE,
            alpha: DUST_ALPHA * shardAlpha(mote),
          });
        }
      }
      renderer.draw(strips.filter((strip) => strip.alpha > 0.001));
      rafRef.current = requestAnimationFrame(frame);
    };
    frame(start);
  }, [buttonRef, width, height, radius]);

  const isShattered = useCallback(() => shardsRef.current !== null, []);

  return { canvasRef, shatter, isShattered };
}
