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

export function LabsGrid() {
  const [visible, setVisible] = useState(false);

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
        Projects.
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2 text-sm">
        {LABS.map((item) => (
          <div key={item.title}>
            {item.href ? (
              <a href={item.href} className="project-item group">
                <span className="hover-underline text-[#F4F5F8]/60 group-hover:text-[#F4F5F8] transition-colors duration-200">
                  {item.title}
                </span>
              </a>
            ) : (
              <span className="project-item group cursor-default">
                <span className="hover-underline text-[#F4F5F8]/60 group-hover:text-[#F4F5F8] transition-colors duration-200">
                  {item.title}
                </span>
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
