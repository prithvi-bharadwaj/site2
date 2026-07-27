import { describe, expect, it } from "vitest";
import {
  createBody,
  stepPhysics,
  DEFAULT_PHYSICS,
  type Body,
  type GlyphSource,
  type PhysicsEnv,
} from "@/lib/letter-physics";
import {
  applyImpulse,
  beginHoming,
  brushAt,
  dropAll,
  forceSettle,
  markReturning,
  pokeAt,
  resetTargets,
} from "@/lib/letter-effects";

/** Deterministic rng so pile layouts are reproducible. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ENV: PhysicsEnv = { ...DEFAULT_PHYSICS, width: 400, floorY: 600 };

function glyph(x: number, y: number, w = 8, h = 16): GlyphSource {
  return { char: "a", x, y, w, h, ascent: 12, font: "12px sans", color: "#000", alpha: 1 };
}

function settle(bodies: Body[], env = ENV, maxFrames = 900) {
  const rng = seeded(7);
  let frames = 0;
  while (frames < maxFrames && stepPhysics(bodies, 1 / 60, env, rng)) frames += 1;
  return frames;
}

const bottom = (b: Body) => b.y + b.eh / 2;

function deepestOverlap(bodies: Body[]): number {
  let worst = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const px = (a.ew + b.ew) / 2 - Math.abs(b.x - a.x);
      if (px <= 0) continue;
      const py = (a.eh + b.eh) / 2 - Math.abs(b.y - a.y);
      if (py <= 0) continue;
      worst = Math.max(worst, Math.min(px, py));
    }
  }
  return worst;
}

describe("letter physics", () => {
  it("drops a letter to the floor and puts it to sleep", () => {
    const bodies = [createBody(glyph(100, 40))];
    dropAll(bodies, ENV, seeded(1));
    const frames = settle(bodies);

    expect(frames).toBeLessThan(900);
    expect(bodies[0].sleeping).toBe(true);
    expect(bottom(bodies[0])).toBeCloseTo(ENV.floorY, 0);
  });

  it("stacks letters instead of letting them overlap", () => {
    // A narrow well: only a few letters fit side by side, so they pile up.
    const env: PhysicsEnv = { ...ENV, width: 40 };
    const bodies = Array.from({ length: 12 }, (_, i) =>
      createBody(glyph(4 + (i % 3) * 10, i * 30))
    );
    dropAll(bodies, env, seeded(2));
    settle(bodies, env);

    for (const b of bodies) {
      expect(b.sleeping).toBe(true);
      // Nothing sinks through the floor.
      expect(bottom(b)).toBeLessThanOrEqual(env.floorY + 1);
    }
    // Twelve letters, three-wide floor: the pile is several letters tall.
    expect(env.floorY - Math.min(...bodies.map((b) => b.y))).toBeGreaterThan(45);
  });

  it("leaves letters resting against each other, not inside each other", () => {
    // Plenty of floor to spread across, so nothing should stay wedged.
    const bodies = [0, 30, 60, 90, 120].map((y) => createBody(glyph(196, y)));
    dropAll(bodies, ENV, seeded(13));
    settle(bodies);

    expect(deepestOverlap(bodies)).toBeLessThan(2);
  });

  it("freezes a jammed pile when the caller gives up on it", () => {
    const bodies = Array.from({ length: 12 }, () => createBody(glyph(200, 300)));
    dropAll(bodies, ENV, seeded(12));
    settle(bodies, ENV, 30);

    forceSettle(bodies);
    expect(stepPhysics(bodies, 1 / 60, ENV, seeded(1))).toBe(false);
  });

  it("blasts letters away from the impact point and upward", () => {
    const left = createBody(glyph(50, 300));
    const right = createBody(glyph(350, 300));
    const bodies = [left, right];
    for (const b of bodies) b.sleeping = true;

    applyImpulse(bodies, 200, ENV.floorY, 800, 420, seeded(3));

    expect(left.sleeping).toBe(false);
    expect(left.vx).toBeLessThan(0);
    expect(right.vx).toBeGreaterThan(0);
    // A slam from under the table throws everything up.
    expect(left.vy).toBeLessThan(0);
    expect(right.vy).toBeLessThan(0);
  });

  it("lands slammed letters back on the line they came from", () => {
    // Two lines of letters, so a body can only settle on its own baseline.
    const bodies: Body[] = [];
    for (let i = 0; i < 12; i++) bodies.push(createBody(glyph(150 + i * 9, 200)));
    for (let i = 0; i < 12; i++) bodies.push(createBody(glyph(150 + i * 9, 300)));
    const homes = bodies.map((b) => ({ x: b.homeX, y: b.homeY }));

    markReturning(bodies, 0, seeded(21));
    applyImpulse(bodies, 200, ENV.floorY, 800, 420, seeded(22));
    // It has to actually leave home first, or this proves nothing.
    settle(bodies, ENV, 12);
    expect(Math.max(...bodies.map((b, i) => Math.abs(b.y - homes[i].y)))).toBeGreaterThan(4);

    const frames = settle(bodies);
    expect(frames).toBeLessThan(900);
    bodies.forEach((b, i) => {
      // Back on its own line, near its own column, standing upright again.
      expect(Math.abs(bottom(b) - (homes[i].y + b.h / 2))).toBeLessThan(3);
      expect(Math.abs(b.x - homes[i].x)).toBeLessThan(6);
      expect(Math.abs(b.angle)).toBeLessThan(0.12);
    });
  });

  it("leaves a few letters knocked over, and lets the cursor tidy them up", () => {
    const bodies = Array.from({ length: 300 }, (_, i) => createBody(glyph(i % 40 * 9, 200)));
    markReturning(bodies, 1, seeded(31));
    expect(bodies.every((b) => b.levelPull === 0)).toBe(true);

    const tilted = createBody(glyph(100, 200));
    tilted.angle = 1.2;
    markReturning([tilted], 1, seeded(32));
    expect(tilted.levelPull).toBe(0);

    // Brushing it engages the springs that stand it back up.
    brushAt([tilted], tilted.x + 4, tilted.y, 78, 2600, 1 / 60, true);
    expect(tilted.levelPull).toBeGreaterThan(0);
    settle([tilted]);
    expect(tilted.angle).toBe(0);
    expect(tilted.x).toBeCloseTo(tilted.homeX, 0);
  });

  it("pokes only the letters near the tap", () => {
    const near = createBody(glyph(200, 300));
    const far = createBody(glyph(200, 500));
    const bodies = [near, far];
    for (const b of bodies) b.sleeping = true;

    pokeAt(bodies, 204, 308, 520, 150, false, 0, seeded(41));

    expect(near.sleeping).toBe(false);
    expect(Math.abs(near.vx) + Math.abs(near.vy)).toBeGreaterThan(0);
    expect(far.sleeping).toBe(true);
    expect(far.vx).toBe(0);
  });

  it("springs letters back to exactly where they started", () => {
    const bodies = [createBody(glyph(120, 200)), createBody(glyph(140, 200))];
    const homes = bodies.map((b) => ({ x: b.homeX, y: b.homeY }));
    applyImpulse(bodies, 200, ENV.floorY, 1400, 420, seeded(4));
    settle(bodies, ENV, 60);

    resetTargets(bodies);
    beginHoming(bodies);
    settle(bodies);

    bodies.forEach((b, i) => {
      expect(b.sleeping).toBe(true);
      expect(b.x).toBeCloseTo(homes[i].x, 5);
      expect(b.y).toBeCloseTo(homes[i].y, 5);
      expect(b.angle).toBe(0);
    });
  });

  it("separates glyphs bigger than a broadphase cell", () => {
    // Heading-size letters span multiple grid cells; their centers sit in
    // non-adjacent cells while the boxes overlap deeply. The old one-cell
    // lookup never saw this pair.
    const big = (x: number) => createBody(glyph(x, 500, 60, 70));
    const a = big(150);
    const b = big(190); // 40px apart, boxes 60 wide: 20px deep overlap
    const bodies = [a, b];
    dropAll(bodies, ENV, seeded(5));
    a.vx = a.vy = b.vx = b.vy = 0;
    settle(bodies);

    expect(deepestOverlap(bodies)).toBeLessThan(2);
  });

  it("drops with per-letter scatter, not a mirror-symmetric fan", () => {
    // Two letters equidistant from the center: a deterministic fan gives them
    // exactly opposite velocities, which is what made every pile identical.
    const left = createBody(glyph(96, 100));
    const right = createBody(glyph(296, 100));
    dropAll([left, right], ENV, seeded(8));

    expect(Math.abs(left.vx + right.vx)).toBeGreaterThan(5);
    expect(left.vy).not.toBeCloseTo(right.vy, 0);
  });

  it("keeps a wide pile inside the viewport", () => {
    const bodies = Array.from({ length: 40 }, (_, i) => createBody(glyph(-20 + i * 12, 100)));
    dropAll(bodies, ENV, seeded(9));
    settle(bodies);

    for (const b of bodies) {
      expect(b.x - b.ew / 2).toBeGreaterThanOrEqual(-0.5);
      expect(b.x + b.ew / 2).toBeLessThanOrEqual(ENV.width + 0.5);
    }
  });
});
