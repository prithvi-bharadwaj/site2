/**
 * Forces you can apply to a page of glyph bodies: the gravity drop, the table
 * slam, cursor brushing, taps, and the two ways of getting everything home.
 *
 * Nothing here integrates - it only sets velocities and the per-body springs
 * that ./letter-physics reads.
 */

import { PILE_PAD, updateExtents, wake, type Body, type PhysicsEnv } from "./letter-body";

/** Sideways fan-out when gravity is switched on, so the pile spreads wide. */
const FAN_OUT = 0.5;
/** Spring that walks a letter back over its own column. */
const HOME_PULL = 140;
/** Spring that stands a letter back up. */
const LEVEL_PULL = 90;
/** Knocked-over letters drift home lazily and never straighten themselves. */
const LOOSE_PULL = 45;
/** How firmly a knocked-over letter settles onto a flat side. */
const FACE_PULL = 55;
/** Extra spin for the letters that are meant to go over. */
const TOPPLE_SPIN = 7;

/** Where a body's bottom edge sits when it's resting on its own text line. */
function baselineFor(b: Body): number {
  return b.homeY + b.h / 2;
}

/**
 * Send one letter back to the line it came from. `keepTilt` letters drift home
 * lazily and settle onto whichever flat side they end up on; the rest walk back
 * into their column and stand up straight.
 */
function setReturn(b: Body, keepTilt: boolean, rng: () => number) {
  b.homing = false;
  b.baseline = baselineFor(b);
  // Back to exact boxes: these letters are going to sit in words again.
  b.pad = 1;
  updateExtents(b);
  // Returning letters pass through each other. Each has a clean spot waiting,
  // and colliding on the way there only gets one perched on top of another, a
  // whole line above where it belongs.
  b.ghost = true;
  if (keepTilt) {
    b.homePull = LOOSE_PULL;
    b.levelPull = 0;
    b.facePull = FACE_PULL;
    // Enough spin to actually go over, so some land flat on their side.
    b.va += (rng() - 0.5) * 2 * TOPPLE_SPIN;
  } else {
    b.homePull = HOME_PULL;
    b.levelPull = LEVEL_PULL;
    b.facePull = 0;
  }
}

/**
 * Kick everything loose so it falls - the gravity switch. Letters fan away
 * from the middle on the way down so the pile spreads across the floor
 * instead of collapsing into one over-packed column.
 */
export function dropAll(
  bodies: Body[],
  env: PhysicsEnv,
  rng: () => number = Math.random
) {
  const centerX = env.width / 2;
  for (const b of bodies) {
    b.homing = false;
    b.sleeping = false;
    b.restFrames = 0;
    b.contact = false;
    // No line to go back to and no reason to stay upright: fall to the floor.
    b.baseline = Number.POSITIVE_INFINITY;
    b.homePull = 0;
    b.levelPull = 0;
    b.facePull = 0;
    b.ghost = false;
    b.pad = PILE_PAD;
    b.vx = (b.x - centerX) * FAN_OUT + (rng() - 0.5) * 40;
    b.vy = rng() * 30;
    b.va = (rng() - 0.5) * 1.4;
    updateExtents(b);
  }
}

/**
 * Point every letter back at the line it came from and let physics carry it
 * there. Most straighten up on the way; the rest keep whatever tilt they pick
 * up, so a slam leaves a few lying on their side against their neighbours.
 */
export function markReturning(
  bodies: Body[],
  keepTiltRatio = 0.14,
  rng: () => number = Math.random
) {
  for (const b of bodies) setReturn(b, rng() < keepTiltRatio, rng);
}

/**
 * The slam. A radial jolt from (ox, oy) with an upward bias - a hit from under
 * the table throws letters up and outward, the closest ones hardest.
 */
export function applyImpulse(
  bodies: Body[],
  ox: number,
  oy: number,
  power: number,
  falloff: number,
  rng: () => number = Math.random
) {
  for (const b of bodies) {
    const dx = b.x - ox;
    const dy = b.y - oy;
    const dist = Math.hypot(dx, dy) || 1;
    const p = power * (1 / (1 + dist / falloff)) * (0.75 + rng() * 0.5);
    b.homing = false;
    wake(b);
    b.vx += (dx / dist) * p * 0.5;
    b.vy += (dy / dist) * p * 0.3 - p * 0.8;
    b.va += (rng() - 0.5) * p * 0.012;
  }
}

/**
 * A tap: local jolt centred on the pointer. With `tidy` set, the letters it
 * catches are also told to find their way back to their line afterwards, which
 * is what makes tapping around after a slam feel like knocking things over
 * rather than wrecking the page.
 */
export function pokeAt(
  bodies: Body[],
  x: number,
  y: number,
  power: number,
  radius: number,
  tidy: boolean,
  keepTiltRatio = 0.14,
  rng: () => number = Math.random
) {
  const r2 = radius * radius;
  for (const b of bodies) {
    const dx = b.x - x;
    const dy = b.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const dist = Math.sqrt(d2) || 1;
    const p = power * (1 - dist / radius);
    if (tidy) setReturn(b, rng() < keepTiltRatio, rng);
    b.homing = false;
    wake(b);
    b.vx += (dx / dist) * p;
    b.vy += (dy / dist) * p - p * 0.35;
    b.va += (rng() - 0.5) * p * 0.02;
  }
}

/**
 * Cursor brushing, applied every frame. Letters get shoved out of the way, and
 * when `tidy` is set (after a slam, where every letter still has a line to go
 * back to) being brushed also puts a knocked-over letter back on its feet.
 */
export function brushAt(
  bodies: Body[],
  x: number,
  y: number,
  radius: number,
  strength: number,
  dt: number,
  tidy: boolean
): boolean {
  const r2 = radius * radius;
  let touched = false;
  for (const b of bodies) {
    if (b.homing) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const dist = Math.sqrt(d2) || 1;
    const push = strength * (1 - dist / radius) * dt;
    b.vx += (dx / dist) * push;
    b.vy += (dy / dist) * push * 0.6;
    wake(b);
    touched = true;
    // Brushing a knocked-over letter stands it back up.
    if (tidy) setReturn(b, false, Math.random);
  }
  return touched;
}

/** Point every body at its exact starting spot, for the kinematic snap. */
export function resetTargets(bodies: Body[]) {
  for (const b of bodies) {
    b.pad = 1;
    b.targetX = b.homeX;
    b.targetY = b.homeY;
    b.targetAngle = 0;
  }
}

/** Switch bodies from free physics to the kinematic snap home. */
export function beginHoming(bodies: Body[]) {
  for (const b of bodies) {
    b.homing = true;
    b.sleeping = false;
    b.restFrames = 0;
  }
}

/**
 * Freeze the pile. A page of letters can pack tightly enough that a handful of
 * wedged bodies never quite qualify for sleep on their own; the caller uses
 * this after the pile has visibly stopped so the animation loop can end.
 */
export function forceSettle(bodies: Body[]) {
  for (const b of bodies) {
    if (b.homing) continue;
    b.sleeping = true;
    b.vx = b.vy = b.va = 0;
  }
}
