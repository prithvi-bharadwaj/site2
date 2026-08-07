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
      {/* Same card language as the xp toasts: hairline border, icon chip,
          tiny uppercase kicker, one font size, ink-opacity hierarchy. */}
      <div
        className="w-full max-w-sm rounded-lg border border-(--ink)/12 bg-(--bg) p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--ink)/8 text-sm">
            👀
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase tracking-widest text-(--ink)/40">
              before you go
            </span>
            <span className="block text-sm font-normal text-(--ink)/85">leaving already?</span>
            <p className="mt-2 text-sm leading-relaxed text-(--ink)/60">
              You&apos;ve only explored{" "}
              <span className="text-(--ink)/85">{pct}%</span> of this site. There&apos;s a
              hidden game somewhere on this page. Have you found where it is?
            </p>
            <div className="mt-3 h-px w-full bg-(--ink)/10" aria-hidden>
              <div className="h-px bg-(--ink)/60" style={{ width: `${pct}%` }} />
            </div>
            <button
              onClick={() => dismiss("keep_exploring")}
              className="mt-4 cursor-pointer rounded-md bg-(--ink)/90 px-3 py-1 text-xs text-(--bg) transition-colors hover:bg-(--ink)"
            >
              fine, I&apos;ll keep exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
