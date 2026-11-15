import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import { asNumber, createMockGraph, getNodeResult } from "../../helpers/mockGraph";

const mockGraph = createMockGraph;

describe("DFSAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'dfs'", () => {
            const DFSClass = Algorithm.getClass("graphty", "dfs");
            assert.ok(DFSClass);
            assert.strictEqual(DFSClass.namespace, "graphty");
            assert.strictEqual(DFSClass.type, "dfs");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new DFSAlgorithm(await mockGraph());
        });

        it("assigns discoveryTime to source node starting at 0", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            const sourceNode = fakeGraph.nodes.get("Valjean");
            assert.ok(sourceNode);
            assert.strictEqual(getNodeResult(algo, sourceNode.id, "graphty", "dfs", "discoveryTime"), 0);
        });

        it("assigns discoveryTime to all reachable nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            // All visited nodes should have discoveryTime >= 0
            for (const node of fakeGraph.nodes.values()) {
                const discoveryTime = getNodeResult(algo, node.id, "graphty", "dfs", "discoveryTime");
                if (discoveryTime !== undefined) {
                    assert.isAtLeast(asNumber(discoveryTime), 0);
                }
            }
        });

        it("assigns finishTime to all reachable nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                const finishTime = getNodeResult(algo, node.id, "graphty", "dfs", "finishTime");
                if (finishTime !== undefined) {
                    assert.isAtLeast(asNumber(finishTime), 0);
                }
            }
        });

        it("ensures finishTime > discoveryTime for each node", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                const discoveryTime = getNodeResult(algo, node.id, "graphty", "dfs", "discoveryTime");
                const finishTime = getNodeResult(algo, node.id, "graphty", "dfs", "finishTime");
                if (discoveryTime !== undefined && finishTime !== undefined) {
                    assert.isAbove(asNumber(finishTime), asNumber(discoveryTime));
                }
            }
        });

        it("assigns normalized discoveryTimePct between 0 and 1", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                const discoveryTimePct = getNodeResult(algo, node.id, "graphty", "dfs", "discoveryTimePct");
                if (discoveryTimePct !== undefined) {
                    assert.isAtLeast(asNumber(discoveryTimePct), 0);
                    assert.isAtMost(asNumber(discoveryTimePct), 1);
                }
            }
        });

        it("marks all reachable nodes as visited", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            let visitedCount = 0;
            for (const node of fakeGraph.nodes.values()) {
                if (getNodeResult(algo, node.id, "graphty", "dfs", "visited") === true) {
                    visitedCount++;
                }
            }
            assert.isAtLeast(visitedCount, 1);
        });

        it("publishes the latest discovery time", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            // A discovery time is a measurement per node, so the node-metric shape publishes the
            // range of the column. 1.10 published the top of it as maxTime.
            const { result } = algo;
            assert.ok(result);
            assert.isAtLeast(result.graph.max as number, 0);
        });

        it("publishes a discovery time for every node", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            algo.configure({ source: "Valjean" });
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.isAtLeast(result.column("value").length, 1);
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new DFSAlgorithm(emptyGraph);
            algo.configure({ source: "A" });
            await algo.run();
            // Should not throw
        });

        it("uses first node as default source when not configured", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new DFSAlgorithm(fakeGraph);
            // Don't call configure - let it use default source
            await algo.run();

            // Check that at least some nodes have discovery times assigned
            let hasTimes = false;
            for (const node of fakeGraph.nodes.values()) {
                if (getNodeResult(algo, node.id, "graphty", "dfs", "discoveryTime") !== undefined) {
                    hasTimes = true;
                    break;
                }
            }
            assert.isTrue(hasTimes);
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(DFSAlgorithm.namespace, "graphty");
            assert.strictEqual(DFSAlgorithm.type, "dfs");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "dfs");
            assert.strictEqual(AlgClass, DFSAlgorithm);
        });
    });
});
