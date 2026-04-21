"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import {
  createScrambleState,
  tickScramble,
  getScrambleText,
  hasScrambleStarted,
  type ScrambleConfig,
} from "@/lib/text-scramble";

/* ── Config ── */

const FONT_FAMILY = '"Be Vietnam Pro", sans-serif';
const FONT = `400 14px ${FONT_FAMILY}`;
const LH = 22.4;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const POS_T = `left 350ms ${EASE}, top 350ms ${EASE}`;

const SCRAMBLE: ScrambleConfig = {
  scrambleProbability: 0.95,
  binaryDuration: 35,
  asciiDuration: 70,
  maxDelay: 150,
};

// Module-level singleton canvas for text measurement — avoids per-layout allocation
let _measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (_measureCtx) return _measureCtx;
  if (typeof document === "undefined") return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = FONT;
  _measureCtx = ctx;
  return ctx;
}

/* ── Types ── */

export interface DialogueSegment {
  text: string;
  type: "text" | "trigger";
  id?: string;
  /** Full replacement sentence when this trigger is clicked */
  rewrittenSentence?: string;
  action?: { label: string; href: string };
  extra?: React.ReactNode;
}

/**
 * Parse a template string into DialogueSegment[].
 *
 * Syntax:
 *   plain text [trigger text](replacement sentence)
 *   plain text [trigger text](replacement sentence)[link label](url)
 *
 * The [link label](url) immediately after a trigger adds an action link.
 *
 * Example:
 *   "i'm building [roam](roam, an AI lab backed by LJV and Streamlined.) — an applied AI lab."
 *
 * Produces:
 *   [
 *     { type: "text", text: "i'm building " },
 *     { type: "trigger", id: "roam", text: "roam", rewrittenSentence: "roam, an AI lab backed by LJV and Streamlined." },
 *     { type: "text", text: " — an applied AI lab." },
 *   ]
 */
export function parseDialogue(template: string): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  // Match [trigger](replacement) optionally followed by [label](url)
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let triggerCount = 0;

  // First pass: find all bracket pairs and classify them
  const matches: { index: number; full: string; text: string; paren: string }[] = [];
  let m;
  while ((m = re.exec(template)) !== null) {
    matches.push({ index: m.index, full: m[0], text: m[1], paren: m[2] });
  }

  let i = 0;
  while (i < matches.length) {
    const match = matches[i];

    // Add preceding text
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: template.slice(lastIndex, match.index) });
    }

    // Check if this looks like a URL (action link) vs replacement sentence
    const isUrl = match.paren.startsWith("http") || match.paren.startsWith("/") || match.paren.startsWith("#");

    if (isUrl) {
      // Standalone link — just treat as text with the label
      segments.push({ type: "text", text: match.text });
      lastIndex = match.index + match.full.length;
      i++;
      continue;
    }

    // This is a trigger
    const id = match.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") || `trigger-${triggerCount}`;
    triggerCount++;

    const segment: DialogueSegment = {
      type: "trigger",
      id,
      text: match.text,
      rewrittenSentence: match.paren,
    };

    // Check if next match is immediately after and looks like a URL (action link)
    const nextMatch = matches[i + 1];
    if (nextMatch) {
      const gapText = template.slice(match.index + match.full.length, nextMatch.index);
      const nextIsUrl = nextMatch.paren.startsWith("http") || nextMatch.paren.startsWith("/") || nextMatch.paren.startsWith("#");
      if (gapText === "" && nextIsUrl) {
        segment.action = { label: nextMatch.text, href: nextMatch.paren };
        lastIndex = nextMatch.index + nextMatch.full.length;
        i += 2;
        segments.push(segment);
        continue;
      }
    }

    segments.push(segment);
    lastIndex = match.index + match.full.length;
    i++;
  }

  // Trailing text
  if (lastIndex < template.length) {
    segments.push({ type: "text", text: template.slice(lastIndex) });
  }

  return segments;
}

type Role = "normal" | "trigger";

interface Word {
  text: string;
  x: number;
  y: number;
  w: number;
  role: Role;
  triggerId?: string;
  key: string;
}

interface TriggerRect {
  triggerId: string;
  x: number;
  y: number;
  w: number;
  key: string;
}

/* ── Layout helpers ── */

/** Build word-role map from segments (base state only) */
function buildWordMap(segments: readonly DialogueSegment[]): { text: string; role: Role; triggerId?: string }[] {
  const out: { text: string; role: Role; triggerId?: string }[] = [];
  for (const s of segments) {
    const words = s.text.split(/\s+/).filter(w => w.length > 0);
    for (const w of words) {
      out.push({
        text: w,
        role: s.type === "trigger" ? "trigger" : "normal",
        triggerId: s.type === "trigger" ? s.id : undefined,
      });
    }
  }
  return out;
}

function layoutText(
  text: string,
  width: number,
  wordMeta?: { role: Role; triggerId?: string }[]
): { words: Word[]; height: number } {
  if (!text.trim() || width <= 0) return { words: [], height: LH };

  let prepared;
  try {
    prepared = prepareWithSegments(text, FONT);
  } catch {
    return { words: [], height: LH };
  }

  const result = layoutWithLines(prepared, width, LH);
  const ctx = getMeasureCtx();
  if (!ctx) return { words: [], height: LH };

  const words: Word[] = [];
  let wi = 0;

  for (let li = 0; li < result.lines.length; li++) {
    const lt = result.lines[li].text;
    const ly = li * LH;
    let ci = 0;

    while (ci < lt.length) {
      while (ci < lt.length && /\s/.test(lt[ci])) ci++;
      if (ci >= lt.length) break;
      const start = ci;
      while (ci < lt.length && !/\s/.test(lt[ci])) ci++;

      const wt = lt.slice(start, ci);
      const meta = wordMeta?.[wi];

      words.push({
        text: wt,
        x: ctx.measureText(lt.slice(0, start)).width,
        y: ly,
        w: ctx.measureText(wt).width,
        role: meta?.role ?? "normal",
        triggerId: meta?.triggerId,
        key: `w-${wi}`,
      });
      wi++;
    }
  }

  return { words, height: result.lines.length * LH };
}

/** Collect trigger word rects (merge multi-word triggers per line) */
function getTriggerRects(words: Word[]): TriggerRect[] {
  const groups = new Map<string, Map<number, Word[]>>();
  for (const w of words) {
    if (w.role !== "trigger" || !w.triggerId) continue;
    const li = Math.round(w.y / LH);
    if (!groups.has(w.triggerId)) groups.set(w.triggerId, new Map());
    const lines = groups.get(w.triggerId)!;
    if (!lines.has(li)) lines.set(li, []);
    lines.get(li)!.push(w);
  }
  const rects: TriggerRect[] = [];
  for (const [tid, lines] of groups) {
    for (const [li, ws] of lines) {
      const f = ws[0], l = ws[ws.length - 1];
      rects.push({ triggerId: tid, x: f.x, y: f.y, w: l.x + l.w - f.x, key: `tr-${tid}-${li}` });
    }
  }
  return rects;
}

/* ── Component ── */

export function InlineDialogue({ segments }: { segments: DialogueSegment[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [layout, setLayout] = useState<{ words: Word[]; height: number } | null>(null);

  // Scramble state — one entry per character during transition
  const scrambles = useRef<Map<string, { state: ReturnType<typeof createScrambleState>; done: boolean }>>(new Map());
  const loopRunning = useRef(false);
  const alive = useRef(true);
  const [, tick] = useState(0);

  useEffect(() => () => { alive.current = false; }, []);

  // Derive texts
  const baseText = useMemo(() => segments.map(s => s.text).join(""), [segments]);
  const baseMeta = useMemo(() => buildWordMap(segments), [segments]);

  const displayText = useMemo(() => {
    if (!activeTrigger) return baseText;
    const trigger = segments.find(s => s.id === activeTrigger);
    return trigger?.rewrittenSentence ?? baseText;
  }, [activeTrigger, segments, baseText]);

  // Layout
  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const width = el.clientWidth;
    const meta = activeTrigger ? undefined : baseMeta;
    setLayout(layoutText(displayText, width, meta));
  }, [displayText, activeTrigger, baseMeta]);

  useEffect(() => { document.fonts.ready.then(recompute); }, [recompute]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(recompute, 100); });
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, [recompute]);

  // Scramble loop
  function ensureScrambleLoop() {
    if (loopRunning.current) return;
    let hasWork = false;
    for (const [, e] of scrambles.current) { if (!e.done) { hasWork = true; break; } }
    if (!hasWork) return;

    loopRunning.current = true;
    const TICK = 25;
    function step() {
      if (!alive.current) { loopRunning.current = false; return; }
      let active = false;
      for (const [, e] of scrambles.current) {
        if (e.done) continue;
        if (tickScramble(e.state, TICK, SCRAMBLE)) active = true;
        else e.done = true;
      }
      tick(n => n + 1);
      if (active) {
        setTimeout(step, TICK);
      } else {
        loopRunning.current = false;
        setTransitioning(false);
        for (const [, e] of scrambles.current) {
          if (!e.done) { ensureScrambleLoop(); break; }
        }
      }
    }
    setTimeout(step, TICK);
  }

  // Start scramble for current layout words
  const startScramble = useCallback(() => {
    if (!layout) return;
    scrambles.current.clear();
    let charIdx = 0;
    const totalChars = layout.words.reduce((sum, w) => sum + w.text.length, 0);
    for (const w of layout.words) {
      for (let ci = 0; ci < w.text.length; ci++) {
        const ch = w.text[ci];
        scrambles.current.set(`sc-${charIdx}`, {
          state: createScrambleState(ch, charIdx, totalChars, SCRAMBLE),
          done: false,
        });
        charIdx++;
      }
    }
    ensureScrambleLoop();
  }, [layout]);

  // Kick scramble when layout changes during a transition
  useEffect(() => {
    if (transitioning && layout) {
      startScramble();
    }
  }, [transitioning, layout, startScramble]);

  // Toggle trigger
  const toggle = useCallback((id: string) => {
    if (transitioning) return;
    const isReverting = activeTrigger === id;
    setActiveTrigger(isReverting ? null : id);
    setTransitioning(true);
  }, [activeTrigger, transitioning]);

  const revert = useCallback(() => {
    if (transitioning || !activeTrigger) return;
    setActiveTrigger(null);
    setTransitioning(true);
  }, [activeTrigger, transitioning]);

  // Trigger rects (base state only)
  const triggerRects = useMemo(() => {
    if (!layout || activeTrigger) return [];
    return getTriggerRects(layout.words);
  }, [layout, activeTrigger]);

  // Active trigger segment (for action/extra)
  const activeSeg = activeTrigger ? segments.find(s => s.id === activeTrigger) : null;

  // Char-level display during scramble
  function getWordDisplay(wordIdx: number, word: Word): string {
    if (!transitioning) return word.text;
    // Count chars before this word
    let offset = 0;
    if (layout) {
      for (let i = 0; i < wordIdx; i++) offset += layout.words[i].text.length;
    }
    let result = "";
    for (let ci = 0; ci < word.text.length; ci++) {
      const entry = scrambles.current.get(`sc-${offset + ci}`);
      if (!entry || entry.done) {
        result += word.text[ci];
      } else {
        result += getScrambleText(entry.state);
      }
    }
    return result;
  }

  function isWordVisible(wordIdx: number, word: Word): boolean {
    if (!transitioning) return true;
    let offset = 0;
    if (layout) {
      for (let i = 0; i < wordIdx; i++) offset += layout.words[i].text.length;
    }
    // Word is visible once any of its chars have started
    for (let ci = 0; ci < word.text.length; ci++) {
      const entry = scrambles.current.get(`sc-${offset + ci}`);
      if (entry && hasScrambleStarted(entry.state)) return true;
    }
    return false;
  }

  /* ── Repulsion ── */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    const R = 70, F = 5;
    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) {
        const wr = w.getBoundingClientRect();
        const dx = wr.left - rect.left + wr.width / 2 - mx;
        const dy = wr.top - rect.top + wr.height / 2 - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0) {
          const t = 1 - d / R;
          w.style.transform = `translate(${(dx / d) * t * t * F}px, ${(dy / d) * t * t * F}px)`;
        } else if (w.style.transform) {
          w.style.transform = "";
        }
      }
    }
    function onLeave() {
      if (el) for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) w.style.transform = "";
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div>
      <div
        ref={ref}
        className="relative w-full"
        style={{
          height: layout ? layout.height : "auto",
          minHeight: LH,
          transition: `height 350ms ${EASE}`,
        }}
      >
        <p className="sr-only">{displayText}</p>

        {/* ── Word spans ── */}
        {layout?.words.map((w, i) => {
          const display = getWordDisplay(i, w);
          const visible = isWordVisible(i, w);
          const isTrigger = w.role === "trigger" && !activeTrigger;

          return (
            <span
              key={w.key}
              data-repel={!isTrigger ? true : undefined}
              style={{
                position: "absolute",
                left: w.x,
                top: w.y,
                color: "#F4F5F8",
                opacity: visible ? (isTrigger ? 0.9 : 0.6) : 0,
                fontSize: 14,
                fontWeight: 400,
                fontFamily: FONT_FAMILY,
                whiteSpace: "pre",
                pointerEvents: "none",
                transition: `${POS_T}, opacity 200ms ease-out${!isTrigger ? `, transform 180ms ${EASE}` : ""}`,
                ...(isTrigger ? {
                  borderBottom: "1px dotted rgba(244,245,248,0.3)",
                  paddingBottom: 1,
                } : {}),
              }}
              aria-hidden
            >
              {display}
            </span>
          );
        })}

        {/* ── Trigger overlays (base state only) ── */}
        {triggerRects.map(r => (
          <button
            key={r.key}
            onClick={() => toggle(r.triggerId)}
            className="trigger-overlay"
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.w,
              height: LH,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              zIndex: 1,
              transition: POS_T,
            }}
          />
        ))}

        {/* ── Click-to-revert overlay (rewritten state) ── */}
        {activeTrigger && !transitioning && layout && (
          <button
            onClick={revert}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: layout.height,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              zIndex: 1,
            }}
          />
        )}
      </div>

      {/* ── Action link below paragraph ── */}
      {activeTrigger && !transitioning && activeSeg?.action && (
        <div
          className="mt-2"
          style={{
            opacity: 1,
            animation: "word-enter 300ms ease-out",
          }}
        >
          <a
            href={activeSeg.action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#F4F5F8]/50 hover:text-[#F4F5F8]/80 transition-colors underline underline-offset-2"
          >
            {activeSeg.action.label} →
          </a>
        </div>
      )}

      {/* ── Extra content below paragraph ── */}
      {activeTrigger && !transitioning && activeSeg?.extra && (
        <div
          className="mt-2 overflow-hidden rounded-md"
          style={{
            opacity: 1,
            animation: "word-enter 300ms ease-out",
          }}
        >
          {activeSeg.extra}
        </div>
      )}
    </div>
  );
}
