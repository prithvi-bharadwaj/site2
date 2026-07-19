"use client";

import { useId, useState, type ReactNode } from "react";

interface AccordionProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ label, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-controls={panelId}
        className="hover-underline text-[#131316]/35 hover:text-[#131316]/70 text-xs uppercase tracking-widest transition-colors cursor-pointer block focus:outline-none focus-visible:underline"
      >
        {label}
      </button>
      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
