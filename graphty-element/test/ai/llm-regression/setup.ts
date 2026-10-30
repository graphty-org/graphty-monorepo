/**
 * @file Setup for the "llm-regression" vitest project.
 */

import { afterAll, afterEach, beforeAll } from "vitest";

// Strict state: every session created in these tests checks that project state changes only
// through the dispatcher (src/session/project/strict.ts, design/undo/undo-design.md section 12.1).
// A plain global rather than an import, so this file reaches nothing under src/ at setup time.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
// Its full sweep after each test: no typed array state kept was written in place.
afterEach(() => {
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__?.();
});

// What a run cost: the harness counts every request it sends to the model.
const counter = globalThis as { __LLM_REGRESSION_API_CALLS__?: number };
beforeAll(() => {
    counter.__LLM_REGRESSION_API_CALLS__ = 0;
});
// On Google, the run's transport (test/helpers/llm-regression-gemini.ts) deletes its caches and adds the tokens and
// the cost at the tier and cache prices to the line; tools/llm-spend.mjs sums the costs of a run's lines.
afterAll(async () => {
    const gemini = (globalThis as { __LLM_REGRESSION_GEMINI__?: { close(): Promise<unknown>; summary(): string } })
        .__LLM_REGRESSION_GEMINI__;
    await gemini?.close();
    console.log(`[llm-regression] API calls: ${counter.__LLM_REGRESSION_API_CALLS__ ?? 0}${gemini?.summary() ?? ""}`);
});
