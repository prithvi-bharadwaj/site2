"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface BrandLink {
  name: string;
  href: string;
  favicon: string;
}

export interface LinkListItem {
  title: string;
  href?: string;
  favicon?: string;
  /** Favicons rendered inline after the title text (for sentences mentioning multiple brands). */
  trailingFavicons?: string[];
  /** Inline brand chips: matching tokens in `title` render as favicon + linked name. */
  brandLinks?: BrandLink[];
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
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTitleWithBrands(title: string, brands?: BrandLink[]): ReactNode {
  if (!brands || brands.length === 0) return title;
  const pattern = new RegExp(
    `(${brands.map((b) => escapeRegex(b.name)).join("|")})`,
    "gi"
  );
  const parts = title.split(pattern);
  return parts.map((part, i) => {
    const brand = brands.find(
      (b) => b.name.toLowerCase() === part.toLowerCase()
    );
    if (brand) {
      return (
        <a
          key={i}
          href={brand.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="brand-link inline-flex items-baseline gap-1"
        >
          <img
            src={brand.favicon}
            alt=""
            width={14}
            height={14}
            className="brand-link-favicon inline-block h-3.5 w-3.5 rounded-sm align-text-bottom"
          />
          <span className="brand-link-text">{part}</span>
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LinkList({ label, items, columns = 1, variant = "compact", pointer = false }: LinkListProps) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
      }}
    >
      {label && (
        <span className="text-[#131316]/35 text-xs uppercase tracking-widest block mb-6">
          {label}
        </span>
      )}
      <div
        className={`grid grid-cols-1 ${
          columns === 2 ? "sm:grid-cols-2" : ""
        } ${variant === "prose" ? "gap-x-12 gap-y-4" : "gap-x-12 gap-y-2"} text-sm`}
      >
        {items.map((item, i) => {
          const expandable =
            !!item.expand ||
            (item.links && item.links.length > 0) ||
            (item.expandFavicons && item.expandFavicons.length > 0);
          const isOpen = open === i;

          const titleNode = (
            <span
              className={`hover-underline text-[#131316]/60 group-hover:text-[#131316] transition-colors duration-200 inline ${
                variant === "prose" ? "leading-relaxed" : "leading-snug"
              }`}
            >
              {pointer && (
                <span className="text-[#131316]/30 mr-1.5">—</span>
              )}
              {item.favicon && (
                <img
                  src={item.favicon}
                  alt=""
                  className="h-3.5 w-3.5 rounded-sm opacity-70 group-hover:opacity-100 transition-opacity inline-block align-text-bottom mr-1.5"
                  width={14}
                  height={14}
                />
              )}
              {renderTitleWithBrands(item.title, item.brandLinks)}
              {item.trailingFavicons && item.trailingFavicons.length > 0 && (
                <span className="inline-flex items-center gap-1 ml-1.5 align-text-bottom">
                  {item.trailingFavicons.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-3.5 w-3.5 rounded-sm opacity-70 group-hover:opacity-100 transition-opacity inline-block"
                      width={14}
                      height={14}
                    />
                  ))}
                </span>
              )}
            </span>
          );

          const wrapperClass =
            variant === "prose"
              ? "group block leading-relaxed"
              : "group block leading-snug";

          return (
            <div key={item.title}>
              {expandable ? (
                <span
                  className={`${wrapperClass} cursor-pointer`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-[#131316]/20 tabular-nums ml-2">
                      {item.meta}
                    </span>
                  )}
                </span>
              ) : item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={wrapperClass}>
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-[#131316]/20 tabular-nums ml-2">
                      {item.meta}
                    </span>
                  )}
                </a>
              ) : (
                <span className={`${wrapperClass} cursor-default`}>
                  {titleNode}
                  {item.meta && (
                    <span className="text-[10px] text-[#131316]/20 tabular-nums ml-2">
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
                      <p className="text-xs text-[#131316]/45">{item.expand}</p>
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
                    {item.href && !item.expand && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#131316]/45 hover:text-[#131316]/80 underline underline-offset-2"
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
