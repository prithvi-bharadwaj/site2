export interface LetterSource {
  char: string;
  x: number;
  y: number;
}

export interface CookieParticle extends LetterSource {
  id: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  phase: number;
  startDelay: number;
  morph: number;
  bounces: number;
  active: boolean;
  eaten: boolean;
}

export interface CookiePhysicsBounds {
  mouthX: number;
  mouthY: number;
  floorY: number;
}

export const GRAVITY = 1700;
const RESTITUTION = 0.42;
const MOUTH_RADIUS = 30;
const FORCE_EAT_AGE = 3.4;

function randomUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function createCookieParticles(
  letters: readonly LetterSource[],
  seed = 17,
): CookieParticle[] {
  return letters.map((letter, id) => {
    const a = randomUnit(seed + id * 3);
    const b = randomUnit(seed + id * 3 + 1);
    const c = randomUnit(seed + id * 3 + 2);

    return {
      ...letter,
      id,
      vx: (a - 0.5) * 120,
      vy: 40 + b * 60,
      rotation: (c - 0.5) * 18,
      angularVelocity: (b - 0.5) * 260,
      phase: a * Math.PI * 2,
      startDelay: id * 40 + c * 60,
      morph: 0,
      bounces: 0,
      active: false,
      eaten: false,
    };
  });
}

export function stepCookiePhysics(
  particles: CookieParticle[],
  deltaMs: number,
  elapsedMs: number,
  bounds: CookiePhysicsBounds,
) {
  const dt = Math.min(deltaMs, 32) / 1000;
  let eatenNow = 0;
  let remaining = 0;

  for (const particle of particles) {
    if (particle.eaten) continue;
    remaining += 1;

    const age = (elapsedMs - particle.startDelay) / 1000;
    if (age < 0) continue;
    particle.active = true;
    // Flip into a cookie as it tumbles clear of the trapdoor.
    particle.morph = Math.max(0, Math.min(1, (age - 0.12) / 0.22));

    particle.vy += GRAVITY * dt;

    // Once grounded (or lingering airborne), a damped spring pulls it to the mouth.
    const grounded = particle.y >= bounds.floorY - 1;
    if (grounded || particle.bounces > 0 || age > 1.1) {
      particle.vx += (bounds.mouthX - particle.x) * 5 * dt;
    }

    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.angularVelocity * dt;

    if (particle.y >= bounds.floorY) {
      particle.y = bounds.floorY;
      if (particle.vy > 90) {
        particle.vy = -particle.vy * RESTITUTION;
        particle.bounces += 1;
        particle.vx *= 0.82;
      } else {
        particle.vy = 0;
      }
      particle.vx *= Math.exp(-2.4 * dt);
      // Roll instead of spinning freely while in floor contact.
      particle.angularVelocity = particle.vx * 4.1;
    }

    const mouthDistance = Math.hypot(
      bounds.mouthX - particle.x,
      bounds.mouthY - particle.y,
    );
    if (age > FORCE_EAT_AGE) {
      particle.x = bounds.mouthX;
      particle.y = bounds.mouthY;
    }
    if ((age > 0.45 && mouthDistance < MOUTH_RADIUS) || age > FORCE_EAT_AGE) {
      particle.eaten = true;
      eatenNow += 1;
      remaining -= 1;
    }
  }

  return { eatenNow, remaining };
}
