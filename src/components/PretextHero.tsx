"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  layoutHero,
  type SectionConfig,
  type PositionedWord,
  type HeroLayoutResult,
} from "@/lib/pretext-layout";
import {
  createDisplacedElement,
  updateDisplacement,
  type DisplacedElement,
  type DisplacementConfig,
  DEFAULT_DISPLACEMENT_CONFIG,
} from "@/lib/displacement-physics";

gsap.registerPlugin(useGSAP);

interface PretextHeroProps {
  greeting: string;
  bio: string;
  className?: string;
}

const FONT_FAMILY = '"JetBrains Mono", monospace';

/** Build section configs for the monospace soulwire layout */
function buildSections(greeting: string, bio: string): SectionConfig[] {
  return [
    // Greeting: "Hey" — large bold, per-char displacement
    {
      blocks: [
        {
          text: greeting,
          type: "accent",
        },
      ],
      font: `700 36px ${FONT_FAMILY}`,
      fontSize: 36,
      lineHeight: 48,
      marginBottom: 64,
    },
    // Info label
    {
      blocks: [
        {
          text: "Info.",
          type: "label",
        },
      ],
      font: `400 12px ${FONT_FAMILY}`,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 16,
    },
    // Bio paragraph
    {
      blocks: [
        {
          text: bio,
          type: "body",
        },
      ],
      font: `400 14px ${FONT_FAMILY}`,
      fontSize: 14,
      lineHeight: 22.4,
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

export function PretextHero({
  greeting,
  bio,
  className,
}: PretextHeroProps) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<HeroLayoutResult | null>(null);
  const [ready, setReady] = useState(false);

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

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    const sections = buildSections(greeting, bio);
    const result = layoutHero({ sections, containerWidth });
    setLayout(result);
  }, [greeting, bio]);

  // Initialize: wait for fonts, then compute layout
  useEffect(() => {
    if (reducedMotion) {
      setReady(true);
      return;
    }

    document.fonts.ready.then(() => {
      computeLayout();
      setReady(true);
    });
  }, [reducedMotion, computeLayout]);

  // ResizeObserver
  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        computeLayout();
      }, 150);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [reducedMotion, computeLayout]);

  // Sync displaced elements array when layout changes
  useEffect(() => {
    if (!layout) return;

    displacedRef.current = layout.words.map((w) =>
      createDisplacedElement(
        w.x,
        w.y,
        w.width,
        w.height,
        w.block.baseOpacity ?? 0.5
      )
    );
  }, [layout]);

  // Bind displaced elements to DOM refs after render
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
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
      if (!animatingRef.current) {
        animatingRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
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

  // Animation loop
  const animate = useCallback(() => {
    const mouse = mouseRef.current;
    const elements = displacedRef.current;

    if (elements.length === 0) {
      animatingRef.current = false;
      return;
    }

    const stillMoving = updateDisplacement(
      elements,
      mouse.x,
      mouse.y,
      mouse.active,
      displacementConfig
    );

    if (stillMoving || mouse.active) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      animatingRef.current = false;
    }
  }, [displacementConfig]);

  // GSAP entry animation
  useGSAP(
    () => {
      if (!ready || reducedMotion) return;

      gsap.from("[data-pretext-idx]", {
        opacity: 0,
        y: 8,
        duration: 0.35,
        ease: "power3.out",
        stagger: 0.02,
        delay: 0.15,
      });
    },
    { scope: containerRef, dependencies: [ready, reducedMotion] }
  );

  // Reduced motion fallback
  if (reducedMotion) {
    return (
      <div className={className}>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-16 md:mb-24">
          {greeting}
        </h1>
        <section className="flex flex-col md:flex-row gap-4 md:gap-16">
          <span className="section-label shrink-0 pt-0.5">Info.</span>
          <p className="text-sm leading-relaxed max-w-2xl text-[#aaa]">
            {bio}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full relative ${className ?? ""}`}
      style={{
        height: layout ? layout.totalHeight : "auto",
        minHeight: 120,
      }}
      role="banner"
    >
      {/* Accessible hidden text */}
      <div className="sr-only">
        <h1>{greeting}</h1>
        <p>{bio}</p>
      </div>

      {/* Positioned word elements */}
      {layout?.words.map((word, i) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: word.x,
          top: word.y,
          color: word.block.color,
          opacity: word.block.baseOpacity,
          fontSize: getFontSize(word),
          fontWeight: getFontWeight(word),
          fontFamily: FONT_FAMILY,
          letterSpacing: word.block.type === "label" ? "0.1em" : undefined,
          textTransform:
            word.block.type === "label" ? "uppercase" : undefined,
          whiteSpace: "pre",
          willChange: coarsePointer ? undefined : "transform, opacity",
          pointerEvents: "none",
        };

        return (
          <span
            key={word.key}
            data-pretext-idx={i}
            className="pretext-word"
            style={style}
            aria-hidden="true"
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}

function getFontSize(word: PositionedWord): number {
  switch (word.block.type) {
    case "heading":
    case "accent":
      return 36;
    case "label":
      return 12;
    default:
      return 14;
  }
}

function getFontWeight(word: PositionedWord): number {
  switch (word.block.type) {
    case "heading":
    case "accent":
      return 700;
    default:
      return 400;
  }
}
