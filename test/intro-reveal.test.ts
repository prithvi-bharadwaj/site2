import { describe, expect, it } from "vitest";
import {
  buildTypingSchedule,
  groupLines,
  buildSweepSchedule,
  sweepProgress,
  developGhostAlpha,
  developFrontProgress,
  TYPING_TIMING,
  SWEEP,
  DEVELOP,
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

/** Glyph boxes laid out like wrapped text: `perRow` per line, 26px leading. */
function rows(count: number, perRow: number): IntroGlyphBox[] {
  return Array.from({ length: count }, (_, i) => ({
    x: 100 + (i % perRow) * 9,
    y: 200 + Math.floor(i / perRow) * 26,
    w: 8,
    h: 20,
  }));
}

describe("groupLines", () => {
  it("splits wrapped glyphs into visual lines by baseline jumps", () => {
    const lines = groupLines(rows(50, 20));
    expect(lines.map((l) => l.length)).toEqual([20, 20, 10]);
    // Indices stay in reading order within each line.
    expect(lines[1][0]).toBe(20);
  });

  it("keeps subpixel baseline wobble on one line", () => {
    const boxes = rows(10, 10).map((b, i) => ({ ...b, y: b.y + (i % 2) * 0.4 }));
    expect(groupLines(boxes)).toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(groupLines([])).toEqual([]);
  });
});

describe("buildSweepSchedule", () => {
  const widths = [560, 560, 320];
  const sweeps = buildSweepSchedule(widths);

  it("runs lines in order with a rest beat between them", () => {
    for (let i = 1; i < sweeps.length; i++) {
      const prevEnd = sweeps[i - 1].startMs + sweeps[i - 1].durationMs;
      expect(sweeps[i].startMs - prevEnd).toBeCloseTo(SWEEP.restMs, 5);
    }
  });

  it("accelerates: equal-width lines sweep faster each time", () => {
    expect(sweeps[1].durationMs).toBeLessThan(sweeps[0].durationMs);
  });

  it("clamps durations to the taste band", () => {
    const long = buildSweepSchedule([100000])[0];
    const short = buildSweepSchedule([1])[0];
    expect(long.durationMs).toBe(SWEEP.maxMs);
    expect(short.durationMs).toBe(SWEEP.minMs);
  });
});

describe("sweepProgress", () => {
  const line = { startMs: 100, durationMs: 200 };

  it("eases from 0 to 1 across the line's window, monotonically", () => {
    expect(sweepProgress(0, line)).toBe(0);
    expect(sweepProgress(300, line)).toBe(1);
    let prev = -1;
    for (let t = 100; t <= 300; t += 10) {
      const p = sweepProgress(t, line);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe("develop", () => {
  it("ghost breathes in to its resting density and holds", () => {
    expect(developGhostAlpha(0)).toBe(0);
    expect(developGhostAlpha(DEVELOP.ghostInMs)).toBeCloseTo(DEVELOP.ghostAlpha, 5);
    expect(developGhostAlpha(10000)).toBeCloseTo(DEVELOP.ghostAlpha, 5);
  });

  it("front waits for the ghost, then decelerates to the bottom", () => {
    expect(developFrontProgress(DEVELOP.frontDelayMs)).toBe(0);
    expect(developFrontProgress(DEVELOP.frontDelayMs + DEVELOP.frontMs)).toBe(1);
    // Ease-out: the first half of the time covers most of the distance.
    const half = developFrontProgress(DEVELOP.frontDelayMs + DEVELOP.frontMs / 2);
    expect(half).toBeGreaterThan(0.7);
  });
});
