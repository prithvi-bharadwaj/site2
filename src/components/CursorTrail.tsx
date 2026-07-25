"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor trail - a smooth tapering ink line following the mouse, plus tiny
 * particles that spray off while moving.
 *
 * Smoothness comes from two layers: the emitter eases toward the cursor
 * (deliberate lag = low-pass filter, kills jitter), and the line is drawn
 * as quadratic Beziers through segment midpoints, so there are no corners.
 * Ink color follows the theme (--ink-rgb), re-read whenever the trail
 * restarts. Full-viewport canvas, pointer-events none. Skipped on touch
 * devices and when reduced motion is preferred.
 */

const LIFE_MS = 500;
const MAX_ALPHA = 0.18;
const HEAD_WIDTH = 2.5;
const TAIL_SCALE = 0.2;
const SMOOTHING = 0.2;

// Square particles sprayed from the cursor while moving.
const P_LIFE_MS = 650;
const P_MAX_ALPHA = 0.22;
const P_SIZE = 2.6;
const P_SPEED = 1.1;
const P_SPACING = 9;
const P_PER_SPAWN = 2;
const P_MAX = 90;

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  /** Square side length (px). */
  s: number;
  rot: number;
  spin: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return; // jsdom
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    function resize() {
      // Cap at 2x: on 3x displays the trail is imperceptibly different but the
      // canvas would be 2.25x the pixels to clear and rasterize every frame.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
    }
    resize();
    window.addEventListener("resize", resize);

    let ink = "19, 19, 22";
    function readInk() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--ink-rgb").trim();
      if (raw) ink = raw.split(/\s+/).join(", ");
    }
    readInk();
    // Re-read when the theme class flips, so the trail stays visible in dark mode.
    const themeObserver = new MutationObserver(readInk);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const points: TrailPoint[] = [];
    const particles: Particle[] = [];
    const emitter = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const lastSpawn = { x: 0, y: 0 };
    let initialized = false;
    let raf = 0;
    let running = false;

    function draw(now: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Ease the emitter toward the cursor - the lag is what makes it smooth.
      emitter.x += (target.x - emitter.x) * SMOOTHING;
      emitter.y += (target.y - emitter.y) * SMOOTHING;

      // Sample the emitter every frame while it's moving.
      const last = points[points.length - 1];
      if (!last || Math.hypot(emitter.x - last.x, emitter.y - last.y) > 0.3) {
        points.push({ x: emitter.x, y: emitter.y, t: now });
      }

      // Spray particles while covering ground.
      if (Math.hypot(emitter.x - lastSpawn.x, emitter.y - lastSpawn.y) >= P_SPACING) {
        lastSpawn.x = emitter.x;
        lastSpawn.y = emitter.y;
        for (let i = 0; i < P_PER_SPAWN; i++) {
          if (particles.length >= P_MAX) break;
          const angle = Math.random() * Math.PI * 2;
          const speed = P_SPEED * (0.35 + Math.random() * 0.65);
          particles.push({
            x: emitter.x,
            y: emitter.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            t: now,
            s: P_SIZE * (0.6 + Math.random() * 0.8),
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.06,
          });
        }
      }

      while (points.length && now - points[0].t > LIFE_MS) points.shift();

      // Tapering line: quadratic Beziers through midpoints, one segment per
      // point so width and alpha can fade along the tail. Round caps hide
      // the joints between segments.
      if (points.length > 2) {
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        for (let i = 1; i < points.length - 1; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const p2 = points[i + 1];
          const age = Math.min(1, (now - p1.t) / LIFE_MS);
          const fade = (1 - age) * (1 - age);
          ctx!.strokeStyle = `rgba(${ink}, ${MAX_ALPHA * fade})`;
          ctx!.lineWidth = Math.max(0.3, HEAD_WIDTH * (1 - age * (1 - TAIL_SCALE))) * dpr;
          ctx!.beginPath();
          ctx!.moveTo(((p0.x + p1.x) / 2) * dpr, ((p0.y + p1.y) / 2) * dpr);
          ctx!.quadraticCurveTo(p1.x * dpr, p1.y * dpr, ((p1.x + p2.x) / 2) * dpr, ((p1.y + p2.y) / 2) * dpr);
          ctx!.stroke();
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = (now - p.t) / P_LIFE_MS;
        if (age >= 1) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.rot += p.spin;
        const fade = (1 - age) * (1 - age);
        const side = p.s * dpr;
        ctx!.save();
        ctx!.translate(p.x * dpr, p.y * dpr);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = `rgba(${ink}, ${P_MAX_ALPHA * fade})`;
        ctx!.fillRect(-side / 2, -side / 2, side, side);
        ctx!.restore();
      }

      const settled = Math.hypot(target.x - emitter.x, target.y - emitter.y) < 0.5;
      if (points.length || particles.length || !settled) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
      }
    }

    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!initialized) {
        initialized = true;
        emitter.x = e.clientX;
        emitter.y = e.clientY;
        lastSpawn.x = e.clientX;
        lastSpawn.y = e.clientY;
      }
      if (!running) {
        running = true;
        readInk();
        raf = requestAnimationFrame(draw);
      }
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="cursor-trail" aria-hidden="true" />;
}
