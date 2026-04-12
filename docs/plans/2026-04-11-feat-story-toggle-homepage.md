---
title: Story Toggle Homepage — TL;DR + Expandable Full Story
type: feat
status: completed
date: 2026-04-11
---

# Story Toggle Homepage — TL;DR + Expandable Full Story

## Vision

```
ARCHITECTURE
════════════════════════════════════════════════════════════════════════

page.tsx (homepage)
├── BackdropRipple (unchanged — fixed canvas)
├── PretextHero (unchanged — scramble decode + displacement)
├── StoryToggle (NEW — manages collapsed/expanded state)
│   ├── collapsed: TL;DR text + anchor links + [show full story] button
│   └── expanded: full story sections + [collapse] button
└── Bottom Section (layout shifts on toggle)
    ├── COLLAPSED desktop: grid-cols-[1fr_2fr] → Work | Labs
    ├── EXPANDED desktop: grid-cols-[2fr_1fr] → Story | Work+Labs
    └── MOBILE (both): single column stack

STATE FLOW:
  COLLAPSED ──[click "show full story"]──→ EXPANDED
  COLLAPSED ──[click TL;DR anchor link]──→ EXPANDED + scroll to section
  EXPANDED  ──[click "collapse"]──────────→ COLLAPSED
```

**User journey:**
1. Land on homepage → hero scramble decodes, TL;DR appears below with "show full story" button
2. Read TL;DR → 2-3 sentence summary with linked keywords (e.g., "100 games", "Voodoo", "Buildspace")
3. Click any anchor link → story expands, scrolls to that section
4. Click "show full story" → story expands, Work tweens right on desktop
5. Scroll through story → full chronological narrative
6. Click "collapse" → story collapses, Work tweens back

**Final state:** Homepage has two modes. Collapsed: punchy TL;DR with clickable teasers. Expanded: full story with Work+Labs repositioned as right sidebar (desktop). Transition is smooth CSS. All existing effects untouched.

---

## Milestone 1: Toggle Infrastructure + TL;DR
> After this: You can click "show full story" to reveal placeholder content, and click "collapse" to hide it. TL;DR text is visible when collapsed.

### Phase 1: StoryToggle component + homepage integration
Estimated: 45 min | Files: 3

#### Tasks
- [ ] Create `src/components/StoryToggle.tsx` — Client component with `expanded` state (useState, default false). Renders two children slots: collapsed content and expanded content. Animates via max-height + opacity CSS transition (same pattern as WorkAccordion's `.work-detail` class). Button toggles state.
  Verify: Component renders, button toggles visibility of children

- [ ] Add `.story-expand` CSS class to `src/app/globals.css` — Same transition pattern as `.work-detail`: `overflow: hidden; transition: max-height 400ms var(--ease-out), opacity 300ms var(--ease-out)`. Longer duration than accordion (400ms vs 250ms) because more content.
  Verify: `grep "story-expand" src/app/globals.css`

- [ ] Write TL;DR copy and integrate into `src/app/page.tsx` — Add StoryToggle between PretextHero and the bottom grid. Collapsed slot: TL;DR paragraph with linked keywords. Expanded slot: placeholder text for now. "Show full story" button: styled as obvious CTA — `text-[#F4F5F8]/60 border border-[#F4F5F8]/20 px-4 py-2 text-xs uppercase tracking-widest hover:text-[#F4F5F8] hover:border-[#F4F5F8]/40 transition-all 200ms`. Not subtle — this is meant to be clicked.
  Verify: `npm run build` passes, dev server shows TL;DR + button

**TL;DR copy draft:**
> I've been shipping things on the internet since I was 13. Started with a [YouTube channel](#first-money) that accidentally made me $100, sold [150 hoodies](#merch) to my entire school, ran a [design agency](#agency) at 16, then shipped [100+ mobile games](#voodoo) solo for Voodoo and Supersonic — they thought I was a studio. Built [Skive](#skive) at Buildspace (won S4). Now building [Roam](#roam), the AI game engine.

Each bracketed link is an anchor that will expand the story and scroll to the right section (wired in Phase 3).

**🧪 Test checkpoint:** Button toggles content visibility. TL;DR is readable. Placeholder text appears/disappears smoothly.
**☕ Break point:** Safe to stop here. The toggle works, just no story content yet.

---

## Milestone 2: Full Story Content + Scroll-to-Section
> After this: Clicking "show full story" reveals the complete chronological narrative. Clicking a TL;DR link expands the story and scrolls to the correct section.

### Phase 2: Story sections content
Estimated: 45 min | Files: 2

#### Tasks
- [ ] Create `src/components/StorySection.tsx` — Simple component: `({ id, title, children }) => <section id={id} className="mt-12 first:mt-0"><h3 ...>{title}</h3>{children}</section>`. Title: bold 14px full opacity. Body: 14px `text-[#F4F5F8]/60 leading-relaxed`. Paragraphs have `mb-4`. Uses the existing left-offset layout (`max-w-2xl`). Fade-in on viewport entry via IntersectionObserver (threshold 0.1, same `opacity 0→1 + translateY(8→0) 400ms ease-out` pattern).
  Verify: Component renders with visible text

- [ ] Add full story copy to StoryToggle's expanded slot in `src/app/page.tsx` — Wrap story sections in StorySection components with IDs matching the TL;DR anchor hrefs: `first-money`, `merch`, `agency`, `voodoo`, `skive`, `roam`. Use the draft copy from the design doc at `~/.gstack/projects/prithvi-bharadwaj-site2/prithvi-main-design-20260411-180015.md` (Section 2: The Story).
  Verify: Expanding toggle shows all story sections with correct headings

### Phase 3: Anchor link → expand + scroll
Estimated: 30 min | Files: 1

#### Tasks
- [ ] Wire TL;DR anchor links in `StoryToggle.tsx` — Each anchor link in the TL;DR calls a handler that: (1) sets `expanded = true`, (2) after a short delay (50ms, to let the expand transition start), calls `document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Offset by ~80px for breathing room (use `scroll-margin-top: 80px` CSS on `.story-section` or use `scrollTo` with manual offset).
  Verify: Click "100+ mobile games" in TL;DR → story expands → page scrolls to the Voodoo section

- [ ] Add `scroll-margin-top: 80px` to story section elements in `globals.css` — Ensures smooth scroll target has breathing room above the fold.
  Verify: Scroll-to lands with the section heading visible, not hidden under the top of viewport

**🧪 Test checkpoint:** Full story reads correctly. Every TL;DR link expands and scrolls to its section. Collapse button works. Story content matches the intended voice.
**☕ Break point:** Safe to stop here. The story toggle is fully functional. Layout reposition is next.

---

## Milestone 3: Layout Reposition on Expand (Desktop)
> After this: On desktop, expanding the story causes Work+Labs to tween to the right column. Collapsing tweens them back. Mobile stays single-column.

### Phase 4: Grid layout transition
Estimated: 45 min | Files: 2

#### Tasks
- [ ] Refactor bottom grid in `src/app/page.tsx` to respond to `expanded` state — Lift the `expanded` state from StoryToggle up to the Home component (or use a shared ref/context). The bottom grid changes layout based on state:
  - **Collapsed desktop:** `grid-cols-1 md:grid-cols-[1fr_2fr]` (current layout: Work | Labs)
  - **Expanded desktop:** `grid-cols-1 md:grid-cols-[2fr_1fr]` (Story left | Work+Labs right)
  - **Mobile (both):** `grid-cols-1` (stacked)

  When expanded on desktop: the story content occupies the left 2fr column. Work and Labs stack vertically in the right 1fr column. Add CSS transition on the grid container: `transition: grid-template-columns 400ms var(--ease-out)` (note: grid-template-columns transitions are supported in modern browsers).
  Verify: Expand → Work+Labs slide right. Collapse → they slide back.

- [ ] Add grid transition CSS to `globals.css` — `.story-grid { transition: all 400ms var(--ease-out); }` to smooth the column change. Also add `will-change: contents` hint on the grid children that reposition.
  Verify: Transition is smooth, no layout jank

- [ ] Ensure WorkAccordion and LabsGrid are visually correct in the narrower right column — In the 1fr right column, WorkAccordion and LabsGrid need to stack vertically with appropriate spacing. LabsGrid should switch to `grid-cols-1` when in the narrow column (it's currently `sm:grid-cols-2`). Add a prop or container query to handle this, or simply use `@container` queries / a wrapper class.
  Verify: Work and Labs look correct in both column widths on desktop

### Phase 5: Polish transitions + mobile
Estimated: 30 min | Files: 2

#### Tasks
- [ ] Ensure mobile layout is clean — On mobile, expanded state just shows: Hero → TL;DR (hidden when expanded) → Story sections → Work → Labs. All single column. No grid column shifting. The "show full story" / "collapse" button remains visible and obvious.
  Verify: Test at 375px viewport width — story expands/collapses cleanly, no overflow

- [ ] Add reduced-motion support — If `prefers-reduced-motion`, skip all transitions: instant show/hide (no max-height animation), instant grid column change, no scroll animation (`behavior: 'instant'`). The story content just appears/disappears.
  Verify: Enable reduced motion in OS settings → toggle still works, no animations

- [ ] Button label transitions — Button text changes: "show full story" ↔ "collapse". Add a subtle opacity fade on the label change (100ms). When expanded, button sits at the top of the story (before the first section) so it's always reachable. When collapsed, button sits below the TL;DR.
  Verify: Button label changes smoothly, button is always reachable

**🧪 Final test:**
- [ ] Desktop: TL;DR visible → click "show full story" → story expands, grid repositions, Work+Labs slide right → click any TL;DR link (when collapsed) → expands + scrolls → click "collapse" → everything returns
- [ ] Mobile: Same flow but single-column, no grid reposition
- [ ] Reduced motion: All transitions instant
- [ ] All existing effects (particles, scramble, displacement) still work
- [ ] `npm run build` passes
- [ ] `npm test` passes

---

## Open Questions

1. **TL;DR copy finalization** — The draft TL;DR is a starting point. Prithvi will want to adjust the wording and which keywords are linked.
2. **Story copy details** — The draft story from the design doc needs Prithvi's real details filled in (specific game names, screenshots, links to Blender work, buildspace substack post).
3. **Grid column transition browser support** — CSS `grid-template-columns` transitions work in Chrome 107+, Firefox 66+, Safari 16+. If older browser support matters, fall back to a width-based layout with `flex` instead of grid.

## References

- Design doc: `~/.gstack/projects/prithvi-bharadwaj-site2/prithvi-main-design-20260411-180015.md`
- Current homepage: `src/app/page.tsx`
- WorkAccordion pattern: `src/components/WorkAccordion.tsx` (expand/collapse reference)
- CSS transitions: `src/app/globals.css` (`.work-detail`, `--ease-out`)
- GSAP (available but not needed for this feature): `src/components/PageShell.tsx`
