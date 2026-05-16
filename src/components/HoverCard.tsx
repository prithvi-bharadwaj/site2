"use client";

import { useEffect, useRef, useState } from "react";
import { onShow, onMove, onHide, type HoverCardMedia } from "@/lib/hover-card-bus";

const CARD_WIDTH = 280;
const CARD_HEIGHT = 175;
const OFFSET_X = 16;
const OFFSET_Y = 16;

function clampPosition(x: number, y: number) {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - CARD_WIDTH - 8;
  const maxY = window.innerHeight - CARD_HEIGHT - 8;
  return {
    x: Math.min(Math.max(8, x + OFFSET_X), maxX),
    y: Math.min(Math.max(8, y + OFFSET_Y), maxY),
  };
}

export function HoverCard() {
  const [media, setMedia] = useState<HoverCardMedia | null>(null);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const offShow = onShow(({ media: m, x, y }) => {
      setMedia(m);
      setVisible(true);
      const card = cardRef.current;
      if (card) {
        const { x: px, y: py } = clampPosition(x, y);
        card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
    const offMove = onMove(({ x, y }) => {
      const card = cardRef.current;
      if (!card) return;
      const { x: px, y: py } = clampPosition(x, y);
      card.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    });
    const offHide = onHide(() => {
      setVisible(false);
    });
    return () => {
      offShow();
      offMove();
      offHide();
    };
  }, []);

  useEffect(() => {
    if (media?.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay block — ignore.
      });
    }
  }, [media]);

  const mode = media?.type ?? "image";

  return (
    <div
      ref={cardRef}
      className={`hover-card${visible ? " visible" : ""}`}
      data-mode={mode}
      aria-hidden="true"
      role="presentation"
    >
      <div className="hover-card-media">
        {media?.type === "image" && (
          <img className="hover-card-img" src={media.src} alt="" loading="lazy" />
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
    </div>
  );
}
