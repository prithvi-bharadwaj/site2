"use client";

import { useRef, useEffect, useState, Children, isValidElement } from "react";
import {
  createScrambleState,
  tickScramble,
  getScrambleText,
  hasScrambleStarted,
  type ScrambleState,
  type ScrambleConfig,
} from "@/lib/text-scramble";

const SCRAMBLE_CONFIG: ScrambleConfig = {
  scrambleProbability: 0.5,
  binaryDuration: 80,
  asciiDuration: 120,
  maxDelay: 200,
};

interface StorySectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function flattenText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return flattenText(node.props.children);
  }
  return "";
}

export function StorySection({ id, title, children }: StorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [titleScramble, setTitleScramble] = useState<string>(title);
  const [titleRevealed, setTitleRevealed] = useState(false);
  const scrambleStartedRef = useRef(false);

  // Intersection observer — triggers scramble when section enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scramble-decode the title when it enters view
  useEffect(() => {
    if (!inView || scrambleStartedRef.current) return;
    scrambleStartedRef.current = true;

    const state = createScrambleState(title, 0, 1, {
      ...SCRAMBLE_CONFIG,
      maxDelay: 50,
    });

    const TICK = 25;

    function step() {
      const active = tickScramble(state, TICK, SCRAMBLE_CONFIG);
      setTitleScramble(getScrambleText(state));
      if (active) {
        setTimeout(step, TICK);
      } else {
        setTitleRevealed(true);
      }
    }

    // Small delay before starting scramble
    setTimeout(step, TICK);
  }, [inView, title]);

  return (
    <section
      ref={ref}
      id={id}
      className="story-section mt-10 first:mt-0"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 350ms ease-out, transform 350ms ease-out",
      }}
    >
      {title && (
        <h3 className="text-sm font-bold text-[#F4F5F8] mb-3">
          {titleRevealed ? title : titleScramble}
        </h3>
      )}
      <div className="text-sm text-[#F4F5F8]/60 leading-relaxed space-y-3">
        {inView ? (
          <ScrambleRevealChildren>{children}</ScrambleRevealChildren>
        ) : (
          <div style={{ visibility: "hidden" }}>{children}</div>
        )}
      </div>
    </section>
  );
}

/** Scramble-reveal each <p> child with staggered delays */
function ScrambleRevealChildren({
  children,
}: {
  children: React.ReactNode;
}) {
  const childArray = Children.toArray(children);

  return (
    <>
      {childArray.map((child, i) => (
        <ScrambleParagraph key={i} delay={i * 120}>
          {child}
        </ScrambleParagraph>
      ))}
    </>
  );
}

function ScrambleParagraph({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const text = flattenText(children);
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) {
      setDone(true);
      return;
    }

    const state = createScrambleState(text, 0, 1, SCRAMBLE_CONFIG);
    let cancelled = false;

    const TICK = 25;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      setStarted(true);
      setDisplayText(getScrambleText(state));

      function step() {
        if (cancelled) return;
        const active = tickScramble(state, TICK, SCRAMBLE_CONFIG);
        setDisplayText(getScrambleText(state));
        if (active) {
          setTimeout(step, TICK);
        } else {
          setDone(true);
        }
      }

      setTimeout(step, TICK);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [text, delay]);

  if (done) {
    // Render original children as-is (already wrapped in <p>)
    return <>{children}</>;
  }

  return (
    <p
      style={{
        opacity: started ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      {displayText}
    </p>
  );
}
