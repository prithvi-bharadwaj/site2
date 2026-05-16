"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { emitShow, emitMove, emitHide, type HoverCardMedia } from "@/lib/hover-card-bus";

interface HoverLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "media"> {
  hoverMedia?: HoverCardMedia;
  children: ReactNode;
}

export function HoverLink({ hoverMedia, className, children, onPointerEnter, onPointerMove, onPointerLeave, ...rest }: HoverLinkProps) {
  const media = hoverMedia;
  const combinedClass = ["prose-link", className].filter(Boolean).join(" ");

  return (
    <a
      {...rest}
      className={combinedClass}
      onPointerEnter={(e) => {
        if (media && e.pointerType === "mouse") {
          emitShow({ media, x: e.clientX, y: e.clientY });
        }
        onPointerEnter?.(e);
      }}
      onPointerMove={(e) => {
        if (media && e.pointerType === "mouse") {
          emitMove({ x: e.clientX, y: e.clientY });
        }
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        if (media && e.pointerType === "mouse") {
          emitHide();
        }
        onPointerLeave?.(e);
      }}
    >
      {children}
    </a>
  );
}
