"use client";

import { useRef, useEffect, useCallback } from "react";

interface RepelTextProps {
  children: string;
  className?: string;
}

const REPEL_RADIUS = 70;
const MAX_FORCE = 5;

/**
 * Wraps a plain-text string into per-word spans that subtly
 * repel away from the cursor on hover.
 */
export function RepelText({ children, className }: RepelTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const words =
      container.querySelectorAll<HTMLElement>("[data-repel]");

    for (const word of words) {
      const wr = word.getBoundingClientRect();
      const wx = wr.left - rect.left + wr.width / 2;
      const wy = wr.top - rect.top + wr.height / 2;
      const dx = wx - mx;
      const dy = wy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS && dist > 0) {
        const t = 1 - dist / REPEL_RADIUS;
        const force = t * t * MAX_FORCE;
        word.style.transform = `translate(${(dx / dist) * force}px, ${(dy / dist) * force}px)`;
      } else if (word.style.transform) {
        word.style.transform = "";
      }
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const words =
      containerRef.current?.querySelectorAll<HTMLElement>("[data-repel]");
    if (!words) return;
    for (const word of words) {
      word.style.transform = "";
    }
  }, []);

  const tokens = children.split(/(\s+)/);

  return (
    <span
      ref={containerRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {tokens.map((token, i) =>
        /^\s+$/.test(token) ? (
          <span key={i}>{token}</span>
        ) : (
          <span
            key={i}
            data-repel
            className="inline-block"
            style={{
              transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            {token}
          </span>
        )
      )}
    </span>
  );
}

/**
 * Hook version — apply subtle repulsion to any container's
 * [data-repel] children. Use this for mixed content
 * (text + InlinePopup + InlineAccordion).
 */
export function useRepel(
  containerRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    function onMove(e: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const words =
        container.querySelectorAll<HTMLElement>("[data-repel]");

      for (const word of words) {
        const wr = word.getBoundingClientRect();
        const wx = wr.left - rect.left + wr.width / 2;
        const wy = wr.top - rect.top + wr.height / 2;
        const dx = wx - mx;
        const dy = wy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const t = 1 - dist / REPEL_RADIUS;
          const force = t * t * MAX_FORCE;
          word.style.transform = `translate(${(dx / dist) * force}px, ${(dy / dist) * force}px)`;
        } else if (word.style.transform) {
          word.style.transform = "";
        }
      }
    }

    function onLeave() {
      if (!container) return;
      const words =
        container.querySelectorAll<HTMLElement>("[data-repel]");
      for (const word of words) {
        word.style.transform = "";
      }
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [containerRef]);
}

/**
 * Wraps each word in a string with data-repel spans.
 * Use inside a container with useRepel() for mixed content
 * (text interleaved with InlinePopup / InlineAccordion).
 */
export function RepelWords({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\s+)/).map((token, i) =>
        /^\s+$/.test(token) ? (
          token
        ) : (
          <span
            key={i}
            data-repel
            className="inline-block"
            style={{
              transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            {token}
          </span>
        )
      )}
    </>
  );
}
