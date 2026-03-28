---
title: Minimal Homepage Redesign
type: feat
status: completed
date: 2026-03-28
---

# Minimal Homepage Redesign

## Vision

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  ┌──────────┐                                           │
│  │ Logo Img │←── AsciiDissolve (canvas hover effect)    │
│  └──────────┘                                           │
│                                                          │
│         ┌─────────────────────────┐                     │
│         │   Centered Content      │                     │
│         │   ┌─────────────────┐   │                     │
│         │   │  Name + Bio     │   │                     │
│         │   └─────────────────┘   │                     │
│         │   ┌─────────────────┐   │                     │
│         │   │  Nav Links      │   │                     │
│         │   │  Projects Games │   │                     │
│         │   │  Work    About  │   │                     │
│         │   └─────────────────┘   │                     │
│         └─────────────────────────┘                     │
│                                                          │
│                              ┌──────────┐               │
│                              │Flower Img│←── AsciiDissolve
│                              └──────────┘               │
│                                                          │
│  ┌────────────────────────────────────────┐             │
│  │  CSS Background: #0a0a0a + SVG grain   │             │
│  └────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘

Component tree:
  RootLayout (layout.tsx)
  ├── globals.css (grain background)
  └── HomePage
      ├── AsciiDissolve (logo, top-left)
      ├── CenteredContent (name, bio, links)
      └── AsciiDissolve (flower, footer)
```

**User journey:**
1. User opens site → dark textured bg, logo top-left, name/bio centered, flower bottom
2. Hover logo → image dissolves into ASCII characters
3. Move away → ASCII reforms back into image
4. Hover flower → same dissolve effect
5. Click "Projects" → navigates to /projects (existing sub-pages)

**Done:** Minimal centered portfolio. Dark grain background. Two images with ASCII dissolve on hover. Clean typography. No video, no WebGL, fast load.

---

## Milestone 1: Clean Slate
> After this: Site loads with a blank dark page — no errors, no dead imports, all heavy code removed.

### Phase 1: Delete Heavy Infrastructure
Estimated: 15 min | Files: 16 deleted, 3 modified

#### Tasks
- [x] Delete `src/lib/ascii-renderer/` directory (8 files: config, displacement, glyph-atlas, particles, pointer, renderer, shaders/fragment, shaders/vertex)
- [x] Delete `src/lib/aurora/` directory (2 files: curtain, particles)
- [x] Delete `src/components/AsciiCanvas.tsx`
- [x] Delete `src/components/AuroraOverlay.tsx`
- [x] Delete `src/components/ParticleOverlay.tsx`
- [x] Delete `src/components/DevPanel.tsx`
- [x] Delete `public/video/bg-desktop.mp4` and `public/video/bg-mobile.mp4`
- [x] Remove `lil-gui` from devDependencies in `package.json`
- [x] Update `next.config.ts` — remove video caching headers

### Phase 2: Stub Homepage
Estimated: 10 min | Files: 3 modified

#### Tasks
- [x] Rewrite `src/app/page.tsx` — minimal centered layout with name, bio, nav links
- [x] Update `src/app/globals.css` — removed overflow:hidden, added SVG grain texture on #0a0a0a bg
- [x] Delete `src/components/BioOverlay.tsx`

**🧪 Test checkpoint:** `npm run build` passes. Site loads at localhost:3000 with dark background and placeholder text. No console errors. Sub-pages (/about, /projects, /writing) still work.
**☕ Break point:** Safe to stop. All dead code is gone. Site is functional but minimal.

---

## Milestone 2: Centered Homepage Layout
> After this: Homepage shows name, bio, and navigation links in a clean centered layout with grain background.

### Phase 3: Homepage Content & Layout
Estimated: 20 min | Files: 2 modified

#### Tasks
- [x] Build homepage layout in `src/app/page.tsx` — centered flexbox with name, bio tagline, and nav links
- [x] Style nav links — inline layout, monospace font, hover states, proper spacing
- [x] Add logo (top-left, fixed) and flower (bottom-right, fixed) with AsciiDissolve

**🧪 Test checkpoint:** Homepage renders with centered content. Navigation links work. Responsive on mobile. Dark grain background visible.
**☕ Break point:** Safe to stop. Homepage is functional and styled. Images not yet added.

---

## Milestone 3: ASCII Dissolve Hover Effect
> After this: Two images on the page dissolve into ASCII characters on hover — the signature interactive touch.

### Phase 4: AsciiDissolve Component
Estimated: 45 min | Files: 2 new, 1 modified

#### Tasks
- [x] Create `src/lib/ascii-dissolve.ts` — core engine (100 lines): pixel sampling, brightness-to-char mapping, progressive blend render
- [x] Create `src/components/AsciiDissolve.tsx` — React component with hover animation, RAF, prefers-reduced-motion
- [x] Add placeholder images to `public/images/` — logo.svg and flower.svg

### Phase 5: Integrate Into Homepage
Estimated: 15 min | Files: 1 modified

#### Tasks
- [x] Add `<AsciiDissolve>` for logo — positioned top-left (fixed)
- [x] Add `<AsciiDissolve>` for flower — positioned bottom-right (fixed)
- [x] Dissolve respects `prefers-reduced-motion` — instant swap, no animation

**🧪 Test checkpoint:** Both images render. Hovering dissolves them into ASCII. Moving away reforms them. Animation is smooth (60fps). Works on mobile (touch). No layout shift.
**☕ Break point:** Safe to stop. Core feature complete.

---

## Milestone 4: Polish & Ship
> After this: Site is production-ready with final images, responsive design, and clean metadata.

### Phase 6: Final Polish
Estimated: 20 min | Files: 3-4 modified

#### Tasks
- [ ] Replace placeholder images with final logo and flower assets (user to provide)
- [x] Review and update metadata in `layout.tsx` — themeColor updated to #0a0a0a
- [x] Run `npm run build` — clean, no warnings, no TypeScript errors
- [x] Evaluate GSAP usage — only used by PageShell for sub-page animations, kept

**🧪 Final test:** Full site walkthrough — homepage loads fast, images dissolve on hover, all nav links work, sub-pages render correctly, no console errors, lighthouse performance score > 90.

---

## Open Questions
None — all resolved during brainstorm.

## References
- Brainstorm: `docs/brainstorms/2026-03-28-minimal-redesign.md`
- ASCII image conversion approach: Canvas 2D pixel sampling + brightness-to-character mapping
- Grain background: Inline SVG feTurbulence filter in CSS
- Existing sub-pages use GSAP via PageShell — keep GSAP for now
- Deleted code preserved in git history (branch: feat/ascii-video-site)
