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
  /** Fade-clock multiplier. Dust burns out faster than structural fragments. */
  fadeRate?: number;
}

export const SHARD_GRAVITY = 1150;
export const SHARD_FADE_START = 0.45;
export const SHARD_FADE_END = 1;
/** Peak ink multiplier once a fragment is clear of the box, and the ramp to it.
    The base stroke is 0.8 ink now, so 1.25 lands the peak at exactly full ink. */
export const BLAST_INK = 1.25;
const BLAST_INK_IN = 0.1;
const MAX_STEP_MS = 32;
/** Air drag per second, so debris sheds its blast speed as it flies. */
const DRAG_PER_SECOND = 1.15;

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
 * the top-right corner. Inset one pixel to the centreline of the 2px CSS
 * border.
 */
export function roundedRectOutline(
  width: number,
  height: number,
  radius: number,
  cornerSegments = 5,
): Point[] {
  const inset = 1;
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
  /** Blast speed in px/s. Debris leaves the frame; gravity only bends the arcs. */
  burst?: number;
  /** How wide the debris cone spreads off the straight-out direction, radians. */
  spray?: number;
  /** Upward bias on the blast, px/s, so bits arc up before gravity wins. */
  lift?: number;
  seed?: number;
}

/**
 * Blow the button apart: near-vertical cracks across the width, most columns cut
 * again horizontally, then every fragment fired away from the centre like the
 * box took a round through the middle. Straight cracks on a convex outline means
 * the pieces tile the box exactly, so frame one is the intact button plus cracks.
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
  columns = 13,
  splitChance = 0.94,
  burst = 540,
  spray = 1.5,
  lift = 200,
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

  // Point of impact: dead centre, as if something went straight through it.
  const impactX = width / 2;
  const impactY = height / 2;
  const reach = Math.hypot(impactX, impactY);

  return pieces.map((points) => {
    const centroid = centroidOf(points);
    const dx = centroid.x - impactX;
    const dy = centroid.y - impactY;
    const distance = Math.hypot(dx, dy);
    // Straight out from the impact, fanned so a 3.5:1 box does not fire every
    // fragment along one flat horizontal line.
    const heading = Math.atan2(dy, dx) + (random() - 0.5) * spray;
    // Fragments nearest the hit take the most of it.
    const force = burst * (1 - Math.min(distance / reach, 1) * 0.3) * (0.6 + random() * 0.8);
    return {
      local: points.map((p) => ({ x: p.x - centroid.x, y: p.y - centroid.y })),
      x: centroid.x + offsetX,
      y: centroid.y + offsetY,
      vx: Math.cos(heading) * force,
      vy: Math.sin(heading) * force - lift * (0.5 + random()),
      angle: 0,
      spin: (random() - 0.5) * 26,
      age: 0,
    };
  });
}

interface ParticleOptions {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  count?: number;
  /** Peak speed in px/s. Dust flies faster than the fragments it rides with. */
  burst?: number;
  lift?: number;
  seed?: number;
}

/**
 * Dust kicked out of the hit: tiny diamonds thrown from the button's body in
 * every direction. The fragments read as the box coming apart; this reads as
 * the energy of the impact, and it dies away before the fragments do.
 */
export function createBlastParticles({
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  count = 34,
  burst = 820,
  lift = 150,
  seed = 91,
}: ParticleOptions): Shard[] {
  const random = makeRandom(seed);
  return Array.from({ length: count }, () => {
    const radius = 0.6 + random() * 1.1;
    const heading = random() * Math.PI * 2;
    const speed = burst * (0.25 + random() * 0.95);
    // Seeded across the middle of the box, not one point, so the burst has a
    // core with some body to it instead of a starburst pinned to a pixel.
    const x = width * (0.25 + random() * 0.5);
    const y = height * (0.3 + random() * 0.4);
    return {
      local: [
        { x: 0, y: -radius },
        { x: radius, y: 0 },
        { x: 0, y: radius },
        { x: -radius, y: 0 },
      ],
      x: x + offsetX,
      y: y + offsetY,
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed - lift * (0.4 + random()),
      angle: random() * Math.PI,
      spin: (random() - 0.5) * 30,
      age: 0,
      fadeRate: 1.6 + random() * 0.9,
    };
  });
}

export function stepShatter(shards: Shard[], dtMs: number, gravity = SHARD_GRAVITY): void {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS) / 1000;
  if (dt === 0) return;
  // Drag per unit time, not per frame, so the arcs do not change shape with the
  // refresh rate.
  const drag = Math.exp(-DRAG_PER_SECOND * dt);
  for (const shard of shards) {
    shard.age += dt;
    shard.vx *= drag;
    shard.vy = shard.vy * drag + gravity * dt;
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.angle += shard.spin * dt;
  }
}

/**
 * Ink multiplier on the base stroke. Exactly 1 at rest, so the frame the canvas
 * takes over from the CSS border is identical; then the fragments ink up as they
 * separate, because debris this small and this fast at plain border weight reads
 * as faint confetti. Fades to nothing at the end so nothing pops out of view.
 */
export function shardAlpha(shard: Shard): number {
  const age = shard.age * (shard.fadeRate ?? 1);
  const boost = 1 + (BLAST_INK - 1) * Math.min(age / BLAST_INK_IN, 1);
  if (age <= SHARD_FADE_START) return boost;
  if (age >= SHARD_FADE_END) return 0;
  const t = (age - SHARD_FADE_START) / (SHARD_FADE_END - SHARD_FADE_START);
  return boost * (1 - t * t);
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
