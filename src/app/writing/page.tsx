import { PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Writing — Prithvi",
  description: "Occasional notes on building things — WebGL, creative coding, systems design, and finishing what you start.",
  openGraph: {
    title: "Writing — Prithvi",
    description: "Occasional notes on building things — WebGL, creative coding, systems design, and finishing what you start.",
    type: "website",
  },
};

interface Entry {
  date: string;
  title: string;
  excerpt: string;
  href: string;
}

const entries: Entry[] = [
  {
    date: "2026-03",
    title: "On building things nobody asked for",
    excerpt:
      "There's a specific kind of project that only exists because you wanted it to. No spec, no stakeholder, no user research. Just a question: what if this existed? I've shipped a few of those, and I think they've taught me more than anything with a roadmap.",
    href: "#",
  },
  {
    date: "2026-01",
    title: "WebGL isn't scary — the coordinate systems are",
    excerpt:
      "Every time I start a new WebGL project I spend the first hour confused about why nothing is appearing on screen. It's never the shader. It's the clip space, or the texture orientation, or the projection matrix. Here's what I've internalized so far.",
    href: "#",
  },
  {
    date: "2025-11",
    title: "The case for finishing small things",
    excerpt:
      "Ambition is easy. Starting is easy. The difficult thing is the Tuesday afternoon when the interesting part is done and what remains is the 30% that just needs doing. Some notes on why I started setting artificial scope limits.",
    href: "#",
  },
  {
    date: "2025-09",
    title: "Noise functions as design material",
    excerpt:
      "Perlin noise, simplex noise, curl noise — these are usually taught as tricks for terrain or fire effects. But they're more general than that. Any time you want something that feels alive rather than random, noise is worth thinking about.",
    href: "#",
  },
  {
    date: "2025-07",
    title: "What games get right about feedback loops",
    excerpt:
      "The best games teach you how to play them without ever stopping to explain. The best software does this too. I've been thinking about what interaction designers could steal from level design, and the list is longer than expected.",
    href: "#",
  },
];

function WritingEntry({ entry, isLast }: { entry: Entry; isLast: boolean }) {
  return (
    <div data-animate>
      <p className="text-white/25 text-xs mb-1">{entry.date}</p>
      <h2 className="text-white text-sm font-bold mb-2">{entry.title}</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-3">
        {entry.excerpt}
      </p>
      <a
        href={entry.href}
        className="text-white/30 text-xs hover:text-white transition-colors duration-200"
      >
        → read
      </a>
      {!isLast && (
        <div className="text-white/10 text-xs my-6">{"──────────────────────────────────────────"}</div>
      )}
    </div>
  );
}

export default function WritingPage() {
  return (
    <PageShell title="writing">
      <p data-animate className="text-white/40 text-sm mb-10">
        occasional notes on building things
      </p>
      {entries.map((entry, i) => (
        <WritingEntry key={entry.title} entry={entry} isLast={i === entries.length - 1} />
      ))}
    </PageShell>
  );
}
