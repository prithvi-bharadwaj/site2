"use client";

import { useEffect, useRef, useState } from "react";
import { onXpFx } from "@/lib/xp";

interface Particle {
  id: number;
  text: string;
  offsetY: number;
  tilt: number;
}

const LIFETIME_MS = 1300;

/**
 * Screen-wide xp bursts. Every "xp:fx" event flashes its text huge across
 * the middle of the viewport, then floats up and fades. Purely ephemeral,
 * never intercepts input.
 */
export function XpFx() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    return onXpFx(({ text }) => {
      const id = nextId.current++;
      const p: Particle = {
        id,
        text,
        offsetY: (Math.random() - 0.5) * 30, // vh jitter so bursts don't overlap
        tilt: (Math.random() - 0.5) * 6,
      };
      setParticles((prev) => [...prev, p]);
      window.setTimeout(() => {
        setParticles((prev) => prev.filter((q) => q.id !== id));
      }, LIFETIME_MS);
    });
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute inset-x-0 text-center font-bold tabular-nums text-(--ink)/90"
          style={{
            top: `calc(45vh + ${p.offsetY}vh)`,
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
