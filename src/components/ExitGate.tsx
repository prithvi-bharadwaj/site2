"use client";

import { useEffect, useState } from "react";
import { completionPct, useXp } from "@/lib/xp";
import { trackInteraction } from "@/lib/analytics";

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
    const onMouseLeave = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0) return; // only real top-of-viewport exits
      try {
        if (sessionStorage.getItem(EXIT_BAIT_KEY)) return;
        sessionStorage.setItem(EXIT_BAIT_KEY, "1");
      } catch {
        return;
      }
      trackInteraction("exit_gate_shown", {
        explored_percent: completionPct(xp.total),
        total_xp: xp.total,
      });
      setShown(true);
    };
    const page = document.documentElement;
    page.addEventListener("mouseleave", onMouseLeave);
    return () => page.removeEventListener("mouseleave", onMouseLeave);
  }, [xp.total]);

  if (!shown) return null;

  const pct = completionPct(xp.total);
  const dismiss = (reason: "backdrop" | "keep_exploring") => {
    trackInteraction("exit_gate_dismissed", {
      reason,
      explored_percent: pct,
      total_xp: xp.total,
    });
    setShown(false);
  };

  return (
    <div
      data-analytics-section="exit_gate"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-(--bg)/60 px-8 backdrop-blur-xl"
      style={{ animation: "word-enter 250ms ease-out" }}
      role="dialog"
      aria-modal="true"
      onClick={() => dismiss("backdrop")}
    >
      <div className="max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mb-4 block text-4xl">👀</span>
        <h2 className="mb-3 text-2xl font-bold text-(--ink)/90">leaving already?</h2>
        <p className="mb-2 text-sm leading-relaxed text-(--ink)/60">
          You&apos;ve only explored <span className="font-semibold text-(--ink)/85">{pct}%</span> of
          this site.
        </p>
        <p className="mb-6 text-sm leading-relaxed text-(--ink)/60">
          There&apos;s a hidden game somewhere on this page. Have you found where it is?
        </p>
        <button
          onClick={() => dismiss("keep_exploring")}
          className="cursor-pointer rounded-md bg-(--ink)/90 px-4 py-2 text-sm text-(--bg) transition-colors hover:bg-(--ink)"
        >
          fine, I&apos;ll keep exploring
        </button>
      </div>
    </div>
  );
}
