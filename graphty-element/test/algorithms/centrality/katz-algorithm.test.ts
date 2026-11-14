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
            // Below 1 / lambda_max of data4, where the default alpha of 0.1 diverges.
            const algo = new KatzCentralityAlgorithm(fakeGraph, { alpha: 0.02 });
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "katz", "score"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "katz", "scorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "katz", "score"));
                assert.isAtLeast(asNumber(getNodeResult(algo, node.id, "graphty", "katz", "scorePct")), 0);
                assert.isAtMost(asNumber(getNodeResult(algo, node.id, "graphty", "katz", "scorePct")), 1);
            }
        });

        it("fails with E_NOT_CONVERGED when alpha is too large for the graph, instead of publishing scores", async () => {
            // The complete graph on 11 nodes has lambda_max 10, so the default alpha 0.1 diverges.
            const ids = Array.from({ length: 11 }, (_, i) => `n${String(i)}`);
            const edges = ids.flatMap((src, i) => ids.slice(i + 1).map((dst) => ({ srcId: src, dstId: dst })));
            const graph = await mockGraph({ nodes: ids.map((id) => ({ id })), edges });
            let thrown: unknown;
            try {
                await new KatzCentralityAlgorithm(graph).run();
            } catch (error) {
                thrown = error;
            }
            assert.strictEqual((thrown as { code?: string } | undefined)?.code, "E_NOT_CONVERGED");
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new KatzCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("well-connected nodes have higher katz centrality", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            // Below 1 / lambda_max of data4, where the default alpha of 0.1 diverges.
            const algo = new KatzCentralityAlgorithm(fakeGraph, { alpha: 0.02 });
            await algo.run();

            // Valjean should have high katz centrality
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "katz", "scorePct") as number, 0.3);
        });
    });
});
