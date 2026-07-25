import { describe, expect, it } from "vitest";
import { burstTopPx } from "@/components/XpFx";

// Mirrors the constants in XpFx: line-height 1.62, xp-burst drifts -80px,
// drops in from +10px, 8px edge pad.
describe("burstTopPx", () => {
  const vh = 800;
  const font = 100;
  const textH = font * 1.62; // 162

  it("keeps the preferred position when no card is visible", () => {
    expect(burstTopPx(360, font, vh, null)).toBe(360);
  });

  it("keeps the preferred position when the animated band clears the card", () => {
    // Band over the burst's lifetime: [360 - 80, 360 + 162 + 10] = [280, 532].
    expect(burstTopPx(360, font, vh, { top: 540, bottom: 700 })).toBe(360);
    expect(burstTopPx(360, font, vh, { top: 100, bottom: 275 })).toBe(360);
  });

  it("moves above a card pinned low, clear of the drop-in frame", () => {
    // Card 540-700 doesn't overlap; card 500-700 does (532 > 500).
    expect(burstTopPx(360, font, vh, { top: 500, bottom: 700 })).toBe(500 - textH - 10 - 8);
  });

  it("moves below a card pinned high, clear of the upward drift", () => {
    // Card 100-300: more room below (500) than above (100).
    expect(burstTopPx(360, font, vh, { top: 100, bottom: 300 })).toBe(300 + 80 + 8);
  });

  it("never leaves the viewport", () => {
    // Above placement clamps to the top edge pad.
    expect(burstTopPx(360, font, vh, { top: 120, bottom: 790 })).toBe(8);
    // Below placement clamps to the bottom edge.
    expect(burstTopPx(360, font, vh, { top: 40, bottom: 700 })).toBe(vh - textH - 8);
  });
});
