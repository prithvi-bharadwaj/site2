"use client";

import { useEffect, useRef } from "react";
import {
  applyFlick,
  FLICK_MEMORY_MS,
  gravityRamp,
  isFlick,
  shortestAngleDelta,
  stepCursor,
  type AngleSpring,
} from "@/lib/cursor-physics";

/**
 * Weighted cursor — replaces the native cursor with a rounded classic arrow.
 *
 * The arrow's tip sits exactly on the hotspot (no positional lag); its
 * heading is a rigid body hinged at the tip, integrated every frame from
 * continuous torques (see cursor-physics): speed-scaled steering toward the
 * direction of travel (overshoots on sharp turns), gravity that fades in
 * when the mouse rests and pendulums the arrow home to the classic cursor
 * tilt, and hinge friction. Wiggling chains flick impulses into full spins,
 * and speed stretches the arrow slightly along its axis. Skipped on touch
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
/** The hanging pose gravity pulls toward: the classic cursor tilt. */
const IDLE_ANGLE = -Math.PI * 0.625; // -112.5°

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
    // Event-to-event velocity for flick detection. Frames are the wrong
    // sampling grid for this: when the display outpaces the mouse's event
    // rate, zero-motion frames land between every two real samples and no
    // frame pair ever reverses.
    const ev = { x: 0, y: 0, t: 0, vx: 0, vy: 0 };
    const spring: AngleSpring = { angle: IDLE_ANGLE, velocity: 0 };
    let targetAngle = IDLE_ANGLE;
    let lastActive = -Infinity;
    let flickDir = 0;
    let flickUntil = -Infinity;
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
      if (speed > MIN_SPEED) {
        targetAngle = Math.atan2(vel.y, vel.x);
        lastActive = now;
      }

      stepCursor(spring, {
        target: targetAngle,
        speed,
        gravity: gravityRamp(now - lastActive),
        hang: IDLE_ANGLE,
        dt,
      });
      press += ((pressed ? PRESS_SCALE : 1) - press) * 0.35;

      render(speed);

      // Only sleep once the dart has made it home to the idle tilt — the loop
      // stays alive through the idle delay and the return swing.
      const settled =
        speed < 1 &&
        Math.abs(spring.velocity) < 0.02 &&
        Math.abs(shortestAngleDelta(spring.angle, IDLE_ANGLE)) < 0.01 &&
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
      const dt = (e.timeStamp - ev.t) / 1000;
      if (dt > 0) {
        const vx = (e.clientX - ev.x) / dt;
        const vy = (e.clientY - ev.y) / dt;
        // A pause self-guards: its first event has a huge dt → tiny velocity.
        if (isFlick(ev.vx, ev.vy, vx, vy)) {
          flickDir = applyFlick(spring, ev.vx, ev.vy, vx, vy, e.timeStamp < flickUntil ? flickDir : 0);
          flickUntil = e.timeStamp + FLICK_MEMORY_MS;
        }
        ev.vx = vx;
        ev.vy = vy;
      }
      ev.x = e.clientX;
      ev.y = e.clientY;
      ev.t = e.timeStamp;
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
      {/* Classic arrow silhouette rotated so it points +x (angle 0); the tip
          at (21,10) is offset to the hotspot in CSS. Drawn twice on the same
          path: a fat bg stroke for the outline halo, then a self-colored
          stroke over the fill — round joins on both soften every corner. */}
      <svg width="22" height="20" viewBox="0 0 22 20">
        <g strokeLinejoin="round">
          <path
            d="M21 10 L5.9 4.2 L8 9.1 L1 9.4 L1.1 12.4 L8.1 12.1 L6.2 17.1 Z"
            fill="none"
            stroke="var(--bg)"
            strokeWidth="3.2"
          />
          <path
            d="M21 10 L5.9 4.2 L8 9.1 L1 9.4 L1.1 12.4 L8.1 12.1 L6.2 17.1 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  );
}
