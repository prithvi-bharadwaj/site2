/**
 * Reusable particle text engine.
 * Converts text/images to point clouds via canvas pixel sampling,
 * animates particles along quadratic bezier curves to morph between states,
 * and applies mouse repulsion with spring-back physics.
 */

const FONT = "Red Hat Display, sans-serif";

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  /** Current rendered position */
  x: number;
  y: number;
  /** Home position (where the particle wants to be) */
  homeX: number;
  homeY: number;
  /** Velocity for spring physics */
  vx: number;
  vy: number;
  /** Bezier morph state */
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  cpX: number;
  cpY: number;
  /** Per-particle size variation for organic feel */
  size: number;
  /** Per-particle opacity variation */
  alpha: number;
}

export interface MouseState {
  x: number;
  y: number;
  active: boolean;
}

export interface PhysicsConfig {
  /** Radius within which mouse repels particles (px) */
  repelRadius: number;
  /** Strength of repulsion force */
  repelStrength: number;
  /** Spring stiffness (0..1) — higher = snappier return */
  springStiffness: number;
  /** Damping (0..1) — higher = less bouncy */
  damping: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  repelRadius: 80,
  repelStrength: 6,
  springStiffness: 0.04,
  damping: 0.85,
};

/**
 * Render text to an offscreen canvas, sample opaque pixels,
 * and return a point array. Dynamically adjusts step size
 * to hit approximately `targetCount` points.
 */
export function textToPoints(
  text: string,
  fontSize: number,
  targetCount: number,
  font = FONT
): Point[] {
  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d")!;

  ctx.font = `${fontSize}px ${font}`;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(fontSize * 1.2);

  offscreen.width = textWidth;
  offscreen.height = textHeight;

  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, 0, 0);

  return samplePixels(ctx, textWidth, textHeight, targetCount);
}

/**
 * Convert an image to a point array by sampling opaque pixels.
 */
export function imageToPoints(
  image: HTMLImageElement,
  width: number,
  height: number,
  targetCount: number
): Point[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);

  return samplePixels(ctx, width, height, targetCount);
}

/**
 * Sample opaque pixels from a canvas context.
 */
function samplePixels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  targetCount: number
): Point[] {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let opaqueCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 128) opaqueCount++;
    }
  }

  const step = Math.max(1, Math.round(Math.sqrt(opaqueCount / targetCount)));
  const points: Point[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

/**
 * Returns the pixel dimensions of text rendered at the given font size.
 */
export function measureText(
  text: string,
  fontSize: number,
  font = FONT
): { width: number; height: number } {
  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d")!;
  ctx.font = `${fontSize}px ${font}`;
  const metrics = ctx.measureText(text);
  return {
    width: Math.ceil(metrics.width),
    height: Math.ceil(fontSize * 1.2),
  };
}

/**
 * Create a particle pool from target points.
 * If `scattered` is true, particles start at random positions.
 * Otherwise they start at their home positions.
 */
export function createPool(
  points: Point[],
  canvasWidth: number,
  canvasHeight: number,
  scattered = true
): Particle[] {
  return points.map((pt) => {
    const startX = scattered ? Math.random() * canvasWidth : pt.x;
    const startY = scattered ? Math.random() * canvasHeight : pt.y;
    return {
      x: startX,
      y: startY,
      homeX: pt.x,
      homeY: pt.y,
      vx: 0,
      vy: 0,
      originX: startX,
      originY: startY,
      targetX: pt.x,
      targetY: pt.y,
      cpX: 0,
      cpY: 0,
      size: 0.8 + Math.random() * 0.6,
      alpha: 0.4 + Math.random() * 0.5,
    };
  });
}

/**
 * Prepare particles to morph toward new target points.
 * Computes a random quadratic bezier control point for each.
 */
export function morphTo(particles: Particle[], newPoints: Point[]): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const target = newPoints[i % newPoints.length];

    p.originX = p.x;
    p.originY = p.y;
    p.targetX = target.x;
    p.targetY = target.y;
    p.homeX = target.x;
    p.homeY = target.y;

    const midX = (p.originX + p.targetX) / 2;
    const midY = (p.originY + p.targetY) / 2;

    const dx = p.targetX - p.originX;
    const dy = p.targetY - p.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spread = dist * 0.5;

    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const offset = (Math.random() - 0.5) * spread;

    p.cpX = midX + Math.cos(angle) * offset;
    p.cpY = midY + Math.sin(angle) * offset;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Update particle positions along bezier curves during a morph.
 */
export function updateMorph(particles: Particle[], t: number): void {
  const eased = easeInOutCubic(Math.min(1, Math.max(0, t)));
  const u = 1 - eased;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x = u * u * p.originX + 2 * u * eased * p.cpX + eased * eased * p.targetX;
    p.y = u * u * p.originY + 2 * u * eased * p.cpY + eased * eased * p.targetY;
    p.homeX = p.targetX;
    p.homeY = p.targetY;
    // Reset velocity so spring physics starts clean after morph
    p.vx = 0;
    p.vy = 0;
  }
}

/**
 * Apply spring physics: particles spring back to home positions
 * and get repelled by the mouse.
 */
export function updatePhysics(
  particles: Particle[],
  mouse: MouseState,
  physics: PhysicsConfig = DEFAULT_PHYSICS
): void {
  const { repelRadius, repelStrength, springStiffness, damping } = physics;
  const repelRadiusSq = repelRadius * repelRadius;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Spring force toward home
    const dx = p.homeX - p.x;
    const dy = p.homeY - p.y;
    p.vx += dx * springStiffness;
    p.vy += dy * springStiffness;

    // Mouse repulsion
    if (mouse.active) {
      const mx = p.x - mouse.x;
      const my = p.y - mouse.y;
      const distSq = mx * mx + my * my;

      if (distSq < repelRadiusSq && distSq > 0.1) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / repelRadius) * repelStrength;
        p.vx += (mx / dist) * force;
        p.vy += (my / dist) * force;
      }
    }

    // Apply velocity with damping
    p.vx *= damping;
    p.vy *= damping;
    p.x += p.vx;
    p.y += p.vy;
  }
}

/**
 * Draw particles with soft, premium feel.
 * Uses varying sizes and alpha per particle for organic look.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  baseSize: number,
  color = "255,255,255"
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const r = baseSize * p.size;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `rgba(${color},${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw particles with a glow effect for extra softness.
 * Draws a larger translucent halo behind each particle.
 */
export function drawSoft(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  baseSize: number,
  color = "255,255,255"
): void {
  // Glow pass — larger, very translucent
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const r = baseSize * p.size * 2.5;
    ctx.globalAlpha = p.alpha * 0.15;
    ctx.fillStyle = `rgba(${color},1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core pass — small, brighter
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const r = baseSize * p.size;
    ctx.globalAlpha = p.alpha * 0.8;
    ctx.fillStyle = `rgba(${color},1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
