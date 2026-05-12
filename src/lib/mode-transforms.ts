/**
 * Mode transforms — convert plain strings into braille / binary representations.
 *
 * Used by the page mode toggle (default | genz | braille | binary).
 * The "default" mode passes the source through untouched.
 */

const BRAILLE_MAP: Record<string, string> = {
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑",
  f: "⠋", g: "⠛", h: "⠓", i: "⠊", j: "⠚",
  k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕",
  p: "⠏", q: "⠟", r: "⠗", s: "⠎", t: "⠞",
  u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽",
  z: "⠵",
  "0": "⠚", "1": "⠁", "2": "⠃", "3": "⠉", "4": "⠙",
  "5": "⠑", "6": "⠋", "7": "⠛", "8": "⠓", "9": "⠊",
  " ": " ", "\n": "\n",
};

export function toBraille(input: string): string {
  let out = "";
  const lower = input.toLowerCase();
  for (const ch of lower) {
    out += BRAILLE_MAP[ch] ?? (/\s/.test(ch) ? ch : "⠀");
  }
  return out;
}

export function toBinary(input: string): string {
  const out: string[] = [];
  for (const ch of input) {
    if (ch === "\n") { out.push("\n"); continue; }
    if (ch === " ") { out.push(" "); continue; }
    const code = ch.charCodeAt(0);
    out.push(code.toString(2).padStart(8, "0"));
  }
  return out.join(" ");
}

export type SiteMode = "default" | "genz" | "braille" | "binary";

export function applyMode(text: string, mode: SiteMode): string {
  if (mode === "braille") return toBraille(text);
  if (mode === "binary") return toBinary(text);
  return text;
}
