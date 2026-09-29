import "@testing-library/jest-dom";
// Import Mantine CSS for browser tests that check computed styles
import "@mantine/core/styles.css";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Strict state: every graphty-element these tests create checks that its project state changes
// only through the element's dispatcher. Set before any test file loads the element, which reads
// it once. A plain global, so this file imports nothing from the element.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;

// Cleanup after each test case
afterEach(() => {
    cleanup();
    // Strict state's end-of-test check that no typed array the element's state kept was written in
    // place. Registered by the element once a test has loaded it.
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();
});
