"use client";

import { useEffect, useRef } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import type { GlyphSource } from "@/lib/letter-physics";
import {
  buildTypingSchedule,
  pickFallingGlyph,
  spawnBurst,
  stepBurst,
  settleBurst,
  type BurstParticle,
} from "@/lib/intro-reveal";
import { trackInteraction } from "@/lib/analytics";

/**
 * First-visit reveal. The page mounts normally underneath; this canvas covers
 * the viewport with the plain page background and re-enacts the site coming
 * into being: the greeting types itself out, the "i" in "Prithvi" duplicates
 * and drops, crashes near the bottom, and the wreckage flies up as the bio's
 * own letters, each homing to the exact spot the real text already occupies.
 * The canvas then fades, handing off pixel-for-pixel to the live DOM while
 * the rest of the page staggers in (see main[data-reveal="in"] in globals.css).
 *
 * Every glyph is harvested from the rendered hero via Range rects, so the
 * copy starts exactly where the browser drew the original - same trick as
 * the letter-physics layer. Any input skips straight to the finished page.
 */

/** Blank beat with just the caret before typing starts. */
const PRE_TYPE_MS = 550;
/** Hold on the finished greeting before the "i" moves. */
const POST_TYPE_MS = 480;
const CARET_BLINK_MS = 530;
/** The clone's little jump before it drops. */
const POP_MS = 150;
const POP_LIFT = 7;
const POP_SCALE = 1.18;
const FALL_GRAVITY = 2600;
/** Impact dressing: squash frame, shockwave rings, sparks, screen shake. */
const SQUASH_MS = 80;
const IMPACT_FX_MS = 500;
const SHAKE_MS = 380;
const SHAKE_AMPLITUDE = 9;
/** Failsafe for stragglers - matches letter-physics' "freeze the pile" idea. */
const BURST_CAP_MS = 3000;
const FADE_MS = 480;
/** If the hero hasn't laid out by now, something is off - show the site. */
const BOOT_TIMEOUT_MS = 4000;
/** Ignore resizes smaller than this - scrollbar and mobile-toolbar noise. */
const RESIZE_TOLERANCE = 48;
/** Echo of the cosmic wind palette in the impact flash. */
const IMPACT_ACCENT = "139 124 255";

type Phase = "boot" | "type" | "fall" | "burst" | "fade";

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
    let last = bootAt;
    let dpr = 1;
    let baseW = window.innerWidth;
    let baseH = window.innerHeight;
    let bg = "#ffffff";

    let greeting: GlyphSource[] = [];
    let bio: GlyphSource[] = [];
    let schedule: number[] = [];
    let typingDone = 0;
    let fallIdx = 0;
    let fallY = 0;
    let fallVy = 0;
    let impactX = 0;
    let floorY = 0;
    let particles: BurstParticle[] = [];
    let sparks: { angle: number; speed: number; len: number }[] = [];

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
      fallIdx = pickFallingGlyph(greeting.map((g) => g.char));
      const bioBottom = bio.length
        ? Math.max(...bio.map((g) => g.y + g.h))
        : greeting[greeting.length - 1].y + greeting[greeting.length - 1].h;
      // Crash well below the text but on screen, so the fountain has to climb.
      floorY = Math.max(
        bioBottom + 60,
        Math.min(window.innerHeight - 80, bioBottom + Math.max(220, window.innerHeight * 0.3))
      );
      bg = getComputedStyle(document.documentElement).backgroundColor;
      return true;
    }

    function enter(next: Phase, now: number) {
      phase = next;
      phaseStart = now;
    }

    function beginBurst(now: number) {
      const g = greeting[fallIdx];
      impactX = g.x + g.w / 2;
      sparks = Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.4,
        speed: 220 + Math.random() * 160,
        len: 8 + Math.random() * 7,
      }));
      particles = spawnBurst(bio, impactX, floorY - g.h / 2);
      enter("burst", now);
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

    function drawCaret(now: number, typeElapsed: number, fade: number) {
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
      const blinkOn = Math.floor(now / CARET_BLINK_MS) % 2 === 0;
      if (!active && !blinkOn) return;
      const baseline = g.y + g.ascent;
      ctx!.fillStyle = g.color;
      ctx!.globalAlpha = 0.85 * fade;
      ctx!.fillRect(x, baseline - g.ascent, 1.5, g.ascent * 1.15);
    }

    function drawFalling(now: number) {
      const g = greeting[fallIdx];
      const t = now - phaseStart;
      let y = fallY;
      let scaleX = 1;
      let scaleY = 1;
      let angle = 0;
      if (t < POP_MS) {
        const k = t / POP_MS;
        y = g.y - POP_LIFT * Math.sin(k * Math.PI);
        scaleX = scaleY = 1 + (POP_SCALE - 1) * Math.sin(k * Math.PI);
      } else {
        angle = Math.sin(t / 90) * 0.12;
      }
      ctx!.save();
      ctx!.translate(g.x + g.w / 2, y + g.h / 2);
      ctx!.rotate(angle);
      ctx!.scale(scaleX, scaleY);
      ctx!.font = g.font;
      ctx!.fillStyle = g.color;
      ctx!.globalAlpha = g.alpha;
      ctx!.fillText(g.char, -g.w / 2, -g.h / 2 + g.ascent);
      ctx!.restore();
    }

    function drawImpact(now: number) {
      const t = (now - phaseStart) / 1000;
      const g = greeting[fallIdx];
      // The clone, squashed flat for a couple of frames before it bursts.
      if (now - phaseStart < SQUASH_MS) {
        const k = (now - phaseStart) / SQUASH_MS;
        ctx!.save();
        ctx!.translate(impactX, floorY - g.h * 0.15);
        ctx!.scale(1.5, 0.3);
        ctx!.font = g.font;
        ctx!.fillStyle = g.color;
        ctx!.globalAlpha = (1 - k) * g.alpha;
        ctx!.fillText(g.char, -g.w / 2, -g.h / 2 + g.ascent);
        ctx!.restore();
      }
      if (now - phaseStart > IMPACT_FX_MS) return;
      const k = (now - phaseStart) / IMPACT_FX_MS;
      const fade = (1 - k) * (1 - k);
      // Two shockwave rings - ink, with a violet echo of the site's lighting.
      ctx!.lineWidth = 1.5;
      ctx!.globalAlpha = fade * 0.3;
      ctx!.strokeStyle = g.color;
      ctx!.beginPath();
      ctx!.arc(impactX, floorY, 10 + k * 420, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.globalAlpha = fade * 0.24;
      ctx!.strokeStyle = `rgb(${IMPACT_ACCENT})`;
      ctx!.beginPath();
      ctx!.arc(impactX, floorY, 6 + k * 320, 0, Math.PI * 2);
      ctx!.stroke();
      // Sparks skidding out of the crash.
      ctx!.lineWidth = 2;
      ctx!.strokeStyle = g.color;
      ctx!.globalAlpha = fade * 0.5;
      for (const s of sparks) {
        const r = 12 + k * s.speed;
        const len = s.len * (1 - k);
        ctx!.beginPath();
        ctx!.moveTo(impactX + Math.cos(s.angle) * r, floorY + Math.sin(s.angle) * r * 0.6);
        ctx!.lineTo(
          impactX + Math.cos(s.angle) * (r + len),
          floorY + Math.sin(s.angle) * (r + len) * 0.6
        );
        ctx!.stroke();
      }
    }

    function drawParticles(fadeMul = 1) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const g = bio[i];
        if (p.settled) {
          // Faded with the canvas: the real text underneath is identical, and
          // full-alpha copies stacked on it would read darker mid-crossfade.
          drawGlyph(g, g.alpha * fadeMul);
          continue;
        }
        ctx!.save();
        ctx!.translate(p.x + g.w / 2, p.y + g.h / 2);
        ctx!.rotate(p.angle);
        ctx!.font = g.font;
        ctx!.fillStyle = g.color;
        ctx!.globalAlpha = g.alpha;
        ctx!.fillText(g.char, -g.w / 2, -g.h / 2 + g.ascent);
        ctx!.restore();
      }
    }

    function draw(now: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade =
        phase === "fade"
          ? Math.max(0, 1 - (now - phaseStart) / FADE_MS)
          : 1;
      ctx!.globalAlpha = fade;
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, window.innerWidth, window.innerHeight);
      if (phase === "boot") return;

      // Crash shake - the whole scene takes the hit.
      if (phase === "burst") {
        const t = (now - phaseStart) / 1000;
        if (t < SHAKE_MS / 1000) {
          const amp = SHAKE_AMPLITUDE * Math.exp(-t * 9);
          ctx!.translate(Math.sin(t * 87) * amp, Math.cos(t * 61) * amp * 0.7);
        }
      }

      const typeElapsed =
        phase === "type" ? now - phaseStart - PRE_TYPE_MS : Infinity;
      for (let i = 0; i < greeting.length; i++) {
        if (schedule[i] > typeElapsed) break;
        drawGlyph(greeting[i], greeting[i].alpha * fade);
      }
      if (phase === "type") {
        drawCaret(now, typeElapsed, 1);
      } else if (phase === "fall") {
        // Caret bows out while the clone gets moving.
        const caretFade = Math.max(0, 1 - (now - phaseStart) / 300);
        if (caretFade > 0) drawCaret(now, Infinity, caretFade);
        drawFalling(now);
      } else if (phase === "burst") {
        drawImpact(now);
        drawParticles();
      } else if (phase === "fade") {
        drawParticles(fade);
      }
      ctx!.globalAlpha = 1;
    }

    /* ── the timeline ── */

    function frame(now: number) {
      if (finished) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      if (phase === "boot") {
        if (harvest()) {
          enter("type", now);
        } else if (now - bootAt > BOOT_TIMEOUT_MS) {
          finish(true);
          return;
        }
      } else if (phase === "type") {
        if (now - phaseStart - PRE_TYPE_MS > typingDone + POST_TYPE_MS) {
          enter("fall", now);
          fallY = greeting[fallIdx].y;
          fallVy = 0;
        }
      } else if (phase === "fall") {
        if (now - phaseStart >= POP_MS) {
          fallVy += FALL_GRAVITY * dt;
          fallY += fallVy * dt;
          if (fallY + greeting[fallIdx].h >= floorY) {
            if (bio.length > 0) beginBurst(now);
            else beginFade(now);
          }
        }
      } else if (phase === "burst") {
        const elapsed = now - phaseStart;
        const moving = stepBurst(particles, dt, elapsed);
        if (!moving || elapsed > BURST_CAP_MS) {
          settleBurst(particles);
          if (elapsed > IMPACT_FX_MS) beginFade(now);
        }
      } else if (phase === "fade") {
        if (now - phaseStart >= FADE_MS) {
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
