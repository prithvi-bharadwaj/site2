---
title: Morphing Particle Tagline
type: feat
status: active
date: 2026-03-28
---

# Morphing Particle Tagline

## Vision

```
┌─────────────────────────────────────────────────────┐
│  Homepage                                            │
│                                                      │
│  <ParticleText words={[...]} />                      │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │ textToPoints  │───▶│  Fixed Particle Pool      │  │
│  │ (offscreen    │    │  (~800 particles)         │  │
│  │  canvas +     │    │  {x, y, target, control}  │  │
│  │  getImageData)│    └───────────┬───────────────┘  │
│  └──────────────┘                │                   │
│                       ┌──────────▼────────────┐      │
│                       │  Quadratic Bezier     │      │
│                       │  Morph Loop (rAF)     │      │
│                       └──────────┬────────────┘      │
│                       ┌──────────▼────────────┐      │
│                       │  Batched Canvas Draw  │      │
│                       └───────────────────────┘      │
└─────────────────────────────────────────────────────┘

Reusable engine: src/lib/particle-text.ts
React component: src/components/ParticleText.tsx
```

**User journey:**
1. Page loads → canvas mounts, "Developer" sampled to ~800 particles
2. Particles fade in from scattered positions, settle into word shape
3. After ~2.5s pause → particles flow along bezier curves into "Creator"
4. After ~2.5s pause → morph into "Explorer"
5. Loop: Explorer → Developer → Creator → ...
6. Reduced motion → static text with CSS cross-fade fallback

**Done state:** The homepage tagline is a living particle animation morphing between "Developer", "Creator", "Explorer" via organic bezier curves. Reusable engine in `src/lib/particle-text.ts`. Falls back to static text for reduced motion. Smooth on mobile.

---

## Milestone 1: Particle Engine — text rendered as particles on canvas
> After this: You can see "Developer" rendered as a field of ~800 dots on the homepage canvas

### Phase 1: Core engine (`src/lib/particle-text.ts`)
Estimated: 45 min | Files: 1

#### Tasks
- [ ] Create `textToPoints(text, font, fontSize, targetCount)` — renders text to offscreen canvas, samples pixels via `getImageData`, returns `Point[]` with dynamic step to hit targetCount (~800)
  Verify: unit-testable pure function, log output length
- [ ] Create `createPool(points, canvasWidth, canvasHeight)` — initializes particle array with current positions (random scatter) and target positions (from points). Each particle: `{ x, y, targetX, targetY, cpX, cpY, originX, originY }`
  Verify: returns array of correct length with valid coordinates
- [ ] Create `draw(ctx, particles, particleSize)` — batched canvas rendering using single `beginPath()` + `arc()` loop + `fill()` for all particles
  Verify: visually confirm dots render on canvas

### Phase 2: React component (`src/components/ParticleText.tsx`)
Estimated: 30 min | Files: 1

#### Tasks
- [ ] Create `ParticleText` component — props: `words: string[]`, `fontSize`, `className`. Sets up canvas with proper DPR handling (capped at 2), refs for particles and ctx
  Verify: `npm run build` passes, component renders a canvas element
- [ ] Add rAF loop — initialize particles from first word, draw each frame. Use `useRef` for all mutable state (particles, raf ID, ctx). Cleanup on unmount
  Verify: "Developer" visible as static particle dots on homepage
- [ ] Add `useReducedMotion` hook — listens for `prefers-reduced-motion` changes. When active, render words as plain `<span>` instead of canvas
  Verify: toggle reduced motion in OS settings, see text fallback

**🧪 Test checkpoint:** Homepage shows "Developer" as a cloud of ~800 white dots on the dark background. Reduced motion shows plain text.
**☕ Break point:** Safe to stop here. The engine works, particles render. Run `/work` to continue from Phase 3.

---

## Milestone 2: Bezier Morphing — particles flow between words
> After this: Full morphing animation loops through "Developer" → "Creator" → "Explorer"

### Phase 3: Morph logic
Estimated: 45 min | Files: 1 (particle-text.ts)

#### Tasks
- [ ] Add `morphTo(particles, newPoints)` — for each particle, set new target from `newPoints`, compute random quadratic bezier control point offset perpendicular to the travel line. Spread factor: `~0.5 * distance`
  Verify: log control points, confirm they're offset from the direct path
- [ ] Add `update(particles, t)` — for each particle, compute position via quadratic bezier: `P = (1-t)²·origin + 2(1-t)t·control + t²·target`. Apply easing to `t` (ease-in-out cubic)
  Verify: log positions at t=0, t=0.5, t=1 — confirm curved paths

### Phase 4: Animation sequencing
Estimated: 30 min | Files: 1 (ParticleText.tsx)

#### Tasks
- [ ] Add word cycling — state machine: `idle` (show current word for ~2.5s) → `morphing` (advance t from 0→1 over ~1.2s) → `idle` (next word). Cycle through `words` array, loop back to index 0
  Verify: visually confirm words morph in sequence
- [ ] Add initial scatter-in — on first render, particles start at random positions and morph into the first word shape (reuse morphTo logic)
  Verify: page load shows particles assembling from chaos into "Developer"
- [ ] Tune timing and easing — adjust pause duration, morph duration, bezier spread, and particle size until it feels organic. Start with: pause 2.5s, morph 1.2s, particle radius 1.5px, spread 0.5
  Verify: animation feels smooth and intentional, not jittery or mechanical

**🧪 Test checkpoint:** Full loop visible: particles scatter in → "Developer" (pause) → morph to "Creator" (pause) → morph to "Explorer" (pause) → loop. Curves feel organic.
**☕ Break point:** Safe to stop here. Core feature is complete.

---

## Milestone 3: Polish — mobile, integration, cleanup
> After this: Feature is production-ready across devices

### Phase 5: Mobile & performance
Estimated: 30 min | Files: 2 (ParticleText.tsx, particle-text.ts)

#### Tasks
- [ ] Add responsive particle count — detect viewport width, use ~400-500 particles on mobile (<768px) via larger step in `textToPoints`. Use `ResizeObserver` to re-sample on resize
  Verify: resize browser to mobile width, confirm fewer particles + smooth fps
- [ ] Add canvas sizing — canvas should fill its container width, compute height from fontSize. Handle resize gracefully (re-sample text, re-initialize pool)
  Verify: resize browser, canvas adapts without glitching

### Phase 6: Homepage integration
Estimated: 20 min | Files: 1 (page.tsx)

#### Tasks
- [ ] Replace static tagline text in `page.tsx` with `<ParticleText words={["Developer", "Creator", "Explorer"]} />`. Ensure it sits correctly in the centered layout, matches the existing text position
  Verify: `npm run build` passes, homepage looks correct
- [ ] Verify GSAP stagger still works — the ParticleText component should have `data-stagger` for entrance animation coordination, or handle its own fade-in
  Verify: page load animation sequence is smooth, no conflicts

**🧪 Final test:**
- [ ] Desktop: particles morph smoothly at 60fps
- [ ] Mobile (or narrow viewport): fewer particles, still smooth
- [ ] Reduced motion: plain text fallback, readable
- [ ] `npm run build` passes with no errors
- [ ] No console.log statements in committed code

---

## Open Questions
None — scope and approach are clear.

## References
- Existing pattern: `src/lib/ascii-dissolve.ts` (offscreen canvas, pixel sampling, rAF loop)
- Existing component: `src/components/AsciiDissolve.tsx` (canvas setup, pointer tracking, reduced motion)
- Inspiration: [p5.js haiku sketch](https://p5js.org/sketches/2690405/) (bezier text morphing)
- Brainstorm: `docs/brainstorms/2026-03-28-morphing-tagline.md`
