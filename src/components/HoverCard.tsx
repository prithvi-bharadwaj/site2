"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onShow,
  onMove,
  onHide,
  onPin,
  onUnpin,
  type HoverCardMedia,
} from "@/lib/hover-card-bus";

const CARD_WIDTH = 296;
const CARD_HEIGHT = 230;
const WIDE_CARD_WIDTH = 560;
const WIDE_CARD_HEIGHT = 150;
// Pinned (clicked) cards grow ~20%.
const PIN_SCALE = 1.2;
const OFFSET_X = 16;
const OFFSET_Y = 16;

function clampPosition(x: number, y: number, wide: boolean, pinned = false) {
  if (typeof window === "undefined") return { x, y };
  const scale = pinned ? PIN_SCALE : 1;
  const w = (wide ? WIDE_CARD_WIDTH : CARD_WIDTH) * scale;
  const h = (wide ? WIDE_CARD_HEIGHT : CARD_HEIGHT) * scale;
  return {
    x: Math.min(Math.max(8, x + OFFSET_X), window.innerWidth - w - 8),
    y: Math.min(Math.max(8, y + OFFSET_Y), window.innerHeight - h - 8),
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
  const wideRef = useRef(false);
  const pinnedRef = useRef<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPinned = (href: string | null) => {
    pinnedRef.current = href;
    setPinnedHref(href);
  };

  const unpin = useCallback(() => {
    if (!pinnedRef.current) return;
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
      clearHideTimer();
      setMedia(m);
      setVisible(true);
      wideRef.current = m.type === "image" && !!m.wide;
      const card = cardRef.current;
      if (card) {
        const { x: px, y: py } = clampPosition(x, y, wideRef.current);
        card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
    const offMove = onMove(({ x, y }) => {
      if (pinnedRef.current) return;
      const card = cardRef.current;
      if (!card) return;
      const { x: px, y: py } = clampPosition(x, y, wideRef.current);
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
    const offPin = onPin(({ media: m, href, x, y }) => {
      // Re-clicking the same link toggles the pin off.
      if (pinnedRef.current === href) {
        unpin();
        return;
      }
      clearHideTimer();
      setMedia(m);
      setVisible(true);
      wideRef.current = m.type === "image" && !!m.wide;
      setPinned(href);
      const card = cardRef.current;
      if (card) {
        const { x: px, y: py } = clampPosition(x, y, wideRef.current, true);
        card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
    const offUnpin = onUnpin(unpin);
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
  useEffect(() => {
    if (!pinnedHref) return;
    const onDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) unpin();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") unpin();
    };
    const onScroll = () => unpin();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
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
