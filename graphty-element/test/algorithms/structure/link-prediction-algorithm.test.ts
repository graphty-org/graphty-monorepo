import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { LinkPredictionAlgorithm } from "../../../src/algorithms/LinkPredictionAlgorithm";
import { createMockGraph } from "../../helpers/mockGraph";

/** A square a-b-c-d with e hanging off a. */
const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { srcId: "a", dstId: "b" },
    { srcId: "b", dstId: "c" },
    { srcId: "c", dstId: "d" },
    { srcId: "d", dstId: "a" },
    { srcId: "a", dstId: "e" },
];

interface Pair {
    source: string | number;
    target: string | number;
    score: number;
}

/**
 * Run link prediction over the square and read back its pairs.
 * @param options - The algorithm's options.
 * @returns The published pairs.
 */
async function pairsOf(options: Record<string, unknown> = {}): Promise<Pair[]> {
    const algo = new LinkPredictionAlgorithm(await createMockGraph({ nodes: NODES, edges: EDGES }), options);
    await algo.run();

    assert.strictEqual(algo.result?.shape, "pair-list");

    return algo.result?.graph.pairs as Pair[];
}

/**
 * An order-free key for a pair.
 * @param pair - The pair.
 * @returns Its two ends, sorted and joined.
 */
function keyOf(pair: Pair): string {
    return [pair.source, pair.target].sort().join("-");
}

describe("LinkPredictionAlgorithm", () => {
    it("is registered as graphty:link-prediction", () => {
        assert.strictEqual(Algorithm.getClass("graphty", "link-prediction"), LinkPredictionAlgorithm);
    });

    it("lists every unjoined pair that shares a neighbour once, best first", async () => {
        const pairs = await pairsOf({ method: "common-neighbors" });

        assert.sameMembers(pairs.map(keyOf), ["a-c", "b-d", "b-e", "d-e"]);
        assert.deepEqual(
            pairs.map((pair) => pair.score),
            [2, 2, 1, 1],
        );
    });

    it("keeps only the best topK pairs", async () => {
        const pairs = await pairsOf({ topK: 1 });

        assert.lengthOf(pairs, 1);
    });

    it("scores with Adamic-Adar by default", async () => {
        const pairs = await pairsOf();
        const ac = pairs.find((pair) => keyOf(pair) === "a-c");

        // a-c share b (degree 2) and d (degree 2): 2 / ln 2.
        assert.closeTo(ac?.score ?? 0, 2 / Math.log(2), 1e-9);
    });

    it("lists a pair whose end has the id 0", async () => {
        // The path 0-1-2-3: 0 and 2 share 1, and 1 and 3 share 2.
        const nodes = [0, 1, 2, 3].map((id) => ({ id }));
        const edges = [0, 1, 2].map((id) => ({ srcId: id, dstId: id + 1 }));
        const algo = new LinkPredictionAlgorithm(await createMockGraph({ nodes, edges }), {
            method: "common-neighbors",
        });
        await algo.run();

        const pairs = algo.result?.graph.pairs as Pair[];
        assert.sameMembers(pairs.map(keyOf), ["0-2", "1-3"]);
    });
});
