import { describe, expect, it } from "vitest";
import { SPRITE_SVGS } from "@/lib/cursor-sprites";

describe("SPRITE_SVGS", () => {
  it("includes every sprite the content mappings reference", () => {
    const referenced = ["pen", "rifle", "terminal", "phone", "robot", "wheat", "pc", "earth", "joystick"];
    for (const name of referenced) expect(SPRITE_SVGS[name], name).toBeDefined();
  });

  it("every sprite is a self-contained 48-viewBox svg with no active content", () => {
    for (const [name, svg] of Object.entries(SPRITE_SVGS)) {
      expect(svg, name).toMatch(/^<svg[^>]*viewBox="0 0 48 48"/);
      expect(svg.trim(), name).toMatch(/<\/svg>$/);
      expect(svg, name).not.toMatch(/<script|<image|href=|url\(http|on[a-z]+=/i);
    }
  });
});
