/**
 * @file The fixed layout places nodes from `data.position`, as the layout guide shows, and says so
 * when a node's data has no usable position instead of silently putting it at the origin.
 *
 * The guide once showed top-level `x`, `y`, `z` fields, which the engine never read: every node
 * landed at the origin with no warning (issue #2956).
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayoutWarningEvent } from "../../src/events";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("the fixed layout", () => {
    let graph: Graph;
    let warnings: Omit<LayoutWarningEvent, "type">[];

    beforeEach(async () => {
        graph = await createTestGraph();
        warnings = [];
        graph.addListener("layout-warning", (event) => {
            warnings.push({ layoutType: event.layoutType, code: event.code, params: event.params });
        });
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    /**
     * Load nodes, choose the fixed layout and let it publish.
     * @param nodes - the node records
     */
    async function placeFixed(nodes: Record<string, unknown>[]): Promise<void> {
        await graph.addNodes(nodes);
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        graph.update();
    }

    /**
     * Where a node is drawn.
     * @param id - the node
     * @returns its position
     */
    function at(id: string): { x: number; y: number; z: number } {
        const node = graph.getNode(id);
        assert.isDefined(node, `the graph has node "${id}"`);
        return { ...node.getPosition() };
    }

    it("places every node where the guide's example says, and warns about none", async () => {
        // The layout guide's example, verbatim.
        await placeFixed([
            { id: "a", position: { x: 0, y: 0, z: 0 } },
            { id: "b", position: { x: 100, y: 0, z: 0 } },
            { id: "c", position: { x: 50, y: 100, z: 0 } },
        ]);

        assert.deepEqual(at("a"), { x: 0, y: 0, z: 0 });
        assert.deepEqual(at("b"), { x: 100, y: 0, z: 0 });
        assert.deepEqual(at("c"), { x: 50, y: 100, z: 0 });
        assert.deepEqual(warnings, []);
    });

    it("reports W_NO_POSITION with how many nodes had no data position", async () => {
        // Top-level coordinates are not a position: the shape the guide used to show.
        await placeFixed([{ id: "a", position: { x: 10, y: 0, z: 0 } }, { id: "b", x: 100, y: 0, z: 0 }, { id: "c" }]);

        assert.deepEqual(at("a"), { x: 10, y: 0, z: 0 });
        assert.deepEqual(warnings, [{ layoutType: "fixed", code: "W_NO_POSITION", params: { missing: 2, total: 3 } }]);
    });
});
