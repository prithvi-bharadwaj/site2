/**
 * Pure logic for the first-visit intro: the typing schedule for the greeting,
 * plus the two second acts - variant A's carriage-return line sweeps and
 * variant B's ink-develop front. No DOM access - the component harvests glyph
 * boxes, feeds them in, and draws (or masks) what comes back.
 */

export interface IntroGlyphBox {
  /** Top-left of the glyph box, in viewport coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TypingTiming {
  charMs: number;
  jitterMs: number;
  /** Extra hold after typing one of these characters. */
  pauseAfterMs: Record<string, number>;
}

export const TYPING_TIMING: TypingTiming = {
  charMs: 52,
  jitterMs: 36,
  pauseAfterMs: { ",": 420, ".": 240 },
};

/** Cumulative appearance time (ms) for each glyph, in typing order. */
export function buildTypingSchedule(
  chars: string[],
  timing: TypingTiming = TYPING_TIMING,
  rand: () => number = Math.random
): number[] {
  const times: number[] = [];
  let t = 0;
  for (const ch of chars) {
    t += timing.charMs + rand() * timing.jitterMs;
    times.push(t);
    t += timing.pauseAfterMs[ch] ?? 0;
  }
  return times;
}

/* ── Variant A: carriage return ── */

/**
 * Group glyph boxes (already sorted by y, then x) into visual lines. Wrapped
 * text is one DOM node, so line breaks only exist as jumps in glyph y.
 */
export function groupLines(boxes: IntroGlyphBox[]): number[][] {
  const lines: number[][] = [];
  let lineY = -Infinity;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (lines.length === 0 || b.y - lineY > b.h * 0.5) {
      lines.push([i]);
      lineY = b.y;
    } else {
      lines[lines.length - 1].push(i);
    }
  }
  return lines;
}

export const SWEEP = {
  /** Caret hop from the greeting's period to the bio's first line. */
  travelMs: 150,
  /** Rest beat between lines - an echo of the typing's comma cadence. */
  restMs: 120,
  /** First line's wipe speed; the writing turns fluent from there. */
  baseSpeedPxMs: 1.7,
  /** Each line sweeps this much faster than the one before. */
  accelerando: 1.28,
  minMs: 170,
  maxMs: 380,
  /** Soft ink edge riding ahead of the wipe, roughly 1ch. */
  featherPx: 14,
  /** The writer steps away: one blink, then the page takes over. */
  caretExitMs: 350,
};

export interface SweepLine {
  startMs: number;
  durationMs: number;
}

/** When each line's wipe starts and how long it runs, from sweep start. */
export function buildSweepSchedule(
  lineWidths: number[],
  o: typeof SWEEP = SWEEP
): SweepLine[] {
  const out: SweepLine[] = [];
  let t = 0;
  for (let i = 0; i < lineWidths.length; i++) {
    const speed = o.baseSpeedPxMs * Math.pow(o.accelerando, i);
    const duration = Math.min(o.maxMs, Math.max(o.minMs, lineWidths[i] / speed));
    out.push({ startMs: t, durationMs: duration });
    t += duration + o.restMs;
  }
  return out;
}

/** Eased 0..1 wipe progress for one line. */
export function sweepProgress(elapsedMs: number, line: SweepLine): number {
  const k = Math.min(1, Math.max(0, (elapsedMs - line.startMs) / line.durationMs));
  return 0.5 - Math.cos(k * Math.PI) / 2;
}

/* ── Variant B: ink develop ── */

export const DEVELOP = {
  /** How faint the undeveloped page reads. */
  ghostAlpha: 0.07,
  /** The ghost breathes in during the caret's settling blink. */
  ghostInMs: 220,
  /** The front leaves the greeting's baseline once the ghost is in. */
  frontDelayMs: 260,
  /** Decelerating sweep from the baseline to the bottom of the viewport. */
  frontMs: 1150,
  /** Soft luminance edge between full ink and ghost. */
  featherPx: 120,
  /** The caret, with nothing left to write, fades on the front's tail. */
  caretFadeMs: 450,
};

/** Ghost ink density at t ms after the develop phase starts. */
export function developGhostAlpha(elapsedMs: number, o: typeof DEVELOP = DEVELOP): number {
  return Math.min(1, Math.max(0, elapsedMs / o.ghostInMs)) * o.ghostAlpha;
}

/**
 * 0..1 travel of the develop front: leaves at typing energy, decelerates on a
 * long ease-out tail (cubic).
 */
export function developFrontProgress(elapsedMs: number, o: typeof DEVELOP = DEVELOP): number {
  const k = Math.min(1, Math.max(0, (elapsedMs - o.frontDelayMs) / o.frontMs));
  return 1 - Math.pow(1 - k, 3);
}
