# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

## Available skills

- `/office-hours` — Office hours sessions
- `/plan-ceo-review` — CEO review planning
- `/plan-eng-review` — Engineering review planning
- `/plan-design-review` — Design review planning
- `/design-consultation` — Design consultation
- `/design-shotgun` — Design shotgun review
- `/review` — Code review
- `/ship` — Ship code
- `/land-and-deploy` — Land and deploy
- `/canary` — Canary deployment
- `/benchmark` — Benchmarking
- `/browse` — Web browsing (use this for all browsing)
- `/connect-chrome` — Connect to Chrome
- `/qa` — QA testing
- `/qa-only` — QA only (no fixes)
- `/design-review` — Design review
- `/setup-browser-cookies` — Set up browser cookies
- `/setup-deploy` — Set up deployment
- `/retro` — Retrospective
- `/investigate` — Investigate issues
- `/document-release` — Document a release
- `/codex` — Codex
- `/cso` — CSO review
- `/autoplan` — Auto-planning
- `/careful` — Careful mode
- `/freeze` — Freeze deployments
- `/guard` — Guard mode
- `/unfreeze` — Unfreeze deployments
- `/gstack-upgrade` — Upgrade gstack

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

## Testing

- **Framework:** Vitest + @testing-library/react
- **Run:** `npm test` (or `npx vitest run`)
- **Test directory:** `test/`
- **Config:** `vitest.config.ts`

When writing new functions, write a corresponding test. When fixing a bug, write a regression test.
