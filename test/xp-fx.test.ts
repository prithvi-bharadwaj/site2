import { describe, expect, it } from "vitest";
import { burstTopPx } from "@/components/XpFx";

describe("burstTopPx", () => {
  const vh = 800;
  const font = 100;

  it("keeps the preferred position when no card is visible", () => {
    expect(burstTopPx(360, font, vh, null)).toBe(360);
  });

  it("keeps the preferred position when the card doesn't overlap", () => {
    expect(burstTopPx(360, font, vh, { top: 500, bottom: 700 })).toBe(360);
    expect(burstTopPx(360, font, vh, { top: 100, bottom: 350 })).toBe(360);
  });

  it("moves above a card pinned low on the screen", () => {
    // Card occupies 400-700: more room above (400) than below (100).
    expect(burstTopPx(360, font, vh, { top: 400, bottom: 700 })).toBe(400 - font - 8);
  });

  it("moves below a card pinned high on the screen", () => {
    // Card occupies 100-420: more room below (380) than above (100).
    expect(burstTopPx(360, font, vh, { top: 100, bottom: 420 })).toBe(420 + 8);
  });

  it("never leaves the viewport", () => {
    // Card covers almost everything above; clamp to the top edge.
    expect(burstTopPx(360, font, vh, { top: 60, bottom: 420 })).toBe(
      Math.min(vh - font - 8, 428)
    );
    expect(burstTopPx(360, font, vh, { top: 420, bottom: 800 })).toBe(420 - font - 8);
    expect(burstTopPx(360, font, vh, { top: 40, bottom: 790 })).toBe(8);
  });
});
