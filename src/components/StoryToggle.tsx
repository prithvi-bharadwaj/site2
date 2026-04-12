"use client";

import { useState, useCallback } from "react";

interface StoryToggleProps {
  /** Render prop: receives expandToSection handler for anchor links */
  tldr: (expandToSection: (sectionId: string) => void) => React.ReactNode;
  children: React.ReactNode;
  onExpandChange?: (expanded: boolean) => void;
}

export function StoryToggle({ tldr, children, onExpandChange }: StoryToggleProps) {
  const [expanded, setExpanded] = useState(false);

  const expand = useCallback(() => {
    setExpanded(true);
    onExpandChange?.(true);
  }, [onExpandChange]);

  const collapse = useCallback(() => {
    setExpanded(false);
    onExpandChange?.(false);
  }, [onExpandChange]);

  const expandToSection = useCallback(
    (sectionId: string) => {
      if (!expanded) {
        setExpanded(true);
        onExpandChange?.(true);
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
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
        className="story-toggle-btn text-[#F4F5F8]/60 border border-[#F4F5F8]/20 px-4 py-2 text-xs uppercase tracking-widest hover:text-[#F4F5F8] hover:border-[#F4F5F8]/40 transition-all duration-200 mb-8"
      >
        {expanded ? "collapse" : "show full story"}
      </button>

      {/* Expanded story content */}
      <div
        className="story-expand"
        style={{
          maxHeight: expanded ? 20000 : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
