"use client";

import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <BackdropRipple />
      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
      >
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw]">
          <PretextHero
            greeting="Hey"
            bio="I'm Prithvi, a developer and creative coder. I build things at the intersection of code and creativity — from interactive visuals and generative art to tools that feel good to use. Craft, clarity, and curiosity drive everything I make."
          />
        </div>
      </div>
    </main>
  );
}
