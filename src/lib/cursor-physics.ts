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
  const delta = shortestAngleDelta(spring.angle, target);
  spring.velocity += (STIFFNESS * delta - DAMPING * spring.velocity) * clamped;
  spring.angle += spring.velocity * clamped;
}
