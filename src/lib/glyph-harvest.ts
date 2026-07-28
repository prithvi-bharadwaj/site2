"use client";

import type { GlyphSource } from "./letter-physics";

/**
 * Turns the live DOM into physics bodies: one per visible character (plus one
 * per inline image, so favicons fall too). Character boxes come from Range
 * rects, which means the glyphs start exactly where the browser drew them.
 * Only what's on screen is harvested - the rest can't be seen anyway.
 */

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CANVAS",
  "SVG",
  "IFRAME",
  "VIDEO",
  "TEXTAREA",
  "INPUT",
]);

interface StyleInfo {
  font: string;
  color: string;
  alpha: number;
  /** CSS text-transform - the DOM holds the raw text, the screen shows this. */
  transform: string;
}

export interface HarvestOptions {
  /** Viewport height. Glyphs further than `pad` outside it are skipped. */
  height: number;
  pad?: number;
  /** Baseline offset for a canvas font shorthand, measured by the caller. */
  measureAscent: (font: string) => number;
}

function skipElement(el: HTMLElement): boolean {
  return (
    SKIP_TAGS.has(el.tagName) ||
    el.hasAttribute("data-no-physics") ||
    // Screen-reader copies of visible text would double every glyph.
    el.classList.contains("sr-only")
  );
}

export function harvestGlyphs(root: HTMLElement, o: HarvestOptions): GlyphSource[] {
  const pad = o.pad ?? 60;
  const glyphs: GlyphSource[] = [];
  const range = document.createRange();
  const styleCache = new Map<Element, StyleInfo | null>();
  const alphaCache = new Map<Element, number>();
  const ascentCache = new Map<string, number>();

  /** Opacity compounds down the tree, so multiply up to the harvest root. */
  function alphaFor(el: Element): number {
    const hit = alphaCache.get(el);
    if (hit !== undefined) return hit;
    const own = parseFloat(getComputedStyle(el).opacity || "1");
    const parent = el.parentElement;
    const value = el === root || !parent ? own : own * alphaFor(parent);
    alphaCache.set(el, value);
    return value;
  }

  function styleFor(el: Element): StyleInfo | null {
    const hit = styleCache.get(el);
    if (hit !== undefined) return hit;
    const cs = getComputedStyle(el);
    let info: StyleInfo | null = null;
    const alpha = alphaFor(el);
    if (cs.visibility !== "hidden" && cs.display !== "none" && alpha > 0.02) {
      info = {
        font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        color: cs.color,
        alpha,
        transform: cs.textTransform,
      };
    }
    styleCache.set(el, info);
    return info;
  }

  function ascentFor(font: string): number {
    const hit = ascentCache.get(font);
    if (hit !== undefined) return hit;
    const value = o.measureAscent(font);
    ascentCache.set(font, value);
    return value;
  }

  function onScreen(rect: DOMRect): boolean {
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > -pad &&
      rect.top < o.height + pad
    );
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return skipElement(node as HTMLElement)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        }
        return (node.nodeValue ?? "").trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLImageElement;
      if (el.tagName !== "IMG" || !el.complete || el.naturalWidth === 0) continue;
      const rect = el.getBoundingClientRect();
      if (!onScreen(rect)) continue;
      glyphs.push({
        char: "",
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        ascent: 0,
        font: "",
        color: "",
        alpha: alphaFor(el),
        img: el,
      });
      continue;
    }

    const parent = node.parentElement;
    if (!parent) continue;
    const style = styleFor(parent);
    if (!style) continue;
    const text = node.nodeValue ?? "";
    const ascent = ascentFor(style.font);

    // Grapheme segments, not code units - indexing by UTF-16 unit splits
    // emoji like 🔒 into lone surrogates that render as duplicate junk.
    // Word starts matter only for text-transform: capitalize.
    let prev = " ";
    for (const seg of GRAPHEMES.segment(text)) {
      const raw = seg.segment;
      const atWordStart = !/[\p{L}\p{N}]/u.test(prev);
      prev = raw;
      if (!raw.trim()) continue;
      // The DOM keeps the untransformed text; the screen shows the transform.
      // Range offsets still index the raw string.
      let char = raw;
      if (style.transform === "uppercase") char = raw.toUpperCase();
      else if (style.transform === "lowercase") char = raw.toLowerCase();
      else if (style.transform === "capitalize" && atWordStart) char = raw.toUpperCase();
      range.setStart(node, seg.index);
      range.setEnd(node, seg.index + raw.length);
      const rect = range.getBoundingClientRect();
      if (!onScreen(rect)) continue;
      glyphs.push({
        char,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        ascent,
        font: style.font,
        color: style.color,
        alpha: style.alpha,
        el: parent,
      });
    }
  }

  range.detach();
  return glyphs;
}
