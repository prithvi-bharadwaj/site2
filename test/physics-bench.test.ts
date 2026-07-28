import { describe, it } from "vitest";
import { createBody, stepPhysics, DEFAULT_PHYSICS, type PhysicsEnv } from "@/lib/letter-physics";
import { dropAll } from "@/lib/letter-effects";

/** Deterministic rng so before/after numbers compare. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePage(n: number) {
  const bodies = [];
  const cols = 80;
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    bodies.push(
      createBody({
        char: String.fromCharCode(97 + (i % 26)),
        x: 20 + col * 15,
        y: 40 + row * 24,
        w: 12 + (i % 3) * 2,
        h: 16,
        ascent: 13,
        font: "16px serif",
        color: "#000",
        alpha: 1,
      })
    );
  }
  return bodies;
}

describe("stepPhysics", () => {
  it("bench: 1500 bodies, full drop to settle", () => {
    const env: PhysicsEnv = { ...DEFAULT_PHYSICS, width: 1280, floorY: 800 };
    const rng = mulberry32(42);
    const bodies = makePage(1500);
    dropAll(bodies, env, rng);
    const t0 = performance.now();
    let frames = 0;
    while (frames < 600 && stepPhysics(bodies, 1 / 60, env, rng)) frames++;
    const t1 = performance.now();
    // eslint-disable-next-line no-console
    console.log(
      `frames=${frames} total=${(t1 - t0).toFixed(1)}ms avg=${((t1 - t0) / frames).toFixed(3)}ms/frame`
    );
  });
});
