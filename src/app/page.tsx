"use client";

import { useState, useEffect, useCallback } from "react";
import { PretextHero } from "@/components/PretextHero";
import { LinkList, type LinkListItem } from "@/components/LinkList";
import { GenZToggle } from "@/components/GenZToggle";
import { PreviouslyList } from "@/components/PreviouslyList";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import { WiggleWords } from "@/components/WiggleWords";
import { CursorTrail } from "@/components/CursorTrail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditPanel } from "@/components/EditPanel";
import { XpFx } from "@/components/XpFx";
import { InspectProgress } from "@/components/InspectProgress";
import { XpHud } from "@/components/XpHud";
import { XpToasts } from "@/components/XpToasts";
import { ExitGate } from "@/components/ExitGate";
import { CLICK_XP, SOCIAL_UNLOCK_XP, award, emitXpToast, useXp } from "@/lib/xp";

/* ── Default content ── */

const DEFAULTS = {
  greeting: "Hey, I'm Prithvi.",
  bio: "I've been building things on the internet since I was 13. Games first. Then AI. Then companies around both. I moved from Bangalore to SF to keep doing it.",
  genz: `cto @ roam, building world models for 3d games + robotics. shipped 100+ games solo for voodoo and supersonic - they thought i was a studio. won buildspace out of 30k people. moved bangalore → sf. google check at 13. hacked farmville. sold hoodies to my whole school. play csgo and dota 2 (1v1 me bro).`,
};

type Content = typeof DEFAULTS;

const STORAGE_KEY = "prithvi-site-content-v8";

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
    title: "CTO at roam, an applied ai lab building generative world models for games + robotics. $4.5m raised",
    brandLinks: [
      {
        name: "roam",
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
    title: "1st place at the Google DeepMind × Stanford AI Game Contest (2026), for a genAI playcast",
    inlineLinks: [
      {
        phrase: "genAI playcast",
        href: "https://youtube.com/shorts/E4fyqr_semE",
        media: { type: "youtube", id: "E4fyqr_semE", caption: "voxel demolish" },
      },
    ],
  },
  {
    title: "Bootstrapped a game studio at 19 and made 100+ games for Voodoo and Supersonic - 200K+ downloads, six-figure revenue",
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
    title: "Built roam's prompt → 3D multiplayer game system",
    brandLinks: [
      {
        name: "roam",
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
    title: "Built a MrBeast game in six weeks",
  },
  {
    title: "Won Buildspace's live game show",
    inlineLinks: [
      {
        phrase: "live game show",
        href: "https://x.com/FarzaTV/status/1719091708775059754",
        media: { type: "image", src: SHOT("gameshow"), caption: "x.com/FarzaTV - it's time for the next chapter" },
      },
      {
        phrase: "Buildspace",
        href: "https://buildspace.so/",
        media: { type: "image", src: SHOT("buildspace"), caption: "buildspace.so - hi. this was buildspace." },
      },
    ],
  },
];

// Project titles are always links; unreleased ones point here for now.
const DEFAULT_PROJECT_URL = "https://github.com/prithvi-bharadwaj";

const PROJECTS: LinkListItem[] = [
  {
    title: "Focused - an open-source AI extension that organizes and searches your browser tabs",
    inlineLinks: [{ phrase: "Focused", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "Reflink - use your clipboard in Wispr Flow without stopping to talk",
    inlineLinks: [
      {
        phrase: "Reflink",
        href: "https://github.com/prithvi-bharadwaj/wf-reflink-extension",
        media: { type: "image", src: SHOT("reflink"), caption: "github.com/prithvi-bharadwaj/wf-reflink-extension" },
      },
    ],
  },
  {
    title: "v2p - open-source tool that turns any video into ready-to-send prompts for your AI agents",
    inlineLinks: [{ phrase: "v2p", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "AI sandbox - image + video generation with templates",
    inlineLinks: [{ phrase: "AI sandbox", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "slack huddle mcp - reads huddle transcripts + AI summaries straight from Slack",
    inlineLinks: [{ phrase: "slack huddle mcp", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "skills - my collection of AI skills i use daily",
    inlineLinks: [{ phrase: "skills", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "mcps - my collection of MCPs i use daily",
    inlineLinks: [{ phrase: "mcps", href: DEFAULT_PROJECT_URL }],
  },
  {
    title: "+ 100s more in previous years",
  },
];

const LORE: LinkListItem[] = [
  {
    title: "First cheque from Google at 13",
    expand: "For a YouTube video showing people how to hack passwords.",
    media: {
      type: "image",
      src: "/proof/youtube-password-video.png",
      wide: true,
      caption: "278,436 views before YouTube removed it",
    },
  },
  {
    title: "Hacked FarmVille for infinite resources; traded them for homework",
  },
  {
    title: "Started an e-commerce brand in high school; sold out the first merch drop to my entire batch",
    expand: "Almost got kicked out for it.",
  },
  {
    title: "Built my own PC at 17; it paid for itself in under four months",
    expand: "I started a design agency making edits, launch videos, marketing content, and social ads for businesses on Instagram.",
  },
  {
    title: "At 19, convinced Voodoo I was a five-person studio",
    expand: "I was doing the code, art, animation, and game design myself.",
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
    ],
  },
  {
    title: "Won local CSGO and Dota 2 tournaments",
    brandLinks: [
      {
        name: "CSGO",
        href: "https://store.steampowered.com/app/730/CounterStrike_2/",
        favicon: "/logos/csgo.svg",
        media: { type: "image", src: SHOT("csgo"), caption: "counter-strike 2" },
      },
      {
        name: "Dota 2",
        href: "https://store.steampowered.com/app/570/Dota_2/",
        favicon: "/logos/dota2.svg",
        media: { type: "image", src: SHOT("dota2"), caption: "dota 2" },
      },
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

// `contact: true` links are locked until the visitor earns SOCIAL_UNLOCK_XP -
// they have to get to know Prithvi before they can reach out.
const SOCIALS: { label: string; href: string; favicon: string; contact?: boolean }[] = [
  { label: "Instagram", href: "https://instagram.com/theprithvibharadwaj", favicon: "/logos/instagram.svg", contact: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/prithvibharadwaj/", favicon: "/logos/linkedin.svg", contact: true },
  { label: "Twitter", href: "https://x.com/prithvibofficial", favicon: LOGO("x"), contact: true },
  { label: "GitHub", href: "https://github.com/prithvi-bharadwaj", favicon: LOGO("github") },
  { label: "Medium", href: "https://medium.com/@prithvibofficial", favicon: "/logos/medium.svg" },
  { label: "Substack", href: "https://prithvibharadwaj.substack.com", favicon: LOGO("substack") },
];

/* ── Edit mode toolbar ── */

function EditToolbar({ onSave, onReset, onCopy }: { onSave: () => void; onReset: () => void; onCopy: () => void }) {
  return (
    <div
      className="fixed top-4 right-14 z-50 flex items-center gap-2"
      style={{ animation: "word-enter 200ms ease-out" }}
    >
      <span className="text-[10px] text-(--ink)/30 mr-2">edit mode</span>
      <button
        onClick={onSave}
        className="px-3 py-1 text-xs text-(--bg) bg-(--ink)/90 hover:bg-(--ink) rounded-md transition-colors cursor-pointer"
      >
        save
      </button>
      <button
        onClick={onCopy}
        className="px-3 py-1 text-xs text-(--ink)/60 hover:text-(--ink) border border-(--ink)/15 hover:border-(--ink)/30 rounded-md transition-colors cursor-pointer"
      >
        copy
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1 text-xs text-(--ink)/40 hover:text-(--ink)/70 rounded-md transition-colors cursor-pointer"
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
  const xp = useXp();

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

  useEffect(() => {
    function onScroll() {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 60) {
        award("scroll:bottom", CLICK_XP);
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dwell reward: 60 visible seconds on the site (tab-away time doesn't count).
  useEffect(() => {
    let seconds = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seconds += 1;
      if (seconds >= 60) {
        window.clearInterval(timer);
        award("time:60s", CLICK_XP);
      }
    }, 1000);
    return () => window.clearInterval(timer);
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
      <CursorTrail />
      <XpFx />
      <InspectProgress />
      <XpHud />
      <XpToasts />
      <ExitGate />
      <ThemeToggle />
      {editMode && (
        <EditToolbar onSave={save} onReset={reset} onCopy={copyToClipboard} />
      )}

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

        {/* Previously */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <PreviouslyList label="Previously." items={PREVIOUSLY} />
        </div>

        {/* Projects */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <PreviouslyList label="In 2026 I built." items={PROJECTS} />
        </div>

        {/* Lore */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <LinkList label="Lore." items={LORE} variant="prose" pointer xpKind="lore" />
        </div>

        {/* Writing */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14">
          <LinkList label="Writing." items={WRITING} pointer xpKind="writing" />
        </div>

        {/* Socials */}
        <div className="w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] mt-10 md:mt-14 pb-24">
          <span className="text-(--ink)/35 text-xs uppercase tracking-widest block mb-6">
            <WiggleWords text="Find me on." />
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SOCIALS.map((s) =>
              s.contact && xp.total < SOCIAL_UNLOCK_XP ? (
                <button
                  key={s.label}
                  onClick={() =>
                    emitXpToast({
                      title: "get to know me first",
                      body: `Spend time on the site before you reach out. Hover the proof, open the lore, read the writing. Contact links unlock at ${SOCIAL_UNLOCK_XP} xp.`,
                      kind: "info",
                    })
                  }
                  title={`unlocks at ${SOCIAL_UNLOCK_XP} xp`}
                  className="group inline-flex cursor-pointer items-center gap-1.5 text-(--ink)/40 transition-colors hover:text-(--ink)/60"
                >
                  <img
                    src={s.favicon}
                    alt=""
                    width={11}
                    height={11}
                    className="h-[0.7rem] w-[0.7rem] rounded-sm opacity-40"
                    style={{ filter: "grayscale(1)" }}
                  />
                  <span className="select-none blur-[3px]">{s.label}</span>
                  <span className="text-[10px] opacity-60">🔒</span>
                </button>
              ) : (
                <a
                  key={s.label}
                  href={s.href}
                  className="group inline-flex items-center gap-1.5 text-(--ink)/60 hover:text-(--ink) transition-colors"
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
              )
            )}
          </div>

          {/* Gen z mode - footer easter egg */}
          <div className="mt-10">
            <GenZToggle
              enabled={genzMode}
              onChange={(v) => {
                setGenzMode(v);
                if (v) award("genz:on", CLICK_XP);
              }}
            />
          </div>
          {genzMode && (
            <div className="mt-4 text-sm text-(--ink)/60 leading-relaxed">
              <p className="text-(--ink)/50 text-xs uppercase tracking-wider mb-2">tldr</p>
              {editMode && (
                <EditPanel label="genz tldr" value={content.genz} onChange={(v) => update("genz", v)} />
              )}
              <p>{content.genz}</p>
            </div>
          )}
        </div>
      </div>

      {genzMode && <SubwaySurfersPip />}
    </main>
  );
}
