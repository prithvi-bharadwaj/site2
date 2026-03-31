"use client";

import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { WorkAccordion } from "@/components/WorkAccordion";
import { LabsGrid } from "@/components/LabsGrid";

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
            bio="I'm Prithvi. I've been building things on the internet since I was 13. Games, mostly. Then AI. Then companies built around both. I'm from Bangalore. I just moved to sf. I occasionally write things here. Sometimes they're accidentally good."
          />
        </div>

        <div className="w-full max-w-4xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-20 md:mt-28">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-16">
            <WorkAccordion />
            <LabsGrid />
          </div>
        </div>
      </div>
    </main>
  );
}
