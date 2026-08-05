"use client";

import type { GlyphSource } from "./letter-physics";

/**
 * Canvas drawing shared by the intro reveal and the scroll scramble: real
 * glyphs (and inline images) at their harvested positions, and scramble
 * static centered in a glyph's slot. `dy` shifts a glyph vertically from its
 * harvested position - the scroll scramble uses it to track the page as it
 * moves under the fixed canvas.
 */
export interface ScramblePainter {
  drawGlyph(g: GlyphSource, alpha: number, dy?: number): void;
  drawStatic(g: GlyphSource, ch: string, alpha: number, dy?: number): void;
}

export function createScramblePainter(ctx: CanvasRenderingContext2D): ScramblePainter {
  const widthCache = new Map<string, number>();

  function drawGlyph(g: GlyphSource, alpha: number, dy = 0) {
    ctx.globalAlpha = alpha;
    if (g.img) {
      ctx.drawImage(g.img, g.x, g.y + dy, g.w, g.h);
      return;
    }
    ctx.font = g.font;
    ctx.fillStyle = g.color;
    ctx.fillText(g.char, g.x, g.y + dy + g.ascent);
  }

  function drawStatic(g: GlyphSource, ch: string, alpha: number, dy = 0) {
    // Images have nothing to churn; they ride the static at field alpha.
    if (g.img) {
      drawGlyph(g, alpha, dy);
      return;
    }
    ctx.font = g.font;
    ctx.fillStyle = g.color;
    ctx.globalAlpha = alpha;
    const key = `${g.font}|${ch}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w = ctx.measureText(ch).width;
      widthCache.set(key, w);
    }
    ctx.fillText(ch, g.x + (g.w - w) / 2, g.y + dy + g.ascent);
  }

  return { drawGlyph, drawStatic };
}
