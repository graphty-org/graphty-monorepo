import { describe, it, assert } from "vitest";
import { springLayout, completeGraph, cycleGraph, starGraph, randomGraph } from "../src";

describe("Spring Layout", () => {
    describe("Basic functionality", () => {
        it("should position all nodes", () => {
            const graph = completeGraph(5);
            const positions = springLayout(graph);

            assert.equal(Object.keys(positions).length, 5);
            graph.nodes().forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
                assert.isNumber(positions[node][0]);
                assert.isNumber(positions[node][1]);
            });
        });

        it("should handle empty graph", () => {
            const emptyGraph = { nodes: () => [], edges: () => [] };
            const positions = springLayout(emptyGraph);

            assert.equal(Object.keys(positions).length, 0);
        });

        it("should handle single node", () => {
            const singleNode = { nodes: () => [0], edges: () => [] };
            const positions = springLayout(singleNode);

            assert.equal(Object.keys(positions).length, 1);
            assert.deepEqual(positions[0], [0, 0]);
        });

        it("should handle disconnected components", () => {
            const disconnected = {
                nodes: () => [0, 1, 2, 3],
                edges: () => [
                    [0, 1],
                    [2, 3],
                ], // Two separate components
            };
            const positions = springLayout(disconnected);

            assert.equal(Object.keys(positions).length, 4);
            // All nodes should have positions
            [0, 1, 2, 3].forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
            });
        });
    });

    describe("Parameter variations", () => {
        it("should handle different k values", () => {
            const graph = completeGraph(6);
            const positions1 = springLayout(graph, 0.5);
            const positions2 = springLayout(graph, 2.0);

            // Different k values should produce different layouts
            // Check that at least some positions differ
            let different = false;
            graph.nodes().forEach((node) => {
                if (positions1[node][0] !== positions2[node][0] || positions1[node][1] !== positions2[node][1]) {
                    different = true;
                }
            });
            assert.isTrue(different);
        });

        it("should respect fixed positions", () => {
            const graph = starGraph(5);
            const initialPositions = {
                0: [0, 0],
                1: [1, 0],
                2: [0.5, 0.5],
                3: [-0.5, 0.5],
                4: [0, -1],
            };
            const fixedNodes = [0, 1]; // Fix center and one leaf

            const positions = springLayout(graph, null, initialPositions, fixedNodes);

            // Fixed nodes should remain at their initial positions
            assert.deepEqual(positions[0], [0, 0]);
            assert.deepEqual(positions[1], [1, 0]);

            // Other nodes should have moved from initial positions
            [2, 3, 4].forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
                // They should have moved from initial positions
                assert.notEqual(positions[node][0], initialPositions[node][0]);
            });
        });

        it("should converge with more iterations", () => {
            const graph = randomGraph(10, 0.3, 42);

            // Run with different iteration counts
            const positions10 = springLayout(graph, null, null, null, 10);
            const positions100 = springLayout(graph, null, null, null, 100);

            // Calculate total movement between iterations
            const movement10to100 = graph.nodes().reduce((sum, node) => {
                const dx = positions100[node][0] - positions10[node][0];
                const dy = positions100[node][1] - positions10[node][1];
                return sum + Math.sqrt(dx * dx + dy * dy);
            }, 0);

            // More iterations should lead to more stable layout
            // (though initial random positions may vary)
            assert.isAbove(movement10to100, 0);
        });

        it("should handle different center positions", () => {
            const graph = cycleGraph(4);
            const center1 = [0, 0];
            const center2 = [10, 10];

            const positions1 = springLayout(graph, null, null, null, 50, 0.01, center1);
            const positions2 = springLayout(graph, null, null, null, 50, 0.01, center2);

            // Calculate center of mass for each layout
            const com1 = graph
                .nodes()
                .reduce(
                    (acc, node) => {
                        return [acc[0] + positions1[node][0], acc[1] + positions1[node][1]];
                    },
                    [0, 0],
                )
                .map((v) => v / 4);

            const com2 = graph
                .nodes()
                .reduce(
                    (acc, node) => {
                        return [acc[0] + positions2[node][0], acc[1] + positions2[node][1]];
                    },
                    [0, 0],
                )
                .map((v) => v / 4);

            // Centers of mass should be different
            assert.isAbove(Math.abs(com2[0] - com1[0]), 5);
            assert.isAbove(Math.abs(com2[1] - com1[1]), 5);
        });
    });

    describe("Graph-specific behaviors", () => {
        it("should arrange complete graph symmetrically", () => {
            const graph = completeGraph(4);
            const positions = springLayout(graph, 1, null, null, 200);

            // In a complete graph, all nodes should be roughly equidistant
            const distances: number[] = [];
            const nodes = graph.nodes();

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = positions[nodes[i]][0] - positions[nodes[j]][0];
                    const dy = positions[nodes[i]][1] - positions[nodes[j]][1];
                    distances.push(Math.sqrt(dx * dx + dy * dy));
                }
            }

            // Calculate variance in distances
            const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
            const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;

            // Variance should be small for symmetric layout
            assert.isBelow(variance / (avgDistance * avgDistance), 0.1);
        });

        it("should stretch cycle graph into circle-like shape", () => {
            const n = 8;
            const graph = cycleGraph(n);
            const positions = springLayout(graph, 1, null, null, 200);

            // Calculate center of mass
            const center = graph
                .nodes()
                .reduce(
                    (acc, node) => {
                        return [acc[0] + positions[node][0], acc[1] + positions[node][1]];
                    },
                    [0, 0],
                )
                .map((v) => v / n);

            // Calculate distances from center
            const distances = graph.nodes().map((node) => {
                const dx = positions[node][0] - center[0];
                const dy = positions[node][1] - center[1];
                return Math.sqrt(dx * dx + dy * dy);
            });

            // All nodes should be roughly equidistant from center
            const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
            distances.forEach((d) => {
                assert.isBelow(Math.abs(d - avgDistance) / avgDistance, 0.6);
            });
        });

        it("should position star graph with center near origin", () => {
            const graph = starGraph(7);
            const positions = springLayout(graph, 1, null, null, 100);

            // Center node (0) should be near the center
            const centerDist = Math.sqrt(positions[0][0] ** 2 + positions[0][1] ** 2);
            assert.isBelow(centerDist, 0.2);

            // Leaf nodes should be further from origin
            for (let i = 1; i < 7; i++) {
                const leafDist = Math.sqrt(positions[i][0] ** 2 + positions[i][1] ** 2);
                assert.isAbove(leafDist, 0.5);
            }
        });
    });

    describe("Determinism and reproducibility", () => {
        it("should produce consistent results with same seed", () => {
            const graph = randomGraph(8, 0.4, 12345);
            const seed = 42;

            // Run layout twice with same parameters and seed
            const positions1 = springLayout(graph, 1, null, null, 50, 1, [0, 0], 2, seed);
            const positions2 = springLayout(graph, 1, null, null, 50, 1, [0, 0], 2, seed);

            // Results should be identical with same seed
            graph.nodes().forEach((node) => {
                assert.equal(positions1[node][0], positions2[node][0]);
                assert.equal(positions1[node][1], positions2[node][1]);
            });
        });

        it("should produce different results with different seeds", () => {
            const graph = randomGraph(8, 0.4, 12345);

            // Run layout with different seeds
            const positions1 = springLayout(graph, 1, null, null, 50, 1, [0, 0], 2, 42);
            const positions2 = springLayout(graph, 1, null, null, 50, 1, [0, 0], 2, 123);

            // Results should be different
            let different = false;
            graph.nodes().forEach((node) => {
                if (positions1[node][0] !== positions2[node][0] || positions1[node][1] !== positions2[node][1]) {
                    different = true;
                }
            });
            assert.isTrue(different);
        });
    });
});
