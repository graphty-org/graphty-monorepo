/**
 * @file `setData` returns nothing a caller can wait on, so a graph can be disposed while the step
 * it dispatched is still pending. Disposing cancels that step; the cancellation is teardown, not a
 * failure, and is not reported as one.
 */

import { afterEach, assert, it, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

let graph: Graph | null = null;

afterEach(() => {
    vi.restoreAllMocks();
    if (graph !== null) {
        cleanupTestGraph(graph);
        graph = null;
    }
});

it("disposing a graph while its setData is pending reports no error", async () => {
    graph = await createTestGraph();
    const errors = vi.spyOn(console, "error");
    // The step `setData` dispatches, so the test can wait for it to end. `setData` attaches its own
    // error handler to this promise before the test does, so once it has settled that handler has run.
    const step = vi.spyOn(graph as unknown as { applyData: (...args: unknown[]) => Promise<void> }, "applyData");

    graph.setData({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });
    cleanupTestGraph(graph);
    graph = null;
    assert.strictEqual(step.mock.results.length, 1, "setData dispatched one step");
    await Promise.allSettled(step.mock.results.map((result) => result.value as Promise<void>));

    assert.deepEqual(
        errors.mock.calls.map((call) => String(call[0])),
        [],
        "the cancelled step is teardown, not an error",
    );
});
