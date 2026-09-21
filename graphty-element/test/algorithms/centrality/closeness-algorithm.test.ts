import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { ClosenessCentralityAlgorithm } from "../../../src/algorithms/ClosenessCentralityAlgorithm";
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

describe("ClosenessCentralityAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'closeness'", () => {
            const ClosenessClass = Algorithm.getClass("graphty", "closeness");
            assert.ok(ClosenessClass);
            assert.strictEqual(ClosenessClass.namespace, "graphty");
            assert.strictEqual(ClosenessClass.type, "closeness");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new ClosenessCentralityAlgorithm(await mockGraph());
        });

        it("calculates closeness scores for all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new ClosenessCentralityAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "closeness", "score"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "closeness", "scorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "closeness", "score"));
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "closeness", "scorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "closeness", "scorePct"), 1);
            }
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new ClosenessCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("central nodes have higher closeness", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new ClosenessCentralityAlgorithm(fakeGraph);
            await algo.run();

            // Valjean should have high closeness as a central character
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            // Closeness scores vary but central nodes should be in upper half
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "closeness", "scorePct") as number, 0.3);
        });
    });
});
