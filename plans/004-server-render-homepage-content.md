# Plan 004: Make the homepage content appear in the initial HTML (remove the hydration gate)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 550f54f..HEAD -- src/app/page.tsx src/components/PretextHero.tsx`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: perf (SEO / content availability)
- **Planned at**: commit `550f54f`, 2026-07-07

## Why this matters

The homepage currently ships **empty initial HTML**: `src/app/page.tsx` is a client component that returns `null` until a `hydrated` flag flips in a `useEffect`. Server-side rendering therefore emits nothing for `<main>` — no bio, no "Previously" list, no writing links. Search engines that don't execute JS, link-preview fetchers, and LLM scrapers reading raw HTML all see a blank page. This is especially self-defeating here: the site deliberately embeds LLM-targeted text (`src/components/PromptInjection.tsx`, rendered from the server layout) and its owner cares about being legible to AI scrapers — yet the actual credentials content is invisible to them. The fix is small because the gate exists only to avoid a flash of non-default content for the one user (the owner) who has localStorage content overrides.

## Current state

- `src/app/page.tsx` — `"use client"` component; all page content (PREVIOUSLY/LORE/WRITING/SOCIALS arrays) is defined here as constants; renders `<PretextHero>`, lists, socials.
  - Lines 240–245: hydration state
    ```tsx
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      setContent(loadContent());
      setHydrated(true);
    }, []);
    ```
  - Line 278: the gate — `if (!hydrated) return null;`
  - Lines 25–32: `loadContent()` reads `localStorage` key `prithvi-site-content-v3`, merged over `DEFAULTS`; guarded by `typeof window === "undefined"` and try/catch, so it is already SSR-safe.
  - Line 239: `const [content, setContent] = useState<Content>(DEFAULTS);` — initial render (server AND first client render) uses `DEFAULTS`, so removing the gate cannot cause a hydration mismatch: localStorage content is applied only via `setContent` inside `useEffect`, after hydration.
- `src/components/PretextHero.tsx` — client component, but already renders SEO-visible fallback markup before its canvas layout computes (lines 337–340):
    ```tsx
    <div className="sr-only">
      <h1>{greeting}</h1>
      <p>{bio}</p>
    </div>
    ```
  so hero text will appear in server HTML once the page-level gate is removed. The animated words render only after client layout (`layout?.words.map(...)`, line 342) — unchanged by this plan.
- Client components in Next.js App Router are still server-rendered to HTML on first load; the current blank page is caused solely by the `return null` gate, not by `"use client"`.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npx tsc --noEmit`  | exit 0, no output   |
| Tests     | `npx vitest run`    | all pass            |
| Build     | `npm run build`     | exit 0              |
| SSR proof | `npm run build && npm run start &` then `curl -s http://localhost:3000 \| grep -o "Previously:"` | prints `Previously:` |

## Scope

**In scope** (the only files you should modify):
- `src/app/page.tsx`
- `test/home-ssr.test.tsx` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `src/components/PretextHero.tsx` — its sr-only fallback already does the right thing.
- Converting `page.tsx` into a server component / splitting client islands. That is a larger refactor with the same SEO outcome; not worth the risk now. Do not attempt it.
- `src/components/EditPanel.tsx`, edit-mode behavior, localStorage schema.
- `src/app/layout.tsx`, metadata, `PromptInjection`.

## Git workflow

- Branch: `advisor/004-ssr-homepage-content`
- One commit, e.g. `fix: render homepage content in initial HTML (drop hydration gate)`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the gate

In `src/app/page.tsx`:

1. Delete line 278: `if (!hydrated) return null;`
2. Remove the now-unused `hydrated` state and its setter: delete `const [hydrated, setHydrated] = useState(false);` (line 240) and the `setHydrated(true);` line inside the effect (line 244). Keep `setContent(loadContent());` and the effect itself.

The effect should end up as:

```tsx
useEffect(() => {
  setContent(loadContent());
}, []);
```

**Verify**: `npx tsc --noEmit` → exit 0 (also proves no leftover references to `hydrated`); `grep -n "hydrated" src/app/page.tsx` → no matches.

### Step 2: Prove content is in the server HTML

```
npm run build
npm run start &
sleep 3
curl -s http://localhost:3000 > /tmp/home.html
grep -c "Previously:" /tmp/home.html
grep -c "buildspace" /tmp/home.html
kill %1
```

**Verify**: both greps print a count ≥ 1 (list labels and writing content present in raw HTML). Before this change, both would be 0.

### Step 3: Add a regression test

Create `test/home-ssr.test.tsx`, modeled structurally on `test/hover-card-bus.test.ts` (imports from vitest, plain assertions). Use `renderToString` to simulate server output:

```tsx
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Home from "@/app/page";

describe("homepage server render", () => {
  it("emits content in initial HTML (no hydration gate)", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Previously:");
    expect(html).toContain("Writing.");
    expect(html).toContain("Find me on.");
  });
});
```

Note: `renderToString` on a component using `useEffect` is fine (effects don't run on the server). If child components throw under `renderToString` because of browser-only API access *during render* (not in effects), that is a STOP condition — it means a component is not actually SSR-safe.

**Verify**: `npx vitest run` → all tests pass including the new file.

### Step 4: Commit

**Verify**: `git show --stat HEAD` lists only `src/app/page.tsx` and `test/home-ssr.test.tsx`.

## Test plan

- New: `test/home-ssr.test.tsx` (Step 3) — asserts server HTML contains the section labels; this is the regression test for the exact bug (blank SSR output).
- Existing suite must stay green: `npx vitest run`.
- Manual/visual: Step 2's curl proof. Optionally load the site with JS disabled — bio and lists should be readable.

## Done criteria

- [ ] `grep -n "hydrated" src/app/page.tsx` → no matches
- [ ] `curl` against a production build returns HTML containing `Previously:` and `Writing.`
- [ ] `npx tsc --noEmit` exits 0; `npx vitest run` exits 0 with the new SSR test passing
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in Current state don't match the live file (drift).
- Step 2's greps return 0 after the change — some other gate exists; investigate no further, report what the HTML contains.
- `renderToString` in Step 3 throws from a child component (browser API accessed during render) — fixing child components is out of scope.
- You feel the urge to restructure page.tsx into server + client islands — explicitly out of scope.

## Maintenance notes

- **Known accepted trade-off**: a user with localStorage content overrides (in practice: only the site owner using edit mode) now sees default content for one frame before their overrides apply. If this ever matters, the fix is an inline `<script>` that reads localStorage before paint — do not reintroduce `return null`.
- If the homepage is ever split into server/client components, keep the content arrays (PREVIOUSLY/LORE/WRITING) on the server side — they are the SEO payload.
- Reviewer should scrutinize: no behavioral change to edit mode (Cmd/Ctrl+E toggle at page.tsx:247–256) and GenZ mode.
