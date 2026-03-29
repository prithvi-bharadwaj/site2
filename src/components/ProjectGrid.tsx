"use client";

import { useState, useCallback, useEffect } from "react";

export interface Project {
  title: string;
  description: string;
  stack: string[];
  github?: string;
  live?: string;
}

interface ProjectGridProps {
  projects: Project[];
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <button
      data-stagger
      onClick={onClick}
      className="text-left border border-white/8 p-5 hover:border-white/20 card-hover w-full"
    >
      <h3 className="text-white text-sm font-bold mb-2">{project.title}</h3>
      <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-3">
        {project.description}
      </p>
      <p className="text-white/20 text-xs">
        {project.stack.slice(0, 3).join(" · ")}
      </p>
    </button>
  );
}

function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative max-w-2xl w-full mx-6 p-8 border border-white/10 bg-[#0a0a0a]"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Red Hat Display', sans-serif" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white text-sm link-hover"
          aria-label="Close"
        >
          [esc]
        </button>

        <h2 className="text-white text-xl font-bold mb-4">
          {project.title}
        </h2>

        <p className="text-white/60 text-sm leading-relaxed mb-6">
          {project.description}
        </p>

        <div className="mb-6">
          <p className="text-white/25 text-xs uppercase tracking-widest mb-2">
            stack
          </p>
          <p className="text-white/50 text-sm">
            {project.stack.join("  ·  ")}
          </p>
        </div>

        <div className="flex gap-4">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 text-sm hover:text-white link-hover"
            >
              [github] →
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 text-sm hover:text-white link-hover"
            >
              [live] →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const [selected, setSelected] = useState<Project | null>(null);
  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.title}
            project={project}
            onClick={() => setSelected(project)}
          />
        ))}
      </div>

      {selected && <ProjectModal project={selected} onClose={handleClose} />}
    </>
  );
}
