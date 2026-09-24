import { assert, describe, it } from "vitest";

import { toAlgorithmGraph } from "../../../src/algorithms/utils/snapshotGraph";
import { createMockGraph } from "../../helpers/mockGraph";

/**
 * A triangle, declared one way round: A -> B -> C -> A.
 * @returns the data manager the converter reads
 */
async function triangle(): Promise<ReturnType<Awaited<ReturnType<typeof createMockGraph>>["getDataManager"]>> {
    const graph = await createMockGraph({
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
            { srcId: "A", dstId: "B", value: 2 },
            { srcId: "B", dstId: "C", value: 3 },
            { srcId: "C", dstId: "A", value: 4 },
        ],
    });

    return graph.getDataManager();
}

describe("toAlgorithmGraph", () => {
    describe("undirected", () => {
        it("keeps the reader's edge count instead of mirroring every edge", async () => {
            const built = toAlgorithmGraph(await triangle(), "undirected");

            assert.isFalse(built.isDirected);
            assert.strictEqual(built.nodeCount, 3);
            assert.strictEqual(built.totalEdgeCount, 3);
        });

        it("reaches a neighbour from either endpoint", async () => {
            const built = toAlgorithmGraph(await triangle(), "undirected");

            assert.deepStrictEqual(Array.from(built.neighbors("A")).sort(), ["B", "C"]);
            assert.deepStrictEqual(Array.from(built.neighbors("B")).sort(), ["A", "C"]);
        });

        it("collapses a reciprocal pair of records into one edge", async () => {
            const graph = await createMockGraph({
                nodes: [{ id: "A" }, { id: "B" }],
                edges: [
                    { srcId: "A", dstId: "B" },
                    { srcId: "B", dstId: "A" },
                ],
            });

            const built = toAlgorithmGraph(graph.getDataManager(), "undirected");

            assert.strictEqual(built.totalEdgeCount, 1);
            assert.strictEqual(built.degree("A"), 1);
        });

        it("carries the record weights", async () => {
            const built = toAlgorithmGraph(await triangle(), "undirected");

            assert.strictEqual(built.getEdge("A", "B")?.weight, 2);
            assert.strictEqual(built.getEdge("B", "A")?.weight, 2);
            assert.strictEqual(built.getEdge("C", "A")?.weight, 4);
        });
    });

    describe("directed", () => {
        it("keeps the declared orientation", async () => {
            const built = toAlgorithmGraph(await triangle(), "directed");

            assert.isTrue(built.isDirected);
            assert.strictEqual(built.totalEdgeCount, 3);
            assert.isTrue(built.hasEdge("A", "B"));
            assert.isFalse(built.hasEdge("B", "A"));
            assert.strictEqual(built.outDegree("A"), 1);
            assert.strictEqual(built.inDegree("A"), 1);
        });
    });

    describe("records with no render object", () => {
        it("includes an edge whose endpoint never arrived as a node record", async () => {
            // The element buffers such an edge's mesh until the node shows up, but the graph data
            // itself is complete from the moment the record arrives. An algorithm reads the data.
            const graph = await createMockGraph({
                nodes: [{ id: "A" }],
                edges: [{ srcId: "A", dstId: "ghost" }],
            });

            const built = toAlgorithmGraph(graph.getDataManager(), "undirected");

            assert.strictEqual(built.nodeCount, 2);
            assert.isTrue(built.hasNode("ghost"));
            assert.strictEqual(built.totalEdgeCount, 1);
        });
    });
});
