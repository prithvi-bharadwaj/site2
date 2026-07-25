"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  arcPoints,
  createTrapCloth,
  disturbTrapCloth,
  releaseTrapCloth,
  stepTrapCloth,
  type TrapCloth,
} from "@/lib/trap-cloth";
import {
  createClothRenderer,
  type ClothRenderer,
  type RenderStrip,
  type StripPoint,
} from "@/lib/trap-cloth-gl";

// Canvas geometry — mirrors .crumb-trap-cloth in globals.css.
const PAD_X = 48;
const PAD_TOP = 8;
const CANVAS_HEIGHT = 168;
// Taut it's the button's 1px bottom border; loose it thickens to 2px so the
// hanging fabric stays clearly visible against the falling cookies.
const THICKNESS_TAUT = 1;
const THICKNESS_LOOSE = 2;
const LINE_ALPHA = 0.45;
// Mirrors the .crumb-brick border stroke (1px, ink at 0.18).
const BORDER_THICKNESS = 1;
const BORDER_ALPHA = 0.18;

interface TrapClothButton {
  width: number;
  height: number;
  radius: number;
}

/**
 * The real border-bottom stays transparent (see .crumb-brick), which also
 * blanks the lower half of each corner arc — CSS splits corner painting at
 * the diagonal. These two static arc segments fill that notch so the side
 * borders run seamlessly down to the cloth hinges.
 */
function cornerArcs({ width, height, radius }: TrapClothButton): StripPoint[][] {
  const centerY = PAD_TOP + height - radius;
  const strokeRadius = radius - BORDER_THICKNESS / 2;
  return [
    arcPoints(PAD_X + radius, centerY, strokeRadius, Math.PI * 0.75, Math.PI * 0.5),
    arcPoints(PAD_X + width - radius, centerY, strokeRadius, Math.PI * 0.25, Math.PI * 0.5),
  ];
}

/**
 * The allow-cookies button's bottom edge as a cloth strip: taut while idle,
 * released into a verlet flap sim rendered by a WebGL ribbon shader.
 */
export function useTrapCloth(active: boolean, button: TrapClothButton) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clothRef = useRef<TrapCloth | null>(null);
  const rendererRef = useRef<ClothRenderer | null>(null);
  const arcsRef = useRef<StripPoint[][]>([]);
  const rafRef = useRef(0);
  const { width, height, radius } = button;

  const drawScene = useCallback((clothThickness: number) => {
    const cloth = clothRef.current;
    const renderer = rendererRef.current;
    if (!cloth || !renderer) return;
    const strips: RenderStrip[] = [
      ...cloth.flaps.map((flap) => ({
        points: flap,
        thickness: clothThickness,
        alpha: LINE_ALPHA,
        shaded: true,
      })),
      ...arcsRef.current.map((points) => ({
        points,
        thickness: BORDER_THICKNESS,
        alpha: BORDER_ALPHA,
      })),
    ];
    renderer.draw(strips);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    clothRef.current = createTrapCloth({
      leftX: PAD_X + radius,
      rightX: PAD_X + width - radius,
      y: PAD_TOP + height - 0.5,
    });
    arcsRef.current = cornerArcs({ width, height, radius });
    const ink = getComputedStyle(document.documentElement)
      .getPropertyValue("--ink-rgb")
      .trim()
      .split(/\s+/)
      .map((channel) => Number(channel) / 255);
    const color: [number, number, number] = Number.isFinite(ink[2])
      ? [ink[0], ink[1], ink[2]]
      : [0.07, 0.07, 0.09];
    const renderer = createClothRenderer(canvas, color);
    rendererRef.current = renderer;
    renderer?.resize(width + PAD_X * 2, CANVAS_HEIGHT, Math.min(window.devicePixelRatio || 1, 2));
    drawScene(THICKNESS_TAUT);
    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer?.dispose();
      rendererRef.current = null;
      clothRef.current = null;
    };
  }, [active, drawScene, width, height, radius]);

  /** Let the bottom edge go and run the flap sim until the dialog unmounts. */
  const release = useCallback(() => {
    const cloth = clothRef.current;
    if (!cloth || !rendererRef.current || cloth.released) return;
    releaseTrapCloth(cloth);
    let previous = performance.now();
    const frame = (now: number) => {
      stepTrapCloth(cloth, now - previous);
      previous = now;
      drawScene(THICKNESS_LOOSE);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [drawScene]);

  /** Nudge the cloth from (x, y) in trap-local coordinates (button top-left origin). */
  const disturb = useCallback((x: number, y: number, radiusPx: number, ix: number, iy: number) => {
    const cloth = clothRef.current;
    if (!cloth?.released) return;
    disturbTrapCloth(cloth, x + PAD_X, y + PAD_TOP, radiusPx, ix, iy);
  }, []);

  const isReleased = useCallback(() => clothRef.current?.released === true, []);

  return { canvasRef, release, disturb, isReleased };
}
