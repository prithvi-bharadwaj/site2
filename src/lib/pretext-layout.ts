/**
 * Wrapper around @chenglou/pretext that takes hero content sections
 * and produces absolutely-positioned word data for DOM rendering.
 *
 * Each section (heading, tagline, body, nav) is laid out sequentially
 * with vertical spacing between them.
 */

import {
  prepareWithSegments,
  layoutWithLines,
  type PreparedTextWithSegments,
  type LayoutLine,
} from "@chenglou/pretext";

export type BlockType =
  | "heading"
  | "accent"
  | "tagline"
  | "body"
  | "label"
  | "link";

export interface TextBlock {
  text: string;
  type: BlockType;
  href?: string;
  color?: string;
  baseOpacity?: number;
}

export interface PositionedWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  block: TextBlock;
  lineIndex: number;
  key: string;
}

export interface SectionConfig {
  blocks: TextBlock[];
  /** CSS font shorthand (must match what's in the DOM) */
  font: string;
  fontSize: number;
  lineHeight: number;
  /** Extra spacing after this section */
  marginBottom: number;
}

export interface HeroLayoutConfig {
  sections: SectionConfig[];
  containerWidth: number;
}

export interface HeroLayoutResult {
  words: PositionedWord[];
  totalHeight: number;
}

/** Style defaults per block type (monospace theme) */
const BLOCK_DEFAULTS: Record<BlockType, { color: string; baseOpacity: number }> = {
  heading: { color: "#ffffff", baseOpacity: 1.0 },
  accent: { color: "#ffffff", baseOpacity: 1.0 },
  tagline: { color: "#cccccc", baseOpacity: 0.9 },
  body: { color: "#aaaaaa", baseOpacity: 0.7 },
  label: { color: "#666666", baseOpacity: 0.5 },
  link: { color: "#888888", baseOpacity: 0.6 },
};

/**
 * Split a LayoutLine's text into individual words with x-offsets.
 * Uses a canvas to measure each word's width for precise positioning.
 */
function splitLineIntoWords(
  line: LayoutLine,
  lineX: number,
  lineY: number,
  lineHeight: number,
  font: string,
  block: TextBlock,
  lineIndex: number,
  sectionIndex: number,
  blockIndex: number
): PositionedWord[] {
  const words: PositionedWord[] = [];
  const text = line.text;

  // Use canvas to measure word positions within the line
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;

  // Split on whitespace boundaries, keeping track of position
  const parts = text.split(/(\s+)/);
  let xOffset = 0;

  for (let p = 0; p < parts.length; p++) {
    const part = parts[p];
    if (!part) continue;

    const partWidth = ctx.measureText(part).width;

    // Skip pure whitespace chunks
    if (/^\s+$/.test(part)) {
      xOffset += partWidth;
      continue;
    }

    const defaults = BLOCK_DEFAULTS[block.type];

    words.push({
      text: part,
      x: lineX + xOffset,
      y: lineY,
      width: partWidth,
      height: lineHeight,
      block: {
        ...block,
        color: block.color ?? defaults.color,
        baseOpacity: block.baseOpacity ?? defaults.baseOpacity,
      },
      lineIndex,
      key: `s${sectionIndex}-b${blockIndex}-l${lineIndex}-w${p}`,
    });

    xOffset += partWidth;
  }

  return words;
}

/**
 * Split text into individual characters with positions.
 * Used for fine-grained displacement on names.
 */
function splitLineIntoChars(
  line: LayoutLine,
  lineX: number,
  lineY: number,
  lineHeight: number,
  font: string,
  block: TextBlock,
  lineIndex: number,
  sectionIndex: number,
  blockIndex: number
): PositionedWord[] {
  const chars: PositionedWord[] = [];
  const text = line.text;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;

  let xOffset = 0;
  const defaults = BLOCK_DEFAULTS[block.type];

  for (let c = 0; c < text.length; c++) {
    const ch = text[c];
    const charWidth = ctx.measureText(ch).width;

    if (ch === " ") {
      xOffset += charWidth;
      continue;
    }

    chars.push({
      text: ch,
      x: lineX + xOffset,
      y: lineY,
      width: charWidth,
      height: lineHeight,
      block: {
        ...block,
        color: block.color ?? defaults.color,
        baseOpacity: block.baseOpacity ?? defaults.baseOpacity,
      },
      lineIndex,
      key: `s${sectionIndex}-b${blockIndex}-l${lineIndex}-c${c}`,
    });

    xOffset += charWidth;
  }

  return chars;
}

/**
 * Check if a section has multiple inline blocks (heading + accent on same line).
 */
function isInlineSection(blocks: TextBlock[]): boolean {
  if (blocks.length <= 1) return false;
  // Heading + accent blocks are always inline
  if (blocks.some((b) => b.type === "heading" || b.type === "accent")) return true;
  // Multiple link blocks are inline (nav links)
  if (blocks.every((b) => b.type === "link")) return true;
  return false;
}

/**
 * Layout inline blocks on a single line (e.g., "hi, i'm " + "Prithvi").
 * Uses canvas measureText for positioning, returns positioned words/chars.
 */
function layoutInlineBlocks(
  blocks: TextBlock[],
  font: string,
  lineHeight: number,
  currentY: number,
  sectionIndex: number
): PositionedWord[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;

  const words: PositionedWord[] = [];
  let xOffset = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const text = block.text;
    if (!text) continue;

    const isCharLevel = block.type === "accent";
    const defaults = BLOCK_DEFAULTS[block.type];
    const styledBlock = {
      ...block,
      color: block.color ?? defaults.color,
      baseOpacity: block.baseOpacity ?? defaults.baseOpacity,
    };

    if (isCharLevel) {
      // Per-character for the name
      for (let c = 0; c < text.length; c++) {
        const ch = text[c];
        const charWidth = ctx.measureText(ch).width;

        if (ch === " ") {
          xOffset += charWidth;
          continue;
        }

        words.push({
          text: ch,
          x: xOffset,
          y: currentY,
          width: charWidth,
          height: lineHeight,
          block: styledBlock,
          lineIndex: 0,
          key: `s${sectionIndex}-b${bi}-c${c}`,
        });
        xOffset += charWidth;
      }
    } else {
      // Per-word for the greeting
      const parts = text.split(/(\s+)/);
      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        if (!part) continue;
        const partWidth = ctx.measureText(part).width;

        if (/^\s+$/.test(part)) {
          xOffset += partWidth;
          continue;
        }

        words.push({
          text: part,
          x: xOffset,
          y: currentY,
          width: partWidth,
          height: lineHeight,
          block: styledBlock,
          lineIndex: 0,
          key: `s${sectionIndex}-b${bi}-w${p}`,
        });
        xOffset += partWidth;
      }
    }
  }

  return words;
}

/**
 * Layout all hero sections using pretext for line breaking,
 * then split into positioned words/chars for DOM rendering.
 */
export function layoutHero(config: HeroLayoutConfig): HeroLayoutResult {
  const { sections, containerWidth } = config;
  const allWords: PositionedWord[] = [];
  let currentY = 0;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const { blocks, font, lineHeight, marginBottom } = section;

    const sectionStartY = currentY;

    // Handle inline sections (heading + accent on same line)
    if (isInlineSection(blocks)) {
      const inlineWords = layoutInlineBlocks(
        blocks,
        font,
        lineHeight,
        currentY,
        si
      );
      allWords.push(...inlineWords);
      currentY += lineHeight;
    } else {
      // Standard layout: each block uses pretext for line breaking
      for (let bi = 0; bi < blocks.length; bi++) {
        const block = blocks[bi];
        const text = block.text;

        if (!text.trim()) continue;

        let prepared: PreparedTextWithSegments;
        try {
          prepared = prepareWithSegments(text, font);
        } catch {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          ctx.font = font;
          const width = ctx.measureText(text).width;

          const defaults = BLOCK_DEFAULTS[block.type];
          allWords.push({
            text,
            x: 0,
            y: currentY,
            width,
            height: lineHeight,
            block: {
              ...block,
              color: block.color ?? defaults.color,
              baseOpacity: block.baseOpacity ?? defaults.baseOpacity,
            },
            lineIndex: 0,
            key: `s${si}-b${bi}-fallback`,
          });
          currentY += lineHeight;
          continue;
        }

        const result = layoutWithLines(prepared, containerWidth, lineHeight);

        for (let li = 0; li < result.lines.length; li++) {
          const line = result.lines[li];
          const isCharLevel = block.type === "accent";

          const positioned = isCharLevel
            ? splitLineIntoChars(
                line, 0, currentY, lineHeight, font, block, li, si, bi
              )
            : splitLineIntoWords(
                line, 0, currentY, lineHeight, font, block, li, si, bi
              );

          allWords.push(...positioned);
          currentY += lineHeight;
        }
      }
    }

    if (currentY === sectionStartY) {
      currentY += lineHeight;
    }

    currentY += marginBottom;
  }

  return { words: allWords, totalHeight: currentY };
}

/**
 * Re-export block defaults for external use.
 */
export function getBlockDefaults(type: BlockType) {
  return BLOCK_DEFAULTS[type];
}
