import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { detachedRunContext } from "../../../src/algorithms/results/types";
import { isGraphtyError } from "../../../src/errors";
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

    describe("convergence", () => {
        /**
         * A 30x30 grid, which power iteration needs several hundred passes for (networkx too).
         * @returns the mock graph
         */
        async function grid(): Promise<any> {
            const nodes = [];
            const edges = [];
            for (let row = 0; row < 30; row++) {
                for (let col = 0; col < 30; col++) {
                    nodes.push({ id: `${String(row)},${String(col)}` });
                    if (col < 29) {
                        edges.push({ srcId: `${String(row)},${String(col)}`, dstId: `${String(row)},${String(col + 1)}` });
                    }
                    if (row < 29) {
                        edges.push({ srcId: `${String(row)},${String(col)}`, dstId: `${String(row + 1)},${String(col)}` });
                    }
                }
            }
            return createMockGraph({ nodes, edges });
        }

        it("a run that reaches maxIterations without converging fails with E_NOT_CONVERGED", async () => {
            const algo = new EigenvectorCentralityAlgorithm(await grid(), { maxIterations: 20 });

            let thrown: unknown;
            try {
                await algo.publishResult(detachedRunContext(), "eigen_grid");
            } catch (error) {
                thrown = error;
            }

            assert.isTrue(isGraphtyError(thrown), "the failure is a GraphtyError");
            if (!isGraphtyError(thrown)) {
                return;
            }
            assert.strictEqual(thrown.code, "E_NOT_CONVERGED");
            assert.strictEqual(thrown.source, "run");
            assert.deepStrictEqual(thrown.target, { kind: "run", id: "eigen_grid" });
            assert.deepInclude(thrown.details, { algorithm: "graphty:eigenvector", maxIterations: 20, tolerance: 1e-6 });
            assert.include(thrown.message, "did not converge in 20 iterations");
            assert.include(thrown.message, "maxIterations");
            assert.isUndefined(algo.result, "an unconverged run publishes nothing");
        });

        it("the same grid succeeds with a higher maxIterations and says it converged", async () => {
            const algo = new EigenvectorCentralityAlgorithm(await grid(), { maxIterations: 1000 });

            const result = await algo.publishResult(detachedRunContext(), "eigen_grid");

            assert.isDefined(result);
            assert.isTrue(result?.summary().caveats.converged);
        });
    });

    describe("direction on a directed graph", () => {
        /** a -> b -> c -> a, and d -> a: nothing points at d, and d points at a. */
        async function directed(): Promise<any> {
            const nodes = ["a", "b", "c", "d"].map((id) => ({ id }));
            const edges = [
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["d", "a"],
            ].map(([srcId, dstId]) => ({ srcId, dstId }));
            return createMockGraph({ nodes, edges, directed: true });
        }

        async function run(mode: "in" | "out" | "total"): Promise<{ d: number; direction: string }> {
            const graph = await directed();
            const algo = new EigenvectorCentralityAlgorithm(graph, { mode, normalized: false });
            const result = await algo.publishResult(detachedRunContext(), `eigen_${mode}`);
            return {
                d: getNodeResult(algo, "d", "graphty", "eigenvector", "score"),
                direction: result?.summary().caveats.direction ?? "",
            };
        }

        it("mode in scores a node by the edges pointing at it, so d scores 0", async () => {
            const { d, direction } = await run("in");
            assert.strictEqual(d, 0);
            assert.strictEqual(direction, "directed");
        });

        it("mode out scores a node by the edges it points along, so d scores above 0", async () => {
            const { d, direction } = await run("out");
            assert.isAbove(d, 0);
            assert.strictEqual(direction, "directed");
        });

        it("mode total ignores direction and says so", async () => {
            const { d, direction } = await run("total");
            assert.isAbove(d, 0);
            assert.strictEqual(direction, "undirected");
        });
    });
});
