# TODOS

## P2: Particle-morph project card expand/collapse
**What:** Click a project card to explode its particle slice outward, reform as expanded detail view with full description, stack, links. Escape/click-outside to collapse.
**Why:** V1 uses simple link overlays. Morph expand makes project interaction consistent with particle-only visual.
**Effort:** L (human) / M (CC ~1.5 hours)
**Depends on:** Core particle engine shipped (steps 1-6 of design doc)
**Context:** Design doc descoped this to v2 stretch goal. Requires hit testing, expand/collapse state machine, and accessible focus trap within the expanded view. The particle slice for the clicked card would morph to new target points (larger text layout), while other regions' particles stay in place.

## P3: Writing section as particle text
**What:** Render blog entries as particle text with scroll-driven reading. Each entry morphs in as you scroll to it.
**Why:** Currently excluded because long text consumes too many particles. With multiline textToPoints (in v1 scope), this becomes feasible by dedicating a larger particle pool or lazy-loading regions.
**Effort:** M (human) / S (CC ~30 min)
**Depends on:** Multiline textToPoints function, proven mobile performance at current particle count
**Context:** Particle budget would need to roughly double for long-form text. Performance on mobile is the key risk. Consider lazy-loading regions (only allocate particles for regions near the viewport).

## P3: Publish particle engine as npm package
**What:** Extract the WebGL instanced quad renderer + Float32Array physics engine as `@prithvi/particle-engine` npm package.
**Why:** The engine solves a general problem (particle text/image rendering with physics). Portfolio piece + community contribution.
**Effort:** M (human) / S (CC ~30 min to extract + publish)
**Depends on:** Core engine stable and API finalized
**Context:** Would need to decouple from Next.js-specific patterns, add a vanilla JS entry point, write README with examples, set up npm publish pipeline.
