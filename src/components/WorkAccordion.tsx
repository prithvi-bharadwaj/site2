"use client";

import { useEffect, useState } from "react";

interface WorkItem {
  name: string;
  detail: string;
  years: string;
}

const WORK: WorkItem[] = [
  { name: "Roam", detail: "Built the AI game engine. World models for interactive 3D gaming.", years: "2025\u20132026" },
  { name: "Skive", detail: "Gamified platform for creators + their gamer fans. Won Buildspace S4.", years: "2023\u20132025" },
  { name: "100+ games", detail: "Shipped solo for Voodoo and Supersonic while pretending to be a studio.", years: "2021\u20132023" },
  { name: "Apex Pixel Studios", detail: "Creative agency in college. Clients with 10M+ combined audience.", years: "2017\u20132021" },
  { name: "Earlier", detail: "FinBite, game by comments, school merch, YouTube at 13.", years: "" },
];

export function WorkAccordion() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
      }}
    >
      <span className="text-[#F4F5F8]/35 text-xs uppercase tracking-widest block mb-6">
        Work.
      </span>
      <div className="flex flex-col gap-y-2 text-sm">
        {WORK.map((item, i) => (
          <div key={item.name}>
            <span
              className="project-item group cursor-pointer"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="hover-underline text-[#F4F5F8]/60 group-hover:text-[#F4F5F8] transition-colors duration-200">
                {item.name}
              </span>
              {item.years && (
                <span className="text-[10px] text-[#F4F5F8]/20 tabular-nums">
                  {item.years}
                </span>
              )}
            </span>
            <div
              className="work-detail"
              style={{
                maxHeight: open === i ? 48 : 0,
                opacity: open === i ? 1 : 0,
              }}
            >
              <p className="text-xs text-[#F4F5F8]/35 pt-1 leading-relaxed">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
