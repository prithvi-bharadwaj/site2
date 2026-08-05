/**
 * Angular spring for the weighted cursor.
 *
 * The cursor position tracks the mouse exactly (a laggy hotspot feels broken);
 * only the heading is physical. The heading chases the direction of travel
 * with an underdamped torsion spring, so quick turns swing past the target
 * and settle back — that overshoot is the "weight".
 */

const TAU = Math.PI * 2;

/** Underdamped: damping ratio ≈ 0.6 → one visible overshoot, quick settle. */
export const STIFFNESS = 220; // rad/s² per rad of error
export const DAMPING = 18; // rad/s² per rad/s

/** Cap dt so a background-tab pause doesn't explode the integration. */
export const MAX_DT = 1 / 30;

/**
 * Momentum steering: a near-reversal (error beyond this) that arrives while
 * the dart is already spinning resolves the long way round, with the spin.
 * Rapid wiggling therefore chains half-turns into continuous full spins
 * instead of oscillating — the "forces" the hand puts in accumulate.
 */
export const SPIN_CARRY_THRESHOLD = 2; // rad of error
export const SPIN_CARRY_MIN_VELOCITY = 3; // rad/s of existing spin

/**
 * Flick impulses: a hand wiggle reverses the mouse velocity faster than the
 * spring can follow, so steering alone can't spin the dart. Each reversal
 * (>90° turn with real speed on both sides) instead lands as a direct kick
 * of angular velocity, spinning with whatever rotation already exists.
 * Wiggle fast enough and the kicks outrun the damping — full spins.
 */
export const FLICK_MIN_SPEED = 300; // px/s on both sides of the turn
export const FLICK_KICK = 8; // rad/s per flick
/**
 * Flicks within this window kick the same direction: a wiggle is one gesture,
 * so its reversals must pump one way instead of cancelling each other out.
 */
export const FLICK_MEMORY_MS = 300;

export interface AngleSpring {
  angle: number;
  /** rad/s */
  velocity: number;
}

/** Signed shortest rotation from `from` to `to`, in (-π, π]. */
export function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** Advance the spring toward `target` by `dt` seconds (semi-implicit Euler). */
export function stepAngleSpring(spring: AngleSpring, target: number, dt: number): void {
  const clamped = Math.min(dt, MAX_DT);
  let delta = shortestAngleDelta(spring.angle, target);
  if (
    Math.abs(delta) > SPIN_CARRY_THRESHOLD &&
    Math.abs(spring.velocity) > SPIN_CARRY_MIN_VELOCITY &&
    Math.sign(delta) !== Math.sign(spring.velocity)
  ) {
    delta -= Math.sign(delta) * TAU;
  }
  spring.velocity += (STIFFNESS * delta - DAMPING * spring.velocity) * clamped;
  spring.angle += spring.velocity * clamped;
}

/** True when successive velocity samples (px/s) form a >90° turn at speed. */
export function isFlick(prevVx: number, prevVy: number, vx: number, vy: number): boolean {
  return (
    prevVx * vx + prevVy * vy < 0 &&
    Math.hypot(prevVx, prevVy) > FLICK_MIN_SPEED &&
    Math.hypot(vx, vy) > FLICK_MIN_SPEED
  );
}

/**
 * Kick from a flick. `preferredDir` (±1) pins the direction for an ongoing
 * wiggle burst; pass 0 for a fresh gesture, which spins with the existing
 * rotation, else with the turn's cross product. Returns the direction used
 * so the caller can remember it for FLICK_MEMORY_MS.
 */
export function applyFlick(
  spring: AngleSpring,
  prevVx: number,
  prevVy: number,
  vx: number,
  vy: number,
  preferredDir = 0,
): number {
  const cross = prevVx * vy - prevVy * vx;
  const dir =
    preferredDir ||
    (Math.abs(spring.velocity) > 1 ? Math.sign(spring.velocity) : cross >= 0 ? 1 : -1);
  spring.velocity += dir * FLICK_KICK;
  return dir;
}
