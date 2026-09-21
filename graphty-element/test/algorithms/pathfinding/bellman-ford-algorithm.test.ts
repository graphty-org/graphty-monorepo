import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { createMockGraph, getEdgeResult, getNodeResult, type MockGraphOpts } from "../../helpers/mockGraph";

/**
 * The shared mock, kept behind the name and the loose return type this file already used.
 *
 * It carries a real graph store, which is where an algorithm now reads its input from; the node
 * and edge maps it also exposes are where the results land.
 * @param opts - which fixture to load
 * @returns the mock graph
 */
 
async function mockGraph(opts: MockGraphOpts = {}): Promise<any> {
    return createMockGraph(opts);
}

/**
 * A graph with a negative cycle: A --1--> B --2--> C ---(-4)--> A, total weight -1.
 * @returns the mock graph
 */
 
async function mockGraphWithNegativeCycle(): Promise<any> {
    return createMockGraph({
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
            { srcId: "A", dstId: "B", value: 1 },
            { srcId: "B", dstId: "C", value: 2 },
            { srcId: "C", dstId: "A", value: -4 },
        ],
    });
}

describe("BellmanFordAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'bellman-ford'", () => {
            const BellmanFordClass = Algorithm.getClass("graphty", "bellman-ford");
            assert.ok(BellmanFordClass);
            assert.strictEqual(BellmanFordClass.namespace, "graphty");
            assert.strictEqual(BellmanFordClass.type, "bellman-ford");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new BellmanFordAlgorithm(await mockGraph());
        });

        it("calculates distances from source to all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BellmanFordAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "bellman-ford", "distance"));
            }

            // Source should have distance 0
            const sourceNode = fakeGraph.nodes.get("Valjean");
            assert.ok(sourceNode);
            assert.strictEqual(getNodeResult(algo, sourceNode.id, "graphty", "bellman-ford", "distance"), 0);
        });

        it("marks nodes in shortest path when target is specified", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BellmanFordAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean", target: "Cosette" });
            await algo.run();

            let pathNodeCount = 0;
            for (const node of fakeGraph.nodes.values()) {
                if (getNodeResult(algo, node.id, "graphty", "bellman-ford", "isInPath") === true) {
                    pathNodeCount++;
                }
            }
            assert.isAtLeast(pathNodeCount, 2); // At least source and target
        });

        it("marks edges in shortest path when target is specified", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BellmanFordAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean", target: "Cosette" });
            await algo.run();

            let pathEdgeCount = 0;
            for (const edge of fakeGraph.edges.values()) {
                if (getEdgeResult(algo, edge.id, "graphty", "bellman-ford", "isInPath") === true) {
                    pathEdgeCount++;
                }
            }
            // Path should have at least 1 edge (Valjean is directly connected to Cosette)
            assert.isAtLeast(pathEdgeCount, 1);
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new BellmanFordAlgorithm(emptyGraph);
            algo.configure({ source: "A" });
            await algo.run();
            // Should not throw
        });

        it("normalizes distances to percentages", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BellmanFordAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                const distPct = getNodeResult(algo, node.id, "graphty", "bellman-ford", "distancePct") as
                    | number
                    | undefined;
                if (distPct !== undefined && isFinite(distPct)) {
                    assert.isAtLeast(distPct, 0);
                    assert.isAtMost(distPct, 1);
                }
            }
        });

        it("detects negative cycles", async () => {
            const graphWithNegCycle = await mockGraphWithNegativeCycle();
            const algo = new BellmanFordAlgorithm(graphWithNegCycle);
            algo.configure({ source: "A" });
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.isTrue(result.graph.hasNegativeCycle);
        });
    });
});
