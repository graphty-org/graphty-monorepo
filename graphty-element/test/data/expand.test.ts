/**
 * @file Expanding a node hands the consumer's fetchNodes only real node ids, even when some of the
 * edges fetchEdges returned do not carry the endpoint spelling the batch resolved to. The graph is a
 * real headless session; the fetchers are the consumer's, which is all a layout behavior supplies.
 */
import { assert, describe, it } from "vitest";

import type { FetchEdgesFn, FetchNodesFn, NodeIdType } from "../../src/config";
import { expansionOf } from "../../src/data/expand";
import type { Node as GraphNode } from "../../src/Node";
import { createGraphSession } from "../../src/session/GraphSession";
import { graphHandle } from "../helpers/session-graph";

describe("expanding a node", () => {
    it("never passes null or undefined to fetchNodes for a record without the resolved columns", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "seed" }]);

        let asked: Set<NodeIdType> | undefined;
        // The second record is not shaped the way the type says, which is the case being guarded.
        const fetchEdges = (() =>
            new Set([
                { source: "seed", target: "b", metadata: {} },
                { from: "seed", to: "c", metadata: {} },
            ])) as unknown as FetchEdgesFn;
        const fetchNodes: FetchNodesFn = (ids) => {
            asked = ids;
            return new Set([...ids].map((id) => ({ id, metadata: {} })));
        };
        const { graph } = graphHandle(session, { fetchEdges, fetchNodes });

        // A headless session builds no render node; the expansion reads only the seed's id.
        const command = expansionOf(graph, { id: "seed" } as GraphNode);

        assert.deepStrictEqual([...(asked ?? [])], ["b"]);
        assert.isDefined(command);
        if (command === undefined) {
            return;
        }

        // The command the expansion built adds what the consumer handed back, on the real session.
        await session.execute(command);
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["b", "seed"],
        );
        assert.strictEqual(session.status.counts.edges, 1, "the record with no resolved endpoints adds no edge");
        session.dispose();
    });
});
