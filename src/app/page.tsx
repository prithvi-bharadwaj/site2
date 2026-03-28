"use client";

import Link from "next/link";
import { AsciiDissolve } from "@/components/AsciiDissolve";

const PAGES = [
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Writing", href: "/writing" },
] as const;

export default function Home() {
  return (
    <main
      className="relative min-h-screen flex flex-col"
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
          radius={50}
        />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-xl w-full">
          {/* Bio */}
          <div className="mb-12">
            <h1 className="text-white text-2xl font-bold tracking-tight mb-4">
              Prithvi Bharadwaj
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              I&apos;m a software engineer who builds things at the intersection
              of code and creativity. I care about craft, clarity, and making
              tools that feel good to use. Currently exploring generative art,
              game development, and whatever else catches my attention.
            </p>
          </div>

          {/* Page links */}
          <nav>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {PAGES.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="nav-link text-white/40 text-sm"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Flower — centered footer */}
      <div className="flex justify-center pb-8">
        <AsciiDissolve
          src="/images/flower.svg"
          alt="Decorative flower"
          width={140}
          height={140}
          fontSize={8}
          radius={50}
        />
      </div>
    </main>
  );
}
