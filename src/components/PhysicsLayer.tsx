"use client";

import { useEffect, useRef, useState } from "react";
import { harvestGlyphs } from "@/lib/glyph-harvest";
import {
  applyImpulse,
  assignSmashTargets,
  beginHoming,
  createBody,
  dropAll,
  forceSettle,
  resetTargets,
  stepPhysics,
  DEFAULT_PHYSICS,
  type Body,
  type PhysicsEnv,
} from "@/lib/letter-physics";
import { onPhysics, emitPhysicsSync } from "@/lib/physics-bus";
import { CLICK_XP, award } from "@/lib/xp";

/**
 * The physics overlay. Two effects share one engine:
 *
 * - gravity: every letter on screen drops and stacks up at the bottom, and
 *   stays there until you switch it off.
 * - smash: a fist comes up under the page, the screen shakes, letters splash
 *   out and fall back into place - a few stay knocked over.
 *
 * Real text is hidden (visibility, so layout doesn't jump) while the sim runs
 * and every glyph is redrawn on a canvas, which is the only way this stays
 * smooth with ~1500 bodies.
 */

/** Fist animation is 620ms; it connects at 30%. */
const FIST_IMPACT_MS = 190;
const FIST_TOTAL_MS = 700;
/** How long letters fly free before they start heading home. */
const FREEFALL_MS = 430;
/** Grace period before a scroll or click puts the page back together. */
const INTERACT_DELAY_MS = 900;
/** Letters left lying sideways get tidied up after this. */
const AUTO_RESTORE_MS = 5200;
const SMASH_POWER = 1150;
/** Share of letters that stay knocked over after a slam. */
const DISPLACED_RATIO = 0.16;
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

type Mode = "off" | "gravity" | "smash" | "restoring";

export function PhysicsLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slam, setSlam] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    let interactive = false;
    let timers: number[] = [];
    let settleTimer = 0;
    let env: PhysicsEnv = { ...DEFAULT_PHYSICS, width: 0, floorY: 0 };
    // Viewport at harvest time, so real resizes can be told apart from a
    // scrollbar appearing when scroll gets locked.
    let baseW = 0;
    let baseH = 0;

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
        if (mode === "gravity") forceSettle(bodies);
      }, SETTLE_FAILSAFE_MS);
    }

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      return true;
    }

    function finishRestore() {
      clearTimeout(settleTimer);
      const el = contentEl();
      if (el) el.style.visibility = "";
      unlockScroll();
      detachInteract();
      clearTimers();
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
      detachInteract();
      // Scroll stays locked until the letters are home - scrolling mid-flight
      // would leave them springing to stale positions.
      resetTargets(bodies);
      beginHoming(bodies);
      mode = "restoring";
      ensureLoop();
      if (wasGravity) emitPhysicsSync(false);
    }

    /** No animation - for resize and unmount. */
    function hardRestore() {
      if (mode === "off") return;
      const wasGravity = mode === "gravity";
      cancelAnimationFrame(raf);
      raf = 0;
      finishRestore();
      if (wasGravity) emitPhysicsSync(false);
    }

    /* ── loop ── */

    function render() {
      const shakeAmp =
        shake > 0 ? SHAKE_AMPLITUDE * Math.pow(shake / SHAKE_SECONDS, 2) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp : 0;
      ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      ctx.clearRect(-20, -20, window.innerWidth + 40, window.innerHeight + 40);
      ctx.textBaseline = "alphabetic";

      for (const b of bodies) {
        ctx.save();
        ctx.translate(b.x, b.y);
        if (b.angle) ctx.rotate(b.angle);
        ctx.globalAlpha = b.alpha;
        if (b.img) {
          ctx.drawImage(b.img, -b.w / 2, -b.h / 2, b.w, b.h);
        } else {
          ctx.font = b.font;
          ctx.fillStyle = b.color;
          ctx.fillText(b.char, -b.w / 2, -b.h / 2 + b.ascent);
        }
        ctx.restore();
      }
    }

    function frame(t: number) {
      const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
      last = t;
      if (shake > 0) shake = Math.max(0, shake - dt);
      const moving = stepPhysics(bodies, dt, env);
      render();
      if (moving || shake > 0) {
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
      if (mode === "restoring") return;
      const inPile = mode === "gravity";
      if (mode === "off") {
        if (!harvest()) return;
        mode = "smash";
      }
      clearTimers();
      detachInteract();
      setSlam((n) => n + 1);
      later(() => setSlam(0), FIST_TOTAL_MS);

      later(() => {
        applyImpulse(
          bodies,
          window.innerWidth / 2,
          window.innerHeight - 8,
          SMASH_POWER
        );
        shake = SHAKE_SECONDS;
        ensureLoop();
        // In a pile the letters have nowhere to go back to - they just get hit.
        if (inPile) {
          armSettleFailsafe();
          return;
        }
        later(() => {
          assignSmashTargets(bodies, DISPLACED_RATIO);
          beginHoming(bodies);
        }, FREEFALL_MS);
        later(attachInteract, INTERACT_DELAY_MS);
        later(beginRestore, AUTO_RESTORE_MS);
      }, FIST_IMPACT_MS);

      award("smash:first", CLICK_XP);
    }

    /* ── input ── */

    function onPointerRestore(e: Event) {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-no-physics]")) return;
      beginRestore();
    }

    /** Bodies live in viewport coordinates, so a scroll has to end it now. */
    function onScrollRestore() {
      hardRestore();
    }

    function attachInteract() {
      if (interactive) return;
      interactive = true;
      window.addEventListener("scroll", onScrollRestore, { passive: true });
      window.addEventListener("pointerdown", onPointerRestore);
    }

    function detachInteract() {
      if (!interactive) return;
      interactive = false;
      window.removeEventListener("scroll", onScrollRestore);
      window.removeEventListener("pointerdown", onPointerRestore);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mode !== "off") beginRestore();
    }

    const offBus = onPhysics((cmd) => {
      if (cmd.type === "smash") smash();
      else if (cmd.on) startGravity();
      else if (mode === "gravity") beginRestore();
    });

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
      cancelAnimationFrame(raf);
      clearTimers();
      clearTimeout(settleTimer);
      detachInteract();
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
    </>
  );
}
