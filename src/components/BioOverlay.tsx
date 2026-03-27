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
  stuff?: LinkItem[];
}

export function BioOverlay({
  name = "Prithvi",
  bio = "Developer, creator, explorer.",
  links = [
    { label: "Twitter / X", href: "https://x.com" },
    { label: "GitHub", href: "https://github.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  stuff = [
    { label: "Project 1", href: "#" },
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
      className="fixed inset-0 z-10 flex items-center justify-center select-none pointer-events-none"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div className="max-w-3xl w-full px-8">
        <h1
          data-animate
          className="text-white text-3xl font-bold tracking-tight mb-4"
        >
          {name}
        </h1>

        <p
          data-animate
          className="text-white/70 text-sm mb-8 leading-relaxed max-w-[60ch]"
        >
          {bio}
        </p>

        <div data-animate className="mb-8">
          <span className="text-white/40 text-xs uppercase tracking-widest mb-3 block">
            Links
          </span>
          <div className="flex gap-4 flex-wrap">
            {links.map((link) => (
              <a
                key={link.href}
                data-animate
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 text-sm hover:text-white transition-colors duration-200 pointer-events-auto"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {stuff.length > 0 && (
          <div>
            <span
              data-animate
              className="text-white/40 text-xs uppercase tracking-widest mb-3 block"
            >
              Stuff
            </span>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
              {stuff.map((item, i) => (
                <a
                  key={item.href}
                  data-animate
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-white transition-colors duration-200 pointer-events-auto"
                >
                  <span className="text-white/30 mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
