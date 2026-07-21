"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  layoutHero,
  type SectionConfig,
  type HeroLayoutResult,
} from "@/lib/pretext-layout";
import {
  createDisplacedElement,
  updateDisplacement,
  type DisplacedElement,
  type DisplacementConfig,
  DEFAULT_DISPLACEMENT_CONFIG,
} from "@/lib/displacement-physics";

interface PretextHeroProps {
  greeting: string;
  bio: string;
  className?: string;
}

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif';

// Match Tailwind text-sm (0.8125rem) at the body's font-weight 300 + line-height 1.62.
const BODY_FONT_REM = 0.8125;
// Greeting sits one step up (text-lg) at full opacity — the page's single focal point.
const HEADING_FONT_REM = 1.125;
const BODY_FONT_WEIGHT = 300;
const BODY_LINE_HEIGHT_RATIO = 1.62;

function rootFontPx(): number {
  if (typeof window === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function buildSections(greeting: string, bio: string, fontPx: number, linePx: number, headingPx: number): SectionConfig[] {
  const fontShorthand = `${BODY_FONT_WEIGHT} ${fontPx}px ${FONT_FAMILY}`;
  const headingShorthand = `${BODY_FONT_WEIGHT} ${headingPx}px ${FONT_FAMILY}`;

  return [
    {
      // 0.95 matches displacement maxOpacity — at 1.0 the cursor-repel would dim the greeting
      blocks: [{ text: greeting, type: "heading", baseOpacity: 0.95 }],
      font: headingShorthand,
      fontSize: headingPx,
      lineHeight: headingPx * BODY_LINE_HEIGHT_RATIO,
      marginBottom: 16,
    },
    {
      blocks: [{ text: bio, type: "body" }],
      font: fontShorthand,
      fontSize: fontPx,
      lineHeight: linePx,
      marginBottom: 0,
    },
  ];
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

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return coarse;
}

export function PretextHero({ greeting, bio, className }: PretextHeroProps) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<HeroLayoutResult | null>(null);

  // Displacement
  const displacedRef = useRef<DisplacedElement[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const rafRef = useRef<number>(0);
  const animatingRef = useRef(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const displacementConfig: DisplacementConfig = {
    ...DEFAULT_DISPLACEMENT_CONFIG,
    repelRadius: isMobile ? 80 : 120,
    maxDisplacement: isMobile ? 20 : 30,
  };

  const fontPxRef = useRef(BODY_FONT_REM * 16);
  const headingPxRef = useRef(HEADING_FONT_REM * 16);

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;
    const rootPx = rootFontPx();
    const fontPx = BODY_FONT_REM * rootPx;
    const headingPx = HEADING_FONT_REM * rootPx;
    const linePx = fontPx * BODY_LINE_HEIGHT_RATIO;
    fontPxRef.current = fontPx;
    headingPxRef.current = headingPx;
    const sections = buildSections(greeting, bio, fontPx, linePx, headingPx);
    const result = layoutHero({ sections, containerWidth });
    setLayout(result);
  }, [greeting, bio]);

  // Wait for fonts
  useEffect(() => {
    if (reducedMotion) return;
    document.fonts.ready.then(computeLayout);
  }, [reducedMotion, computeLayout]);

  // ResizeObserver
  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(computeLayout, 150);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [reducedMotion, computeLayout]);

  // Sync displaced elements to the computed layout
  useEffect(() => {
    if (!layout) return;
    displacedRef.current = layout.words.map((w) =>
      createDisplacedElement(w.x, w.y, w.width, w.height, w.block.baseOpacity ?? 0.5)
    );
  }, [layout]);

  // Bind displaced elements to DOM
  useEffect(() => {
    if (!layout || !containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>("[data-pretext-idx]");
    els.forEach((el) => {
      const idx = parseInt(el.dataset.pretextIdx!, 10);
      if (displacedRef.current[idx]) {
        displacedRef.current[idx].el = el;
      }
    });
  }, [layout]);

  // Mouse tracking
  useEffect(() => {
    if (reducedMotion || coarsePointer) return;
    const handleMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
      if (!animatingRef.current) {
        animatingRef.current = true;
        rafRef.current = requestAnimationFrame(animateDisplacement);
      }
    };
    const handleLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
      if (!animatingRef.current) {
        animatingRef.current = true;
        rafRef.current = requestAnimationFrame(animateDisplacement);
      }
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      cancelAnimationFrame(rafRef.current);
      animatingRef.current = false;
    };
  }, [reducedMotion, coarsePointer]);

  const animateDisplacement = useCallback(() => {
    const mouse = mouseRef.current;
    const elements = displacedRef.current;
    if (elements.length === 0) {
      animatingRef.current = false;
      return;
    }
    const stillMoving = updateDisplacement(
      elements, mouse.x, mouse.y, mouse.active, displacementConfig
    );

    if (stillMoving || mouse.active) {
      rafRef.current = requestAnimationFrame(animateDisplacement);
    } else {
      animatingRef.current = false;
    }
  }, [displacementConfig]);

  if (reducedMotion) {
    return (
      <div className={`text-sm text-(--ink)/60 leading-relaxed max-w-2xl ${className ?? ""}`}>
        {/* mb-[16px] matches the canvas path's marginBottom: 16 (rem units inflate at the 125% root) */}
        <p className="mb-[16px] text-lg text-(--ink)">{greeting}</p>
        <p>{bio}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full relative ${className ?? ""}`}
      style={{ height: layout ? layout.totalHeight : "auto", minHeight: 120 }}
      role="banner"
    >
      <div className="sr-only">
        <h1>{greeting}</h1>
        <p>{bio}</p>
      </div>

      {layout?.words.map((word, i) => (
        <span
          key={word.key}
          data-pretext-idx={i}
          className="pretext-word"
          style={{
            position: "absolute",
            left: word.x,
            top: word.y,
            color: word.block.color,
            opacity: word.block.baseOpacity,
            fontSize: word.block.type === "heading" ? headingPxRef.current : fontPxRef.current,
            fontWeight: BODY_FONT_WEIGHT,
            fontFamily: FONT_FAMILY,
            whiteSpace: "pre",
            willChange: coarsePointer ? undefined : "transform, opacity",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}

