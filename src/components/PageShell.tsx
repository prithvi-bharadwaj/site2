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
        gsap.from(el, {
          opacity: 0,
          y: 8,
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
      className="page-scroll min-h-screen px-8 py-8 md:px-12 md:py-12 max-w-3xl mx-auto"
    >
      <div data-animate className="mb-8">
        <Link
          href="/"
          aria-label="Back to home"
          className="text-[#555] text-sm hover:text-white"
        >
          &larr; back
        </Link>
      </div>

      <h1 data-animate className="text-white text-2xl font-bold tracking-tight mb-1">
        {title}
      </h1>
      <div data-animate className="text-[#333] text-sm mb-10 overflow-hidden">
        {"─".repeat(40)}
      </div>

      {children}
    </div>
  );
}
