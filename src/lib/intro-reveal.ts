/**
 * Pure logic for the first-visit intro: the typing schedule for the greeting,
 * the choice of which glyph falls, and the burst particles that fly the bio's
 * letters into place after the crash. No DOM access - the component harvests
 * glyph boxes, feeds them in, and draws what comes back.
 */

export interface IntroGlyphBox {
  /** Top-left of the glyph box, in viewport coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TypingTiming {
  charMs: number;
  jitterMs: number;
  /** Extra hold after typing one of these characters. */
  pauseAfterMs: Record<string, number>;
}

export const TYPING_TIMING: TypingTiming = {
  charMs: 52,
  jitterMs: 36,
  pauseAfterMs: { ",": 420, ".": 240 },
};

/** Cumulative appearance time (ms) for each glyph, in typing order. */
export function buildTypingSchedule(
  chars: string[],
  timing: TypingTiming = TYPING_TIMING,
  rand: () => number = Math.random
): number[] {
  const times: number[] = [];
  let t = 0;
  for (const ch of chars) {
    t += timing.charMs + rand() * timing.jitterMs;
    times.push(t);
    t += timing.pauseAfterMs[ch] ?? 0;
  }
  return times;
}

/** The star of the crash: the last "i" in the greeting (the one in "Prithvi"). */
export function pickFallingGlyph(chars: string[]): number {
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i].toLowerCase() === "i") return i;
  }
  return Math.max(0, chars.length - 1);
}

export interface BurstParticle {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  va: number;
  /** ms after the burst when the homing spring takes over from gravity. */
  homeDelay: number;
  settled: boolean;
}

export const BURST_PHYSICS = {
  gravity: 1700,
  minSpeed: 380,
  maxSpeed: 1040,
  /** Radians either side of straight up - an upward fountain, not a sphere. */
  spread: 1.25,
  /** Spring toward the target; damping is ~critical for this stiffness. */
  stiffness: 150,
  damping: 24.5,
  spinMax: 11,
  settleDist: 0.75,
  settleSpeed: 26,
  baseDelayMs: 60,
  /** Reading-order stagger, so text fills in left-to-right, top-to-bottom. */
  perGlyphDelayMs: 5.5,
  delayJitterMs: 130,
};

export function spawnBurst(
  targets: IntroGlyphBox[],
  originX: number,
  originY: number,
  rand: () => number = Math.random
): BurstParticle[] {
  const P = BURST_PHYSICS;
  return targets.map((t, i) => {
    const angle = -Math.PI / 2 + (rand() - 0.5) * 2 * P.spread;
    const speed = P.minSpeed + rand() * (P.maxSpeed - P.minSpeed);
    return {
      targetX: t.x,
      targetY: t.y,
      x: originX + (rand() - 0.5) * 26,
      y: originY + (rand() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: (rand() - 0.5) * 1.4,
      va: (rand() - 0.5) * 2 * P.spinMax,
      homeDelay: P.baseDelayMs + i * P.perGlyphDelayMs + rand() * P.delayJitterMs,
      settled: false,
    };
  });
}

/** One integration step. Returns true while anything is still moving. */
export function stepBurst(
  particles: BurstParticle[],
  dt: number,
  elapsedMs: number
): boolean {
  const P = BURST_PHYSICS;
  let moving = false;
  for (const p of particles) {
    if (p.settled) continue;
    moving = true;
    if (elapsedMs < p.homeDelay) {
      p.vy += P.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.va * dt;
      continue;
    }
    p.vx += (P.stiffness * (p.targetX - p.x) - P.damping * p.vx) * dt;
    p.vy += (P.stiffness * (p.targetY - p.y) - P.damping * p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const decay = Math.exp(-9 * dt);
    p.angle *= decay;
    p.va *= decay;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    if (
      dx * dx + dy * dy < P.settleDist * P.settleDist &&
      p.vx * p.vx + p.vy * p.vy < P.settleSpeed * P.settleSpeed &&
      Math.abs(p.angle) < 0.03
    ) {
      p.x = p.targetX;
      p.y = p.targetY;
      p.angle = 0;
      p.settled = true;
    }
  }
  return moving;
}

/** Snap every particle onto its target - the failsafe and the skip path. */
export function settleBurst(particles: BurstParticle[]) {
  for (const p of particles) {
    p.x = p.targetX;
    p.y = p.targetY;
    p.angle = 0;
    p.vx = 0;
    p.vy = 0;
    p.settled = true;
  }
}
