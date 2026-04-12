"use client";

import { useRef, useEffect, useState } from "react";

interface StorySectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function StorySection({ id, title, children }: StorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className="story-section mt-12 first:mt-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
      }}
    >
      <h3 className="text-sm font-bold text-[#F4F5F8] mb-4">{title}</h3>
      <div className="text-sm text-[#F4F5F8]/60 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}
