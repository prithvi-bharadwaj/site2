"use client";

import { useEffect, useRef, useState } from "react";
import { onXpToast, type XpToastDetail } from "@/lib/xp";

interface Toast extends XpToastDetail {
  id: number;
}

const TOAST_MS = 5500;

/**
 * Steam-style notification stack, top right (below the theme toggle).
 * Achievement unlocks and info nudges arrive via the "xp:toast" event.
 */
export function XpToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const live = useRef<Set<string>>(new Set());

  useEffect(() => {
    const off = onXpToast((detail) => {
      if (live.current.has(detail.title)) return; // don't stack duplicates
      live.current.add(detail.title);
      const id = nextId.current++;
      setToasts((prev) => [...prev, { ...detail, id }]);
      window.setTimeout(() => {
        live.current.delete(detail.title);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_MS);
    });

    return off;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-[75] flex w-72 flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="w-full rounded-lg border border-(--ink)/12 bg-(--bg) p-3 shadow-lg"
          style={{ animation: "word-enter 250ms ease-out" }}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--ink)/8 text-sm">
              {t.kind === "achievement" ? "★" : "👀"}
            </span>
            <div className="min-w-0">
              {t.kind === "achievement" && (
                <span className="block text-[9px] uppercase tracking-widest text-(--ink)/40">
                  achievement unlocked
                </span>
              )}
              <span className="block text-xs font-medium text-(--ink)/85">{t.title}</span>
              <span className="block text-[11px] leading-snug text-(--ink)/50">{t.body}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
