import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { asNumber, createMockGraph, getNodeResult } from "../../helpers/mockGraph";

const mockGraph = createMockGraph;

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
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "hubScorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "hubScorePct")), 1);
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "authorityScorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "authorityScorePct")), 1);
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
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "combinedScorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "hits", "combinedScorePct")), 1);
            }
        });
    });
});
