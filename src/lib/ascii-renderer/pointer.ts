export interface PointerState {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  active: boolean;
}

export function createPointerHandler(
  canvas: HTMLCanvasElement,
  onUpdate: (state: PointerState) => void
): { destroy: () => void } {
  const state: PointerState = { x: 0.5, y: 0.5, active: false };

  function updateFromEvent(e: MouseEvent | Touch) {
    const rect = canvas.getBoundingClientRect();
    state.x = (e.clientX - rect.left) / rect.width;
    state.y = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y for GL
    state.active = true;
    onUpdate({ ...state });
  }

  function onPointerMove(e: PointerEvent) {
    updateFromEvent(e);
  }

  function onPointerLeave() {
    state.active = false;
    onUpdate({ ...state });
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) {
      updateFromEvent(e.touches[0]);
    }
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      updateFromEvent(e.touches[0]);
    }
  }

  function onTouchEnd() {
    state.active = false;
    onUpdate({ ...state });
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart);
  canvas.addEventListener("touchend", onTouchEnd);

  return {
    destroy() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    },
  };
}
