/**
 * Pure logic for the first-visit intro: the typing schedule for the greeting,
 * plus the second act - the bio fades in as a churning scramble of ASCII and
 * resolves word by word into the real text. No DOM access - the component
 * harvests glyph boxes, feeds them in, and draws what comes back.
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

/* ── The scramble ── */

/** Printable ASCII, no space - the static the words resolve out of. */
export const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

export const SCRAMBLE = {
  /** The field rises from nothing while already churning. */
  fadeInMs: 380,
  /** The static curtains down the page: rise delay per px below the top. */
  curtainMsPerPx: 0.35,
  /** Pure static before the first word commits. */
  holdMs: 220,
  /** The bio resolves at reading pace... */
  bioStepMs: 42,
  /** ...then the wave turns fluent through the sections below. */
  sectionStepMs: 10,
  /** How often each slot re-rolls its character. */
  churnMs: 70,
  /** Unresolved static sits below the real text's ink weight. */
  fieldAlpha: 0.55,
  /** The caret bows out as the static rises. */
  caretFadeMs: 320,
  /** Beat after the last word locks before the canvas hands off. */
  tailMs: 160,
};

/**
 * Group glyph boxes (already sorted by y, then x) into words. Spaces are
 * never harvested, so words are runs of boxes on one line separated by gaps
 * wider than kerning.
 */
export function groupWords(boxes: IntroGlyphBox[]): number[][] {
  const words: number[][] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const prev = boxes[i - 1];
    const sameLine = prev !== undefined && b.y - prev.y <= b.h * 0.5;
    const gap = prev === undefined ? Infinity : b.x - (prev.x + prev.w);
    if (sameLine && gap <= b.h * 0.15) {
      words[words.length - 1].push(i);
    } else {
      words.push([i]);
    }
  }
  return words;
}

/**
 * When each word locks to its real text, in ms from scramble start. The
 * first `bioWords` lock at reading pace; everything after them locks at the
 * faster section rate, one continuous wave down the page.
 */
export function buildScrambleSchedule(
  bioWords: number,
  sectionWords: number,
  o: typeof SCRAMBLE = SCRAMBLE
): number[] {
  const out: number[] = [];
  let t = o.fadeInMs + o.holdMs;
  for (let i = 0; i < bioWords; i++) out.push((t += o.bioStepMs));
  for (let i = 0; i < sectionWords; i++) out.push((t += o.sectionStepMs));
  return out;
}

/**
 * The character a slot shows on a given churn tick. Deterministic so frames
 * are reproducible: same slot + tick always rolls the same character.
 */
export function scrambleChar(
  slot: number,
  tick: number,
  chars: string = SCRAMBLE_CHARS
): string {
  let h = Math.imul(slot + 1, 2654435761) ^ Math.imul(tick + 1, 40503);
  h = (h ^ (h >>> 13)) >>> 0;
  return chars[h % chars.length];
}
