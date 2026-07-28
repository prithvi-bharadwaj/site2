import "@testing-library/jest-dom/vitest";

// jsdom has no canvas backend; return null instead of logging "Not implemented"
// so canvas-rendered features (trap cloth, trails) degrade silently in tests.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
