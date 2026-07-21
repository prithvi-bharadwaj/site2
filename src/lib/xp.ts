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

const STORAGE_KEY = "prithvi-xp-v1";
const FX_EVENT = "xp:fx";
const TOAST_EVENT = "xp:toast";

/** Contact links (instagram, twitter, linkedin) unlock at this xp. */
export const SOCIAL_UNLOCK_XP = 12;

export interface Level {
  name: string;
  min: number;
}

export const LEVELS: Level[] = [
  { name: "stranger", min: 0 },
  { name: "visitor", min: 5 },
  { name: "acquaintance", min: 12 },
  { name: "friend", min: 22 },
  { name: "real one", min: 35 },
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
  const before = new Set(unlockedAchievements(state).map((a) => a.id));
  state = { total: state.total + xp, earned: { ...state.earned, [id]: xp } };
  persist();
  notify();
  emitXpFx({ text: `+${xp} xp` });
  for (const a of unlockedAchievements(state)) {
    if (!before.has(a.id)) emitXpToast({ title: a.name, body: a.desc, kind: "achievement" });
  }
}

export function resetXp() {
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

const INSPECT_MS = 600;
const timers = new Map<string, number>();

/** Stable key for a hover-preview media object. */
export function mediaKey(media: HoverCardMedia): string {
  if (media.type === "youtube") return media.id;
  if (media.type === "image" || media.type === "video") return media.src;
  return media.caption ?? "note";
}

export function inspectStart(id: string, xp = 2) {
  if (typeof window === "undefined" || id in state.earned || timers.has(id)) return;
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id);
      award(id, xp);
    }, INSPECT_MS)
  );
}

export function inspectEnd(id: string) {
  const t = timers.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    timers.delete(id);
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
];

export function unlockedAchievements(s: XpState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.done(s));
}
