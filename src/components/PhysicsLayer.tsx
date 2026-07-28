"use client";

import { useEffect, useRef, useState } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import {
  createBody,
  stepPhysics,
  DEFAULT_PHYSICS,
  type Body,
  type PhysicsEnv,
} from "@/lib/letter-physics";
import {
  applyImpulse,
  beginHoming,
  brushAt,
  dropAll,
  forceSettle,
  markReturning,
  pokeAt,
  resetTargets,
} from "@/lib/letter-effects";
import { SpriteCache } from "@/lib/glyph-sprites";
import { onPhysics, emitPhysicsSync } from "@/lib/physics-bus";
import { CLICK_XP, award } from "@/lib/xp";

/**
 * The physics overlay. Two effects share one engine:
 *
 * - gravity: every letter on screen drops and stacks up at the bottom, and
 *   stays there until you put it back.
 * - smash: a fist comes up under the page, the screen shakes, letters jump and
 *   then fall back onto the lines they came from - a few stay leaning.
 *
 * While either is running the letters are alive: the cursor shoves them around
 * (and nudges knocked-over ones back upright), taps land as local jolts, and a
 * button in the middle of the screen puts everything back.
 *
 * Real text is hidden (visibility, so layout doesn't jump) and every glyph is
 * redrawn on a canvas, which is the only way this stays smooth with ~1500
 * bodies.
 */

/** Fist animation is 620ms; it connects at 24%. */
const FIST_IMPACT_MS = 150;
const FIST_TOTAL_MS = 700;
/** The slam is a jolt, not an explosion. */
const SMASH_POWER = 640;
const SMASH_FALLOFF = 420;
/** Share of letters that keep their tilt after a slam. */
const KEEP_TILT_RATIO = 0.14;
/** Taps are the same idea, closer in. */
const POKE_POWER = 520;
const POKE_RADIUS = 150;
/** Cursor brushing. */
const BRUSH_RADIUS = 78;
const BRUSH_STRENGTH = 2600;
/** The way out shows up once the letters have had their moment. */
const RESTORE_BUTTON_MS = 700;
/**
 * A page's worth of letters packs tight enough that a few end up wedged and
 * never quite qualify for sleep. Once the pile has visibly stopped, freeze it
 * so the animation loop can end instead of grinding at 60fps forever.
 */
const SETTLE_FAILSAFE_MS = 5500;
const SHAKE_SECONDS = 0.42;
const SHAKE_AMPLITUDE = 10;
/** Ignore resizes smaller than this - scrollbar and mobile-toolbar noise. */
const RESIZE_TOLERANCE = 48;
/** Page colors transition 250ms on a theme flip; track slightly past it. */
const THEME_FADE_MS = 320;
/**
 * Room around a glyph sprite for ink that overhangs its layout box - italic
 * tails, antialiasing fringe.
 */
const SPRITE_PAD = 4;
/** A theme flip mints a new sprite per color; don't hoard the old ones. */
const SPRITE_CACHE_MAX = 4000;

type Mode = "off" | "gravity" | "smash" | "restoring";

export function PhysicsLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slam, setSlam] = useState(0);
  const [showRestore, setShowRestore] = useState(false);
  const restoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Checked per command, not once: the preference can change mid-session and
    // the bus subscription below has to exist either way, or the panel's
    // gravity switch ends up talking to nobody.
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canvasNode = canvasRef.current;
    const context = canvasNode?.getContext("2d");
    if (!canvasNode || !context) return;
    // Re-bind so the narrowed types survive into the closures below.
    const canvas = canvasNode;
    const ctx = context;

    let bodies: Body[] = [];
    let mode: Mode = "off";
    let raf = 0;
    let last = 0;
    let dpr = 1;
    let shake = 0;
    let scrollLocked = false;
    let live = false;
    let timers: number[] = [];
    let settleTimer = 0;
    let env: PhysicsEnv = { ...DEFAULT_PHYSICS, width: 0, floorY: 0 };
    // Viewport at harvest time, so real resizes can be told apart from a
    // scrollbar appearing when scroll gets locked.
    let baseW = 0;
    let baseH = 0;
    const pointer = { x: 0, y: 0, inside: false };
    const sprites = new SpriteCache({ pad: SPRITE_PAD, max: SPRITE_CACHE_MAX });

    /* ── plumbing ── */

    const contentEl = () =>
      document.querySelector<HTMLElement>("[data-physics-content]");

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function later(fn: () => void, ms: number) {
      timers.push(window.setTimeout(fn, ms));
    }

    /** Kept out of `timers` so a mid-pile slam can't drop the failsafe. */
    function armSettleFailsafe() {
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (mode === "gravity" || mode === "smash") forceSettle(bodies);
      }, SETTLE_FAILSAFE_MS);
    }

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      sprites.setDpr(dpr);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      // 100vw would include the scrollbar we're about to hide.
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    }

    function measureAscent(font: string): number {
      ctx.save();
      ctx.font = font;
      const m = ctx.measureText("Hxg");
      ctx.restore();
      return m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent ?? 0;
    }

    function lockScroll() {
      if (scrollLocked) return;
      document.documentElement.style.overflow = "hidden";
      scrollLocked = true;
    }

    function unlockScroll() {
      if (!scrollLocked) return;
      document.documentElement.style.overflow = "";
      scrollLocked = false;
    }

    /* ── setup / teardown of a run ── */

    function harvest(): boolean {
      const el = contentEl();
      if (!el) return false;
      sizeCanvas();
      const glyphs = harvestGlyphs(el, {
        height: window.innerHeight,
        measureAscent,
      });
      if (glyphs.length === 0) return false;
      bodies = glyphs.map(createBody);
      baseW = window.innerWidth;
      baseH = window.innerHeight;
      env = {
        ...DEFAULT_PHYSICS,
        width: window.innerWidth,
        floorY: window.innerHeight - 4,
      };
      el.style.visibility = "hidden";
      // Draw the copy in the same frame the real text goes away, or the page
      // blinks empty until the first animation frame lands.
      render();
      attachLive();
      later(() => setShowRestore(true), RESTORE_BUTTON_MS);
      return true;
    }

    function finishRestore() {
      clearTimeout(settleTimer);
      const el = contentEl();
      if (el) el.style.visibility = "";
      unlockScroll();
      detachLive();
      clearTimers();
      setShowRestore(false);
      bodies = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      mode = "off";
    }

    /** Spring everything back where it came from, then hand the DOM back. */
    function beginRestore() {
      if (mode === "off" || mode === "restoring") return;
      const wasGravity = mode === "gravity";
      clearTimers();
      detachLive();
      setShowRestore(false);
      // Scroll stays locked until the letters are home - scrolling mid-flight
      // would leave them springing to stale positions.
      resetTargets(bodies);
      beginHoming(bodies);
      mode = "restoring";
      ensureLoop();
      if (wasGravity) emitPhysicsSync(false);
    }

    /** No animation - for resize, scroll and unmount. */
    function hardRestore() {
      if (mode === "off") return;
      const wasGravity = mode === "gravity";
      cancelAnimationFrame(raf);
      raf = 0;
      finishRestore();
      if (wasGravity) emitPhysicsSync(false);
    }

    restoreRef.current = beginRestore;

    /* ── loop ── */

    function render() {
      const shakeAmp =
        shake > 0 ? SHAKE_AMPLITUDE * Math.pow(shake / SHAKE_SECONDS, 2) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;
      const tx = ox * dpr;
      const ty = oy * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, tx, ty);
      ctx.clearRect(-20, -20, window.innerWidth + 40, window.innerHeight + 40);
      ctx.textBaseline = "alphabetic";

      // Glyphs draw as cached sprites - shaping and filling text ~1500 times
      // a frame is what used to eat the frame budget.
      let alpha = 1;
      ctx.globalAlpha = 1;

      for (const b of bodies) {
        if (b.img) {
          ctx.save();
          ctx.globalAlpha = b.alpha;
          ctx.translate(b.x, b.y);
          if (b.angle !== 0) ctx.rotate(b.angle);
          ctx.drawImage(b.img, -b.w / 2, -b.h / 2, b.w, b.h);
          ctx.restore();
          continue;
        }
        if (b.alpha !== alpha) {
          alpha = b.alpha;
          ctx.globalAlpha = alpha;
        }
        const s = sprites.get(b);
        if (!s) {
          // No 2d context for the sprite - draw the slow way.
          ctx.font = b.font;
          ctx.fillStyle = b.color;
          ctx.fillText(b.char, b.x - b.w / 2, b.y - b.h / 2 + b.ascent);
          continue;
        }
        if (b.angle === 0) {
          ctx.drawImage(s.canvas, b.x - b.w / 2 - s.pad, b.y - b.h / 2 - s.pad, s.w, s.h);
        } else {
          // One setTransform beats save/translate/rotate/restore, and mid-fall
          // nearly every body is rotated.
          const cos = Math.cos(b.angle) * dpr;
          const sin = Math.sin(b.angle) * dpr;
          ctx.setTransform(cos, sin, -sin, cos, b.x * dpr + tx, b.y * dpr + ty);
          ctx.drawImage(s.canvas, -b.w / 2 - s.pad, -b.h / 2 - s.pad, s.w, s.h);
          ctx.setTransform(dpr, 0, 0, dpr, tx, ty);
        }
      }
    }

    function frame(t: number) {
      const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
      last = t;
      if (shake > 0) shake = Math.max(0, shake - dt);

      let brushing = false;
      if (pointer.inside && mode !== "restoring") {
        brushing = brushAt(
          bodies,
          pointer.x,
          pointer.y,
          BRUSH_RADIUS,
          BRUSH_STRENGTH,
          dt,
          mode === "smash"
        );
      }

      const moving = stepPhysics(bodies, dt, env);
      render();
      if (moving || brushing || shake > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
        if (mode === "restoring") finishRestore();
      }
    }

    function ensureLoop() {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    /* ── effects ── */

    function startGravity() {
      if (motionQuery.matches) {
        // Snap the panel switch back off - the command has no effect here.
        emitPhysicsSync(false);
        return;
      }
      if (mode === "gravity") return;
      if (mode !== "off") hardRestore();
      if (!harvest()) {
        emitPhysicsSync(false);
        return;
      }
      mode = "gravity";
      lockScroll();
      dropAll(bodies, env);
      armSettleFailsafe();
      ensureLoop();
      award("gravity:on", CLICK_XP);
    }

    function smash() {
      if (motionQuery.matches) return;
      if (mode === "restoring") return;
      const inPile = mode === "gravity";
      if (mode === "off") {
        if (!harvest()) return;
        mode = "smash";
      }
      clearTimers();
      setSlam((n) => n + 1);
      later(() => setSlam(0), FIST_TOTAL_MS);
      later(() => setShowRestore(true), RESTORE_BUTTON_MS);

      later(() => {
        // In a pile the letters have no line to go back to - they just get hit.
        if (!inPile) markReturning(bodies, KEEP_TILT_RATIO);
        applyImpulse(
          bodies,
          window.innerWidth / 2,
          window.innerHeight - 8,
          SMASH_POWER,
          SMASH_FALLOFF
        );
        shake = SHAKE_SECONDS;
        armSettleFailsafe();
        ensureLoop();
      }, FIST_IMPACT_MS);

      award("smash:first", CLICK_XP);
    }

    /* ── input while the letters are alive ── */

    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      ensureLoop();
    }

    function onPointerOut(e: PointerEvent) {
      if (e.relatedTarget === null) pointer.inside = false;
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-no-physics]")) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      pokeAt(
        bodies,
        e.clientX,
        e.clientY,
        POKE_POWER,
        POKE_RADIUS,
        mode === "smash",
        KEEP_TILT_RATIO
      );
      armSettleFailsafe();
      ensureLoop();
    }

    /** Bodies live in viewport coordinates, so a scroll has to end it now. */
    function onScroll() {
      hardRestore();
    }

    function attachLive() {
      if (live) return;
      live = true;
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut, { passive: true });
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    function detachLive() {
      if (!live) return;
      live = false;
      pointer.inside = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mode !== "off") beginRestore();
    }

    const offBus = onPhysics((cmd) => {
      if (cmd.type === "smash") smash();
      else if (cmd.on) startGravity();
      else if (mode === "gravity" || mode === "smash") beginRestore();
    });

    // Bodies capture resolved RGB at harvest, so a theme flip would strand
    // dark letters on a dark background. Re-resolve from the source elements,
    // tracking the page's color transition frame by frame.
    let recolorRaf = 0;
    function recolorBodies() {
      const colors = new Map<Element, string>();
      for (const b of bodies) {
        if (!b.el) continue;
        let c = colors.get(b.el);
        if (c === undefined) {
          c = getComputedStyle(b.el).color;
          colors.set(b.el, c);
        }
        b.color = c;
      }
    }

    const themeObserver = new MutationObserver(() => {
      if (mode === "off") return;
      cancelAnimationFrame(recolorRaf);
      const start = performance.now();
      const track = (t: number) => {
        recolorBodies();
        // The main loop repaints on its own when running; a settled pile
        // doesn't, so paint here.
        if (!raf) render();
        recolorRaf = t - start < THEME_FADE_MS ? requestAnimationFrame(track) : 0;
      };
      recolorRaf = requestAnimationFrame(track);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    function onMotionChange() {
      // Turning reduced motion on mid-run ends the run; commands already
      // no-op while it holds.
      if (motionQuery.matches) hardRestore();
    }
    motionQuery.addEventListener("change", onMotionChange);

    function onResize() {
      if (mode === "off") {
        sizeCanvas();
        return;
      }
      const moved =
        Math.abs(window.innerWidth - baseW) > RESIZE_TOLERANCE ||
        Math.abs(window.innerHeight - baseH) > RESIZE_TOLERANCE;
      if (moved) hardRestore();
    }

    sizeCanvas();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      offBus();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onMotionChange);
      themeObserver.disconnect();
      sprites.clear();
      cancelAnimationFrame(recolorRaf);
      cancelAnimationFrame(raf);
      clearTimers();
      clearTimeout(settleTimer);
      detachLive();
      const el = contentEl();
      if (el) el.style.visibility = "";
      unlockScroll();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="physics-canvas"
        data-no-physics
        aria-hidden="true"
      />
      {slam > 0 && (
        <div key={slam} className="physics-fist" data-no-physics aria-hidden="true">
          ✊
        </div>
      )}
      {showRestore && (
        <button
          onClick={() => restoreRef.current()}
          className="physics-restore"
          data-no-physics
        >
          put it back
          <kbd className="panel-key">esc</kbd>
        </button>
      )}
    </>
  );
}
