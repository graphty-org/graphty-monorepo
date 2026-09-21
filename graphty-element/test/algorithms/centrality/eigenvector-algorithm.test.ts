import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
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

describe("EigenvectorCentralityAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'eigenvector'", () => {
            const EigenvectorClass = Algorithm.getClass("graphty", "eigenvector");
            assert.ok(EigenvectorClass);
            assert.strictEqual(EigenvectorClass.namespace, "graphty");
            assert.strictEqual(EigenvectorClass.type, "eigenvector");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new EigenvectorCentralityAlgorithm(await mockGraph());
        });

        it("calculates eigenvector scores for all nodes", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new EigenvectorCentralityAlgorithm(fakeGraph);
            await algo.run();

            for (const node of fakeGraph.nodes.values()) {
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "eigenvector", "score"));
                assert.isDefined(getNodeResult(algo, node.id, "graphty", "eigenvector", "scorePct"));

                assert.isNumber(getNodeResult(algo, node.id, "graphty", "eigenvector", "score"));
                assert.isAtLeast(getNodeResult(algo, node.id, "graphty", "eigenvector", "scorePct"), 0);
                assert.isAtMost(getNodeResult(algo, node.id, "graphty", "eigenvector", "scorePct"), 1);
            }
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new EigenvectorCentralityAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("influential nodes have higher eigenvector centrality", async () => {
            const fakeGraph = await mockGraph({ dataPath: "./data4.json" });
            const algo = new EigenvectorCentralityAlgorithm(fakeGraph);
            await algo.run();

            // Nodes connected to well-connected nodes should have high eigenvector centrality
            const valjean = fakeGraph.nodes.get("Valjean");
            assert.ok(valjean);
            // Eigenvector scores vary but influential nodes should score well
            assert.isAtLeast(getNodeResult(algo, valjean.id, "graphty", "eigenvector", "scorePct") as number, 0.3);
        });
    });
});
