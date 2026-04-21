"use client";

import { useCallback } from "react";

interface StoryToggleProps {
  /** The intro paragraph — always visible, with anchor links */
  intro: (expandToSection: (sectionId: string) => void) => React.ReactNode;
  /** Story sections — revealed on expand */
  children: React.ReactNode;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}

export function StoryToggle({
  intro,
  children,
  expanded,
  onExpandChange,
}: StoryToggleProps) {
  const expand = useCallback(() => {
    onExpandChange(true);
  }, [onExpandChange]);

  const collapse = useCallback(() => {
    onExpandChange(false);
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }, [onExpandChange]);

  const expandToSection = useCallback(
    (sectionId: string) => {
      if (!expanded) {
        onExpandChange(true);
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior: scrollBehavior(),
            block: "start",
          });
        }, 150);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: scrollBehavior(),
          block: "start",
        });
      }
    },
    [expanded, onExpandChange]
  );

  return (
    <div className="text-sm text-[#F4F5F8]/60 leading-relaxed">
      {/* Intro paragraph — always visible, seamless with the hero bio */}
      <div className="space-y-4">
        {intro(expandToSection)}

        {/* Inline expand link — only when collapsed */}
        {!expanded && (
          <p>
            <button
              onClick={expand}
              className="text-[#F4F5F8]/40 hover:text-[#F4F5F8]/70 transition-colors duration-200 cursor-pointer inline"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
              }}
            >
              read the full story →
            </button>
          </p>
        )}
      </div>

      {/* Story sections — expand with scramble reveal */}
      {expanded && (
        <div className="mt-8">
          {children}

          {/* Inline collapse at the end of the story */}
          <p className="mt-12">
            <button
              onClick={collapse}
              className="text-[#F4F5F8]/30 hover:text-[#F4F5F8]/60 transition-colors duration-200 cursor-pointer text-xs"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
              }}
            >
              ↑ collapse
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
