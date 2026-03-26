export interface PointerState {
  x: number;
  y: number;
  opacity: number; // 0-1, fades out when idle
  trail: { x: number; y: number; age: number }[];
}

export interface PointerConfig {
  fadeSpeed: number; // seconds to fade to 0
  trailLength: number; // max trail points
  trailDuration: number; // how long trail points last (seconds)
}

const DEFAULT_POINTER_CONFIG: PointerConfig = {
  fadeSpeed: 0.8,
  trailLength: 16,
  trailDuration: 1.0,
};

export function createPointerHandler(
  canvas: HTMLCanvasElement,
  onUpdate: (state: PointerState) => void,
  pointerConfig?: Partial<PointerConfig>
): { destroy: () => void } {
  const cfg = { ...DEFAULT_POINTER_CONFIG, ...pointerConfig };
  const state: PointerState = { x: 0.5, y: 0.5, opacity: 0, trail: [] };

  let lastMoveTime = 0;
  let rafId = 0;

  function updateFromEvent(e: MouseEvent | Touch) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height; // NO flip — match UV space

    // Add to trail
    state.trail.push({ x, y, age: 0 });
    if (state.trail.length > cfg.trailLength) {
      state.trail.shift();
    }

    state.x = x;
    state.y = y;
    state.opacity = 1.0;
    lastMoveTime = performance.now();
  }

  // Tick loop: fade opacity + age trail points
  let lastTick = performance.now();
  function tick() {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    // Fade out when idle
    const idleTime = (now - lastMoveTime) / 1000;
    if (idleTime > 0.05) {
      state.opacity = Math.max(0, state.opacity - dt / cfg.fadeSpeed);
    }

    // Age trail points and remove expired
    for (const point of state.trail) {
      point.age += dt;
    }
    state.trail = state.trail.filter((p) => p.age < cfg.trailDuration);

    onUpdate({ ...state, trail: [...state.trail] });
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  function onPointerMove(e: PointerEvent) {
    updateFromEvent(e);
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) updateFromEvent(e.touches[0]);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) updateFromEvent(e.touches[0]);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
    },
  };
}
