"use client";

import { useState, useEffect, useCallback } from "react";
import { PretextHero } from "@/components/PretextHero";
import { LinkList } from "@/components/LinkList";
import { GenZToggle } from "@/components/GenZToggle";
import { PreviouslyList } from "@/components/PreviouslyList";
import { SubwaySurfersPip } from "@/components/SubwaySurfersPip";
import { WiggleWords } from "@/components/WiggleWords";
import { CursorTrail } from "@/components/CursorTrail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EditPanel } from "@/components/EditPanel";
import { CookieQuest } from "@/components/CookieQuest";
import { XpFx } from "@/components/XpFx";
import { InspectProgress } from "@/components/InspectProgress";
import { XpHud } from "@/components/XpHud";
import { XpToasts } from "@/components/XpToasts";
import { ExitGate } from "@/components/ExitGate";
import { PhysicsLayer } from "@/components/PhysicsLayer";
import { CosmicWind } from "@/components/CosmicWind";
import { ControlPanel } from "@/components/ControlPanel";
import { IntroReveal } from "@/components/IntroReveal";
import { ReplayIntro } from "@/components/ReplayIntro";
import { CLICK_XP, SOCIAL_UNLOCK_XP, award, emitXpToast, useXp } from "@/lib/xp";
import { emitShow, emitMove, emitHide } from "@/lib/hover-card-bus";
import { trackInteraction } from "@/lib/analytics";
import {
  DEFAULTS,
  LORE,
  PREVIOUSLY,
  PROJECTS,
  SECTIONS,
  SOCIALS,
  WRITING,
  type Content,
} from "./home-content";

const STORAGE_KEY = "prithvi-site-content-v8";
const INTRO_KEY = "prithvi-intro-v1";

/* ── Intro reveal ── */

/**
 * "intro": overlay running. "handoff": overlay fading out while the page
 * staggers in. "done"/"off" differ only in whether main carries the
 * data-reveal attr that plays the stagger - "off" (replay visit, reduced
 * motion) shows the page with no ceremony.
 */
type RevealState = "intro" | "handoff" | "done" | "off";

function initialReveal(): RevealState {
  if (typeof window === "undefined") return "off";
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
    // ?intro replays the show on demand.
    if (new URLSearchParams(window.location.search).has("intro")) return "intro";
    return sessionStorage.getItem(INTRO_KEY) ? "off" : "intro";
  } catch {
    return "off";
  }
}


function loadContent(): Content {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

/** Every section shares the same column geometry. */
const COLUMN = "w-full max-w-[min(42rem,78vw)] mx-auto md:ml-[15vw] lg:ml-[18vw] scroll-mt-12";

/* ── Edit mode toolbar ── */

function EditToolbar({ onSave, onReset, onCopy }: { onSave: () => void; onReset: () => void; onCopy: () => void }) {
  return (
    <div
      data-analytics-section="editor"
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
  const [pipDismissed, setPipDismissed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Content>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [reveal, setReveal] = useState<RevealState>(initialReveal);
  const xp = useXp();

  const revealHandoff = useCallback(() => setReveal("handoff"), []);
  const revealDone = useCallback(() => {
    setReveal("done");
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setContent(loadContent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        // Tracking stays out of the updater: React may re-run updaters, which
        // double-fired this event.
        trackInteraction("edit_mode_changed", {
          enabled: !editMode,
          method: "keyboard_shortcut",
        });
        setEditMode(!editMode);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode]);

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

  const toggleGenz = useCallback((next: boolean) => {
    trackInteraction("genz_mode_changed", { enabled: next });
    setGenzMode(next);
    if (next) {
      setPipDismissed(false); // re-toggling brings the pip back
      award("genz:on", CLICK_XP);
    }
  }, []);

  const update = useCallback((key: keyof Content, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    trackInteraction("edited_content_saved");
  }, [content]);

  const reset = useCallback(() => {
    trackInteraction("edited_content_reset");
    setContent(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const copyToClipboard = useCallback(() => {
    const out = Object.entries(content)
      .map(([k, v]) => `  ${k}: \`${v.replace(/`/g, "\\`")}\`,`)
      .join("\n");
    navigator.clipboard.writeText(`const CONTENT = {\n${out}\n};`);
    trackInteraction("edited_content_copied");
  }, [content]);

  if (!hydrated) return null;

  return (
    <main
      className="relative min-h-screen"
      data-analytics-section="home"
      data-reveal={reveal === "handoff" || reveal === "done" ? "in" : undefined}
    >
      {(reveal === "intro" || reveal === "handoff") && (
        <IntroReveal onHandoff={revealHandoff} onDone={revealDone} />
      )}
      <ReplayIntro />
      <CosmicWind />
      <CursorTrail />
      <XpFx />
      <InspectProgress />
      <XpHud />
      <XpToasts />
      <ExitGate />
      <ThemeToggle />
      <PhysicsLayer />
      <ControlPanel sections={SECTIONS} genz={genzMode} onGenzChange={toggleGenz} />
      {editMode && (
        <EditToolbar onSave={save} onReset={reset} onCopy={copyToClipboard} />
      )}

      <div
        className="relative px-8 md:px-0 pt-[18vh] md:pt-[22vh]"
        style={{ zIndex: 1 }}
        data-physics-content
      >
        {/* Hero */}
        <div id="intro" className={COLUMN}>
          {editMode && (
            <div className="mb-4">
              <EditPanel label="greeting" value={content.greeting} onChange={(v) => update("greeting", v)} />
              <EditPanel label="bio" value={content.bio} onChange={(v) => update("bio", v)} />
            </div>
          )}
          <PretextHero greeting={content.greeting} bio={content.bio} />
          <CookieQuest />
        </div>

        {/* Previously */}
        <div id="previously" className={`${COLUMN} mt-10 md:mt-14`}>
          <PreviouslyList label="Previously." items={PREVIOUSLY} />
        </div>

        {/* Projects */}
        <div id="built" className={`${COLUMN} mt-10 md:mt-14`}>
          <PreviouslyList label="Shipped in 2026." items={PROJECTS} proofKind="project-proof" />
        </div>

        {/* Lore */}
        <div id="lore" className={`${COLUMN} mt-10 md:mt-14`}>
          <LinkList label="Lore." items={LORE} variant="prose" pointer xpKind="lore" />
        </div>

        {/* Writing */}
        <div id="writing" className={`${COLUMN} mt-10 md:mt-14`}>
          <LinkList label="Writing." items={WRITING} pointer xpKind="writing" />
        </div>

        {/* Socials */}
        <div id="socials" className={`${COLUMN} mt-10 md:mt-14 pb-24`}>
          <span className="text-(--ink)/35 text-xs uppercase tracking-widest block mb-6">
            <WiggleWords text="Elsewhere." />
          </span>
          <div
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
            data-analytics-section="socials"
          >
            {SOCIALS.map((s) =>
              s.contact && xp.total < SOCIAL_UNLOCK_XP ? (
                <button
                  key={s.label}
                  onClick={() => {
                    trackInteraction("locked_contact_clicked", {
                      network: s.label,
                      current_xp: xp.total,
                      required_xp: SOCIAL_UNLOCK_XP,
                    });
                    emitXpToast({
                      title: "get to know me first",
                      body: `Spend time on the site before you reach out. Hover the proof, open the lore, read the writing. Contact links unlock at ${SOCIAL_UNLOCK_XP} xp.`,
                      kind: "info",
                    });
                  }}
                  title={`unlocks at ${SOCIAL_UNLOCK_XP} xp`}
                  onPointerEnter={(e) => {
                    if (s.media && e.pointerType === "mouse") emitShow({ media: s.media, x: e.clientX, y: e.clientY });
                  }}
                  onPointerMove={(e) => {
                    if (s.media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                  }}
                  onPointerLeave={(e) => {
                    if (s.media && e.pointerType === "mouse") emitHide();
                  }}
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
                  target="_blank"
                  rel="noreferrer"
                  onPointerEnter={(e) => {
                    if (s.media && e.pointerType === "mouse") emitShow({ media: s.media, x: e.clientX, y: e.clientY });
                  }}
                  onPointerMove={(e) => {
                    if (s.media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                  }}
                  onPointerLeave={(e) => {
                    if (s.media && e.pointerType === "mouse") emitHide();
                  }}
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
            <GenZToggle enabled={genzMode} onChange={toggleGenz} />
          </div>
          {genzMode && (
            <div className="mt-4 text-sm text-(--ink)/60 leading-relaxed">
              <p className="text-(--ink)/50 text-xs uppercase tracking-wider mb-2">tldr</p>
              {editMode && (
                <EditPanel label="genz tldr" value={content.genz} onChange={(v) => update("genz", v)} />
              )}
              <p>{content.genz}</p>
              {/* Scroll room so the pip can't sit on top of the socials/tldr
                  at the bottom of the page. At 2xl it lives in the free margin. */}
              {!pipDismissed && <div aria-hidden className="h-[340px] 2xl:h-0" />}
            </div>
          )}
        </div>
      </div>

      {genzMode && !pipDismissed && (
        <SubwaySurfersPip onDismiss={() => setPipDismissed(true)} />
      )}
    </main>
  );
}
