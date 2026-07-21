import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS,
  TOTALS,
  award,
  inspectEnd,
  inspectStart,
  onXpFx,
  onXpToast,
  levelFor,
  resetXp,
  unlockedAchievements,
  useXp,
} from "@/lib/xp";
import { renderHook, act } from "@testing-library/react";

beforeEach(() => {
  resetXp();
});

afterEach(() => {
  vi.useRealTimers();
});

function currentState() {
  const { result } = renderHook(() => useXp());
  return result.current;
}

describe("xp store", () => {
  it("awards xp once per id", () => {
    act(() => {
      award("proof:a", 2);
      award("proof:a", 2);
      award("lore:b", 2);
    });
    const s = currentState();
    expect(s.total).toBe(4);
    expect(Object.keys(s.earned)).toHaveLength(2);
  });

  it("persists to localStorage and resets", () => {
    act(() => award("writing:x", 1));
    expect(JSON.parse(localStorage.getItem("prithvi-xp-v1")!).total).toBe(1);
    act(() => resetXp());
    expect(currentState().total).toBe(0);
    expect(localStorage.getItem("prithvi-xp-v1")).toBeNull();
  });

  it("emits an fx event on award", () => {
    const seen: string[] = [];
    const off = onXpFx((d) => seen.push(d.text));
    act(() => award("proof:c", 2));
    off();
    expect(seen).toContain("+2 xp");
  });

  it("inspectStart awards after the dwell time, inspectEnd cancels", () => {
    vi.useFakeTimers();
    inspectStart("proof:hover1");
    vi.advanceTimersByTime(700);
    expect(currentState().earned["proof:hover1"]).toBe(2);

    inspectStart("proof:hover2");
    inspectEnd("proof:hover2");
    vi.advanceTimersByTime(700);
    expect(currentState().earned["proof:hover2"]).toBeUndefined();
  });

  it("unlocks Proof of Work when every proof is inspected", () => {
    act(() => {
      for (let i = 0; i < TOTALS.proof; i++) award(`proof:${i}`, 2);
    });
    const names = unlockedAchievements(currentState()).map((a) => a.name);
    expect(names).toContain("Proof of Work");
  });

  it("announces newly unlocked achievements via toast", () => {
    const seen: string[] = [];
    const off = onXpToast((d) => seen.push(`${d.kind}:${d.title}`));
    act(() => award("genz:on", 5));
    off();
    expect(seen).toContain("achievement:Did Not Touch Grass");
    expect(ACHIEVEMENTS.find((a) => a.id === "did-not-touch-grass")!.done(currentState())).toBe(true);
  });

  it("maps xp totals to levels", () => {
    expect(levelFor(0).name).toBe("stranger");
    expect(levelFor(4).index).toBe(0);
    expect(levelFor(5).name).toBe("visitor");
    expect(levelFor(12).name).toBe("acquaintance");
    expect(levelFor(100).name).toBe("real one");
    expect(levelFor(100).next).toBeNull();
    expect(levelFor(6).next!.min).toBe(12);
  });
});
