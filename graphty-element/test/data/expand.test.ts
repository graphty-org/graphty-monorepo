/**
 * @file Expanding a node hands the consumer's fetchNodes only real node ids, even when some of the
 * edges fetchEdges returned do not carry the endpoint spelling the batch resolved to.
 */
import { assert, describe, it } from "vitest";

import type { FetchEdgesFn, FetchNodesFn, NodeIdType } from "../../src/config";
import { expansionOf } from "../../src/data/expand";
import type { Graph } from "../../src/Graph";
import type { Node as GraphNode } from "../../src/Node";

describe("expanding a node", () => {
    it("never passes null or undefined to fetchNodes for a record without the resolved columns", () => {
        let asked: Set<NodeIdType> | undefined;
        // The second record is not shaped the way the type says, which is the case being guarded.
        const fetchEdges = (() =>
            new Set([
                { source: "seed", target: "b", metadata: {} },
                { from: "seed", to: "c", metadata: {} },
            ])) as unknown as FetchEdgesFn;
        const fetchNodes: FetchNodesFn = (ids) => {
            asked = ids;
            return new Set();
        };
        const graph = { fetchEdges, fetchNodes } as unknown as Graph;

        expansionOf(graph, { id: "seed" } as GraphNode);

        assert.deepStrictEqual([...(asked ?? [])], ["b"]);
    });
});
