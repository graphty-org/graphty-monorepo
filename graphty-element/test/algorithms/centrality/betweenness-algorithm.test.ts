import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
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

describe("BetweennessCentralityAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'betweenness'", () => {
            const BetweennessClass = Algorithm.getClass("graphty", "betweenness");
            assert.ok(BetweennessClass);
            assert.strictEqual(BetweennessClass.namespace, "graphty");
            assert.strictEqual(BetweennessClass.type, "betweenness");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new BetweennessCentralityAlgorithm(await mockGraph());
        });

        it("calculates betweenness scores for all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BetweennessCentralityAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "betweenness", "score"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "betweenness", "scorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "betweenness", "score"));
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "betweenness", "scorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "betweenness", "scorePct"), 1);
            }
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new BetweennessCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("identifies bridge nodes with higher scores", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new BetweennessCentralityAlgorithm(fakeGraph);
            await algo.run();

            // Valjean should have high betweenness as a central character
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "betweenness", "scorePct") as number, 0.5);
        });
    });
});
