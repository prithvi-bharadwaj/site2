// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { harvestGlyphs } from "@/lib/glyph-harvest";

/**
 * jsdom has no layout, so Range/element rects come back all-zero and glyphs
 * would be culled as off-screen. Stub the rects to a fixed on-screen box -
 * these tests are about which characters get harvested, not where.
 */
const RECT = {
  x: 10,
  y: 10,
  left: 10,
  top: 10,
  right: 20,
  bottom: 20,
  width: 10,
  height: 10,
  toJSON: () => ({}),
} as DOMRect;

describe("harvestGlyphs", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    // jsdom's Range has no getBoundingClientRect at all - define, not spy.
    Range.prototype.getBoundingClientRect = vi.fn(() => RECT);
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  function harvest() {
    return harvestGlyphs(root, { height: 800, measureAscent: () => 8 });
  }

  it("keeps emoji and other non-BMP characters whole", () => {
    root.textContent = "a🔒b";
    const chars = harvest().map((g) => g.char);
    expect(chars).toEqual(["a", "🔒", "b"]);
  });

  it("keeps multi-code-point grapheme clusters whole", () => {
    root.textContent = "x👍🏽y";
    const chars = harvest().map((g) => g.char);
    expect(chars).toEqual(["x", "👍🏽", "y"]);
  });

  it("skips whitespace and records the source element", () => {
    root.innerHTML = "<span>a b</span>";
    const glyphs = harvest();
    expect(glyphs.map((g) => g.char)).toEqual(["a", "b"]);
    expect(glyphs[0].el).toBe(root.querySelector("span"));
  });
});
