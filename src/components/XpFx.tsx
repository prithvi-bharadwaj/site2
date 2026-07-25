"use client";

import { useEffect, useRef, useState } from "react";
import { onXpFx } from "@/lib/xp";

interface Particle {
  id: number;
  text: string;
  topPx: number;
  tilt: number;
}

const LIFETIME_MS = 1300;
const EDGE_PAD = 8;
// The burst's real footprint: inherited line-height, plus the xp-burst
// keyframes translate it from +10px down to -80px up over its lifetime.
const LINE_HEIGHT = 1.62;
const DRIFT_UP = 80;
const DROP_IN = 10;

/**
 * Where to draw a burst so it isn't hidden behind a visible hover/pinned
 * card at any point of its animation. If the travel band overlaps the card,
 * move to whichever side (above/below) has more room. Exported for tests.
 */
export function burstTopPx(
  preferred: number,
  fontPx: number,
  viewportH: number,
  card: { top: number; bottom: number } | null
): number {
  const textH = fontPx * LINE_HEIGHT;
  if (!card || preferred - DRIFT_UP >= card.bottom || preferred + textH + DROP_IN <= card.top) {
    return preferred;
  }
  const above = card.top;
  const below = viewportH - card.bottom;
  return above >= below
    ? // Ends above the card even at the +10px drop-in frame.
      Math.max(EDGE_PAD, card.top - textH - DROP_IN - EDGE_PAD)
    : // Stays below the card even after drifting 80px up.
      Math.min(viewportH - textH - EDGE_PAD, card.bottom + DRIFT_UP + EDGE_PAD);
}

/**
 * Screen-wide xp bursts. Every "xp:fx" event flashes its text huge across
 * the middle of the viewport, then floats up and fades. Purely ephemeral,
 * never intercepts input.
 */
export function XpFx() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    let disposed = false;
    const off = onXpFx(({ text }) => {
      // Next frame: a click that awards xp often pins the proof card in the
      // same handler, and the burst must dodge where the card ends up.
      requestAnimationFrame(() => {
        if (disposed) return;
        const vh = window.innerHeight;
        const fontPx = Math.min(140, Math.max(48, window.innerWidth * 0.09));
        const jitterPx = ((Math.random() - 0.5) * 30 * vh) / 100;
        const card = document.querySelector(".hover-card.visible");
        const rect = card ? card.getBoundingClientRect() : null;
        const id = nextId.current++;
        const p: Particle = {
          id,
          text,
          topPx: burstTopPx(0.45 * vh + jitterPx, fontPx, vh, rect),
          tilt: (Math.random() - 0.5) * 6,
        };
        setParticles((prev) => [...prev, p]);
        window.setTimeout(() => {
          setParticles((prev) => prev.filter((q) => q.id !== id));
        }, LIFETIME_MS);
      });
    });
    return () => {
      disposed = true;
      off();
    };
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute inset-x-0 text-center font-bold tabular-nums text-(--ink)/90"
          style={{
            top: p.topPx,
            fontSize: "clamp(48px, 9vw, 140px)",
            letterSpacing: "-0.02em",
            rotate: `${p.tilt}deg`,
            animation: `xp-burst ${LIFETIME_MS}ms ease-out forwards`,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
}
