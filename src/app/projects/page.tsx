import { PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Projects — Prithvi",
  description: "A collection of things I've built — WebGL renderers, procedural tools, browser-based audio sequencers, and other experiments.",
  openGraph: {
    title: "Projects — Prithvi",
    description: "A collection of things I've built — WebGL renderers, procedural tools, browser-based audio sequencers, and other experiments.",
    type: "website",
  },
};

interface Project {
  title: string;
  description: string;
  stack: string[];
  github?: string;
  live?: string;
}

const projects: Project[] = [
  {
    title: "ascii-render",
    description:
      "Real-time ASCII video renderer using WebGL displacement maps. Characters respond to video luminance; pointer leaves a comet-trail distortion in the field.",
    stack: ["WebGL", "GLSL", "TypeScript", "Next.js"],
    live: "/",
  },
  {
    title: "terrain-sim",
    description:
      "Procedural terrain generation with erosion simulation. Hydraulic and thermal erosion run on the GPU; outputs tileable heightmaps and normal maps.",
    stack: ["WebGPU", "WGSL", "Rust", "WASM"],
  },
  {
    title: "sequencer",
    description:
      "A browser-based step sequencer with a programmable modulation system. Each step can hold a script that manipulates neighboring steps at runtime.",
    stack: ["Web Audio API", "TypeScript", "React"],
  },
  {
    title: "sprout",
    description:
      "Minimal task manager built around the idea that context is more valuable than priority. Tasks carry context snapshots so you can re-enter flow faster.",
    stack: ["Rust", "SQLite", "Tauri", "React"],
  },
  {
    title: "lightfield",
    description:
      "Experimental renderer that approximates light field photography in the browser. Drag to shift perspective; depth-of-field computed per-pixel in GLSL.",
    stack: ["Three.js", "GLSL", "TypeScript"],
  },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      data-animate
      className="border border-white/10 p-5 mb-4 hover:border-white/30 card-hover"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-white text-sm font-bold">┌ {project.title}</h2>
        <div className="flex gap-3 shrink-0">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 text-xs hover:text-white link-hover"
            >
              [github]
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 text-xs hover:text-white link-hover"
            >
              [live]
            </a>
          )}
        </div>
      </div>
      <p className="text-white/50 text-sm leading-relaxed mb-4">
        {project.description}
      </p>
      <p className="text-white/25 text-xs">
        {project.stack.join("  ·  ")}
      </p>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <PageShell title="projects">
      <p data-animate className="text-white/40 text-sm mb-8">
        things i&apos;ve built — some shipped, some experiments, some both
      </p>
      {projects.map((project) => (
        <ProjectCard key={project.title} project={project} />
      ))}
    </PageShell>
  );
}
