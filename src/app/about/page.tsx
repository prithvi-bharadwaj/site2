import { PageShell } from "@/components/PageShell";

export const metadata = {
  title: "About — Prithvi",
  description: "Developer and creative coder. I build things at the intersection of code and craft — from WebGL renderers to interactive tools.",
  openGraph: {
    title: "About — Prithvi",
    description: "Developer and creative coder. I build things at the intersection of code and craft — from WebGL renderers to interactive tools.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <PageShell title="about">
      <section className="mb-10">
        <p data-animate className="text-white/30 text-xs uppercase tracking-widest mb-4">
          [ who am i ]
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed mb-3">
          I build things. Software, mostly — but the impulse is the same whether
          it&apos;s a game, a tool, or something that has no practical use but feels
          right to make. I&apos;m drawn to the intersection of code and craft: places
          where the technical and the aesthetic are impossible to separate.
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed mb-3">
          I spend a lot of time thinking about systems — how they break, how they
          surprise you, and what happens when you push them past their intended
          edges. Some of my favorite work lives in that margin.
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed">
          Outside the screen: music (listening and occasionally making), long
          walks that turn into thinking sessions, and an unreasonable interest in
          how games communicate ideas without words.
        </p>
      </section>

      <section className="mb-10">
        <p data-animate className="text-white/30 text-xs uppercase tracking-widest mb-4">
          [ interests ]
        </p>
        <ul data-animate className="text-white/60 text-sm space-y-2">
          {[
            "systems design + emergent complexity",
            "creative coding + generative art",
            "game design + interactive narrative",
            "music — electronic, ambient, noise",
            "rendering pipelines + WebGL",
            "tools that get out of your way",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-white/20">─</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <p data-animate className="text-white/30 text-xs uppercase tracking-widest mb-4">
          [ background ]
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed mb-3">
          Started coding seriously in high school, mostly to make games that
          nobody played. Studied computer science in college, where I learned
          that the interesting problems were rarely the ones on the problem sets.
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed mb-3">
          Since then: worked on products used by a lot of people, built things
          on the side that were used by very few, and tried to stay curious about
          both. I&apos;ve shipped frontend systems, real-time backends, and at least
          one thing that probably shouldn&apos;t have worked but did.
        </p>
        <p data-animate className="text-white/70 text-sm leading-relaxed">
          Currently focused on creative and interactive work — the kind of
          software that has a point of view.
        </p>
      </section>
    </PageShell>
  );
}
