"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyFlick,
  FLICK_MEMORY_MS,
  gravityRamp,
  isFlick,
  shortestAngleDelta,
  stepCursor,
  type AngleSpring,
} from "@/lib/cursor-physics";
import { SPRITE_SVGS } from "@/lib/cursor-sprites";

/**
 * Weighted cursor — replaces the native cursor with a hollow classic arrow
 * that morphs into flat icon sprites near tagged content.
 *
 * The arrow's tip sits exactly on the hotspot (no positional lag); its
 * heading is a rigid body hinged at the tip, integrated every frame from
 * continuous torques (see cursor-physics): speed-scaled steering toward the
 * direction of travel (overshoots on sharp turns), gravity that fades in
 * when the mouse rests and pendulums the arrow home to the classic cursor
 * tilt, and hinge friction. Wiggling chains flick impulses into full spins.
 *
 * Sprite reveal is proximity-based, not hover-based: every frame the cursor
 * measures its distance to each `[data-cursor="<sprite>"]` zone and morphs
 * once it's within a forgiving radius of the sentence, with hysteresis so
 * the boundary doesn't flicker. Nested zones (a brand link inside a tagged
 * line) resolve to the innermost one. Sprites don't steer — they hang
 * upright under full gravity with momentum intact, so they sway with the
 * motion and still spin when wiggled. Skipped on touch devices and when
 * reduced motion is preferred — the native cursor stays.
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
/** Scale dip when the glyph swaps — a small pop sells the morph. */
const MORPH_DIP = 0.64;
/** Distance (px) from a tagged zone at which its sprite takes over… */
const ACQUIRE_RADIUS = 32;
/** …and how far the cursor must drift before it lets go (hysteresis). */
const RELEASE_RADIUS = 50;

export function WeightedCursor() {
  const dartRef = useRef<HTMLDivElement>(null);
  const [sprite, setSprite] = useState("");
  const spriteRef = useRef("");
  const morphRef = useRef(1);
  // Tracked live, not just at mount: flipping reduced-motion mid-session must
  // hand the native cursor back and stop the animation.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return; // jsdom
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return; // jsdom
    if (reducedMotion) return;
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
    // Sprite zones, with cached viewport rects: re-queried when the DOM
    // changes, re-measured only on scroll/resize/mutation. Measuring every
    // frame would force a layout read per zone per frame for nothing — the
    // rects only move when the page does.
    interface Zone {
      el: Element;
      key: string;
      left: number;
      top: number;
      right: number;
      bottom: number;
      area: number;
    }
    let zones: Zone[] = [];
    let zonesDirty = true;
    let rectsDirty = true;
    let lastMeasure = -Infinity;
    const lastDetect = { x: NaN, y: NaN };
    /**
     * Transforms (WiggleWords, PretextHero) and visibility flips
     * (PhysicsLayer) move or hide zones without any mutation/scroll event,
     * so cached rects also expire on age while the loop runs.
     */
    const RECT_MAX_AGE_MS = 250;
    const zoneObserver = new MutationObserver(() => {
      zonesDirty = true;
    });
    zoneObserver.observe(document.body, { childList: true, subtree: true });

    function measureZones() {
      for (const z of zones) {
        // Zones hidden via CSS (e.g. PhysicsLayer swaps content for a canvas
        // with visibility: hidden) keep their boxes; treat them as gone.
        const visible =
          !(z.el instanceof HTMLElement) ||
          typeof z.el.checkVisibility !== "function" ||
          z.el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
        const r = visible ? z.el.getBoundingClientRect() : null;
        z.left = r?.left ?? 0;
        z.top = r?.top ?? 0;
        z.right = r?.right ?? 0;
        z.bottom = r?.bottom ?? 0;
        z.area = r ? r.width * r.height : 0;
      }
    }
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

    /**
     * Nearest tagged zone within reach. Distance is point-to-rect, so being
     * anywhere over the sentence counts as 0; ties (nested zones) go to the
     * smaller element so word-level tags win over their containing line.
     */
    function detectSprite(): string {
      if (zonesDirty) {
        zonesDirty = false;
        rectsDirty = true;
        zones = [...document.querySelectorAll("[data-cursor]")]
          .map((el) => ({
            el,
            key: el.getAttribute("data-cursor") ?? "",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            area: 0,
          }))
          .filter((z) => z.key in SPRITE_SVGS);
      }
      const now = performance.now();
      if (rectsDirty || now - lastMeasure > RECT_MAX_AGE_MS) {
        rectsDirty = false;
        lastMeasure = now;
        measureZones();
      } else if (mouse.x === lastDetect.x && mouse.y === lastDetect.y) {
        // Nothing moved since the last check (e.g. pendulum-return frames).
        return spriteRef.current;
      }
      lastDetect.x = mouse.x;
      lastDetect.y = mouse.y;
      let bestKey = "";
      let bestDist = Infinity;
      let bestArea = Infinity;
      for (const z of zones) {
        if (z.area === 0) continue;
        const dx = Math.max(z.left - mouse.x, 0, mouse.x - z.right);
        const dy = Math.max(z.top - mouse.y, 0, mouse.y - z.bottom);
        const d = Math.hypot(dx, dy);
        if (d < bestDist - 0.5 || (d < bestDist + 0.5 && z.area < bestArea)) {
          bestDist = d;
          bestKey = z.key;
          bestArea = z.area;
        }
      }
      const reach = bestKey === spriteRef.current ? RELEASE_RADIUS : ACQUIRE_RADIUS;
      return bestDist <= reach ? bestKey : "";
    }

    function render(speed: number) {
      // Sprites don't stretch: the stretch axis is the arrow's own +x, which
      // means nothing for an upright robot head.
      const stretch = spriteRef.current ? 0 : Math.min(speed / STRETCH_SPEED, 1) * STRETCH_MAX;
      const pop = press * morphRef.current;
      const sx = (1 + stretch) * pop;
      const sy = (1 - stretch * 0.5) * pop;
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

      const next = detectSprite();
      if (next !== spriteRef.current) {
        spriteRef.current = next;
        morphRef.current = MORPH_DIP;
        setSprite(next);
      }

      // Sprites hang upright and don't steer — full gravity to rotation 0,
      // momentum intact, so flick spins still work on them.
      const inSprite = !!spriteRef.current;
      const hang = inSprite ? 0 : IDLE_ANGLE;
      stepCursor(spring, {
        target: inSprite ? 0 : targetAngle,
        speed: inSprite ? 0 : speed,
        gravity: inSprite ? 1 : gravityRamp(now - lastActive),
        hang,
        dt,
      });
      press += ((pressed ? PRESS_SCALE : 1) - press) * 0.35;
      morphRef.current += (1 - morphRef.current) * 0.3;

      render(speed);

      // Only sleep once the glyph has made it home to its hanging pose — the
      // loop stays alive through the idle delay and the return swing.
      const settled =
        speed < 1 &&
        Math.abs(spring.velocity) < 0.02 &&
        Math.abs(shortestAngleDelta(spring.angle, hang)) < 0.01 &&
        Math.abs(press - (pressed ? PRESS_SCALE : 1)) < 0.001 &&
        1 - morphRef.current < 0.005;
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
    // Zone rects move when the page does; wake so detection re-runs even if
    // the mouse itself is still (content scrolling under a resting cursor).
    function onViewChange() {
      rectsDirty = true;
      if (initialized) wake();
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    // Capture phase so inner scroll containers invalidate too.
    document.addEventListener("scroll", onViewChange, { passive: true, capture: true });
    window.addEventListener("resize", onViewChange);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("scroll", onViewChange, { capture: true });
      window.removeEventListener("resize", onViewChange);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("weighted-cursor");
      // Cleanup can run mid-session (reduced-motion flipped on): hide the
      // frozen dart, not just restore the native cursor.
      dart.style.opacity = "0";
      zoneObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <div ref={dartRef} className="weighted-cursor-dart" aria-hidden="true">
      {sprite ? (
        <div
          className="weighted-cursor-icon"
          // Trusted static markup from cursor-sprites, not user input.
          dangerouslySetInnerHTML={{ __html: SPRITE_SVGS[sprite] }}
        />
      ) : (
        /* Hollow classic arrow rotated so it points +x (angle 0); the tip at
           (21,10) is offset to the hotspot in CSS. Outline only — a bg halo
           stroke under an ink stroke, round joins softening every corner,
           interior transparent. */
        <svg width="22" height="20" viewBox="0 0 22 20">
          <g strokeLinejoin="round" fill="none">
            <path
              d="M21 10 L5.9 4.2 L8 9.1 L1 9.4 L1.1 12.4 L8.1 12.1 L6.2 17.1 Z"
              stroke="var(--bg)"
              strokeWidth="3.6"
            />
            <path
              d="M21 10 L5.9 4.2 L8 9.1 L1 9.4 L1.1 12.4 L8.1 12.1 L6.2 17.1 Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </g>
        </svg>
      )}
    </div>
  );
}
