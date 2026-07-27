import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · Prithvi",
  description: "How this site measures visits and stores local progress.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-20 text-(--ink)">
      <a
        href="/"
        className="mb-12 inline-block text-xs text-(--ink)/40 underline decoration-(--ink)/15 underline-offset-4 transition-colors hover:text-(--ink)/75"
      >
        ← back
      </a>

      <h1 className="mb-8 text-2xl font-medium tracking-tight">privacy</h1>

      <div className="space-y-7 text-sm leading-7 text-(--ink)/60">
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-(--ink)/40">
            Analytics
          </h2>
          <p>
            This site uses PostHog in cookieless mode to understand visits,
            active time, performance, and which parts of the page people use.
            PostHog does not store its identifiers in your cookies, local
            storage, or session storage. Person profiles and session replay are
            disabled.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-(--ink)/40">
            What is collected
          </h2>
          <p>
            Events can include page views, referrer and campaign information,
            browser and device details, approximate region derived by the
            analytics provider, performance metrics, errors, clicks, content
            previews, XP, and achievement progress. The site does not send the
            text entered in edit mode as an analytics property.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-(--ink)/40">
            Local progress
          </h2>
          <p>
            Theme, XP, achievements, and any content edits you save are kept
            locally in your browser so the site can remember them. They are not
            account data and can be removed with the site&apos;s reset controls
            or by clearing browser storage.
          </p>
        </section>

        <p className="text-xs text-(--ink)/38">
          Analytics is processed by{" "}
          <a
            href="https://posthog.com/privacy"
            rel="noreferrer"
            className="underline decoration-(--ink)/20 underline-offset-4 transition-colors hover:text-(--ink)/65"
          >
            PostHog
          </a>
          . This notice will be updated if the site&apos;s data collection
          changes.
        </p>
      </div>
    </main>
  );
}
