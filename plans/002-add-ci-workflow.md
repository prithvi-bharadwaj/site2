# Plan 002: Add a GitHub Actions CI workflow that gates PRs on typecheck, tests, and build

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 550f54f..HEAD -- .github/ package.json vitest.config.ts tsconfig.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live repo before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `550f54f`, 2026-07-07

## Why this matters

Nothing enforces tests or typechecking on this repo. `CHANGELOG.md` (v0.1.1.0 "Removed" section) records: "CI workflow (OAuth scope limitation)" — CI was removed because the tool that pushed it lacked the `workflow` OAuth scope, not because CI was unwanted. Since then every PR (15+ merged) has relied on discipline. The repo is heavily agent-edited; a green suite (34 Vitest tests, clean `tsc --noEmit`, working `next build` — all verified at commit `550f54f`) is the only thing standing between an agent mistake and a broken deploy. A minimal workflow restores the gate.

## Current state

- `.github/` does not exist (verified: `ls .github` → no such file or directory).
- `package.json` scripts: `"build": "next build"`, `"test": "vitest run"`, `"lint": "next lint"`. Package manager is npm (`package-lock.json` present, no pnpm/yarn lockfiles).
- **There is NO ESLint config file** (no `.eslintrc*`, no `eslint.config.*` — verified via `git ls-files | grep -i eslint` → empty). Running `npm run lint` prompts interactively to create a config. Therefore **lint must NOT be part of this CI workflow**.
- Node in use locally: v22.
- Baseline at `550f54f`: `npx tsc --noEmit` exits 0; `npx vitest run` → 5 files, 34 tests, all pass.
- Deploys go through Vercel (`vercel.json` in root); Vercel runs `next build` on its own but does not run tests.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npx tsc --noEmit`  | exit 0, no output   |
| Tests     | `npx vitest run`    | 34 tests pass       |
| Build     | `npm run build`     | exit 0, ".next" produced |
| YAML sanity | `node -e "console.log(require('js-yaml') ? 'y' : 'n')"` is NOT available — instead verify with `npx --yes yaml-lint .github/workflows/ci.yml` OR just rely on `git push` + Actions tab | — |

## Scope

**In scope** (the only files you should create/modify):
- `.github/workflows/ci.yml` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `package.json` — do not add/rename scripts; the workflow calls existing ones.
- ESLint setup — there is no config; adding one is a separate decision (noted in `plans/README.md` backlog). Do not run `npm run lint` anywhere in this plan.
- Branch protection settings — requires repo admin UI/API; recommend in the report instead.
- `vercel.json` and any deploy configuration.

## Git workflow

- Branch: `advisor/002-add-ci-workflow`
- One commit, e.g. `ci: add test + typecheck + build workflow`
- Do NOT push or open a PR unless the operator instructed it. **Note**: pushing workflow files requires a token with the `workflow` scope — see STOP conditions.

## Steps

### Step 1: Create the workflow file

Create `.github/workflows/ci.yml` with exactly this content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npm run build
```

**Verify**: `cat .github/workflows/ci.yml` matches the block above; file is valid YAML (correct 2-space indentation, no tabs).

### Step 2: Prove the pipeline is green locally

Run the exact commands the workflow will run, in order:

```
npm ci && npx tsc --noEmit && npx vitest run && npm run build
```

**Verify**: overall exit code 0; vitest reports all tests passed (34 at planning time — a different passing count is fine if other plans landed first).

### Step 3: Commit

Commit `.github/workflows/ci.yml`.

**Verify**: `git status --porcelain` shows no unexpected modifications (a `.next/` build dir may exist — it is gitignored; `tsconfig.tsbuildinfo` may have been touched by the build — do NOT commit changes to it).

## Test plan

No new unit tests — the workflow itself is the test infrastructure. Step 2 is the local proof. Full end-to-end proof (a green run in the Actions tab) happens on first push, which the operator may need to do manually (see STOP conditions).

## Done criteria

- [ ] `.github/workflows/ci.yml` exists with the four gates: `npm ci`, `tsc --noEmit`, `vitest run`, `next build`
- [ ] The chained command in Step 2 exits 0 locally
- [ ] The workflow does NOT invoke `npm run lint`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A `.github/workflows/` directory already exists with any workflow (someone restored CI first — reconcile instead of overwriting).
- Step 2 fails: the baseline is broken; fixing source code is out of scope for this plan. Report which command failed and its output.
- You are instructed to push and the push is rejected with a message about the `workflow` scope (`refusing to allow an OAuth App to create or update workflow`). This is the exact failure that killed CI before. Report it: the fix is for the owner to push this branch from their own terminal (`git push` with their credentials) or re-auth `gh` with `gh auth refresh -s workflow`.

## Maintenance notes

- When an ESLint config is added later (backlog item), append `- run: npm run lint` to the workflow — but only after `npm run lint` runs non-interactively.
- Plan 003 deletes several test files; CI passes regardless since it runs whatever suite exists. If Plan 003 lands first, the vitest count in Step 2 will be lower — that is expected.
- Recommend to the owner (not executable here): enable branch protection on `main` requiring the `ci` check, so the gate actually blocks merges.
- The build step catches Next-specific breakage (bad imports in server components, metadata errors) that tsc alone misses — do not "optimize" it away.
