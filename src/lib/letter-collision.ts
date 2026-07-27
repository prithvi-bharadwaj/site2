/**
 * Broadphase + contact resolution for glyph bodies.
 *
 * Only awake bodies drive the loop: they look up their neighbours (awake or
 * not) in a hashed uniform grid, so a settled pile costs nothing per frame.
 * Contacts are resolved positionally, bottom-up, so corrections propagate up
 * through a deep stack within a single frame.
 *
 * The grid is flat typed arrays - bucket heads plus a per-body chain - so
 * rebuilding it every frame allocates nothing. Bodies larger than a cell
 * (heading glyphs) widen their own search radius instead of silently missing
 * pairs, which is what used to let big letters sit inside their neighbours.
 */

import {
  CELL,
  RELAX,
  SLIDE_OFF,
  SLOP,
  VERTICAL_BIAS,
  WAKE_PENETRATION,
  wake,
  type Body,
} from "./letter-body";

const HASH_BITS = 12;
const HASH_SIZE = 1 << HASH_BITS;
const HASH_MASK = HASH_SIZE - 1;
/** Even a display-size glyph spans no more than a few cells. */
const MAX_REACH = 3;

// Reused across frames so stepping allocates nothing once warmed up.
const heads = new Int32Array(HASH_SIZE);
let chain = new Int32Array(2048);
let cellOf = new Int32Array(2048);
/** Largest rotated extent in the current grid, for the search radius. */
let maxExtent = 0;

function hashCell(cx: number, cy: number) {
  return (Math.imul(cx, 0x8da6b343) ^ Math.imul(cy, 0xd8163841)) & HASH_MASK;
}

/** Cells packed into one int so aliased hash buckets can be told apart. */
function packCell(cx: number, cy: number) {
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

function buildGrid(bodies: Body[]) {
  if (chain.length < bodies.length) {
    chain = new Int32Array(bodies.length * 2);
    cellOf = new Int32Array(bodies.length * 2);
  }
  heads.fill(-1);
  maxExtent = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.homing || b.ghost) continue;
    const extent = b.ew > b.eh ? b.ew : b.eh;
    if (extent > maxExtent) maxExtent = extent;
    const cx = Math.floor(b.x / CELL);
    const cy = Math.floor(b.y / CELL);
    const h = hashCell(cx, cy);
    cellOf[i] = packCell(cx, cy);
    chain[i] = heads[h];
    heads[h] = i;
  }
}

/**
 * `awake` holds the indices of the bodies that moved this frame, bottom-most
 * first after sorting. Sleeping bodies are still in the grid as colliders, they
 * just never drive a lookup.
 */
export function resolveCollisions(
  bodies: Body[],
  awake: number[],
  restSpeed: number,
  iterations: number,
  rng: () => number
) {
  buildGrid(bodies);

  // Bottom-up, so a pile is solved from the floor upward.
  awake.sort((i, j) => bodies[j].y - bodies[i].y);

  for (let iter = 0; iter < iterations; iter++) {
    for (const i of awake) {
      const a = bodies[i];
      const cx = Math.floor(a.x / CELL);
      const cy = Math.floor(a.y / CELL);
      // A pair can only overlap while the centers are within the two
      // half-widths, so a body wider than a cell has to look further out.
      const own = a.ew > a.eh ? a.ew : a.eh;
      const reach = Math.min(
        MAX_REACH,
        Math.max(1, Math.ceil((own + maxExtent) / 2 / CELL))
      );
      for (let ox = -reach; ox <= reach; ox++) {
        for (let oy = -reach; oy <= reach; oy++) {
          const key = packCell(cx + ox, cy + oy);
          for (let j = heads[hashCell(cx + ox, cy + oy)]; j !== -1; j = chain[j]) {
            // Hash buckets alias distant cells; only walk the one we meant.
            if (cellOf[j] !== key || j === i) continue;
            const other = bodies[j];
            // Two awake bodies would otherwise be resolved twice per pass.
            if (!other.sleeping && j < i) continue;
            resolvePair(a, other, restSpeed, rng);
          }
        }
      }
    }
  }
}
