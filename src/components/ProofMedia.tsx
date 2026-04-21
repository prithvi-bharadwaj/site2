"use client";

export type ProofKind = "image" | "video";

export interface ProofProps {
  src: string;
  w: number;
  h: number;
  alt?: string;
  kind?: ProofKind;
}

// Inline proof artifact shown below a trigger's rewritten text.
// Scales down on narrow viewports; preserves aspect ratio via w/h.
export function ProofMedia({ src, w, h, alt = "", kind = "image" }: ProofProps) {
  const style: React.CSSProperties = {
    display: "block",
    width: "100%",
    maxWidth: w,
    aspectRatio: `${w} / ${h}`,
  };

  if (kind === "video") {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        aria-label={alt}
        style={style}
      />
    );
  }

  return <img src={src} alt={alt} loading="lazy" style={style} />;
}
