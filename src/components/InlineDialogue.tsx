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
const EXP_SIZE = 14 * 0.95;
const HL_OPACITY = 0.03;
const FLY_DIST = 160;
const EXIT_MS = 750;
const HL_STAGGER = 80;
const CELL = 12;
const HL_ENTER_BASE = 250;   // ms after text starts before highlight appears
const HL_ENTER_SPREAD = 450; // ms random spread for dissolve-in cells
const HL_EXIT_SPREAD = 350;  // ms random spread for dissolve-out cells

const SCRAMBLE: ScrambleConfig = {
  scrambleProbability: 0.5,
  binaryDuration: 80,
  asciiDuration: 160,
  maxDelay: 350,
};

/** Deterministic pseudo-random 0–1 from integer seed */
function noise(n: number): number {
  const s = Math.sin(n * 127.1 + n * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ── Types ── */

export interface DialogueSegment {
  text: string;
  type: "text" | "trigger";
  id?: string;
  expandedText?: string;
  action?: { label: string; href: string };
  extra?: React.ReactNode;
}

type Role = "normal" | "trigger" | "expanded" | "action";

interface Seg { text: string; id: string; role: Role; triggerId?: string; href?: string }
interface Word { text: string; x: number; y: number; w: number; role: Role; triggerId?: string; href?: string; key: string }
interface HLRect { triggerId: string; x: number; y: number; w: number; key: string; order: number }

interface CharData {
  x: number; y: number; role: Role;
  realChar: string; triggerId: string; key: string;
  idx: number; total: number;
  flyX: number; flyY: number;
}

interface HLCell {
  x: number; y: number; w: number; h: number;
  enterDelay: number; exitDelay: number;
  triggerId: string; key: string;
}

/* ── Layout helpers ── */

function buildSegs(segments: readonly DialogueSegment[], openMap: Record<string, boolean>): Seg[] {
  const out: Seg[] = [];
  let ti = 0;
  for (const s of segments) {
    if (s.type === "text") {
      out.push({ text: s.text, id: `t${ti++}`, role: "normal" });
    } else if (s.id) {
      out.push({ text: s.text, id: s.id, role: "trigger", triggerId: s.id });
      if (openMap[s.id]) {
        if (s.expandedText)
          out.push({ text: ` — ${s.expandedText}`, id: `${s.id}-exp`, role: "expanded", triggerId: s.id });
        if (s.action)
          out.push({ text: ` ${s.action.label} →`, id: `${s.id}-act`, role: "action", triggerId: s.id, href: s.action.href });
      }
    }
  }
  return out;
}

function layoutWords(segs: Seg[], width: number): { words: Word[]; height: number } {
  const fullText = segs.map(s => s.text).join("");
  if (!fullText.trim() || width <= 0) return { words: [], height: LH };
  const map: { seg: Seg; idx: number }[] = [];
  for (const seg of segs) seg.text.split(/\s+/).filter(w => w.length > 0).forEach((_, i) => map.push({ seg, idx: i }));
  let prepared;
  try { prepared = prepareWithSegments(fullText, FONT); } catch { return { words: [], height: LH }; }
  const result = layoutWithLines(prepared, width, LH);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const words: Word[] = [];
  let mi = 0;
  for (let li = 0; li < result.lines.length; li++) {
    const lt = result.lines[li].text, ly = li * LH;
    let ci = 0;
    while (ci < lt.length) {
      while (ci < lt.length && /\s/.test(lt[ci])) ci++;
      if (ci >= lt.length) break;
      const start = ci;
      while (ci < lt.length && !/\s/.test(lt[ci])) ci++;
      if (mi >= map.length) break;
      const m = map[mi], wt = lt.slice(start, ci);
      words.push({ text: wt, x: ctx.measureText(lt.slice(0, start)).width, y: ly, w: ctx.measureText(wt).width, role: m.seg.role, triggerId: m.seg.triggerId, href: m.seg.href, key: `${m.seg.id}-${m.idx}` });
      mi++;
    }
  }
  return { words, height: result.lines.length * LH };
}

function mergedHLRects(words: Word[]): HLRect[] {
  const groups = new Map<string, Map<number, Word[]>>();
  for (const w of words) {
    if (!w.triggerId) continue;
    const li = Math.round(w.y / LH);
    if (!groups.has(w.triggerId)) groups.set(w.triggerId, new Map());
    const lines = groups.get(w.triggerId)!;
    if (!lines.has(li)) lines.set(li, []);
    lines.get(li)!.push(w);
  }
  const rects: HLRect[] = [];
  for (const [tid, lines] of groups) {
    [...lines.entries()].sort((a, b) => a[0] - b[0]).forEach(([li, ws], order) => {
      const f = ws[0], l = ws[ws.length - 1];
      rects.push({ triggerId: tid, x: f.x, y: f.y, w: l.x + l.w - f.x, key: `hl-${tid}-${li}`, order });
    });
  }
  return rects;
}

function roleRects(words: Word[], role: Role): HLRect[] {
  const groups = new Map<string, Map<number, Word[]>>();
  for (const w of words) {
    if (w.role !== role || !w.triggerId) continue;
    const li = Math.round(w.y / LH);
    if (!groups.has(w.triggerId)) groups.set(w.triggerId, new Map());
    const lines = groups.get(w.triggerId)!;
    if (!lines.has(li)) lines.set(li, []);
    lines.get(li)!.push(w);
  }
  const rects: HLRect[] = [];
  for (const [tid, lines] of groups) {
    [...lines.entries()].sort((a, b) => a[0] - b[0]).forEach(([li, ws], order) => {
      const f = ws[0], l = ws[ws.length - 1];
      rects.push({ triggerId: tid, x: f.x, y: f.y, w: l.x + l.w - f.x, key: `${role}-${tid}-${li}`, order });
    });
  }
  return rects;
}

/* ── Component ── */

export function InlineDialogue({ segments }: { segments: DialogueSegment[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<{ words: Word[]; height: number } | null>(null);

  const scrambles = useRef<Map<string, { state: ReturnType<typeof createScrambleState>; done: boolean }>>(new Map());
  const loopRunning = useRef(false);
  const alive = useRef(true);
  const [, tick] = useState(0);

  useEffect(() => () => { alive.current = false; }, []);

  function ensureScrambleLoop() {
    if (loopRunning.current) return;
    loopRunning.current = true;
    const TICK = 25;
    function step() {
      if (!alive.current) { loopRunning.current = false; return; }
      let any = false;
      for (const [, e] of scrambles.current) {
        if (e.done) continue;
        if (tickScramble(e.state, TICK, SCRAMBLE)) any = true;
        else e.done = true;
      }
      tick(n => n + 1);
      if (any) setTimeout(step, TICK);
      else loopRunning.current = false;
    }
    setTimeout(step, TICK);
  }

  const toggle = useCallback((id: string) => {
    if (exitingIds.has(id)) return;
    if (openMap[id]) {
      setExitingIds(p => new Set(p).add(id));
      setTimeout(() => {
        setOpenMap(p => ({ ...p, [id]: false }));
        setExitingIds(p => { const n = new Set(p); n.delete(id); return n; });
        for (const k of scrambles.current.keys()) if (k.startsWith(`${id}-`)) scrambles.current.delete(k);
      }, EXIT_MS);
    } else {
      setOpenMap(p => ({ ...p, [id]: true }));
    }
  }, [openMap, exitingIds]);

  const segs = useMemo(() => buildSegs(segments, openMap), [segments, openMap]);
  const recompute = useCallback(() => { const el = ref.current; if (el) setLayout(layoutWords(segs, el.clientWidth)); }, [segs]);
  useEffect(() => { document.fonts.ready.then(recompute); }, [recompute]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(recompute, 100); });
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, [recompute]);

  /* ── Char positions + scatter ── */
  const charData = useMemo(() => {
    if (!layout) return [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `400 ${EXP_SIZE}px ${FONT_FAMILY}`;
    const chars: CharData[] = [];
    const byTrigger = new Map<string, CharData[]>();
    for (const w of layout.words) {
      if (w.role !== "expanded" && w.role !== "action") continue;
      const tid = w.triggerId!;
      if (!byTrigger.has(tid)) byTrigger.set(tid, []);
      for (let ci = 0; ci < w.text.length; ci++) {
        const c: CharData = {
          x: w.x + ctx.measureText(w.text.slice(0, ci)).width, y: w.y, role: w.role,
          realChar: w.text[ci], triggerId: tid, key: `${tid}-ch-${byTrigger.get(tid)!.length}`,
          idx: byTrigger.get(tid)!.length, total: 0, flyX: 0, flyY: 0,
        };
        chars.push(c); byTrigger.get(tid)!.push(c);
      }
    }
    for (const [, tc] of byTrigger) {
      if (!tc.length) continue;
      const cx = (Math.min(...tc.map(c => c.x)) + Math.max(...tc.map(c => c.x))) / 2;
      const cy = (Math.min(...tc.map(c => c.y)) + Math.max(...tc.map(c => c.y)) + LH) / 2;
      for (const c of tc) {
        c.total = tc.length;
        const dx = c.x - cx, dy = c.y + LH / 2 - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) { c.flyX = (dx / d) * FLY_DIST; c.flyY = (dy / d) * FLY_DIST; }
        else { const a = (c.idx / tc.length) * Math.PI * 2; c.flyX = Math.cos(a) * FLY_DIST; c.flyY = Math.sin(a) * FLY_DIST; }
      }
    }
    return chars;
  }, [layout]);

  /* ── Create scramble states + kick loop ── */
  useEffect(() => {
    if (!charData.length) return;
    const fresh = charData.filter(c => !exitingIds.has(c.triggerId) && !scrambles.current.has(c.key));
    if (!fresh.length) return;
    const byT = new Map<string, CharData[]>();
    for (const c of fresh) { if (!byT.has(c.triggerId)) byT.set(c.triggerId, []); byT.get(c.triggerId)!.push(c); }
    for (const [, chars] of byT) {
      for (let i = 0; i < chars.length; i++) {
        scrambles.current.set(chars[i].key, { state: createScrambleState(chars[i].realChar, i, chars.length, SCRAMBLE), done: false });
      }
    }
    ensureScrambleLoop();
  }, [charData, exitingIds]);

  /* ── Repulsion ── */
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    const R = 70, F = 5;
    function onMove(e: MouseEvent) {
      if (!el) return; const rect = el.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) {
        const wr = w.getBoundingClientRect(); const dx = wr.left - rect.left + wr.width / 2 - mx, dy = wr.top - rect.top + wr.height / 2 - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0) { const t = 1 - d / R; w.style.transform = `translate(${(dx / d) * t * t * F}px, ${(dy / d) * t * t * F}px)`; }
        else if (w.style.transform) w.style.transform = "";
      }
    }
    function onLeave() { if (el) for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) w.style.transform = ""; }
    el.addEventListener("mousemove", onMove); el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, []);

  /* ── Memoized rects ── */
  const hlRects = useMemo(() => layout ? mergedHLRects(layout.words) : [], [layout]);
  const triggerRects = useMemo(() => layout ? roleRects(layout.words, "trigger") : [], [layout]);
  const actionRects = useMemo(() => layout ? roleRects(layout.words, "action") : [], [layout]);

  /* ── Highlight dissolve cells ── */
  const hlCells = useMemo(() => {
    const cells: HLCell[] = [];
    for (const r of hlRects) {
      const pw = r.w + 16, ph = LH + 6;
      const ox = r.x - 8, oy = r.y - 3;
      const cols = Math.ceil(pw / CELL), rows = Math.ceil(ph / CELL);
      const maxOrd = hlRects.filter(h => h.triggerId === r.triggerId).length;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          cells.push({
            x: ox + col * CELL, y: oy + row * CELL,
            w: Math.min(CELL, pw - col * CELL), h: Math.min(CELL, ph - row * CELL),
            enterDelay: HL_ENTER_BASE + r.order * HL_STAGGER + noise(col * 7919 + row * 6271 + r.order * 3571) * HL_ENTER_SPREAD,
            exitDelay: (maxOrd - 1 - r.order) * HL_STAGGER + noise(col * 3571 + row * 8887 + r.order * 7919 + 1) * HL_EXIT_SPREAD,
            triggerId: r.triggerId,
            key: `hlc-${r.key}-${col}-${row}`,
          });
        }
      }
    }
    return cells;
  }, [hlRects]);

  const extras = segments.filter(s => s.type === "trigger" && s.id && openMap[s.id] && s.extra).map(s => ({ id: s.id!, node: s.extra! }));

  /* ── Render ── */

  function charDisplay(c: CharData): { ch: string; visible: boolean } {
    const entry = scrambles.current.get(c.key);
    if (!entry) return { ch: c.realChar, visible: true };
    if (entry.done) return { ch: c.realChar, visible: true };
    return { ch: getScrambleText(entry.state), visible: hasScrambleStarted(entry.state) };
  }

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height: layout ? layout.height : "auto", minHeight: LH, transition: `height 350ms ${EASE}` }}>
        <p className="sr-only">{segs.map(s => s.text).join("")}</p>

        {/* ── Noise dissolve highlight cells ── */}
        {hlCells.map(c => (
          <div
            key={c.key}
            className={exitingIds.has(c.triggerId) ? "dissolve-out" : "dissolve-in"}
            style={{
              position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h,
              background: `rgba(244, 245, 248, ${HL_OPACITY})`,
              pointerEvents: "none",
              animationDelay: `${exitingIds.has(c.triggerId) ? c.exitDelay : c.enterDelay}ms`,
            }}
          />
        ))}

        {/* ── Normal + trigger word spans ── */}
        {layout?.words.filter(w => w.role === "normal" || w.role === "trigger").map(w => (
          <span key={w.key} {...(w.role === "normal" ? { "data-repel": true } : {})}
            style={{
              position: "absolute", left: w.x, top: w.y, color: "#F4F5F8",
              opacity: w.role === "trigger" ? (openMap[w.triggerId!] ? 0.95 : 0.8) : 0.6,
              fontSize: 14, fontWeight: 400, fontFamily: FONT_FAMILY, whiteSpace: "pre", pointerEvents: "none",
              transition: `${POS_T}, opacity 200ms ease-out${w.role === "normal" ? `, transform 180ms ${EASE}` : ""}`,
            }} aria-hidden>{w.text}</span>
        ))}

        {/* ── Per-character expanded/action spans ── */}
        {charData.map(c => {
          const { ch, visible } = charDisplay(c);
          const exiting = exitingIds.has(c.triggerId);
          const step = Math.min(300 / (c.total || 1), 5);
          const entryDelay = c.idx * step;
          const exitDelay = (c.total - 1 - c.idx) * step;
          const baseOp = c.role === "action" ? 0.35 : 0.4;

          if (exiting) {
            return (
              <span key={c.key} style={{
                position: "absolute", left: c.x, top: c.y, color: "#F4F5F8", opacity: 0,
                fontSize: EXP_SIZE, fontWeight: 400, fontFamily: FONT_FAMILY,
                whiteSpace: "pre", pointerEvents: "none",
                transform: `translate(${c.flyX}px, ${c.flyY}px)`,
                transition: `transform 400ms ${EASE} ${exitDelay}ms, opacity 150ms ease-out ${exitDelay}ms`,
              }} aria-hidden>{c.realChar}</span>
            );
          }

          return (
            <span key={c.key} data-repel className="char-converge"
              style={{
                position: "absolute", left: c.x, top: c.y, color: "#F4F5F8",
                opacity: visible ? baseOp : 0,
                fontSize: EXP_SIZE, fontWeight: 400, fontFamily: FONT_FAMILY,
                whiteSpace: "pre", pointerEvents: "none",
                "--cx": `${c.flyX}px`, "--cy": `${c.flyY}px`,
                animationDelay: `${entryDelay}ms`,
                transition: `${POS_T}, opacity 200ms ease-out, transform 180ms ${EASE}`,
              } as React.CSSProperties} aria-hidden>{ch}</span>
          );
        })}

        {/* ── Trigger overlays ── */}
        {triggerRects.map(r => (
          <button key={r.key} onClick={() => toggle(r.triggerId)} className="trigger-overlay"
            style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: LH, background: "none", border: "none", padding: 0, cursor: "pointer", zIndex: 1, transition: POS_T }} />
        ))}

        {/* ── Action link overlays ── */}
        {actionRects.map(r => {
          const href = segments.find(s => s.type === "trigger" && s.id === r.triggerId)?.action?.href;
          return href ? (
            <a key={r.key} href={href} target="_blank" rel="noopener noreferrer" className="action-link-overlay"
              style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: LH, zIndex: 1, transition: POS_T }} />
          ) : null;
        })}
      </div>

      {extras.map(({ id, node }) => (
        <div key={id} className="mt-2 overflow-hidden rounded-md"
          style={{ opacity: exitingIds.has(id) ? 0 : 1, transition: "opacity 200ms ease-out", animation: exitingIds.has(id) ? undefined : "word-enter 300ms ease-out" }}>
          {node}
        </div>
      ))}
    </div>
  );
}
