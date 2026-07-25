"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  createTrapCloth,
  disturbTrapCloth,
  releaseTrapCloth,
  stepTrapCloth,
  type TrapCloth,
} from "@/lib/trap-cloth";
import { createClothRenderer, type ClothRenderer } from "@/lib/trap-cloth-gl";

// Canvas geometry — mirrors .crumb-trap-cloth in globals.css.
const PAD_X = 48;
const PAD_TOP = 8;
const CANVAS_HEIGHT = 168;
// Same 1px as the button border, so the cloth reads as the edge come loose.
const THICKNESS = 1;
const LINE_ALPHA = 0.3;

interface TrapClothButton {
  width: number;
  height: number;
  radius: number;
}

/**
 * The allow-cookies button's bottom edge as a cloth strip: taut while idle,
 * released into a verlet flap sim rendered by a WebGL ribbon shader.
 */
export function useTrapCloth(active: boolean, button: TrapClothButton) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clothRef = useRef<TrapCloth | null>(null);
  const rendererRef = useRef<ClothRenderer | null>(null);
  const rafRef = useRef(0);
  const { width, height, radius } = button;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cloth = createTrapCloth({
      leftX: PAD_X + radius,
      rightX: PAD_X + width - radius,
      y: PAD_TOP + height - 0.5,
    });
    clothRef.current = cloth;
    const ink = getComputedStyle(document.documentElement)
      .getPropertyValue("--ink-rgb")
      .trim()
      .split(/\s+/)
      .map((channel) => Number(channel) / 255);
    const color: [number, number, number] = Number.isFinite(ink[2])
      ? [ink[0], ink[1], ink[2]]
      : [0.07, 0.07, 0.09];
    const renderer = createClothRenderer(canvas, color, LINE_ALPHA);
    rendererRef.current = renderer;
    renderer?.resize(width + PAD_X * 2, CANVAS_HEIGHT, Math.min(window.devicePixelRatio || 1, 2));
    renderer?.draw(cloth, THICKNESS);
    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer?.dispose();
      rendererRef.current = null;
      clothRef.current = null;
    };
  }, [active, width, height, radius]);

  /** Let the bottom edge go and run the flap sim until the dialog unmounts. */
  const release = useCallback(() => {
    const cloth = clothRef.current;
    const renderer = rendererRef.current;
    if (!cloth || !renderer || cloth.released) return;
    releaseTrapCloth(cloth);
    let previous = performance.now();
    const frame = (now: number) => {
      stepTrapCloth(cloth, now - previous);
      previous = now;
      renderer.draw(cloth, THICKNESS);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  /** Nudge the cloth from (x, y) in trap-local coordinates (button top-left origin). */
  const disturb = useCallback((x: number, y: number, radiusPx: number, ix: number, iy: number) => {
    const cloth = clothRef.current;
    if (!cloth?.released) return;
    disturbTrapCloth(cloth, x + PAD_X, y + PAD_TOP, radiusPx, ix, iy);
  }, []);

  const isReleased = useCallback(() => clothRef.current?.released === true, []);

  return { canvasRef, release, disturb, isReleased };
}
