/**
 * @file What a plugin algorithm publishes, and how a caller reads it back.
 *
 * WHAT THIS FILE USED TO TEST. Until the style-layer migration an algorithm published by writing
 * onto the render objects -- `addNodeResult`, `addEdgeResult`, `addGraphResult` -- under a path it
 * chose for itself, and a caller read it back by walking the graph. That projection existed for
 * the hand-written `suggestedStyles` layers, whose selectors named those paths, and it went with
 * them.
 *
 * WHAT IT TESTS NOW. An algorithm returns its result. The three verbs are one `compute()` that
 * hands back node values, edge values and graph values together, and the result is a `RunResult`
 * a caller reads by id. Everything the old file asserted -- per-edge values, graph-level values,
 * all three at once, an empty graph, and two algorithms not treading on each other -- is asserted
 * here against that shape.
 */

import { assert, describe, it } from "vitest";

import { Algorithm } from "../../src/algorithms/Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    setFieldSpecs,
} from "../../src/algorithms/results";
import { createMockGraph } from "../helpers/mockGraph";

/** A plugin algorithm that measures every edge. */
class TestEdgeAlgorithm extends DeclaredAlgorithm {
    static namespace = "test-namespace";
    static type = "test-edge-algo";

    // eslint-disable-next-line @typescript-eslint/require-await -- the shape is async for real work
    async compute(_context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const edges = [...this.graph.getDataManager().edges.values()].map((edge) => ({
            id: `${String(edge.srcId)}:${String(edge.dstId)}`,
            values: { in: true, score: 0.5 },
        }));

        return {
            shape: "edge-set",
            fields: [...setFieldSpecs("edge", { name: "score", type: "number" })],
            edges,
            graph: { score: 0.5 },
            caveats: declaredCaveats({ method: "test", direction: "undirected", weight: null }),
        };
    }
}

/** A plugin algorithm that publishes nothing per element, only a fact about the graph. */
class TestGraphAlgorithm extends DeclaredAlgorithm {
    static namespace = "test-namespace";
    static type = "test-graph-algo";

    // eslint-disable-next-line @typescript-eslint/require-await -- the shape is async for real work
    async compute(_context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        return {
            shape: "fact",
            fields: [
                { name: "totalWeight", kind: "graph", type: "number" },
                { name: "componentCount", kind: "graph", type: "integer" },
            ],
            graph: { totalWeight: 42, componentCount: 3 },
            caveats: declaredCaveats({ method: "test", direction: "undirected", weight: null }),
        };
    }
}

/** A plugin algorithm that publishes on the nodes, the edges and the graph at once. */
class TestCombinedAlgorithm extends DeclaredAlgorithm {
    static namespace = "test-namespace";
    static type = "test-combined-algo";

    // eslint-disable-next-line @typescript-eslint/require-await -- the shape is async for real work
    async compute(_context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const data = this.graph.getDataManager();
        const nodes = [...data.nodes.keys()].map((id) => ({ id, values: { in: true, score: 0.75 } }));
        const edges = [...data.edges.values()].map((edge) => ({
            id: `${String(edge.srcId)}:${String(edge.dstId)}`,
            values: { weight: 1.5 },
        }));

        return {
            shape: "node-set",
            fields: [
                ...setFieldSpecs("node", { name: "totalNodes", type: "integer" }),
                { name: "weight", kind: "edge", type: "number" },
            ],
            nodes,
            edges,
            graph: { totalNodes: data.nodes.size },
            caveats: declaredCaveats({ method: "test", direction: "undirected", weight: null }),
        };
    }
}

Algorithm.register(TestEdgeAlgorithm);
Algorithm.register(TestGraphAlgorithm);
Algorithm.register(TestCombinedAlgorithm);

describe("Algorithm Infrastructure", () => {
    describe("Edge Result Storage", () => {
        it("publishes a value for every edge", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new TestEdgeAlgorithm(graph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);

            for (const edge of graph.getDataManager().edges.values()) {
                const values = result.edge(`${String(edge.srcId)}:${String(edge.dstId)}`);
                assert.ok(values);
                assert.strictEqual(values.score, 0.5);
                assert.strictEqual(values.in, true);
            }
        });

        it("measures every edge it looked at", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new TestEdgeAlgorithm(graph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.isAtLeast(result.measured.edges, 1);
        });
    });

    describe("Graph Result Storage", () => {
        it("publishes graph-level values", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new TestGraphAlgorithm(graph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.strictEqual(result.graph.totalWeight, 42);
            assert.strictEqual(result.graph.componentCount, 3);
        });

        it("names the run the result was published under", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new TestGraphAlgorithm(graph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.strictEqual(result.runId, "test-graph-algo");
        });
    });

    describe("Combined Results", () => {
        it("publishes node, edge and graph values in one result", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new TestCombinedAlgorithm(graph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);

            const data = graph.getDataManager();
            const firstNode = [...data.nodes.keys()][0];
            const firstEdge = [...data.edges.values()][0];

            assert.strictEqual(result.node(firstNode)?.score, 0.75);
            assert.strictEqual(result.edge(`${String(firstEdge.srcId)}:${String(firstEdge.dstId)}`)?.weight, 1.5);
            assert.strictEqual(result.graph.totalNodes, data.nodes.size);
        });
    });

    describe("Edge Cases", () => {
        it("publishes an empty result for a graph with no edges", async () => {
            const emptyGraph = await createMockGraph();
            const algo = new TestEdgeAlgorithm(emptyGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.strictEqual(result.measured.edges, 0);
        });

        it("publishes graph-level values even with nothing in the graph", async () => {
            const emptyGraph = await createMockGraph();
            const algo = new TestGraphAlgorithm(emptyGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.strictEqual(result.graph.totalWeight, 42);
        });

        it("keeps two algorithms' results apart", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });

            const edgeAlgo = new TestEdgeAlgorithm(graph);
            const graphAlgo = new TestGraphAlgorithm(graph);
            await edgeAlgo.run();
            await graphAlgo.run();

            assert.strictEqual(graphAlgo.result?.graph.totalWeight, 42);
            assert.isUndefined(edgeAlgo.result?.graph.totalWeight);

            const firstEdge = [...graph.getDataManager().edges.values()][0];
            assert.strictEqual(
                edgeAlgo.result?.edge(`${String(firstEdge.srcId)}:${String(firstEdge.dstId)}`)?.score,
                0.5,
            );
        });
    });
});
