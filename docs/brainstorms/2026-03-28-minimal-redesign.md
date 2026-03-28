---
title: Minimal Homepage Redesign
date: 2026-03-28
status: complete
chosen_approach: Clean Sweep
---

# Minimal Homepage Redesign

## What We're Building
Strip the site down from a full-screen WebGL ASCII video experience to a minimal, centered portfolio homepage inspired by soulwire.co.uk. Two images (logo top-left, flower footer) get a dissolve-to-ASCII hover effect — that's the only creative coding touch. Everything else is clean typography on a dark textured background.

## Why This Approach
The existing ASCII/video/aurora pipeline is impressive but overwhelming as a homepage. A minimal layout lets the content (name, bio, project links) breathe. The ASCII hover effect preserves creative identity without dominating the experience. Building a lightweight dissolve effect from scratch is simpler than repurposing the full-screen WebGL renderer.

## Key Decisions
- **Clean sweep over selective reuse**: The existing renderer is built for full-screen video conversion — overkill for two image hovers. Purpose-built canvas effect will be lighter and simpler.
- **Dark background with subtle texture**: CSS grain/noise, no video or aurora. Terminal aesthetic maintained.
- **Centered layout with inline project links**: Name, bio, then links to Projects/Games/Work (pages to be defined later).
- **ASCII dissolve on hover**: Images progressively break apart into ASCII characters on hover, reform on leave.
- **Keep routing structure**: Sub-pages remain but content will be redefined later.

## Alternatives Considered

### Selective Reuse (Approach B)
- Pros: Leverages existing sophisticated shader pipeline
- Cons: Over-engineered for two small hover effects, harder to maintain
- Why not: Same visual result with more complexity

## What Gets Deleted
- `src/lib/ascii-renderer/` (WebGL renderer, shaders, glyph atlas, displacement)
- `src/lib/aurora/` (particles, curtain)
- `src/components/ParticleOverlay.tsx`
- `src/components/AsciiCanvas.tsx`
- `src/components/AuroraOverlay.tsx`
- `src/components/DevPanel.tsx`
- `src/components/BioOverlay.tsx`
- `public/video/` (bg-desktop.mp4, bg-mobile.mp4)
- GSAP dependency (evaluate if still needed)
- lil-gui dependency

## What Gets Built
- Minimal centered homepage component
- CSS grain/noise background texture
- Lightweight canvas-based ASCII dissolve hover effect (reusable component)
- Logo image placement (top-left)
- Flower image placement (footer)

## Open Questions
None — all resolved during brainstorm.
