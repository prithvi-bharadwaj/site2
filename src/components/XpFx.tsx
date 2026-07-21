"use client";

import { useEffect, useRef, useState } from "react";
import { onXpFx } from "@/lib/xp";

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  big: boolean;
}

const LIFETIME_MS = 1100;
const BIG_LIFETIME_MS = 1600;

/**
 * Cursor-anchored xp particles. Listens for "xp:fx" events and floats a
 * tiny "+2 xp" (or "★ Achievement") label up from wherever the mouse is.
 * No toasts, no layout - purely ephemeral.
 */
export function XpFx() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const mouse = useRef({ x: -1, y: -1 });
  const nextId = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const off = onXpFx(({ text, big }) => {
      const { x, y } = mouse.current;
      if (x < 0) return; // no pointer yet (touch/keyboard) - skip quietly
      const id = nextId.current++;
      const jitter = (Math.random() - 0.5) * 16;
      // Achievements stack slightly higher so they don't overlap the +xp
      const p: Particle = { id, x: x + 10 + jitter, y: y - 14 - (big ? 22 : 0), text, big: !!big };
      setParticles((prev) => [...prev, p]);
      window.setTimeout(() => {
        setParticles((prev) => prev.filter((q) => q.id !== id));
      }, big ? BIG_LIFETIME_MS : LIFETIME_MS);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      off();
    };
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute tabular-nums whitespace-nowrap ${
            p.big ? "text-[11px] text-(--ink)/90" : "text-[10px] text-(--ink)/60"
          }`}
          style={{
            left: p.x,
            top: p.y,
            animation: `xp-float ${p.big ? BIG_LIFETIME_MS : LIFETIME_MS}ms ease-out forwards`,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
}
