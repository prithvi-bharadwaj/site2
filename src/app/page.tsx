"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PretextHero } from "@/components/PretextHero";
import { BackdropRipple } from "@/components/BackdropRipple";
import { WorkAccordion } from "@/components/WorkAccordion";
import { LabsGrid } from "@/components/LabsGrid";
import { GenZToggle } from "@/components/GenZToggle";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import {
  InlineDialogue,
  parseDialogue,
} from "@/components/InlineDialogue";
import { EditPanel } from "@/components/EditPanel";

/* ── Default content ── */

const DEFAULTS = {
  greeting: "Hey, I'm Prithvi.",
  bio: "I keep finding ways to punch above my weight. Convinced the world's largest game publisher I was a studio at 19. Won buildspace out of 30k people. Now building world models for 3d games at Roam in sf.",
  now: `i\u2019m currently building [roam](roam, an applied AI lab backed by Long Journey Ventures and Streamlined Ventures, as well as angels from OpenAI, Anthropic, and DeepMind, building world models for 3d interactive games and simulations.)[more info](https://roam.lol/info) \u2014 an applied AI lab \u2014 as head of engineering & product.`,
  skive: `previously, i built skive \u2014 a gaming platform for content creators to make games based on their videos. signed up creators with over 50M following.`,
  publisher: `spent the rest of college learning 3d + gamedev instead of whatever i was supposed to be studying. as a 19 year old living in india, i convinced the [world\u2019s best game publisher](as a 19 year old living in india, i convinced Voodoo \u2014 i had just googled "best game publisher 2019" and they had billions of downloads. they said they only work with established studios. i had no team, no money. taught myself every role \u2014 design, dev, UA, analytics. made entire games solo. sent them in. rejected. made more. sent more. after about 20 games, they said yes. i pretended to be an established studio the entire time.)[voodoo](#) to work with me. it was [a journey](convinced the world\u2019s best game publisher to work with me. it was a journey \u2014 i would make an entire game, publish it on the store, share reviews, add analytics, pitch every game as a game changer. i didn\u2019t know how to make "great" games so i had to learn on the job \u2014 every game got better with each new idea. turned it into a proper game studio.) but i did turn it into a proper game studio.`,
  buildspace: `did buildspace\u2019s program called [nights & weekends](did buildspace\u2019s nights & weekends \u2014 a sprint where you build and ship your idea in under 6 weeks. the biggest school in the world for builders, backed by a16z and yc.)[buildspace](https://buildspace.so/raise) \u2014 i [won](did buildspace\u2019s nights & weekends \u2014 i won out of 30,000 people. got a $25k grant and an invite to sf2, their physical campus in sf. the finale was a gameshow-esque livestream where people voted live. it was a movie.)[watch the finale](https://x.com/FarzaTV/status/1719091708775059754) out of 30,000 people who participated.`,
  college: `watched [billions](watched billions \u2014 a tv series about an ambitious, ruthless billionaire working in nyc \u2014 which inspired me to study finance in college.) which inspired me to specialize in finance at college where i studied business administration. couldn\u2019t stop building on the side. woke up one day, decided to make a game. taught myself to code, published it on the play store. it [blew up](couldn\u2019t stop building on the side. woke up one day, decided to make a game. taught myself to code, published it on the play store. it blew up \u2014 faculty got mad because their sons were addicted to it.).`,
  agency: `used that exp to start a design agency \u2192 social media agency \u2192 media agency all through highschool. worked with a bunch of luxury clients \u2014 [some were adorable, literally](ran a media agency through highschool. worked with luxury clients \u2014 including 10+ videos for a brand selling teacup-sized puppies and a high end fashion line for dogs.)[foufou puppies](#).`,
  early: `got my first check from google at 13 for a [youtube channel](got my first check from google at 13 for a youtube channel where i posted clips of me 1v5-ing in competitive csgo, hacks i learned, and 3d animations i made.)[visit channel](#). had a viral video that showed people how to hack passwords, got 200k views before [the video got taken down](got my first check from google at 13 for a youtube channel. had a viral video that showed people how to hack passwords, got 200k views before youtube flagged it and took it down.). discovered an exploit on [farmville](got my first check from google at 13 for a youtube channel. discovered an exploit on farmville \u2014 facebook\u2019s most popular game \u2014 that let me generate unlimited resources. sold them to friends in exchange for getting my homework done.) during its peak \u2014 a way to generate unlimited resources that let me progress 10x faster than anyone else. had a merch store in highschool where i [designed & sold](had a merch store in highschool where i designed and sold hoodies to my entire school batch. the hard part wasn\u2019t graphic design or finding suppliers \u2014 it was getting consensus across hundreds of teenagers.) to my entire school batch, which got me in a bit of [trouble](had a merch store in highschool where i designed and sold hoodies to my entire school batch, which got me sent to the principal\u2019s office because everyone wore them over their school uniforms.).`,
  genz: `building world models for 3d games + robotics at roam. shipped 100+ games solo \u2014 publishers thought i was a studio. won buildspace out of 30k people. moved from bangalore to sf. google cheque at 13. hacked farmville. sold hoodies to my entire school.`,
};

type Content = typeof DEFAULTS;

const STORAGE_KEY = "prithvi-site-content";

function loadContent(): Content {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

/* ── Story sections ── */

const SECTION_ORDER: { key: keyof Content; label: string; className?: string }[] = [
  { key: "now", label: "now" },
  { key: "skive", label: "skive", className: "mt-10" },
  { key: "publisher", label: "publisher", className: "mt-10" },
  { key: "buildspace", label: "buildspace", className: "mt-10" },
  { key: "college", label: "college", className: "mt-10" },
  { key: "early", label: "early", className: "mt-10" },
];

function StorySections({ content, editMode, onUpdate }: { content: Content; editMode: boolean; onUpdate: (key: keyof Content, val: string) => void }) {
  return (
    <>
      {SECTION_ORDER.map(({ key, label, className }) => {
        const segments = parseDialogue(content[key]);
        return (
          <div key={key} className={className}>
            {editMode && (
              <EditPanel
                label={label}
                value={content[key]}
                onChange={(v) => onUpdate(key, v)}
              />
            )}
            <InlineDialogue segments={segments} />
          </div>
        );
      })}
    </>
  );
}

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

/* ── Page ── */

export default function Home() {
  const [genZMode, setGenZMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Content>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setContent(loadContent());
    setHydrated(true);
  }, []);

  // Cmd+E toggle
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

  // Don't render content until hydrated to avoid flash
  if (!hydrated) return null;

  return (
    <main className="relative min-h-screen">
      <BackdropRipple />

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
          <PretextHero greeting={content.greeting} bio={content.bio} />
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
                {editMode && (
                  <EditPanel label="genz tldr" value={content.genz} onChange={(v) => update("genz", v)} />
                )}
                <p>{content.genz}</p>
                <SubwaySurfersPip />
              </div>
            ) : (
              <div className="space-y-0">
                <StorySections content={content} editMode={editMode} onUpdate={update} />
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
