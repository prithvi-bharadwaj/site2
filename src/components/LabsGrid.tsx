"use client";

import { useEffect, useState } from "react";

interface LabItem {
  title: string;
  href?: string;
}

const LABS: LabItem[] = [
  { title: "ASCII Render", href: "/" },
  { title: "Terrain Sim" },
  { title: "Sequencer" },
  { title: "Sprout" },
  { title: "Lightfield" },
  { title: "Particle Text" },
  { title: "Shader Toy" },
  { title: "Wave Forms" },
  { title: "Flow Field" },
];

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

interface LabsGridProps {
  className?: string;
}

export function LabsGrid({ className }: LabsGridProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Stagger in after hero finishes (~800ms)
    const timer = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className={`${className ?? ""}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
      }}
    >
      <span className="text-[#F4F5F8]/35 text-xs uppercase tracking-widest block mb-4">
        Labs.
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-2 text-sm">
        {LABS.map((item, i) => (
          <div key={item.title}>
            {item.href ? (
              <a href={item.href} className="project-item">
                <span className="text-[#F4F5F8]/25 text-xs">{pad(i)}</span>
                <span className="text-[#F4F5F8]/60 hover:text-[#F4F5F8] transition-colors duration-200">
                  {item.title}
                </span>
              </a>
            ) : (
              <span className="project-item">
                <span className="text-[#F4F5F8]/25 text-xs">{pad(i)}</span>
                <span className="text-[#F4F5F8]/60">{item.title}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
