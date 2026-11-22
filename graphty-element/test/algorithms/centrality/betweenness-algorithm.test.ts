import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { asNumber, createMockGraph, getNodeResult } from "../../helpers/mockGraph";

const mockGraph = createMockGraph;

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
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "betweenness", "scorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "betweenness", "scorePct")), 1);
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
