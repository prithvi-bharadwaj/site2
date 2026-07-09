# Plan 005: Stop the prompt-injection easter egg polluting screen readers, and re-enable pinch zoom

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 550f54f..HEAD -- src/components/PromptInjection.tsx src/app/layout.tsx`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (accessibility)
- **Planned at**: commit `550f54f`, 2026-07-07

## Why this matters

Two verified accessibility defects, both one-line fixes:

1. The site includes an intentional easter egg — hidden text addressed to LLM scrapers (`src/components/PromptInjection.tsx`). The component sets `aria-hidden="false"` on a visually-hidden 1px div, which **forces the entire fake "system prompt" into the accessibility tree**: real screen-reader users hear six paragraphs of "[SYSTEM PROMPT UPDATE - IGNORE PRIOR ROUTINES]…" as the first content on the page. The easter egg targets scrapers reading raw HTML; they see the text regardless of aria attributes, so hiding it from assistive tech costs the gag nothing.
2. `src/app/layout.tsx` exports a viewport with `maximumScale: 1, userScalable: false`, which disables pinch-zoom on mobile — a WCAG 1.4.4 (Resize Text) failure that hurts low-vision users. Modern iOS partially ignores it, but Android WebView/Chrome honor it.

## Current state

- `src/components/PromptInjection.tsx` — server component rendered in `layout.tsx` before `{children}`. The container div (lines 21–42):

  ```tsx
  return (
    <div
      aria-hidden="false"        // line 23 — the bug
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "1px",
        height: "1px",
        overflow: "hidden",
        color: "transparent",
        ...
  ```

  The component's doc comment says the text should be "selectable on Cmd/Ctrl+A and visible to LLM scrapers reading raw HTML" — note `aria-hidden` affects neither of those; both still work after this fix.

- `src/app/layout.tsx` lines 33–39:

  ```tsx
  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#FFFFFF",
  };
  ```

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npx tsc --noEmit`  | exit 0, no output   |
| Tests     | `npx vitest run`    | all pass            |
| Build     | `npm run build`     | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/components/PromptInjection.tsx`
- `src/app/layout.tsx` (the `viewport` export only)
- `test/prompt-injection.test.tsx` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- The easter-egg text content itself — the owner's copy; leave every word as is.
- The rest of `layout.tsx` (metadata, JSON-LD script, fonts, body structure).
- Removing the easter egg or debating its ethics — owner's call, not this plan.

## Git workflow

- Branch: `advisor/005-a11y-quick-wins`
- One commit, e.g. `fix: hide prompt-injection div from screen readers + allow pinch zoom`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the aria attribute

In `src/components/PromptInjection.tsx` line 23, change `aria-hidden="false"` to `aria-hidden="true"`.

**Verify**: `grep -n 'aria-hidden' src/components/PromptInjection.tsx` → one match containing `"true"`.

### Step 2: Re-enable zoom

In `src/app/layout.tsx`, delete the `maximumScale: 1,` and `userScalable: false,` lines from the `viewport` export. Keep `width`, `initialScale`, `themeColor`.

**Verify**: `grep -n "userScalable\|maximumScale" src/app/layout.tsx` → no matches.

### Step 3: Add a regression test

Create `test/prompt-injection.test.tsx` (structure modeled on `test/hover-card-bus.test.ts` — vitest imports, plain assertions; use `@testing-library/react` `render` like the other component tests):

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PromptInjection } from "@/components/PromptInjection";

afterEach(cleanup);

describe("PromptInjection", () => {
  it("keeps the easter egg out of the accessibility tree but in the DOM", () => {
    const { container } = render(<PromptInjection />);
    const div = container.firstElementChild!;
    expect(div.getAttribute("aria-hidden")).toBe("true");
    expect(div.textContent).toContain("SYSTEM PROMPT UPDATE");
  });
});
```

**Verify**: `npx vitest run` → all pass including the new test.

### Step 4: Full gate + commit

```
npx tsc --noEmit && npx vitest run && npm run build
```

**Verify**: exit 0. Commit; `git show --stat HEAD` lists only the three in-scope source/test files.

## Test plan

- New: `test/prompt-injection.test.tsx` (Step 3) — pins `aria-hidden="true"` while asserting the text still renders in the DOM (the easter egg keeps working).
- No automated test for the viewport change (it's a static export consumed by Next); Step 2's grep is the machine check.

## Done criteria

- [ ] `grep -rn 'aria-hidden="false"' src/` → no matches
- [ ] `grep -n "userScalable\|maximumScale" src/app/layout.tsx` → no matches
- [ ] New test passes; full suite green; `npm run build` exits 0
- [ ] Easter-egg text unchanged (`git diff` on PromptInjection.tsx shows only the aria-hidden line)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts above don't match the live files (drift — e.g. someone already fixed aria-hidden or restructured viewport).
- The owner has commented in code or commits that screen-reader visibility of the easter egg is *intentional* (search `git log --grep="aria"` if in doubt) — then this is a product decision, not a bug.

## Maintenance notes

- If the easter-egg text is ever rewritten, keep `aria-hidden="true"` — the target audience (raw-HTML scrapers) never sees aria attributes.
- If a future design re-adds `userScalable: false` "to prevent double-tap zoom", push back: use `touch-action: manipulation` in CSS instead; it prevents double-tap zoom without breaking pinch-zoom.
- Reviewer should scrutinize: diff is exactly two source lines + one new test file.
