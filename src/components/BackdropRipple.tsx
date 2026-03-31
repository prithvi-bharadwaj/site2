"use client";

import { useRef, useEffect } from "react";

const COLS = 52;
const ROWS = 52;
const INFLUENCE_R = 180;
const MAX_DISP = 14;
const SPRING = 0.06;
const DAMP = 0.85;

const LIGHT_R = 300;
const DOT_R = 1;
const DOT_PEAK = 0.24;       // <-- max dot opacity at cursor center
const DOT_BASE = 0.04;      // <-- ambient dot opacity (visible without cursor)
const DOT_DRIFT = 0.4;       // sway amplitude

const N_PARTICLES = 50;
const P_OPACITY = 0.04;

const EMIT_RATE = 0.1;        // ~1 particle per 10 frames
const EMIT_OPACITY = 0.05;

interface Pt { rx: number; ry: number; x: number; y: number; vx: number; vy: number; phase: number }
interface Part { x: number; y: number; vx: number; vy: number; s: number; life: number; max: number; emit?: boolean }

export function BackdropRipple() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext("2d")!;
    let raf = 0, w = 0, h = 0, dpr = 1;
    const m = { x: -9999, y: -9999, px: -9999, py: -9999, on: false };
    let grid: Pt[] = [];
    const parts: Part[] = [];
    let tick = 0;
    let emitAccum = 0;

    function build() {
      grid = [];
      const cw = w / COLS, ch = h / ROWS;
      for (let r = 0; r <= ROWS; r++)
        for (let c = 0; c <= COLS; c++)
          grid.push({ rx: c * cw, ry: r * ch, x: c * cw, y: r * ch, vx: 0, vy: 0, phase: Math.random() * 6.28 });
    }

    function spawn(): Part {
      return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: -Math.random() * 0.15 - 0.05, s: Math.random() * 1.2 + 0.4, life: 0, max: 200 + Math.random() * 400 };
    }

    function initParts() { parts.length = 0; for (let i = 0; i < N_PARTICLES; i++) parts.push(spawn()); }

    function resize() {
      dpr = devicePixelRatio || 1;
      w = innerWidth; h = innerHeight;
      cvs.width = w * dpr; cvs.height = h * dpr;
      cvs.style.width = w + "px"; cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build(); initParts();
    }

    function physics() {
      const t = tick * 0.008;
      for (const p of grid) {
        // Gentle ambient sway using each dot's unique phase
        const driftX = Math.sin(t + p.phase) * DOT_DRIFT;
        const driftY = Math.cos(t * 0.7 + p.phase * 1.3) * DOT_DRIFT;

        if (m.on) {
          const dx = p.rx - m.x, dy = p.ry - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < INFLUENCE_R && d > 0) {
            const f = (1 - d / INFLUENCE_R) ** 2 * MAX_DISP;
            p.vx += (p.rx + driftX + dx / d * f - p.x) * 0.15;
            p.vy += (p.ry + driftY + dy / d * f - p.y) * 0.15;
          } else {
            p.vx += (p.rx + driftX - p.x) * SPRING;
            p.vy += (p.ry + driftY - p.y) * SPRING;
          }
        } else {
          p.vx += (p.rx + driftX - p.x) * SPRING;
          p.vy += (p.ry + driftY - p.y) * SPRING;
        }
        p.vx *= DAMP; p.vy *= DAMP;
        p.x += p.vx; p.y += p.vy;
      }
    }

    // Emit tiny particles from cursor
    function emitFromMouse() {
      if (!m.on) return;
      // Displacement-based: faster mouse = more emission
      const dx = m.x - m.px, dy = m.y - m.py;
      const speed = Math.hypot(dx, dy);
      const displacementBoost = Math.min(speed * 0.008, 0.3);
      emitAccum += EMIT_RATE + displacementBoost;
      if (emitAccum >= 1) {
        emitAccum--;
        const angle = Math.random() * 6.28;
        const v = Math.random() * 0.4 + 0.1;
        parts.push({
          x: m.x + (Math.random() - 0.5) * 6,
          y: m.y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 0.15,
          s: Math.random() * 0.7 + 0.3,
          life: 0,
          max: 50 + Math.random() * 70,
          emit: true,
        });
      }
    }

    function proxAlpha(x: number, y: number, radius: number, peak: number) {
      if (!m.on) return 0;
      const d = Math.hypot(x - m.x, y - m.y);
      return d > radius ? 0 : ((1 - d / radius) ** 2) * peak;
    }

    function drawDots() {
      for (const p of grid) {
        const a = DOT_BASE + proxAlpha(p.x, p.y, LIGHT_R, DOT_PEAK);
        if (a < 0.001) continue;
        ctx.fillStyle = `rgba(244,245,248,${a})`;
        ctx.fillRect(p.x - DOT_R, p.y - DOT_R, DOT_R * 2, DOT_R * 2);
      }
    }

    function drawParticles() {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life >= p.max || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          // Respawn ambient particles, discard emitted ones
          if (p.emit) { parts.splice(i, 1); } else { parts[i] = spawn(); }
          continue;
        }
        const lr = p.life / p.max;
        const fade = Math.min(lr * 5, 1) * (lr > 0.7 ? Math.max(1 - (lr - 0.7) / 0.3, 0) : 1);
        const peakA = p.emit ? EMIT_OPACITY : P_OPACITY;
        const base = peakA * fade;
        // Emitted particles are always visible; ambient ones brighten near cursor
        let a = base;
        if (!p.emit) {
          const near = proxAlpha(p.x, p.y, LIGHT_R * 1.5, 1);
          a = base * (0.25 + near * 0.75);
        }
        if (a < 0.001) continue;
        // Emitted particles slow down
        if (p.emit) { p.vx *= 0.98; p.vy *= 0.98; }
        ctx.fillStyle = `rgba(244,245,248,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, 6.283);
        ctx.fill();
      }
    }

    function drawShimmer() {
      if (!m.on) return;
      for (let i = 0; i < 6; i++) {
        const seed = tick * 0.008 + i * 137.5;
        const ang = seed * 2.4;
        const rad = (Math.sin(seed * 0.7) * 0.5 + 0.5) * LIGHT_R * 0.7;
        const px = m.x + Math.cos(ang) * rad, py = m.y + Math.sin(ang) * rad;
        const a = (Math.sin(tick * 0.04 + i * 1.9) * 0.5 + 0.5) * 0.018;
        const sz = 15 + Math.sin(seed) * 12;
        const g = ctx.createRadialGradient(px, py, 0, px, py, sz);
        g.addColorStop(0, `rgba(244,245,248,${a})`);
        g.addColorStop(1, "rgba(244,245,248,0)");
        ctx.fillStyle = g;
        ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
      }
    }

    function draw() {
      tick++;
      physics();
      emitFromMouse();
      ctx.clearRect(0, 0, w, h);
      drawShimmer();
      drawDots();
      drawParticles();
      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => { m.px = m.x; m.py = m.y; m.x = e.clientX; m.y = e.clientY; m.on = true; };
    const onLeave = () => { m.on = false; };

    resize();
    addEventListener("resize", resize);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      removeEventListener("resize", resize);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
