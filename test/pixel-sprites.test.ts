import { describe, expect, it } from "vitest";
import { SPRITES, spriteRects } from "@/lib/pixel-sprites";

describe("SPRITES", () => {
  it("includes every sprite the content mappings reference", () => {
    const referenced = ["pen", "rifle", "terminal", "phone", "robot", "wheat", "pc", "earth", "joystick"];
    for (const name of referenced) expect(SPRITES[name], name).toBeDefined();
  });

  it("every sprite is a valid 16x16 grid over its palette", () => {
    for (const [name, sprite] of Object.entries(SPRITES)) {
      expect(sprite.grid, name).toHaveLength(16);
      for (const row of sprite.grid) {
        expect(row, name).toHaveLength(16);
        for (const ch of row) {
          if (ch !== ".") expect(sprite.palette[ch], `${name}: '${ch}'`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });
});

describe("spriteRects", () => {
  it("merges horizontal runs and skips transparency", () => {
    const rects = spriteRects({
      palette: { A: "#ff0000", B: "#00ff00" },
      grid: ["AAB.", ".BBB"],
    });
    expect(rects).toEqual([
      { x: 0, y: 0, w: 2, fill: "#ff0000" },
      { x: 2, y: 0, w: 1, fill: "#00ff00" },
      { x: 1, y: 1, w: 3, fill: "#00ff00" },
    ]);
  });
});
