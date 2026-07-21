"use client";

import { useEffect, useRef, useState } from "react";
import { HOVER_XP, onInspectStart, onInspectEnd } from "@/lib/xp";

/**
 * Tiny progress bar that rides along under the cursor while a proof preview
 * is being inspected. Fills over the dwell time; when it completes, the xp
 * award (and its burst) fires from the store. Leaving early cancels it.
 * Nothing shows for proofs that are already collected.
 */
export function InspectProgress() {
  const [active, setActive] = useState<{ ms: number; key: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const nextKey = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (wrapRef.current) {
        // Above the cursor: the hover card occupies the space below-right,
        // so anything placed there is hidden underneath it.
        wrapRef.current.style.transform = `translate3d(${e.clientX + 8}px, ${e.clientY - 34}px, 0)`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let clearTimer: number | undefined;
    const offStart = onInspectStart(({ ms }) => {
      window.clearTimeout(clearTimer);
      setActive({ ms, key: nextKey.current++ });
      // Auto-hide once the fill completes (the award burst takes over).
      clearTimer = window.setTimeout(() => setActive(null), ms);
    });
    const offEnd = onInspectEnd(() => {
      window.clearTimeout(clearTimer);
      setActive(null);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearTimeout(clearTimer);
      offStart();
      offEnd();
    };
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95]" aria-hidden="true">
      <div
        ref={wrapRef}
        className="absolute left-0 top-0 flex flex-col items-center gap-0.5"
        style={{
          transform: `translate3d(${mouse.current.x + 8}px, ${mouse.current.y - 34}px, 0)`,
        }}
      >
        <span className="text-[9px] tabular-nums text-(--ink)/60">+{HOVER_XP} xp</span>
        <span className="block h-1 w-10 overflow-hidden rounded-full bg-(--ink)/20 shadow-[0_0_0_2px_var(--bg)]">
          <span
            key={active.key}
            className="block h-full rounded-full bg-(--ink)/80"
            style={{ animation: `inspect-fill ${active.ms}ms linear forwards` }}
          />
        </span>
      </div>
    </div>
  );
}
