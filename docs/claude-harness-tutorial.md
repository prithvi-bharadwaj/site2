# Your Claude Code Harness — How to Actually Use It

## The Big Picture

Your setup has a **core workflow loop** and **quality/learning tools** that plug into it.

```
/brainstorm  →  /blueprint  →  /work  →  /review  →  /retro
  "what?"        "how?"       "do it"    "check it"  "reflect"
```

`progress.json` is the glue — it saves your place so you can stop and resume anytime.

---

## progress.json — Your Save File

Think of it like a game save. It tracks where you are in a plan.

**Who creates it?** `/work` — when you start executing a blueprint plan.
**Who reads it?**
- `/progress` — shows you a dashboard
- `/work` — auto-resumes from where you left off
- `session-start.sh` hook — reminds you what you were doing when you open a new session
- `statusline.sh` hook — shows `M2.P3` (milestone 2, phase 3) in your status bar

**When does it die?** `/work` deletes it when all tasks are done.

### What it looks like

```json
{
  "plan": "docs/plans/2026-03-25-feat-portfolio.md",
  "currentMilestone": 2,
  "currentPhase": 1,
  "completedTasks": ["1.1", "1.2", "1.3"],
  "inProgress": "2.1",
  "totalTasks": 8,
  "branch": "feat/portfolio",
  "notes": "Layout done. Starting project cards.",
  "sessionHistory": [
    {
      "date": "2026-03-25T10:00:00Z",
      "completed": ["1.1", "1.2", "1.3"],
      "notes": "Grid layout and responsive breakpoints done"
    }
  ]
}
```

---

## Full Example: Building a Portfolio Section

### Session 1 — Plan it

```
you:    I want to add a portfolio/projects section to my site
claude: [asks clarifying questions]

you:    /blueprint
claude: Creates docs/plans/2026-03-25-feat-portfolio.md
        - Milestone 1: Layout & grid (3 tasks)
        - Milestone 2: Project cards with hover effects (3 tasks)
        - Milestone 3: Filtering & animation (2 tasks)

you:    looks good, let's go

you:    /work docs/plans/2026-03-25-feat-portfolio.md
claude: Creates progress.json, starts task 1.1
        Completes 1.1, 1.2, 1.3
        → "Milestone 1 complete. Want to continue or take a break?"

you:    break for now
```

Your status line now shows: `opus | feat/portfolio | M1.P3 | ████░░░░ 38% | $1.20`

### Session 2 — Resume it

```
[you open claude code]
hook:   "Previous session: 3 tasks done, 5 remaining. Branch: feat/portfolio"

you:    /progress
claude: Shows dashboard:
        ✅ Milestone 1: Layout & grid (3/3)
        🔧 Milestone 2: Project cards (0/3)  ← YOU ARE HERE
        ⬜ Milestone 3: Filtering (0/2)

you:    /work docs/plans/2026-03-25-feat-portfolio.md
claude: "Resuming from Milestone 2, task 2.1..."
        Picks up exactly where you left off
```

### Session 3 — Ship it

```
you:    /work docs/plans/2026-03-25-feat-portfolio.md
claude: Finishes remaining tasks
        → Deletes progress.json (work complete)
        → Marks plan as status: completed

you:    /review
claude: Runs parallel review agents (architecture, security, simplicity, perf)
        Finds 2 issues, fixes them with commits

you:    /retro
claude: "This week: 1 feature shipped, 8 tasks across 3 sessions..."
```

---

## Skills You Haven't Used Yet

### Quality Skills

| Skill | When to use | What it does |
|-------|-------------|--------------|
| `/review` | After finishing a feature | Runs 4+ parallel agents (architecture, security, simplicity, perf). Finds issues AND fixes them — not just a report. |
| `/qa-check` | Quick sanity check on a page/feature | Lighter than /review. Finds issues, fixes with atomic commits. Has a "WTF heuristic" — if it's making things worse, it stops. |
| `/debug` | When something's broken | Investigates before fixing. One hypothesis at a time. Stops after 3 failures and questions the architecture instead of guessing. |

**Try this now:**
```
/qa-check src/pages/index.astro
```

### Learning Skills

| Skill | When to use | What it does |
|-------|-------------|--------------|
| `/learned` | After solving a tricky bug or finishing something non-trivial | Documents problem → root cause → solution → prevention. Creates reusable knowledge. |
| `/teach-me` | When you want to understand what just happened | Explains in plain language with analogies and ASCII diagrams. |
| `/retro` | End of week | Shows shipping velocity, session patterns, fix ratio from actual git history. |
| `/improve` | After any skill runs | Quick feedback: "that worked" or "that didn't help". Feeds into `/health`. |
| `/health` | Weekly or when something feels off | Shows which skills work well, which need tuning. |

**Try this after your next feature:**
```
/learned
```
It'll ask what you just solved and turn it into a knowledge entry.

**Try this after any skill runs:**
```
/improve that worked, the review caught a real bug
```
or
```
/improve that was too slow, took 5 minutes for a small file
```

---

## The Feedback Loop

Your harness has a self-improvement cycle built in:

```
/improve  →  skill-runs.jsonl  →  /health  →  /autoresearch
  "how'd      (logged by           "what's      "auto-fix
   it go?"     hook)                working?"     the skill"
```

1. Every skill invocation is logged by the `skill-observe.sh` hook
2. `/improve` adds your feedback to that log
3. `/health` analyzes patterns across runs
4. `/autoresearch` can auto-improve a skill that's underperforming

---

## Quick Reference — When to Reach for What

| Situation | Skill |
|-----------|-------|
| "I have a vague idea" | `/brainstorm` |
| "I know what I want, need a plan" | `/blueprint` |
| "Let's build it" | `/work` |
| "Where was I?" | `/progress` |
| "Is this code good?" | `/review` |
| "Quick check before I merge" | `/qa-check` |
| "Something's broken" | `/debug` |
| "That was tricky, want to remember it" | `/learned` |
| "Explain what just happened" | `/teach-me` |
| "How was my week?" | `/retro` |
| "That skill was great/bad" | `/improve` |
| "Are my skills working well?" | `/health` |
| "This skill needs to be better" | `/autoresearch` |

---

## Tips

- **You can skip steps.** Don't need a blueprint for a quick fix — just do it. The workflow is there for bigger features.
- **Milestones are break points.** `/work` pauses at each milestone. Perfect for "I have 30 minutes" sessions.
- **`/improve` after every skill** builds up data for `/health`. Even a quick "that worked" helps.
- **`/learned` is for YOU**, not the code. It captures *your* understanding so future-you (or future-Claude) can reference it.
- **`/review` fixes things.** It's not a linter report — it actually commits fixes.
