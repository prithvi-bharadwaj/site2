"use client";

import { useEffect, useRef } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import type { GlyphSource } from "@/lib/letter-physics";
import {
  groupWords,
  buildScrambleSchedule,
  scrambleChar,
  SCROLL_SCRAMBLE,
} from "@/lib/intro-reveal";
import { createScramblePainter } from "@/lib/scramble-painter";

/**
 * The intro's second act: while the hero decodes on the IntroReveal canvas,
 * the sections below hide; each one scramble-resolves the first time it
 * intersects the viewport - sections already visible at handoff decode
 * immediately (staggered top-to-bottom), the rest as they scroll in.
 * Mounted only when the intro ran to its natural handoff - a skipped intro
 * means the visitor asked for the page, so no further ceremony.
 *
 * A section is harvested lazily the moment it triggers (briefly unhidden for
 * the measurement, same JS task, so nothing paints). While it animates, its
 * glyphs are drawn at a scroll-compensated offset so the static tracks the
 * page moving under this fixed canvas; when the last word locks, the DOM
 * section is restored in place, pixel-exact. Any viewport resize bails out
 * to the plain page.
 */

const SECTION_IDS = ["previously", "built", "lore", "writing", "socials"];
/** A section triggers once its top clears this fraction of the viewport. */
const TRIGGER_VH = 1;
/** Sections triggering in the same frame decode top-to-bottom, this far apart. */
const STAGGER_MS = 140;
/**
 * Sections already on screen at handoff hold this short beat before decoding
 * so the hero's crossfade gets a head start without stalling the page.
 */
const HANDOFF_GRACE_MS = 400;

type SectionState =
  | { kind: "pending"; el: HTMLElement }
  | {
      kind: "running";
      el: HTMLElement;
      glyphs: GlyphSource[];
      words: number[][];
      lockAt: number[];
      curtain: number[];
      startedAt: number;
      harvestTop: number;
      total: number;
    }
  | { kind: "done" };

interface ScrollScrambleProps {
  /** Every section has resolved (or the effect bailed): unmount me. */
  onDone: () => void;
}

export function ScrollScramble({ onDone }: ScrollScrambleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const sections: SectionState[] = SECTION_IDS.flatMap((id) => {
      const el = document.getElementById(id);
      return el ? [{ kind: "pending" as const, el }] : [];
    });

    if (!canvas || !ctx || sections.length === 0) {
      doneRef.current();
      return;
    }

    let raf = 0;
    let finished = false;
    const paint = createScramblePainter(ctx);
    let dpr = 1;

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(window.innerWidth * dpr);
      canvas!.height = Math.floor(window.innerHeight * dpr);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
    }

    function measureAscent(font: string): number {
      ctx!.save();
      ctx!.font = font;
      const m = ctx!.measureText("Hxg");
      ctx!.restore();
      return m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent ?? 0;
    }

    // Opacity-only hiding on purpose: the content stays in the accessibility
    // tree and the tab order, and focusin below reveals a section the moment
    // keyboard or AT focus enters it. The ceremony must never gate access.
    function hide(el: HTMLElement) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }

    function restore(el: HTMLElement) {
      el.style.opacity = "";
      el.style.pointerEvents = "";
    }

    /**
     * Everything back to the plain page. Only the real end notifies the
     * parent - effect cleanup must stay silent, or StrictMode's dev probe
     * mount would unmount this component for good.
     */
    function cleanup(notify: boolean) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      for (const s of sections) {
        if (s.kind !== "done") restore(s.el);
      }
      if (notify) doneRef.current();
    }
    const finish = () => cleanup(true);

    /** Blur-hidden text must never reach the canvas crisp. */
    const blurCache = new Map<Element, boolean>();
    function isBlurHidden(g: GlyphSource): boolean {
      if (!g.el) return false;
      let hit = blurCache.get(g.el);
      if (hit === undefined) {
        hit = getComputedStyle(g.el).filter.includes("blur");
        blurCache.set(g.el, hit);
      }
      return hit;
    }

    function start(i: number, rectTop: number, now: number) {
      const el = (sections[i] as { el: HTMLElement }).el;
      // Unhide, measure, rehide - one JS task, so the browser never paints it.
      el.style.opacity = "";
      const glyphs = harvestGlyphs(el, {
        height: window.innerHeight * 2,
        measureAscent,
      }).filter((g) => !isBlurHidden(g));
      el.style.opacity = "0";
      glyphs.sort((a, b) => a.y - b.y || a.x - b.x);
      if (glyphs.length === 0) {
        restore(el);
        sections[i] = { kind: "done" };
        return;
      }
      const top = Math.min(...glyphs.map((g) => g.y));
      const words = groupWords(glyphs);
      const lockAt = buildScrambleSchedule(0, words.length, SCROLL_SCRAMBLE);
      sections[i] = {
        kind: "running",
        el,
        glyphs,
        words,
        lockAt,
        curtain: glyphs.map((g) => (g.y - top) * SCROLL_SCRAMBLE.curtainMsPerPx),
        startedAt: now,
        harvestTop: rectTop,
        total: lockAt[lockAt.length - 1] + SCROLL_SCRAMBLE.tailMs,
      };
    }

    function drawSection(s: Extract<SectionState, { kind: "running" }>, elapsed: number, dy: number) {
      for (let w = 0; w < s.words.length; w++) {
        if (elapsed >= s.lockAt[w]) {
          for (const i of s.words[w]) paint.drawGlyph(s.glyphs[i], s.glyphs[i].alpha, dy);
          continue;
        }
        for (const i of s.words[w]) {
          const g = s.glyphs[i];
          const rise = Math.min(1, Math.max(0, (elapsed - s.curtain[i]) / SCROLL_SCRAMBLE.fadeInMs));
          if (rise <= 0) continue;
          const alpha = g.alpha * SCROLL_SCRAMBLE.fieldAlpha * rise;
          if (g.img) {
            paint.drawGlyph(g, alpha, dy);
            continue;
          }
          const tick = Math.floor((elapsed + i * 37) / SCROLL_SCRAMBLE.churnMs);
          paint.drawStatic(g, scrambleChar(i, tick), alpha, dy);
        }
      }
    }

    const mountedAt = performance.now();
    let looping = false;

    /** Trigger every pending section that intersects the viewport. */
    function evaluatePending(now: number): boolean {
      let started = 0;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (s.kind !== "pending") continue;
        // No lower bound: a sitemap jump can move a section above the
        // viewport in one hop, and a section the visitor has passed must
        // decode too or it stays a blank hole on the way back up.
        const rect = s.el.getBoundingClientRect();
        if (rect.top < window.innerHeight * TRIGGER_VH) {
          // A future startedAt just delays the draw; drawSection paints
          // nothing while elapsed is negative. Grace decays to zero, so
          // scroll-triggered sections later start immediately.
          const grace = Math.max(0, mountedAt + HANDOFF_GRACE_MS - now);
          start(i, rect.top, now + grace + started * STAGGER_MS);
          started++;
        }
      }
      return started > 0;
    }

    function frame(now: number) {
      if (finished) return;
      evaluatePending(now);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let allDone = true;
      let anyRunning = false;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (s.kind === "done") continue;
        if (s.kind === "pending") {
          allDone = false;
          continue;
        }
        const elapsed = now - s.startedAt;
        if (elapsed >= s.total) {
          // Completed this frame - must not hold allDone open, or the final
          // section's restore would never reach finish() and the canvas,
          // listeners, and backing buffer would linger until a scroll.
          restore(s.el);
          sections[i] = { kind: "done" };
          continue;
        }
        allDone = false;
        anyRunning = true;
        drawSection(s, elapsed, s.el.getBoundingClientRect().top - s.harvestTop);
      }
      if (allDone) {
        finish();
        return;
      }
      if (!anyRunning) {
        // Everything visible has resolved; sleep until the next scroll
        // instead of burning frames polling the pending sections below.
        looping = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (finished || looping) return;
      looping = true;
      raf = requestAnimationFrame(frame);
    }

    /** Focus entering a hidden section reveals it instantly, no ceremony. */
    function onFocusIn(e: FocusEvent) {
      const target = e.target instanceof Node ? e.target : null;
      if (!target) return;
      const i = sections.findIndex((s) => s.kind !== "done" && s.el.contains(target));
      if (i === -1) return;
      restore((sections[i] as { el: HTMLElement }).el);
      sections[i] = { kind: "done" };
      if (sections.every((s) => s.kind === "done")) finish();
    }

    for (const s of sections) {
      if (s.kind !== "done") hide(s.el);
    }
    sizeCanvas();

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", finish);
    document.addEventListener("focusin", onFocusIn);

    wake();

    return () => {
      cleanup(false);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", finish);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[50] pointer-events-none"
    />
  );
}
