import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExitGate } from "@/components/ExitGate";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(cleanup);

describe("ExitGate", () => {
  it("does not open when the pointer only leaves an element", () => {
    render(
      <>
        <div data-testid="inside">inside</div>
        <ExitGate />
      </>
    );

    fireEvent.mouseOut(screen.getByTestId("inside"), {
      clientY: 0,
      relatedTarget: null,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when the pointer leaves the top of the viewport", () => {
    render(<ExitGate />);

    fireEvent.mouseLeave(document.documentElement, {
      clientY: 0,
      relatedTarget: null,
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
