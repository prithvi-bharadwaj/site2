"use client";

import { useEffect, useRef } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import type { GlyphSource } from "@/lib/letter-physics";
import {
  buildTypingSchedule,
  groupLines,
  buildSweepSchedule,
  sweepProgress,
  developGhostAlpha,
  developFrontProgress,
  SWEEP,
  DEVELOP,
  type SweepLine,
} from "@/lib/intro-reveal";
import { trackInteraction } from "@/lib/analytics";

/**
 * First-visit reveal. The page mounts normally underneath; this canvas covers
 * the viewport with the plain page background and the greeting types itself
 * out. What happens next depends on the variant:
 *
 * - "a" (carriage return): the caret that typed the greeting drops to the bio
 *   and keeps writing - each wrapped line wipes in left-to-right behind the
 *   moving caret, every line a touch faster than the last, then the caret
 *   blinks once and fades while the canvas hands off pixel-for-pixel to the
 *   live DOM and the sections stagger in (main[data-reveal="in"]).
 *
 * - "b" (ink develop): the canvas goes transparent the moment typing settles,
 *   and the live page underneath - masked down to a barely-there ghost below
 *   the greeting's baseline - develops to full ink behind a soft front that
 *   sweeps down the viewport and decelerates. Nothing moves; only ink density
 *   changes, so the handoff is the reveal itself.
 *
 * Every glyph is harvested from the rendered hero via Range rects, so the
 * copy sits exactly where the browser drew the original - same trick as the
 * letter-physics layer. Any input skips straight to the finished page.
 */

/** Blank beat with just the caret before typing starts. */
const PRE_TYPE_MS = 550;
/** Held beat on the finished greeting - the pause after typing your name. */
const SETTLE_MS = 420;
const CARET_BLINK_MS = 530;
const FADE_MS = 480;
/** If the hero hasn't laid out by now, something is off - show the site. */
const BOOT_TIMEOUT_MS = 4000;
/** Ignore resizes smaller than this - scrollbar and mobile-toolbar noise. */
const RESIZE_TOLERANCE = 48;

export type IntroVariant = "a" | "b";

type Phase = "boot" | "type" | "settle" | "travel" | "sweep" | "develop" | "fade";

interface CaretBox {
  x: number;
  baseline: number;
  ascent: number;
  color: string;
}

interface BioLine {
  glyphs: GlyphSource[];
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface IntroRevealProps {
  variant: IntroVariant;
  /** The page underneath starts its own reveal (variant A's stagger). */
  onHandoff: () => void;
  /** All done (or skipped): unmount the overlay. */
  onDone: () => void;
}

export function IntroReveal({ variant, onHandoff, onDone }: IntroRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handoffRef = useRef(onHandoff);
  const doneRef = useRef(onDone);
  handoffRef.current = onHandoff;
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const bootAt = performance.now();

    let raf = 0;
    let finished = false;
    let handedOff = false;
    /** Variant B masks the live page; always undo it on the way out. */
    let maskEl: HTMLElement | null = null;

    function clearMask() {
      if (!maskEl) return;
      maskEl.style.maskImage = "";
      maskEl.style.webkitMaskImage = "";
      maskEl = null;
    }

    function finish(skipped: boolean) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      clearMask();
      trackInteraction("intro_reveal_finished", { skipped, variant });
      if (!handedOff) handoffRef.current();
      doneRef.current();
    }

    if (!canvas || !ctx) {
      finish(true);
      return;
    }

    let phase: Phase = "boot";
    let phaseStart = bootAt;
    let dpr = 1;
    let baseW = window.innerWidth;
    let baseH = window.innerHeight;
    let bg = "#ffffff";

    let greeting: GlyphSource[] = [];
    let bio: GlyphSource[] = [];
    let schedule: number[] = [];
    let typingDone = 0;
    let lines: BioLine[] = [];
    let sweeps: SweepLine[] = [];
    let sweepTotal = 0;
    /** Where the caret rests after the greeting, and after each hop. */
    let greetingCaret: CaretBox = { x: 0, baseline: 0, ascent: 0, color: "#000" };
    let bioCaret: CaretBox = { x: 0, baseline: 0, ascent: 0, color: "#000" };
    /** Variant B's mask geometry, in the masked element's local coords. */
    let frontStartY = 0;
    let frontEndY = 0;

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

    function fontPx(font: string): number {
      return parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "0");
    }

    /**
     * Read the hero's glyphs off the live DOM and split greeting from bio by
     * font size - the greeting is the only thing set a step larger.
     */
    function harvest(): boolean {
      const root = document.querySelector<HTMLElement>('[role="banner"]');
      if (!root || !root.querySelector("[data-pretext-idx]")) return false;
      const glyphs = harvestGlyphs(root, {
        height: window.innerHeight,
        measureAscent,
      });
      if (glyphs.length < 2) return false;
      const sizes = glyphs.map((g) => fontPx(g.font));
      const max = Math.max(...sizes);
      const min = Math.min(...sizes);
      if (max - min < 1) return false;
      const mid = (max + min) / 2;
      greeting = [];
      bio = [];
      glyphs.forEach((g, i) => (sizes[i] > mid ? greeting : bio).push(g));
      if (greeting.length === 0) return false;
      const byPos = (a: GlyphSource, b: GlyphSource) => a.y - b.y || a.x - b.x;
      greeting.sort(byPos);
      bio.sort(byPos);
      schedule = buildTypingSchedule(greeting.map((g) => g.char));
      typingDone = schedule[schedule.length - 1];

      const last = greeting[greeting.length - 1];
      greetingCaret = {
        x: last.x + last.w + 2,
        baseline: last.y + last.ascent,
        ascent: last.ascent,
        color: last.color,
      };

      lines = groupLines(bio).map((idxs) => {
        const gs = idxs.map((i) => bio[i]);
        return {
          glyphs: gs,
          left: Math.min(...gs.map((g) => g.x)),
          right: Math.max(...gs.map((g) => g.x + g.w)),
          top: Math.min(...gs.map((g) => g.y)),
          bottom: Math.max(...gs.map((g) => g.y + g.h)),
        };
      });
      sweeps = buildSweepSchedule(lines.map((l) => l.right - l.left));
      sweepTotal = sweeps.length
        ? sweeps[sweeps.length - 1].startMs + sweeps[sweeps.length - 1].durationMs
        : 0;
      if (lines.length > 0) {
        const first = lines[0].glyphs[0];
        bioCaret = {
          x: first.x - 2,
          baseline: first.y + first.ascent,
          ascent: first.ascent,
          color: first.color,
        };
      }

      bg = getComputedStyle(document.documentElement).backgroundColor;
      return true;
    }

    function enter(next: Phase, now: number) {
      phase = next;
      phaseStart = now;
    }

    /* ── variant B: the mask over the live page ── */

    function beginDevelop(now: number) {
      maskEl = document.querySelector<HTMLElement>("[data-physics-content]");
      if (!maskEl) {
        // Nothing to mask - just show the page.
        finish(true);
        return;
      }
      const rect = maskEl.getBoundingClientRect();
      const greetingBottom = Math.max(...greeting.map((g) => g.y + g.h));
      frontStartY = greetingBottom + 6 - rect.top;
      frontEndY = window.innerHeight - rect.top;
      applyMask(0);
      // The page underneath is now the show; the canvas keeps only the caret.
      canvas!.style.background = "transparent";
      handedOff = true;
      handoffRef.current();
      enter("develop", now);
    }

    function applyMask(elapsed: number) {
      if (!maskEl) return;
      const ghost = developGhostAlpha(elapsed);
      const p = developFrontProgress(elapsed);
      const frontY = frontStartY + p * (frontEndY + DEVELOP.featherPx - frontStartY);
      const gradient = `linear-gradient(to bottom, rgb(0 0 0) ${frontY}px, rgb(0 0 0 / ${ghost}) ${frontY + DEVELOP.featherPx}px)`;
      maskEl.style.maskImage = gradient;
      maskEl.style.webkitMaskImage = gradient;
    }

    function beginFade(now: number) {
      enter("fade", now);
      // The CSS background hands opacity control to the drawn one.
      canvas!.style.background = "transparent";
      handedOff = true;
      handoffRef.current();
    }

    /* ── drawing ── */

    function drawGlyph(g: GlyphSource, alpha: number) {
      ctx!.font = g.font;
      ctx!.fillStyle = g.color;
      ctx!.globalAlpha = alpha;
      ctx!.fillText(g.char, g.x, g.y + g.ascent);
    }

    function drawCaretAt(now: number, c: CaretBox, alpha: number, blink: boolean) {
      if (alpha <= 0) return;
      if (blink && Math.floor(now / CARET_BLINK_MS) % 2 !== 0) return;
      ctx!.fillStyle = c.color;
      ctx!.globalAlpha = 0.85 * alpha;
      ctx!.fillRect(c.x, c.baseline - c.ascent, 1.5, c.ascent * 1.15);
    }

    /** The typing caret: rides the last typed glyph, solid while writing. */
    function drawTypingCaret(now: number, typeElapsed: number) {
      let g = greeting[0];
      let x = g.x - 2;
      let lastCharAt = -Infinity;
      for (let i = schedule.length - 1; i >= 0; i--) {
        if (schedule[i] <= typeElapsed) {
          g = greeting[i];
          x = g.x + g.w + 2;
          lastCharAt = schedule[i];
          break;
        }
      }
      const active = typeElapsed - lastCharAt < 350;
      drawCaretAt(
        now,
        { x, baseline: g.y + g.ascent, ascent: g.ascent, color: g.color },
        1,
        !active
      );
    }

    /** Lines fully behind the sweep, plus the wipe on the current line. */
    function drawSweptBio(elapsed: number, fadeMul: number) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const s = sweeps[i];
        if (elapsed >= s.startMs + s.durationMs) {
          for (const g of line.glyphs) drawGlyph(g, g.alpha * fadeMul);
          continue;
        }
        if (elapsed < s.startMs) break;
        const p = sweepProgress(elapsed, s);
        const edgeX = line.left + p * (line.right - line.left);
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(line.left - 2, line.top - 2, edgeX - (line.left - 2), line.bottom - line.top + 4);
        ctx!.clip();
        for (const g of line.glyphs) {
          if (g.x > edgeX) break;
          drawGlyph(g, g.alpha * fadeMul);
        }
        ctx!.restore();
        // Soft ink edge: background bleeds back over the last ~1ch.
        const feather = ctx!.createLinearGradient(edgeX - SWEEP.featherPx, 0, edgeX, 0);
        feather.addColorStop(0, "transparent");
        feather.addColorStop(1, bg);
        ctx!.globalAlpha = fadeMul;
        ctx!.fillStyle = feather;
        ctx!.fillRect(edgeX - SWEEP.featherPx, line.top - 2, SWEEP.featherPx, line.bottom - line.top + 4);
        break;
      }
    }

    /** Where the sweep's writing edge is, for the caret to ride. */
    function sweepCaret(elapsed: number): CaretBox {
      for (let i = 0; i < lines.length; i++) {
        const s = sweeps[i];
        const line = lines[i];
        const g = line.glyphs[0];
        if (elapsed < s.startMs + s.durationMs || i === lines.length - 1) {
          const p = sweepProgress(elapsed, s);
          return {
            x: Math.min(line.left + p * (line.right - line.left), line.right) + 2,
            baseline: g.y + g.ascent,
            ascent: g.ascent,
            color: g.color,
          };
        }
      }
      return bioCaret;
    }

    function draw(now: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const t = now - phaseStart;

      if (phase === "develop") {
        // The live page is the picture; only the caret remains, fading out.
        const alpha = Math.max(0, 1 - t / DEVELOP.caretFadeMs);
        drawCaretAt(now, greetingCaret, alpha, true);
        ctx!.globalAlpha = 1;
        return;
      }

      const fade = phase === "fade" ? Math.max(0, 1 - t / FADE_MS) : 1;
      ctx!.globalAlpha = fade;
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, window.innerWidth, window.innerHeight);
      if (phase === "boot") return;

      const typeElapsed = phase === "type" ? t - PRE_TYPE_MS : Infinity;
      for (let i = 0; i < greeting.length; i++) {
        if (schedule[i] > typeElapsed) break;
        drawGlyph(greeting[i], greeting[i].alpha * fade);
      }

      if (phase === "type") {
        drawTypingCaret(now, typeElapsed);
      } else if (phase === "settle") {
        drawCaretAt(now, greetingCaret, 1, true);
      } else if (phase === "travel") {
        // Near-straight hop; the caret keeps its size and snaps on landing.
        const k = Math.min(1, t / SWEEP.travelMs);
        const e = 0.5 - Math.cos(k * Math.PI) / 2;
        drawCaretAt(now, {
          x: greetingCaret.x + (bioCaret.x - greetingCaret.x) * e,
          baseline: greetingCaret.baseline + (bioCaret.baseline - greetingCaret.baseline) * e,
          ascent: greetingCaret.ascent,
          color: greetingCaret.color,
        }, 1, false);
      } else if (phase === "sweep") {
        drawSweptBio(t, 1);
        drawCaretAt(now, sweepCaret(t), 1, false);
      } else if (phase === "fade") {
        // Faded with the canvas: the real text underneath is identical, and
        // full-alpha copies stacked on it would read darker mid-crossfade.
        drawSweptBio(Infinity, fade);
        const caretAlpha = Math.max(0, 1 - t / SWEEP.caretExitMs);
        drawCaretAt(now, sweepCaret(Infinity), caretAlpha * fade, true);
      }
      ctx!.globalAlpha = 1;
    }

    /* ── the timeline ── */

    function frame(now: number) {
      if (finished) return;
      const t = now - phaseStart;

      if (phase === "boot") {
        if (harvest()) {
          enter("type", now);
        } else if (now - bootAt > BOOT_TIMEOUT_MS) {
          finish(true);
          return;
        }
      } else if (phase === "type") {
        if (t - PRE_TYPE_MS > typingDone) enter("settle", now);
      } else if (phase === "settle") {
        if (t >= SETTLE_MS) {
          if (variant === "b") beginDevelop(now);
          else if (lines.length > 0) enter("travel", now);
          else beginFade(now);
        }
      } else if (phase === "travel") {
        if (t >= SWEEP.travelMs) enter("sweep", now);
      } else if (phase === "sweep") {
        if (t >= sweepTotal) beginFade(now);
      } else if (phase === "develop") {
        applyMask(t);
        if (t >= DEVELOP.frontDelayMs + DEVELOP.frontMs) {
          clearMask();
          finish(false);
          return;
        }
      } else if (phase === "fade") {
        if (t >= FADE_MS) {
          finish(false);
          return;
        }
      }

      draw(now);
      raf = requestAnimationFrame(frame);
    }

    /* ── setup ── */

    // A restored scroll position means a returning visit mid-page - the show
    // only makes sense from the top.
    if (window.scrollY > 4) {
      finish(true);
      return;
    }

    sizeCanvas();
    document.documentElement.style.overflow = "hidden";

    const skip = () => finish(true);
    const onResize = () => {
      if (
        Math.abs(window.innerWidth - baseW) > RESIZE_TOLERANCE ||
        Math.abs(window.innerHeight - baseH) > RESIZE_TOLERANCE
      ) {
        finish(true);
      } else {
        sizeCanvas();
      }
    };
    canvas.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("resize", onResize);

    raf = requestAnimationFrame(frame);

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      clearMask();
      document.documentElement.style.overflow = "";
      canvas.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("resize", onResize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[200]"
      // Opaque from the very first paint, before any rAF has drawn.
      style={{ background: "var(--bg)" }}
    />
  );
}
