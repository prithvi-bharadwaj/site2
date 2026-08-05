"use client";

import type { IntroVariant } from "@/components/IntroReveal";
import { trackInteraction } from "@/lib/analytics";

/**
 * Review control for the intro rework: replay either second act on demand.
 * A = carriage return, B = ink develop. Reloads with ?intro=<variant> so the
 * show always starts from a clean page state.
 */
export function ReplayIntro({ played }: { played: IntroVariant }) {
  return (
    <div
      data-analytics-section="intro-replay"
      className="fixed top-4 left-4 z-[70] flex items-center gap-2 text-[10px] uppercase tracking-widest"
    >
      <span className="text-(--ink)/25 select-none">intro</span>
      {(["a", "b"] as const).map((v) => (
        <button
          key={v}
          onClick={() => {
            trackInteraction("intro_replayed", { variant: v });
            window.location.assign(`/?intro=${v}`);
          }}
          className={`cursor-pointer transition-colors hover:text-(--ink)/80 ${
            v === played ? "text-(--ink)/50" : "text-(--ink)/25"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
