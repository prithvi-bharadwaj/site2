"use client";

import { useCallback } from "react";

interface StoryToggleProps {
  /** Render prop: receives expandToSection handler for anchor links */
  tldr: (expandToSection: (sectionId: string) => void) => React.ReactNode;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

export function StoryToggle({ tldr, expanded, onExpandChange }: StoryToggleProps) {
  const expand = useCallback(() => {
    onExpandChange(true);
  }, [onExpandChange]);

  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";

  const collapse = useCallback(() => {
    onExpandChange(false);
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }, [onExpandChange]);

  const expandToSection = useCallback(
    (sectionId: string) => {
      const behavior = scrollBehavior();
      if (!expanded) {
        onExpandChange(true);
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior,
            block: "start",
          });
        }, 100);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior,
          block: "start",
        });
      }
    },
    [expanded, onExpandChange]
  );

  return (
    <div>
      {/* TL;DR — visible when collapsed */}
      <div
        className="story-expand"
        style={{
          maxHeight: expanded ? 0 : 500,
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? "none" : "auto",
        }}
      >
        <div className="text-sm text-[#F4F5F8]/60 leading-relaxed mb-6">
          {tldr(expandToSection)}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={expanded ? collapse : expand}
        className="story-toggle-btn text-[#F4F5F8]/60 border border-[#F4F5F8]/20 px-4 py-2 text-xs uppercase tracking-widest hover:text-[#F4F5F8] hover:border-[#F4F5F8]/40 transition-all duration-200"
      >
        {expanded ? "collapse" : "show full story"}
      </button>
    </div>
  );
}
