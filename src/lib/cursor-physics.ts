/**
 * Rotational physics for the weighted cursor.
 *
 * The cursor position tracks the mouse exactly (a laggy hotspot feels broken);
 * only the heading is physical: the arrow is a rigid body hinged at its tip.
 * Every frame it integrates the sum of three continuous torques — there are
 * no modes and no mode switches, so nothing ever snaps:
 *
 *  - steering: aligns the heading to the direction of travel. Its authority
 *    (and its damping) scale with speed like aerodynamic torque on a dart —
 *    full grip at a flick, feather-light at a crawl, zero at rest.
 *  - gravity: a true sin() pendulum toward the hanging pose. Torque is
 *    maximal when the arrow lies sideways and zero at the bottom, so the
 *    return swing starts gently, accelerates as it falls, and carries
 *    through the hang point at peak speed — unlike a linear spring, which
 *    decelerates into the target. Gravity fades in only after the mouse has
 *    been still for a beat (the hand "letting go" of the hinge).
 *  - hinge friction: small always-on damping that bleeds every swing down.
 */

const TAU = Math.PI * 2;

/** Steering at full authority: underdamped, one visible overshoot. */
export const STEER_STIFFNESS = 220; // rad/s² per rad of error
export const STEER_DAMPING = 15; // rad/s² per rad/s, scales with speed weight
/** Speed (px/s) where steering reaches half authority. */
export const STEER_REF_SPEED = 250;

/** Always-on hinge friction. With gravity: ζ ≈ 0.36 → swings carry ~30%. */
export const HINGE_DAMPING = 2.5;

/** Pendulum strength: rad/s² when the arrow lies sideways off the hang pose. */
export const GRAVITY = 12;
/** Stillness before gravity starts to take hold… */
export const GRAVITY_DELAY_MS = 800;
/** …and how long it takes to reach full strength (smoothstepped). */
export const GRAVITY_RAMP_MS = 1500;

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

/** Steering authority for a given speed, 0..1 (aerodynamic: ∝ speed²). */
export function steerWeight(speed: number): number {
  const r = speed / STEER_REF_SPEED;
  return (r * r) / (1 + r * r);
}

/** Gravity strength 0..1 for how long the mouse has been still (ms). */
export function gravityRamp(stillMs: number): number {
  const t = Math.min(Math.max((stillMs - GRAVITY_DELAY_MS) / GRAVITY_RAMP_MS, 0), 1);
  return t * t * (3 - 2 * t);
}

export interface CursorForces {
  /** Direction of travel (rad). */
  target: number;
  /** Smoothed cursor speed (px/s). */
  speed: number;
  /** Gravity strength 0..1 (see gravityRamp). */
  gravity: number;
  /** The hanging pose gravity pulls toward (rad). */
  hang: number;
  /** Seconds since last step. */
  dt: number;
}

/** Integrate one frame of the torque model (semi-implicit Euler). */
export function stepCursor(spring: AngleSpring, f: CursorForces): void {
  const dt = Math.min(f.dt, MAX_DT);
  const w = steerWeight(f.speed);

  let delta = shortestAngleDelta(spring.angle, f.target);
  if (
    Math.abs(delta) > SPIN_CARRY_THRESHOLD &&
    Math.abs(spring.velocity) > SPIN_CARRY_MIN_VELOCITY &&
    Math.sign(delta) !== Math.sign(spring.velocity)
  ) {
    delta -= Math.sign(delta) * TAU;
  }

  // sin() leverage: zero hanging, maximal sideways. Floored near the inverted
  // balance point — a real pendulum balanced exactly upside down never falls,
  // but the arrow always should.
  const hangDelta = shortestAngleDelta(spring.angle, f.hang);
  let lever = Math.sin(hangDelta);
  if (Math.abs(hangDelta) > 3) {
    lever = Math.sign(hangDelta) * Math.max(Math.abs(lever), 0.14);
  }

  const torque = STEER_STIFFNESS * w * delta + GRAVITY * f.gravity * lever;
  const damping = HINGE_DAMPING + STEER_DAMPING * w;
  spring.velocity += (torque - damping * spring.velocity) * dt;
  spring.angle += spring.velocity * dt;
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
