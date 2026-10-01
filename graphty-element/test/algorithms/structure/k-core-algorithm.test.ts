import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { KCoreAlgorithm } from "../../../src/algorithms/KCoreAlgorithm";
import { createMockGraph } from "../../helpers/mockGraph";

/** A triangle a-b-c, a pendant d hanging off a, and an isolated e. */
const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { srcId: "a", dstId: "b" },
    { srcId: "b", dstId: "c" },
    { srcId: "c", dstId: "a" },
    { srcId: "a", dstId: "d" },
];

describe("KCoreAlgorithm", () => {
    it("is registered as graphty:k-core", () => {
        assert.strictEqual(Algorithm.getClass("graphty", "k-core"), KCoreAlgorithm);
    });

    it("gives every node its core number", async () => {
        const algo = new KCoreAlgorithm(await createMockGraph({ nodes: NODES, edges: EDGES }));
        await algo.run();

        const core = (id: string): unknown => algo.result?.node(id)?.value;

        assert.deepEqual(
            NODES.map(({ id }) => core(id)),
            [2, 2, 2, 1, 0],
        );
        assert.strictEqual(algo.result?.shape, "node-metric");
        assert.strictEqual(algo.result?.graph.max, 2);
    });

    it("publishes nothing for an empty graph", async () => {
        const algo = new KCoreAlgorithm(await createMockGraph());
        await algo.run();

        assert.isUndefined(algo.result);
    });
});
