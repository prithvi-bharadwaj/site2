"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  SOCIAL_UNLOCK_XP,
  TOTALS,
  canHover,
  levelFor,
  resetXp,
  unlockedAchievements,
  useXp,
  type XpState,
} from "@/lib/xp";

function count(s: XpState, prefix: string) {
  return Object.keys(s.earned).filter((k) => k.startsWith(prefix)).length;
}

/**
 * Persistent xp tracker, bottom right: level name, xp progress bar toward
 * the next level, and achievements discovered. Clicking it opens the drawer
 * with per-section progress, the achievement list, and how xp is earned.
 */
export function XpHud() {
  const xp = useXp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The drawer dismisses like the pinned proof card: outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const level = levelFor(xp.total);
  const pct = level.next
    ? Math.round(((xp.total - level.min) / (level.next.min - level.min)) * 100)
    : 100;
  const unlocked = unlockedAchievements(xp).length;

  const progress = [
    { label: "proof", n: count(xp, "proof:"), total: TOTALS.proof },
    { label: "lore", n: count(xp, "lore:"), total: TOTALS.lore },
    { label: "writing", n: count(xp, "writing:"), total: TOTALS.writing },
  ];

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[70] flex flex-col items-end">
      {open && (
        <div
          className="mb-2 w-64 rounded-lg border border-(--ink)/10 bg-(--bg) p-4 shadow-lg"
          style={{ animation: "word-enter 200ms ease-out" }}
        >
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-widest text-(--ink)/35">
              Progress
            </span>
            <span className="text-[10px] tabular-nums text-(--ink)/40">
              {progress.map((p) => `${p.label} ${p.n}/${p.total}`).join(" · ")}
            </span>
          </div>
          <p className="mb-3 text-[10px] leading-snug text-(--ink)/40">
            earn xp: {canHover() ? "hover" : "tap"} the proof, open the lore, read the writing
          </p>

          <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-(--ink)/35">
            achievements · {unlocked}/{ACHIEVEMENTS.length}
          </span>
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
            {xp.total >= SOCIAL_UNLOCK_XP
              ? "contact links unlocked"
              : `contact links unlock at ${SOCIAL_UNLOCK_XP} xp`}
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
        className="group cursor-pointer rounded-md bg-(--bg)/80 px-2 py-1.5 backdrop-blur-sm transition-colors hover:bg-(--ink)/4"
      >
        <span className="flex items-baseline gap-2 text-[11px] tabular-nums text-(--ink)/45 transition-colors group-hover:text-(--ink)/80">
          <span>
            lv{level.index} {level.name}
          </span>
          <span>{xp.total} xp</span>
          <span>★ {unlocked}/{ACHIEVEMENTS.length}</span>
        </span>
        <span className="mt-1 block h-[3px] w-44 overflow-hidden rounded-full bg-(--ink)/10">
          <span
            className="block h-full rounded-full bg-(--ink)/55 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </span>
      </button>
    </div>
  );
}
