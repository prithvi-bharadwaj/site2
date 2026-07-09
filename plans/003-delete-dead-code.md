# Plan 003: Delete the 12 dead components, 2 dead lib modules, and 4 dead test files left behind by past redesigns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 550f54f..HEAD -- src/ test/`
> If any in-scope file changed since this plan was written, re-run the
> import-graph check in Step 1 before deleting anything; on a mismatch with
> the lists below, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (pairs well with 002 landing first so CI guards the deletion)
- **Category**: tech-debt
- **Planned at**: commit `550f54f`, 2026-07-07

## Why this matters

This site has been through four full redesigns (WebGL ASCII renderer → particle engine → soulwire mono list → current "naval-minimal" layout; see `CHANGELOG.md`). Each left components behind. Today **roughly half of `src/` is unreachable from the live pages**: 12 of 22 components and 2 of 6 lib modules are imported by nothing, and **4 of the 5 test files test that dead code** — the suite gives a false sense of coverage while the actually-live code (`pretext-layout.ts`, `displacement-physics.ts`, `text-scramble.ts`) has zero tests. Dead code also actively misleads agents working in this repo: a code audit at `550f54f` produced six false findings because auditors assumed these components were live. Everything deleted here remains recoverable via git history.

## Current state

**Live import graph at `550f54f`** (verified by grep, then by tracing every import of the live files):

- `src/app/page.tsx` imports: `PretextHero`, `BackdropRipple`, `LinkList`, `GenZToggle`, `PreviouslyList`, `SubwaySurfersPip`, `EditPanel`, `BgVideo`
- `src/app/layout.tsx` imports: `PromptInjection`, `HoverCard`
- `PretextHero.tsx` imports libs: `@/lib/pretext-layout`, `@/lib/displacement-physics`, `@/lib/text-scramble`
- `LinkList.tsx`, `PreviouslyList.tsx`, `HoverCard.tsx` import `@/lib/hover-card-bus`
- `PreviouslyList.tsx` imports `./LinkList` (types) and `./BrandIcon`

**DELETE — dead components** (imported by nothing live; only by each other):

1. `src/components/AsciiDissolve.tsx`
2. `src/components/InlineDialogue.tsx`
3. `src/components/HoverLink.tsx`
4. `src/components/LabsGrid.tsx`
5. `src/components/PageShell.tsx`
6. `src/components/ParticleImage.tsx`
7. `src/components/ParticleText.tsx`
8. `src/components/ProjectGrid.tsx`
9. `src/components/ProofMedia.tsx`
10. `src/components/StorySection.tsx`
11. `src/components/StoryToggle.tsx`
12. `src/components/WorkAccordion.tsx`

**DELETE — dead lib modules** (used only by dead components):

- `src/lib/particle-text.ts` (used by `ParticleText.tsx`, `ParticleImage.tsx`)
- `src/lib/ascii-dissolve.ts` (used by `AsciiDissolve.tsx`)

**DELETE — test files that pin dead code** (import targets shown, verified by reading each file's imports):

- `test/draw.test.ts` → imports from `@/lib/particle-text`
- `test/particle-text.test.ts` → imports from `@/lib/particle-text`
- `test/project-grid.test.tsx` → imports `@/components/ProjectGrid`
- `test/proof-media.test.tsx` → imports `@/components/ProofMedia`

**KEEP — live code** (do not touch): `PretextHero`, `BackdropRipple`, `LinkList`, `GenZToggle`, `PreviouslyList`, `SubwaySurfersPip`, `EditPanel`, `BgVideo`, `PromptInjection`, `HoverCard`, `BrandIcon`, `src/lib/pretext-layout.ts`, `src/lib/displacement-physics.ts`, `src/lib/text-scramble.ts`, `src/lib/hover-card-bus.ts`, `test/hover-card-bus.test.ts`, `test/setup.ts`.

**Deliberate call, do not second-guess it during execution**: `StoryToggle.tsx` and `StorySection.tsx` relate to an unshipped "story mode" feature (design doc: `docs/plans/2026-04-11-feat-story-toggle-homepage.md`). They are deleted anyway — the design doc stands alone, the components are two redesigns stale, and git history preserves them. This trade-off is recorded in `plans/README.md`.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npx tsc --noEmit`  | exit 0, no output   |
| Tests     | `npx vitest run`    | 1 file (hover-card-bus), all pass |
| Build     | `npm run build`     | exit 0              |

## Scope

**In scope** (the only files you may delete/modify):
- The 18 files in the three DELETE lists above
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):
- `src/app/globals.css` — may contain orphaned CSS classes for deleted components (e.g. story/particle styles). CSS pruning is riskier (classes are strings, not imports) and is deferred; noted in Maintenance notes.
- `docs/` — including the story design doc and `TODOS.md`/`docs/current-site-content.md` staleness. Docs cleanup is a separate backlog item.
- `public/` assets (images/videos referenced by dead components) — asset pruning is deferred with CSS.
- Every file in the KEEP list.
- `package.json` — no dependency removals in this plan (`@gsap/react`/`gsap` usage must be re-audited after deletion; see Maintenance notes).

## Git workflow

- Branch: `advisor/003-delete-dead-code`
- One commit, e.g. `refactor: delete dead components/libs/tests from past redesigns`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-verify the import graph before deleting

For each of the 12 components and 2 libs in the DELETE lists, confirm nothing outside the DELETE lists imports it:

```
for name in AsciiDissolve InlineDialogue HoverLink LabsGrid PageShell ParticleImage ParticleText ProjectGrid ProofMedia StorySection StoryToggle WorkAccordion; do
  echo "== $name"; grep -rln "components/$name\"\|\./$name\"" src/ test/ | grep -v "components/$name.tsx"
done
for name in particle-text ascii-dissolve; do
  echo "== lib/$name"; grep -rln "lib/$name\"" src/ test/ | grep -v "lib/$name.ts"
done
```

**Verify**: every hit printed is itself a file in one of the DELETE lists. If any file in the KEEP list (or any unlisted file) appears, STOP.

### Step 2: Delete the 18 files

`git rm` the 12 components, 2 lib modules, and 4 test files listed in Current state.

**Verify**: `ls src/components/ | wc -l` → 10 remaining components; `ls src/lib/` → exactly `displacement-physics.ts hover-card-bus.ts pretext-layout.ts text-scramble.ts`; `ls test/` → exactly `hover-card-bus.test.ts setup.ts`.

### Step 3: Prove nothing broke

```
npx tsc --noEmit && npx vitest run && npm run build
```

**Verify**: tsc exits 0; vitest runs 1 test file (hover-card-bus) with all tests passing; build exits 0.

### Step 4: Commit

One commit with all deletions.

**Verify**: `git status --porcelain` clean (do not commit `tsconfig.tsbuildinfo` if the build touched it); `git show --stat HEAD` shows only the 18 in-scope deletions.

## Test plan

No new tests in this plan — it only removes files. The remaining suite (`test/hover-card-bus.test.ts`) plus `tsc` and `next build` are the regression gates. Writing tests for the now-visibly-untested live libs (`pretext-layout`, `displacement-physics`, `text-scramble`) is a separate backlog item in `plans/README.md`.

## Done criteria

- [ ] All 18 files in the DELETE lists are gone from `git ls-files`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx vitest run` exits 0 (hover-card-bus tests pass)
- [ ] `npm run build` exits 0
- [ ] `grep -rn "ParticleText\|InlineDialogue\|ProjectGrid\|AsciiDissolve" src/ test/` → no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 shows any DELETE-list file imported by a KEEP-list or unlisted file — the import graph drifted since `550f54f`.
- Step 3 fails after deletion — do not "fix" live code to make it pass; the deletion set is wrong somewhere. Restore (`git checkout -- .`), report which check failed.
- The operator/owner has stated (in the dispatch message or a newer commit touching StoryToggle/StorySection) that the story feature is being revived — deleting those two would then be wrong; report instead.

## Maintenance notes

- **Recovery**: any deleted file is retrievable with `git show 550f54f:src/components/<Name>.tsx`. If the story feature is revived, restore `StoryToggle.tsx`/`StorySection.tsx` from history alongside the design doc `docs/plans/2026-04-11-feat-story-toggle-homepage.md`.
- **Deferred follow-ups** (in `plans/README.md` backlog): prune orphaned CSS in `globals.css`; re-audit whether `gsap`/`@gsap/react` and any `public/` assets are still referenced after this lands (if not, remove the deps in their own commit); write tests for the live lib modules.
- Reviewer should scrutinize: that the diff is deletions-only, and that `page.tsx`/`layout.tsx` are untouched.
