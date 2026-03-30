/**
 * Pure displacement physics engine for pretext hero text.
 * Operates on DisplacedElement[] — no DOM, no React.
 * Each frame: radial repulsion from cursor + spring return + damping.
 */

export interface DisplacedElement {
  /** Rest position from pretext layout (top-left of element) */
  restX: number;
  restY: number;
  /** Element dimensions for center calculation */
  width: number;
  height: number;
  /** Current displacement offset */
  dx: number;
  dy: number;
  /** Velocity */
  vx: number;
  vy: number;
  /** DOM element for direct style writes */
  el: HTMLElement | null;
  /** Base opacity at rest */
  baseOpacity: number;
}

export interface DisplacementConfig {
  /** Radius within which cursor repels elements (px) */
  repelRadius: number;
  /** Strength of repulsion force */
  repelStrength: number;
  /** Spring stiffness pulling displacement back to zero */
  springStiffness: number;
  /** Velocity damping per frame */
  damping: number;
  /** Maximum displacement magnitude (px) */
  maxDisplacement: number;
  /** Maximum opacity when highlighted */
  maxOpacity: number;
}

export const DEFAULT_DISPLACEMENT_CONFIG: DisplacementConfig = {
  repelRadius: 120,
  repelStrength: 8,
  springStiffness: 0.06,
  damping: 0.82,
  maxDisplacement: 30,
  maxOpacity: 0.95,
};

export function createDisplacedElement(
  restX: number,
  restY: number,
  width: number,
  height: number,
  baseOpacity: number
): DisplacedElement {
  return {
    restX,
    restY,
    width,
    height,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    el: null,
    baseOpacity,
  };
}

/**
 * Update displacement for all elements. Writes transform + opacity
 * directly to DOM elements — no React re-renders.
 *
 * Returns true if any element is still animating (displacement > 0.1px).
 */
export function updateDisplacement(
  elements: readonly DisplacedElement[],
  mouseX: number,
  mouseY: number,
  mouseActive: boolean,
  config: DisplacementConfig = DEFAULT_DISPLACEMENT_CONFIG
): boolean {
  const { repelRadius, repelStrength, springStiffness, damping, maxDisplacement, maxOpacity } =
    config;
  const radiusSq = repelRadius * repelRadius;
  let anyMoving = false;

  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];

    // Center of element in container space
    const cx = e.restX + e.width * 0.5 + e.dx;
    const cy = e.restY + e.height * 0.5 + e.dy;

    // Mouse repulsion
    if (mouseActive) {
      const mx = cx - mouseX;
      const my = cy - mouseY;
      const distSq = mx * mx + my * my;

      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const t = 1 - dist / repelRadius;
        // Quadratic falloff for smooth feel
        const force = t * t * repelStrength;
        e.vx += (mx / dist) * force;
        e.vy += (my / dist) * force;
      }
    }

    // Spring return toward zero displacement
    e.vx -= e.dx * springStiffness;
    e.vy -= e.dy * springStiffness;

    // Damping
    e.vx *= damping;
    e.vy *= damping;

    // Integrate
    e.dx += e.vx;
    e.dy += e.vy;

    // Clamp displacement
    const mag = Math.sqrt(e.dx * e.dx + e.dy * e.dy);
    if (mag > maxDisplacement) {
      const scale = maxDisplacement / mag;
      e.dx *= scale;
      e.dy *= scale;
    }

    // Compute highlight opacity based on cursor distance to rest position center
    let opacity = e.baseOpacity;
    if (mouseActive) {
      const rcx = e.restX + e.width * 0.5;
      const rcy = e.restY + e.height * 0.5;
      const rmx = rcx - mouseX;
      const rmy = rcy - mouseY;
      const rDistSq = rmx * rmx + rmy * rmy;

      if (rDistSq < radiusSq) {
        const rDist = Math.sqrt(rDistSq);
        const t = 1 - rDist / repelRadius;
        // Cubic falloff for tight glow
        opacity = e.baseOpacity + (maxOpacity - e.baseOpacity) * t * t * t;
      }
    }

    // Write to DOM directly (skip React)
    if (e.el) {
      e.el.style.transform = `translate3d(${e.dx}px, ${e.dy}px, 0)`;
      e.el.style.opacity = String(opacity);
    }

    if (Math.abs(e.dx) > 0.1 || Math.abs(e.dy) > 0.1 || Math.abs(e.vx) > 0.05 || Math.abs(e.vy) > 0.05) {
      anyMoving = true;
    }
  }

  return anyMoving;
}
