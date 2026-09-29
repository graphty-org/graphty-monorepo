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

    graph.setData({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });
    cleanupTestGraph(graph);
    graph = null;
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.deepEqual(
        errors.mock.calls.map((call) => String(call[0])),
        [],
        "the cancelled step is teardown, not an error",
    );
});
