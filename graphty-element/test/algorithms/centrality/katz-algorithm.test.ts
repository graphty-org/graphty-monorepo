import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { asNumber, createMockGraph, getNodeResult } from "../../helpers/mockGraph";

const mockGraph = createMockGraph;

describe("KatzCentralityAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'katz'", () => {
            const KatzClass = Algorithm.getClass("graphty", "katz");
            assert.ok(KatzClass);
            assert.strictEqual(KatzClass.namespace, "graphty");
            assert.strictEqual(KatzClass.type, "katz");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new KatzCentralityAlgorithm(await mockGraph());
        });

        it("calculates katz scores for all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new KatzCentralityAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "katz", "score"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "katz", "scorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "katz", "score"));
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "katz", "scorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "katz", "scorePct")), 1);
            }
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new KatzCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("well-connected nodes have higher katz centrality", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new KatzCentralityAlgorithm(fakeGraph);
            await algo.run();

            // Valjean should have high katz centrality
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "katz", "scorePct") as number, 0.3);
        });
    });
});
