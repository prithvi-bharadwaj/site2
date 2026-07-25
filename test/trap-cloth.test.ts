import { describe, expect, it } from "vitest";
import {
  arcPoints,
  createTrapCloth,
  disturbTrapCloth,
  releaseTrapCloth,
  stepTrapCloth,
  type TrapCloth,
} from "@/lib/trap-cloth";

function makeCloth(): TrapCloth {
  return createTrapCloth({ leftX: 58, rightX: 170, y: 45.5 });
}

function runSteps(cloth: TrapCloth, frames: number, dtMs = 16) {
  for (let i = 0; i < frames; i++) stepTrapCloth(cloth, dtMs);
}

describe("trap cloth", () => {
  it("starts as a taut line pinned at both hinges", () => {
    const cloth = makeCloth();
    const [left, right] = cloth.flaps;
    expect(left[0]).toMatchObject({ x: 58, y: 45.5, pinned: true });
    expect(right[0]).toMatchObject({ x: 170, y: 45.5, pinned: true });
    for (const flap of cloth.flaps) {
      for (const point of flap) expect(point.y).toBe(45.5);
    }
    // The two free tips meet at the center of the span.
    expect(left[left.length - 1].x).toBeCloseTo(114);
    expect(right[right.length - 1].x).toBeCloseTo(114);
  });

  it("does not move until released", () => {
    const cloth = makeCloth();
    runSteps(cloth, 30);
    for (const flap of cloth.flaps) {
      for (const point of flap) expect(point.y).toBe(45.5);
    }
  });

  it("falls under gravity after release while the hinges stay pinned", () => {
    const cloth = makeCloth();
    releaseTrapCloth(cloth);
    runSteps(cloth, 120);
    const [left, right] = cloth.flaps;
    expect(left[0]).toMatchObject({ x: 58, y: 45.5 });
    expect(right[0]).toMatchObject({ x: 170, y: 45.5 });
    expect(left[left.length - 1].y).toBeGreaterThan(70);
    expect(right[right.length - 1].y).toBeGreaterThan(70);
    // The button floor blocks the cloth from flipping up through it.
    for (const flap of cloth.flaps) {
      for (const point of flap) expect(point.y).toBeGreaterThanOrEqual(45.5);
    }
  });

  it("keeps segment lengths near rest length while flapping", () => {
    const cloth = makeCloth();
    releaseTrapCloth(cloth);
    runSteps(cloth, 200);
    for (const flap of cloth.flaps) {
      for (let i = 1; i < flap.length; i++) {
        const length = Math.hypot(flap[i].x - flap[i - 1].x, flap[i].y - flap[i - 1].y);
        expect(length).toBeGreaterThan(cloth.restLength * 0.8);
        expect(length).toBeLessThan(cloth.restLength * 1.2);
      }
    }
  });

  it("corner arcs land exactly on the endpoints they bridge", () => {
    // Bottom-left corner arc: from the 45° diagonal down to the hinge pin.
    const points = arcPoints(58, 36, 9.5, Math.PI * 0.75, Math.PI * 0.5, 8);
    expect(points).toHaveLength(9);
    expect(points[0].x).toBeCloseTo(58 - 9.5 * Math.SQRT1_2);
    expect(points[0].y).toBeCloseTo(36 + 9.5 * Math.SQRT1_2);
    expect(points[8].x).toBeCloseTo(58);
    expect(points[8].y).toBeCloseTo(45.5);
    // Every point stays on the stroke circle.
    for (const point of points) {
      expect(Math.hypot(point.x - 58, point.y - 36)).toBeCloseTo(9.5);
    }
  });

  it("disturbances push nearby free points but never the pins", () => {
    const cloth = makeCloth();
    releaseTrapCloth(cloth);
    runSteps(cloth, 60);
    const tip = cloth.flaps[0][cloth.flaps[0].length - 1];
    const before = { x: tip.x, y: tip.y };
    disturbTrapCloth(cloth, tip.x, tip.y, 20, 40, 40);
    stepTrapCloth(cloth, 16);
    const moved = Math.hypot(tip.x - before.x, tip.y - before.y);
    expect(moved).toBeGreaterThan(1);
    expect(cloth.flaps[0][0]).toMatchObject({ x: 58, y: 45.5 });
  });
});
