"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-repel wiggle shared across the page - the hero tagline effect,
 * applied per word.
 *
 * Three behaviors from one manager:
 * - "word": the hero's spring physics (strong repel, springs back with
 *   damping and momentum). Transforms are integrated every frame - no CSS
 *   transition - so it feels identical to the tagline.
 * - "letter": a very subtle secondary spring on each letter inside a word.
 *   It compounds with the parent word's transform, so words shear apart
 *   slightly without breaking readability.
 * - "unit": a transition-based repel for underlined links, so they move as
 *   one piece (single continuous underline) and stay easy to click.
 *
 * One mousemove listener + one rAF loop drives everything. Rest centers are
 * cached in page coordinates and re-measured lazily whenever the document
 * resizes (viewport change, expand/collapse, font swap).
 */

// Spring physics - "word" matches the hero displacement effect; "letter" is
// the same integration at a fraction of the amplitude.
const REPEL_RADIUS = 120;
const SPRING = 0.06;
const DAMPING = 0.82;
const WORD_STRENGTH = 8;
const WORD_MAX = 30;
const LETTER_STRENGTH = 1.2;
const LETTER_MAX = 4;

// Gentle repel for underlined links.
const UNIT_RADIUS = 70;
const UNIT_FORCE = 5;

// Words near an underlined link wiggle slightly less, so the calm link
// doesn't look out of place next to flying neighbors. Very light touch.
const CALM_RADIUS = 90;
const CALM_FLOOR = 0.8;

type Kind = "word" | "letter" | "unit";

interface Entry {
  kind: Kind;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  moved: boolean;
  /** Strength multiplier from proximity to a unit (1 = full effect). */
  calm: number;
}

const entries = new Map<HTMLElement, Entry>();
let dirty = true;
let raf = 0;
let mouseX = 0;
let mouseY = 0;
let mouseActive = false;
let started = false;
// Last mouse position the tick processed - lets the loop stop when the
// cursor rests and every spring has settled, instead of running forever.
let procX = NaN;
let procY = NaN;

function measure() {
  for (const [el, e] of entries) {
    if (e.moved) {
      el.style.transform = "";
      e.moved = false;
    }
    e.dx = e.dy = e.vx = e.vy = 0;
  }
  for (const [el, e] of entries) {
    const r = el.getBoundingClientRect();
    e.cx = r.left + window.scrollX + r.width / 2;
    e.cy = r.top + window.scrollY + r.height / 2;
  }

  // Calm words/letters near underlined links.
  const unitCenters: { x: number; y: number }[] = [];
  for (const e of entries.values()) {
    if (e.kind === "unit") unitCenters.push({ x: e.cx, y: e.cy });
  }
  for (const e of entries.values()) {
    if (e.kind === "unit" || unitCenters.length === 0) {
      e.calm = 1;
      continue;
    }
    let d2min = Infinity;
    for (const u of unitCenters) {
      const ux = e.cx - u.x;
      const uy = e.cy - u.y;
      const d2 = ux * ux + uy * uy;
      if (d2 < d2min) d2min = d2;
    }
    const d = Math.sqrt(d2min);
    e.calm = d >= CALM_RADIUS ? 1 : CALM_FLOOR + (1 - CALM_FLOOR) * (d / CALM_RADIUS);
  }

  dirty = false;
}

function tick() {
  if (dirty) measure();
  const radiusSq = REPEL_RADIUS * REPEL_RADIUS;
  const mouseChanged = mouseX !== procX || mouseY !== procY;
  procX = mouseX;
  procY = mouseY;
  let anyMoving = false;

  for (const [el, e] of entries) {
    if (e.kind === "unit") {
      const dx = e.cx - mouseX;
      const dy = e.cy - mouseY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (mouseActive && d < UNIT_RADIUS && d > 0) {
        const t = 1 - d / UNIT_RADIUS;
        el.style.transform = `translate(${(dx / d) * t * t * UNIT_FORCE}px, ${(dy / d) * t * t * UNIT_FORCE}px)`;
        e.moved = true;
      } else if (e.moved) {
        el.style.transform = "";
        e.moved = false;
      }
      continue;
    }

    // Word/letter: spring physics, integrated per frame like the hero.
    const strength = e.kind === "word" ? WORD_STRENGTH : LETTER_STRENGTH;
    const maxDisplacement = e.kind === "word" ? WORD_MAX : LETTER_MAX;
    if (mouseActive) {
      const mx = e.cx + e.dx - mouseX;
      const my = e.cy + e.dy - mouseY;
      const distSq = mx * mx + my * my;
      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const t = 1 - dist / REPEL_RADIUS;
        const force = t * t * strength * e.calm;
        e.vx += (mx / dist) * force;
        e.vy += (my / dist) * force;
      }
    }
    e.vx -= e.dx * SPRING;
    e.vy -= e.dy * SPRING;
    e.vx *= DAMPING;
    e.vy *= DAMPING;
    e.dx += e.vx;
    e.dy += e.vy;
    const mag = Math.sqrt(e.dx * e.dx + e.dy * e.dy);
    if (mag > maxDisplacement) {
      const s = maxDisplacement / mag;
      e.dx *= s;
      e.dy *= s;
    }

    const displaced = Math.abs(e.dx) > 0.1 || Math.abs(e.dy) > 0.1;
    const settling = Math.abs(e.vx) > 0.02 || Math.abs(e.vy) > 0.02;
    if (displaced) {
      el.style.transform = `translate3d(${e.dx}px, ${e.dy}px, 0)`;
      e.moved = true;
    } else if (e.moved) {
      el.style.transform = "";
      e.moved = false;
      e.dx = e.dy = e.vx = e.vy = 0;
    }
    // Keep integrating while velocities are alive; a held displacement at
    // equilibrium (cursor parked near text) doesn't need frames on its own.
    if (settling) anyMoving = true;
  }

  raf = anyMoving || (mouseActive && mouseChanged) ? requestAnimationFrame(tick) : 0;
}

function wake() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function onMove(ev: MouseEvent) {
  mouseX = ev.clientX + window.scrollX;
  mouseY = ev.clientY + window.scrollY;
  mouseActive = true;
  wake();
}

function onLeave() {
  mouseActive = false;
  wake();
}

function start() {
  if (started || typeof window === "undefined") return;
  if (typeof window.matchMedia !== "function") return; // jsdom
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  started = true;
  document.addEventListener("mousemove", onMove);
  document.documentElement.addEventListener("mouseleave", onLeave);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      dirty = true;
    }).observe(document.body);
  }
}

export function registerWiggle(el: HTMLElement, kind: Kind = "word") {
  start();
  entries.set(el, { kind, cx: 0, cy: 0, dx: 0, dy: 0, vx: 0, vy: 0, moved: false, calm: 1 });
  dirty = true;
}

export function unregisterWiggle(el: HTMLElement) {
  entries.delete(el);
}

/** Registers every `[data-repel]` descendant of `root` (underlined links, bullets, favicons) as a whole-unit wiggler. */
export function useWiggleDescendants(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const els = Array.from(el.querySelectorAll<HTMLElement>("[data-repel]"));
    els.forEach((n) => registerWiggle(n, "unit"));
    return () => els.forEach(unregisterWiggle);
  }, [root]);
}

/** Text where each word repels from the cursor with the hero's spring physics,
 *  plus a very subtle per-letter shear inside each word. */
export function WiggleWords({ text, className }: { text: string; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>(".wl-word"));
    const letters = Array.from(root.querySelectorAll<HTMLElement>(".wl-ch"));
    words.forEach((el) => registerWiggle(el, "word"));
    letters.forEach((el) => registerWiggle(el, "letter"));
    return () => {
      words.forEach(unregisterWiggle);
      letters.forEach(unregisterWiggle);
    };
  }, [text]);

  return (
    <span ref={rootRef} className={className} aria-label={text}>
      {text.split(/(\s+)/).map((part, pi) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return <span key={pi}>{part}</span>;
        return (
          <span key={pi} className="wl-word" aria-hidden="true">
            {Array.from(part).map((ch, ci) => (
              <span key={ci} className="wl-ch">
                {ch}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
