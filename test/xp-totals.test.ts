import { describe, expect, it } from "vitest";
import { LORE, PREVIOUSLY, WRITING } from "@/app/home-content";
import type { LinkListItem } from "@/components/LinkList";
import { TOTALS, mediaKey } from "@/lib/xp";

/**
 * TOTALS drives progress displays and achievement gates ("Proof of Work"
 * requires inspecting TOTALS.proof receipts). If content edits add or remove
 * discoverables without updating TOTALS, achievements become unearnable or
 * unlock early. These tests derive the real counts from home-content.ts.
 */

/** Distinct hover-proof media across an item list (brand + inline links). */
function distinctProofKeys(items: LinkListItem[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    for (const b of item.brandLinks ?? []) if (b.media) keys.add(mediaKey(b.media));
    for (const l of item.inlineLinks ?? []) if (l.media) keys.add(mediaKey(l.media));
  }
  return keys;
}

/** Mirrors LinkList: items award `lore:` when expandable or directly linked. */
function awardableCount(items: LinkListItem[]): number {
  return items.filter(
    (i) =>
      !!i.expand ||
      (i.links && i.links.length > 0) ||
      (i.expandFavicons && i.expandFavicons.length > 0) ||
      !!i.href
  ).length;
}

describe("XP totals track the content", () => {
  it("proof total matches the distinct proofs in Previously", () => {
    expect(distinctProofKeys(PREVIOUSLY).size).toBe(TOTALS.proof);
  });

  it("lore total matches the awardable lore items", () => {
    expect(awardableCount(LORE)).toBe(TOTALS.lore);
  });

  it("writing total matches the writing list, every item linked", () => {
    expect(WRITING.length).toBe(TOTALS.writing);
    expect(WRITING.every((w) => !!w.href)).toBe(true);
  });
});
