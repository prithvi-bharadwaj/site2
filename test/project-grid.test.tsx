import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProjectGrid, type Project } from "@/components/ProjectGrid";

const PROJECTS: Project[] = [
  {
    title: "alpha",
    description: "First project description here",
    stack: ["TypeScript", "React", "Node.js", "Extra"],
    github: "https://github.com/test/alpha",
    live: "https://alpha.dev",
  },
  {
    title: "beta",
    description: "Second project",
    stack: ["Rust", "WASM"],
  },
];

afterEach(cleanup);

describe("ProjectGrid", () => {
  it("renders all project cards with titles", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("truncates stack to 3 items on cards", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    // alpha has 4 stack items, card should show first 3 joined
    expect(screen.getByText("TypeScript · React · Node.js")).toBeInTheDocument();
  });

  it("opens modal on card click", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    fireEvent.click(screen.getByText("alpha"));
    // Modal shows full stack with double-space separators
    expect(screen.getByText(/TypeScript.*React.*Node\.js.*Extra/)).toBeInTheDocument();
  });

  it("shows github and live links in modal when present", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    fireEvent.click(screen.getByText("alpha"));
    expect(screen.getByText("[github] →")).toBeInTheDocument();
    expect(screen.getByText("[live] →")).toBeInTheDocument();
  });

  it("hides github/live links when not present", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    fireEvent.click(screen.getByText("beta"));
    expect(screen.queryByText("[github] →")).not.toBeInTheDocument();
    expect(screen.queryByText("[live] →")).not.toBeInTheDocument();
  });

  it("closes modal on Escape key", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    fireEvent.click(screen.getByText("alpha"));
    // Modal is open
    expect(screen.getByText("[esc]")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    // Modal should be closed — full stack text gone
    expect(screen.queryByText("[esc]")).not.toBeInTheDocument();
  });

  it("closes modal on backdrop click", () => {
    render(<ProjectGrid projects={PROJECTS} />);
    fireEvent.click(screen.getByText("alpha"));

    // Click the backdrop (the outer fixed div)
    const backdrop = screen.getByText("[esc]").closest(".fixed");
    if (backdrop) fireEvent.click(backdrop);

    expect(screen.queryByText("[esc]")).not.toBeInTheDocument();
  });
});
