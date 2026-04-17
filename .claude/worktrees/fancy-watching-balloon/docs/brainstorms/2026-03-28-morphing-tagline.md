---
title: Morphing Particle Tagline
date: 2026-03-28
status: complete
chosen_approach: Extensible particle text system, starting with morphing tagline
---

# Morphing Particle Tagline

## What We're Building

A particle-based text animation on the homepage where the tagline words ("Developer", "Creator", "Explorer") morph into each other via bezier curve paths — inspired by [this p5.js haiku sketch](https://p5js.org/sketches/2690405/). Text is converted to point arrays using `textToPoints()`, and particles flow along smooth curves from one word's shape to the next in a continuous loop.

The particle system should be architected as a reusable component so it can later be applied to other text elements (name, nav, headings) across the site.

## Why This Approach

- The site's visual design feels too plain — the homepage hero needs more punch
- Prithvi's identity is creative coder — the site should demonstrate that
- The p5.js haiku sketch's text-to-particle morphing resonated as a reference
- Starting with one focused element (tagline) keeps scope tight while building toward a larger vision where all text on the site could be particle-driven

## Key Decisions

- **Tagline only (for now):** Ship one polished interaction rather than spreading thin across hero + transitions + texture
- **Extensible architecture:** Build the particle text system as a reusable module, not a one-off — so it can be applied to other elements later
- **Bezier morphing:** Particles travel along curved paths between word states (not linear interpolation) for organic, flowing feel
- **Canvas-based:** Use HTML canvas (p5.js or raw canvas) alongside the existing React/Next.js setup

## Alternatives Considered

### A: Ambient Canvas Layer
- Pros: Cohesive feel across all pages, unified living background
- Cons: Broader scope, harder to ship incrementally
- Why not: User wants to focus on one strong element first

### B: Per-Section Micro-Interactions
- Pros: Quick wins, low risk, shippable incrementally
- Cons: Less cohesive, might feel "added on"
- Why not: Less exciting — doesn't capture the generative/creative-coder identity

### C: Shader-Driven Aesthetic
- Pros: Maximum visual impact, showcases WebGL skills
- Cons: Heaviest lift, WebGL fallback needed, mobile perf risk
- Why not: Overkill for the current scope

## Open Questions

None — scope is clear. Build the morphing tagline with a reusable particle text system.
