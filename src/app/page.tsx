"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ParticleImage } from "@/components/ParticleImage";

gsap.registerPlugin(useGSAP);

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

const SOCIALS = [
  { label: "Github", href: "https://github.com/prithvi" },
  { label: "X", href: "https://x.com/prithvi" },
  { label: "LinkedIn", href: "https://linkedin.com/in/prithvi" },
] as const;

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReduced) return;

      gsap.from("[data-stagger]", {
        opacity: 0,
        y: 8,
        duration: 0.4,
        ease: "power3.out",
        stagger: 0.04,
        delay: 0.1,
      });
    },
    { scope: mainRef }
  );

  return (
    <main ref={mainRef} className="relative min-h-screen flex flex-col">
      {/* Header bar */}
      <header className="flex items-center justify-between px-8 py-6 md:px-12">
        <div data-stagger>
          <ParticleImage
            src="/images/logo.svg"
            alt="PB logo"
            width={40}
            height={34}
            targetCount={200}
            particleSize={1}
            particleColor="255,255,255"
            physics={{ repelRadius: 30, repelStrength: 4 }}
          />
        </div>
        <span data-stagger className="text-[#555] text-xs">
          v1.0.0
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 md:px-12 lg:px-24 py-12 md:py-20 max-w-5xl">
        {/* Greeting */}
        <h1 data-stagger className="text-3xl md:text-4xl font-bold text-white mb-16 md:mb-24">
          Hey
        </h1>

        {/* Info section */}
        <section className="flex flex-col md:flex-row gap-4 md:gap-16 mb-20 md:mb-28">
          <span data-stagger className="section-label shrink-0 pt-0.5">
            Info.
          </span>
          <p data-stagger className="text-sm leading-relaxed max-w-2xl text-[#aaa]">
            I&apos;m Prithvi, a developer and creative coder. I build
            things at the intersection of code and creativity — from
            interactive visuals and generative art to tools that feel
            good to use. Craft, clarity, and curiosity drive everything
            I make.
          </p>
        </section>

        {/* Labs section */}
        <section className="flex flex-col md:flex-row gap-4 md:gap-16 mb-20 md:mb-28">
          <span data-stagger className="section-label shrink-0 pt-0.5">
            Labs.
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-2 text-sm">
            {LABS.map((item, i) => (
              <div key={item.title} data-stagger>
                {item.href ? (
                  <a href={item.href} className="project-item">
                    <span className="project-number">{pad(i)}</span>
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <span className="project-item">
                    <span className="project-number">{pad(i)}</span>
                    <span>{item.title}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        data-stagger
        className="flex items-center justify-between px-8 md:px-12 py-6 text-xs text-[#555] mt-auto"
      >
        <span>Email: Prithvi at this domain</span>
        <nav className="flex gap-6">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#555] hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
