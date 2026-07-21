"use client";

import { useRef, useState } from "react";
import type { BrandLink, InlineLink, LinkListItem } from "./LinkList";
import { BrandIcon, hasBrandIcon } from "./BrandIcon";
import { WiggleWords, useWiggleDescendants } from "./WiggleWords";
import { emitShow, emitMove, emitHide, emitPin } from "@/lib/hover-card-bus";
import { CLICK_XP, award, inspectStart, inspectEnd, mediaKey, useXp } from "@/lib/xp";

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const DOTTED = "1px dotted rgb(var(--ink-rgb) / 0.35)";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Segment =
  | { kind: "plain"; text: string }
  | { kind: "brand"; text: string; brand: BrandLink }
  | { kind: "inline"; text: string; link: InlineLink };

function tokenize(title: string, brands?: BrandLink[], inline?: InlineLink[]): Segment[] {
  const patterns: { kind: "brand" | "inline"; match: string; payload: BrandLink | InlineLink }[] = [
    ...(inline ?? []).map((l) => ({ kind: "inline" as const, match: l.phrase, payload: l })),
    ...(brands ?? []).map((b) => ({ kind: "brand" as const, match: b.name, payload: b })),
  ].sort((a, b) => b.match.length - a.match.length);

  if (patterns.length === 0) return [{ kind: "plain", text: title }];

  const regex = new RegExp(`(${patterns.map((p) => escapeRegex(p.match)).join("|")})`, "gi");
  // Only the first occurrence of each phrase becomes a link - project titles
  // like "skills - ...AI skills i use" repeat the name in the description.
  const used = new Set<string>();
  return title
    .split(regex)
    .filter((part) => part.length > 0)
    .map<Segment>((part) => {
      const hit = patterns.find((p) => p.match.toLowerCase() === part.toLowerCase());
      if (!hit || used.has(hit.match.toLowerCase())) return { kind: "plain", text: part };
      used.add(hit.match.toLowerCase());
      if (hit.kind === "brand") return { kind: "brand", text: part, brand: hit.payload as BrandLink };
      return { kind: "inline", text: part, link: hit.payload as InlineLink };
    });
}

interface PreviouslyListProps {
  label: string;
  items: LinkListItem[];
  /**
   * Namespace for hover-inspect awards. The Previously section uses "proof"
   * (counted by the Proof of Work achievement); other sections sharing this
   * component must use their own prefix so they don't pollute that count.
   */
  proofKind?: string;
}

/**
 * Continuous-paragraph list. Same font as the bio. Tight line-spacing.
 * Only items with expand content get hover affordance + cursor pointer.
 * Words repel from cursor via the shared spring-physics wiggle manager;
 * underlined links move gently as single units so they stay clickable.
 */
export function PreviouslyList({ label, items, proofKind = "proof" }: PreviouslyListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const xp = useXp();

  useWiggleDescendants(ref);

  return (
    <div ref={ref} className="text-sm text-(--ink)/60 leading-relaxed">
      <span className="text-(--ink)/35 text-xs uppercase tracking-widest block mb-6">
        <WiggleWords text={label} />
      </span>
      <ul className="list-none p-0 m-0">
        {items.map((item, i) => {
          const expandable =
            !!item.expand ||
            (item.links && item.links.length > 0) ||
            (item.expandFavicons && item.expandFavicons.length > 0);
          const isOpen = open === i;
          const segments = tokenize(item.title, item.brandLinks, item.inlineLinks);
          const proofKeys = [
            ...(item.brandLinks ?? []).flatMap((b) => (b.media ? [`${proofKind}:${mediaKey(b.media)}`] : [])),
            ...(item.inlineLinks ?? []).flatMap((l) => (l.media ? [`${proofKind}:${mediaKey(l.media)}`] : [])),
          ];
          const verified = proofKeys.length > 0 && proofKeys.every((k) => k in xp.earned);

          return (
            <li key={i} className="m-0 p-0 bullet-hang">
              <span
                onClick={expandable ? () => setOpen(isOpen ? null : i) : undefined}
                className={expandable ? "group cursor-pointer" : ""}
                style={{ display: "inline" }}
              >
                <span
                  data-repel
                  title={verified ? "proof inspected" : undefined}
                  className={`inline-block mr-2 ${verified ? "text-(--ink)/75" : "text-(--ink)/30"}`}
                  style={{ transition: `transform 180ms ${EASE}, color 400ms` }}
                >
                  {verified ? "•" : "·"}
                </span>
                {item.favicon && (
                  <img
                    src={item.favicon}
                    alt=""
                    width={11}
                    height={11}
                    data-repel
                    className="inline-block align-[-0.15em] h-[0.7rem] w-[0.7rem] mr-1 rounded-sm opacity-70 group-hover:opacity-100"
                    style={{ transition: `transform 180ms ${EASE}, opacity 200ms` }}
                  />
                )}
                {segments.map((seg, si) => {
                  if (seg.kind === "brand") {
                    const media = seg.brand.media;
                    return (
                      <a
                        key={si}
                        href={seg.brand.href}
                        data-repel
                        onClick={(e) => {
                          e.stopPropagation();
                          award(`click:${media ? mediaKey(media) : seg.brand.href}`, CLICK_XP);
                          // Mouse clicks pin the preview card instead of leaving.
                          // Keyboard activation (e.detail === 0) navigates directly.
                          if (media && e.detail > 0) {
                            e.preventDefault();
                            inspectEnd(`${proofKind}:${mediaKey(media)}`);
                            emitPin({ media, href: seg.brand.href, x: e.clientX, y: e.clientY });
                          }
                        }}
                        onPointerEnter={(e) => {
                          if (media && e.pointerType === "mouse") {
                            emitShow({ media, x: e.clientX, y: e.clientY });
                            inspectStart(`${proofKind}:${mediaKey(media)}`);
                          }
                        }}
                        onPointerMove={(e) => {
                          if (media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerLeave={(e) => {
                          if (media && e.pointerType === "mouse") {
                            emitHide();
                            inspectEnd(`${proofKind}:${mediaKey(media)}`);
                          }
                        }}
                        className="brand-link wl-unit inline-flex items-baseline gap-1 align-baseline"
                      >
                        <img
                          src={seg.brand.favicon}
                          alt=""
                          width={11}
                          height={11}
                          className="brand-link-favicon inline-block h-[0.7rem] w-[0.7rem] rounded-sm align-[-0.15em]"
                        />
                        <span
                          className="brand-link-text"
                          style={{ borderBottom: DOTTED, paddingBottom: 1 }}
                        >
                          {seg.text}
                        </span>
                      </a>
                    );
                  }
                  if (seg.kind === "inline") {
                    const media = seg.link.media;
                    return (
                      <a
                        key={si}
                        href={seg.link.href}
                        onClick={(e) => {
                          e.stopPropagation();
                          award(`click:${media ? mediaKey(media) : seg.link.href}`, CLICK_XP);
                          if (media && e.detail > 0) {
                            e.preventDefault();
                            inspectEnd(`${proofKind}:${mediaKey(media)}`);
                            emitPin({ media, href: seg.link.href, x: e.clientX, y: e.clientY });
                          }
                        }}
                        onPointerEnter={(e) => {
                          if (media && e.pointerType === "mouse") {
                            emitShow({ media, x: e.clientX, y: e.clientY });
                            inspectStart(`${proofKind}:${mediaKey(media)}`);
                          }
                        }}
                        onPointerMove={(e) => {
                          if (media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerLeave={(e) => {
                          if (media && e.pointerType === "mouse") {
                            emitHide();
                            inspectEnd(`${proofKind}:${mediaKey(media)}`);
                          }
                        }}
                        data-repel
                        className="wl-unit inline-block text-(--ink)/75 hover:text-(--ink)"
                        style={{
                          textDecoration: "none",
                          borderBottom: DOTTED,
                          paddingBottom: 1,
                        }}
                      >
                        {seg.text}
                      </a>
                    );
                  }
                  // plain
                  return <WiggleWords key={si} text={seg.text} />;
                })}
                {item.trailingIcons && item.trailingIcons.length > 0 && (
                  <span className="inline-flex items-center gap-2 ml-2 align-[-0.15em]">
                    {item.trailingIcons.map((icon) => {
                      const useSvg = icon.slug && hasBrandIcon(icon.slug);
                      return (
                        <a
                          key={icon.href}
                          href={icon.href}
                          onClick={(e) => e.stopPropagation()}
                          title={icon.name}
                          data-repel
                          className="inline-block text-(--ink)/55 hover:text-(--ink)"
                          style={{ transition: `transform 180ms ${EASE}, color 200ms, opacity 200ms` }}
                        >
                          {useSvg ? (
                            <BrandIcon slug={icon.slug!} size={14} title={icon.name} className="inline-block align-[-0.15em]" />
                          ) : icon.favicon ? (
                            <img
                              src={icon.favicon}
                              alt={icon.name}
                              width={11}
                              height={11}
                              className="h-[0.7rem] w-[0.7rem] rounded-sm opacity-70 hover:opacity-100 align-[-0.15em]"
                              style={{ filter: "grayscale(1)" }}
                            />
                          ) : null}
                        </a>
                      );
                    })}
                  </span>
                )}
                {item.trailingFavicons && item.trailingFavicons.length > 0 && (
                  <span className="inline-flex items-center gap-1 ml-1.5 align-[-0.15em]">
                    {item.trailingFavicons.map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        width={11}
                        height={11}
                        data-repel
                        className="inline-block h-[0.7rem] w-[0.7rem] rounded-sm opacity-70"
                        style={{ transition: `transform 180ms ${EASE}` }}
                      />
                    ))}
                  </span>
                )}
              </span>

              {expandable && (
                <div
                  className="work-detail ml-5"
                  style={{
                    maxHeight: isOpen ? 240 : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="pt-0.5 pb-1 leading-relaxed">
                    {item.expand && (
                      <p className="text-xs text-(--ink)/45">{item.expand}</p>
                    )}
                    {item.expandFavicons && item.expandFavicons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {item.expandFavicons.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            width={16}
                            height={16}
                            className="h-4 w-4 rounded-sm opacity-80"
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
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
