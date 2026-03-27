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
      gsap.from("[data-animate]", {
        opacity: 0,
        y: 16,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
        delay: 0.1,
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="page-scroll min-h-screen bg-black text-white px-8 py-8 md:px-16 md:py-12 max-w-3xl mx-auto"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div data-animate className="mb-8">
        <Link
          href="/"
          className="text-white/40 text-sm hover:text-white transition-colors duration-200"
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
