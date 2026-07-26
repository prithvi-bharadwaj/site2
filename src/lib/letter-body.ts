/**
 * The glyph body: what it is, how big it is, and the shared tunables that both
 * the integrator (./letter-physics) and the collision solver
 * (./letter-collision) need. No behaviour beyond geometry lives here.
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
  /** Element the glyph came from, so color can be re-resolved on theme flips. */
  el?: Element;
}

export interface Body {
  char: string;
  font: string;
  color: string;
  alpha: number;
  img?: HTMLImageElement;
  el?: Element;
  w: number;
  h: number;
  ascent: number;
  /** Center position. */
  x: number;
  y: number;
  /** Where the glyph started, so it can find its way back. */
  homeX: number;
  homeY: number;
  angle: number;
  vx: number;
  vy: number;
  va: number;
  /** Rotated bounding extents, refreshed on every integrate. */
  ew: number;
  eh: number;
  /**
   * Collision box padding. 1 keeps the box exactly on the glyph, which is what
   * letters sitting in a word need - their boxes already touch, so anything
   * bigger has them shoving each other apart while nothing is happening. A
   * loose pile has no such constraint, and padding there is what stops letters
   * visibly sitting inside each other.
   */
  pad: number;
  /**
   * The y this body's bottom edge rests on - its own text baseline once it's
   * heading home, otherwise Infinity, meaning "fall all the way to the floor".
   */
  baseline: number;
  /** Spring pulling it back over its home column (0 = drifting free). */
  homePull: number;
  /** Spring pulling it back upright (0 = keeps whatever tilt it landed with). */
  levelPull: number;
  /**
   * Spring settling it onto the nearest flat side once it's resting - a box
   * comes to rest on a face, so a knocked-over letter ends up upright or
   * properly on its side rather than frozen at some arbitrary angle.
   */
  facePull: number;
  /**
   * Passes through other letters. A letter tidying itself back onto its own
   * line has a clean spot waiting for it, so colliding on the way there only
   * risks it perching on a neighbour and staying there like litter. Cleared
   * automatically the moment it comes to rest.
   */
  ghost: boolean;
  /** Kinematic snap home: springs only, no gravity, no collisions. */
  homing: boolean;
  targetX: number;
  targetY: number;
  targetAngle: number;
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
export const CELL = 26;
/**
 * Under-relax the positional correction. Long rows of letters push on each
 * other; correcting fully every pass makes the row oscillate instead of settle.
 */
export const RELAX = 0.75;
/**
 * Glyphs are tall and narrow, so strict least-penetration resolution squirts
 * them out sideways instead of stacking. Bias toward separating vertically.
 */
export const VERTICAL_BIAS = 1.4;
/**
 * Leave a sliver of overlap so resting contacts don't jitter, and so letters
 * sitting in a word - whose glyph boxes touch, and kern into each other by a
 * fraction of a pixel - don't shove each other apart while nothing is going on.
 */
export const SLOP = 0.8;
/** Deeper than this, and only from a real impact, wakes a sleeping body. */
export const WAKE_PENETRATION = 1.6;
/** Sideways kick when a letter lands off-centre on another one. */
export const SLIDE_OFF = 90;
/**
 * A resting body still gains `gravity * dt` of downward speed every frame.
 * Anything at or below that much closing speed is a resting contact, not an
 * impact - bouncing or tipping on it would make piles buzz forever.
 */
export const REST_SPEED_FACTOR = 1.6;
/**
 * Padding for a pile, where letters are loose and no longer have to sit
 * flush inside words. Measured over a 1500-letter pile, this cuts the area
 * where glyphs visibly overlap by about two thirds.
 */
export const PILE_PAD = 1.12;

export function createBody(g: GlyphSource): Body {
  const x = g.x + g.w / 2;
  const y = g.y + g.h / 2;
  return {
    char: g.char,
    font: g.font,
    color: g.color,
    alpha: g.alpha,
    img: g.img,
    el: g.el,
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
    pad: 1,
    baseline: Number.POSITIVE_INFINITY,
    homePull: 0,
    levelPull: 0,
    facePull: 0,
    ghost: false,
    homing: false,
    targetX: x,
    targetY: y,
    targetAngle: 0,
    sleeping: false,
    support: false,
    contact: false,
    lastX: x,
    lastY: y,
    lastAngle: 0,
    restFrames: 0,
  };
}

export function updateExtents(b: Body) {
  const c = Math.abs(Math.cos(b.angle));
  const s = Math.abs(Math.sin(b.angle));
  b.ew = (b.w * c + b.h * s) * b.pad;
  b.eh = (b.w * s + b.h * c) * b.pad;
}

export function wake(b: Body) {
  b.sleeping = false;
  b.restFrames = 0;
  // Whatever hit it counts as a fresh impact, so it can tip again.
  b.contact = false;
}

/**
 * The y this body's bottom rests on: its own line if it has one, else the
 * screen floor. A letter from the half-visible line at the bottom of the
 * viewport has a baseline below the floor, and that's still where it belongs -
 * clamping it to the floor instead leaves a smear of letters along the bottom
 * edge, which is exactly where the real text was clipped anyway.
 */
export function floorFor(b: Body, env: PhysicsEnv): number {
  return b.baseline === Number.POSITIVE_INFINITY ? env.floorY : b.baseline;
}
