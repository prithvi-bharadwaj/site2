export interface Point {
  x: number;
  y: number;
}

/** One broken-off piece of the button's outline, tumbling as it falls. */
export interface Shard {
  /** Outline vertices relative to the shard's centroid. */
  local: Point[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** Seconds since the break; drives the fade. */
  age: number;
}

export const SHARD_GRAVITY = 1150;
export const SHARD_FADE_START = 0.5;
export const SHARD_FADE_END = 1.15;
const MAX_STEP_MS = 32;
const DRAG = 0.999;

/** Deterministic so the fracture is reproducible in tests. */
function makeRandom(seed: number): () => number {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * The button's border stroke as a closed convex polygon, walked clockwise from
 * the top-right corner. Inset half a pixel like the 1px CSS border.
 */
export function roundedRectOutline(
  width: number,
  height: number,
  radius: number,
  cornerSegments = 5,
): Point[] {
  const inset = 0.5;
  const r = Math.max(radius - inset, 0);
  const left = inset + r;
  const right = width - inset - r;
  const top = inset + r;
  const bottom = height - inset - r;
  // Each corner's arc centre, and the angle its sweep starts at (y points down).
  const corners: [number, number, number][] = [
    [right, top, -Math.PI / 2],
    [right, bottom, 0],
    [left, bottom, Math.PI / 2],
    [left, top, Math.PI],
  ];
  const points: Point[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const angle = start + (Math.PI / 2) * (i / cornerSegments);
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  }
  return points;
}

/** A crack: everything on the normal's side is kept. */
interface Crack {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

function side({ x, y, nx, ny }: Crack, point: Point): number {
  return (point.x - x) * nx + (point.y - y) * ny;
}

/**
 * Sutherland-Hodgman against one crack. The outline is convex and every crack
 * is a straight line, so each piece stays convex and the pieces tile the box
 * exactly, with no slivers left over.
 */
function clipPolygon(polygon: Point[], crack: Crack): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentSide = side(crack, current);
    const nextSide = side(crack, next);
    if (currentSide >= 0) out.push(current);
    if ((currentSide >= 0) !== (nextSide >= 0)) {
      const t = currentSide / (currentSide - nextSide);
      out.push({ x: current.x + (next.x - current.x) * t, y: current.y + (next.y - current.y) * t });
    }
  }
  return out;
}

function flip(crack: Crack): Crack {
  return { ...crack, nx: -crack.nx, ny: -crack.ny };
}

function centroidOf(points: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }
  return { x: cx / (3 * area), y: cy / (3 * area) };
}

interface ShatterOptions {
  width: number;
  height: number;
  radius: number;
  /** Button's top-left within the canvas. Geometry stays button-local. */
  offsetX?: number;
  offsetY?: number;
  /** Vertical cracks split the box into this many columns. */
  columns?: number;
  /** Odds a column also takes a horizontal crack, giving a mix of piece sizes. */
  splitChance?: number;
  /** Sideways drift at the box's ends, px/s. Gravity does the rest. */
  burst?: number;
  seed?: number;
}

/**
 * Fracture the button into chunks: near-vertical cracks across the width, some
 * columns cut again horizontally. Straight cracks on a convex outline means the
 * pieces tile the box exactly, so frame one is the intact button plus cracks.
 *
 * Wide short boxes break into columns, not a radial star: cracks fanning from a
 * point would carve 80px needles out of a 38px-tall box.
 */
export function createShatter({
  width,
  height,
  radius,
  offsetX = 0,
  offsetY = 0,
  columns = 6,
  splitChance = 0.6,
  burst = 54,
  seed = 20260726,
}: ShatterOptions): Shard[] {
  const random = makeRandom(seed);
  const outline = roundedRectOutline(width, height, radius);

  // Column cracks: evenly spaced, jittered, and tilted off vertical a little so
  // no two pieces look stamped from the same template.
  const step = width / columns;
  const cracks: Crack[] = Array.from({ length: columns - 1 }, (_, i) => {
    const x = step * (i + 1) + (random() - 0.5) * step * 0.5;
    const tilt = (random() - 0.5) * 0.62;
    return { x, y: height / 2, nx: Math.cos(tilt), ny: -Math.sin(tilt) };
  });

  const pieces: Point[][] = [];
  for (let i = 0; i < columns; i++) {
    let piece = outline;
    if (i > 0) piece = clipPolygon(piece, cracks[i - 1]);
    if (i < columns - 1) piece = clipPolygon(piece, flip(cracks[i]));
    if (piece.length < 3) continue;
    if (random() < splitChance) {
      const cut: Crack = {
        x: width / 2,
        y: height * (0.34 + random() * 0.34),
        nx: (random() - 0.5) * 0.5,
        ny: 1,
      };
      const below = clipPolygon(piece, cut);
      const above = clipPolygon(piece, flip(cut));
      if (below.length >= 3 && above.length >= 3) {
        pieces.push(below, above);
        continue;
      }
    }
    pieces.push(piece);
  }

  const centerX = width / 2;
  return pieces.map((points) => {
    const centroid = centroidOf(points);
    // A shove, not a blast: pieces lean away from the middle and drop. The ends
    // drift furthest, so the box opens outward as it comes apart.
    const lean = (centroid.x - centerX) / centerX;
    // Low pieces have nothing under them and go first. Without this head start
    // everything falls at the same rate and the box drops as one lump.
    const unsupported = centroid.y / height;
    return {
      local: points.map((p) => ({ x: p.x - centroid.x, y: p.y - centroid.y })),
      x: centroid.x + offsetX,
      y: centroid.y + offsetY,
      vx: lean * burst * (0.7 + random() * 0.6),
      vy: -20 + unsupported * 78 + random() * 22,
      angle: 0,
      spin: lean * 2.1 + (random() - 0.5) * 1.4,
      age: 0,
    };
  });
}

export function stepShatter(shards: Shard[], dtMs: number, gravity = SHARD_GRAVITY): void {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS) / 1000;
  if (dt === 0) return;
  for (const shard of shards) {
    shard.age += dt;
    shard.vx *= DRAG;
    shard.vy += gravity * dt;
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.angle += shard.spin * dt;
  }
}

/** Full ink while the crack is fresh, then a fade so shards never hard-clip. */
export function shardAlpha(shard: Shard): number {
  if (shard.age <= SHARD_FADE_START) return 1;
  if (shard.age >= SHARD_FADE_END) return 0;
  const t = (shard.age - SHARD_FADE_START) / (SHARD_FADE_END - SHARD_FADE_START);
  return 1 - t * t;
}

/** Shard outline in canvas coordinates, closed for stroking as a ribbon. */
export function shardOutline(shard: Shard): Point[] {
  const cos = Math.cos(shard.angle);
  const sin = Math.sin(shard.angle);
  const points = shard.local.map(({ x, y }) => ({
    x: shard.x + x * cos - y * sin,
    y: shard.y + x * sin + y * cos,
  }));
  points.push(points[0]);
  return points;
}
