/**
 * @file The element declines a load past the render ceiling instead of freezing the tab.
 *
 * THE DEFECT THIS PINS (issue #405). `DEFAULT_LIMITS` published a render ceiling nothing
 * enforced, and the renderer past its real ceiling did not degrade -- the renderer process ran
 * out of memory and the page never drew another frame. The limits are mocked small here so the
 * behaviour at the ceiling is testable without loading a hundred thousand records; the numbers
 * themselves are pinned by test/session/limits.test.ts.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { GraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import type { DataManager } from "../../src/managers/DataManager";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

vi.mock("../../src/session/limits", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../src/session/limits")>();
    return {
        ...original,
        DEFAULT_LIMITS: Object.freeze({ ...original.DEFAULT_LIMITS, renderCeiling: 3, edgesDrawn: 2 }),
    };
});

/** The coded error a call threw; fails the test when it threw nothing. */
function codeOf(fn: () => void): GraphtyError {
    return assert.throws(fn) as unknown as GraphtyError;
}

describe("the render ceiling", () => {
    let graph: Graph;
    let dataManager: DataManager;

    beforeEach(async () => {
        graph = await createTestGraph();
        dataManager = graph.getDataManager();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    it("holds a graph exactly at the ceiling", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        dataManager.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);

        assert.strictEqual(dataManager.nodes.size, 3);
        assert.strictEqual(dataManager.edges.size, 2);
    });

    it("refuses a node batch that would cross it, whole, with E_TOO_LARGE naming the limit", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }]);

        const error = codeOf(() => {
            dataManager.addNodes([{ id: "c" }, { id: "d" }]);
        });

        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.deepStrictEqual(error.details, { limit: 3, count: 4, of: "nodes", graph: { nodes: 2, edges: 0 } });
        assert.include(error.message, "3");
        // Refused whole: the node that would have fit is not held either, so a caller retrying
        // with a subset starts from the graph it had.
        assert.strictEqual(dataManager.nodes.size, 2);
    });

    it("does not count a re-supplied node against the ceiling", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);

        // Every id is already held, so the batch adds nothing and is not a load past the ceiling
        // -- this is what a host that re-assigns nodeData on every render does.
        assert.doesNotThrow(() => {
            dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        });
        assert.strictEqual(dataManager.nodes.size, 3);
    });

    it("refuses the edge that would cross it and keeps the edges before it", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);

        const error = codeOf(() => {
            dataManager.addEdges([
                { source: "a", target: "b" },
                { source: "b", target: "c" },
                { source: "c", target: "a" },
            ]);
        });

        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.deepStrictEqual(error.details, { limit: 2, count: 3, of: "edges", graph: { nodes: 3, edges: 2 } });
        assert.strictEqual(dataManager.edges.size, 2);
    });

    it("counts an edge whose endpoints have not arrived, because the store already holds it", () => {
        // A pending edge is in the store and will be drawn the moment its nodes arrive, so it is
        // part of what the renderer will have to draw.
        dataManager.addEdges([
            { source: "x", target: "y" },
            { source: "y", target: "z" },
        ]);

        const error = codeOf(() => {
            dataManager.addEdges([{ source: "z", target: "x" }]);
        });

        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.strictEqual(error.details.of, "edges");
    });
});
