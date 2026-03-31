"use client";

import { useRef, useEffect } from "react";

/** Grid resolution for the mesh distortion */
const COLS = 48;
const ROWS = 48;
const INFLUENCE_RADIUS = 180;
const MAX_DISPLACEMENT = 14;
const SPRING_BACK = 0.06;
const DAMPING = 0.85;
const LINE_OPACITY = 0.035;

interface GridPoint {
  restX: number;
  restY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Full-screen canvas that renders a subtle grid mesh.
 * The mesh deforms around the mouse cursor like a fabric curtain,
 * creating a depth distortion effect.
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
            const factor = (1 - dist / INFLUENCE_RADIUS);
            // Quadratic falloff for smooth push
            const strength = factor * factor * MAX_DISPLACEMENT;
            const nx = dx / dist;
            const ny = dy / dist;
            // Target displaced position
            const targetX = p.restX + nx * strength;
            const targetY = p.restY + ny * strength;
            p.vx += (targetX - p.x) * 0.15;
            p.vy += (targetY - p.y) * 0.15;
          }
        }

        // Spring back to rest
        p.vx += (p.restX - p.x) * SPRING_BACK;
        p.vy += (p.restY - p.y) * SPRING_BACK;

        // Damping
        p.vx *= DAMPING;
        p.vy *= DAMPING;

        p.x += p.vx;
        p.y += p.vy;
      }
    }

    function getPoint(row: number, col: number): GridPoint {
      return grid[row * (COLS + 1) + col];
    }

    function draw() {
      updatePhysics();

      ctx!.clearRect(0, 0, w, h);
      ctx!.strokeStyle = `rgba(244, 245, 248, ${LINE_OPACITY})`;
      ctx!.lineWidth = 0.5;

      // Draw horizontal lines
      for (let row = 0; row <= ROWS; row++) {
        ctx!.beginPath();
        const p0 = getPoint(row, 0);
        ctx!.moveTo(p0.x, p0.y);
        for (let col = 1; col <= COLS; col++) {
          const p = getPoint(row, col);
          ctx!.lineTo(p.x, p.y);
        }
        ctx!.stroke();
      }

      // Draw vertical lines
      for (let col = 0; col <= COLS; col++) {
        ctx!.beginPath();
        const p0 = getPoint(0, col);
        ctx!.moveTo(p0.x, p0.y);
        for (let row = 1; row <= ROWS; row++) {
          const p = getPoint(row, col);
          ctx!.lineTo(p.x, p.y);
        }
        ctx!.stroke();
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
