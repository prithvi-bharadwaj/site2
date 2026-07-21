"use client";

import { useEffect, useState } from "react";
import { completionPct, useXp } from "@/lib/xp";

const EXIT_BAIT_KEY = "prithvi-exit-baited";

/**
 * Exit-intent takeover. When the cursor leaves the top of the viewport,
 * blur the whole site and confront the visitor with how little of it
 * they've explored. Once per session.
 */
export function ExitGate() {
  const [shown, setShown] = useState(false);
  const xp = useXp();

  useEffect(() => {
    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0) return; // only real top-of-window exits
      try {
        if (sessionStorage.getItem(EXIT_BAIT_KEY)) return;
        sessionStorage.setItem(EXIT_BAIT_KEY, "1");
      } catch {
        return;
      }
      setShown(true);
    };
    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, []);

  if (!shown) return null;

  const pct = completionPct(xp.total);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-(--bg)/60 px-8 backdrop-blur-xl"
      style={{ animation: "word-enter 250ms ease-out" }}
      role="dialog"
      aria-modal="true"
      onClick={() => setShown(false)}
    >
      <div className="max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mb-4 block text-4xl">👀</span>
        <h2 className="mb-3 text-2xl font-bold text-(--ink)/90">leaving already?</h2>
        <p className="mb-2 text-sm leading-relaxed text-(--ink)/60">
          You&apos;ve only explored <span className="font-semibold text-(--ink)/85">{pct}%</span> of
          this site.
        </p>
        <p className="mb-6 text-sm leading-relaxed text-(--ink)/60">
          78% of visitors unlock the hidden game before they quit. Have you found where it is?
        </p>
        <button
          onClick={() => setShown(false)}
          className="cursor-pointer rounded-md bg-(--ink)/90 px-4 py-2 text-sm text-(--bg) transition-colors hover:bg-(--ink)"
        >
          fine, I&apos;ll keep exploring
        </button>
      </div>
    </div>
  );
}
