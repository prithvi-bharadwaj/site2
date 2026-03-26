---
title: Personal Site with WebGL ASCII Video Effect
type: feat
status: active
date: 2026-03-25
---

# Personal Site with WebGL ASCII Video Effect

## Vision

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Full Viewport) — ASCII Canvas covers everything        │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │  PRITHVI         │  ← floating text, no background            │
│  │  Bio text here   │                                            │
│  │                  │            @@##**++==--::..                 │
│  │  → Twitter/X     │        ##@@  @@##**++==--                  │
│  │  → GitHub        │     **++==    --::..  @@##                 │
│  │  → LinkedIn      │        ::..@@##**++==--                    │
│  │  → Games         │           ==--::.. @@##**                  │
│  └─────────────────┘                                             │
│                          ┌──────────┐                            │
│   ASCII effect covers    │ Pointer  │ ← reveal/ripple            │
│   the ENTIRE viewport    │  Zone    │   shows video underneath   │
│                          └──────────┘                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Render Pipeline:
Video → texImage2D → Fragment Shader (luminance + sobel + pointer uniforms)
                         ↑
                    Glyph Atlas (Canvas 2D → WebGL texture)
```

**User Journey:**
1. Site loads → fullscreen animated ASCII art over looping video
2. Mouse/touch moves → ASCII reveals raw video or ripples outward
3. Bio, links, games readable as floating text over the ASCII canvas
4. (Dev) Hotkey toggles lil-gui for real-time parameter tweaking

---

## Milestone 1: Project Scaffold + Video on WebGL Canvas
> After this: You see the raw video playing fullscreen on a WebGL canvas in the browser

### Phase 1: Next.js Project Setup
Estimated: 30min | Files: ~8

#### Tasks
- [x] Init Next.js with TypeScript, App Router, Tailwind — `npx create-next-app@latest`
  Verify: `npm run dev` serves default page at localhost:3000
- [x] Configure webpack for GLSL imports (`asset/source`) + TypeScript declarations
  Verify: Can import a `.glsl` file without TS errors
- [x] Install dependencies: `gsap @gsap/react lil-gui`
  Verify: `npm ls gsap lil-gui` shows installed

### Phase 2: Fullscreen Video WebGL Canvas
Estimated: 1.5hr | Files: ~6

#### Tasks
- [x] Create `src/lib/ascii-renderer/renderer.ts` — WebGL context init, fullscreen quad (2 triangles), basic vertex shader
  Verify: Canvas renders a solid color fullscreen
- [x] Create `src/lib/ascii-renderer/shaders/vertex.glsl` — passthrough vertex shader with UV coordinates
  Verify: Compiles without shader errors in console
- [x] Create `src/lib/ascii-renderer/shaders/fragment.glsl` — sample video texture, output raw video color
  Verify: Video displays on the WebGL canvas
- [x] Create `src/components/AsciiCanvas.tsx` — React wrapper with useRef, useEffect, ResizeObserver (DPR capped at 2)
  Verify: Canvas resizes correctly on window resize
- [x] Wire up video element: hidden `<video muted loop playsInline>`, upload frames via `texImage2D` each RAF
  Verify: Video plays smoothly on the WebGL canvas in the browser
- [x] Add placeholder video to `public/video/` (user will swap in their own)
  Verify: Video loops seamlessly

**Test checkpoint:** Open localhost:3000, see the video playing fullscreen on a WebGL canvas. Resize the window — canvas follows.
**Break point:** Safe to stop here. Run `/work` to continue from Phase 3.

---

## Milestone 2: Core ASCII Effect
> After this: Video is rendered as ASCII art with the basic brightness-based character mapping

### Phase 3: Glyph Atlas + ASCII Fragment Shader
Estimated: 2hr | Files: ~4

#### Tasks
- [x] Create `src/lib/ascii-renderer/glyph-atlas.ts` — render minimal charset (`@#*+=-:. `) to an offscreen canvas, upload as WebGL texture
  Verify: Atlas texture created without errors (check with a test render)
- [x] Create `src/lib/ascii-renderer/config.ts` — typed config object with all ascii-magic.com parameters as defaults
  Verify: Config imports cleanly, TypeScript happy
- [x] Update `fragment.glsl` — divide viewport into grid cells, sample video at cell center, compute luminance (BT.601), map to glyph atlas index, sample glyph texture
  Verify: Video renders as ASCII characters in the browser
- [x] Wire uniforms from config: `uCellSize`, `uCharCount`, `uCharOpacity`, `uCoverage`, `uDensity`, `uBrightness`, `uContrast`
  Verify: Changing config values changes the ASCII output

**Test checkpoint:** Video displays as ASCII art. Characters map to brightness. Adjusting coverage/density in code changes the look.
**Break point:** Safe to stop here.

---

## Milestone 3: Edge Detection + Animation + Background
> After this: Full ascii-magic.com parameter parity — edges emphasized, characters shimmer, blurred video behind

### Phase 4: Sobel Edge Detection
Estimated: 1hr | Files: ~2

#### Tasks
- [ ] Add Sobel operator to fragment shader — 3x3 kernel, compute gradient magnitude per cell
  Verify: Edges of objects in the video get denser/bolder characters
- [ ] Wire `uEdgeEmphasis` uniform — controls blend between pure brightness and edge-boosted brightness
  Verify: Setting edge emphasis to 0 matches Phase 3 output, setting to 1.0 shows strong edges

### Phase 5: Animated ASCII + Blurred Background
Estimated: 1.5hr | Files: ~3

#### Tasks
- [ ] Add animation uniforms: `uTime`, `uAnimSpeed`, `uAnimIntensity`, `uAnimRandomness`
  Verify: Characters shimmer/swap over time when animated ASCII is enabled
- [ ] Implement per-character alpha modulation using sine wave + noise — ascii-magic.com style shimmer
  Verify: Animation speed and randomness controls produce visible changes
- [ ] Add blurred background layer — CSS `backdrop-filter: blur()` on a layer behind the canvas, or render blurred video in a second pass with `uBgBlur` and `uBgOpacity` uniforms
  Verify: Blurred video visible behind the ASCII characters at 53% opacity

**Test checkpoint:** Full ASCII effect with edge detection, animated shimmer, and blurred background. Matches the look from ascii-magic.com settings.
**Break point:** Safe to stop here.

---

## Milestone 4: Pointer Interaction
> After this: Mouse/touch creates reveal zones and ripple distortion in the ASCII effect

### Phase 6: Mouse + Touch Interaction
Estimated: 1.5hr | Files: ~3

#### Tasks
- [ ] Create `src/lib/ascii-renderer/pointer.ts` — unified mouse/touch handler, normalizes coordinates to [0,1], tracks velocity
  Verify: Console logs normalized pointer position on move
- [ ] Add reveal mode to fragment shader — `smoothstep` circle around `uPointer`, mix ASCII with raw video inside radius
  Verify: Moving mouse reveals original video in a soft circle
- [ ] Add ripple mode to fragment shader — displace UV coordinates near pointer using sine wave + distance falloff
  Verify: Moving mouse creates visible ripple distortion in the ASCII
- [ ] Add `uInteractionMode` uniform to toggle between reveal (0) and ripple (1)
  Verify: Can switch between modes via config

**Test checkpoint:** Move mouse over the ASCII canvas — see either a reveal zone showing the raw video, or a ripple distortion. Works on desktop and mobile (touch).
**Break point:** Safe to stop here.

---

## Milestone 5: Bio Overlay + Dev Panel
> After this: Site has content and you can tweak every parameter in real-time

### Phase 7: Bio Overlay
Estimated: 1hr | Files: ~3

#### Tasks
- [ ] Create `src/components/BioOverlay.tsx` — positioned top-left, no background, floating text over the ASCII canvas
  Verify: Text renders over the ASCII effect with no background/card
- [ ] Add content: name, bio paragraph, social links (Twitter/X, GitHub, LinkedIn), game/project links
  Verify: All links clickable, text readable over the ASCII effect
- [ ] Add GSAP entrance animation using `useGSAP` — staggered fade-in of text elements
  Verify: Text animates in on page load

### Phase 8: lil-gui Dev Panel
Estimated: 1hr | Files: ~2

#### Tasks
- [ ] Create `src/components/DevPanel.tsx` — dynamic `import('lil-gui')` gated on `NODE_ENV === 'development'`
  Verify: Panel appears in dev, absent in production build
- [ ] Wire ALL config parameters to GUI folders matching ascii-magic.com layout: Characters, Intensity, Background, Animation, Pointer
  Verify: Every slider/dropdown updates the ASCII effect in real-time
- [ ] Add "Copy Config" button — copies current parameter values as a JSON object to clipboard
  Verify: Can paste config values into `config.ts` and get the same result

**Test checkpoint:** Full site visible — ASCII background, bio overlay, interactive pointer, dev panel for tweaking. All parameters adjustable in real-time.
**Break point:** Safe to stop here.

---

## Milestone 6: Responsive + Polish
> After this: Site is production-ready, works on desktop and mobile

### Phase 9: Mobile Optimization
Estimated: 1hr | Files: ~3

#### Tasks
- [ ] Add responsive breakpoints — larger cell size on mobile (performance), adjusted overlay layout for small screens
  Verify: Site looks good on iPhone/Android viewport sizes in dev tools
- [ ] Add touch event handling — `touchstart`/`touchmove` trigger same reveal/ripple as mouse
  Verify: Touch interaction works in mobile dev tools emulation
- [ ] Add performance fallback — detect low-end devices via `navigator.hardwareConcurrency` or GPU info, increase cell size / reduce density
  Verify: No frame drops on throttled CPU in dev tools

### Phase 10: Production Polish
Estimated: 1hr | Files: ~4

#### Tasks
- [ ] Compress video with FFmpeg: `ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -an output.mp4`
  Verify: Video file < 5MB, still looks good through the ASCII effect
- [ ] Add meta tags, favicon, OG image for social sharing
  Verify: Social preview looks correct (use og-image checker)
- [ ] Remove all `console.log`, ensure lil-gui doesn't ship in prod build
  Verify: `npm run build` succeeds, no console output in production
- [ ] Final parameter tuning — lock in ASCII settings that match your preferred look
  Verify: Production build matches your vision

**Final test:**
- [ ] Desktop: Chrome, Safari, Firefox — ASCII renders, pointer works, links clickable
- [ ] Mobile: iOS Safari, Android Chrome — touch works, performance smooth, text readable
- [ ] Production build: `npm run build && npm run start` — no errors, no dev panel, fast load

---

## Exhaustive Customization Reference (from ascii-magic.com)

All controls available in the tool. We implement the relevant subset as WebGL uniforms + lil-gui controls.

### CHARACTERS

| Control | Type | Range / Options | Default |
|---------|------|----------------|---------|
| Render Mode | Dropdown | **Brightness**, **Edge Map**, **Dot Matrix** | Brightness |
| Font Size | Slider | 3–48, step 1 | 8 |
| Preset | Dropdown | **Standard** (`@#S08Xx+=-;:,.`), **Detailed** (`$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^'. `), **Minimal** (`@#*+=-:. `), **Blocks** (█▓▒░ ), **Custom** | Standard |
| Custom Chars | Text input | Any string (visible only when Preset = Custom) | `@#S08Xx+=-;:,.` |
| Blend Mode | Dropdown | **Normal** (`source-over`), **Overlay**, **Color Dodge**, **Screen**, **Lighter** | Normal |
| Char Opacity | Slider | 0–100 | 100 |
| Invert Mapping | Toggle | on/off | OFF |
| Dot Grid Overlay | Toggle | on/off | OFF |

### INTENSITY

| Control | Type | Range | Default |
|---------|------|-------|---------|
| Coverage | Slider | 0–100 | 85 |
| Edge Emphasis | Slider | 0–100 | 60 |
| Density | Slider | 0–100 | 30 |
| Brightness | Slider | -100–100 | 0 |
| Contrast | Slider | -100–100 | 0 |

### BACKGROUND

| Control | Type | Range / Options | Default |
|---------|------|----------------|---------|
| Mode | Dropdown | **Blurred Image**, **Solid Black**, **Original Image**, **None (Transparent)** | Blurred Image |
| Blur | Slider | 0–60px (hidden when mode is Solid/None) | 8 |
| Opacity | Slider | 0–100 (hidden when mode is Solid/None) | 70 |

### ANIMATION

| Control | Type | Range | Default |
|---------|------|-------|---------|
| Animated ASCII | Toggle | on/off | OFF |
| Speed | Slider | 500–3000ms, step 100 (shown as seconds, e.g. "1.5s") | 1500 |
| Intensity | Slider | 0–100 | 60 |
| Randomness | Slider | 0–100 | 50 |

Animation effect: sine-wave alpha modulation + character shimmer (glyph substitution) when intensity exceeds threshold.

### COLOR OVERLAY

| Control | Type | Range / Options | Default |
|---------|------|----------------|---------|
| Color | Color picker | Any hex color | `#ff0000` |
| Opacity | Slider | 0–100 | 0 (transparent) |
| Blend | Dropdown | **Multiply**, **Overlay**, **Screen**, **Color**, **Hue**, **Saturation**, **Luminosity**, **Soft Light**, **Hard Light**, **Color Burn**, **Color Dodge** | Multiply |

### MASK (paint-to-reveal)

| Control | Type | Range / Options | Default |
|---------|------|----------------|---------|
| Enable Mask | Toggle | on/off | OFF |
| Tool | Dropdown | **Freehand**, **Rectangle**, **Ellipse** | Freehand |
| Brush Size | Slider | 5–100 (visible only when tool = Freehand) | 30 |
| Show Overlay | Toggle | on/off | ON |
| Invert Mask | Toggle | on/off | OFF |
| Clear Mask | Button | — | — |

### EXPORT

| Control | Type | Options | Default |
|---------|------|---------|---------|
| Format | Dropdown | **PNG**, **JPG**, **GIF (Animated)**, **MP4 (Video)**, **MP4 (Animation)** | PNG |
| Resolution | Dropdown | **1x (Source)**, **2x**, **3x**, **4x** | 2x |
| Duration | Dropdown | **3s**, **5s**, **10s**, **15s** (animation export only) | 5s |
| Frame Rate | Dropdown | **15fps**, **20fps**, **24fps**, **30fps**, **60fps** (animation export only) | 30fps |

### What We Implement vs. Skip

**Implement as shader uniforms + lil-gui:**
- All CHARACTERS controls (render mode, font size, preset, custom chars, blend mode, opacity, invert, dot grid)
- All INTENSITY controls (coverage, edge emphasis, density, brightness, contrast)
- All BACKGROUND controls (mode, blur, opacity)
- All ANIMATION controls (toggle, speed, intensity, randomness)
- All COLOR OVERLAY controls (color, opacity, blend)
- Pointer interaction (our addition — not in ascii-magic.com)

**Skip (not relevant to a live website):**
- Export controls (PNG/JPG/GIF/MP4 — we're rendering live)
- Mask painting tool (we use pointer interaction instead)
- Crop/rotate (video is pre-selected)
- Playback controls (video auto-loops)

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 (App Router) | Framework, routing, SSG |
| TypeScript | Type safety |
| WebGL 2 (fallback: WebGL 1) | ASCII renderer |
| GLSL | Fragment/vertex shaders |
| lil-gui | Dev parameter panel |
| GSAP + @gsap/react | Text entrance animations |
| Tailwind CSS | Overlay styling |

## Key Implementation Notes

- **GLSL imports**: Use `asset/source` in webpack config (or `.ts` string exports for Turbopack)
- **Canvas resize**: ResizeObserver + DPR capped at 2
- **Video autoplay**: `muted` + `playsInline` + programmatic `.play().catch()`
- **Glyph atlas**: Characters sorted by visual density (space → @), rendered to offscreen Canvas 2D, uploaded as WebGL texture
- **Pointer**: Normalized [0,1] coordinates passed as `vec2 uPointer` uniform, with `uPointerRadius` and `uPointerSoftness`
- **Mobile**: Larger cell size, touch events, performance detection

## References

- [Codrops: Creating an ASCII Shader Using OGL](https://tympanus.net/codrops/2024/11/13/creating-an-ascii-shader-using-ogl/)
- [Codrops: Efecto — Real-Time ASCII with WebGL Shaders](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/)
- [p5.asciify (GitHub)](https://github.com/humanbydefinition/p5.asciify) — reference for glyph atlas + edge detection
- [MDN: Animating Textures in WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Animating_textures_in_WebGL)
- [MDN: WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL Fundamentals: Resizing the Canvas](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)
- [GSAP React Docs](https://gsap.com/resources/React/)
- ascii-magic.com — parameter reference
- generalintuition.com — WebGL ASCII renderer architecture reference
