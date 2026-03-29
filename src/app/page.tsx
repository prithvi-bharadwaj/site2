"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ParticleImage } from "@/components/ParticleImage";
import { ParticleText } from "@/components/ParticleText";
import { ProjectGrid, type Project } from "@/components/ProjectGrid";

gsap.registerPlugin(useGSAP);

const PAGES = [
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
] as const;

const PROJECTS: Project[] = [
  {
    title: "ascii-render",
    description:
      "Real-time ASCII video renderer using WebGL displacement maps. Characters respond to video luminance; pointer leaves a comet-trail distortion in the field.",
    stack: ["WebGL", "GLSL", "TypeScript", "Next.js"],
    live: "/",
  },
  {
    title: "terrain-sim",
    description:
      "Procedural terrain generation with erosion simulation. Hydraulic and thermal erosion run on the GPU; outputs tileable heightmaps and normal maps.",
    stack: ["WebGPU", "WGSL", "Rust", "WASM"],
  },
  {
    title: "sequencer",
    description:
      "A browser-based step sequencer with a programmable modulation system. Each step can hold a script that manipulates neighboring steps at runtime.",
    stack: ["Web Audio API", "TypeScript", "React"],
  },
  {
    title: "sprout",
    description:
      "Minimal task manager built around the idea that context is more valuable than priority. Tasks carry context snapshots so you can re-enter flow faster.",
    stack: ["Rust", "SQLite", "Tauri", "React"],
  },
  {
    title: "lightfield",
    description:
      "Experimental renderer that approximates light field photography in the browser. Drag to shift perspective; depth-of-field computed per-pixel in GLSL.",
    stack: ["Three.js", "GLSL", "TypeScript"],
  },
];

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
        y: 10,
        duration: 0.4,
        ease: "power3.out",
        stagger: 0.06,
        delay: 0.15,
      });
    },
    { scope: mainRef }
  );

  return (
    <main ref={mainRef} className="relative min-h-screen">
      {/* Logo — top left */}
      <div className="fixed top-8 left-8 z-10">
        <ParticleImage
          src="/images/logo.svg"
          alt="PB logo"
          width={60}
          height={50}
          targetCount={300}
          particleSize={1}
          particleColor="255,255,255"
          physics={{ repelRadius: 40, repelStrength: 4 }}
        />
      </div>

      {/* Hero section */}
      <section className="min-h-screen flex items-center justify-center px-8">
        <div className="max-w-xl w-full">
          <div className="mb-12">
            {/* Greeting — "hi, " in grey, "Prithvi" in accent */}
            <div data-stagger className="flex items-center gap-2 mb-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                <span className="text-white/50">hi, i&apos;m </span>
                <span className="text-[#a78bfa]">Prithvi</span>
              </h1>
              <button
                aria-label="Hear pronunciation"
                className="text-white/20 hover:text-white/50 transition-colors mt-1"
                title="Hear pronunciation"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>
            </div>

            {/* Morphing particle tagline — minimal, slow */}
            <div data-stagger className="mb-5">
              <ParticleText
                words={["developer", "creator", "explorer"]}
                fontSize={14}
                particleSize={0.8}
                particleColor="255,255,255"
                targetCount={300}
                morphDuration={2000}
                pauseDuration={4000}
                physics={{ repelRadius: 40, repelStrength: 3 }}
              />
            </div>

            <p
              data-stagger
              className="text-white/40 text-sm leading-relaxed max-w-md"
            >
              I build things at the intersection of code and creativity.
              Craft, clarity, and tools that feel good to use.
            </p>
          </div>

          {/* Nav links */}
          <nav data-stagger>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {PAGES.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="nav-link text-white/30 text-sm"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </section>

      {/* Projects section */}
      <section className="px-8 md:px-16 pb-24 max-w-5xl mx-auto">
        <div data-stagger className="mb-8">
          <p className="text-white/20 text-xs uppercase tracking-widest">
            work
          </p>
        </div>

        <ProjectGrid projects={PROJECTS} />
      </section>

      {/* Footer flower */}
      <div data-stagger className="flex justify-center pb-12">
        <ParticleImage
          src="/images/flower.svg"
          alt="Decorative flower"
          width={100}
          height={100}
          targetCount={400}
          particleSize={1}
          particleColor="255,255,255"
          physics={{ repelRadius: 50, repelStrength: 4 }}
        />
      </div>
    </main>
  );
}
