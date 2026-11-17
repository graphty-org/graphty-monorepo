import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { asNumber, createMockGraph, getNodeResult } from "../../helpers/mockGraph";

const mockGraph = createMockGraph;

/**
 * The complete graph on `n` nodes, `n0` to `n{n-1}`.
 * @param n - How many nodes.
 * @returns The graph.
 */
async function completeGraph(n: number): ReturnType<typeof createMockGraph> {
    const ids = Array.from({ length: n }, (_, i) => `n${String(i)}`);
    const edges = ids.flatMap((src, i) => ids.slice(i + 1).map((dst) => ({ srcId: src, dstId: dst })));
    return mockGraph({ nodes: ids.map((id) => ({ id })), edges });
}

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
            // Below 1 / lambda_max of data4, where an alpha of 0.1 diverges.
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
            // The complete graph on 11 nodes has lambda_max 10, so an alpha of 0.1 diverges.
            const graph = await completeGraph(11);
            let thrown: unknown;
            try {
                await new KatzCentralityAlgorithm(graph, { alpha: 0.1 }).run();
            } catch (error) {
                thrown = error;
            }
            assert.strictEqual((thrown as { code?: string } | undefined)?.code, "E_NOT_CONVERGED");
        });

        it("converges with its default options on Les Miserables, where an alpha of 0.1 diverges", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new KatzCentralityAlgorithm(fakeGraph);
            await algo.run();

            const caveats = algo.result?.summary().caveats;
            assert.isTrue(caveats?.converged);
            assert.isBelow(caveats?.iterations ?? Infinity, 100);
            const valjean = getNodeResult(algo, "Valjean", "graphty", "katz", "scorePct");
            assert.strictEqual(valjean, 1, "Valjean, the best-connected character, scores highest");
            // The algorithms package derives the alpha (about 0.018 here), and the caveat names it.
            const attenuation = caveats?.facts?.find((fact) => fact.code === "katz.attenuation");
            assert.closeTo(attenuation?.params.alpha as number, 0.018, 0.002);
        });

        it("converges with its default options on a complete graph, and keeps alpha 0.1 where that converges", async () => {
            await new KatzCentralityAlgorithm(await completeGraph(11)).run();

            // A triangle's spectral radius is 2: the conventional 0.1 stays, giving 1 / (1 - 0.2).
            const triangle = await completeGraph(3);
            const algo = new KatzCentralityAlgorithm(triangle, { normalized: false });
            await algo.run();
            assert.closeTo(getNodeResult(algo, "n0", "graphty", "katz", "score") as number, 1.25, 1e-5);
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new KatzCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("well-connected nodes have higher katz centrality", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            // Below 1 / lambda_max of data4, where an alpha of 0.1 diverges.
            const algo = new KatzCentralityAlgorithm(fakeGraph, { alpha: 0.02 });
            await algo.run();

            // Valjean should have high katz centrality
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "katz", "scorePct") as number, 0.3);
        });
    });
});
