import { describe, it, expect, beforeEach } from "vitest";
import {
  createPool,
  morphTo,
  updateMorph,
  updatePhysics,
  DEFAULT_PHYSICS,
  type Point,
  type Particle,
  type MouseState,
} from "@/lib/particle-text";

const POINTS: Point[] = [
  { x: 10, y: 10 },
  { x: 20, y: 20 },
  { x: 30, y: 30 },
];

describe("createPool", () => {
  it("creates one particle per point", () => {
    const pool = createPool(POINTS, 100, 100, false);
    expect(pool).toHaveLength(3);
  });

  it("places particles at home positions when not scattered", () => {
    const pool = createPool(POINTS, 100, 100, false);
    expect(pool[0].homeX).toBe(10);
    expect(pool[0].homeY).toBe(10);
    expect(pool[0].x).toBe(10);
  });

  it("randomizes positions when scattered", () => {
    const pool = createPool(POINTS, 1000, 1000, true);
    // Scattered particles should NOT all start at home positions
    const allAtHome = pool.every(
      (p) => p.x === p.homeX && p.y === p.homeY
    );
    // Technically possible but astronomically unlikely with random
    expect(allAtHome).toBe(false);
  });

  it("initializes velocity to zero", () => {
    const pool = createPool(POINTS, 100, 100);
    for (const p of pool) {
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
    }
  });
});

describe("morphTo", () => {
  it("sets target positions from new points", () => {
    const pool = createPool(POINTS, 100, 100, false);
    const newPoints: Point[] = [
      { x: 50, y: 50 },
      { x: 60, y: 60 },
      { x: 70, y: 70 },
    ];

    morphTo(pool, newPoints);

    expect(pool[0].targetX).toBe(50);
    expect(pool[0].targetY).toBe(50);
    expect(pool[1].targetX).toBe(60);
  });

  it("wraps points when pool is larger than target array", () => {
    const bigPool = createPool(
      [...POINTS, { x: 40, y: 40 }],
      100,
      100,
      false
    );
    const smallTarget: Point[] = [{ x: 99, y: 99 }];

    morphTo(bigPool, smallTarget);

    // All particles should target the single point (wrapping via modulo)
    for (const p of bigPool) {
      expect(p.targetX).toBe(99);
      expect(p.targetY).toBe(99);
    }
  });
});

describe("updateMorph", () => {
  let pool: Particle[];

  beforeEach(() => {
    pool = createPool(POINTS, 100, 100, false);
    const targets: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
    ];
    morphTo(pool, targets);
  });

  it("at t=0, particles stay at origin", () => {
    updateMorph(pool, 0);
    expect(pool[0].x).toBeCloseTo(10, 0);
    expect(pool[0].y).toBeCloseTo(10, 0);
  });

  it("at t=1, particles reach target", () => {
    updateMorph(pool, 1);
    expect(pool[0].x).toBeCloseTo(100, 0);
    expect(pool[0].y).toBeCloseTo(100, 0);
  });

  it("resets velocity after morph completes", () => {
    updateMorph(pool, 1);
    for (const p of pool) {
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
    }
  });

  it("clamps t to [0, 1] range", () => {
    updateMorph(pool, 2);
    expect(pool[0].x).toBeCloseTo(100, 0);
    expect(pool[0].y).toBeCloseTo(100, 0);
  });
});

describe("updatePhysics", () => {
  it("springs particles toward home when displaced", () => {
    const pool = createPool(POINTS, 100, 100, false);
    // Displace first particle
    pool[0].x = 50;
    pool[0].y = 50;

    const mouse: MouseState = { x: 0, y: 0, active: false };
    updatePhysics(pool, mouse);

    // Should move closer to home (10, 10)
    expect(pool[0].x).toBeLessThan(50);
    expect(pool[0].y).toBeLessThan(50);
  });

  it("repels particles near active mouse", () => {
    const pool = createPool(
      [{ x: 50, y: 50 }],
      100,
      100,
      false
    );

    const mouse: MouseState = { x: 50, y: 50, active: true };
    const physics = { ...DEFAULT_PHYSICS, repelStrength: 10 };

    // Nudge particle slightly off-center so repulsion has a direction
    pool[0].x = 51;
    updatePhysics(pool, mouse, physics);

    // Particle should be pushed away from mouse
    expect(pool[0].x).toBeGreaterThan(51);
  });

  it("does not repel when mouse is inactive", () => {
    const pool = createPool(
      [{ x: 50, y: 50 }],
      100,
      100,
      false
    );

    const mouse: MouseState = { x: 50, y: 50, active: false };
    updatePhysics(pool, mouse);

    // Particle at home, no force — should stay put (tiny float drift ok)
    expect(pool[0].x).toBeCloseTo(50, 1);
    expect(pool[0].y).toBeCloseTo(50, 1);
  });
});
