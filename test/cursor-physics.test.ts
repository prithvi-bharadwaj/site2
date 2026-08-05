import { describe, expect, it } from "vitest";
import {
  applyFlick,
  FLICK_KICK,
  isFlick,
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

  it("carries existing spin through a near-reversal (long way round)", () => {
    // Already spinning CCW at 8 rad/s when a ~180° flip arrives: the error
    // should resolve with the spin (accelerate), not fight it.
    const spring: AngleSpring = { angle: 0, velocity: 8 };
    stepAngleSpring(spring, -3, DT);
    expect(spring.velocity).toBeGreaterThan(8);
  });

  it("does not spin-carry from rest", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    stepAngleSpring(spring, -3, DT);
    expect(spring.velocity).toBeLessThan(0); // takes the shortest path
  });

  it("accumulates full spins under rapid back-and-forth wiggling", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    // Flip the target 180° every ~100ms, like shaking the mouse sideways.
    for (let i = 0; i < 120; i++) {
      const target = Math.floor(i / 6) % 2 === 0 ? Math.PI : 0;
      stepAngleSpring(spring, target, DT);
    }
    // Oscillation alone stays within one turn; spinning winds past 2π.
    expect(Math.abs(spring.angle)).toBeGreaterThan(2 * Math.PI);
  });

  it("winds into full spins when wiggle flicks pump in energy", () => {
    // A hand wiggle at ~8Hz: the spring is steered between 0 and π while each
    // velocity reversal lands a flick kick. Damping must not eat the kicks.
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    let flickDir = 0;
    let total = 0;
    for (let i = 0; i < 120; i++) {
      const phase = Math.floor(i / 4) % 2; // reverse every 4 frames ≈ 8Hz
      if (i % 4 === 0 && i > 0) {
        const dir = phase === 0 ? 1 : -1;
        // Bursts under FLICK_MEMORY_MS apart keep the remembered direction.
        flickDir = applyFlick(spring, dir * 1500, 0, -dir * 1500, 0, flickDir);
      }
      const before = spring.angle;
      stepAngleSpring(spring, phase === 0 ? 0 : Math.PI, DT);
      total += spring.angle - before;
    }
    expect(Math.abs(total)).toBeGreaterThan(2 * Math.PI);
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

describe("isFlick", () => {
  it("detects a fast reversal", () => {
    expect(isFlick(-800, 0, 800, 0)).toBe(true);
  });

  it("ignores slow reversals and same-direction motion", () => {
    expect(isFlick(-100, 0, 100, 0)).toBe(false); // too slow
    expect(isFlick(800, 0, 900, 50)).toBe(false); // not a reversal
    expect(isFlick(0, 0, 800, 0)).toBe(false); // starting from rest
  });
});

describe("applyFlick", () => {
  it("kicks with the existing spin direction", () => {
    const spring: AngleSpring = { angle: 0, velocity: -5 };
    applyFlick(spring, -800, 0, 800, 0);
    expect(spring.velocity).toBeCloseTo(-5 - FLICK_KICK);
  });

  it("kicks with the turn direction when not yet spinning", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    // Rightward motion flicking to down-left: positive cross → CW kick.
    applyFlick(spring, 800, 0, -700, 400);
    expect(spring.velocity).toBeCloseTo(FLICK_KICK);
  });
});
