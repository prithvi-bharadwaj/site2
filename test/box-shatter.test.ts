import { describe, expect, it } from "vitest";
import {
  BLAST_INK,
  createBlastParticles,
  createShatter,
  roundedRectOutline,
  shardAlpha,
  shardOutline,
  stepShatter,
  type Point,
  type Shard,
} from "@/lib/box-shatter";

const BOX = { width: 132, height: 38, radius: 10 };

function boundsOf(points: Point[]) {
  return points.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function areaOf(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Drop the duplicated closing vertex shardOutline appends. */
function openOutline(shard: Shard): Point[] {
  return shardOutline(shard).slice(0, -1);
}

describe("rounded rect outline", () => {
  it("traces the 2px border's stroke centreline", () => {
    const { minX, maxX, minY, maxY } = boundsOf(roundedRectOutline(132, 38, 10));
    expect(minX).toBeCloseTo(1);
    expect(maxX).toBeCloseTo(131);
    expect(minY).toBeCloseTo(1);
    expect(maxY).toBeCloseTo(37);
  });

  it("is closed without repeating the first vertex", () => {
    const outline = roundedRectOutline(132, 38, 10);
    expect(outline[0]).not.toEqual(outline[outline.length - 1]);
  });
});

describe("box shatter", () => {
  it("breaks into at least one piece per column", () => {
    expect(createShatter({ ...BOX, columns: 6, splitChance: 0 })).toHaveLength(6);
    expect(createShatter({ ...BOX, columns: 6, splitChance: 1 })).toHaveLength(12);
    expect(createShatter({ ...BOX, columns: 3, splitChance: 0 })).toHaveLength(3);
  });

  it("is deterministic for a given seed", () => {
    const key = (shards: Shard[]) => shards.map((s) => [s.x, s.y, s.spin, s.local.length]);
    expect(key(createShatter({ ...BOX, seed: 7 }))).toEqual(key(createShatter({ ...BOX, seed: 7 })));
    expect(key(createShatter({ ...BOX, seed: 7 }))).not.toEqual(key(createShatter({ ...BOX, seed: 8 })));
  });

  it("tiles the box: the pieces cover its whole area and no more", () => {
    const outlineArea = areaOf(roundedRectOutline(BOX.width, BOX.height, BOX.radius));
    for (const seed of [1, 20260726, 99, 4242]) {
      const shards = createShatter({ ...BOX, seed });
      const total = shards.reduce((sum, shard) => sum + areaOf(openOutline(shard)), 0);
      expect(total).toBeCloseTo(outlineArea, 1);
    }
  });

  it("frame one draws nothing outside the intact outline", () => {
    const all = createShatter({ ...BOX, seed: 33 }).flatMap((shard) => shardOutline(shard));
    const { minX, maxX, minY, maxY } = boundsOf(all);
    expect(minX).toBeGreaterThanOrEqual(1 - 1e-6);
    expect(maxX).toBeLessThanOrEqual(131 + 1e-6);
    expect(minY).toBeGreaterThanOrEqual(1 - 1e-6);
    expect(maxY).toBeLessThanOrEqual(37 + 1e-6);
  });

  it("keeps pieces chunky instead of carving needles", () => {
    for (const seed of [1, 20260726, 99, 4242]) {
      for (const shard of createShatter({ ...BOX, seed })) {
        const { minX, maxX, minY, maxY } = boundsOf(openOutline(shard));
        expect(maxX - minX).toBeLessThan(BOX.width / 2);
        expect(maxY - minY).toBeLessThanOrEqual(BOX.height);
      }
    }
  });

  it("closes every outline so the ribbon seam mitres", () => {
    for (const shard of createShatter({ ...BOX })) {
      const points = shardOutline(shard);
      expect(points.length).toBeGreaterThan(3);
      expect(points[0]).toEqual(points[points.length - 1]);
    }
  });

  it("fires every fragment away from the point of impact", () => {
    const impact = { x: BOX.width / 2, y: BOX.height / 2 };
    for (const seed of [12, 77, 2024]) {
      for (const shard of createShatter({ ...BOX, seed })) {
        const dx = shard.x - impact.x;
        const dy = shard.y - impact.y;
        if (Math.hypot(dx, dy) < 4) continue;
        // Spray fans the heading, but never far enough to send a piece back
        // through the middle.
        expect(shard.vx * dx + shard.vy * dy).toBeGreaterThan(0);
      }
    }
  });

  it("blows the pieces clear of where the box stood", () => {
    const shards = createShatter({ ...BOX, seed: 12 });
    for (let i = 0; i < 30; i++) stepShatter(shards, 16);   // ~half a second
    const escaped = shards.filter(
      (s) => s.x < -20 || s.x > BOX.width + 20 || s.y < -20 || s.y > BOX.height + 20,
    );
    expect(escaped.length).toBe(shards.length);
  });

  it("throws debris up on balance, then lets gravity take all of it", () => {
    const shards = createShatter({ ...BOX, seed: 3 });
    // A blast still fires some pieces downward; the lift only has to win on average.
    const meanVy = shards.reduce((sum, s) => sum + s.vy, 0) / shards.length;
    expect(meanVy).toBeLessThan(0);
    expect(shards.some((s) => s.vy > 0)).toBe(true);
    for (let i = 0; i < 60; i++) stepShatter(shards, 16);
    expect(shards.every((s) => s.vy > 0)).toBe(true);
  });

  it("spins each piece about its own centroid", () => {
    const shards = createShatter({ ...BOX, seed: 5 });
    const spinner = shards.find((s) => Math.abs(s.spin) > 0.4);
    expect(spinner).toBeDefined();
    const before = { x: spinner!.x, vx: spinner!.vx };
    // Frames are clamped to 32ms so a stalled tab cannot teleport a shard.
    stepShatter(shards, 5000);
    expect(spinner!.angle).toBeCloseTo(spinner!.spin * 0.032);
    // Rotation is about the centroid, so the outline's own centre only moves by
    // the velocity, never by the spin.
    expect(spinner!.x - before.x).toBeCloseTo(spinner!.vx * 0.032, 4);
    expect(Math.abs(spinner!.vx)).toBeLessThan(Math.abs(before.vx));   // drag bit
  });

  it("does not move on a zero-length frame", () => {
    const shards = createShatter({ ...BOX });
    const before = shards.map((s) => s.y);
    stepShatter(shards, 0);
    expect(shards.map((s) => s.y)).toEqual(before);
  });

  it("offsets pieces into canvas space without moving the geometry", () => {
    const local = createShatter({ ...BOX, seed: 3 });
    const placed = createShatter({ ...BOX, seed: 3, offsetX: 60, offsetY: 40 });
    placed.forEach((shard, i) => {
      expect(shard.x).toBeCloseTo(local[i].x + 60);
      expect(shard.y).toBeCloseTo(local[i].y + 40);
      expect(shard.local).toEqual(local[i].local);
    });
  });

  it("burns dust out faster than the fragments it flies with", () => {
    const [fragment] = createShatter({ ...BOX });
    const [mote] = createBlastParticles({ ...BOX });
    expect(mote.fadeRate).toBeGreaterThan(1);
    fragment.age = 0.7;
    mote.age = 0.7;
    expect(shardAlpha(fragment)).toBeGreaterThan(0);
    expect(shardAlpha(mote)).toBe(0);
  });

  it("matches the border exactly at handoff, inks up in flight, then fades out", () => {
    const [shard] = createShatter({ ...BOX });
    // Frame one has to be indistinguishable from the intact CSS border.
    expect(shardAlpha(shard)).toBe(1);
    shard.age = 0.15;
    expect(shardAlpha(shard)).toBeCloseTo(BLAST_INK);
    shard.age = 0.7;
    const mid = shardAlpha(shard);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(BLAST_INK);
    shard.age = 1.4;
    expect(shardAlpha(shard)).toBe(0);
  });
});

describe("blast particles", () => {
  it("is deterministic for a given seed", () => {
    const key = (motes: Shard[]) => motes.map((m) => [m.x, m.y, m.vx, m.vy]);
    expect(key(createBlastParticles({ ...BOX, seed: 4 }))).toEqual(
      key(createBlastParticles({ ...BOX, seed: 4 })),
    );
    expect(key(createBlastParticles({ ...BOX, seed: 4 }))).not.toEqual(
      key(createBlastParticles({ ...BOX, seed: 5 })),
    );
  });

  it("spawns every mote inside the box, offset into canvas space", () => {
    for (const mote of createBlastParticles({ ...BOX, offsetX: 60, offsetY: 40 })) {
      expect(mote.x).toBeGreaterThan(60);
      expect(mote.x).toBeLessThan(60 + BOX.width);
      expect(mote.y).toBeGreaterThan(40);
      expect(mote.y).toBeLessThan(40 + BOX.height);
    }
  });

  it("keeps the dust tiny relative to the fragments", () => {
    for (const mote of createBlastParticles({ ...BOX })) {
      const { minX, maxX, minY, maxY } = boundsOf(mote.local);
      expect(maxX - minX).toBeLessThan(4);
      expect(maxY - minY).toBeLessThan(4);
    }
  });

  it("flies through the same physics as the fragments", () => {
    const motes = createBlastParticles({ ...BOX, seed: 8 });
    const before = motes.map((m) => ({ x: m.x, y: m.y }));
    stepShatter(motes, 16);
    motes.forEach((mote, i) => {
      expect(mote.x).not.toBe(before[i].x);
      expect(mote.age).toBeGreaterThan(0);
    });
  });
});
