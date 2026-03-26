---
title: Comet Trail Pointer Effect
type: feat
status: active
date: 2026-03-26
---

# Comet Trail Pointer Effect

## Vision

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: WebGL ASCII Canvas (existing)              │
│                                                      │
│  Normal ASCII ···  @@##**  ···  Normal ASCII         │
│                   ╱      ╲                           │
│              @@@@##BRIGHT##@@@@  ← shader glow       │
│             ╱    DENSE CORE    ╲   (coverage 100%,   │
│            ╱   near cursor      ╲   white boost)     │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Layer 2: Canvas 2D Particle Overlay (NEW)           │
│                                                      │
│        #  *         ← displaced chars, glowing       │
│       @     +       ← repelled from cursor           │
│      =   [cursor]   =                                │
│       #     @       ← spring back when cursor leaves │
│        *  +         ← glow fades as they settle      │
│                                                      │
└──────────────────────────────────────────────────────┘

Trail: brightness lingers along cursor path, configurable decay
```

**User Journey:**
1. Cursor moves → ASCII chars near it glow bright white, coverage fills to 100%
2. Characters on the particle overlay get repelled outward, glowing while displaced
3. Cursor moves away → glow trail fades (configurable 0.1–3s)
4. Displaced characters spring smoothly back to home positions, glow fading as they settle

---

## Milestone 1: Shader Comet Glow
> After this: Moving the cursor creates a bright, dense glow in the ASCII effect

### Phase 1: Replace pointer modes with comet glow
Estimated: 1hr | Files: ~3

#### Tasks
- [ ] Remove old reveal/ripple/trail uniforms from fragment shader
  Verify: Shader compiles, no errors
- [ ] Add comet uniforms: `uCometPos`, `uCometRadius`, `uCometGlow`, `uCometDensityBoost`, `uCometTrail[16]`, `uCometTrailAlpha[16]`, `uCometTrailCount`
  Verify: Uniforms compile and link
- [ ] Implement comet glow in fragment shader: near cursor, push char luminance toward 1.0, force coverage to 100%, multiply brightness. Trail points do the same with fading alpha
  Verify: Moving mouse creates bright glow in ASCII effect
- [ ] Update config: remove `interactionMode`, add `cometRadius`, `cometGlow`, `cometDensityBoost`, `cometTrailDecay`
  Verify: Config types clean, build passes
- [ ] Wire new uniforms in renderer.ts
  Verify: Dev panel sliders control glow radius and intensity

**Test checkpoint:** Mouse creates a bright comet glow that fades along the trail path.
**Break point:** Safe to stop here.

---

## Milestone 2: Particle Displacement Overlay
> After this: Characters physically displace from cursor and spring back

### Phase 2: Particle system
Estimated: 1.5hr | Files: 1

#### Tasks
- [ ] Create `src/lib/ascii-renderer/particles.ts` — particle system class
  - Grid of particles, each with: homeX, homeY, x, y, vx, vy, char, brightness
  - `repel(pointerX, pointerY, radius, force)` — push particles away from pointer
  - `update(dt)` — spring physics: acceleration toward home, velocity damping
  - `getParticles()` — return array for rendering
  Verify: Unit-testable, instantiates without errors

### Phase 3: Canvas 2D overlay component
Estimated: 1.5hr | Files: 2

#### Tasks
- [ ] Create `src/components/ParticleOverlay.tsx` — second canvas, positioned over WebGL canvas
  - On mount: sample grid positions matching the ASCII cell grid
  - Each frame: update particle physics, render displaced chars with glow
  - Characters drawn with `fillText`, alpha/brightness based on displacement magnitude
  Verify: Overlay canvas renders, positioned correctly over WebGL canvas
- [ ] Wire pointer state into particle system — share pointer handler between WebGL canvas and particle overlay
  Verify: Moving mouse repels nearby characters
- [ ] Add spring-back: particles smoothly return to home when cursor leaves
  Verify: Characters spring back with fluid, damped motion
- [ ] Add displacement glow: displaced chars brighten proportionally, fade as they settle
  Verify: Pushed chars glow bright, dim as they spring home

**Test checkpoint:** Characters physically displace from cursor, glow while displaced, spring smoothly back. Looks soft and premium.
**Break point:** Safe to stop here.

---

## Milestone 3: Polish + Dev Panel
> After this: Full comet effect, tunable via dev panel

### Phase 4: Integration + controls
Estimated: 45min | Files: ~3

#### Tasks
- [ ] Add comet params to dev panel: glow radius, glow intensity, density boost, trail decay, spring stiffness, damping, repel force
  Verify: All sliders update effect in real-time
- [ ] Clean up old reveal/ripple code from config, renderer, pointer
  Verify: No dead code, build passes
- [ ] Performance check: ensure particle overlay doesn't drop frames on mobile
  Verify: Smooth 60fps on desktop, 30fps+ on mobile devtools throttle

**Final test:**
- [ ] Desktop: comet glow + displacement + spring-back all working smoothly
- [ ] Mobile: touch triggers same comet effect, performance acceptable
- [ ] Dev panel: all comet params adjustable

---

## References
- Brainstorm: docs/brainstorms/2026-03-26-comet-pointer.md
- Spring physics: `F = -k * displacement - damping * velocity`
- Particle rendering: Canvas 2D `fillText` with `globalAlpha` for glow
