/**
 * Physics for individual glyphs - the engine behind the gravity switch and the
 * table slam. Bodies are boxes that collide axis-aligned (using rotated extents)
 * but render with a visual angle, which is enough to read as a real pile of
 * letters without pulling in a physics library.
 *
 * Pure logic: no DOM, no rAF, no globals. The caller harvests glyphs, steps the
 * sim, and draws. `rng` is injectable so tests are deterministic.
 */

export interface GlyphSource {
  char: string;
  /** Top-left of the glyph box, in viewport coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Baseline offset from the top of the box, for canvas fillText. */
  ascent: number;
  font: string;
  color: string;
  alpha: number;
  /** Inline images (favicons, logos) fall too. */
  img?: HTMLImageElement;
}

export interface Body {
  char: string;
  font: string;
  color: string;
  alpha: number;
  img?: HTMLImageElement;
  w: number;
  h: number;
  ascent: number;
  /** Center position. */
  x: number;
  y: number;
  /** Where the glyph started, so it can go back. */
  homeX: number;
  homeY: number;
  angle: number;
  vx: number;
  vy: number;
  va: number;
  /** Rotated bounding extents, refreshed on every integrate. */
  ew: number;
  eh: number;
  /** Spring destination while homing. */
  targetX: number;
  targetY: number;
  targetAngle: number;
  /** Homing bodies are kinematic: springs only, no gravity, no collisions. */
  homing: boolean;
  sleeping: boolean;
  /** Resting on the floor or another body this frame. */
  support: boolean;
  /** Was in contact at the end of the previous frame - tells a real impact
   *  apart from a resting contact, which is what keeps piles from spinning. */
  contact: boolean;
  /** Position at the end of the previous frame, for the "has it actually
   *  stopped moving" sleep test. */
  lastX: number;
  lastY: number;
  lastAngle: number;
  restFrames: number;
}

export interface PhysicsEnv {
  width: number;
  floorY: number;
  gravity: number;
  restitution: number;
  friction: number;
}

export const DEFAULT_PHYSICS: Omit<PhysicsEnv, "width" | "floorY"> = {
  gravity: 2200,
  restitution: 0.22,
  friction: 0.9,
};

/** Grid cell for the broadphase - about two glyphs wide. */
const CELL = 26;
/** Collision passes per frame. More passes = tighter stacks, more cost. */
const ITERATIONS = 6;
/**
 * Under-relax the positional correction. Long rows of letters push on each
 * other; correcting fully every pass makes the row oscillate instead of settle.
 */
const RELAX = 0.75;
/**
 * Glyphs are tall and narrow, so strict least-penetration resolution squirts
 * them out sideways instead of stacking. Bias toward separating vertically.
 */
const VERTICAL_BIAS = 1.4;
/** Nothing should spin like a helicopter. */
const MAX_SPIN = 12;
/**
 * Terminal velocity, in px/s. Collision is discrete, so a body must never
 * cover more than about its own height in one frame or it punches straight
 * into the pile. 900px/s is 15px per frame at 60fps - one glyph.
 */
const MAX_SPEED = 900;
/** Sideways kick when a letter lands off-centre on another one. */
const SLIDE_OFF = 90;
/**
 * Collision boxes are a little smaller than the glyphs. A page of text is
 * dense enough that boxes at full size can't all fit in the pile without
 * overlapping, which jams the solver; letting them tuck in slightly is
 * invisible and keeps the pile solvable.
 */
const COLLIDE_SCALE = 0.86;
/** Sideways fan-out when gravity is switched on, so the pile spreads wide. */
const FAN_OUT = 0.5;
/** Leave a sliver of overlap so resting contacts don't jitter. */
const SLOP = 0.5;
/**
 * A resting body still gains `gravity * dt` of downward speed every frame.
 * Anything at or below that much closing speed is a resting contact, not an
 * impact - bouncing or tipping on it would make piles buzz forever.
 */
const REST_SPEED_FACTOR = 1.6;
const SLEEP_SPEED = 12;
/**
 * Sleep test. A page of text packs the pile tight enough that some letters end
 * up wedged and can never fully separate, so what matters isn't penetration -
 * it's whether the body has stopped moving.
 */
const STILL_DISTANCE = 0.12;
const SLEEP_SPIN = 0.12;
const SLEEP_FRAMES = 6;
const WAKE_PENETRATION = 2;
/** Spring constants for the trip home (critically damped). */
const HOME_STIFF = 260;
const ANGLE_STIFF = 200;

export function createBody(g: GlyphSource): Body {
  const x = g.x + g.w / 2;
  const y = g.y + g.h / 2;
  return {
    char: g.char,
    font: g.font,
    color: g.color,
    alpha: g.alpha,
    img: g.img,
    w: g.w,
    h: g.h,
    ascent: g.ascent,
    x,
    y,
    homeX: x,
    homeY: y,
    angle: 0,
    vx: 0,
    vy: 0,
    va: 0,
    ew: g.w,
    eh: g.h,
    targetX: x,
    targetY: y,
    targetAngle: 0,
    homing: false,
    sleeping: false,
    support: false,
    contact: false,
    lastX: x,
    lastY: y,
    lastAngle: 0,
    restFrames: 0,
  };
}

function updateExtents(b: Body) {
  const c = Math.abs(Math.cos(b.angle));
  const s = Math.abs(Math.sin(b.angle));
  b.ew = (b.w * c + b.h * s) * COLLIDE_SCALE;
  b.eh = (b.w * s + b.h * c) * COLLIDE_SCALE;
}

function wake(b: Body) {
  b.sleeping = false;
  b.restFrames = 0;
  // Whatever hit it counts as a fresh impact, so it can tip again.
  b.contact = false;
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
    b.vx = (b.x - centerX) * FAN_OUT + (rng() - 0.5) * 40;
    b.vy = rng() * 30;
    b.va = (rng() - 0.5) * 1.4;
    updateExtents(b);
  }
}

/**
 * Radial blast from (ox, oy) with a strong upward bias - a slam from under the
 * table throws letters up and outward, closer ones harder.
 */
export function applyImpulse(
  bodies: Body[],
  ox: number,
  oy: number,
  power: number,
  rng: () => number = Math.random
) {
  for (const b of bodies) {
    const dx = b.x - ox;
    const dy = b.y - oy;
    const dist = Math.hypot(dx, dy) || 1;
    const falloff = 1 / (1 + dist / 340);
    const p = power * falloff * (0.7 + rng() * 0.6);
    b.homing = false;
    wake(b);
    b.vx += (dx / dist) * p * 0.85;
    b.vy += (dy / dist) * p * 0.45 - p * 0.8;
    b.va += (rng() - 0.5) * p * 0.02;
  }
}

export type SmashFate = "home" | "nudged" | "leaning" | "fallen";

/**
 * Decide where each letter ends up after a slam. Most snap back exactly; a
 * minority stay knocked over - tilted, shoved, or lying on their side on the
 * baseline, like chess pieces that landed sideways.
 */
export function assignSmashTargets(
  bodies: Body[],
  displacedRatio = 0.16,
  rng: () => number = Math.random
): SmashFate[] {
  return bodies.map((b) => {
    b.targetX = b.homeX;
    b.targetY = b.homeY;
    b.targetAngle = 0;
    if (rng() > displacedRatio) return "home";

    const dir = rng() < 0.5 ? -1 : 1;
    const roll = rng();
    if (roll < 0.34) {
      // Flat on its side: keep the bottom edge on the baseline while the box
      // gets shorter, so the letter looks like it toppled onto the line.
      b.targetAngle = dir * (Math.PI / 2 + (rng() - 0.5) * 0.22);
      b.targetY = b.homeY + (b.h - b.w) / 2;
      b.targetX = b.homeX + dir * (1 + rng() * 4);
      return "fallen";
    }
    if (roll < 0.75) {
      // Leaning on the neighbour it fell against.
      b.targetAngle = dir * (0.28 + rng() * 0.34);
      b.targetX = b.homeX + dir * (2 + rng() * 4);
      b.targetY = b.homeY + rng() * 2;
      return "leaning";
    }
    b.targetAngle = dir * (0.06 + rng() * 0.12);
    b.targetX = b.homeX + dir * (1 + rng() * 2);
    b.targetY = b.homeY + rng() * 1.5;
    return "nudged";
  });
}

/** Point every body back at its exact starting spot. */
export function resetTargets(bodies: Body[]) {
  for (const b of bodies) {
    b.targetX = b.homeX;
    b.targetY = b.homeY;
    b.targetAngle = 0;
  }
}

/** Switch bodies from free-fall to spring-home. */
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
  b.vx *= Math.pow(0.995, frames);
  b.va *= Math.pow(0.94, frames);
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
  if (b.y + hh > env.floorY) {
    b.y = env.floorY - hh;
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
  if (b.y + hh > env.floorY) {
    b.y = env.floorY - hh;
    b.support = true;
  }
}

function cellKey(cx: number, cy: number) {
  return (cx + 4096) * 16384 + (cy + 4096);
}

function separateVertical(
  upper: Body,
  lower: Body,
  depth: number,
  restSpeed: number,
  rng: () => number
) {
  // At resting depth there's nothing to push apart, but the contact is still
  // real: the upper body has support, which is what lets a pile fall asleep.
  const push = Math.max(0, depth - SLOP) * RELAX;
  const closing = upper.vy - lower.vy;
  // Only an actual impact wakes a sleeper. Static overlap in a packed pile
  // must not, or the pile wakes and re-sleeps itself forever.
  const impact = depth > WAKE_PENETRATION && closing > restSpeed;
  if (lower.sleeping) {
    upper.y -= push;
    if (impact) wake(lower);
  } else if (upper.sleeping) {
    lower.y += push;
    if (impact) wake(upper);
  } else {
    upper.y -= push / 2;
    lower.y += push / 2;
  }

  if (closing > restSpeed) {
    const avg = (upper.vy + lower.vy) * 0.5;
    if (!upper.sleeping) upper.vy = avg * 0.25;
    if (!lower.sleeping) lower.vy = avg * 0.25;
    if (!upper.contact) {
      // Landing off-centre on the body below: tip toward the overhang and
      // slide that way, which is what turns towers into a spread-out pile.
      const span = Math.max(1, (upper.ew + lower.ew) / 2);
      const off = Math.max(-1, Math.min(1, (upper.x - lower.x) / span));
      const scatter = off === 0 ? (rng() - 0.5) * 0.4 : off;
      upper.va += scatter * 1.1 + (rng() - 0.5) * 0.3;
      upper.vx += scatter * SLIDE_OFF + (rng() - 0.5) * 20;
    }
  } else if (closing > 0 && !upper.sleeping) {
    // Resting on it: settle to the support's speed instead of micro-bouncing.
    upper.vy = lower.vy;
  }
  upper.vx *= 0.82;
  upper.support = true;
}

function separateHorizontal(left: Body, right: Body, depth: number, restSpeed: number) {
  const push = Math.max(0, depth - SLOP) * RELAX;
  const closing = left.vx - right.vx;
  const impact = depth > WAKE_PENETRATION && closing > restSpeed;
  if (right.sleeping) {
    left.x -= push;
    if (impact) wake(right);
  } else if (left.sleeping) {
    right.x += push;
    if (impact) wake(left);
  } else {
    left.x -= push / 2;
    right.x += push / 2;
  }
  if (closing > 0) {
    const avg = (left.vx + right.vx) * 0.5;
    if (!left.sleeping) left.vx = avg * 0.4;
    if (!right.sleeping) right.vx = avg * 0.4;
  }
}

function resolvePair(a: Body, b: Body, restSpeed: number, rng: () => number) {
  if (a.sleeping && b.sleeping) return;
  const dx = b.x - a.x;
  const px = (a.ew + b.ew) / 2 - Math.abs(dx);
  if (px <= 0) return;
  const dy = b.y - a.y;
  const py = (a.eh + b.eh) / 2 - Math.abs(dy);
  if (py <= 0) return;

  if (py <= px * VERTICAL_BIAS) {
    if (dy >= 0) separateVertical(a, b, py, restSpeed, rng);
    else separateVertical(b, a, py, restSpeed, rng);
  } else {
    if (dx >= 0) separateHorizontal(a, b, px, restSpeed);
    else separateHorizontal(b, a, px, restSpeed);
  }
}

function resolveCollisions(bodies: Body[], restSpeed: number, rng: () => number) {
  const grid = new Map<number, number[]>();
  const active: number[] = [];
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.homing) continue;
    active.push(i);
    const key = cellKey(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    const cell = grid.get(key);
    if (cell) cell.push(i);
    else grid.set(key, [i]);
  }

  // Bottom-up: the pile is solved from the floor upward, so corrections
  // propagate through a deep stack in a single pass instead of over frames.
  active.sort((i, j) => bodies[j].y - bodies[i].y);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const i of active) {
      const a = bodies[i];
      const cx = Math.floor(a.x / CELL);
      const cy = Math.floor(a.y / CELL);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(cellKey(cx + ox, cy + oy));
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            resolvePair(a, bodies[j], restSpeed, rng);
          }
        }
      }
    }
  }
}

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

  for (const b of bodies) {
    if (b.sleeping) continue;
    if (b.homing) integrateHoming(b, dt);
    else integrateFree(b, dt, env, restSpeed, rng);
  }

  resolveCollisions(bodies, restSpeed, rng);

  let moving = false;
  for (const b of bodies) {
    if (b.homing) {
      if (!b.sleeping) moving = true;
      continue;
    }
    updateExtents(b);
    clampToBounds(b, env);
    if (b.sleeping) continue;
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
      Math.abs(b.va) < SLEEP_SPIN
    ) {
      if (++b.restFrames > SLEEP_FRAMES) {
        b.sleeping = true;
        b.vx = b.vy = b.va = 0;
      } else {
        moving = true;
      }
    } else {
      b.restFrames = 0;
      moving = true;
    }
    b.contact = b.support;
  }
  return moving;
}
