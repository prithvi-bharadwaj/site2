# Dual-Layer ASCII Rendering — Implementation Plan

**Branch**: `roam-prithvi/dual-layer-ascii`
**Date**: 2026-03-26
**Status**: ready

## Architecture

```
                    ┌─────────────────────────┐
                    │      AsciiCanvas.tsx     │
                    │  (React wrapper, video)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   createAsciiRenderer()  │
                    │                          │
                    │  ┌─────────┐ ┌────────┐ │
                    │  │ Layer 0 │ │Layer 1 │ │
                    │  │ (dark)  │ │(light) │ │
                    │  │         │ │        │ │
                    │  │ atlas₀  │ │atlas₁  │ │
                    │  │ config₀ │ │config₁ │ │
                    │  └────┬────┘ └───┬────┘ │
                    │       │          │       │
                    │  ┌────▼──────────▼────┐  │
                    │  │  Fragment Shader    │  │
                    │  │  (dual-layer pass)  │  │
                    │  │  + color overlay    │  │
                    │  │  + displacement     │  │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
```

**Approach**: Single shader pass that samples both glyph atlases. The shader receives two sets of uniforms (one per layer) and composites both layers in one draw call. This avoids multi-pass overhead and framebuffer management.

---

## Phase 1: Config & Type System
**Goal**: Define dual-layer config types without breaking any existing rendering.

### Files to change:
- `src/lib/ascii-renderer/config.ts`

### Tasks:
1. **Extract `LayerConfig` interface** from `AsciiConfig` — pull out per-layer fields:
   - Characters: `charPreset`, `customChars`, `fontSize`, `charOpacity`, `renderMode`, `blendMode`, `invertMapping`, `dotGrid`
   - Intensity: `coverage`, `edgeEmphasis`, `density`, `brightness`, `contrast`
   - Animation: `animated`, `animSpeed`, `animIntensity`, `animRandomness`
   - Color overlay: `colorOverlay`, `colorOpacity`, `colorBlend`

2. **Add `particleMode` field** to `AsciiConfig`: `"repel" | "attract"` (default: `"repel"`)

3. **Restructure `AsciiConfig`** to contain:
   ```typescript
   interface AsciiConfig {
     layers: [LayerConfig, LayerConfig];  // [dark-spot, light-spot]
     // Shared fields stay at top level:
     videoAnchorX, videoAnchorY,
     bgMode, bgBlur, bgOpacity,
     cometRadius, cometGlow, cometTrailDecay, cometFadeSpeed, trailLength,
     particleRepelForce, particleSpring, particleDamping, particleMode,
     aurora fields...
   }
   ```

4. **Migrate `DESKTOP_CONFIG` and `MOBILE_CONFIG`** to new shape. Layer 0 (dark) gets current values. Layer 1 (light) gets sensible defaults (e.g., lower opacity, different charPreset).

5. **Remove `cometDensityBoost`** from config (pointer shouldn't boost coverage — see Phase 4).

### Milestone: TypeScript compiles. Existing configs migrate to new shape. No rendering changes yet.

---

## Phase 2: Dual Glyph Atlas & Renderer Plumbing
**Goal**: Renderer manages two glyph atlases and passes dual-layer uniforms to the shader.

### Files to change:
- `src/lib/ascii-renderer/renderer.ts`
- `src/lib/ascii-renderer/glyph-atlas.ts` (minor — may need to support multiple instances)

### Tasks:
1. **Create two glyph atlas textures** in `createAsciiRenderer()` — one per layer, each bound to its own texture unit (TEXTURE3 for layer 1 atlas, keeping TEXTURE1 for layer 0).

2. **Duplicate uniform locations** for layer 1: `u_fontSize1`, `u_coverage1`, `u_density1`, `u_charOpacity1`, `u_brightness1`, `u_contrast1`, `u_edgeEmphasis1`, `u_invertMapping1`, `u_atlasSize1`, `u_charCount1`, `u_colorOverlay1`, `u_colorOpacity1`, `u_colorBlend1`, animation uniforms.

3. **Upload layer 1 uniforms** in the render loop alongside existing layer 0 uniforms.

4. **Regenerate atlas** when layer config changes — track per-layer charPreset/fontSize/customChars and rebuild only the changed atlas.

5. **Wire `particleMode`** uniform (int: 0=repel, 1=attract).

### Milestone: Renderer creates two atlases, uploads two sets of uniforms. Shader doesn't use them yet — visual output unchanged.

---

## Phase 3: Dual-Layer Fragment Shader
**Goal**: Shader renders both layers and composites them.

### Files to change:
- `src/lib/ascii-renderer/shaders/fragment.ts`

### Tasks:
1. **Add layer 1 uniforms** to shader declarations (mirroring layer 0 set).

2. **Add `u_glyphAtlas1` sampler** (texture unit 3).

3. **Extract character rendering into a reusable function**:
   ```glsl
   vec4 renderLayer(
     sampler2D atlas, float fontSize, float coverage, float density,
     float brightness, float contrast, float edgeEmphasis,
     float charOpacity, bool invertMapping, int charCount,
     vec2 atlasSize, /* animation params */
   )
   ```
   This function encapsulates: luminance sampling, threshold check, character index calculation, atlas lookup, animation effects.

4. **Layer 0 (dark spots)**: Renders characters where luminance < threshold (existing behavior).

5. **Layer 1 (light spots)**: Renders characters where luminance > threshold (inverted). Uses `invertMapping` to flip the character selection.

6. **Composite layers**: Alpha-blend layer 1 over layer 0. Each layer's alpha comes from `charOpacity` * atlas sample alpha.

7. **Background compositing** stays shared (single pass, underneath both layers).

### Milestone: Both layers render simultaneously. Dark-spot characters and light-spot characters visible with independent configs.

---

## Phase 4: Color Overlay Fix
**Goal**: Wire existing color overlay config into the shader.

### Files to change:
- `src/lib/ascii-renderer/shaders/fragment.ts`
- `src/lib/ascii-renderer/renderer.ts` (uniform upload)

### Tasks:
1. **Add color overlay uniforms per layer**: `u_colorOverlay0` (vec3), `u_colorOpacity0` (float), `u_colorBlend0` (int). Same for layer 1.

2. **Parse hex color to vec3** in renderer before upload (e.g., `#ff0000` → `vec3(1.0, 0.0, 0.0)`).

3. **Implement blend modes in GLSL** as a helper function:
   ```glsl
   vec3 applyColorBlend(vec3 base, vec3 overlay, int mode, float opacity) {
     vec3 result;
     if (mode == 0) result = base * overlay;           // multiply
     else if (mode == 1) result = overlayBlend(base, overlay); // overlay
     else if (mode == 2) result = 1.0 - (1.0-base)*(1.0-overlay); // screen
     // ... etc for each ColorBlend variant
     return mix(base, result, opacity);
   }
   ```

4. **Apply per-layer** after character color is determined but before final composite.

### Milestone: Color overlay controls in DevPanel now visibly affect rendering per layer.

---

## Phase 5: Pointer Fixes (Remove Glow Hack + Add Attract)
**Goal**: Clean pointer interaction — displacement only, plus attract mode.

### Files to change:
- `src/lib/ascii-renderer/shaders/fragment.ts`
- `src/lib/ascii-renderer/displacement.ts`
- `src/lib/ascii-renderer/renderer.ts`

### Tasks:
1. **Remove comet brightness/coverage boost from shader**:
   - Remove `cometInfluence()` function's effect on luminance and coverage
   - Keep displacement texture sampling (that's the physical push)
   - Remove `u_cometDensityBoost` uniform entirely
   - The `u_cometGlow` / `u_cometRadius` uniforms can remain for displacement radius control, but should NOT affect character brightness

2. **Add attract mode to `DisplacementField.repel()`**:
   - When `particleMode === "attract"`: invert the force direction (pull toward pointer instead of away)
   - Same exponential falloff, same radius, just flip the sign on dx/dy impulse

3. **Wire `particleMode` from config** → renderer → displacement field:
   - Pass mode to `DisplacementField.repel()` call
   - Upload as uniform if shader needs it (likely not — displacement texture handles it)

### Milestone: Pointer purely displaces characters. No brightness bloom. Attract mode pulls characters toward cursor.

---

## Phase 6: DevPanel Update
**Goal**: Extend DevPanel to control both layers independently.

### Files to change:
- `src/components/DevPanel.tsx`

### Tasks:
1. **Replace flat config folders** with two layer folders: "Layer 0 (Dark)" and "Layer 1 (Light)", each containing Characters, Intensity, Animation, Color Overlay subfolders.

2. **Add `particleMode` control** to Comet Pointer folder (dropdown: repel/attract).

3. **Remove `cometDensityBoost` control**.

4. **Update config read/write** to use `config.layers[0].fieldName` and `config.layers[1].fieldName` paths.

5. **Update "Copy Config" button** to serialize the new nested structure.

### Milestone: Full dual-layer control from DevPanel. All new features tweakable in real-time.

---

## Implementation Order & Dependencies

```
Phase 1 (Config)
    │
    ▼
Phase 2 (Renderer plumbing)
    │
    ├──────────────┐
    ▼              ▼
Phase 3         Phase 4         Phase 5
(Dual shader)   (Color overlay)  (Pointer fixes)
    │              │              │
    └──────┬───────┘──────────────┘
           ▼
        Phase 6 (DevPanel)
```

Phases 3, 4, and 5 can be done in parallel after Phase 2. Phase 6 depends on all others.

---

## Risk Notes

- **Shader complexity**: Dual-layer doubles texture lookups. Monitor FPS on low-end devices. If needed, add a `layerCount: 1 | 2` config to disable layer 1.
- **Glyph atlas memory**: Two atlas textures. Each is small (typically 512x512 or less), so this is fine.
- **Config migration**: Existing saved configs will break. Add a migration helper or version field if configs are persisted.
