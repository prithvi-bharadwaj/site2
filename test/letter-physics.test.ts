import { describe, expect, it } from "vitest";
import {
  applyImpulse,
  assignSmashTargets,
  beginHoming,
  createBody,
  dropAll,
  forceSettle,
  resetTargets,
  stepPhysics,
  DEFAULT_PHYSICS,
  type Body,
  type GlyphSource,
  type PhysicsEnv,
} from "@/lib/letter-physics";

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
    // A narrow well: there's no floor to spread across, so they have to pile up.
    const env: PhysicsEnv = { ...ENV, width: 14 };
    const bodies = [0, 40, 80, 120].map((y) => createBody(glyph(3, y)));
    dropAll(bodies, env, seeded(2));
    settle(bodies, env);

    for (const b of bodies) {
      expect(b.sleeping).toBe(true);
      // Nothing sinks through the floor.
      expect(bottom(b)).toBeLessThanOrEqual(env.floorY + 1);
    }
    // Four letters, one letter of floor: the pile is a couple of letters tall.
    expect(env.floorY - Math.min(...bodies.map((b) => b.y))).toBeGreaterThan(28);
  });

  it("leaves letters resting against each other, not inside each other", () => {
    // Plenty of floor to spread across, so nothing should stay wedged.
    const bodies = [0, 30, 60, 90, 120].map((y) => createBody(glyph(196, y)));
    dropAll(bodies, ENV, seeded(13));
    settle(bodies);

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const px = (a.ew + b.ew) / 2 - Math.abs(b.x - a.x);
        const py = (a.eh + b.eh) / 2 - Math.abs(b.y - a.y);
        expect(Math.min(px, py)).toBeLessThan(2);
      }
    }
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

    applyImpulse(bodies, 200, ENV.floorY, 1000, seeded(3));

    expect(left.sleeping).toBe(false);
    expect(left.vx).toBeLessThan(0);
    expect(right.vx).toBeGreaterThan(0);
    // A slam from under the table throws everything up.
    expect(left.vy).toBeLessThan(0);
    expect(right.vy).toBeLessThan(0);
  });

  it("springs letters back to exactly where they started", () => {
    const bodies = [createBody(glyph(120, 200)), createBody(glyph(140, 200))];
    const homes = bodies.map((b) => ({ x: b.homeX, y: b.homeY }));
    applyImpulse(bodies, 200, ENV.floorY, 1400, seeded(4));
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

  it("sends most letters home after a slam and leaves a few knocked over", () => {
    const bodies = Array.from({ length: 200 }, (_, i) => createBody(glyph(i * 2, 100)));

    const none = assignSmashTargets(bodies, 0, seeded(5));
    expect(none.every((f) => f === "home")).toBe(true);
    expect(bodies.every((b) => b.targetAngle === 0 && b.targetX === b.homeX)).toBe(true);

    const fates = assignSmashTargets(bodies, 1, seeded(6));
    expect(fates.some((f) => f === "fallen")).toBe(true);
    expect(fates.every((f) => f !== "home")).toBe(true);
    // A letter lying on its side keeps its bottom edge on the baseline.
    const flat = bodies[fates.indexOf("fallen")];
    expect(Math.abs(flat.targetAngle)).toBeGreaterThan(1.3);
    expect(flat.targetY).toBeCloseTo(flat.homeY + (flat.h - flat.w) / 2, 5);

    const mixed = assignSmashTargets(bodies, 0.16, seeded(8));
    const displaced = mixed.filter((f) => f !== "home").length;
    expect(displaced).toBeGreaterThan(0);
    expect(displaced).toBeLessThan(bodies.length / 3);
  });

  it("keeps a wide pile inside the viewport", () => {
    const bodies = Array.from({ length: 40 }, (_, i) =>
      createBody(glyph(-20 + i * 12, 100))
    );
    dropAll(bodies, ENV, seeded(9));
    settle(bodies);

    for (const b of bodies) {
      expect(b.x - b.ew / 2).toBeGreaterThanOrEqual(-0.5);
      expect(b.x + b.ew / 2).toBeLessThanOrEqual(ENV.width + 0.5);
    }
  });
});
