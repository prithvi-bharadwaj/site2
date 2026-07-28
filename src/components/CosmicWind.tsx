"use client";

import { useEffect, useRef } from "react";
import { createWindRenderer, randomWindPalette } from "@/lib/cosmic-wind-gl";

/**
 * Cosmic wind - soft shader wisps rising out of the page's bottom edge, in a
 * palette randomized on every load. Pointer-events none, sits behind the
 * content column.
 *
 * The fbm field is inherently blurry, so the canvas renders at half
 * resolution and lets CSS scale it up - a quarter of the fragments for an
 * identical look. Animates only while scrolled into view; reduced motion
 * gets one static frame; no WebGL means no effect - a static CSS gradient
 * read as generic decoration, so the fallback is just the page background.
 *
 * The cursor pulls the field toward itself while moving; the influence
 * decays over ~a second once it stops, so the waves feel disturbed rather
 * than steered.
 */

const INTENSITY = 0.55;
/** Per-frame easing toward the cursor; the lag keeps the reaction fluid. */
const MOUSE_EASE = 0.06;
const STRENGTH_DECAY = 0.985;
const RESOLUTION = 0.5;

export function CosmicWind() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const palette = randomWindPalette();
    const renderer = createWindRenderer(canvas, palette, INTENSITY);

    if (!renderer) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Canvas box in page coordinates, refreshed on resize. Mouse math works
    // off pageX/pageY against this cache, so mousemove never forces layout.
    const box = { left: 0, top: 0, width: 1, height: 1 };

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      box.left = rect.left + window.scrollX;
      box.top = rect.top + window.scrollY;
      box.width = rect.width;
      box.height = rect.height;
      renderer!.resize(rect.width, rect.height, RESOLUTION);
      // Resizing the backing buffer wipes it; under reduced motion no rAF
      // loop exists to repaint, so redraw the static frame here.
      if (reducedMotion) renderer!.draw(palette.seed, 0.5, 0.5, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    // The canvas hangs off the page bottom, so its page-space top moves when
    // content above it grows (gen z mode, expanded lore). Track the body, not
    // just the window.
    const bodyObserver = new ResizeObserver(resize);
    bodyObserver.observe(document.body);

    let raf = 0;
    let visible = false;
    const start = performance.now();

    // Cursor in canvas uv space (y up). Values outside [0,1] are fine - the
    // shader's falloff just weakens with distance, so waves lean toward a
    // cursor that is still above the canvas.
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, strength: 0 };

    function onMove(e: MouseEvent) {
      mouse.tx = (e.pageX - box.left) / box.width;
      mouse.ty = 1 - (e.pageY - box.top) / box.height;
      mouse.strength = 1;
    }

    function frame(now: number) {
      mouse.x += (mouse.tx - mouse.x) * MOUSE_EASE;
      mouse.y += (mouse.ty - mouse.y) * MOUSE_EASE;
      mouse.strength *= STRENGTH_DECAY;
      renderer!.draw((now - start) / 1000 + palette.seed, mouse.x, mouse.y, mouse.strength);
      if (visible) raf = requestAnimationFrame(frame);
    }

    // Reduced motion already got its static frame from the initial resize().
    if (!reducedMotion) {
      document.addEventListener("mousemove", onMove, { passive: true });
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(frame);
      });
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        bodyObserver.disconnect();
        document.removeEventListener("mousemove", onMove);
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      };
    }

    return () => {
      bodyObserver.disconnect();
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
