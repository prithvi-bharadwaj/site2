"use client";

import { useState } from "react";
import {
  ACHIEVEMENTS,
  GENZ_UNLOCK_XP,
  TOTALS,
  resetXp,
  useXp,
  type XpState,
} from "@/lib/xp";

function count(s: XpState, prefix: string) {
  return Object.keys(s.earned).filter((k) => k.startsWith(prefix)).length;
}

/**
 * Tiny fixed xp counter, bottom right. Invisible until the visitor earns
 * their first xp - the site stays minimal for anyone who never discovers it.
 * Clicking it opens the achievement drawer.
 */
export function XpHud() {
  const xp = useXp();
  const [open, setOpen] = useState(false);

  if (xp.total === 0) return null;

  const progress = [
    { label: "proof", n: count(xp, "proof:"), total: TOTALS.proof },
    { label: "lore", n: count(xp, "lore:"), total: TOTALS.lore },
    { label: "writing", n: count(xp, "writing:"), total: TOTALS.writing },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end">
      {open && (
        <div
          className="mb-2 w-60 rounded-lg border border-(--ink)/10 bg-(--bg) p-4 shadow-lg"
          style={{ animation: "word-enter 200ms ease-out" }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-widest text-(--ink)/35">
              Progress
            </span>
            <span className="text-[10px] tabular-nums text-(--ink)/40">
              {progress.map((p) => `${p.label} ${p.n}/${p.total}`).join(" · ")}
            </span>
          </div>

          <ul className="m-0 list-none space-y-1.5 p-0">
            {ACHIEVEMENTS.map((a) => {
              const done = a.done(xp);
              return (
                <li key={a.id} className="text-xs leading-snug">
                  {done ? (
                    <>
                      <span className="text-(--ink)/80">★ {a.name}</span>
                      <span className="block text-[10px] text-(--ink)/40">{a.desc}</span>
                    </>
                  ) : (
                    <span className="select-none text-(--ink)/25 blur-[3px]" aria-label="locked achievement">
                      ★ {a.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 border-t border-(--ink)/8 pt-2 text-[10px] text-(--ink)/40">
            {xp.total >= GENZ_UNLOCK_XP
              ? "unlocked: gen z mode (footer)"
              : `${GENZ_UNLOCK_XP} xp unlocks something in the footer`}
          </div>

          <button
            onClick={() => {
              resetXp();
              setOpen(false);
            }}
            className="mt-2 cursor-pointer text-[10px] text-(--ink)/30 transition-colors hover:text-(--ink)/60"
          >
            reset progress
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        title="progress"
        className="cursor-pointer text-xs tabular-nums text-(--ink)/40 transition-colors hover:text-(--ink)/80"
        style={{ animation: "word-enter 300ms ease-out" }}
      >
        {xp.total} xp
      </button>
    </div>
  );
}
