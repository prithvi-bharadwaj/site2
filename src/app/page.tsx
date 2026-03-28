"use client";

import Link from "next/link";
import { AsciiDissolve } from "@/components/AsciiDissolve";

const NAV_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Games", href: "/games" },
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
] as const;

export default function Home() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Logo — top left */}
      <div className="fixed top-8 left-8 z-10">
        <AsciiDissolve
          src="/images/logo.svg"
          alt="Prithvi logo"
          width={120}
          height={120}
          fontSize={8}
        />
      </div>

      {/* Centered content */}
      <div className="text-center z-10">
        <h1 className="text-white text-4xl font-bold tracking-tight mb-3">
          Prithvi
        </h1>
        <p className="text-white/60 text-sm mb-8">
          Developer, creator, explorer.
        </p>
        <nav className="flex gap-6 justify-center">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/50 text-sm hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Flower — bottom right */}
      <div className="fixed bottom-8 right-8 z-10">
        <AsciiDissolve
          src="/images/flower.svg"
          alt="Decorative flower"
          width={140}
          height={140}
          fontSize={8}
        />
      </div>
    </main>
  );
}
