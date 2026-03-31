"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface PageShellProps {
  title: string;
  children: React.ReactNode;
}

export function PageShell({ title, children }: PageShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const elements = containerRef.current?.querySelectorAll("[data-animate]");
      if (!elements) return;

      elements.forEach((el, i) => {
        const tag = el.tagName.toLowerCase();
        const isHeading = tag === "h1" || tag === "h2";
        const isCard = el.classList.contains("card-hover");

        gsap.from(el, {
          opacity: 0,
          y: isHeading ? 12 : isCard ? 16 : 8,
          duration: 0.35,
          ease: "power3.out",
          delay: 0.1 + i * 0.04,
        });
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="page-scroll min-h-screen bg-[#1a1a1a] text-white px-8 py-8 md:px-16 md:py-12 max-w-3xl mx-auto font-sans"
    >
      <div data-animate className="mb-8">
        <Link
          href="/"
          aria-label="Back to home"
          className="text-white/40 text-sm hover:text-white link-hover"
        >
          ← back
        </Link>
      </div>

      <h1 data-animate className="text-white text-2xl font-bold tracking-tight mb-1">
        // {title}
      </h1>
      <div data-animate className="text-white/20 text-sm mb-10">
        {"─".repeat(40)}
      </div>

      {children}
    </div>
  );
}
