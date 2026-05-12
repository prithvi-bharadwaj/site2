import { describe, it, expect } from "vitest";
import { toBraille, toBinary, applyMode } from "@/lib/mode-transforms";

describe("toBraille", () => {
  it("maps lowercase letters", () => {
    expect(toBraille("abc")).toBe("⠁⠃⠉");
  });

  it("preserves spaces and newlines", () => {
    expect(toBraille("a b\nc")).toBe("⠁ ⠃\n⠉");
  });

  it("normalizes case", () => {
    expect(toBraille("AbC")).toBe(toBraille("abc"));
  });

  it("falls back to a placeholder cell for unknown chars", () => {
    expect(toBraille("!")).toBe("⠀");
  });
});

describe("toBinary", () => {
  it("encodes ASCII as 8-bit codepoints separated by spaces", () => {
    expect(toBinary("A")).toBe("01000001");
    expect(toBinary("AB")).toBe("01000001 01000010");
  });

  it("preserves spaces between encoded chars", () => {
    expect(toBinary("a b")).toContain("01100001");
    expect(toBinary("a b")).toContain("01100010");
  });

  it("preserves newlines between encoded chars", () => {
    const out = toBinary("a\nb");
    expect(out).toContain("01100001");
    expect(out).toContain("\n");
    expect(out).toContain("01100010");
  });
});

describe("applyMode", () => {
  it("passes through on default and genz modes", () => {
    expect(applyMode("hello", "default")).toBe("hello");
    expect(applyMode("hello", "genz")).toBe("hello");
  });

  it("dispatches to braille and binary", () => {
    expect(applyMode("a", "braille")).toBe("⠁");
    expect(applyMode("A", "binary")).toBe("01000001");
  });
});
