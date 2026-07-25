/**
 * Broadphase + contact resolution for glyph bodies.
 *
 * Only awake bodies drive the loop: they look up their neighbours (awake or
 * not) in a uniform grid, so a settled pile costs nothing per frame. Contacts
 * are resolved positionally, bottom-up, so corrections propagate up through a
 * deep stack within a single frame.
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

// Reused across frames so stepping allocates as little as possible.
const grid = new Map<number, number[]>();

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
  grid.clear();
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.homing || b.ghost) continue;
    const key = cellKey(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    const cell = grid.get(key);
    if (cell) cell.push(i);
    else grid.set(key, [i]);
  }

  // Bottom-up, so a pile is solved from the floor upward.
  awake.sort((i, j) => bodies[j].y - bodies[i].y);

  for (let iter = 0; iter < iterations; iter++) {
    for (const i of awake) {
      const a = bodies[i];
      const cx = Math.floor(a.x / CELL);
      const cy = Math.floor(a.y / CELL);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(cellKey(cx + ox, cy + oy));
          if (cell === undefined) continue;
          for (const j of cell) {
            if (j === i) continue;
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
