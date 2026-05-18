/**
 * Event bus between <HoverLink> triggers and the single <HoverCard /> portal.
 * Uses CustomEvent on window so there's no React context plumbing required.
 */

interface HoverCardMediaBase {
  /** Optional caption shown below the preview. */
  caption?: string;
}

export type HoverCardMedia =
  | (HoverCardMediaBase & { type: "image"; src: string })
  | (HoverCardMediaBase & { type: "video"; src: string; poster?: string })
  | (HoverCardMediaBase & { type: "youtube"; id: string });

export interface HoverCardShowDetail {
  media: HoverCardMedia;
  x: number;
  y: number;
}

export interface HoverCardMoveDetail {
  x: number;
  y: number;
}

const SHOW = "hovercard:show";
const MOVE = "hovercard:move";
const HIDE = "hovercard:hide";

export function emitShow(detail: HoverCardShowDetail) {
  window.dispatchEvent(new CustomEvent<HoverCardShowDetail>(SHOW, { detail }));
}

export function emitMove(detail: HoverCardMoveDetail) {
  window.dispatchEvent(new CustomEvent<HoverCardMoveDetail>(MOVE, { detail }));
}

export function emitHide() {
  window.dispatchEvent(new Event(HIDE));
}

export function onShow(listener: (detail: HoverCardShowDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<HoverCardShowDetail>).detail);
  window.addEventListener(SHOW, handler);
  return () => window.removeEventListener(SHOW, handler);
}

export function onMove(listener: (detail: HoverCardMoveDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<HoverCardMoveDetail>).detail);
  window.addEventListener(MOVE, handler);
  return () => window.removeEventListener(MOVE, handler);
}

export function onHide(listener: () => void) {
  window.addEventListener(HIDE, listener);
  return () => window.removeEventListener(HIDE, listener);
}
