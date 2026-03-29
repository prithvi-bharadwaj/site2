import { describe, it, expect, vi, beforeEach } from "vitest";
import { draw, drawSoft, createPool, type Particle } from "@/lib/particle-text";

function mockCtx() {
  return {
    globalAlpha: 1,
    fillStyle: "",
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const POINTS = [
  { x: 10, y: 10 },
  { x: 20, y: 20 },
];

describe("draw", () => {
  let ctx: CanvasRenderingContext2D;
  let particles: Particle[];

  beforeEach(() => {
    ctx = mockCtx();
    particles = createPool(POINTS, 100, 100, false);
  });

  it("draws one arc per particle", () => {
    draw(ctx, particles, 1.5);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it("resets globalAlpha to 1 after drawing", () => {
    draw(ctx, particles, 1.5);
    expect(ctx.globalAlpha).toBe(1);
  });

  it("uses the provided color", () => {
    draw(ctx, particles, 1, "100,200,50");
    // fillStyle should contain the custom color
    const calls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(2);
  });
});

describe("drawSoft", () => {
  let ctx: CanvasRenderingContext2D;
  let particles: Particle[];

  beforeEach(() => {
    ctx = mockCtx();
    particles = createPool(POINTS, 100, 100, false);
  });

  it("draws two passes (glow + core) per particle", () => {
    drawSoft(ctx, particles, 1.5);
    // 2 particles * 2 passes = 4 arcs
    expect(ctx.arc).toHaveBeenCalledTimes(4);
  });

  it("glow pass uses larger radius than core", () => {
    drawSoft(ctx, particles, 1.5);
    const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls;
    // First call is glow (larger), third call is core (smaller) for same particle
    const glowRadius = arcCalls[0][2] as number;
    const coreRadius = arcCalls[2][2] as number;
    expect(glowRadius).toBeGreaterThan(coreRadius);
  });

  it("resets globalAlpha to 1 after drawing", () => {
    drawSoft(ctx, particles, 1.5);
    expect(ctx.globalAlpha).toBe(1);
  });
});
