"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface LinkItem {
  label: string;
  href: string;
}

interface BioOverlayProps {
  name?: string;
  bio?: string;
  links?: LinkItem[];
  games?: LinkItem[];
}

export function BioOverlay({
  name = "Prithvi",
  bio = "Developer, creator, explorer.",
  links = [
    { label: "Twitter / X", href: "https://x.com" },
    { label: "GitHub", href: "https://github.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  games = [
    { label: "Game 1", href: "#" },
  ],
}: BioOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-animate]", {
        opacity: 0,
        y: 12,
        stagger: 0.08,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.3,
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="fixed top-8 left-8 z-10 max-w-sm select-none"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <h1
        data-animate
        className="text-white text-3xl font-bold tracking-tight mb-2"
      >
        {name}
      </h1>

      <p data-animate className="text-white/70 text-sm mb-6 leading-relaxed">
        {bio}
      </p>

      <div className="mb-4">
        {links.map((link) => (
          <a
            key={link.href}
            data-animate
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-white/60 text-sm hover:text-white transition-colors duration-200 mb-1"
          >
            → {link.label}
          </a>
        ))}
      </div>

      {games.length > 0 && (
        <div>
          <span data-animate className="text-white/40 text-xs uppercase tracking-widest mb-2 block">
            Games
          </span>
          {games.map((game) => (
            <a
              key={game.href}
              data-animate
              href={game.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-white/60 text-sm hover:text-white transition-colors duration-200 mb-1"
            >
              → {game.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
