import { describe, expect, it } from "vitest";
import {
  MAX_DT,
  shortestAngleDelta,
  stepAngleSpring,
  type AngleSpring,
} from "@/lib/cursor-physics";

const DT = 1 / 60;

function settle(spring: AngleSpring, target: number, steps: number) {
  for (let i = 0; i < steps; i++) stepAngleSpring(spring, target, DT);
}

describe("shortestAngleDelta", () => {
  it("returns the direct difference for small gaps", () => {
    expect(shortestAngleDelta(0, 1)).toBeCloseTo(1);
    expect(shortestAngleDelta(1, 0)).toBeCloseTo(-1);
  });

  it("wraps across the ±π seam", () => {
    // 170° → -170°: shortest path is +20°, not -340°.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    expect(shortestAngleDelta(from, to)).toBeCloseTo((20 * Math.PI) / 180);
    expect(shortestAngleDelta(to, from)).toBeCloseTo((-20 * Math.PI) / 180);
  });

  it("stays within (-π, π] for multi-turn inputs", () => {
    expect(Math.abs(shortestAngleDelta(0, 7 * Math.PI + 0.3))).toBeLessThanOrEqual(Math.PI);
  });
});

describe("stepAngleSpring", () => {
  it("converges to the target angle", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    settle(spring, 1.2, 300);
    expect(spring.angle).toBeCloseTo(1.2, 3);
    expect(spring.velocity).toBeCloseTo(0, 3);
  });

  it("overshoots the target before settling (underdamped)", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    let peak = 0;
    for (let i = 0; i < 300; i++) {
      stepAngleSpring(spring, 1, DT);
      peak = Math.max(peak, spring.angle);
    }
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThan(1.5); // slight overshoot, not a wild swing
  });

  it("rotates through the seam instead of the long way round", () => {
    const spring: AngleSpring = { angle: (170 * Math.PI) / 180, velocity: 0 };
    const target = (-170 * Math.PI) / 180;
    stepAngleSpring(spring, target, DT);
    // Velocity should be positive (continuing past +π), not negative (unwinding 340°).
    expect(spring.velocity).toBeGreaterThan(0);
  });

  it("clamps huge dt so the integration stays stable", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    stepAngleSpring(spring, 1, 5); // e.g. returning from a background tab
    const expected: AngleSpring = { angle: 0, velocity: 0 };
    stepAngleSpring(expected, 1, MAX_DT);
    expect(spring.angle).toBeCloseTo(expected.angle);
    expect(Math.abs(spring.angle)).toBeLessThan(Math.PI);
  });
});
