"use client";

import { useState } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { WorkAccordion } from "@/components/WorkAccordion";
import { LabsGrid } from "@/components/LabsGrid";
import { GenZToggle } from "@/components/GenZToggle";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import {
  InlineDialogue,
  type DialogueSegment,
} from "@/components/InlineDialogue";
import { StorySection } from "@/components/StorySection";

const FIRST_MONEY_SEGMENTS: DialogueSegment[] = [
  { type: "text", text: "i made my first internet money from a " },
  {
    type: "trigger",
    id: "yt",
    text: "youtube channel",
    expandedText:
      'CS:GO clips and "educational content." one video hit 200k views. i clicked "monetization" because it was a big word. google sent me a cheque. $100 and change.',
    action: { label: "visit channel", href: "https://youtube.com/@prithvi" },
  },
  {
    type: "text",
    text: " at 13 — got 200k views on a video that showed ppl how to hack passwords and a check from google before ",
  },
  {
    type: "trigger",
    id: "vid",
    text: "the video got taken down",
    expandedText:
      "youtube flagged it. removed. but the cheque was already in the mail.",
    extra: (
      <div className="overflow-hidden rounded-md bg-[#e5e5e5]">
        {/* Replace with actual screenshot */}
        <div className="flex h-32 items-center justify-center text-xs text-[#131316]/40">
          screenshot.png
        </div>
      </div>
    ),
  },
];

function StorySections() {
  return (
    <>
      <InlineDialogue segments={FIRST_MONEY_SEGMENTS} />

      <StorySection id="exploit" title="">
        <p>
          around the same time, i figured out how to exploit FarmVille. got
          unlimited resources using fake accounts. leveled up 10x faster than
          anyone i knew. sold the exploit to friends in exchange for them doing
          my homework.
        </p>
        <p>
          not my proudest business model. but it was my first taste of finding
          an edge nobody else saw.
        </p>
      </StorySection>

      <StorySection id="merch" title="">
        <p>
          at 15, taught myself graphic design and started a merch store.
          designed hoodies and sold them to 150+ people — basically my entire
          school batch. figuring out suppliers, crowdsourcing consensus across
          hundreds of teenagers, and learning that logistics is the unsexy thing
          that makes everything else work.
        </p>
        <p>
          150 sales doesn&apos;t sound like a lot. but when your entire market
          is one school, that&apos;s a 100% conversion rate on everyone who
          mattered.
        </p>
      </StorySection>

      <StorySection id="agency" title="">
        <p>
          at 16, started a design agency. video editing for small businesses and
          instagram pages. grew a bunch of pages from zero to 10k followers and
          sold them. taught myself blender, made animated videos, ended up
          working with some genuinely huge instagram pages. i made videos for
          luxury puppy brands. that&apos;s not a sentence i expected to type.
        </p>
      </StorySection>

      <StorySection id="college" title="">
        <p>
          at 18, watched Billions. thought: that&apos;s fire. joined a business
          school. but i couldn&apos;t stop building on the side.
        </p>
        <p>
          one day i woke up and decided to make a game. taught myself to code,
          built a casual mobile game, published it on the play store. it blew up
          — college-blew-up. everyone i knew played it. faculty got mad because
          their sons were addicted to it.
        </p>
        <p>
          spent the rest of college learning 3D and how to code games instead of
          whatever i was supposed to be studying.
        </p>
      </StorySection>

      <StorySection id="voodoo" title="">
        <p>
          at 19, decided i wanted to make a hit mobile game. needed Voodoo —
          largest publisher at the time, billions of downloads. they said they
          only work with established studios. i had no team, no money, no social
          life to recruit from.
        </p>
        <p>
          so i taught myself everything. full-stack game dev, every role. made
          entire games solo, published them, sent them to Voodoo. after about 20
          games, they finally said yes.
        </p>
        <p>
          then discovered Supersonic. they featured one of my games in their
          internal trends report. used that as a gateway, got a better deal,
          joined them. six months later — acquired by Unity.
        </p>
        <p>
          by then i&apos;d shipped 100+ games. solo. they thought i was a
          studio. i was one person with caffeine and a system for turning ideas
          into shippable builds in under a week.
        </p>
      </StorySection>

      <StorySection id="skive" title="">
        <p>
          after the solo game dev marathon, burnt out. did some travel. then
          found Buildspace, Farza&apos;s school for builders.
        </p>
        <p>
          built Skive there. a gamified platform that connected creators with
          their gamer fans. won Buildspace S4. worked on it for two years.
          taught me more about building products people actually want than any
          class or book ever could.
        </p>
      </StorySection>

      <StorySection id="roam" title="">
        <p>
          now building Roam. joined pre-team, pre-fundraise. we&apos;re making
          the AI game engine. world models for interactive 3D gaming. games
          shouldn&apos;t need to be scripted frame by frame — they should
          understand what&apos;s happening and respond.
        </p>
        <p>
          hardest thing i&apos;ve ever worked on. also the most exciting.
        </p>
      </StorySection>

      <StorySection id="sf" title="">
        <p>
          moved here because this is where the people are who think about the
          same problems i do. AI, games, creative tools, the intersection of all
          three. bangalore will always be home. but sf is where i need to be
          right now.
        </p>
      </StorySection>
    </>
  );
}

export default function Home() {
  const [genZMode, setGenZMode] = useState(false);

  return (
    <main className="relative min-h-screen">
      <BackdropRipple />

      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
      >
        {/* Hero */}
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw]">
          <PretextHero
            greeting="Hey, I'm Prithvi."
            bio="I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to sf to keep doing it."
          />
        </div>

        {/* Story */}
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <div className="text-sm text-[#F4F5F8]/60 leading-relaxed">
            <div className="mb-6">
              <GenZToggle enabled={genZMode} onChange={setGenZMode} />
            </div>

            {genZMode ? (
              <div>
                <p className="text-[#F4F5F8]/50 text-xs uppercase tracking-wider mb-2">
                  tldr
                </p>
                <p>
                  youtube money at 13. exploited farmville. sold hoodies to my
                  entire school. ran a design agency at 16. shipped 100+ games
                  solo — publishers thought i was a studio. built skive at
                  buildspace (won S4). now building an AI game engine in sf.
                </p>
                <SubwaySurfersPip />
              </div>
            ) : (
              <div className="space-y-0">
                <StorySections />
              </div>
            )}
          </div>
        </div>

        {/* Work + Labs */}
        <div className="w-full max-w-4xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-16 md:mt-24">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-16">
            <WorkAccordion />
            <LabsGrid />
          </div>
        </div>
      </div>
    </main>
  );
}
