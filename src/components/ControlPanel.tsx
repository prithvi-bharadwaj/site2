"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "./Switch";
import { emitPhysics, onPhysicsSync } from "@/lib/physics-bus";

/**
 * Sitemap + controls. Jump to any section, flip the site's toys on and off.
 * A floating dock bar centered along the bottom edge, collapsed to a single
 * word until you open it.
 */

export interface PanelSection {
  id: string;
  label: string;
}

interface ControlPanelProps {
  sections: PanelSection[];
  genz: boolean;
  onGenzChange: (next: boolean) => void;
}

/** Gravity locks scrolling, so a jump has to wait for the letters to fly back. */
const RESTORE_MS = 560;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function KeyHint({ children }: { children: string }) {
  return <kbd className="panel-key">{children}</kbd>;
}

export function ControlPanel({ sections, genz, onGenzChange }: ControlPanelProps) {
  const [open, setOpen] = useState(false);
  const [gravity, setGravity] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // The overlay can drop gravity on its own (resize, escape) - follow it.
  useEffect(() => onPhysicsSync(setGravity), []);

  // Mark whichever section owns the middle of the viewport.
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const toggleGravity = useCallback(
    (next: boolean) => {
      setGravity(next);
      emitPhysics({ type: "gravity", on: next });
    },
    []
  );

  const smash = useCallback(() => emitPhysics({ type: "smash" }), []);

  useEffect(() => {
    if (reduced) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        smash();
      } else if (key === "g") {
        e.preventDefault();
        toggleGravity(!gravity);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reduced, smash, gravity, toggleGravity]);

  const jump = useCallback(
    (id: string) => {
      const go = () =>
        document.getElementById(id)?.scrollIntoView({
          // Reduced motion opts out of the scroll animation too.
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      if (gravity) {
        toggleGravity(false);
        window.setTimeout(go, RESTORE_MS);
      } else {
        go();
      }
    },
    [gravity, reduced, toggleGravity]
  );

  return (
    <div
      className="fixed bottom-4 inset-x-0 z-[70] flex justify-center pointer-events-none"
      data-no-physics
    >
      {open ? (
        <div className="control-dock popup-enter pointer-events-auto">
          <nav className="dock-nav" aria-label="Sitemap">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                data-active={active === s.id}
                className="panel-link"
              >
                <span className="panel-dot" />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="dock-sep" />

          <div className="dock-control">
            <span className="panel-label">gen z</span>
            <Switch checked={genz} onChange={onGenzChange} label="gen z mode" />
          </div>

          <div className="dock-control">
            <span className="panel-label">
              gravity <KeyHint>G</KeyHint>
            </span>
            <Switch
              checked={gravity}
              onChange={toggleGravity}
              disabled={reduced}
              label="gravity"
            />
          </div>

          <div className="dock-control">
            <button onClick={smash} disabled={reduced} className="panel-button">
              slam
            </button>
            <KeyHint>F</KeyHint>
          </div>

          <button
            onClick={() => setOpen(false)}
            aria-label="Close sitemap"
            className="panel-close"
          >
            ×
          </button>

          {reduced && (
            <p className="panel-note dock-note">physics off - reduced motion is on</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="panel-trigger pointer-events-auto"
          title="sitemap + controls"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
            <rect x="0.5" y="0.5" width="11" height="2.4" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="0.5" y="4.8" width="11" height="2.4" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="0.5" y="9.1" width="7" height="2.4" rx="1" fill="currentColor" opacity="0.35" />
          </svg>
          sitemap
        </button>
      )}
    </div>
  );
}
