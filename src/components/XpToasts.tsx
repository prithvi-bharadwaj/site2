"use client";

import { useEffect, useRef, useState } from "react";
import { emitXpToast, onXpToast, type XpToastDetail } from "@/lib/xp";

interface Toast extends XpToastDetail {
  id: number;
}

const TOAST_MS = 5500;
const EXIT_BAIT_KEY = "prithvi-exit-baited";

/**
 * Steam-style notification stack, bottom right (above the xp HUD).
 * Achievement unlocks and info nudges arrive via the "xp:toast" event.
 * Also owns the exit-intent hook: when the cursor leaves the top of the
 * viewport, bait the visitor once per session with the hidden game.
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

    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0) return; // only real top-of-window exits
      try {
        if (sessionStorage.getItem(EXIT_BAIT_KEY)) return;
        sessionStorage.setItem(EXIT_BAIT_KEY, "1");
      } catch {
        return;
      }
      emitXpToast({
        title: "leaving already?",
        body: "78% of visitors unlock the hidden game before they quit. Have you found where it is?",
        kind: "info",
      });
    };
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      off();
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[75] flex w-72 flex-col items-end gap-2">
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
