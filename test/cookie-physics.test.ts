import { describe, expect, it } from "vitest";
import { createCookieParticles, GRAVITY, stepCookiePhysics } from "@/lib/cookie-physics";

const BOUNDS = { mouthX: 200, mouthY: 300, floorY: 320 };

describe("cookie particle physics", () => {
  it("creates deterministic, staggered letter bodies", () => {
    const sources = [
      { char: "A", x: 10, y: 20 },
      { char: "B", x: 20, y: 20 },
    ];
    const first = createCookieParticles(sources, 4);
    const second = createCookieParticles(sources, 4);

    expect(first).toEqual(second);
    expect(first[1].startDelay).toBeGreaterThan(first[0].startDelay);
  });

  it("stays a letter while jumping up, then flips into a cookie on the way down", () => {
    const particles = createCookieParticles([{ char: "A", x: 0, y: -200 }], 2);
    const first = particles[0];
    let elapsed = first.startDelay;

    expect(first.vy).toBeLessThan(0);
    for (let frame = 0; frame < 200 && first.vy <= 0; frame += 1) {
      elapsed += 16;
      stepCookiePhysics(particles, 16, elapsed, BOUNDS);
      if (first.vy < 0) expect(first.morph).toBe(0);
    }
    expect(first.vy).toBeGreaterThan(0);

    for (let frame = 0; frame < 40; frame += 1) {
      elapsed += 16;
      stepCookiePhysics(particles, 16, elapsed, BOUNDS);
    }
    expect(first.morph).toBe(1);
  });

  it("accelerates under constant gravity while airborne", () => {
    const particles = createCookieParticles([{ char: "A", x: 0, y: 0 }], 2);
    const first = particles[0];

    stepCookiePhysics(particles, 16, first.startDelay + 200, BOUNDS);
    const velocity = first.vy;
    stepCookiePhysics(particles, 16, first.startDelay + 216, BOUNDS);

    expect(first.vy - velocity).toBeCloseTo(GRAVITY * 0.016, 1);
  });

  it("bounces on the floor, then rolls into the mouth", () => {
    const particles = createCookieParticles([{ char: "A", x: 0, y: 0 }], 7);
    let elapsed = 0;
    let remaining = 1;
    let bounced = 0;

    for (let frame = 0; frame < 400 && remaining > 0; frame += 1) {
      elapsed += 16;
      ({ remaining } = stepCookiePhysics(particles, 16, elapsed, BOUNDS));
      bounced = Math.max(bounced, particles[0].bounces);
    }

    expect(bounced).toBeGreaterThanOrEqual(1);
    expect(remaining).toBe(0);
    expect(particles[0].eaten).toBe(true);
  });
});
