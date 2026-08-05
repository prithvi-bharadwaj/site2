"use client";

import { useEffect, useRef } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import type { GlyphSource } from "@/lib/letter-physics";
import {
  buildTypingSchedule,
  groupWords,
  buildScrambleSchedule,
  scrambleChar,
  SCRAMBLE,
} from "@/lib/intro-reveal";
import { trackInteraction } from "@/lib/analytics";

/**
 * First-visit reveal. The page mounts normally underneath; this canvas covers
 * the viewport with the plain page background and re-enacts the site coming
 * into being: the greeting types itself out, then everything else on screen -
 * bio and sections alike - rises from nothing as a churning field of ASCII
 * static, every character slot cycling random letters, digits and symbols in
 * place, and resolves word by word in reading order into the real page. The
 * bio resolves at reading pace; the wave then accelerates through the
 * sections. The canvas then fades, handing off pixel-for-pixel to the live
 * DOM underneath.
 *
 * Every glyph is harvested from the rendered DOM via Range rects, so the
 * copy sits exactly where the browser drew the original - same trick as the
 * letter-physics layer. Blur-hidden text (the locked contacts) is never
 * harvested: drawing it crisp on the canvas would leak it. Any input skips
 * straight to the finished page.
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

type Phase = "boot" | "type" | "settle" | "scramble" | "fade";

interface CaretBox {
  x: number;
  baseline: number;
  ascent: number;
  color: string;
}

interface IntroRevealProps {
  /** Fade begins: the page underneath starts its staggered reveal. */
  onHandoff: () => void;
  /** Fade finished (or skipped): unmount the overlay. */
  onDone: () => void;
}

export function IntroReveal({ onHandoff, onDone }: IntroRevealProps) {
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

    function finish(skipped: boolean) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      trackInteraction("intro_reveal_finished", { skipped });
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
    /** Everything that scrambles: bio first, then the sections below. */
    let field: GlyphSource[] = [];
    /** Static rise delay per glyph - the curtain comes down the page. */
    let curtain: number[] = [];
    let schedule: number[] = [];
    let typingDone = 0;
    let words: number[][] = [];
    let lockAt: number[] = [];
    let scrambleTotal = 0;
    let greetingCaret: CaretBox = { x: 0, baseline: 0, ascent: 0, color: "#000" };
    const widthCache = new Map<string, number>();

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

    /** The sections that scramble after the bio, in reading order. */
    const SECTION_IDS = ["previously", "built", "lore", "writing", "socials"];

    /** Blur-hidden text must never reach the canvas crisp. */
    function isBlurHidden(g: GlyphSource): boolean {
      return Boolean(g.el && getComputedStyle(g.el).filter.includes("blur"));
    }

    /**
     * Read the page's glyphs off the live DOM. The hero splits into greeting
     * and bio by font size - the greeting is the only thing set a step
     * larger; the sections below join the bio as the scramble field.
     */
    function harvest(): boolean {
      const root = document.querySelector<HTMLElement>('[role="banner"]');
      if (!root || !root.querySelector("[data-pretext-idx]")) return false;
      const opts = { height: window.innerHeight, measureAscent };
      const glyphs = harvestGlyphs(root, opts);
      if (glyphs.length < 2) return false;
      const sizes = glyphs.map((g) => fontPx(g.font));
      const max = Math.max(...sizes);
      const min = Math.min(...sizes);
      if (max - min < 1) return false;
      const mid = (max + min) / 2;
      greeting = [];
      const bio: GlyphSource[] = [];
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

      field = bio;
      for (const id of SECTION_IDS) {
        const section = document.getElementById(id);
        if (!section) continue;
        const harvested = harvestGlyphs(section, opts).filter((g) => !isBlurHidden(g));
        harvested.sort(byPos);
        field = field.concat(harvested);
      }

      const fieldTop = field.length ? Math.min(...field.map((g) => g.y)) : 0;
      curtain = field.map((g) => (g.y - fieldTop) * SCRAMBLE.curtainMsPerPx);
      words = groupWords(field);
      const bioWords = words.filter((w) => w[0] < bio.length).length;
      lockAt = buildScrambleSchedule(bioWords, words.length - bioWords);
      scrambleTotal = lockAt.length
        ? lockAt[lockAt.length - 1] + SCRAMBLE.tailMs
        : 0;

      bg = getComputedStyle(document.documentElement).backgroundColor;
      return true;
    }

    function enter(next: Phase, now: number) {
      phase = next;
      phaseStart = now;
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
      ctx!.globalAlpha = alpha;
      if (g.img) {
        ctx!.drawImage(g.img, g.x, g.y, g.w, g.h);
        return;
      }
      ctx!.font = g.font;
      ctx!.fillStyle = g.color;
      ctx!.fillText(g.char, g.x, g.y + g.ascent);
    }

    /** Static: a rolled character centered in the real glyph's slot. */
    function drawStatic(g: GlyphSource, ch: string, alpha: number) {
      ctx!.font = g.font;
      ctx!.fillStyle = g.color;
      ctx!.globalAlpha = alpha;
      const key = `${g.font}|${ch}`;
      let w = widthCache.get(key);
      if (w === undefined) {
        w = ctx!.measureText(ch).width;
        widthCache.set(key, w);
      }
      ctx!.fillText(ch, g.x + (g.w - w) / 2, g.y + g.ascent);
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

    function drawScramble(elapsed: number) {
      for (let w = 0; w < words.length; w++) {
        if (elapsed >= lockAt[w]) {
          for (const i of words[w]) drawGlyph(field[i], field[i].alpha);
          continue;
        }
        for (const i of words[w]) {
          const g = field[i];
          // The static curtains down the page rather than arriving as a wall.
          const rise = Math.min(1, Math.max(0, (elapsed - curtain[i]) / SCRAMBLE.fadeInMs));
          if (rise <= 0) continue;
          const alpha = g.alpha * SCRAMBLE.fieldAlpha * rise;
          if (g.img) {
            drawGlyph(g, alpha);
            continue;
          }
          // Slots roll out of phase with each other, so the field shimmers
          // instead of strobing in unison.
          const tick = Math.floor((elapsed + i * 37) / SCRAMBLE.churnMs);
          drawStatic(g, scrambleChar(i, tick), alpha);
        }
      }
    }

    function draw(now: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const t = now - phaseStart;
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
      } else if (phase === "scramble") {
        drawScramble(t);
        drawCaretAt(now, greetingCaret, Math.max(0, 1 - t / SCRAMBLE.caretFadeMs), true);
      } else if (phase === "fade") {
        // Faded with the canvas: the real page underneath is identical, and
        // full-alpha copies stacked on it would read darker mid-crossfade.
        for (const g of field) drawGlyph(g, g.alpha * fade);
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
          if (words.length > 0) enter("scramble", now);
          else beginFade(now);
        }
      } else if (phase === "scramble") {
        if (t >= scrambleTotal) beginFade(now);
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
      document.documentElement.style.overflow = "";
      canvas.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("resize", onResize);
    };
  }, []);

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
