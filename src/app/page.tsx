"use client";

import { useState, useEffect, useCallback } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { LinkList, type LinkListItem } from "@/components/LinkList";
import { GenZToggle } from "@/components/GenZToggle";
import { PreviouslyList } from "@/components/PreviouslyList";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import { EditPanel } from "@/components/EditPanel";
import { BgVideo } from "@/components/BgVideo";

/* ── Default content ── */

const DEFAULTS = {
  greeting: "Hey, I'm Prithvi.",
  bio: "I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to SF to keep doing it.",
  genz: `head of engineering @ roam, building world models for 3d games + robotics. shipped 100+ games solo for voodoo and supersonic - they thought i was a studio. won buildspace out of 30k people. moved bangalore → sf. google check at 13. hacked farmville. sold hoodies to my whole school. play csgo and dota 2 (1v1 me bro).`,
};

type Content = typeof DEFAULTS;

const STORAGE_KEY = "prithvi-site-content-v4";

function loadContent(): Content {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

/* ── Lists data ── */

const LOGO = (name: string) => `/logos/${name}_favicon.png`;
const SHOT = (name: string) => `/screenshots/${name}.png`;

const PREVIOUSLY: LinkListItem[] = [
  {
    title: "Head of Engineering at Roam - AI lab building generative world models for games. Raised $4.5M from Long Journey Ventures, Streamlined Ventures and angels from OpenAI, Anthropic, DeepMind and xAI",
    brandLinks: [
      {
        name: "Roam",
        href: "https://roam.lol",
        favicon: LOGO("roam"),
        media: {
          type: "image",
          src: SHOT("roam"),
          caption: "roam.lol - generative world models for games",
        },
      },
    ],
  },
  {
    title: "1st place, Google DeepMind × Stanford AI-Generated Game Contest (Apr 2026) - for Voxel Demolish",
    inlineLinks: [
      { phrase: "Voxel Demolish", href: "https://youtube.com/shorts/E4fyqr_semE" },
    ],
  },
  {
    title: "Made 100+ games for Voodoo and Supersonic - 200K+ downloads",
    brandLinks: [
      {
        name: "Voodoo",
        href: "https://www.voodoo.io",
        favicon: LOGO("voodoo"),
        media: {
          type: "image",
          src: SHOT("voodoo"),
          caption: "voodoo.io",
        },
      },
      {
        name: "Supersonic",
        href: "https://www.supersonic.com",
        favicon: LOGO("supersonic"),
        media: {
          type: "image",
          src: SHOT("supersonic"),
          caption: "supersonic.com",
        },
      },
    ],
  },
  {
    title: "Built an internal genAI app for Roam - prompt → 3d multiplayer game in minutes",
    brandLinks: [
      {
        name: "Roam",
        href: "https://roam.lol",
        favicon: LOGO("roam"),
        media: {
          type: "image",
          src: SHOT("roam-info"),
          caption: "roam.lol/info",
        },
      },
    ],
    links: [{ label: "roam.lol/info", href: "https://roam.lol/info", favicon: LOGO("roam") }],
  },
  {
    title: "Created a video game based on MrBeast in <6 weeks",
  },
  {
    title: "Won a live game show from Buildspace",
    inlineLinks: [
      { phrase: "live game show", href: "https://x.com/FarzaTV/status/1719091708775059754" },
      { phrase: "Buildspace", href: "https://buildspace.so/" },
    ],
  },
  {
    title: "Bootstrapped my own game studio at 19 - profitable, 10+ employees at peak, $100K+ revenue",
    inlineLinks: [
      {
        phrase: "game studio",
        href: "https://www.skive.in",
        media: {
          type: "image",
          src: SHOT("skive"),
          caption: "skive.in",
        },
      },
    ],
  },
];

const LORE: LinkListItem[] = [
  {
    title: "Got my first cheque from Google at 13",
  },
  {
    title: "Found an exploit in Facebook games - traded unlimited Farmville resources for friends doing my homework in middle school",
  },
  {
    title: "Pretended to be an entire game studio and convinced Voodoo and Supersonic to work with me at 19",
    brandLinks: [
      {
        name: "Voodoo",
        href: "https://www.voodoo.io",
        favicon: LOGO("voodoo"),
        media: {
          type: "image",
          src: SHOT("voodoo"),
          caption: "voodoo.io",
        },
      },
      {
        name: "Supersonic",
        href: "https://www.supersonic.com",
        favicon: LOGO("supersonic"),
        media: {
          type: "image",
          src: SHOT("supersonic"),
          caption: "supersonic.com",
        },
      },
    ],
  },
  {
    title: "Sold out my first merch collection to my entire batch in high school - almost got kicked out",
  },
  {
    title: "Play competitive CSGO and Dota 2 - won multiple local tournaments",
    brandLinks: [
      { name: "CSGO", href: "https://store.steampowered.com/app/730/CounterStrike_2/", favicon: "/logos/csgo.svg" },
      { name: "Dota 2", href: "https://store.steampowered.com/app/570/Dota_2/", favicon: "/logos/dota2.svg" },
    ],
  },
];

const WRITING: LinkListItem[] = [
  { title: "the buildspace experience", meta: "jun 2024", href: "https://prithvibharadwaj.substack.com/p/the-buildspace-experience", favicon: LOGO("substack") },
  { title: "antigravity IDE for unity", meta: "may 2024", href: "https://medium.com/@prithvibofficial/how-to-use-antigravity-in-unity-for-game-development-8da2cbc353cb", favicon: "/logos/medium.svg" },
  { title: "how to use cursor AI with unity", meta: "feb 2024", href: "https://medium.com/@prithvibofficial/how-to-use-cursor-ai-with-unity-a32291f9e852", favicon: "/logos/medium.svg" },
  { title: "building & skiving", meta: "jan 2024", href: "https://prithvibharadwaj.substack.com/p/building-and-skiving", favicon: LOGO("substack") },
  { title: "looking back at 2023", meta: "jan 2024", href: "https://prithvibharadwaj.substack.com/p/looking-back-at-2023", favicon: LOGO("substack") },
  { title: "travel, timepass and being in the trenches", meta: "dec 2023", href: "https://prithvibharadwaj.substack.com/p/travel-timepass-and-being-in-the", favicon: LOGO("substack") },
  { title: "i might have overcorrected", meta: "nov 2023", href: "https://prithvibharadwaj.substack.com/p/i-might-have-overcorrected", favicon: LOGO("substack") },
  { title: "the philosophy behind \"asjbdhjasdfhgw\"", meta: "nov 2023", href: "https://prithvibharadwaj.substack.com/p/the-philosophy-behind-asjbdhjasdfhgw", favicon: LOGO("substack") },
];

const SOCIALS: { label: string; href: string; favicon: string }[] = [
  { label: "Instagram", href: "https://instagram.com/prithvibofficial", favicon: "/logos/instagram.svg" },
  { label: "GitHub", href: "https://github.com/prithvi-bharadwaj", favicon: LOGO("github") },
  { label: "Twitter", href: "https://x.com/prithvibofficial", favicon: LOGO("x") },
  { label: "Medium", href: "https://medium.com/@prithvibofficial", favicon: "/logos/medium.svg" },
  { label: "Substack", href: "https://prithvibharadwaj.substack.com", favicon: LOGO("substack") },
];

/* ── Edit mode toolbar ── */

function EditToolbar({ onSave, onReset, onCopy }: { onSave: () => void; onReset: () => void; onCopy: () => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center gap-2"
      style={{ animation: "word-enter 200ms ease-out" }}
    >
      <span className="text-[10px] text-[#131316]/30 mr-2">edit mode</span>
      <button
        onClick={onSave}
        className="px-3 py-1 text-xs text-[#FFFFFF] bg-[#131316]/90 hover:bg-[#131316] rounded-md transition-colors cursor-pointer"
      >
        save
      </button>
      <button
        onClick={onCopy}
        className="px-3 py-1 text-xs text-[#131316]/60 hover:text-[#131316] border border-[#131316]/15 hover:border-[#131316]/30 rounded-md transition-colors cursor-pointer"
      >
        copy
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1 text-xs text-[#131316]/40 hover:text-[#131316]/70 rounded-md transition-colors cursor-pointer"
      >
        reset
      </button>
    </div>
  );
}

/* ── Page ── */

export default function Home() {
  const [genzMode, setGenzMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Content>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setContent(loadContent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setEditMode((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const update = useCallback((key: keyof Content, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  const reset = useCallback(() => {
    setContent(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const copyToClipboard = useCallback(() => {
    const out = Object.entries(content)
      .map(([k, v]) => `  ${k}: \`${v.replace(/`/g, "\\`")}\`,`)
      .join("\n");
    navigator.clipboard.writeText(`const CONTENT = {\n${out}\n};`);
  }, [content]);

  if (!hydrated) return null;

  return (
    <main className="relative min-h-screen">
      <BackdropRipple />

      {/* Gen Z mode toggle, fixed top-right */}
      <div className="fixed top-4 right-4 z-40">
        <GenZToggle enabled={genzMode} onChange={setGenzMode} />
      </div>

      {editMode && (
        <EditToolbar onSave={save} onReset={reset} onCopy={copyToClipboard} />
      )}

      <BgVideo />

      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
      >
        {/* Hero */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw]">
          {editMode && (
            <div className="mb-4">
              <EditPanel label="greeting" value={content.greeting} onChange={(v) => update("greeting", v)} />
              <EditPanel label="bio" value={content.bio} onChange={(v) => update("bio", v)} />
            </div>
          )}
          <PretextHero greeting={content.greeting} bio={content.bio} />
        </div>

        {/* GenZ TLDR — additive when enabled */}
        {genzMode && (
          <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 text-sm text-[#131316]/60 leading-relaxed">
            <p className="text-[#131316]/50 text-xs uppercase tracking-wider mb-2">tldr</p>
            {editMode && (
              <EditPanel label="genz tldr" value={content.genz} onChange={(v) => update("genz", v)} />
            )}
            <p>{content.genz}</p>
          </div>
        )}

        {/* Previously I — continuation of the bio */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-4">
          <PreviouslyList label="Previously:" items={PREVIOUSLY} />
        </div>

        {/* Lore */}
        <div className="w-full max-w-[min(48rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <LinkList label="Lore." items={LORE} variant="prose" pointer />
        </div>

        {/* Writing */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <LinkList label="Writing." items={WRITING} pointer />
        </div>

        {/* Socials */}
        <div className="w-full max-w-[min(56rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14 pb-24">
          <span className="text-[#131316]/35 text-xs uppercase tracking-widest block mb-4">
            Find me on.
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[#131316]/60 hover:text-[#131316] transition-colors"
              >
                <img
                  src={s.favicon}
                  alt=""
                  width={11}
                  height={11}
                  className="h-[0.7rem] w-[0.7rem] rounded-sm opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <span className="hover-underline">{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {genzMode && <SubwaySurfersPip />}
    </main>
  );
}
