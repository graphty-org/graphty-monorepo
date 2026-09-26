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

    it("refuses an edge batch that would cross it, whole, before storing any of it", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);

        const error = codeOf(() => {
            dataManager.addEdges([
                { source: "a", target: "b" },
                { source: "b", target: "c" },
                { source: "c", target: "a" },
            ]);
        });

        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.deepStrictEqual(error.details, { limit: 2, count: 3, of: "edges", graph: { nodes: 3, edges: 0 } });
        // Not even the two that would have fit: a caller retrying with a subset starts from the
        // graph it had.
        assert.strictEqual(dataManager.edges.size, 0);
        // The store held none of them either: a batch that fills the ceiling exactly still fits.
        assert.doesNotThrow(() => {
            dataManager.addEdges([
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ]);
        });
    });

    it("keeps the old edges when a replacement set is past it", async () => {
        // This is `edgeData`: a host that assigns too many edges must end with the graph it had,
        // not with its old edges gone and none of the new ones held.
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.setEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const before = [...dataManager.edges.keys()];

        let reported: unknown;
        try {
            await graph.setEdges([
                { source: "a", target: "c" },
                { source: "c", target: "b" },
                { source: "b", target: "a" },
            ]);
        } catch (error) {
            reported = error;
        }

        assert.strictEqual((reported as GraphtyError).code, "E_TOO_LARGE");
        assert.deepStrictEqual((reported as GraphtyError).details, {
            limit: 2,
            count: 3,
            of: "edges",
            graph: { nodes: 3, edges: 2 },
        });
        assert.deepStrictEqual([...dataManager.edges.keys()], before);
        assert.strictEqual(dataManager.getEdgesBetween("a", "c").length, 0);
    });

    it("counts a replacement set against an emptied graph, not on top of the edges it replaces", async () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.setEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);

        await graph.setEdges([
            { source: "a", target: "c" },
            { source: "c", target: "b" },
        ]);

        assert.strictEqual(dataManager.edges.size, 2);
        assert.strictEqual(dataManager.getEdgesBetween("a", "c").length, 1);
    });

    it("does not count a record that would be rejected, or a repeat that would be folded", () => {
        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        dataManager.addEdges([{ source: "a", target: "b" }]);

        // A record with no storable endpoints never becomes an edge, and a repeat under a folding
        // policy folds into the edge it repeats -- so neither is a load the renderer has to draw,
        // whether the repeat is of a held edge or of a record earlier in the same batch.
        assert.doesNotThrow(() => {
            dataManager.addEdges(
                [
                    { source: null, target: "b" },
                    { source: "a", target: "b" },
                    { source: "b", target: "c" },
                    { source: "b", target: "c" },
                ],
                { repeated: "sum" },
            );
        });
        assert.strictEqual(dataManager.edges.size, 2);
        assert.strictEqual(dataManager.getEdgesBetween("b", "c").length, 1);
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
