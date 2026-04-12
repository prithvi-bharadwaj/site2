"use client";

import { useState, useCallback } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { WorkAccordion } from "@/components/WorkAccordion";
import { LabsGrid } from "@/components/LabsGrid";
import { StoryToggle } from "@/components/StoryToggle";

function storyLink(
  text: string,
  id: string,
  expandToSection: (id: string) => void
) {
  return (
    <button
      key={id}
      onClick={() => expandToSection(id)}
      className="text-[#F4F5F8]/80 hover:text-[#F4F5F8] hover-underline transition-colors duration-200 cursor-pointer inline"
      style={{ background: "none", border: "none", padding: 0, font: "inherit" }}
    >
      {text}
    </button>
  );
}

export default function Home() {
  const [expanded, setExpanded] = useState(false);

  const handleExpandChange = useCallback((next: boolean) => {
    setExpanded(next);
  }, []);

  return (
    <main className="relative min-h-screen">
      <BackdropRipple />
      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
      >
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw]">
          <PretextHero
            greeting="Hey, I'm Prithvi."
            bio="I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to San Francisco to keep doing it."
          />
        </div>

        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-12 md:mt-16">
          <StoryToggle
            onExpandChange={handleExpandChange}
            tldr={(expandToSection) => (
              <p>
                I&apos;ve been shipping things on the internet since I was 13.
                Started with a{" "}
                {storyLink("YouTube channel", "first-money", expandToSection)}{" "}
                that accidentally made me $100, sold{" "}
                {storyLink("150 hoodies", "merch", expandToSection)} to my
                entire school, ran a{" "}
                {storyLink("design agency", "agency", expandToSection)} at 16,
                then shipped{" "}
                {storyLink("100+ mobile games", "voodoo", expandToSection)} solo
                for Voodoo and Supersonic — they thought I was a studio. Built{" "}
                {storyLink("Skive", "skive", expandToSection)} at Buildspace
                (won S4). Now building{" "}
                {storyLink("Roam", "roam", expandToSection)}, the AI game
                engine.
              </p>
            )}
          >
            <p className="text-sm text-[#F4F5F8]/40 leading-relaxed">
              Placeholder: full story will go here.
            </p>
          </StoryToggle>
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
