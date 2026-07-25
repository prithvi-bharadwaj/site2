/**
 * Event bus between <HoverLink> triggers and the single <HoverCard /> portal.
 * Uses CustomEvent on window so there's no React context plumbing required.
 */

interface HoverCardMediaBase {
  /** Optional caption shown below the preview. */
  caption?: string;
}

export type HoverCardMedia =
  | (HoverCardMediaBase & { type: "image"; src: string; position?: string; wide?: boolean })
  | (HoverCardMediaBase & { type: "video"; src: string; poster?: string })
  | (HoverCardMediaBase & { type: "youtube"; id: string })
  // Caption-only card (e.g. "link coming soon").
  | (HoverCardMediaBase & { type: "note" });

export interface HoverCardShowDetail {
  media: HoverCardMedia;
  x: number;
  y: number;
}

export interface HoverCardMoveDetail {
  x: number;
  y: number;
}

export interface HoverCardPinDetail {
  media: HoverCardMedia;
  /** Destination the pinned card links to (same tab). */
  href: string;
  /**
   * Proof-inspection id (e.g. "proof:<mediaKey>"). While the card stays
   * pinned, the dwell timer runs against this id - the touch equivalent of
   * hover-inspecting.
   */
  inspectId?: string;
  x: number;
  y: number;
}

/**
 * The dwell id owned by the currently pinned card. Source links check this
 * before cancelling an inspect timer on pointerleave - once the card is
 * pinned, the dwell belongs to the card, not the hover.
 */
let pinnedInspectId: string | null = null;

export function setPinnedInspectId(id: string | null) {
  pinnedInspectId = id;
}

export function isPinnedInspect(id: string): boolean {
  return pinnedInspectId === id;
}

const SHOW = "hovercard:show";
const MOVE = "hovercard:move";
const HIDE = "hovercard:hide";
const PIN = "hovercard:pin";
const UNPIN = "hovercard:unpin";

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

export function emitPin(detail: HoverCardPinDetail) {
  window.dispatchEvent(new CustomEvent<HoverCardPinDetail>(PIN, { detail }));
}

export function onPin(listener: (detail: HoverCardPinDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<HoverCardPinDetail>).detail);
  window.addEventListener(PIN, handler);
  return () => window.removeEventListener(PIN, handler);
}

export function emitUnpin() {
  window.dispatchEvent(new Event(UNPIN));
}

export function onUnpin(listener: () => void) {
  window.addEventListener(UNPIN, listener);
  return () => window.removeEventListener(UNPIN, listener);
}
