"use client";

import { useRef, useEffect } from "react";

/** Grid resolution */
const COLS = 48;
const ROWS = 48;
const INFLUENCE_RADIUS = 180;
const MAX_DISPLACEMENT = 14;
const SPRING_BACK = 0.06;
const DAMPING = 0.85;

/** Light radius around cursor */
const LIGHT_RADIUS = 280;
const LIGHT_CORE_OPACITY = 0.06;

/** Trail fog settings */
const TRAIL_LENGTH = 12;
const TRAIL_FADE = 0.92;

interface GridPoint {
  restX: number;
  restY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

/**
 * Full-screen canvas grid mesh that is only visible near the cursor (flashlight).
 * Grid deforms around the mouse like a curtain. A subtle fog trail follows the cursor.
 */
export function BackdropRipple() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const mouse = { x: -9999, y: -9999, active: false };
    let grid: GridPoint[] = [];
    const trail: TrailPoint[] = [];
    let lastTrailTime = 0;

    function buildGrid() {
      grid = [];
      const cellW = w / COLS;
      const cellH = h / ROWS;
      for (let row = 0; row <= ROWS; row++) {
        for (let col = 0; col <= COLS; col++) {
          grid.push({
            restX: col * cellW,
            restY: row * cellH,
            x: col * cellW,
            y: row * cellH,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    function resize() {
      dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    function updatePhysics() {
      for (const p of grid) {
        if (mouse.active) {
          const dx = p.restX - mouse.x;
          const dy = p.restY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < INFLUENCE_RADIUS && dist > 0) {
            const factor = 1 - dist / INFLUENCE_RADIUS;
            const strength = factor * factor * MAX_DISPLACEMENT;
            const nx = dx / dist;
            const ny = dy / dist;
            const targetX = p.restX + nx * strength;
            const targetY = p.restY + ny * strength;
            p.vx += (targetX - p.x) * 0.15;
            p.vy += (targetY - p.y) * 0.15;
          }
        }

        p.vx += (p.restX - p.x) * SPRING_BACK;
        p.vy += (p.restY - p.y) * SPRING_BACK;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
      }
    }

    function getPoint(row: number, col: number): GridPoint {
      return grid[row * (COLS + 1) + col];
    }

    /** Get line opacity based on distance from mouse (flashlight) */
    function getSegmentOpacity(x1: number, y1: number, x2: number, y2: number): number {
      if (!mouse.active) return 0;
      // Use midpoint of segment
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = mx - mouse.x;
      const dy = my - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > LIGHT_RADIUS) return 0;
      const t = 1 - dist / LIGHT_RADIUS;
      return t * t * LIGHT_CORE_OPACITY;
    }

    function drawTrail() {
      // Update trail
      const now = performance.now();
      if (mouse.active && now - lastTrailTime > 30) {
        trail.push({ x: mouse.x, y: mouse.y, age: 1.0 });
        if (trail.length > TRAIL_LENGTH) trail.shift();
        lastTrailTime = now;
      }

      // Draw fog circles along trail
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        t.age *= TRAIL_FADE;
        if (t.age < 0.01) {
          trail.splice(i, 1);
          continue;
        }
        const radius = 60 + (1 - t.age) * 40;
        const gradient = ctx!.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
        gradient.addColorStop(0, `rgba(244, 245, 248, ${0.015 * t.age})`);
        gradient.addColorStop(1, "rgba(244, 245, 248, 0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(t.x - radius, t.y - radius, radius * 2, radius * 2);
      }
    }

    function draw() {
      updatePhysics();
      ctx!.clearRect(0, 0, w, h);

      // Trail fog
      drawTrail();

      // Draw grid lines with per-segment flashlight opacity
      ctx!.lineWidth = 0.5;

      // Horizontal lines
      for (let row = 0; row <= ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p1 = getPoint(row, col);
          const p2 = getPoint(row, col + 1);
          const opacity = getSegmentOpacity(p1.x, p1.y, p2.x, p2.y);
          if (opacity < 0.001) continue;
          ctx!.strokeStyle = `rgba(244, 245, 248, ${opacity})`;
          ctx!.beginPath();
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
          ctx!.stroke();
        }
      }

      // Vertical lines
      for (let col = 0; col <= COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          const p1 = getPoint(row, col);
          const p2 = getPoint(row + 1, col);
          const opacity = getSegmentOpacity(p1.x, p1.y, p2.x, p2.y);
          if (opacity < 0.001) continue;
          ctx!.strokeStyle = `rgba(244, 245, 248, ${opacity})`;
          ctx!.beginPath();
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
          ctx!.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }

    function handleMouseLeave() {
      mouse.active = false;
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
