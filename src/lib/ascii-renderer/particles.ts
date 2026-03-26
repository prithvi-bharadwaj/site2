export interface Particle {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  displacement: number; // 0-1, how far from home (for glow)
}

export interface ParticleSystemConfig {
  repelForce: number;
  spring: number;
  damping: number;
  repelRadius: number; // in normalized coords
}

export class ParticleSystem {
  particles: Particle[] = [];
  private cols = 0;
  private rows = 0;

  init(
    canvasWidth: number,
    canvasHeight: number,
    cellWidth: number,
    cellHeight: number,
    charset: string
  ) {
    this.cols = Math.floor(canvasWidth / cellWidth);
    this.rows = Math.floor(canvasHeight / cellHeight);
    this.particles = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const homeX = (col + 0.5) * cellWidth;
        const homeY = (row + 0.5) * cellHeight;
        const char = charset[Math.floor(Math.random() * (charset.length - 1))]; // skip trailing space
        this.particles.push({
          homeX, homeY,
          x: homeX, y: homeY,
          vx: 0, vy: 0,
          char,
          displacement: 0,
        });
      }
    }
  }

  repel(
    pointerX: number,
    pointerY: number,
    canvasWidth: number,
    canvasHeight: number,
    config: ParticleSystemConfig
  ) {
    const px = pointerX * canvasWidth;
    const py = pointerY * canvasHeight;
    const radiusPx = config.repelRadius * canvasWidth;
    const radiusSq = radiusPx * radiusPx;

    for (const p of this.particles) {
      const dx = p.x - px;
      const dy = p.y - py;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = config.repelForce * (1 - dist / radiusPx);
        const nx = dx / dist;
        const ny = dy / dist;
        p.vx += nx * force;
        p.vy += ny * force;
      }
    }
  }

  update(dt: number, config: ParticleSystemConfig) {
    const maxDt = 1 / 30; // clamp to avoid explosion
    const clamped = Math.min(dt, maxDt);

    for (const p of this.particles) {
      // Spring force toward home
      const dx = p.homeX - p.x;
      const dy = p.homeY - p.y;
      const ax = dx * config.spring;
      const ay = dy * config.spring;

      p.vx = (p.vx + ax * clamped) * config.damping;
      p.vy = (p.vy + ay * clamped) * config.damping;

      p.x += p.vx * clamped;
      p.y += p.vy * clamped;

      // Displacement magnitude (0-1) for glow
      const dist = Math.sqrt(
        (p.x - p.homeX) ** 2 + (p.y - p.homeY) ** 2
      );
      p.displacement = Math.min(1, dist / 40);
    }
  }
}
