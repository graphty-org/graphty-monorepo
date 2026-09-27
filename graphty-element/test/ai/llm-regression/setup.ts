/**
 * @file Setup for the "llm-regression" vitest project.
 */

import { afterEach } from "vitest";

// Strict state: every session created in these tests checks that project state changes only
// through the dispatcher (src/session/project/strict.ts, design/undo/undo-design.md section 12.1).
// A plain global rather than an import, so this file reaches nothing under src/ at setup time.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
// Its full sweep after each test: no typed array state kept was written in place.
afterEach(() => {
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();
});
