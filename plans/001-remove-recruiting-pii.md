# Plan 001: Remove recruiting contact lists (PII) from the public repo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 550f54f..HEAD -- docs/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live repo before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `550f54f`, 2026-07-07

## Why this matters

This repository is **public** (`https://github.com/prithvi-bharadwaj/site2`, visibility confirmed PUBLIC via `gh repo view`). Four tracked files under `docs/` are recruiting lead lists containing personal data about ~3,400 named third parties: email addresses (the stargazers CSV has an `email` column with ~122 populated emails; the hiring list reports "With email: 329"), plus numeric suitability scores and "Tier A / Tier B / Tier C" rankings of named individuals. Publishing scored hiring evaluations of real people with their contact info in a public repo is a privacy and reputational liability for the site owner (and awkward for Roam, his employer). Nothing on the live site reads these files — `docs/` is not served by Next.js (only `public/` is) — so removal has zero product impact.

## Current state

- `docs/ai-eng-hiring/ai-engineer-candidates.csv` — scraped candidate list, tracked in git.
- `docs/ai-eng-hiring/ai-engineer-candidates.md` — same data as ranked markdown. Header reads: "Total scraped: 1408 … With email: 329 … Tier A: 188 | Tier B: 284 | Tier C: 404", followed by per-person entries like "### 1. [NielsRogge](https://github.com/NielsRogge) **Score:** 10/10".
- `docs/claw-code-stargazers-contacts.csv` — CSV whose header row is `github_username,name,email,twitter,blog,company,location,bio,github_url,contact_tier`; ~122 rows contain `@` (emails).
- `docs/claw-code-stargazers-contacts.md` — markdown rendering of the same list.

All four are tracked (verified with `git ls-files docs/ | grep -i "hiring\|stargazer"` at commit `550f54f`).

Do NOT paste any row of these files (names, emails, scores) into commit messages, logs, or your final report. Refer to them only by path.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `npm ci`                         | exit 0              |
| Typecheck | `npx tsc --noEmit`               | exit 0, no output   |
| Tests     | `npx vitest run`                 | 34 tests pass (or current count) |
| Tracked?  | `git ls-files docs/ \| grep -iE "hiring\|stargazer"` | no output after fix |

## Scope

**In scope** (the only paths you should modify):
- `docs/ai-eng-hiring/` (delete directory)
- `docs/claw-code-stargazers-contacts.csv` (delete)
- `docs/claw-code-stargazers-contacts.md` (delete)
- `.gitignore` (add guard entries)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Everything else in `docs/` — other docs (`designs/`, `plans/`, `retros/`, copy docs) are legitimate project artifacts.
- Git history rewriting (`git filter-repo`, force-push). The data remains in history after this plan; purging history is a destructive, owner-only decision — see Maintenance notes.
- Anything under `src/`, `public/`, or config files other than `.gitignore`.

## Git workflow

- Branch: `advisor/001-remove-recruiting-pii` (branch from the current branch's HEAD).
- One commit, conventional style matching repo history (e.g. `chore: remove recruiting contact lists from public repo`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Preserve the data outside the repo

Copy the four files to a location outside the repository so the owner keeps the data (it took real effort to compile):

```
mkdir -p ~/Desktop/site2-recruiting-data-backup
cp -R docs/ai-eng-hiring ~/Desktop/site2-recruiting-data-backup/
cp docs/claw-code-stargazers-contacts.csv docs/claw-code-stargazers-contacts.md ~/Desktop/site2-recruiting-data-backup/
```

**Verify**: `ls ~/Desktop/site2-recruiting-data-backup/` → shows `ai-eng-hiring`, `claw-code-stargazers-contacts.csv`, `claw-code-stargazers-contacts.md`.

### Step 2: Delete the files from the repo

```
git rm -r docs/ai-eng-hiring
git rm docs/claw-code-stargazers-contacts.csv docs/claw-code-stargazers-contacts.md
```

**Verify**: `git ls-files docs/ | grep -iE "hiring|stargazer"` → no output.

### Step 3: Add .gitignore guards

Append to `.gitignore` (current contents end with `.vercel`):

```
# recruiting/lead lists must never be committed to this public repo
docs/ai-eng-hiring/
docs/*contacts*
```

**Verify**: `git check-ignore -v docs/claw-code-stargazers-contacts.csv` → prints a matching `.gitignore` rule (exit 0).

### Step 4: Confirm nothing else references the deleted files, then commit

```
grep -rn "ai-eng-hiring\|stargazers-contacts" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.json" src/ scripts/ package.json
```

Expected: no output (exit 1). Then commit the deletion + `.gitignore` change as one commit.

**Verify**: `git status --porcelain` → clean except untracked `plans/` files; `npx vitest run` → all tests still pass.

## Test plan

No new tests — this plan touches no code. The done criteria's grep checks are the regression guard.

## Done criteria

- [ ] `git ls-files | grep -iE "hiring|stargazer"` → no output
- [ ] `git check-ignore docs/ai-eng-hiring/x.csv` → exit 0 (rule active)
- [ ] `npx tsc --noEmit` exits 0 and `npx vitest run` passes (proves no accidental collateral)
- [ ] Backup exists outside the repo (Step 1 path)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The four files are already gone from `git ls-files` (someone else fixed it — mark plan DONE with a note instead of re-doing).
- You find additional files with third-party emails/scores under `docs/` beyond the four listed (report paths only; do not delete unlisted files on your own).
- Anything under `src/` or `scripts/` actually imports or reads these files (grep in Step 4 hits) — the "nothing reads these" assumption is false.

## Maintenance notes

- **History still contains the data.** After this lands, the files remain retrievable from old commits on GitHub. The owner should decide whether to (a) accept that (the lists stop being discoverable via the file tree and search), or (b) purge with `git filter-repo` + force-push + GitHub support request to drop cached views. Option (b) invalidates all clones and open PRs — owner-only call, deliberately out of scope here.
- If the owner wants these lists in version control, a private repo (or Roam's internal storage) is the right home.
- Reviewer should scrutinize: that the commit contains only deletions + `.gitignore`, and that no file content leaked into the commit message.
