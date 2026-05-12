"use client";

import { useState, useEffect, useCallback } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { LinkList, type LinkListItem } from "@/components/LinkList";
import { ModeCycle } from "@/components/ModeToggleGroup";
import { PreviouslyList } from "@/components/PreviouslyList";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import { EditPanel } from "@/components/EditPanel";
import { applyMode, type SiteMode } from "@/lib/mode-transforms";

/* ── Default content ── */

const DEFAULTS = {
  greeting: "Hey, I'm Prithvi.",
  bio: "I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to sf to keep doing it.",
  genz: `cto @ roam, building world models for 3d games + robotics. shipped 100+ games solo for voodoo and supersonic — they thought i was a studio. won buildspace out of 30k people. moved bangalore → sf. google check at 13. hacked farmville. sold hoodies to my whole school. play csgo and dota 2 (1v1 me bro).`,
};

type Content = typeof DEFAULTS;

const STORAGE_KEY = "prithvi-site-content-v3";

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

const PREVIOUSLY: LinkListItem[] = [
  {
    title: "Had an ecom merch store - i sold out my first collection to my entire batch in high school (almost got kicked out)",
  },
  {
    title: "Started a design agency that did video editing + managed socials for consumer SMBs",
  },
  {
    title: "Created a Gaming Studio",
  },
  {
    title: "Won a live gameshow from the world's largest online school for builders",
    expand: "from Buildspace, YC + a16z backed startup based in sf. 30k+ ppl and teams took part in it.",
    links: [{ label: "watch the finale", href: "https://x.com/FarzaTV/status/1719091708775059754" }],
  },
  {
    title: "Created a video game based on MrBeast in <6 weeks",
    links: [{ label: "demo video", href: "https://youtube.com", favicon: LOGO("youtube") }],
  },
  {
    title: "Built an internal genAI app that lets you go from prompt → 3d multiplayer games in minutes for Roam",
    favicon: LOGO("roam"),
    links: [{ label: "roam.lol/info", href: "https://roam.lol/info", favicon: LOGO("roam") }],
  },
  {
    title: "Made over 100+ Games for Voodoo and Supersonic",
    trailingFavicons: [LOGO("voodoo"), LOGO("supersonic")],
    links: [{ label: "gallery", href: "#" }],
  },
  {
    title: "CTO at Roam - AI lab building generative world models for games backed by Long Journey, Streamlined ventures and angels from the big 4 ai labs (OpenAI, Anthropic, GDM, xAI)",
    favicon: LOGO("roam"),
    expandFavicons: [
      LOGO("longjourney"),
      LOGO("streamlined"),
      LOGO("openai"),
      LOGO("anthropic"),
      LOGO("deepmind"),
      LOGO("xai"),
    ],
  },
];

const MINI_GAMES: LinkListItem[] = [
  { title: "Word Avalanche", href: "#" },
];

const SIDE_PROJECTS: LinkListItem[] = [
  {
    title: "Reflink — clipboard extension for WisprFlow",
    favicon: LOGO("wisprflow"),
    links: [
      { label: "github", href: "https://github.com", favicon: LOGO("github") },
      { label: "tweet", href: "https://x.com", favicon: LOGO("x") },
    ],
  },
  {
    title: "ToDo — personalized todo list app. secret to my efficiency and cure to my context switching",
    expand: "syncs to obsidian and google cal. lets agents see a log of your work.",
    links: [
      { label: "obsidian", href: "https://obsidian.md", favicon: LOGO("obsidian") },
      { label: "google cal", href: "https://calendar.google.com", favicon: LOGO("googlecal") },
    ],
  },
  {
    title: "Warden — OSS Warden clone",
  },
  {
    title: "Looksmaxxing — app that makes u feel bad about yourself and how ugly you are",
  },
  {
    title: "SerendipityMaxxing — app that lets u cold email maxx. bring your own tokens",
  },
  {
    title: "Finbite — Duolingo for finance. 10K+ downloads",
  },
];

const LORE: LinkListItem[] = [
  {
    title: "Got my first cheque from google at the age of 13",
  },
  {
    title: "Discovered an exploit in facebook games. traded unlimited farmville resources in exchange for friends doing my homework in middle school",
  },
  {
    title: "Made a viral game in college",
  },
  {
    title: "Pretended to be an entire game development studio and managed to convince the world's largest mobile game publisher to work with me as a 19y old (voodoo and supersonic)",
    trailingFavicons: [LOGO("voodoo"), LOGO("supersonic")],
  },
  {
    title: "Play competitive CSGO and Dota 2 (come 1v1 me bro). Won multiple local tournaments",
  },
];

const WRITING: LinkListItem[] = [
  { title: "the buildspace experience", meta: "jun 15, 2024", href: "https://prithvibharadwaj.substack.com/p/the-buildspace-experience", favicon: LOGO("substack") },
  { title: "Building & Skiving", meta: "jan 31, 2024", href: "https://prithvibharadwaj.substack.com/p/building-and-skiving", favicon: LOGO("substack") },
  { title: "Looking back at 2023", meta: "jan 10, 2024", href: "https://prithvibharadwaj.substack.com/p/looking-back-at-2023", favicon: LOGO("substack") },
  { title: "travel, timepass and being in the trenches", meta: "dec 5, 2023", href: "https://prithvibharadwaj.substack.com/p/travel-timepass-and-being-in-the", favicon: LOGO("substack") },
  { title: "I might have overcorrected", meta: "nov 20, 2023", href: "https://prithvibharadwaj.substack.com/p/i-might-have-overcorrected", favicon: LOGO("substack") },
  { title: "The philosophy behind \"asjbdhjasdfhgw\"", meta: "nov 1, 2023", href: "https://prithvibharadwaj.substack.com/p/the-philosophy-behind-asjbdhjasdfhgw", favicon: LOGO("substack") },
];

/* ── Edit mode toolbar ── */

function EditToolbar({ onSave, onReset, onCopy }: { onSave: () => void; onReset: () => void; onCopy: () => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center gap-2"
      style={{ animation: "word-enter 200ms ease-out" }}
    >
      <span className="text-[10px] text-[#F4F5F8]/30 mr-2">edit mode</span>
      <button
        onClick={onSave}
        className="px-3 py-1 text-xs text-[#131316] bg-[#F4F5F8]/90 hover:bg-[#F4F5F8] rounded-md transition-colors cursor-pointer"
      >
        save
      </button>
      <button
        onClick={onCopy}
        className="px-3 py-1 text-xs text-[#F4F5F8]/60 hover:text-[#F4F5F8] border border-[#F4F5F8]/15 hover:border-[#F4F5F8]/30 rounded-md transition-colors cursor-pointer"
      >
        copy
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1 text-xs text-[#F4F5F8]/40 hover:text-[#F4F5F8]/70 rounded-md transition-colors cursor-pointer"
      >
        reset
      </button>
    </div>
  );
}

/* ── Mode-transformed bullet text (for braille / binary) ── */

function StaticBullets({ items, mode, label }: { items: LinkListItem[]; mode: SiteMode; label: string }) {
  const lines = items.map((i) => `• ${i.title}`).join("\n");
  return (
    <div className="mt-10">
      <span className="text-[#F4F5F8]/35 text-xs uppercase tracking-widest block mb-4">{label}</span>
      <p
        className={`${mode === "binary" ? "font-mono text-[11px] break-all" : "text-sm"} text-[#F4F5F8]/60 leading-relaxed whitespace-pre-line`}
      >
        {applyMode(lines, mode)}
      </p>
    </div>
  );
}

/* ── Page ── */

export default function Home() {
  const [mode, setMode] = useState<SiteMode>("default");
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

  const isInteractive = mode === "default";
  const isGenZ = mode === "genz";
  const isTransformed = mode === "braille" || mode === "binary";

  return (
    <main className="relative min-h-screen">
      <BackdropRipple />

      {/* Single mode cycle switch, fixed top-right */}
      <div className="fixed top-4 right-4 z-40">
        <ModeCycle mode={mode} onChange={setMode} />
      </div>

      {editMode && (
        <EditToolbar onSave={save} onReset={reset} onCopy={copyToClipboard} />
      )}

      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
      >
        {/* Hero */}
        <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw]">
          {editMode && (
            <div className="mb-4">
              <EditPanel label="greeting" value={content.greeting} onChange={(v) => update("greeting", v)} />
              <EditPanel label="bio" value={content.bio} onChange={(v) => update("bio", v)} />
            </div>
          )}
          {isTransformed ? (
            <div className="mb-6">
              <h1 className={`${mode === "binary" ? "font-mono text-xs break-all" : "text-2xl"} text-[#F4F5F8]`}>
                {applyMode(content.greeting, mode)}
              </h1>
              <p className={`mt-3 ${mode === "binary" ? "font-mono text-[11px] break-all" : "text-sm"} text-[#F4F5F8]/60 leading-relaxed`}>
                {applyMode(content.bio, mode)}
              </p>
            </div>
          ) : (
            <PretextHero greeting={content.greeting} bio={content.bio} />
          )}
        </div>

        {/* Previously I — continuation of the bio */}
        {isInteractive && (
          <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-4">
            <PreviouslyList label="Previously I:" items={PREVIOUSLY} />
          </div>
        )}

        {isTransformed && (
          <div className="w-full max-w-3xl mx-auto md:ml-[15vw] lg:ml-[18vw]">
            <StaticBullets items={PREVIOUSLY} mode={mode} label="Previously I:" />
          </div>
        )}

        {/* GenZ TLDR */}
        {isGenZ && (
          <div className="w-full max-w-2xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 text-sm text-[#F4F5F8]/60 leading-relaxed">
            <p className="text-[#F4F5F8]/50 text-xs uppercase tracking-wider mb-2">tldr</p>
            {editMode && (
              <EditPanel label="genz tldr" value={content.genz} onChange={(v) => update("genz", v)} />
            )}
            <p>{content.genz}</p>
            <SubwaySurfersPip />
          </div>
        )}

        {/* Side projects + mini games */}
        {isInteractive && (
          <div className="w-full max-w-4xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-16">
            <LinkList label="Mini-games." items={MINI_GAMES} />
            <LinkList label="Side projects." items={SIDE_PROJECTS} />
          </div>
        )}

        {/* Lore */}
        {isInteractive && (
          <div className="w-full max-w-3xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-16 md:mt-24">
            <LinkList label="Lore." items={LORE} variant="prose" />
          </div>
        )}

        {/* Writing */}
        {isInteractive && (
          <div className="w-full max-w-4xl mx-auto md:ml-[15vw] lg:ml-[18vw] mt-16 md:mt-24 pb-32">
            <LinkList label="Writing." items={WRITING} />
          </div>
        )}

        {!isInteractive && <div className="pb-32" />}
      </div>
    </main>
  );
}
