import { describe, expect, it } from "vitest";
import {
  buildTypingSchedule,
  pickFallingGlyph,
  spawnBurst,
  stepBurst,
  settleBurst,
  TYPING_TIMING,
  type IntroGlyphBox,
} from "@/lib/intro-reveal";

/** Deterministic LCG so the burst test can't flake. */
function makeRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

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

describe("pickFallingGlyph", () => {
  it("picks the last i - the one in Prithvi, not the period", () => {
    expect(GREETING[pickFallingGlyph(GREETING)]).toBe("i");
    expect(pickFallingGlyph(GREETING)).toBe(GREETING.lastIndexOf("i"));
  });

  it("falls back to the last glyph when there is no i", () => {
    expect(pickFallingGlyph([..."Hello."])).toBe(5);
  });
});

describe("burst", () => {
  const targets: IntroGlyphBox[] = Array.from({ length: 60 }, (_, i) => ({
    x: 100 + (i % 20) * 9,
    y: 200 + Math.floor(i / 20) * 26,
    w: 8,
    h: 24,
  }));

  it("every particle settles exactly on its target", () => {
    const particles = spawnBurst(targets, 300, 700, makeRand(7));
    const dt = 1 / 60;
    let elapsed = 0;
    while (stepBurst(particles, dt, elapsed) && elapsed < 6000) {
      elapsed += dt * 1000;
    }
    expect(elapsed).toBeLessThan(6000);
    for (let i = 0; i < particles.length; i++) {
      expect(particles[i].settled).toBe(true);
      expect(particles[i].x).toBe(targets[i].x);
      expect(particles[i].y).toBe(targets[i].y);
      expect(particles[i].angle).toBe(0);
    }
  });

  it("settleBurst snaps everything home - the skip path", () => {
    const particles = spawnBurst(targets, 300, 700, makeRand(11));
    settleBurst(particles);
    expect(stepBurst(particles, 1 / 60, 0)).toBe(false);
    expect(particles.every((p, i) => p.x === targets[i].x && p.y === targets[i].y)).toBe(true);
  });
});
