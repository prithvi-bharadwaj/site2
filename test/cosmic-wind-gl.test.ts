import { describe, expect, it } from "vitest";
import { randomWindPalette } from "@/lib/cosmic-wind-gl";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("randomWindPalette", () => {
  it("produces three in-gamut colors and a seed, deterministically per rand", () => {
    const a = randomWindPalette(seeded(42));
    const b = randomWindPalette(seeded(42));
    expect(a).toEqual(b);
    expect(a.colors).toHaveLength(3);
    for (const rgb of a.colors) {
      for (const channel of rgb) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
    expect(a.seed).toBeGreaterThanOrEqual(0);
    expect(a.seed).toBeLessThanOrEqual(100);
  });

  it("stays in the blue-purple band (blue is the dominant channel)", () => {
    for (let seed = 1; seed < 50; seed++) {
      for (const [r, g, b] of randomWindPalette(seeded(seed)).colors) {
        expect(b).toBeGreaterThanOrEqual(r);
        expect(b).toBeGreaterThanOrEqual(g);
      }
    }
  });

  it("varies the palette across loads", () => {
    const a = randomWindPalette(seeded(1));
    const b = randomWindPalette(seeded(999));
    expect(a.colors).not.toEqual(b.colors);
  });
});
