"use client";

import { useEffect, useRef } from "react";
import { createWindRenderer, randomWindPalette, type Rgb } from "@/lib/cosmic-wind-gl";

/**
 * Cosmic wind - soft shader wisps rising out of the page's bottom edge, in a
 * palette randomized on every load. Pointer-events none, sits behind the
 * content column.
 *
 * The fbm field is inherently blurry, so the canvas renders at half
 * resolution and lets CSS scale it up - a quarter of the fragments for an
 * identical look. Animates only while scrolled into view; reduced motion
 * gets one static frame; no WebGL gets a CSS gradient in the same palette.
 */

const INTENSITY = 0.65;
const RESOLUTION = 0.5;

const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

export function CosmicWind() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const palette = randomWindPalette();
    const renderer = createWindRenderer(canvas, palette, INTENSITY);

    if (!renderer) {
      const [a, b, c] = palette.colors.map(css);
      canvas.style.background = [
        `radial-gradient(120% 90% at 20% 100%, ${a} 0%, transparent 60%)`,
        `radial-gradient(100% 80% at 75% 100%, ${b} 0%, transparent 55%)`,
        `radial-gradient(140% 70% at 50% 100%, ${c} 0%, transparent 65%)`,
      ].join(", ");
      canvas.style.opacity = "0.35";
      return;
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      renderer!.resize(rect.width, rect.height, RESOLUTION);
    }
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let visible = false;
    const start = performance.now();

    function frame(now: number) {
      renderer!.draw((now - start) / 1000 + palette.seed);
      if (visible) raf = requestAnimationFrame(frame);
    }

    if (reducedMotion) {
      renderer.draw(palette.seed);
    } else {
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(frame);
      });
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      };
    }

    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full"
      style={{ height: "clamp(320px, 55vh, 620px)" }}
    />
  );
}
