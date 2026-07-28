"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Native-feeling switch. Geometry is in explicit px (the root font is 125%,
 * so rem-based sizing inflates and breaks the thumb/track proportions).
 * Tap to toggle, or drag the thumb across like an iOS switch.
 */

const TRACK_W = 44;
const TRACK_H = 24;
const THUMB = 20;
const INSET = (TRACK_H - THUMB) / 2;
/** How far the thumb travels between off and on. */
const TRAVEL = TRACK_W - THUMB - INSET * 2;
/** Thumb stretches this much while held down. */
const SQUISH = 3;
/** Pointer movement past this counts as a drag, not a tap. */
const DRAG_THRESHOLD = 3;

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name - the visible label lives outside the control. */
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const [pressed, setPressed] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const startXRef = useRef(0);
  const draggedRef = useRef(false);
  // A drag commits on pointerup; swallow the click that follows it.
  const swallowClickRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      draggedRef.current = false;
      setPressed(true);
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || !pressed) return;
      const dx = e.clientX - startXRef.current;
      if (!draggedRef.current && Math.abs(dx) < DRAG_THRESHOLD) return;
      draggedRef.current = true;
      const base = checked ? TRAVEL : 0;
      setDragX(Math.max(0, Math.min(TRAVEL, base + dx)));
    },
    [checked, disabled, pressed]
  );

  const endDrag = useCallback(() => {
    setPressed(false);
    if (draggedRef.current) {
      swallowClickRef.current = true;
      const next = (dragX ?? 0) > TRAVEL / 2;
      if (next !== checked) onChange(next);
    }
    setDragX(null);
  }, [checked, dragX, onChange]);

  /** The browser stole the pointer (scroll gesture, etc.) - no commit, and no
   *  click swallow: a canceled sequence never produces the click that flag
   *  expects, so arming it would eat the user's next real tap. */
  const cancelDrag = useCallback(() => {
    setPressed(false);
    draggedRef.current = false;
    setDragX(null);
  }, []);

  const onClick = useCallback(() => {
    if (swallowClickRef.current) {
      swallowClickRef.current = false;
      return;
    }
    if (!disabled) onChange(!checked);
  }, [checked, disabled, onChange]);

  const dragging = dragX !== null;
  const squish = pressed && !dragging ? SQUISH : 0;
  const offset = dragging ? dragX! : checked ? TRAVEL - squish : 0;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-checked={checked}
      className="switch"
      style={{ width: TRACK_W, height: TRACK_H }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
    >
      <span
        className="switch-thumb"
        style={{
          width: THUMB + squish,
          height: THUMB,
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : undefined,
        }}
      />
    </button>
  );
}
