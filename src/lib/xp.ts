"use client";

/**
 * Discovery-XP store. Visitors earn XP for meaningful interactions
 * (inspecting proof, opening lore, reading writing) - never for raw clicks.
 * Each award has a stable id so nothing can be earned twice. Persisted in
 * localStorage; components subscribe via useXp(). Award/achievement moments
 * are broadcast on window as "xp:fx" for the cursor particle layer.
 */

import { useSyncExternalStore } from "react";
import type { HoverCardMedia } from "./hover-card-bus";
import { captureAnalyticsEvent, trackInteraction } from "./analytics";

const STORAGE_KEY = "prithvi-xp-v1";
const FX_EVENT = "xp:fx";
const TOAST_EVENT = "xp:toast";

/** Hovering a proof preview long enough. */
export const HOVER_XP = 10;
/** Clicking any tracked link / expanding lore. */
export const CLICK_XP = 50;

/** Contact links (instagram, twitter, linkedin) unlock at this xp. */
export const SOCIAL_UNLOCK_XP = 150;

/**
 * Rough total xp available on the site (hovers + clicks + one-offs).
 * Used for the "you've explored N%" completion stat.
 */
export const MAX_XP = 1420;

export function completionPct(total: number) {
  return Math.min(100, Math.round((total / MAX_XP) * 100));
}

/** True on devices with a real hover pointer; false on touch. Drives copy. */
export function canHover(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover)").matches;
}

export interface Level {
  name: string;
  min: number;
}

export const LEVELS: Level[] = [
  { name: "stranger", min: 0 },
  { name: "visitor", min: 60 },
  { name: "acquaintance", min: 150 },
  { name: "friend", min: 450 },
  { name: "real one", min: 900 },
];

export function levelFor(total: number): Level & { index: number; next: Level | null } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (total >= LEVELS[i].min) index = i;
  }
  return { index, ...LEVELS[index], next: LEVELS[index + 1] ?? null };
}

/** How many discoverables exist per kind - used for progress + achievements. */
export const TOTALS = { proof: 8, lore: 4, writing: 8 };

export interface XpState {
  total: number;
  /** award id -> xp granted */
  earned: Record<string, number>;
}

export interface XpFxDetail {
  text: string;
  big?: boolean;
}

export interface XpToastDetail {
  title: string;
  body: string;
  kind: "achievement" | "info";
}

const EMPTY: XpState = { total: 0, earned: {} };

function load(): XpState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as XpState;
      if (typeof parsed.total === "number" && parsed.earned) return parsed;
    }
  } catch {
    /* ignore */
  }
  return EMPTY;
}

let state: XpState = load();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function emitXpFx(detail: XpFxDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<XpFxDetail>(FX_EVENT, { detail }));
}

export function onXpFx(listener: (detail: XpFxDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<XpFxDetail>).detail);
  window.addEventListener(FX_EVENT, handler);
  return () => window.removeEventListener(FX_EVENT, handler);
}

export function emitXpToast(detail: XpToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<XpToastDetail>(TOAST_EVENT, { detail }));
}

export function onXpToast(listener: (detail: XpToastDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<XpToastDetail>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}

/** Grant xp once per id. No-op if already earned. */
export function award(id: string, xp: number) {
  if (typeof window === "undefined" || id in state.earned) return;
  const first = state.total === 0;
  const previousTotal = state.total;
  const previousLevel = levelFor(previousTotal);
  const before = new Set(unlockedAchievements(state).map((a) => a.id));
  state = { total: state.total + xp, earned: { ...state.earned, [id]: xp } };
  const nextLevel = levelFor(state.total);
  persist();
  notify();
  emitXpFx({ text: `+${xp} xp` });
  captureAnalyticsEvent("xp_earned", {
    award_id: id,
    xp,
    previous_total: previousTotal,
    total: state.total,
  });
  if (nextLevel.index > previousLevel.index) {
    captureAnalyticsEvent("level_reached", {
      level_index: nextLevel.index,
      level_name: nextLevel.name,
      total_xp: state.total,
    });
  }
  if (previousTotal < SOCIAL_UNLOCK_XP && state.total >= SOCIAL_UNLOCK_XP) {
    captureAnalyticsEvent("contact_links_unlocked", {
      total_xp: state.total,
    });
  }
  if (first) {
    emitXpToast({
      title: "you found the xp",
      body: `${canHover() ? "Hovering" : "Inspecting"} a preview pays +${HOVER_XP}, opening things pays +${CLICK_XP}. Contact links unlock at ${SOCIAL_UNLOCK_XP} xp.`,
      kind: "info",
    });
  }
  for (const a of unlockedAchievements(state)) {
    if (!before.has(a.id)) {
      captureAnalyticsEvent("achievement_unlocked", {
        achievement_id: a.id,
        achievement_name: a.name,
        achievement_description: a.desc,
        total_xp: state.total,
      });
      emitXpToast({ title: a.name, body: a.desc, kind: "achievement" });
    }
  }
}

export function resetXp() {
  trackInteraction("xp_progress_reset", {
    previous_total: state.total,
    awards_cleared: Object.keys(state.earned).length,
  });
  state = EMPTY;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useXp(): XpState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY
  );
}

/* ── Proof inspection: hover a preview long enough and it counts ── */

const INSPECT_MS = 1000;
const INSPECT_START_EVENT = "xp:inspect-start";
const INSPECT_END_EVENT = "xp:inspect-end";
const timers = new Map<string, number>();
const inspectStartedAt = new Map<string, number>();

export interface InspectDetail {
  id: string;
  ms: number;
}

export function onInspectStart(listener: (detail: InspectDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<InspectDetail>).detail);
  window.addEventListener(INSPECT_START_EVENT, handler);
  return () => window.removeEventListener(INSPECT_START_EVENT, handler);
}

export function onInspectEnd(listener: () => void) {
  window.addEventListener(INSPECT_END_EVENT, listener);
  return () => window.removeEventListener(INSPECT_END_EVENT, listener);
}

/** Stable key for a hover-preview media object. */
export function mediaKey(media: HoverCardMedia): string {
  if (media.type === "youtube") return media.id;
  if (media.type === "image" || media.type === "video") return media.src;
  return media.caption ?? "note";
}

export function inspectStart(id: string, xp = HOVER_XP) {
  if (typeof window === "undefined" || id in state.earned || timers.has(id)) return;
  inspectStartedAt.set(id, performance.now());
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id);
      const startedAt = inspectStartedAt.get(id);
      inspectStartedAt.delete(id);
      trackInteraction("proof_inspection_completed", {
        inspect_id: id,
        duration_ms: startedAt === undefined
          ? INSPECT_MS
          : Math.round(performance.now() - startedAt),
      });
      award(id, xp);
    }, INSPECT_MS)
  );
  window.dispatchEvent(
    new CustomEvent<InspectDetail>(INSPECT_START_EVENT, { detail: { id, ms: INSPECT_MS } })
  );
}

export function inspectEnd(id: string) {
  const t = timers.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    timers.delete(id);
    const startedAt = inspectStartedAt.get(id);
    inspectStartedAt.delete(id);
    trackInteraction("proof_inspection_abandoned", {
      inspect_id: id,
      duration_ms: startedAt === undefined
        ? undefined
        : Math.round(performance.now() - startedAt),
    });
    window.dispatchEvent(new Event(INSPECT_END_EVENT));
  }
}

/* ── Achievements (derived from earned ids, never stored) ── */

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  done: (s: XpState) => boolean;
}

function countPrefix(s: XpState, prefix: string) {
  return Object.keys(s.earned).filter((k) => k.startsWith(prefix)).length;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "proof-of-work",
    name: "Proof of Work",
    desc: "Inspected every receipt in Previously",
    done: (s) => countPrefix(s, "proof:") >= TOTALS.proof,
  },
  {
    id: "google-paid-me-first",
    name: "Google Paid Me First",
    desc: "Found the age-13 cheque",
    done: (s) =>
      Object.keys(s.earned).some((k) => k.startsWith("lore:") && k.includes("Google")),
  },
  {
    id: "competitive-personality",
    name: "Competitive Personality",
    desc: "Scouted both CSGO and Dota 2",
    done: (s) =>
      Object.keys(s.earned).some((k) => k.startsWith("lore-proof:") && k.includes("csgo")) &&
      Object.keys(s.earned).some((k) => k.startsWith("lore-proof:") && k.includes("dota")),
  },
  {
    id: "raised-by-the-internet",
    name: "Raised by the Internet",
    desc: "Dug up three pieces of lore",
    done: (s) => countPrefix(s, "lore:") >= 3,
  },
  {
    id: "thought-leader",
    name: "Thought Leader",
    desc: "Opened every article",
    done: (s) => countPrefix(s, "writing:") >= TOTALS.writing,
  },
  {
    id: "did-not-touch-grass",
    name: "Did Not Touch Grass",
    desc: "Enabled gen z mode",
    done: (s) => "genz:on" in s.earned,
  },
  {
    id: "touch-grass",
    name: "Touch Grass",
    desc: "Scrolled all the way to the bottom",
    done: (s) => "scroll:bottom" in s.earned,
  },
  {
    id: "quality-time",
    name: "Quality Time",
    desc: "Stuck around for a full minute",
    done: (s) => "time:60s" in s.earned,
  },
];

export function unlockedAchievements(s: XpState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.done(s));
}
