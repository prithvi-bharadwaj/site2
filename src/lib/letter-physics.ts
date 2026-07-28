/**
 * The integrator behind the gravity switch and the table slam. Bodies collide
 * axis-aligned (using rotated extents) but render with a visual angle, which is
 * enough to read as a real pile of letters without a physics library.
 *
 * Pure logic: no DOM, no rAF, no globals. The caller harvests glyphs, steps the
 * sim, and draws. `rng` is injectable so tests are deterministic.
 *
 * A body gets home two ways. `baseline` + `homePull` + `levelPull` bring it back
 * under its own steam: it arcs down onto the line it came from and settles
 * there, which is what makes the slam look real. `homing` is the kinematic snap
 * used only when the visitor explicitly asks for the page back.
 *
 * Geometry and tunables live in ./letter-body, contacts in ./letter-collision,
 * forces in ./letter-effects.
 */

import {
  REST_SPEED_FACTOR,
  floorFor,
  updateExtents,
  type Body,
  type PhysicsEnv,
} from "./letter-body";
import { resolveCollisions } from "./letter-collision";

export {
  DEFAULT_PHYSICS,
  createBody,
  floorFor,
  updateExtents,
  wake,
  type Body,
  type GlyphSource,
  type PhysicsEnv,
} from "./letter-body";

/** Collision passes per frame; drops while a lot of bodies are in flight.
 *  The zero-alloc broadphase is cheap enough that even the busy floor keeps
 *  letters from visibly sinking into each other. */
const ITERATIONS_MAX = 8;
const ITERATIONS_MIN = 5;
const BUSY_BODIES = 700;
/** Nothing should spin like a helicopter. */
const MAX_SPIN = 12;
/**
 * Terminal velocity, in px/s. Collision is discrete, so a body must never
 * cover more than about its own height in one frame or it punches straight
 * into the pile. 900px/s is 15px per frame at 60fps - one glyph.
 */
const MAX_SPEED = 900;
const SLEEP_SPEED = 12;
/**
 * Sleep test. A page of text packs the pile tight enough that some letters end
 * up wedged and can never fully separate, so what matters isn't penetration -
 * it's whether the body has stopped moving.
 */
const STILL_DISTANCE = 0.12;
const SLEEP_SPIN = 0.12;
const SLEEP_FRAMES = 6;
const QUARTER_TURN = Math.PI / 2;
/** Close enough to level (or to a flat side) to just be there. */
const ANGLE_SNAP = 0.05;
const ANGLE_SNAP_SPIN = 0.3;
/** Same idea for the column a tidying letter is heading back to. */
const HOME_SNAP = 1.2;
const HOME_SNAP_SPEED = 20;
/** Spring constants for the kinematic snap home. */
const HOME_STIFF = 420;
const ANGLE_STIFF = 320;

export function allAsleep(bodies: Body[]): boolean {
  for (const b of bodies) if (!b.sleeping) return false;
  return true;
}

function integrateHoming(b: Body, dt: number) {
  const damp = 2 * Math.sqrt(HOME_STIFF);
  const aDamp = 2 * Math.sqrt(ANGLE_STIFF);
  b.vx += (HOME_STIFF * (b.targetX - b.x) - damp * b.vx) * dt;
  b.vy += (HOME_STIFF * (b.targetY - b.y) - damp * b.vy) * dt;
  b.va += (ANGLE_STIFF * (b.targetAngle - b.angle) - aDamp * b.va) * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.angle += b.va * dt;
  updateExtents(b);

  const settled =
    Math.abs(b.targetX - b.x) < 0.25 &&
    Math.abs(b.targetY - b.y) < 0.25 &&
    Math.abs(b.targetAngle - b.angle) < 0.01 &&
    Math.abs(b.vx) + Math.abs(b.vy) < 6;
  if (settled) {
    b.x = b.targetX;
    b.y = b.targetY;
    b.angle = b.targetAngle;
    b.vx = b.vy = b.va = 0;
    b.sleeping = true;
  }
}

function integrateFree(
  b: Body,
  dt: number,
  env: PhysicsEnv,
  restSpeed: number,
  rng: () => number
) {
  const frames = dt * 60;
  b.support = false;
  b.vy += env.gravity * dt;

  // Heading home: drift back over its own column and stand itself up. Both are
  // real forces, so the letter arcs back and lands instead of teleporting.
  if (b.homePull > 0) {
    b.vx += (b.homePull * (b.homeX - b.x) - 2 * Math.sqrt(b.homePull) * b.vx) * dt;
    // Text only reads right if the letters land exactly back in their columns,
    // so a tidying letter closes the last fraction of a pixel outright.
    if (
      !b.shoved &&
      b.levelPull > 0 &&
      Math.abs(b.homeX - b.x) < HOME_SNAP &&
      Math.abs(b.vx) < HOME_SNAP_SPEED
    ) {
      b.x = b.homeX;
      b.vx = 0;
    }
  } else {
    b.vx *= Math.pow(0.995, frames);
  }
  if (b.levelPull > 0) {
    b.va += (b.levelPull * -b.angle - 2 * Math.sqrt(b.levelPull) * b.va) * dt;
    // Asymptotes are invisible but they'd leave text a couple of degrees off,
    // so the last sliver clicks into place.
    if (Math.abs(b.angle) < ANGLE_SNAP && Math.abs(b.va) < ANGLE_SNAP_SPIN) {
      b.angle = 0;
      b.va = 0;
    }
  } else {
    b.va *= Math.pow(0.94, frames);
    // Resting on something and free to keep its tilt: fall onto the nearest
    // flat side, the way a dropped box ends up on a face.
    if (b.facePull > 0 && b.contact) {
      const face = Math.round(b.angle / QUARTER_TURN) * QUARTER_TURN;
      b.va += (b.facePull * (face - b.angle) - 2 * Math.sqrt(b.facePull) * b.va) * dt;
      if (Math.abs(face - b.angle) < ANGLE_SNAP && Math.abs(b.va) < ANGLE_SNAP_SPIN) {
        b.angle = face;
        b.va = 0;
      }
    }
  }

  if (b.va > MAX_SPIN) b.va = MAX_SPIN;
  else if (b.va < -MAX_SPIN) b.va = -MAX_SPIN;
  if (b.vy > MAX_SPEED) b.vy = MAX_SPEED;
  else if (b.vy < -MAX_SPEED) b.vy = -MAX_SPEED;
  if (b.vx > MAX_SPEED) b.vx = MAX_SPEED;
  else if (b.vx < -MAX_SPEED) b.vx = -MAX_SPEED;

  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.angle += b.va * dt;
  updateExtents(b);

  const hw = b.ew / 2;
  if (b.x < hw) {
    b.x = hw;
    b.vx = -b.vx * 0.35;
    b.va *= 0.7;
  } else if (b.x > env.width - hw) {
    b.x = env.width - hw;
    b.vx = -b.vx * 0.35;
    b.va *= 0.7;
  }

  const hh = b.eh / 2;
  const floorY = floorFor(b, env);
  if (b.y + hh > floorY) {
    b.y = floorY - hh;
    const impact = b.vy;
    if (impact > restSpeed) {
      b.vy = -impact * env.restitution;
      // Landing hard tips the letter over instead of standing it upright.
      if (!b.contact) b.va += (rng() - 0.5) * Math.min(impact, 900) * 0.01;
    } else {
      b.vy = 0;
    }
    b.vx *= env.friction;
    b.va *= 0.62;
    b.support = true;
  }
}

/** Positional-only clamp, run after collisions have shoved bodies around. */
function clampToBounds(b: Body, env: PhysicsEnv) {
  const hw = b.ew / 2;
  const hh = b.eh / 2;
  if (b.x < hw) b.x = hw;
  else if (b.x > env.width - hw) b.x = env.width - hw;
  const floorY = floorFor(b, env);
  if (b.y + hh > floorY) {
    b.y = floorY - hh;
    b.support = true;
  }
}

// Scratch list of awake body indices, reused so stepping allocates nothing.
const awake: number[] = [];

/**
 * Advance the sim one frame. Returns true while anything is still moving, so
 * the caller can stop its rAF loop once the pile settles.
 */
export function stepPhysics(
  bodies: Body[],
  dt: number,
  env: PhysicsEnv,
  rng: () => number = Math.random
): boolean {
  const restSpeed = env.gravity * dt * REST_SPEED_FACTOR;
  awake.length = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.sleeping) continue;
    if (b.homing) {
      integrateHoming(b, dt);
      continue;
    }
    integrateFree(b, dt, env, restSpeed, rng);
    if (!b.ghost) awake.push(i);
  }

  if (awake.length > 0) {
    const iterations = awake.length > BUSY_BODIES ? ITERATIONS_MIN : ITERATIONS_MAX;
    resolveCollisions(bodies, awake, restSpeed, iterations, rng);
  }

  let moving = false;
  for (const b of bodies) {
    if (b.homing) {
      if (!b.sleeping) moving = true;
      continue;
    }
    if (b.sleeping) continue;
    updateExtents(b);
    clampToBounds(b, env);
    const speed = Math.abs(b.vx) + Math.abs(b.vy);
    const moved =
      Math.abs(b.x - b.lastX) +
      Math.abs(b.y - b.lastY) +
      Math.abs(b.angle - b.lastAngle) * 8;
    b.lastX = b.x;
    b.lastY = b.y;
    b.lastAngle = b.angle;
    // `contact` gives one frame of grace, so a body that separates by a hair
    // and drops back onto its support still counts as resting.
    if (
      (b.support || b.contact) &&
      moved < STILL_DISTANCE &&
      speed < SLEEP_SPEED &&
      Math.abs(b.va) < SLEEP_SPIN &&
      // A letter that's tidying itself up doesn't get to sleep visibly crooked
      // or adrift. Near enough rather than exact: two settled letters whose
      // boxes touch nudge each other by a fraction of a pixel forever, and
      // demanding an exact match there means never sleeping.
      (b.levelPull === 0 ||
        (Math.abs(b.angle) < ANGLE_SNAP && Math.abs(b.x - b.homeX) < HOME_SNAP))
    ) {
      if (++b.restFrames > SLEEP_FRAMES) {
        b.sleeping = true;
        b.ghost = false;
        b.vx = b.vy = b.va = 0;
      } else {
        moving = true;
      }
    } else {
      b.restFrames = 0;
      moving = true;
    }
    b.contact = b.support;
    // One frame only - brushAt re-sets it while the cursor stays on the body.
    b.shoved = false;
  }
  return moving;
}
