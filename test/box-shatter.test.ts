import { describe, expect, it } from "vitest";
import {
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
  it("traces the 1px border's stroke centreline", () => {
    const { minX, maxX, minY, maxY } = boundsOf(roundedRectOutline(132, 38, 10));
    expect(minX).toBeCloseTo(0.5);
    expect(maxX).toBeCloseTo(131.5);
    expect(minY).toBeCloseTo(0.5);
    expect(maxY).toBeCloseTo(37.5);
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
    expect(minX).toBeGreaterThanOrEqual(0.5 - 1e-6);
    expect(maxX).toBeLessThanOrEqual(131.5 + 1e-6);
    expect(minY).toBeGreaterThanOrEqual(0.5 - 1e-6);
    expect(maxY).toBeLessThanOrEqual(37.5 + 1e-6);
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

  it("leans pieces away from the middle and drops them", () => {
    const shards = createShatter({ ...BOX, seed: 12 });
    const before = shards.map((s) => s.y);
    for (const shard of shards) {
      if (Math.abs(shard.x - BOX.width / 2) < 8) continue;
      expect(Math.sign(shard.vx)).toBe(Math.sign(shard.x - BOX.width / 2));
    }
    for (let i = 0; i < 30; i++) stepShatter(shards, 16);
    shards.forEach((shard, i) => {
      expect(shard.y).toBeGreaterThan(before[i]);
      expect(shard.vy).toBeGreaterThan(0);
    });
  });

  it("sends the lowest pieces first so the box does not fall as one lump", () => {
    const shards = createShatter({ ...BOX, seed: 21, columns: 6, splitChance: 1 });
    const lowest = shards.reduce((a, b) => (a.y > b.y ? a : b));
    const highest = shards.reduce((a, b) => (a.y < b.y ? a : b));
    expect(lowest.vy).toBeGreaterThan(highest.vy);
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
    expect(spinner!.x - before.x).toBeCloseTo(before.vx * 0.999 * 0.032, 4);
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

  it("holds full ink while the crack is fresh, then fades to nothing", () => {
    const [shard] = createShatter({ ...BOX });
    expect(shardAlpha(shard)).toBe(1);
    shard.age = 0.4;
    expect(shardAlpha(shard)).toBe(1);
    shard.age = 0.8;
    const mid = shardAlpha(shard);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    shard.age = 1.4;
    expect(shardAlpha(shard)).toBe(0);
  });
});
