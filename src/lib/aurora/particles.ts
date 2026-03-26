/** Aurora color palette — greens, purples, teals */
const AURORA_COLORS = [
  { r: 0, g: 255, b: 135 },    // #00ff87 — bright green
  { r: 0, g: 255, b: 200 },    // #00ffc8 — seafoam
  { r: 179, g: 136, b: 255 },  // #b388ff — soft purple
  { r: 124, g: 77, b: 255 },   // #7c4dff — vivid purple
  { r: 24, g: 255, b: 255 },   // #18ffff — electric teal
  { r: 0, g: 229, b: 255 },    // #00e5ff — deep teal
] as const;

interface BaseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  hueOffset: number;
}

export interface GlowParticle extends BaseParticle {
  type: "glow";
  size: number;       // current radius
  baseSize: number;   // base radius for pulsing
  pulsePhase: number; // phase offset for sine pulsing
}

export interface TwinkleParticle extends BaseParticle {
  type: "twinkle";
  size: number;
  peakLife: number;   // life ratio at which twinkle is brightest
}

export type AuroraParticle = GlowParticle | TwinkleParticle;

export interface AuroraConfig {
  glowCount: number;
  twinkleCount: number;
  glowSize: number;
  twinkleSize: number;
  speed: number;            // 0-100
  intensity: number;        // 0-100 → master opacity
  colorShift: number;       // 0-100 → hue rotation speed
  cursorInfluence: number;  // 0-100
  cursorRadius: number;     // normalized 0-1
  luminanceBias: number;    // 0-100
}

/** 32×32 luminance grid, values 0-255 */
export type LuminanceGrid = Uint8Array;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickColor(): number {
  return Math.floor(Math.random() * AURORA_COLORS.length);
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

export class AuroraSystem {
  particles: AuroraParticle[] = [];
  private width = 0;
  private height = 0;
  private luminanceGrid: LuminanceGrid | null = null;
  private luminanceW = 32;
  private luminanceH = 32;

  init(width: number, height: number, config: AuroraConfig) {
    this.width = width;
    this.height = height;
    this.particles = [];

    for (let i = 0; i < config.glowCount; i++) {
      this.particles.push(this.spawnGlow(config));
    }
    for (let i = 0; i < config.twinkleCount; i++) {
      this.particles.push(this.spawnTwinkle(config));
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setLuminanceGrid(grid: LuminanceGrid, w: number, h: number) {
    this.luminanceGrid = grid;
    this.luminanceW = w;
    this.luminanceH = h;
  }

  /** Pick a spawn position, biased toward bright areas if luminance data exists */
  private pickPosition(bias: number): { x: number; y: number } {
    if (!this.luminanceGrid || bias <= 0 || Math.random() > bias) {
      return { x: rand(0, this.width), y: rand(0, this.height) };
    }

    // Weighted random: try up to 8 candidates, pick the brightest
    let bestX = rand(0, this.width);
    let bestY = rand(0, this.height);
    let bestLum = 0;

    for (let attempt = 0; attempt < 8; attempt++) {
      const cx = rand(0, this.width);
      const cy = rand(0, this.height);
      const gx = Math.floor((cx / this.width) * this.luminanceW);
      const gy = Math.floor((cy / this.height) * this.luminanceH);
      const idx = gy * this.luminanceW + gx;
      const lum = this.luminanceGrid[idx] ?? 0;

      if (lum > bestLum) {
        bestLum = lum;
        bestX = cx;
        bestY = cy;
      }
    }

    return { x: bestX, y: bestY };
  }

  private spawnGlow(config: AuroraConfig): GlowParticle {
    const bias = config.luminanceBias / 100 * 0.5; // glows less biased
    const pos = this.pickPosition(bias);
    const baseSize = rand(config.glowSize * 0.4, config.glowSize);
    const maxLife = rand(4, 10);
    return {
      type: "glow",
      ...pos,
      vx: rand(-8, 8),
      vy: rand(-5, 5),
      life: rand(0, maxLife), // stagger start
      maxLife,
      colorIndex: pickColor(),
      hueOffset: 0,
      size: baseSize,
      baseSize,
      pulsePhase: rand(0, Math.PI * 2),
    };
  }

  private spawnTwinkle(config: AuroraConfig): TwinkleParticle {
    const bias = config.luminanceBias / 100; // twinkles strongly biased
    const pos = this.pickPosition(bias);
    const maxLife = rand(0.8, 3);
    return {
      type: "twinkle",
      ...pos,
      vx: rand(-3, 3),
      vy: rand(-2, 2),
      life: rand(0, maxLife),
      maxLife,
      colorIndex: pickColor(),
      hueOffset: 0,
      size: rand(config.twinkleSize * 0.5, config.twinkleSize),
      peakLife: rand(0.2, 0.5),
    };
  }

  applyPointerInfluence(
    px: number,
    py: number,
    opacity: number,
    config: AuroraConfig
  ) {
    if (opacity < 0.05 || config.cursorInfluence <= 0) return;

    const force = config.cursorInfluence / 100 * 30 * opacity;
    const radiusPx = config.cursorRadius * this.width;
    const radiusSq = radiusPx * radiusPx;

    for (const p of this.particles) {
      const dx = p.x - px * this.width;
      const dy = p.y - py * this.height;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const strength = force * (1 - dist / radiusPx);
        p.vx += (dx / dist) * strength;
        p.vy += (dy / dist) * strength;
      }
    }
  }

  update(dt: number, config: AuroraConfig, time: number) {
    const clamped = Math.min(dt, 1 / 30);
    const speedMul = config.speed / 50; // 50 = normal speed
    const shiftRate = config.colorShift / 100 * 0.5;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= clamped;
      p.hueOffset += shiftRate * clamped;

      // Drift
      p.x += p.vx * clamped * speedMul;
      p.y += p.vy * clamped * speedMul;

      // Gentle damping
      p.vx *= 0.995;
      p.vy *= 0.995;

      // Glow-specific: pulse size
      if (p.type === "glow") {
        p.size =
          p.baseSize *
          (0.8 + 0.2 * Math.sin(time * 0.8 + p.pulsePhase));
      }

      // Respawn if dead or way offscreen
      if (
        p.life <= 0 ||
        p.x < -200 || p.x > this.width + 200 ||
        p.y < -200 || p.y > this.height + 200
      ) {
        this.particles[i] =
          p.type === "glow"
            ? this.spawnGlow(config)
            : this.spawnTwinkle(config);
      }
    }
  }

  /** Adjust particle counts to match config (add/remove without full reinit) */
  syncCounts(config: AuroraConfig) {
    const glows = this.particles.filter((p) => p.type === "glow");
    const twinkles = this.particles.filter((p) => p.type === "twinkle");

    // Add/remove glows
    if (glows.length < config.glowCount) {
      for (let i = glows.length; i < config.glowCount; i++) {
        this.particles.push(this.spawnGlow(config));
      }
    } else if (glows.length > config.glowCount) {
      let toRemove = glows.length - config.glowCount;
      this.particles = this.particles.filter((p) => {
        if (p.type === "glow" && toRemove > 0) {
          toRemove--;
          return false;
        }
        return true;
      });
    }

    // Add/remove twinkles
    if (twinkles.length < config.twinkleCount) {
      for (let i = twinkles.length; i < config.twinkleCount; i++) {
        this.particles.push(this.spawnTwinkle(config));
      }
    } else if (twinkles.length > config.twinkleCount) {
      let toRemove = twinkles.length - config.twinkleCount;
      this.particles = this.particles.filter((p) => {
        if (p.type === "twinkle" && toRemove > 0) {
          toRemove--;
          return false;
        }
        return true;
      });
    }
  }

  /** Get opacity for a particle based on its lifecycle */
  getOpacity(p: AuroraParticle, intensity: number): number {
    const masterAlpha = intensity / 100;
    const lifeRatio = p.life / p.maxLife;

    if (p.type === "glow") {
      // Smooth fade in/out
      const fade = lifeRatio < 0.2
        ? lifeRatio / 0.2
        : lifeRatio > 0.8
          ? (1 - lifeRatio) / 0.2
          : 1;
      return fade * 0.35 * masterAlpha;
    }

    // Twinkle: sharp peak
    const peak = p.peakLife;
    const fade = lifeRatio < peak
      ? lifeRatio / peak
      : (1 - lifeRatio) / (1 - peak);
    return Math.pow(Math.max(0, fade), 1.5) * 0.8 * masterAlpha;
  }

  /** Get interpolated color for a particle */
  getColor(p: AuroraParticle): { r: number; g: number; b: number } {
    const idx = p.colorIndex;
    const nextIdx = (idx + 1) % AURORA_COLORS.length;
    const t = (p.hueOffset % 1 + 1) % 1; // wrap to 0-1
    return lerpColor(AURORA_COLORS[idx], AURORA_COLORS[nextIdx], t);
  }

  /** Sample luminance at a particle's position, returns 0-1 */
  getLuminanceAt(x: number, y: number): number {
    if (!this.luminanceGrid) return 0.5;
    const gx = Math.floor((x / this.width) * this.luminanceW);
    const gy = Math.floor((y / this.height) * this.luminanceH);
    const idx = gy * this.luminanceW + gx;
    return (this.luminanceGrid[idx] ?? 128) / 255;
  }
}
