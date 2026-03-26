"use client";

import { useRef, useEffect } from "react";
import { ParticleSystem, type ParticleSystemConfig } from "@/lib/ascii-renderer/particles";
import { type AsciiConfig, getCharsForPreset } from "@/lib/ascii-renderer/config";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";

interface ParticleOverlayProps {
  config: AsciiConfig;
  renderer: AsciiRenderer | null;
}

export function ParticleOverlay({ config, renderer }: ParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const system = new ParticleSystem();
    systemRef.current = system;

    let rafId = 0;
    let lastTime = performance.now();
    let initialized = false;

    const maxDpr = Math.min(window.devicePixelRatio, 2);

    const observer = new ResizeObserver((entries) => {
      if (!canvasRef.current) return;
      const entry = entries[0];
      const w = Math.round(entry.contentRect.width * maxDpr);
      const h = Math.round(entry.contentRect.height * maxDpr);
      canvas.width = w;
      canvas.height = h;

      // Reinit particles on resize
      const chars = getCharsForPreset(config);
      const fontSize = config.fontSize;
      // Approximate cell size matching the WebGL renderer
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.font = `${fontSize}px "Courier New", Courier, monospace`;
        const metrics = tempCtx.measureText("M");
        const cellW = Math.ceil(metrics.width);
        const cellH = Math.ceil(fontSize * 1.2);
        system.init(w, h, cellW, cellH, chars);
        initialized = true;
      }
    });

    observer.observe(canvas);

    function tick() {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!initialized || !ctx || !renderer || !canvas) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const pointer = renderer.getPointerState();

      const sysConfig: ParticleSystemConfig = {
        repelForce: config.particleRepelForce,
        spring: config.particleSpring,
        damping: config.particleDamping,
        repelRadius: config.cometRadius * 1.5,
      };

      // Apply repel from pointer
      if (pointer.opacity > 0.05) {
        system.repel(
          pointer.x,
          pointer.y,
          canvas.width,
          canvas.height,
          sysConfig
        );

        // Also repel from trail
        for (const t of pointer.trail) {
          const alpha = 1 - t.age / config.cometTrailDecay;
          if (alpha > 0.1) {
            system.repel(
              t.x, t.y,
              canvas.width, canvas.height,
              { ...sysConfig, repelForce: sysConfig.repelForce * alpha * 0.4 }
            );
          }
        }
      }

      system.update(dt, sysConfig);

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fontSize = config.fontSize * maxDpr;
      ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (const p of system.particles) {
        if (p.displacement < 0.02) continue; // skip particles at rest

        // Glow: brighter when more displaced
        const glow = Math.min(1, p.displacement * 2);
        const alpha = glow * 0.9;

        ctx.globalAlpha = alpha;
        // White with slight warmth when glowing
        const brightness = Math.floor(200 + glow * 55);
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.floor(brightness * 0.95)})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      systemRef.current = null;
    };
  }, [renderer, config]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
