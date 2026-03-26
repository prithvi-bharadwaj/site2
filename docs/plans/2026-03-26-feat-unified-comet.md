---
title: Unified Comet Displacement (Shader-Only)
type: feat
status: active
date: 2026-03-26
---

# Unified Comet Displacement

## Problem

The Canvas 2D particle overlay is a separate system — its characters don't match
the WebGL ASCII effect (wrong charset, wrong density, wrong colors). It feels like
a disconnected layer, not part of the effect.

## Solution

Move ALL displacement into the WebGL shader using a **displacement texture**.
Each cell's offset is computed in JS (spring physics), written to a texture,
and read by the shader to shift cell positions. Displaced cells render the
SAME video-sampled ASCII characters — they just slide to new positions.

**Delete the Canvas 2D particle overlay entirely.**

## Architecture

```
JS (each frame):
  1. For cells near cursor → compute repel force
  2. Spring physics: velocity += force, position += velocity, damping
  3. Write (dx, dy) per cell into Float32Array
  4. Upload as displacement texture (gl.texImage2D)

Shader (fragment.glsl):
  1. For current pixel, find which cell it belongs to
  2. Sample displacement texture at that cell
  3. Offset the cell's sampling position by (dx, dy)
  4. Render the video-sampled ASCII character at the offset position
  5. Apply comet glow (brightness + density boost) as before
```

No second canvas. No separate particle system. One unified render.

## Vision

```
Before cursor arrives:       Cursor passes through:        After cursor leaves:

  @ # * + = - : .            @ #   *     = - : .          @ # * + = - : .
  = - : . @ # * +            =   -   : . @ # * +          = - : . @ # * +
  : . @ # * + = -       →    :   . @   # * + = -     →    : . @ # * + = -
  * + = - : . @ #            *   +   = - : . @ #          * + = - : . @ #
  @ # * + = - : .            @   # *   + = - : .          @ # * + = - : .

  (normal grid)              (cells pushed apart,          (spring back to
                              same chars, glowing)          home positions)
```

---

## Milestone 1: Displacement Texture System
> After this: Cells physically shift away from cursor within the main ASCII effect

### Phase 1: Remove Canvas 2D overlay, add displacement texture
Estimated: 2hr | Files: ~5

#### Tasks
- [ ] Delete `src/components/ParticleOverlay.tsx` and `src/lib/ascii-renderer/particles.ts`
- [ ] Create `src/lib/ascii-renderer/displacement.ts`:
  - Grid of cells matching ASCII layout (cols × rows)
  - Per-cell state: dx, dy, vx, vy (all start at 0)
  - `repel(pointerX, pointerY, radius, force)` — push cells away
  - `update(dt, spring, damping)` — spring physics toward home (0,0)
  - `writeTexture(data: Float32Array)` — pack dx,dy into RGBA
  - Must be fast: only iterate cells near cursor for repel
- [ ] Add displacement texture to renderer:
  - Create a texture (cols × rows), RGBA format
  - Upload displacement data each frame before draw
  - Bind to texture unit 2
- [ ] Update fragment shader:
  - Sample displacement texture at cell position
  - Offset the cell's pixel coordinates by displacement
  - Re-derive cellCenter and videoUV from offset position
  - Same character mapping, same colors — just shifted
- [ ] Wire into AsciiCanvas — remove ParticleOverlay from page.tsx
  Verify: Moving mouse pushes ASCII cells apart, cells spring back

**Test checkpoint:** Cells displace from cursor and spring back. They're the SAME characters from the video — matching charset, density, colors.
**Break point:** Safe to stop here.

---

## Milestone 2: Tune + Polish
> After this: Effect feels soft, premium, fluid

### Phase 2: Responsiveness + glow integration
Estimated: 1hr | Files: ~2

#### Tasks
- [ ] Make repel instant: apply force in same frame as pointer event (not next frame)
- [ ] Increase default repel force for snappier response
- [ ] Displaced cells get comet glow boost proportional to displacement magnitude
- [ ] Smooth the displacement field — neighboring cells should shift similarly (avoid jagged edges)
- [ ] Update dev panel: displacement params (repel force, spring, damping, repel radius)
- [ ] Save user's current config as new defaults
  Verify: Effect feels fluid and responsive, density matches base effect

**Final test:**
- [ ] Mouse displacement is instant and snappy
- [ ] Displaced characters match the underlying ASCII effect exactly
- [ ] Spring-back is smooth and damped
- [ ] Comet glow + displacement work together seamlessly
