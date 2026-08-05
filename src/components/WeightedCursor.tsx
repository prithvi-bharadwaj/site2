"use client";

import { useEffect, useRef } from "react";
import { stepAngleSpring, type AngleSpring } from "@/lib/cursor-physics";

/**
 * Weighted cursor — replaces the native cursor with a small ink dart.
 *
 * The dart's tip sits exactly on the hotspot (no positional lag), but its
 * heading is driven by an underdamped angular spring toward the smoothed
 * direction of travel, so it swings past on sharp turns and settles back.
 * Speed also stretches the dart slightly along its axis. Skipped on touch
 * devices and when reduced motion is preferred — the native cursor stays.
 */

/** Ignore direction changes below this speed (px/s) — near-still jitter. */
const MIN_SPEED = 40;
/** Low-pass factor for the velocity estimate (per frame at 60fps). */
const VEL_SMOOTHING = 0.3;
/** Speed → stretch: full stretch around 2500 px/s. */
const STRETCH_MAX = 0.22;
const STRETCH_SPEED = 2500;
/** Press feedback: shrink toward this scale while a button is down. */
const PRESS_SCALE = 0.8;

export function WeightedCursor() {
  const dartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return; // jsdom
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const dart = dartRef.current;
    if (!dart) return;

    const mouse = { x: 0, y: 0 };
    const prev = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    let targetAngle = 0;
    let press = 1; // eased scale multiplier for mousedown feedback
    let pressed = false;
    let initialized = false;
    let running = false;
    let raf = 0;
    let lastTime = 0;

    function render(speed: number) {
      const stretch = Math.min(speed / STRETCH_SPEED, 1) * STRETCH_MAX;
      const sx = (1 + stretch) * press;
      const sy = (1 - stretch * 0.5) * press;
      dart!.style.transform =
        `translate3d(${mouse.x}px, ${mouse.y}px, 0) rotate(${spring.angle}rad) scale(${sx}, ${sy})`;
    }

    function frame(now: number) {
      const dt = Math.max((now - lastTime) / 1000, 1e-6);
      lastTime = now;

      // Smoothed velocity from per-frame mouse deltas; only steer while moving.
      const ix = (mouse.x - prev.x) / dt;
      const iy = (mouse.y - prev.y) / dt;
      prev.x = mouse.x;
      prev.y = mouse.y;
      vel.x += (ix - vel.x) * VEL_SMOOTHING;
      vel.y += (iy - vel.y) * VEL_SMOOTHING;
      const speed = Math.hypot(vel.x, vel.y);
      if (speed > MIN_SPEED) targetAngle = Math.atan2(vel.y, vel.x);

      stepAngleSpring(spring, targetAngle, dt);
      press += ((pressed ? PRESS_SCALE : 1) - press) * 0.35;

      render(speed);

      const settled =
        speed < 1 &&
        Math.abs(spring.velocity) < 0.01 &&
        Math.abs(press - (pressed ? PRESS_SCALE : 1)) < 0.001;
      if (settled) {
        running = false;
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    function wake() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!initialized) {
        initialized = true;
        prev.x = e.clientX;
        prev.y = e.clientY;
        // Only hide the native cursor once the dart is on screen.
        document.documentElement.classList.add("weighted-cursor");
        dart!.style.opacity = "1";
      }
      wake();
    }

    function onDown() {
      pressed = true;
      wake();
    }
    function onUp() {
      pressed = false;
      wake();
    }
    function onLeave() {
      dart!.style.opacity = "0";
    }
    function onEnter() {
      if (initialized) dart!.style.opacity = "1";
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("weighted-cursor");
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={dartRef} className="weighted-cursor-dart" aria-hidden="true">
      {/* Dart points +x (angle 0); tip at (20,10) is offset to the hotspot below. */}
      <svg width="21" height="20" viewBox="0 0 21 20">
        <path
          d="M20 10 L2.5 16.8 L7 10 L2.5 3.2 Z"
          fill="currentColor"
          stroke="var(--bg)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
