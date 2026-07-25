"use client";

/**
 * Window-event bus between the controls panel (or a keyboard shortcut) and the
 * physics overlay. Commands go one way; the overlay pushes state back when it
 * has to shut gravity off on its own (resize, page teardown) so the switch in
 * the panel can never desync from what's on screen.
 */

const CMD_EVENT = "physics:cmd";
const SYNC_EVENT = "physics:sync";

export type PhysicsCommand =
  | { type: "gravity"; on: boolean }
  | { type: "smash" };

export function emitPhysics(cmd: PhysicsCommand) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PhysicsCommand>(CMD_EVENT, { detail: cmd }));
}

export function onPhysics(listener: (cmd: PhysicsCommand) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<PhysicsCommand>).detail);
  window.addEventListener(CMD_EVENT, handler);
  return () => window.removeEventListener(CMD_EVENT, handler);
}

/** Overlay -> UI: gravity is actually this. */
export function emitPhysicsSync(gravityOn: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<boolean>(SYNC_EVENT, { detail: gravityOn }));
}

export function onPhysicsSync(listener: (gravityOn: boolean) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<boolean>).detail);
  window.addEventListener(SYNC_EVENT, handler);
  return () => window.removeEventListener(SYNC_EVENT, handler);
}
