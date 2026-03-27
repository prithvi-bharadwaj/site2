"use client";

import { useRef, useEffect } from "react";
import { AuroraSystem, type AuroraConfig } from "@/lib/aurora/particles";
import { AuroraCurtain, type CurtainConfig } from "@/lib/aurora/curtain";
import { type AsciiConfig } from "@/lib/ascii-renderer/config";
import { type AsciiRenderer } from "@/lib/ascii-renderer/renderer";

interface AuroraOverlayProps {
  config: AsciiConfig;
  renderer: AsciiRenderer | null;
}

function toAuroraConfig(c: AsciiConfig): AuroraConfig {
  return {
    glowCount: c.auroraGlowCount,
    twinkleCount: c.auroraTwinkleCount,
    glowSize: c.auroraGlowSize,
    twinkleSize: c.auroraTwinkleSize,
    speed: c.auroraSpeed,
    intensity: c.auroraIntensity,
    colorShift: c.auroraColorShift,
    cursorInfluence: c.auroraCursorInfluence,
    cursorRadius: c.auroraCursorRadius,
    luminanceBias: c.auroraLuminanceBias,
  };
}

function toCurtainConfig(c: AsciiConfig): CurtainConfig {
  return {
    enabled: c.auroraCurtainEnabled,
    opacity: c.auroraCurtainOpacity,
    waveCount: c.auroraCurtainWaves,
    speed: c.auroraCurtainSpeed,
  };
}

export function AuroraOverlay({ config, renderer }: AuroraOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderer || !config.auroraEnabled) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const system = new AuroraSystem();
    const curtain = new AuroraCurtain();
    const cores = navigator.hardwareConcurrency ?? 4;
    const maxDpr = Math.min(window.devicePixelRatio, cores <= 4 ? 1.5 : 2);

    let rafId = 0;
    let lastTime = performance.now();
    let initialized = false;
    let fadeIn = 0; // 0-1 fade-in progress
    const FADE_DELAY = 1.0; // seconds before fade starts
    const FADE_DURATION = 2.0; // seconds to fade in
    let elapsed = 0;

    const auroraConfig = toAuroraConfig(config);
    const curtainConfig = toCurtainConfig(config);

    const observer = new ResizeObserver((entries) => {
      if (!canvasRef.current) return;
      const entry = entries[0];
      const w = Math.round(entry.contentRect.width * maxDpr);
      const h = Math.round(entry.contentRect.height * maxDpr);
      canvas.width = w;
      canvas.height = h;

      system.init(w, h, auroraConfig);
      curtain.init(curtainConfig.waveCount);
      initialized = true;
    });

    observer.observe(canvas);

    function tick() {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      elapsed += dt;

      if (!initialized || !ctx || !renderer || !canvas) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Fade-in logic
      if (elapsed > FADE_DELAY && fadeIn < 1) {
        fadeIn = Math.min(1, (elapsed - FADE_DELAY) / FADE_DURATION);
      }

      if (fadeIn <= 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const currentAuroraConfig = toAuroraConfig(renderer.getConfig());
      const currentCurtainConfig = toCurtainConfig(renderer.getConfig());

      // Sync particle counts if config changed
      system.syncCounts(currentAuroraConfig);
      curtain.syncWaveCount(currentCurtainConfig.waveCount);

      // Feed luminance data
      if (renderer.getConfig().auroraLuminanceReactive) {
        const lumGrid = renderer.sampleLuminance();
        if (lumGrid) {
          system.setLuminanceGrid(lumGrid, 32, 32);
        }
      }

      // Apply cursor influence
      const pointer = renderer.getPointerState();
      if (pointer.opacity > 0.05) {
        system.applyPointerInfluence(
          pointer.x,
          pointer.y,
          pointer.opacity,
          currentAuroraConfig
        );
      }

      // Update particles
      system.update(dt, currentAuroraConfig, elapsed);

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = fadeIn;

      // Layer 1: Curtain waves (behind particles)
      curtain.render(
        ctx,
        canvas.width,
        canvas.height,
        elapsed,
        currentCurtainConfig,
        pointer.x,
        pointer.y,
        pointer.opacity
      );

      // Layer 2: Particles
      const intensity = currentAuroraConfig.intensity;

      for (const p of system.particles) {
        const opacity = system.getOpacity(p, intensity);
        if (opacity < 0.005) continue;

        const color = system.getColor(p);

        // Luminance boost: slightly brighter/larger in bright areas
        const lumBoost = renderer.getConfig().auroraLuminanceReactive
          ? 0.7 + system.getLuminanceAt(p.x, p.y) * 0.6
          : 1;

        if (p.type === "glow") {
          // Soft radial gradient orb
          const radius = p.size * lumBoost;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
          grad.addColorStop(0, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${(opacity * lumBoost).toFixed(3)})`);
          grad.addColorStop(0.4, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${(opacity * 0.3 * lumBoost).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},0)`);

          ctx.fillStyle = grad;
          ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
        } else {
          // Sharp twinkle — small bright dot with glow
          const size = p.size * lumBoost;
          ctx.globalAlpha = fadeIn * opacity * lumBoost;

          // Outer glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
          grad.addColorStop(0, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},0.6)`);
          grad.addColorStop(0.3, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},0.15)`);
          grad.addColorStop(1, `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(p.x - size * 4, p.y - size * 4, size * 8, size * 8);

          // Bright center
          ctx.fillStyle = `rgba(255,255,255,${(opacity * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = fadeIn;
        }
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [renderer, config.auroraEnabled]);

  if (!config.auroraEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}
