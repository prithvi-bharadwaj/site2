"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandLink, InlineLink, LinkListItem } from "./LinkList";
import { BrandIcon, hasBrandIcon } from "./BrandIcon";
import { emitShow, emitMove, emitHide } from "@/lib/hover-card-bus";

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const DOTTED = "1px dotted rgba(19, 19, 22, 0.35)";

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
  return title
    .split(regex)
    .filter((part) => part.length > 0)
    .map<Segment>((part) => {
      const hit = patterns.find((p) => p.match.toLowerCase() === part.toLowerCase());
      if (!hit) return { kind: "plain", text: part };
      if (hit.kind === "brand") return { kind: "brand", text: part, brand: hit.payload as BrandLink };
      return { kind: "inline", text: part, link: hit.payload as InlineLink };
    });
}

interface PreviouslyListProps {
  label: string;
  items: LinkListItem[];
}

/**
 * Continuous-paragraph list. Same font as the bio. Tight line-spacing.
 * Only items with expand content get hover affordance + cursor pointer.
 * Words repel from cursor (same effect as InlineDialogue).
 */
export function PreviouslyList({ label, items }: PreviouslyListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const R = 70;
    const F = 5;
    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) {
        const wr = w.getBoundingClientRect();
        const dx = wr.left - rect.left + wr.width / 2 - mx;
        const dy = wr.top - rect.top + wr.height / 2 - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0) {
          const t = 1 - d / R;
          w.style.transform = `translate(${(dx / d) * t * t * F}px, ${(dy / d) * t * t * F}px)`;
        } else if (w.style.transform) {
          w.style.transform = "";
        }
      }
    }
    function onLeave() {
      if (!el) return;
      for (const w of el.querySelectorAll<HTMLElement>("[data-repel]")) {
        w.style.transform = "";
      }
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="text-sm text-[#131316]/60 leading-relaxed">
      <span className="text-[#131316]/35 text-xs uppercase tracking-widest block mb-6">
        {label}
      </span>
      <ul className="list-none p-0 m-0">
        {items.map((item, i) => {
          const expandable =
            !!item.expand ||
            (item.links && item.links.length > 0) ||
            (item.expandFavicons && item.expandFavicons.length > 0);
          const isOpen = open === i;
          const segments = tokenize(item.title, item.brandLinks, item.inlineLinks);

          return (
            <li key={i} className="m-0 p-0">
              <span
                onClick={expandable ? () => setOpen(isOpen ? null : i) : undefined}
                className={expandable ? "group cursor-pointer" : ""}
                style={{ display: "inline" }}
              >
                <span
                  data-repel
                  className="inline-block text-[#131316]/30 mr-2"
                  style={{ transition: `transform 180ms ${EASE}` }}
                >
                  ·
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
                        target="_blank"
                        rel="noopener noreferrer"
                        data-repel
                        onClick={(e) => e.stopPropagation()}
                        onPointerEnter={(e) => {
                          if (media && e.pointerType === "mouse") emitShow({ media, x: e.clientX, y: e.clientY });
                        }}
                        onPointerMove={(e) => {
                          if (media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerLeave={(e) => {
                          if (media && e.pointerType === "mouse") emitHide();
                        }}
                        className="brand-link inline-flex items-baseline gap-1 align-baseline"
                        style={{ transition: `transform 180ms ${EASE}` }}
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
                    const segWords = seg.text.split(/(\s+)/);
                    const media = seg.link.media;
                    return (
                      <a
                        key={si}
                        href={seg.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        onPointerEnter={(e) => {
                          if (media && e.pointerType === "mouse") emitShow({ media, x: e.clientX, y: e.clientY });
                        }}
                        onPointerMove={(e) => {
                          if (media && e.pointerType === "mouse") emitMove({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerLeave={(e) => {
                          if (media && e.pointerType === "mouse") emitHide();
                        }}
                        className="inline-baseline text-[#131316]/75 hover:text-[#131316]"
                        style={{ textDecoration: "none" }}
                      >
                        {segWords.map((w, wi) => {
                          if (/^\s+$/.test(w)) return <span key={wi}>{w}</span>;
                          return (
                            <span
                              key={wi}
                              data-repel
                              className="inline-block"
                              style={{
                                transition: `transform 180ms ${EASE}, color 200ms`,
                                borderBottom: DOTTED,
                                paddingBottom: 1,
                              }}
                            >
                              {w}
                            </span>
                          );
                        })}
                      </a>
                    );
                  }
                  // plain
                  const segWords = seg.text.split(/(\s+)/);
                  return segWords.map((w, wi) => {
                    if (/^\s+$/.test(w)) return <span key={`${si}-${wi}`}>{w}</span>;
                    return (
                      <span
                        key={`${si}-${wi}`}
                        data-repel
                        className="inline-block"
                        style={{ transition: `transform 180ms ${EASE}, color 200ms` }}
                      >
                        {w}
                      </span>
                    );
                  });
                })}
                {item.trailingIcons && item.trailingIcons.length > 0 && (
                  <span className="inline-flex items-center gap-2 ml-2 align-[-0.15em]">
                    {item.trailingIcons.map((icon) => {
                      const useSvg = icon.slug && hasBrandIcon(icon.slug);
                      return (
                        <a
                          key={icon.href}
                          href={icon.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={icon.name}
                          data-repel
                          className="inline-block text-[#131316]/55 hover:text-[#131316]"
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
                      <p className="text-xs text-[#131316]/45">{item.expand}</p>
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
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#131316]/45 hover:text-[#131316]/80 underline underline-offset-2"
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
