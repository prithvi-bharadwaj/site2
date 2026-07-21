"use client";

import type { HoverCardMedia } from "@/lib/hover-card-bus";

interface ProofPopupProps {
  href: string;
  media: HoverCardMedia;
}

/**
 * Inline proof expansion. Opens in the text flow (displacing content below)
 * when a proof link is clicked. Clicking the media itself navigates to the
 * site in the same tab - links on this site never open new tabs.
 */
export function ProofPopup({ href, media }: ProofPopupProps) {
  const label = media.caption ?? href.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <div className="my-3" style={{ animation: "word-enter 220ms ease-out" }}>
      {media.type === "image" && (
        <a href={href} className="group/proof block cursor-pointer">
          <img
            src={media.src}
            alt={label}
            loading="lazy"
            className="h-auto w-full rounded-md border border-(--ink)/10 transition-opacity group-hover/proof:opacity-90"
          />
        </a>
      )}
      {media.type === "video" && (
        <a href={href} className="group/proof block cursor-pointer">
          <video
            src={media.src}
            poster={media.poster}
            muted
            loop
            autoPlay
            playsInline
            className="h-auto w-full rounded-md border border-(--ink)/10"
          />
        </a>
      )}
      {media.type === "youtube" && (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-(--ink)/10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${media.id}?autoplay=1&mute=1&loop=1&playlist=${media.id}`}
            title={label}
            className="h-full w-full"
            style={{ border: 0 }}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <a
        href={href}
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-(--ink)/45 transition-colors hover:text-(--ink)/80 underline underline-offset-2"
      >
        {label} →
      </a>
    </div>
  );
}
