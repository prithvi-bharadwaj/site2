"use client";

import { useRef, useEffect, useState } from "react";
import {
  imageToPoints,
  createPool,
  updatePhysics,
  drawSoft,
  type Particle,
  type MouseState,
  type PhysicsConfig,
  DEFAULT_PHYSICS,
} from "@/lib/particle-text";

interface ParticleImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  targetCount?: number;
  particleSize?: number;
  particleColor?: string;
  physics?: Partial<PhysicsConfig>;
  className?: string;
}

export function ParticleImage({
  src,
  alt,
  width,
  height,
  targetCount = 500,
  particleSize = 1.2,
  particleColor = "255,255,255",
  physics: physicsOverrides,
  className,
}: ParticleImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const physicsConfig: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
    ...physicsOverrides,
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isMobile = window.innerWidth < 768;
      const count = isMobile ? Math.round(targetCount * 0.5) : targetCount;
      const points = imageToPoints(img, width, height, count);
      particlesRef.current = createPool(points, width, height, false);

      let running = true;

      const loop = () => {
        if (!running) return;

        updatePhysics(particlesRef.current, mouseRef.current, physicsConfig);
        ctx.clearRect(0, 0, width, height);
        drawSoft(ctx, particlesRef.current, particleSize, particleColor);

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);

      // Store cleanup ref
      canvas.dataset.running = "true";
    };
    img.src = src;

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, src, width, height, targetCount, particleSize, particleColor, physicsConfig]);

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

  if (reducedMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
      style={{ display: "block" }}
    />
  );
}
