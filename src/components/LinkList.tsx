"use client";

import { useRef, useState, type ReactNode } from "react";
import { WiggleWords, useWiggleDescendants } from "./WiggleWords";
import { emitShow, emitMove, emitHide, emitPin, isPinnedInspect, type HoverCardMedia } from "@/lib/hover-card-bus";
import { CLICK_XP, award, inspectStart, inspectEnd, mediaKey } from "@/lib/xp";
import { trackInteraction } from "@/lib/analytics";

export interface BrandLink {
  name: string;
  href: string;
  favicon: string;
  /** Optional hover-preview media shown next to the cursor. */
  media?: HoverCardMedia;
  /** Append a ↗ inside the link to mark it as an outbound destination. */
  external?: boolean;
}

export interface InlineLink {
  /** Phrase inside the title that becomes a dotted-underline link. */
  phrase: string;
  href: string;
  /** Optional hover-preview media shown next to the cursor. */
  media?: HoverCardMedia;
}

export interface TrailingIcon {
  name: string;
  href: string;
  /** Brand slug for inline SVG via <BrandIcon> (e.g. "openai", "anthropic"). */
  slug?: string;
  /** Fallback raster favicon when no slug is registered. */
  favicon?: string;
}

export interface LinkListItem {
  title: string;
  href?: string;
  favicon?: string;
  /** Optional hover-preview media for the full item. */
  media?: HoverCardMedia;
  /** Favicons rendered inline after the title text (for sentences mentioning multiple brands). */
  trailingFavicons?: string[];
  /** Greyscale clickable icons rendered inline after the title text. */
  trailingIcons?: TrailingIcon[];
  /** Inline brand chips: matching tokens in `title` render as favicon + linked name. */
  brandLinks?: BrandLink[];
  /** Multi-word phrases inside `title` that render as dotted-underline links. */
  inlineLinks?: InlineLink[];
  meta?: string;
  expand?: string;
  /** Extra favicons shown only when the item is expanded. */
  expandFavicons?: string[];
  links?: { label: string; href: string; favicon?: string }[];
}

interface LinkListProps {
  /** Section header. Pass falsy/empty to hide. */
  label?: string;
  items: LinkListItem[];
  /** Render in two columns when wide. */
  columns?: 1 | 2;
  /** "compact" = short titles in a tight grid. "prose" = long-sentence bullets, single column, wider rows. */
  variant?: "compact" | "prose";
  /** Show a leading "—" before each item. */
  pointer?: boolean;
  /**
   * Discovery-XP namespace ("lore", "writing"). When set, expanding an item
   * or opening its link awards xp once, and hover previews count as proof
   * inspection under `<xpKind>-proof:`.
   */
  xpKind?: string;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DOTTED = "1px dotted rgb(var(--ink-rgb) / 0.35)";

function renderTitleWithBrands(
  title: string,
  brands: BrandLink[] | undefined,
  inline: InlineLink[] | undefined,
  xpKind: string | undefined
): ReactNode {
  const patterns = [
    ...(inline ?? []).map((l) => ({ kind: "inline" as const, match: l.phrase, href: l.href, media: l.media })),
    ...(brands ?? []).map((b) => ({ kind: "brand" as const, match: b.name, href: b.href, media: b.media, favicon: b.favicon, external: b.external })),
  ].sort((a, b) => b.match.length - a.match.length);
  if (patterns.length === 0) return <WiggleWords text={title} />;

  const proofHandlers = (href: string, media: HoverCardMedia | undefined) => ({
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (xpKind) award(`click:${media ? mediaKey(media) : href}`, CLICK_XP);
      // Mouse clicks pin the preview card; keyboard activation navigates.
      if (media && e.detail > 0) {
        e.preventDefault();
        if (xpKind) inspectEnd(`${xpKind}-proof:${mediaKey(media)}`);
        emitPin({
          media,
          href,
          inspectId: xpKind ? `${xpKind}-proof:${mediaKey(media)}` : undefined,
          x: e.clientX,
          y: e.clientY,
        });
      }
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (media && e.pointerType === "mouse") {
        emitShow({ media, x: e.clientX, y: e.clientY });
        if (xpKind) inspectStart(`${xpKind}-proof:${mediaKey(media)}`);
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (media && e.pointerType === "mouse") {
        emitHide();
        if (xpKind) {
          const id = `${xpKind}-proof:${mediaKey(media)}`;
          if (!isPinnedInspect(id)) inspectEnd(id);
        }
      }
    },
  });

  const pattern = new RegExp(
    `(${patterns.map((p) => escapeRegex(p.match)).join("|")})`,
    "gi"
  );
  const parts = title.split(pattern);
  return parts.map((part, i) => {
    const hit = patterns.find((p) => p.match.toLowerCase() === part.toLowerCase());
    if (hit?.kind === "brand") {
      return (
        <a
          key={i}
          href={hit.href}
          data-repel
          {...proofHandlers(hit.href, hit.media)}
          className="brand-link wl-unit inline-flex items-baseline gap-1"
        >
          <img
            src={hit.favicon}
            alt=""
            width={11}
            height={11}
            className="brand-link-favicon inline-block h-[0.7rem] w-[0.7rem] rounded-sm align-[-0.15em]"
          />
          <span className="brand-link-text">{part}</span>
          {hit.external && <span aria-hidden className="brand-link-arrow">↗</span>}
        </a>
      );
    }
    if (hit?.kind === "inline") {
      return (
        <a
          key={i}
          href={hit.href}
          data-repel
          {...proofHandlers(hit.href, hit.media)}
          className="wl-unit inline-block text-(--ink)/70 hover:text-(--ink)"
          style={{ textDecoration: "none", borderBottom: DOTTED, paddingBottom: 1 }}
        >
          {part}
        </a>
      );
    }
    return <WiggleWords key={i} text={part} />;
  });
}

export function LinkList({ label, items, columns = 1, variant = "compact", pointer = false, xpKind }: LinkListProps) {
  const [open, setOpen] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useWiggleDescendants(rootRef);

  const analyticsSection =
    xpKind ?? label?.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") ?? "list";

  return (
    <section ref={rootRef} data-analytics-section={analyticsSection}>
      {label && (
        <span className="text-(--ink)/80 text-sm uppercase tracking-widest block mb-6">
          <WiggleWords text={label} />
        </span>
      )}
      <div
        className={`grid grid-cols-1 ${
          columns === 2 ? "sm:grid-cols-2" : ""
        } ${variant === "prose" ? "gap-x-12 gap-y-2" : "gap-x-12 gap-y-2"} text-sm`}
      >
        {items.map((item, i) => {
          const expandable =
            !!item.expand ||
            (item.links && item.links.length > 0) ||
            (item.expandFavicons && item.expandFavicons.length > 0);
          const isOpen = open === i;

          const titleNode = (
            <span
              // No hover-underline in prose (lore): the sweep stays put while
              // wiggling words displace, which reads as a broken underline.
              className={`${variant === "prose" ? "" : "hover-underline "}text-(--ink)/70 group-hover:text-(--ink) transition-colors duration-200 inline leading-snug`}
            >
              {pointer && (
                <span className="text-(--ink)/30 mr-1.5">·</span>
              )}
              {item.favicon && (
                <img
                  src={item.favicon}
                  alt=""
                  className="h-[0.7rem] w-[0.7rem] rounded-sm opacity-70 group-hover:opacity-100 transition-opacity inline-block align-[-0.15em] mr-1.5"
                  width={11}
                  height={11}
                />
              )}
              {renderTitleWithBrands(item.title, item.brandLinks, item.inlineLinks, xpKind)}
              {item.trailingFavicons && item.trailingFavicons.length > 0 && (
                <span className="inline-flex items-center gap-1 ml-1.5 align-[-0.15em]">
                  {item.trailingFavicons.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-[0.7rem] w-[0.7rem] rounded-sm opacity-70 group-hover:opacity-100 transition-opacity inline-block"
                      width={11}
                      height={11}
                    />
                  ))}
                </span>
              )}
            </span>
          );

          const wrapperClass = `group block leading-snug${pointer ? " bullet-hang" : ""}`;

          return (
            <div
              key={item.title}
              onPointerEnter={(e) => {
                if (item.media && !isOpen && e.pointerType === "mouse") {
                  emitShow({ media: item.media, x: e.clientX, y: e.clientY });
                  if (xpKind) inspectStart(`${xpKind}-proof:${mediaKey(item.media)}`);
                }
              }}
              onPointerMove={(e) => {
                if (item.media && !isOpen && e.pointerType === "mouse") {
                  emitMove({ x: e.clientX, y: e.clientY });
                }
              }}
              onPointerLeave={(e) => {
                if (item.media && e.pointerType === "mouse") {
                  emitHide();
                  if (xpKind) {
                    const id = `${xpKind}-proof:${mediaKey(item.media)}`;
                    if (!isPinnedInspect(id)) inspectEnd(id);
                  }
                }
              }}
            >
              {expandable ? (
                <span
                  className={`${wrapperClass} cursor-pointer`}
                  data-analytics-target={item.title}
                  onClick={() => {
                    setOpen(isOpen ? null : i);
                    trackInteraction(isOpen ? "list_item_collapsed" : "list_item_expanded", {
                      section: analyticsSection,
                      item_title: item.title,
                    });
                    if (item.media && !isOpen) {
                      emitHide();
                      // The hover-inspect timer must die with the preview, or
                      // it pays out for a card that's no longer showing.
                      if (xpKind) inspectEnd(`${xpKind}-proof:${mediaKey(item.media)}`);
                    }
                    if (xpKind && !isOpen) award(`${xpKind}:${item.title}`, CLICK_XP);
                  }}
                >
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-(--ink)/20 tabular-nums ml-2">
                      {item.meta}
                    </span>
                  )}
                </span>
              ) : item.href ? (
                <a
                  href={item.href}
                  className={wrapperClass}
                  onClick={() => {
                    if (xpKind) award(`${xpKind}:${item.href}`, CLICK_XP);
                  }}
                >
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-(--ink)/20 tabular-nums ml-2">
                      {item.meta}
                    </span>
                  )}
                </a>
              ) : (
                <span className={`${wrapperClass} cursor-default`}>
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-(--ink)/20 tabular-nums ml-2">
                      {item.meta}
                    </span>
                  )}
                </span>
              )}

              {expandable && (
                <div
                  className="work-detail"
                  style={{
                    maxHeight: isOpen ? 240 : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="pt-1 pb-1 leading-relaxed">
                    {item.expand && (
                      <p className="text-xs text-(--ink)/45">{item.expand}</p>
                    )}
                    {item.media?.type === "image" && (
                      <img
                        src={item.media.src}
                        alt={item.media.caption ?? ""}
                        className="mt-2 h-auto w-full rounded-md border border-(--ink)/8"
                        loading="lazy"
                      />
                    )}
                    {item.expandFavicons && item.expandFavicons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {item.expandFavicons.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            className="h-4 w-4 rounded-sm opacity-80"
                            width={16}
                            height={16}
                          />
                        ))}
                      </div>
                    )}
                    {item.links && item.links.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {item.links.map((l) => (
                          <a
                            key={l.href}
                            href={l.href}
                            className="inline-flex items-center gap-1 text-[11px] text-(--ink)/45 hover:text-(--ink)/80 underline underline-offset-2"
                          >
                            {l.favicon && (
                              <img src={l.favicon} alt="" className="h-3 w-3 rounded-sm" width={12} height={12} />
                            )}
                            {l.label} ↗
                          </a>
                        ))}
                      </div>
                    )}
                    {item.href && !item.expand && (
                      <a
                        href={item.href}
                        className="text-[11px] text-(--ink)/45 hover:text-(--ink)/80 underline underline-offset-2"
                      >
                        open ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
