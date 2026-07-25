"use client";

import { forwardRef, type CSSProperties } from "react";
import type { CookieParticle } from "@/lib/cookie-physics";

export type PetMood =
  | "sad"
  | "tracking"
  | "open"
  | "chew"
  | "happy"
  | "bonked"
  | "blush"
  | "alert"
  | "drool"
  | "startle"
  | "squash"
  | "lick";

// Sprite renderer over public/images/crumb-sprites.png (3 × 4 atlas, one pose
// per mood). The outline sheet is a currentColor mask layered on a --bg
// silhouette mask so cookies never show through the body in either theme.
export const SpritePet = forwardRef<HTMLDivElement, { mood: PetMood; onTap: () => void }>(
  function SpritePet({ mood, onTap }, ref) {
    return (
      <div ref={ref} className="crumb-pet" data-mood={mood} onClick={onTap} aria-hidden="true">
        <div className="crumb-pet-sprite" />
      </div>
    );
  },
);

export function CookieParticleView({
  particle,
  register,
}: {
  particle: CookieParticle;
  register: (id: number, node: HTMLDivElement | null) => void;
}) {
  const dotCount = 3 + (particle.id % 3);
  return (
    <div ref={(node) => register(particle.id, node)} className="crumb-particle" aria-hidden="true">
      <span className="crumb-particle-letter">{particle.char}</span>
      <span className="crumb-particle-cookie">
        {Array.from({ length: dotCount }, (_, dot) => (
          <i key={dot} style={{ "--dot": dot } as CSSProperties} />
        ))}
      </span>
    </div>
  );
}
