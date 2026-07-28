"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onShow,
  onMove,
  onHide,
  onPin,
  onUnpin,
  setPinnedInspectId,
  type HoverCardMedia,
} from "@/lib/hover-card-bus";
import { inspectStart, inspectEnd } from "@/lib/xp";
import { trackInteraction } from "@/lib/analytics";

const CARD_WIDTH = 296;
const CARD_HEIGHT = 230;
const WIDE_CARD_WIDTH = 560;
const WIDE_CARD_HEIGHT = 150;
// Caption-only note chips are a fraction of a media card.
const NOTE_CARD_WIDTH = 320;
const NOTE_CARD_HEIGHT = 36;
// Pinned (clicked) cards grow ~20%.
const PIN_SCALE = 1.2;
const OFFSET_X = 16;
const OFFSET_Y = 16;
const PREVIEW_OPEN_COOLDOWN_MS = 5_000;

type CardShape = "default" | "wide" | "note";

function mediaProperties(media: HoverCardMedia) {
  return {
    media_type: media.type,
    media_id:
      media.type === "youtube"
        ? media.id
        : media.type === "image" || media.type === "video"
          ? media.src
          : media.caption,
    caption: media.caption,
  };
}

function clampPosition(x: number, y: number, shape: CardShape, pinned = false) {
  if (typeof window === "undefined") return { x, y };
  // Note chips render at natural width; only media cards grow when pinned.
  const scale = pinned && shape !== "note" ? PIN_SCALE : 1;
  const w = (shape === "wide" ? WIDE_CARD_WIDTH : shape === "note" ? NOTE_CARD_WIDTH : CARD_WIDTH) * scale;
  const h = (shape === "wide" ? WIDE_CARD_HEIGHT : shape === "note" ? NOTE_CARD_HEIGHT : CARD_HEIGHT) * scale;
  // max() last: on narrow viewports the card must stay on-screen at the left/top
  // even when it's wider than the space to the right of the cursor.
  return {
    x: Math.max(8, Math.min(x + OFFSET_X, window.innerWidth - w - 8)),
    y: Math.max(8, Math.min(y + OFFSET_Y, window.innerHeight - h - 8)),
  };
}

/**
 * The single floating preview card. Hover shows it next to the cursor;
 * clicking a proof link "pins" it: it stops following the mouse, grows 20%,
 * and becomes a real link (click card → navigate, same tab). Click outside,
 * Escape, scrolling, or re-clicking the same link unpins it.
 */
export function HoverCard() {
  const [media, setMedia] = useState<HoverCardMedia | null>(null);
  const [visible, setVisible] = useState(false);
  const [pinnedHref, setPinnedHref] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shapeRef = useRef<CardShape>("default");
  const pinnedRef = useRef<string | null>(null);
  const inspectIdRef = useRef<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewOpenedAtRef = useRef(new Map<string, number>());

  const setPinned = (href: string | null) => {
    pinnedRef.current = href;
    setPinnedHref(href);
  };

  const unpin = useCallback((reason = "event") => {
    if (!pinnedRef.current) return;
    trackInteraction("preview_unpinned", {
      href: pinnedRef.current,
      reason,
    });
    if (inspectIdRef.current) {
      inspectEnd(inspectIdRef.current);
      inspectIdRef.current = null;
    }
    setPinnedInspectId(null);
    setPinned(null);
    setVisible(false);
    hideTimerRef.current = setTimeout(() => {
      setMedia((m) => (m?.type === "youtube" ? null : m));
      hideTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const offShow = onShow(({ media: m, x, y }) => {
      if (pinnedRef.current) return;
      const properties = mediaProperties(m);
      const previewId = String(
        properties.media_id ?? properties.caption ?? properties.media_type
      );
      const now = performance.now();
      const lastOpenedAt = previewOpenedAtRef.current.get(previewId);
      if (
        lastOpenedAt === undefined ||
        now - lastOpenedAt >= PREVIEW_OPEN_COOLDOWN_MS
      ) {
        previewOpenedAtRef.current.set(previewId, now);
        trackInteraction("preview_opened", properties);
      }
      clearHideTimer();
      setMedia(m);
      setVisible(true);
      shapeRef.current = m.type === "note" ? "note" : m.type === "image" && m.wide ? "wide" : "default";
      const card = cardRef.current;
      if (card) {
        const { x: px, y: py } = clampPosition(x, y, shapeRef.current);
        card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
    const offMove = onMove(({ x, y }) => {
      if (pinnedRef.current) return;
      const card = cardRef.current;
      if (!card) return;
      const { x: px, y: py } = clampPosition(x, y, shapeRef.current);
      card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    });
    const offHide = onHide(() => {
      if (pinnedRef.current) return;
      setVisible(false);
      // Unmount streaming media once the fade-out finishes so a hidden
      // YouTube iframe doesn't keep playing in the background.
      hideTimerRef.current = setTimeout(() => {
        setMedia((m) => (m?.type === "youtube" ? null : m));
        hideTimerRef.current = null;
      }, 250);
    });
    const offPin = onPin(({ media: m, href, inspectId, x, y }) => {
      // Re-clicking the same link toggles the pin off.
      if (pinnedRef.current === href) {
        unpin("source_reclicked");
        return;
      }
      trackInteraction("preview_pinned", {
        ...mediaProperties(m),
        href,
        inspect_id: inspectId,
      });
      clearHideTimer();
      // Dwelling on a pinned card counts as inspecting the proof - this is
      // the only inspection path on touch devices, where hover doesn't exist.
      if (inspectIdRef.current) inspectEnd(inspectIdRef.current);
      inspectIdRef.current = inspectId ?? null;
      setPinnedInspectId(inspectId ?? null);
      if (inspectId) inspectStart(inspectId);
      setMedia(m);
      setVisible(true);
      shapeRef.current = m.type === "note" ? "note" : m.type === "image" && m.wide ? "wide" : "default";
      setPinned(href);
      const card = cardRef.current;
      if (card) {
        const { x: px, y: py } = clampPosition(x, y, shapeRef.current, true);
        card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
    const offUnpin = onUnpin(() => unpin("event"));
    return () => {
      offShow();
      offMove();
      offHide();
      offPin();
      offUnpin();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [unpin]);

  // Pinned card dismissal: click outside, Escape, or scroll.
  // "click" (not "pointerdown") so a re-click on the source link reaches its
  // onClick first — the link stops propagation and toggles the pin itself;
  // pointerdown would unpin before the click and the toggle would re-pin.
  useEffect(() => {
    if (!pinnedHref) return;
    const onDocClick = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) unpin("outside_click");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") unpin("escape");
    };
    const onScroll = () => unpin("scroll");
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pinnedHref, unpin]);

  useEffect(() => {
    if (media?.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay block — ignore.
      });
    }
  }, [media]);

  const mode = media?.type ?? "image";

  const inner = (
    <>
      {media?.type !== "note" && (
        <div className="hover-card-media">
          {media?.type === "image" && (
            <img
              className="hover-card-img"
              src={media.src}
              alt=""
              loading="lazy"
              style={{ objectPosition: media.position }}
            />
          )}
          {media?.type === "video" && (
            <video
              ref={videoRef}
              className="hover-card-video"
              src={media.src}
              poster={media.poster}
              muted
              loop
              playsInline
              preload="metadata"
            />
          )}
          {media?.type === "youtube" && (
            <iframe
              className="hover-card-youtube"
              src={`https://www.youtube-nocookie.com/embed/${media.id}?autoplay=1&mute=1&loop=1&controls=0&playlist=${media.id}`}
              title="Preview"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      )}
      {media?.caption && (
        <div className="hover-card-caption">
          {media.caption}
          {pinnedHref && <span className="hover-card-visit"> →</span>}
        </div>
      )}
    </>
  );

  return (
    <div
      ref={cardRef}
      className={`hover-card${visible ? " visible" : ""}${pinnedHref ? " pinned" : ""}`}
      data-analytics-section="preview_card"
      data-mode={mode}
      data-wide={media?.type === "image" && media.wide ? "true" : undefined}
      aria-hidden={pinnedHref ? undefined : "true"}
      role={pinnedHref ? undefined : "presentation"}
    >
      {pinnedHref ? (
        // New tab on purpose: the visitor keeps their xp session running here.
        <a
          href={pinnedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hover-card-linkwrap"
          aria-label={media?.caption ?? "open link"}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
