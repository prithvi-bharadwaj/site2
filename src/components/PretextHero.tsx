"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
import {
  createScrambleState,
  tickScramble,
  getScrambleText,
  hasScrambleStarted,
  type ScrambleState,
  type ScrambleConfig,
} from "@/lib/text-scramble";

interface PretextHeroProps {
  greeting: string;
  bio: string;
  className?: string;
}

const FONT_FAMILY = '"Be Vietnam Pro", sans-serif';

const SCRAMBLE_CONFIG: ScrambleConfig = {
  scrambleProbability: 0.65,
  binaryDuration: 125,
  asciiDuration: 175,
  maxDelay: 400,
};

function buildSections(greeting: string, bio: string): SectionConfig[] {
  return [
    {
      blocks: [{ text: greeting, type: "accent" }],
      font: `700 36px ${FONT_FAMILY}`,
      fontSize: 36,
      lineHeight: 48,
      marginBottom: 64,
    },
    {
      blocks: [{ text: bio, type: "body" }],
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

interface ScrambleFrame {
  texts: string[];
  /** Per-word: has this word's scramble started yet? (delay expired) */
  started: boolean[];
}

/**
 * Hook: manages scramble decode with integrated left-to-right reveal.
 * Words start invisible. When a word's scramble delay expires and it begins
 * showing binary, that's when it fades in — combining typing + scramble.
 */
function useScramble(words: PositionedWord[] | null, reducedMotion: boolean) {
  const statesRef = useRef<ScrambleState[]>([]);
  const startedRef = useRef(false);
  const [frame, setFrame] = useState<ScrambleFrame>({ texts: [], started: [] });

  // Track whether words are ready (triggers effect re-run)
  const wordsReady = (words?.length ?? 0) > 0;

  // Init states once when words arrive (render-phase ref write)
  if (wordsReady && statesRef.current.length === 0 && !reducedMotion) {
    statesRef.current = words!.map((w, i) =>
      createScrambleState(w.text, i, words!.length, SCRAMBLE_CONFIG)
    );
  }

  useEffect(() => {
    const states = statesRef.current;
    if (states.length === 0 || reducedMotion || startedRef.current) return;
    startedRef.current = true;

    setFrame({
      texts: states.map((s) => getScrambleText(s)),
      started: states.map((s) => hasScrambleStarted(s)),
    });

    const TICK = 30;

    function step() {
      let anyActive = false;
      for (const s of states) {
        if (tickScramble(s, TICK, SCRAMBLE_CONFIG)) anyActive = true;
      }
      setFrame({
        texts: states.map((s) => getScrambleText(s)),
        started: states.map((s) => hasScrambleStarted(s)),
      });
      if (anyActive) {
        setTimeout(step, TICK);
      }
    }

    // Start after a microtask to survive Strict Mode double-invoke
    Promise.resolve().then(() => setTimeout(step, TICK));
  }, [reducedMotion, wordsReady]);

  return frame;
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

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;
    const sections = buildSections(greeting, bio);
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

  // Scramble + integrated left-to-right reveal
  const { texts: scrambleTexts, started: scrambleStarted } = useScramble(
    layout?.words ?? null,
    reducedMotion
  );

  // Sync displaced elements + size fog canvas
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
      <div className={className}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F4F5F8] mb-16 md:mb-24">
          {greeting}
        </h1>
        <p className="text-sm leading-relaxed max-w-2xl text-[#F4F5F8]/60">{bio}</p>
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

      {layout?.words.map((word, i) => {
        const displayText = scrambleTexts[i] ?? word.text;
        const isVisible = scrambleStarted[i] ?? false;

        return (
          <span
            key={word.key}
            data-pretext-idx={i}
            className="pretext-word"
            style={{
              position: "absolute",
              left: word.x,
              top: word.y,
              color: word.block.color,
              opacity: isVisible ? word.block.baseOpacity : 0,
              fontSize: getFontSize(word),
              fontWeight: getFontWeight(word),
              fontFamily: FONT_FAMILY,
              whiteSpace: "pre",
              willChange: coarsePointer ? undefined : "transform, opacity",
              pointerEvents: "none",
              transition: "opacity 250ms ease-out",
            }}
            aria-hidden="true"
          >
            {displayText}
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
