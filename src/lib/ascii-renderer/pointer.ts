export interface PointerState {
  x: number;
  y: number;
  opacity: number;
  trail: { x: number; y: number; age: number }[];
}

export function createPointerHandler(
  canvas: HTMLCanvasElement,
  onUpdate: (state: PointerState) => void,
  fadeSpeed: number,
  trailLength: number,
  trailDecay: number
): { destroy: () => void } {
  const state: PointerState = { x: 0.5, y: 0.5, opacity: 0, trail: [] };

  let lastMoveTime = 0;
  let rafId = 0;

  function updateFromEvent(e: MouseEvent | Touch) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    state.trail.push({ x, y, age: 0 });
    if (state.trail.length > trailLength) {
      state.trail.shift();
    }

    state.x = x;
    state.y = y;
    state.opacity = 1.0;
    lastMoveTime = performance.now();
  }

  let lastTick = performance.now();
  function tick() {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    const idleTime = (now - lastMoveTime) / 1000;
    if (idleTime > 0.05) {
      state.opacity = Math.max(0, state.opacity - dt / fadeSpeed);
    }

    for (const point of state.trail) {
      point.age += dt;
    }
    state.trail = state.trail.filter((p) => p.age < trailDecay);

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
