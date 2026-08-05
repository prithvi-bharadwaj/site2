import { describe, expect, it } from "vitest";
import {
  buildTypingSchedule,
  groupWords,
  buildScrambleSchedule,
  scrambleChar,
  TYPING_TIMING,
  SCRAMBLE,
  SCRAMBLE_CHARS,
  type IntroGlyphBox,
} from "@/lib/intro-reveal";

// "Hey, I'm Prithvi." as harvested glyphs (spaces never make it in).
const GREETING = [..."Hey,I'mPrithvi."];

describe("buildTypingSchedule", () => {
  it("is strictly increasing and pauses after the comma", () => {
    const times = buildTypingSchedule(GREETING, TYPING_TIMING, () => 0.5);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
    const comma = GREETING.indexOf(",");
    const plainGap = times[comma] - times[comma - 1];
    const pausedGap = times[comma + 1] - times[comma];
    expect(pausedGap - plainGap).toBeCloseTo(TYPING_TIMING.pauseAfterMs[","], 5);
  });
});

/** Glyph boxes shaped like text: tight kerning inside words, gaps between. */
function typeset(lineWords: string[][]): IntroGlyphBox[] {
  const boxes: IntroGlyphBox[] = [];
  lineWords.forEach((wordsOnLine, row) => {
    let x = 100;
    for (const word of wordsOnLine) {
      for (let c = 0; c < word.length; c++) {
        boxes.push({ x, y: 200 + row * 26, w: 8, h: 20 });
        x += 8.5; // sub-kerning gap of 0.5px inside the word
      }
      x += 5.5; // a 6px space between words
    }
  });
  return boxes;
}

describe("groupWords", () => {
  it("splits on spaces and keeps kerning gaps together", () => {
    const words = groupWords(typeset([["Games", "first."]]));
    expect(words.map((w) => w.length)).toEqual([5, 6]);
  });

  it("breaks words across line wraps", () => {
    const words = groupWords(typeset([["Then", "AI."], ["Then"]]));
    expect(words).toHaveLength(3);
    expect(words[2][0]).toBe(7);
  });

  it("handles empty input", () => {
    expect(groupWords([])).toEqual([]);
  });
});

describe("buildScrambleSchedule", () => {
  it("locks words in order, ending exactly at the resolve span", () => {
    const lockAt = buildScrambleSchedule(28);
    expect(lockAt).toHaveLength(28);
    for (let i = 1; i < lockAt.length; i++) {
      expect(lockAt[i]).toBeGreaterThan(lockAt[i - 1]);
    }
    expect(lockAt[0]).toBeGreaterThan(SCRAMBLE.fadeInMs + SCRAMBLE.holdMs);
    expect(lockAt[27]).toBeCloseTo(
      SCRAMBLE.fadeInMs + SCRAMBLE.holdMs + SCRAMBLE.resolveSpanMs,
      5
    );
  });

  it("handles zero words", () => {
    expect(buildScrambleSchedule(0)).toEqual([]);
  });
});

describe("scrambleChar", () => {
  it("is deterministic and always drawn from the charset", () => {
    for (let slot = 0; slot < 40; slot++) {
      for (let tick = 0; tick < 10; tick++) {
        const ch = scrambleChar(slot, tick);
        expect(ch).toBe(scrambleChar(slot, tick));
        expect(SCRAMBLE_CHARS).toContain(ch);
        expect(ch).not.toBe(" ");
      }
    }
  });

  it("churns: a slot rolls new characters across ticks", () => {
    const rolls = new Set(
      Array.from({ length: 20 }, (_, tick) => scrambleChar(5, tick))
    );
    expect(rolls.size).toBeGreaterThan(5);
  });

  it("shimmers: neighboring slots differ on the same tick", () => {
    const sameTick = new Set(
      Array.from({ length: 20 }, (_, slot) => scrambleChar(slot, 3))
    );
    expect(sameTick.size).toBeGreaterThan(5);
  });
});
