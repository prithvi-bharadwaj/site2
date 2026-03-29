"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  textToPoints,
  measureText,
  createPool,
  morphTo,
  updateMorph,
  updatePhysics,
  drawSoft,
  type Particle,
  type Point,
  type MouseState,
  type PhysicsConfig,
  DEFAULT_PHYSICS,
} from "@/lib/particle-text";

interface ParticleTextProps {
  words: string[];
  fontSize?: number;
  particleSize?: number;
  particleColor?: string;
  targetCount?: number;
  morphDuration?: number;
  pauseDuration?: number;
  physics?: Partial<PhysicsConfig>;
  className?: string;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

type AnimState = "scatter-in" | "idle" | "morphing";

export function ParticleText({
  words,
  fontSize = 32,
  particleSize = 1.5,
  particleColor = "255,255,255",
  targetCount = 800,
  morphDuration = 1200,
  pauseDuration = 2500,
  physics: physicsOverrides,
  className,
}: ParticleTextProps) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const wordIndexRef = useRef(0);
  const animStateRef = useRef<AnimState>("scatter-in");
  const progressRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pauseStartRef = useRef(0);
  const pointsCacheRef = useRef<Map<string, Point[]>>(new Map());
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, active: false });

  const physicsConfig: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
    ...physicsOverrides,
  };

  const getDimensions = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const count = isMobile ? Math.round(targetCount * 0.5) : targetCount;

    let maxW = 0;
    let maxH = 0;
    for (const word of words) {
      const m = measureText(word, fontSize);
      if (m.width > maxW) maxW = m.width;
      if (m.height > maxH) maxH = m.height;
    }

    const padX = fontSize * 2;
    const padY = fontSize * 1.5;

    return {
      canvasW: maxW + padX,
      canvasH: maxH + padY,
      textOffsetX: padX / 2,
      textOffsetY: padY / 2,
      particleCount: count,
    };
  }, [words, fontSize, targetCount]);

  const getPoints = useCallback(
    (word: string, particleCount: number, offsetX: number, offsetY: number) => {
      const key = `${word}-${particleCount}`;
      const cached = pointsCacheRef.current.get(key);
      if (cached) return cached;

      const raw = textToPoints(word, fontSize, particleCount);
      const offset = raw.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pointsCacheRef.current.set(key, offset);
      return offset;
    },
    [fontSize]
  );

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { canvasW, canvasH, textOffsetX, textOffsetY, particleCount } =
      getDimensions();

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;

    const firstWord = words[0];
    const points = getPoints(firstWord, particleCount, textOffsetX, textOffsetY);
    particlesRef.current = createPool(points, canvasW, canvasH);
    morphTo(particlesRef.current, points);

    animStateRef.current = "scatter-in";
    progressRef.current = 0;
    lastTimeRef.current = 0;
    wordIndexRef.current = 0;

    let running = true;

    const loop = (timestamp: number) => {
      if (!running) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      const state = animStateRef.current;

      if (state === "scatter-in" || state === "morphing") {
        progressRef.current += dt / morphDuration;

        if (progressRef.current >= 1) {
          updateMorph(particlesRef.current, 1);
          animStateRef.current = "idle";
          pauseStartRef.current = timestamp;
        } else {
          updateMorph(particlesRef.current, progressRef.current);
        }
      } else if (state === "idle") {
        // Apply spring physics + mouse repulsion while idle
        updatePhysics(particlesRef.current, mouseRef.current, physicsConfig);

        if (words.length > 1 && timestamp - pauseStartRef.current >= pauseDuration) {
          wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
          const nextWord = words[wordIndexRef.current];
          const nextPoints = getPoints(nextWord, particleCount, textOffsetX, textOffsetY);
          morphTo(particlesRef.current, nextPoints);
          animStateRef.current = "morphing";
          progressRef.current = 0;
        }
      }

      ctx.clearRect(0, 0, canvasW, canvasH);
      drawSoft(ctx, particlesRef.current, particleSize, particleColor);

      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    reducedMotion,
    words,
    fontSize,
    particleSize,
    particleColor,
    targetCount,
    morphDuration,
    pauseDuration,
    getDimensions,
    getPoints,
    physicsConfig,
  ]);

  // Mouse tracking
  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion]);

  // Reduced motion fallback
  const [visibleIndex, setVisibleIndex] = useState(0);

  useEffect(() => {
    if (!reducedMotion || words.length <= 1) return;

    const interval = setInterval(() => {
      setVisibleIndex((i) => (i + 1) % words.length);
    }, pauseDuration + morphDuration);

    return () => clearInterval(interval);
  }, [reducedMotion, words, pauseDuration, morphDuration]);

  if (reducedMotion) {
    return (
      <span
        className={className}
        style={{
          fontFamily: "'Red Hat Display', sans-serif",
          fontSize: `${fontSize}px`,
          color: `rgba(${particleColor},0.6)`,
          transition: "opacity 0.4s ease",
        }}
        aria-label={words.join(", ")}
      >
        {words[visibleIndex]}
      </span>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={words.join(", ")}
        style={{ display: "block" }}
      />
    </div>
  );
}
