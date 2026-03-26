/** Aurora curtain — undulating gradient waves */

interface CurtainWave {
  frequency: number;    // horizontal wave frequency
  amplitude: number;    // vertical displacement in px
  speed: number;        // radians per second
  phase: number;        // initial phase offset
  colorTop: string;     // rgba color at peak
  colorBot: string;     // rgba color at trough
  thickness: number;    // band height as fraction of canvas (0-1)
  yCenter: number;      // vertical center as fraction (0-1)
}

export interface CurtainConfig {
  enabled: boolean;
  opacity: number;       // 0-20 (mapped to 0-0.10)
  waveCount: number;     // 1-5
  speed: number;         // 0-100
}

const WAVE_TEMPLATES: Omit<CurtainWave, "phase">[] = [
  {
    frequency: 1.2,
    amplitude: 60,
    speed: 0.15,
    colorTop: "rgba(0,255,135,ALPHA)",
    colorBot: "rgba(0,229,255,ALPHA)",
    thickness: 0.35,
    yCenter: 0.3,
  },
  {
    frequency: 0.8,
    amplitude: 80,
    speed: 0.1,
    colorTop: "rgba(179,136,255,ALPHA)",
    colorBot: "rgba(124,77,255,ALPHA)",
    thickness: 0.4,
    yCenter: 0.55,
  },
  {
    frequency: 1.6,
    amplitude: 40,
    speed: 0.2,
    colorTop: "rgba(24,255,255,ALPHA)",
    colorBot: "rgba(0,255,200,ALPHA)",
    thickness: 0.25,
    yCenter: 0.75,
  },
  {
    frequency: 0.6,
    amplitude: 100,
    speed: 0.08,
    colorTop: "rgba(0,255,135,ALPHA)",
    colorBot: "rgba(179,136,255,ALPHA)",
    thickness: 0.45,
    yCenter: 0.15,
  },
  {
    frequency: 2.0,
    amplitude: 30,
    speed: 0.25,
    colorTop: "rgba(124,77,255,ALPHA)",
    colorBot: "rgba(24,255,255,ALPHA)",
    thickness: 0.2,
    yCenter: 0.9,
  },
];

export class AuroraCurtain {
  private waves: CurtainWave[] = [];

  init(waveCount: number) {
    this.waves = [];
    const count = Math.min(waveCount, WAVE_TEMPLATES.length);
    for (let i = 0; i < count; i++) {
      this.waves.push({
        ...WAVE_TEMPLATES[i],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    config: CurtainConfig,
    pointerX?: number,
    pointerY?: number,
    pointerOpacity?: number
  ) {
    if (!config.enabled || this.waves.length === 0) return;

    const masterAlpha = (config.opacity / 20) * 0.10; // 0-20 maps to 0-0.10
    if (masterAlpha < 0.001) return;

    const speedMul = config.speed / 50;
    const segments = 64; // horizontal resolution
    const segWidth = width / segments;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const wave of this.waves) {
      const alpha = masterAlpha;
      const topColor = wave.colorTop.replace("ALPHA", alpha.toFixed(3));
      const botColor = wave.colorBot.replace("ALPHA", (alpha * 0.3).toFixed(3));

      const bandH = wave.thickness * height;
      const baseY = wave.yCenter * height;

      ctx.beginPath();
      ctx.moveTo(0, baseY - bandH / 2);

      // Build the top edge of the wave band
      for (let s = 0; s <= segments; s++) {
        const x = s * segWidth;
        const normX = x / width;
        let waveY =
          Math.sin(normX * Math.PI * 2 * wave.frequency + time * wave.speed * speedMul + wave.phase) *
          wave.amplitude;

        // Cursor ripple: add phase distortion near pointer
        if (pointerX !== undefined && pointerY !== undefined && pointerOpacity && pointerOpacity > 0.05) {
          const dx = normX - pointerX;
          const dy = (baseY + waveY) / height - pointerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.3) {
            const ripple = (1 - dist / 0.3) * 15 * pointerOpacity;
            waveY += Math.sin(dist * 20 - time * 3) * ripple;
          }
        }

        const y = baseY - bandH / 2 + waveY;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Close the bottom edge
      for (let s = segments; s >= 0; s--) {
        const x = s * segWidth;
        const normX = x / width;
        const waveY =
          Math.sin(normX * Math.PI * 2 * wave.frequency * 0.7 + time * wave.speed * speedMul * 0.8 + wave.phase + 1) *
          wave.amplitude * 0.6;

        const y = baseY + bandH / 2 + waveY;
        ctx.lineTo(x, y);
      }

      ctx.closePath();

      // Gradient fill
      const grad = ctx.createLinearGradient(0, baseY - bandH / 2, 0, baseY + bandH / 2);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.3, topColor);
      grad.addColorStop(0.5, topColor);
      grad.addColorStop(0.7, botColor);
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  syncWaveCount(count: number) {
    if (count === this.waves.length) return;
    this.init(count);
  }
}
