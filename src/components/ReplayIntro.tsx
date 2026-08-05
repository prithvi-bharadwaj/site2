"use client";

import { trackInteraction } from "@/lib/analytics";

/**
 * Review control for the intro rework: replay the show on demand. Reloads
 * with ?intro so it always starts from a clean page state.
 */
export function ReplayIntro() {
  return (
    <button
      data-analytics-section="intro-replay"
      onClick={() => {
        trackInteraction("intro_replayed");
        window.location.assign("/?intro");
      }}
      className="fixed top-4 left-4 z-[70] text-[10px] uppercase tracking-widest text-(--ink)/25 hover:text-(--ink)/70 transition-colors cursor-pointer"
    >
      replay intro
    </button>
  );
}
