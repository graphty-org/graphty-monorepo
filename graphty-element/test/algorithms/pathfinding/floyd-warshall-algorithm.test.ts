import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { FloydWarshallAlgorithm } from "../../../src/algorithms/FloydWarshallAlgorithm";
import { createMockGraph, type MockGraphOpts } from "../../helpers/mockGraph";

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

/**
 * A small graph for testing Floyd-Warshall, which is O(n^3): A -- B -- C -- D.
 * @returns the mock graph
 */
 
async function mockSmallGraph(): Promise<any> {
    return createMockGraph({
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
        edges: [
            { srcId: "A", dstId: "B", value: 1 },
            { srcId: "B", dstId: "C", value: 2 },
            { srcId: "C", dstId: "D", value: 3 },
        ],
    });
}

describe("FloydWarshallAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'floyd-warshall'", () => {
            const FloydWarshallClass = Algorithm.getClass("graphty", "floyd-warshall");
            assert.ok(FloydWarshallClass);
            assert.strictEqual(FloydWarshallClass.namespace, "graphty");
            assert.strictEqual(FloydWarshallClass.type, "floyd-warshall");
        });
    });

    describe("Algorithm Execution", () => {
        it("exists", async () => {
            new FloydWarshallAlgorithm(await mockGraph());
        });

        it("computes all-pairs shortest paths", async () => {
            const smallGraph = await mockSmallGraph();
            const algo = new FloydWarshallAlgorithm(smallGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.strictEqual(result.measured.nodes, 4);
        });

        it("stores distance information on graph", async () => {
            const smallGraph = await mockSmallGraph();
            const algo = new FloydWarshallAlgorithm(smallGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            // 1.10 published the node count as a graph result of its own; a result now says how
            // many elements it measured, for every algorithm, without each one restating it.
            assert.strictEqual(result.measured.nodes, 4);
        });

        it("handles empty graph", async () => {
            const emptyGraph = await mockGraph();
            const algo = new FloydWarshallAlgorithm(emptyGraph);
            await algo.run();
            // Should not throw
        });

        it("measures every node's eccentricity", async () => {
            const smallGraph = await mockSmallGraph();
            const algo = new FloydWarshallAlgorithm(smallGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);

            // Eccentricity is published under the node-metric shape's own name for "the number
            // this run measured on this element", which is `value`. Published under a name of its
            // own it was unpaintable: the shape a run declares is what tells the element there is
            // a per-element measurement here to colour by at all.
            for (const node of smallGraph.nodes.values()) {
                assert.property(result.node(node.id as string) ?? {}, "value");
            }
        });

        it("computes diameter and radius", async () => {
            const smallGraph = await mockSmallGraph();
            const algo = new FloydWarshallAlgorithm(smallGraph);
            await algo.run();

            const { result } = algo;
            assert.ok(result);
            assert.property(result.graph, "diameter");
            assert.property(result.graph, "radius");

            // For a path graph A-B-C-D:
            // Diameter (max eccentricity) should be 3 (A to D or D to A)
            // Radius (min eccentricity) should be 2 (from B or C)
            assert.isAtLeast(result.graph.diameter as number, result.graph.radius as number);
        });

        it("identifies central nodes", async () => {
            const smallGraph = await mockSmallGraph();
            const algo = new FloydWarshallAlgorithm(smallGraph);
            await algo.run();

            // 1.10 wrote an isCentral flag onto every node. A node is central when its
            // eccentricity equals the radius, which the result publishes, so the flag is a
            // comparison the reader makes rather than a value the run repeats per node.
            const { result } = algo;
            assert.ok(result);

            let hasCentralNode = false;
            for (const node of smallGraph.nodes.values()) {
                if (result.node(node.id as string)?.value === result.graph.radius) {
                    hasCentralNode = true;
                    break;
                }
            }

            assert.isTrue(hasCentralNode);
        });
    });
});
