---
title: Aurora Sparkle Overlay
type: feat
status: active
date: 2026-03-26
---

# Aurora Sparkle Overlay

## Vision

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser Viewport (layer stack)                         │
│                                                         │
│  z:0  ┌───────────────────────────────────────────┐     │
│       │  AsciiCanvas (WebGL)                      │     │
│       │  Video → ASCII chars via fragment shader   │     │
│       └───────────────────────────────────────────┘     │
│                          │                              │
│                          │ readPixels / offscreen       │
│                          ▼ luminance sampling           │
│  z:1  ┌───────────────────────────────────────────┐     │
│       │  ParticleOverlay (2D Canvas)              │     │
│       │  Physics-based char repulsion             │     │
│       └───────────────────────────────────────────┘     │
│                                                         │
│  z:2  ┌───────────────────────────────────────────┐     │
│       │  AuroraOverlay (2D Canvas)                │     │
│       │  ┌─────────┐  ┌──────────┐  ┌─────────┐  │     │
│       │  │ Curtain  │  │  Soft    │  │  Sharp  │  │     │
│       │  │ Waves    │  │  Glows   │  │ Twinkle │  │     │
│       │  │ (grad.)  │  │  (~20)   │  │ (~40)   │  │     │
│       │  └─────────┘  └──────────┘  └─────────┘  │     │
│       │       ▲ luminance data   ▲ pointer state  │     │
│       └───────────────────────────────────────────┘     │
│                                                         │
│  z:10 ┌───────────────────────────────────────────┐     │
│       │  BioOverlay (HTML/GSAP)                   │     │
│       └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### User Journey

1. Page loads → ASCII video plays, aurora sparkles fade in after ~1s delay
2. Soft glows drift slowly across the screen, pulsing with aurora colors
3. Sharp twinkles blink in and out at random positions, clustering in brighter video areas
4. Faint curtain waves undulate horizontally, tinting the background
5. User moves cursor → sparkles gently drift away, curtain ripples subtly
6. Bright areas of the video attract more sparkles, dark areas stay sparse
7. Overall effect: subtle, magical atmosphere that enhances without competing

### Final State

When complete, the site has a dreamy aurora atmosphere layered over the ASCII video. Faint curtain-like gradient waves sweep across the screen while sparse glowing orbs drift and tiny sparkles twinkle — all responding to video brightness and cursor movement. The effect is ambient and inspiring, never distracting from the bio content or ASCII art.

---

## Milestone 1: Ambient Sparkle System
> After this: You'll see soft glowing orbs and sharp twinkles floating over the ASCII video with aurora colors

### Phase 1: Aurora Particle Engine
Estimated: 45 min | Files: 2

#### Tasks
- [ ] Create aurora particle types — `src/lib/aurora/particles.ts` — Define `GlowParticle` (large, slow, blurred) and `TwinkleParticle` (small, fast fade-in/out) interfaces. Each has position, velocity, life, maxLife, size, color, opacity, and type.
  Verify: `npx tsc --noEmit`
- [ ] Build `AuroraSystem` class — `src/lib/aurora/particles.ts` — Pool of ~20 glows + ~40 twinkles. Spawn logic: random positions, slow velocities, aurora color palette (greens: #00ff87, #00ffc8; purples: #b388ff, #7c4dff; teals: #18ffff, #00e5ff). Particles respawn when life expires.
  Verify: `npx tsc --noEmit`
- [ ] Add update loop — `src/lib/aurora/particles.ts` — Drift particles, pulse glow sizes sinusoidally, fade twinkles in/out with eased opacity curves. Clamp to viewport bounds with wrap-around.
  Verify: `npx tsc --noEmit`

### Phase 2: Aurora Overlay Component
Estimated: 30 min | Files: 2

#### Tasks
- [ ] Create `AuroraOverlay` component — `src/components/AuroraOverlay.tsx` — 2D canvas at z-index 2. Initialize `AuroraSystem`, run animation loop. Render glows as radial gradients (large, blurred), twinkles as small filled circles with glow.
  Verify: `npm run dev` — see colored particles floating over ASCII video
- [ ] Wire into page — `src/app/page.tsx` — Add `<AuroraOverlay />` between ParticleOverlay and BioOverlay. Pass renderer prop for future pointer/luminance access.
  Verify: `npm run dev` — aurora sparkles visible on the page

**🧪 Test checkpoint:** Open the site. You should see ~20 soft colored orbs drifting slowly and ~40 tiny sparkles blinking in/out with aurora colors (green/purple/teal). They should float independently, no cursor interaction yet.
**☕ Break point:** Safe to stop here. Core visual effect is working. Run `/work` to continue.

---

## Milestone 2: Cursor Influence
> After this: Sparkles gently respond to your cursor — drifting away as you move

### Phase 3: Pointer Integration
Estimated: 20 min | Files: 2

#### Tasks
- [ ] Add cursor drift to `AuroraSystem` — `src/lib/aurora/particles.ts` — `applyPointerInfluence(px, py, opacity)` method. Particles within a radius gently accelerate away from cursor. Force scales with pointer opacity (fades when idle). Soft, not aggressive — much weaker than the particle repulsion system.
  Verify: `npx tsc --noEmit`
- [ ] Connect pointer state in overlay — `src/components/AuroraOverlay.tsx` — Read `renderer.getPointerState()` each frame, pass to `applyPointerInfluence`. Only apply when pointer opacity > 0.05.
  Verify: `npm run dev` — move cursor, sparkles gently drift away

**🧪 Test checkpoint:** Move your cursor around. Sparkles should subtly drift away — not snapping or flying, just a gentle push. When cursor stops, they resume normal drift.
**☕ Break point:** Safe to stop here. Interactive sparkles working. Run `/work` to continue.

---

## Milestone 3: Video Luminance Reactivity
> After this: Sparkles cluster in bright areas of the video, creating a living connection between layers

### Phase 4: Luminance Sampling
Estimated: 30 min | Files: 2

#### Tasks
- [ ] Expose luminance data from renderer — `src/lib/ascii-renderer/renderer.ts` — Add `sampleLuminance(): Uint8Array` method that uses `gl.readPixels` on a downscaled region (e.g. 32×32 grid). Cache and throttle to ~10fps to avoid GPU stalls. Return normalized luminance grid.
  Verify: `npx tsc --noEmit`
- [ ] Update renderer interface — `src/lib/ascii-renderer/renderer.ts` — Add `sampleLuminance` to the returned object.
  Verify: `npx tsc --noEmit`

### Phase 5: Luminance-Driven Spawning
Estimated: 30 min | Files: 1

#### Tasks
- [ ] Add luminance-weighted spawn — `src/lib/aurora/particles.ts` — When respawning a particle, bias position toward bright cells in the luminance grid. Use luminance as probability weight. Twinkles respond more strongly than glows (twinkles cluster in bright areas, glows are more evenly spread).
  Verify: `npm run dev` — sparkles should visibly prefer bright areas of the video
- [ ] Add luminance-based intensity — `src/lib/aurora/particles.ts` — Particles in bright areas get slightly boosted opacity/size. Particles in dark areas are dimmer and smaller. Subtle multiplier, not dramatic.
  Verify: `npm run dev` — compare sparkle density in bright vs dark video regions

**🧪 Test checkpoint:** Watch the sparkles as the video plays. They should noticeably cluster where the video is bright. Dark areas should feel sparser. The effect should feel organic, not grid-like.
**☕ Break point:** Safe to stop here. Video-reactive sparkles working. Run `/work` to continue.

---

## Milestone 4: Aurora Curtain Waves
> After this: Faint aurora-like curtain gradients sweep across the screen, completing the full effect

### Phase 6: Curtain Wave System
Estimated: 40 min | Files: 2

#### Tasks
- [ ] Create curtain renderer — `src/lib/aurora/curtain.ts` — 2-3 overlapping sine waves with different frequencies, speeds, and aurora colors. Each wave is a horizontal gradient band that undulates vertically. Very low opacity (0.03-0.08) so it tints rather than obscures. Colors shift slowly over time.
  Verify: `npx tsc --noEmit`
- [ ] Integrate curtain into AuroraOverlay — `src/components/AuroraOverlay.tsx` — Render curtain waves first (behind particles) using `globalCompositeOperation: "screen"` for additive blending. Curtain reacts to luminance grid — brighter areas get slightly more vivid curtain color.
  Verify: `npm run dev` — faint colored bands sweep across the screen
- [ ] Add cursor ripple to curtain — `src/lib/aurora/curtain.ts` — Cursor position adds a subtle phase offset to nearby wave segments, creating a gentle ripple where you move.
  Verify: `npm run dev` — move cursor, see faint ripple in the curtain waves

### Phase 7: Polish & Performance
Estimated: 20 min | Files: 3

#### Tasks
- [ ] Tune particle counts for mobile — `src/components/AuroraOverlay.tsx` — Reduce to ~10 glows + ~20 twinkles on mobile. Simplify curtain to 1 wave. Skip luminance sampling on low-end devices.
  Verify: `npm run dev` with mobile viewport — smooth 60fps
- [ ] Add fade-in on load — `src/components/AuroraOverlay.tsx` — Aurora effect fades in over 2s after a 1s delay, so it doesn't compete with the page load.
  Verify: `npm run dev` — refresh page, aurora appears gradually
- [ ] Add aurora config to AsciiConfig — `src/lib/ascii-renderer/config.ts` — Add `auroraEnabled`, `auroraIntensity` (0-100), `auroraSpeed` (0-100) to config. Wire to DevPanel for tuning.
  Verify: `npm run dev` — toggle aurora in dev panel

**🧪 Final test:**
- [ ] Desktop: 60fps with all effects active (check DevTools Performance tab)
- [ ] Mobile: 60fps with reduced particles
- [ ] Curtain waves visible but never distracting (opacity < 0.1)
- [ ] Sparkles cluster toward bright video areas
- [ ] Cursor gently pushes sparkles and ripples the curtain
- [ ] Aurora fades in smoothly on page load
- [ ] DevPanel can toggle aurora on/off and adjust intensity

---

## Open Questions
- Exact particle counts may need tuning based on visual feel — DevPanel controls will help
- `gl.readPixels` can be a performance bottleneck — may need to use a separate smaller framebuffer or offscreen canvas if throttling to 10fps isn't enough
- Curtain opacity is the hardest to get right — too much looks cheap, too little is invisible. Start at 0.04 and tune up.

## References
- Existing particle system: `src/lib/ascii-renderer/particles.ts`, `src/components/ParticleOverlay.tsx`
- Renderer API: `src/lib/ascii-renderer/renderer.ts:253` (returned interface)
- Layer stack: WebGL(z:0) → Particles(z:1) → Aurora(z:2) → Bio(z:10)
- Aurora color palette: greens (#00ff87, #00ffc8), purples (#b388ff, #7c4dff), teals (#18ffff, #00e5ff)
