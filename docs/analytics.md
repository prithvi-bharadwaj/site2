# Site analytics

The site uses PostHog for cookieless, anonymous web and product analytics.
Session replay and person profiles are disabled.

## Configure

1. Create a free PostHog project in the region where you want the data stored.
2. In **Project Settings → Web analytics**, enable **Cookieless server hash
   mode**. PostHog ignores cookieless events unless this project setting is on.
3. Add the following to the Vercel **Production** environment:

```bash
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=/garden
NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com
```

The `/garden` path is a first-party Next.js proxy to PostHog's US region. For an
EU project, change the three destinations in `next.config.ts` from `us` to `eu`
and set the UI host to `https://eu.posthog.com`. The code is a safe no-op when
the project token is absent. Production Vercel builds fail fast when the token
is missing; local builds remain token-optional. `app_environment` and
`app_release` are populated automatically from Vercel's environment and Git
commit variables, with optional overrides documented in `.env.example`.

Do not put the production token in `.env.local` for normal development. This
keeps local traffic out of the production project. If previews need analytics,
use a separate PostHog project or token and set `NEXT_PUBLIC_APP_ENV=preview`.

## Privacy behavior

- `cookieless_mode: "always"` prevents PostHog from storing identifiers in
  cookies, local storage, or session storage.
- The SDK loads as an asynchronous chunk and sends through the first-party
  `/garden` proxy, keeping it off the initial render path and reducing losses
  to domain-based blockers.
- Session replay, surveys, and person profiles are disabled.
- No user is identified and no text entered in edit mode is sent as a custom
  analytics property.
- Old PostHog persistence and the retired cookie-consent demo cookies are
  cleared once the new client loads.
- The site still uses first-party local storage for theme, XP/achievements, and
  saved edits. This functional storage remains on the visitor's device.
- The public explanation lives at `/privacy`.

## Event contract

Every custom event includes:

| Property | Meaning |
| --- | --- |
| `analytics_mode` | Always `cookieless`. |
| `app_environment` | `production`, `preview`, `development`, or an explicit value. |
| `app_release` | Git SHA or an explicit release string. |

Custom events:

| Event | Purpose |
| --- | --- |
| `site_interaction` | One atomic visitor action. Use this for action averages. |
| `site_outcome` | The state/result caused by an action, such as a theme change or expanded item. |
| `site_signal` | Passive context such as scroll depth, visible time, pointer exploration, or exit intent. |
| `xp_earned` | XP source, amount, and running total. |
| `achievement_unlocked` | Every achievement, with stable ID and name. |
| `level_reached` | XP level progression. |
| `contact_links_unlocked` | Visitor crossed the contact-link XP threshold. |
| `site_error` | Error surfaced by the Next.js error boundary. |

PostHog additionally captures page views, page leaves, Web Vitals, exceptions,
rage clicks, and raw control activity. These are diagnostics and are not part
of the meaningful-action KPI.

## Metric contract

Create one dashboard named **Site health** with these saved insights:

1. **Visitors:** PostHog web analytics visitors, filtered to
   `app_environment = production`. Treat this as an anonymous cookieless
   estimate, not a cross-device identity count.
2. **Average actions per visitor:** `site_interaction` total count divided by
   unique users, filtered to production. Do not include `site_outcome`,
   `site_signal`, or `$autocapture`.
3. **Engaged visits:** percentage of sessions with either
   `site_signal.interaction = visible_time_reached` and `seconds >= 30`, or
   `scroll_depth_reached` and `percent >= 75`.
4. **Content interest:** unique users reaching
   `site_interaction.interaction = preview_opened`, broken down by `media_id`,
   plus `site_outcome.interaction = list_item_expanded`, broken down by
   `item_title`.
5. **Contact intent funnel:** `$pageview` → `xp_earned` →
   `contact_links_unlocked` → `site_interaction` where
   `interaction = link_activated` and `section = socials`.
6. **Achievement completion:** `achievement_unlocked`, broken down by
   `achievement_id`.
7. **Friction:** rage clicks, exceptions, `site_error`, and
   `site_signal.interaction = exit_gate_shown`.

Use a weekly review window and annotate deployments with `app_release`. On a
low-traffic portfolio, inspect raw counts alongside averages and wait for a
reasonable sample before changing the site based on small percentage swings.

## Verification

```bash
npm test
npm run test:analytics-browser
```

The unit suite verifies cookieless initialization, action/outcome/signal
classification, legacy-state cleanup, and achievement emission. The browser
smoke test starts the real site with a test token, intercepts PostHog ingestion,
and verifies that loading the page and using a control produce analytics
requests without writing PostHog persistence.

After deployment, verify one production event in PostHog's live events view and
confirm its `analytics_mode`, `app_environment`, and `app_release` properties.
The Next.js rewrite proxy is already included. Confirm `/garden/e/` or
`/garden/i/v0/e/` returns `200` in production after deployment.
