 
import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { createMockGraph, getNodeResult, type MockGraphOpts } from "../../helpers/mockGraph";

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

describe("BFSAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'bfs'", () => {
            const BFSClass = Algorithm.getClass("graphty", "bfs");
            assert.ok(BFSClass);
            assert.strictEqual(BFSClass.namespace, "graphty");
            assert.strictEqual(BFSClass.type, "bfs");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new BFSAlgorithm(await mockGraph());
        });

        it("assigns level 0 to source node", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            const sourceNode = fakeGraph.nodes.get("Valjean");
            assert.ok(sourceNode);
            assert.strictEqual(getNodeResult(algo, sourceNode.id, "graphty", "bfs", "level"), 0);
        });

        it("assigns levels to all reachable nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            // All nodes should have levels >= 0
            for (const node of fakeGraph.nodes.values()) {
                const level = getNodeResult(algo, node.id, "graphty", "bfs", "level");
                if (level !== undefined) {
                    assert.isAtLeast(level, 0);
                }
            }
        });

        it("assigns normalized levelPct between 0 and 1", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                const levelPct = getNodeResult(algo, node.id, "graphty", "bfs", "levelPct");
                if (levelPct !== undefined) {
                    assert.isAtLeast(levelPct, 0);
                    assert.isAtMost(levelPct, 1);
                }
            }
        });

        it("records visit order for all reachable nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            const visitOrders = new Set<number>();
            for (const node of fakeGraph.nodes.values()) {
                const order = getNodeResult(algo, node.id, "graphty", "bfs", "visitOrder");
                if (order !== undefined) {
                    visitOrders.add(order);
                }
            }

            // Visit orders should be unique (no duplicates)
            // Get count of nodes with visit orders
            let nodeWithOrderCount = 0;
            for (const node of fakeGraph.nodes.values()) {
                if (getNodeResult(algo, node.id, "graphty", "bfs", "visitOrder") !== undefined) {
                    nodeWithOrderCount++;
                }
            }
            assert.strictEqual(visitOrders.size, nodeWithOrderCount);
        });

        it("publishes how many levels the walk found", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            // The walk sorts the graph into layers, so the layered-grouping shape publishes how
            // many there are. 1.10 published the deepest level instead, which is one less.
            const { result } = algo;
            assert.ok(result);
            assert.isAtLeast(result.graph.levelCount as number, 1);
        });

        it("publishes a level for every node it reached", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            // A node the walk never reached carries nothing, so the column's length is the count
            // 1.10 published as visitedCount.
            const { result } = algo;
            assert.ok(result);
            assert.isAtLeast(result.column("level").length, 1);
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new BFSAlgorithm(emptyGraph);
            algo.configure({ source: "A" });
            await algo.run();
            // Should not throw
        });

        it("uses first node as default source when not configured", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BFSAlgorithm(fakeGraph);
            // Don't call configure - let it use default source
            await algo.run();

            // Check that at least some nodes have levels assigned
            let hasLevels = false;
            for (const node of fakeGraph.nodes.values()) {
                if (getNodeResult(algo, node.id, "graphty", "bfs", "level") !== undefined) {
                    hasLevels = true;
                    break;
                }
            }
            assert.isTrue(hasLevels);
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(BFSAlgorithm.namespace, "graphty");
            assert.strictEqual(BFSAlgorithm.type, "bfs");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "bfs");
            assert.strictEqual(AlgClass, BFSAlgorithm);
        });

    });

});
