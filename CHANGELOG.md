# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4.0] - 2026-07-19

### Changed
- Copy pass toward "effortlessly cool, minimal": cut self-explaining appositives ("world's largest…" ×3), named the Roam angels (OpenAI, Anthropic, DeepMind, xAI) as text instead of hover-decode favicons, merged the duplicate studio/100+ games bullets (Previously now 6 items), moved the merch story to Lore, rewrote the studio lore line to land the solo-did-everything reveal
- Hero greeting renders on one line at text-lg and near-full contrast — the page's single focal point (comma-split into two lines removed)
- Gen z mode toggle demoted from fixed top-right to a footer easter egg with the tldr beside it; toggle shrunk, given `role="switch"` + `aria-checked` — also fixes the toggle floating over content on mobile scroll
- Section labels unified to tracked-uppercase (`PREVIOUSLY.` matches `LORE.`), all sections share a 42rem max-width, socials label spacing matched, noise texture halved
- Writing list: lowercase titles, month-year dates, sorted newest-first
- Subway Surfers pip shrinks on mobile (160×285) and is click-through except its close button
- Pinch zoom re-enabled (removed `maximumScale`/`userScalable` viewport lock)

### Added
- Pixel "P" SVG favicon (`public/icon.svg`) with a 32px ICO fallback generated from it

### Fixed
- Cursor-repel no longer dims the hero greeting (heading opacity aligned with displacement max)
- Reduced-motion hero spacing matches the canvas layout path (rem inflation at the 125% root font)
- Orphaned `prithvi-site-content-v3` localStorage key cleaned up on load

### Removed
- Hero text-scramble decode animation
- `BackdropRipple` and `BgVideo` components and the watercolor `bg.mp4`

## [0.1.3.0] - 2026-05-20

### Added
- Looping watercolor video at the bottom-right of the homepage (`BgVideo` component, `/videos/bg.mp4`)
- Radial-gradient mask feathers the video's cream backdrop into the page so there's no visible seam

### Changed
- Site background moved from `body` to `html` so `BgVideo` can sit at `z-index: -1` between the page bg and the existing noise overlay
- `body::before` noise overlay now renders above the video

## [0.1.2.0] - 2026-03-30

### Changed
- Redesign homepage to soulwire-inspired single-page layout with labeled sections (Info, Labs)
- Switch typography from Red Hat Display to JetBrains Mono (monospace)
- Background color from `#0a0a0a` to `#1a1a1a` (lighter dark)
- Replace card-based project grid with numbered project list in 3-column layout
- Add footer with email and social links (Github, X, LinkedIn)
- Add version number display in header
- Simplify PageShell component (remove tag-specific animation offsets)
- Use Next.js font optimization (next/font/google) instead of manual link tags

### Removed
- ParticleText morphing tagline from homepage
- ProjectGrid card/modal system from homepage (component still exists)
- Hero section full-screen layout
- Purple accent color (`#a78bfa`)
- Press feedback (scale) animations on interactive elements
- Pronunciation button from greeting

## [0.1.1.1] - 2026-03-28

### Fixed
- Stabilize physicsConfig object references in ParticleImage and ParticleText with useMemo (prevents rAF leak on re-render)
- Match error and 404 page background color to site (#0a0a0a instead of #000)

## [0.1.1.0] - 2026-03-28

### Added
- Particle text engine with bezier curve morphing, spring physics, and mouse repulsion
- ParticleText component — morphs between words ("developer", "creator", "explorer")
- ParticleImage component — renders SVG logos/icons as interactive particle clouds
- ProjectGrid with modal detail view, keyboard dismiss, and conditional links
- Content pages: about, projects, writing with GSAP stagger animations
- PageShell layout component with back navigation and animated entrance
- Error boundary and 404 page with minimal styling
- SEO metadata, JSON-LD structured data, Open Graph tags
- Vercel deployment config with asset caching headers
- Vitest + Testing Library test framework with 26 tests
- Noise texture overlay and custom easing curves
- Reduced motion support across all animated components
- Mobile-optimized particle counts (50% reduction on small screens)

### Changed
- Complete redesign from WebGL ASCII video renderer to minimal particle-based layout
- Background color from `#000` to `#0a0a0a`
- Font to Red Hat Display via Google Fonts
- Navigation from overlay to inline centered links with animated underlines

### Removed
- WebGL ASCII renderer, GLSL shaders, glyph atlas, displacement system
- Aurora overlay and particle overlay effects
- Video backgrounds (bg-desktop.mp4, bg-mobile.mp4)
- DevPanel development tool
- next.config.ts (using defaults)
- CI workflow (OAuth scope limitation)
