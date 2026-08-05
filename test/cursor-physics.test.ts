import { describe, expect, it } from "vitest";
import {
  applyFlick,
  FLICK_KICK,
  gravityRamp,
  GRAVITY_DELAY_MS,
  GRAVITY_RAMP_MS,
  isFlick,
  MAX_DT,
  shortestAngleDelta,
  steerWeight,
  stepCursor,
  type AngleSpring,
} from "@/lib/cursor-physics";

const DT = 1 / 60;

/** Full-authority steering, no gravity — the "moving fast" regime. */
function steer(spring: AngleSpring, target: number) {
  stepCursor(spring, { target, speed: 3000, gravity: 0, hang: 0, dt: DT });
}

/** Mouse at rest with gravity fully engaged — the "return home" regime. */
function hangStep(spring: AngleSpring, hang: number) {
  stepCursor(spring, { target: 0, speed: 0, gravity: 1, hang, dt: DT });
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

describe("steerWeight", () => {
  it("vanishes at rest and saturates at speed", () => {
    expect(steerWeight(0)).toBe(0);
    expect(steerWeight(50)).toBeLessThan(0.05);
    expect(steerWeight(3000)).toBeGreaterThan(0.99);
  });
});

describe("gravityRamp", () => {
  it("holds off during the still-delay, then fades in", () => {
    expect(gravityRamp(0)).toBe(0);
    expect(gravityRamp(GRAVITY_DELAY_MS)).toBe(0);
    const mid = gravityRamp(GRAVITY_DELAY_MS + GRAVITY_RAMP_MS / 2);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(gravityRamp(GRAVITY_DELAY_MS + GRAVITY_RAMP_MS)).toBe(1);
    expect(gravityRamp(Infinity)).toBe(1);
  });
});

describe("stepCursor: steering", () => {
  it("converges to the direction of travel", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    for (let i = 0; i < 300; i++) steer(spring, 1.2);
    expect(spring.angle).toBeCloseTo(1.2, 3);
    expect(spring.velocity).toBeCloseTo(0, 3);
  });

  it("overshoots the target before settling (underdamped)", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    let peak = 0;
    for (let i = 0; i < 300; i++) {
      steer(spring, 1);
      peak = Math.max(peak, spring.angle);
    }
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThan(1.5); // slight overshoot, not a wild swing
  });

  it("turns lazily at low speed, tautly at high speed", () => {
    const slow: AngleSpring = { angle: 0, velocity: 0 };
    const fast: AngleSpring = { angle: 0, velocity: 0 };
    for (let i = 0; i < 8; i++) {
      stepCursor(slow, { target: 1.5, speed: 100, gravity: 0, hang: 0, dt: DT });
      stepCursor(fast, { target: 1.5, speed: 3000, gravity: 0, hang: 0, dt: DT });
    }
    expect(fast.angle).toBeGreaterThan(slow.angle * 3);
  });

  it("freewheels at rest before gravity engages", () => {
    const spring: AngleSpring = { angle: 1, velocity: 0 };
    stepCursor(spring, { target: -2, speed: 0, gravity: 0, hang: 0, dt: DT });
    expect(spring.angle).toBe(1); // no torque holds or moves it
    expect(spring.velocity).toBe(0);
  });

  it("rotates through the seam instead of the long way round", () => {
    const spring: AngleSpring = { angle: (170 * Math.PI) / 180, velocity: 0 };
    steer(spring, (-170 * Math.PI) / 180);
    // Velocity should be positive (continuing past +π), not negative (unwinding 340°).
    expect(spring.velocity).toBeGreaterThan(0);
  });

  it("carries existing spin through a near-reversal (long way round)", () => {
    // Already spinning CCW at 8 rad/s when a ~180° flip arrives: the error
    // should resolve with the spin (accelerate), not fight it.
    const spring: AngleSpring = { angle: 0, velocity: 8 };
    steer(spring, -3);
    expect(spring.velocity).toBeGreaterThan(8);
  });

  it("does not spin-carry from rest", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    steer(spring, -3);
    expect(spring.velocity).toBeLessThan(0); // takes the shortest path
  });

  it("winds into full spins when wiggle flicks pump in energy", () => {
    // A hand wiggle at ~8Hz: steering flips between 0 and π while each
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
      steer(spring, phase === 0 ? 0 : Math.PI);
      total += spring.angle - before;
    }
    expect(Math.abs(total)).toBeGreaterThan(2 * Math.PI);
  });

  it("clamps huge dt so the integration stays stable", () => {
    const spring: AngleSpring = { angle: 0, velocity: 0 };
    stepCursor(spring, { target: 1, speed: 3000, gravity: 0, hang: 0, dt: 5 });
    const expected: AngleSpring = { angle: 0, velocity: 0 };
    stepCursor(expected, { target: 1, speed: 3000, gravity: 0, hang: 0, dt: MAX_DT });
    expect(spring.angle).toBeCloseTo(expected.angle);
    expect(Math.abs(spring.angle)).toBeLessThan(Math.PI);
  });
});

describe("stepCursor: gravity pendulum", () => {
  it("starts gently, then accelerates through the hang point", () => {
    // Released 2 rad off the hang pose. sin() torque means the fastest
    // moment of the swing is at the bottom, not the start.
    const spring: AngleSpring = { angle: 2, velocity: 0 };
    let peakSpeed = 0;
    let angleAtPeak = 2;
    for (let i = 0; i < 120; i++) {
      hangStep(spring, 0);
      if (Math.abs(spring.velocity) > peakSpeed) {
        peakSpeed = Math.abs(spring.velocity);
        angleAtPeak = spring.angle;
      }
      // Barely under way 1/6s in — full steering would already be past 0.
      if (i === 10) expect(spring.angle).toBeGreaterThan(1.5);
    }
    // Fastest moment lands in the lower half of the fall (damping pulls it a
    // little ahead of the exact bottom).
    expect(Math.abs(angleAtPeak)).toBeLessThan(1);
  });

  it("swings through with diminishing oscillations and comes to rest", () => {
    const spring: AngleSpring = { angle: 2, velocity: 0 };
    let crossings = 0;
    let prevSign = 1;
    for (let i = 0; i < 600; i++) {
      hangStep(spring, 0);
      const sign = Math.sign(spring.angle);
      if (sign !== 0 && sign !== prevSign) {
        crossings++;
        prevSign = sign;
      }
    }
    expect(crossings).toBeGreaterThanOrEqual(2); // pendulum, not a one-way ease
    expect(spring.angle).toBeCloseTo(0, 1); // at rest within 10s
  });

  it("always falls, even from the inverted balance point", () => {
    const spring: AngleSpring = { angle: Math.PI, velocity: 0 };
    for (let i = 0; i < 600; i++) hangStep(spring, 0);
    expect(Math.abs(shortestAngleDelta(spring.angle, 0))).toBeLessThan(0.2);
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
