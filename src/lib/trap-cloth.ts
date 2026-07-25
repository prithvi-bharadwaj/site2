export interface ClothPoint {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
}

export interface TrapCloth {
  /** Two strips: [0] hangs from the left hinge, [1] from the right hinge. */
  flaps: [ClothPoint[], ClothPoint[]];
  restLength: number;
  hingeY: number;
  released: boolean;
  /** Seconds since release; drives the decaying flutter. */
  age: number;
}

export const CLOTH_GRAVITY = 980;
const MAX_STEP_MS = 32;
const CONSTRAINT_PASSES = 4;
const DRAG = 0.985;

interface TrapClothOptions {
  leftX: number;
  rightX: number;
  y: number;
  segmentsPerFlap?: number;
}

function makeFlap(hingeX: number, y: number, direction: 1 | -1, segments: number, restLength: number): ClothPoint[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const x = hingeX + direction * i * restLength;
    return { x, y, px: x, py: y, pinned: i === 0 };
  });
}

/**
 * The button's bottom edge as two cloth strips, each pinned at the corner it
 * used to hinge on. At rest they lie flat, together drawing the taut edge.
 */
export function createTrapCloth({ leftX, rightX, y, segmentsPerFlap = 9 }: TrapClothOptions): TrapCloth {
  const halfSpan = (rightX - leftX) / 2;
  const restLength = halfSpan / segmentsPerFlap;
  return {
    flaps: [
      makeFlap(leftX, y, 1, segmentsPerFlap, restLength),
      makeFlap(rightX, y, -1, segmentsPerFlap, restLength),
    ],
    restLength,
    hingeY: y,
    released: false,
    age: 0,
  };
}

/** Let go of the edge: free tips get a small downward bias so both sides peel at once. */
export function releaseTrapCloth(cloth: TrapCloth): void {
  if (cloth.released) return;
  cloth.released = true;
  for (const flap of cloth.flaps) {
    const n = flap.length - 1;
    for (let i = 1; i <= n; i++) {
      flap[i].py -= (i / n) * 1.4;
    }
  }
}

export function stepTrapCloth(cloth: TrapCloth, dtMs: number): void {
  if (!cloth.released) return;
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS) / 1000;
  if (dt === 0) return;
  cloth.age += dt;

  // Big flutter right after release, settling into a faint perpetual sway.
  const flutter = 2400 * Math.exp(-cloth.age * 1.4) + 160;

  cloth.flaps.forEach((flap, flapIndex) => {
    const n = flap.length - 1;
    for (let i = 1; i <= n; i++) {
      const point = flap[i];
      const reach = i / n;
      const vx = (point.x - point.px) * DRAG;
      const vy = (point.y - point.py) * DRAG;
      point.px = point.x;
      point.py = point.y;
      const windX = Math.sin(cloth.age * 6.2 + i * 0.9 + flapIndex * 2.4) * flutter * reach;
      const windY = Math.cos(cloth.age * 4.7 + i * 1.3 + flapIndex * 1.7) * flutter * 0.35 * reach;
      point.x += vx + windX * dt * dt;
      point.y += vy + (CLOTH_GRAVITY + windY) * dt * dt;
    }
  });

  for (let pass = 0; pass < CONSTRAINT_PASSES; pass++) {
    for (const flap of cloth.flaps) {
      for (let i = 1; i < flap.length; i++) {
        const a = flap[i - 1];
        const b = flap[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const correction = (distance - cloth.restLength) / distance;
        if (a.pinned) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        } else {
          a.x += dx * correction * 0.5;
          a.y += dy * correction * 0.5;
          b.x -= dx * correction * 0.5;
          b.y -= dy * correction * 0.5;
        }
      }
      // The button floor blocks the cloth from flipping up through it.
      for (const point of flap) {
        if (!point.pinned && point.y < cloth.hingeY) point.y = cloth.hingeY;
      }
    }
  }
}

/** Nudge cloth points near (x, y), e.g. a cookie brushing past on its way down. */
export function disturbTrapCloth(cloth: TrapCloth, x: number, y: number, radius: number, ix: number, iy: number): void {
  if (!cloth.released) return;
  for (const flap of cloth.flaps) {
    for (const point of flap) {
      if (point.pinned) continue;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance >= radius) continue;
      const falloff = 1 - distance / radius;
      point.px -= ix * falloff;
      point.py -= iy * falloff;
    }
  }
}
