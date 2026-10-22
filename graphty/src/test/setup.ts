import "@testing-library/jest-dom";
// Import Mantine CSS for browser tests that check computed styles
import "@mantine/core/styles.css";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

import { loadFrame } from "../workspace/frameLoader";

// The app defines <graphty-element> on demand (elementLoader.ts). Here it never loads it: a test
// that wants the real element imports "@graphty/graphty-element" itself (the real-element
// project), and every other test keeps the tag an empty box.
vi.mock("../elementLoader", () => ({ loadGraphtyElement: () => Promise.resolve() }));

// The project frame loads on demand in the app (workspace/frameLoader.ts); a test has it from the
// start, so a project it opens shows at once. Loaded before the file's tests and after its imports,
// so the file's own module mocks (Sentry's, most of all) are the ones the frame gets.
// A file that mocks a module the frame needs, and never opens a project, cannot load it, and does
// not need it.
beforeAll(async () => {
    await loadFrame().catch(() => undefined);
});

// Strict state: every graphty-element these tests create checks that its project state changes
// only through the element's dispatcher. Set before any test file loads the element, which reads
// it once. A plain global, so this file imports nothing from the element.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
// Draw on demand: a graph that never set `renderOnDemand` stops drawing once its picture is still,
// instead of redrawing every frame in software (SwiftShader) for the whole test. Not the
// consumer's default; a test that needs continuous frames sets `renderOnDemand = false`.
(globalThis as { __GRAPHTY_TEST_RENDER_ON_DEMAND__?: boolean }).__GRAPHTY_TEST_RENDER_ON_DEMAND__ = true;

// Cleanup after each test case
afterEach(() => {
    cleanup();
    // Strict state's end-of-test check that no typed array the element's state kept was written in
    // place. Registered by the element once a test has loaded it.
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();
});
