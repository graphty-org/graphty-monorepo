import "@testing-library/jest-dom";
// Import Mantine CSS for browser tests that check computed styles
import "@mantine/core/styles.css";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

// The element loader and the workspace are replaced by testStandIns() in vitest.config.ts, not by
// vi.mock here: a module mock switches the browser's cache off for the whole file (issue #3350).

// Strict state: every graphty-element these tests create checks that its project state changes
// only through the element's dispatcher. Set before any test file loads the element, which reads
// it once. A plain global, so this file imports nothing from the element.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
// Draw on demand: a graph that never set `renderOnDemand` stops drawing once its picture is still,
// instead of redrawing every frame in software (SwiftShader) for the whole test. Not the
// consumer's default; a test that needs continuous frames sets `renderOnDemand = false`.
(globalThis as { __GRAPHTY_TEST_RENDER_ON_DEMAND__?: boolean }).__GRAPHTY_TEST_RENDER_ON_DEMAND__ = true;

// These tests drive the page with real input (userEvent from vitest/browser, through the DevTools
// protocol), so every update it causes lands outside act() by design, and React, told this is an act
// environment, logged an "update ... not wrapped in act(...)" warning for each one: 435,000 in one
// run of the app's tests, which made every real-element test about 1.8 times slower and filled each
// shard's log with 90 MB (issue #3271). Testing Library's own render, fireEvent and waitFor still
// switch the act environment on for their duration. Registered after Testing Library's beforeAll,
// which sets the flag, so this runs second.
beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

// Cleanup after each test case
afterEach(() => {
    cleanup();
    // Strict state's end-of-test check that no typed array the element's state kept was written in
    // place. Registered by the element once a test has loaded it.
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();
});
