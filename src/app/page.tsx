"use client";

import { useState } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { WorkAccordion } from "@/components/WorkAccordion";
import { LabsGrid } from "@/components/LabsGrid";
import { StoryToggle } from "@/components/StoryToggle";
import { StorySection } from "@/components/StorySection";

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

function StorySections() {
  return (
    <>
      <StorySection id="first-money" title="First internet money.">
        <p>
          When I was 13, I started a YouTube channel. Mostly clips of my ace
          kills from CS:GO, and occasionally some educational content. One video
          hit 200k views. I clicked the &quot;monetization&quot; button because
          it was a big word and it said &quot;earnings&quot; next to it. I had no
          idea what it actually meant.
        </p>
        <p>
          Google sent me a cheque. A hundred dollars and change. My first payout
          from the internet. I was thirteen years old.
        </p>
        <p>
          That was the moment. Not because of the money. Because it meant the
          internet had no ceiling. You could just... make something, put it out
          there, and someone on the other side of the world would pay you for it.
          That felt like unlimited potential. I&apos;ve been chasing that feeling
          ever since.
        </p>
      </StorySection>

      <StorySection id="exploit" title="The exploit era.">
        <p>
          Around the same time, I figured out how to exploit FarmVille. I found a
          way to get unlimited quantities of any resource I wanted using a couple
          of fake accounts. Leveled up 10x faster than anyone I knew. Sold the
          exploit to my friends in exchange for them doing my homework.
        </p>
        <p>
          Not my proudest business model. But it was my first taste of finding an
          edge nobody else saw.
        </p>
      </StorySection>

      <StorySection id="merch" title="The merch store.">
        <p>
          At 15, I taught myself graphic design and started a merch store.
          Designed hoodies and sold them to over 150 people, basically my entire
          school batch. That meant figuring out suppliers, crowdsourcing consensus
          across hundreds of teenagers about designs and sizes, owning final
          delivery, and learning that logistics is the unsexy thing that makes
          everything else work.
        </p>
        <p>
          150 sales doesn&apos;t sound like a lot. But when your entire market is
          one school, that&apos;s a 100% conversion rate on everyone who
          mattered.
        </p>
      </StorySection>

      <StorySection id="agency" title="The design agency.">
        <p>
          At 16, I started a design agency. Video editing for small businesses
          and Instagram pages. Grew a bunch of Instagram pages from zero to 10k
          followers and sold them. Taught myself Blender, made animated videos,
          and ended up working with some genuinely huge Instagram pages. I made
          videos for luxury puppy brands. That&apos;s not a sentence I expected
          to type, but here we are.
        </p>
      </StorySection>

      <StorySection id="college" title="Business school (sort of).">
        <p>
          At 18, I watched Billions. The show about a hedge fund billionaire who
          operates like a chess player. I thought: that&apos;s fire. I should
          learn business and finance. So I joined a business school.
        </p>
        <p>
          But I couldn&apos;t stop building on the side. I&apos;d already made
          money selling stuff online. I wanted to see how far I could take it.
        </p>
        <p>
          One day I woke up and decided to make a game. Not for a client, not for
          money. Just because I loved playing games, especially competitive Dota
          2 and CS:GO. (I have a Steam trophy for a level 1000 battle pass.
          That&apos;s not a flex. That&apos;s a cry for help.)
        </p>
        <p>
          I taught myself to code, built a simple casual mobile game, and
          published it on the Google Play Store. It blew up. Not
          internet-blew-up. College-blew-up. Everyone I knew played it. People
          I&apos;d never spoken to would come up to me and brag about their high
          score. Faculty got mad because their sons were addicted to it.
        </p>
        <p>
          I spent the rest of college learning 3D and how to code games instead
          of whatever I was supposed to be studying.
        </p>
      </StorySection>

      <StorySection id="voodoo" title="The Voodoo arc.">
        <p>
          At 19, I decided I wanted to make a hit mobile game. And to do that, I
          needed to work with the best publisher in the world. That was Voodoo.
          Largest mobile gaming publisher at the time, billions of downloads.
        </p>
        <p>I reached out. They told me they only work with established game studios.</p>
        <p>
          An established studio is a team. Game designers, 3D modelers, gameplay
          programmers, sound designers, artists. I had none of that. I also had
          no money to hire anyone and no social life to recruit from. Nobody at a
          business school in Bangalore was into 3D game development.
        </p>
        <p>
          So I taught myself all of it. Full-stack game development. Every role. I
          would make entire games solo, publish them on the Play Store, and send
          them to Voodoo. If a game got a comment, I&apos;d screenshot it and
          send it to them. &quot;Hey, look, people like this game.&quot; If it
          launched at 5 stars, I&apos;d show them that too. (Totally not my mom
          boosting it with reviews.)
        </p>
        <p>
          After about 20 games, Voodoo finally said yes. They offered me an
          exclusive priority partnership, where I got paid to make games AND paid
          to not work with anyone else. That was 2021.
        </p>
        <p>
          Then I discovered Supersonic, an up-and-coming publisher whose parent
          company was ironSource (an ad mediation company). They featured one of
          my games in their internal trends report. A friend in the community
          tipped me off. I used that as a gateway to start a conversation, they
          offered a better deal, and I joined them. Six months later, they got
          acquired by Unity. That was 2022.
        </p>
        <p>
          By then I&apos;d shipped over 100 games. Solo. They thought I was a
          studio. I was one person with caffeine and a system for turning ideas
          into shippable builds in under a week.
        </p>
      </StorySection>

      <StorySection id="skive" title="Buildspace and Skive.">
        <p>
          After the solo game dev marathon, I was burnt out. Did some travel. Then
          found Buildspace, Farza&apos;s school for builders.
        </p>
        <p>
          I built Skive there. A gamified platform that connected creators with
          their gamer fans. We won Buildspace S4.
        </p>
        <p>
          Worked on it for two years. It taught me more about building products
          people actually want than any class or book ever could.
        </p>
      </StorySection>

      <StorySection id="roam" title="Roam.">
        <p>
          Now I&apos;m building Roam. Joined pre-team, pre-fundraise. We&apos;re
          making the AI game engine. World models for interactive 3D gaming. The
          idea is that games shouldn&apos;t need to be scripted frame by frame.
          They should understand what&apos;s happening and respond.
        </p>
        <p>
          It&apos;s the hardest thing I&apos;ve ever worked on. It&apos;s also
          the most exciting.
        </p>
      </StorySection>

      <StorySection id="sf" title="San Francisco.">
        <p>
          I moved here because this is where the people are who think about the
          same problems I do. AI, games, creative tools, the intersection of all
          three. Bangalore will always be home. But SF is where I need to be
          right now.
        </p>
        <p>
          I write sometimes. About building things, about what I&apos;ve learned,
          about the weird specific problems you run into when you&apos;re trying
          to make something that didn&apos;t exist before. Sometimes the writing
          is accidentally good.
        </p>
      </StorySection>
    </>
  );
}

export default function Home() {
  const [expanded, setExpanded] = useState(false);

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

        {/* TL;DR — only visible when collapsed */}
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-12 md:mt-16">
          <StoryToggle
            expanded={expanded}
            onExpandChange={setExpanded}
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
          />
        </div>

        {/* Main content grid — layout shifts based on expanded state */}
        <div
          className={`w-full mx-auto mt-20 md:mt-28 ${
            expanded
              ? "max-w-5xl md:ml-[10vw] lg:ml-[12vw]"
              : "max-w-4xl md:ml-[15vw] lg:ml-[18vw]"
          }`}
          style={{ transition: "max-width 400ms cubic-bezier(0.23, 1, 0.32, 1), margin-left 400ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        >
          <div
            className={`grid grid-cols-1 gap-12 md:gap-16 story-grid ${
              expanded
                ? "md:grid-cols-[2fr_1fr]"
                : "md:grid-cols-[1fr_2fr]"
            }`}
          >
            {/* Left column: story (when expanded) or Work (when collapsed) */}
            {expanded ? (
              <div className="max-w-2xl">
                <StorySections />
              </div>
            ) : (
              <WorkAccordion />
            )}

            {/* Right column: Work+Labs (when expanded) or Labs (when collapsed) */}
            {expanded ? (
              <div className="flex flex-col gap-12">
                <WorkAccordion />
                <LabsGrid compact />
              </div>
            ) : (
              <LabsGrid />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
