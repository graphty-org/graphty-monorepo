import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
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

describe("HITSAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'hits'", () => {
            const HITSClass = Algorithm.getClass("graphty", "hits");
            assert.ok(HITSClass);
            assert.strictEqual(HITSClass.namespace, "graphty");
            assert.strictEqual(HITSClass.type, "hits");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new HITSAlgorithm(await mockGraph());
        });

        it("calculates hub and authority scores for all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new HITSAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "hubScore"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "authorityScore"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "hubScorePct"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "authorityScorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "hits", "hubScore"));
                assert.isNumber(getNodeResult(algo, node.id, "graphty", "hits", "authorityScore"));
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "hits", "hubScorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "hits", "hubScorePct"), 1);
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "hits", "authorityScorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "hits", "authorityScorePct"), 1);
            }
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new HITSAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("computes combined score for visualization", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new HITSAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "combinedScore"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "hits", "combinedScorePct"));
                assert.isNumber(getNodeResult(algo, node.id, "graphty", "hits", "combinedScore"));
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "hits", "combinedScorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "hits", "combinedScorePct"), 1);
            }
        });
    });
});
