"use client";

import { useState, Children } from "react";

interface InlineAccordionProps {
  trigger: string;
  children: React.ReactNode;
}

/**
 * Inline text that expands into a dialogue box below,
 * pushing surrounding content down with smooth animation.
 * Content staggers in line-by-line.
 *
 * Parent should be a <div> (not <p>) since this renders
 * block-level content when expanded.
 */
export function InlineAccordion({ trigger, children }: InlineAccordionProps) {
  const [open, setOpen] = useState(false);

  const items = Children.toArray(children);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`inline cursor-pointer transition-colors duration-200 hover-underline ${
          open
            ? "text-[#F4F5F8]"
            : "text-[#F4F5F8]/80 hover:text-[#F4F5F8]"
        }`}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
        }}
      >
        {trigger}
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition:
            "grid-template-rows 350ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="my-2 rounded-lg bg-[#F4F5F8] px-4 py-3 text-[13px] leading-relaxed text-[#131316]">
            {items.map((child, i) => (
              <div
                key={i}
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(6px)",
                  transition: `opacity 220ms ease-out ${i * 60 + 80}ms, transform 220ms ease-out ${i * 60 + 80}ms`,
                }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
