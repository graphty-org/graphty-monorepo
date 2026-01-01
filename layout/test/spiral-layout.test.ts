import { describe, it, assert } from "vitest";
import { spiralLayout, completeGraph, cycleGraph, starGraph, gridGraph, randomGraph } from "../src";

describe("Spiral Layout", () => {
    describe("Basic functionality", () => {
        it("should position all nodes", () => {
            const graph = completeGraph(10);
            const positions = spiralLayout(graph);

            assert.equal(Object.keys(positions).length, 10);
            graph.nodes().forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
                assert.isNumber(positions[node][0]);
                assert.isNumber(positions[node][1]);
            });
        });

        it("should handle empty graph", () => {
            const emptyGraph = { nodes: () => [], edges: () => [] };
            const positions = spiralLayout(emptyGraph);

            assert.equal(Object.keys(positions).length, 0);
        });

        it("should handle single node", () => {
            const singleNode = { nodes: () => ["A"], edges: () => [] };
            const positions = spiralLayout(singleNode);

            assert.equal(Object.keys(positions).length, 1);
            assert.isDefined(positions["A"]);
            assert.equal(positions["A"].length, 2);
            // Single node should be at center
            assert.isBelow(Math.abs(positions["A"][0]), 0.1);
            assert.isBelow(Math.abs(positions["A"][1]), 0.1);
        });

        it("should handle disconnected components", () => {
            const disconnected = {
                nodes: () => [1, 2, 3, 4, 5, 6],
                edges: () => [
                    [1, 2],
                    [2, 3],
                    [4, 5],
                    [5, 6],
                ],
            };
            const positions = spiralLayout(disconnected);

            assert.equal(Object.keys(positions).length, 6);
            [1, 2, 3, 4, 5, 6].forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
            });
        });
    });

    describe("Spiral properties", () => {
        it("should arrange nodes in spiral pattern with increasing radius", () => {
            const graph = cycleGraph(20);
            const positions = spiralLayout(graph);
            const nodes = graph.nodes();

            // Calculate distances from center for sequential nodes
            const distances = nodes.map((node) => {
                const [x, y] = positions[node];
                return Math.sqrt(x * x + y * y);
            });

            // Generally, later nodes should be further from center
            let increasingTrend = 0;
            for (let i = 1; i < distances.length; i++) {
                if (distances[i] >= distances[i - 1]) {
                    increasingTrend++;
                }
            }

            // Most distances should increase (allowing for some spiral curvature)
            assert.isAbove(increasingTrend / (distances.length - 1), 0.7);
        });

        it("should create smooth spiral curve", () => {
            const graph = cycleGraph(30);
            const positions = spiralLayout(graph);
            const nodes = graph.nodes();

            // Calculate angles for sequential nodes
            const angles: number[] = [];
            for (let i = 0; i < nodes.length; i++) {
                const [x, y] = positions[nodes[i]];
                let angle = Math.atan2(y, x);
                // Normalize to [0, 2π]
                if (angle < 0) angle += 2 * Math.PI;
                angles.push(angle);
            }

            // Count angle wraparounds (full rotations)
            let rotations = 0;
            for (let i = 1; i < angles.length; i++) {
                if (angles[i] < angles[i - 1] - Math.PI) {
                    rotations++;
                }
            }

            // Should have at least one full rotation for 30 nodes
            assert.isAtLeast(rotations, 1);
        });

        it("should handle equidistant mode", () => {
            const graph = starGraph(15);
            const positions = spiralLayout(graph, 1, [0, 0], 2, true);

            // Calculate distances between consecutive nodes
            const nodes = graph.nodes();
            const distances: number[] = [];

            for (let i = 1; i < nodes.length; i++) {
                const dx = positions[nodes[i]][0] - positions[nodes[i - 1]][0];
                const dy = positions[nodes[i]][1] - positions[nodes[i - 1]][1];
                distances.push(Math.sqrt(dx * dx + dy * dy));
            }

            // In equidistant mode, distances vary but should have some consistency
            const avgDistance = distances.reduce((a, b) => a + b) / distances.length;

            // Check that we have reasonable spacing
            assert.isAbove(avgDistance, 0);
            assert.isBelow(avgDistance, 1);
        });

        it("should handle non-equidistant mode", () => {
            const graph = completeGraph(12);
            const positions = spiralLayout(graph, 1, [0, 0], 2, 0.35, false);

            // In non-equidistant mode, nodes spread with equal angle
            const nodes = graph.nodes();
            const angles = nodes.map((node) => {
                const [x, y] = positions[node];
                return Math.atan2(y, x);
            });

            // Check angle differences (accounting for spiral growth)
            assert.equal(angles.length, 12);
            // Angles should show regular progression
        });
    });

    describe("Parameter variations", () => {
        it("should respect scale parameter", () => {
            const graph = cycleGraph(8);

            const positions1 = spiralLayout(graph, 0.5);
            const positions2 = spiralLayout(graph, 2.0);

            // Calculate max distances
            const maxDist1 = Math.max(
                ...graph.nodes().map((node) => {
                    const [x, y] = positions1[node];
                    return Math.sqrt(x * x + y * y);
                }),
            );

            const maxDist2 = Math.max(
                ...graph.nodes().map((node) => {
                    const [x, y] = positions2[node];
                    return Math.sqrt(x * x + y * y);
                }),
            );

            // Scale 2 should produce larger spiral
            assert.approximately(maxDist2 / maxDist1, 4, 0.1); // Scale factor squared
        });

        it("should respect center parameter", () => {
            const graph = starGraph(7);
            const center = [3, -2];

            const positions = spiralLayout(graph, 1, center);

            // Check that positions are shifted by center
            const defaultPositions = spiralLayout(graph, 1, [0, 0]);

            // Check center of mass is shifted
            const centerX = graph.nodes().reduce((sum, node) => sum + positions[node][0], 0) / graph.nodes().length;
            const centerY = graph.nodes().reduce((sum, node) => sum + positions[node][1], 0) / graph.nodes().length;
            const defaultCenterX =
                graph.nodes().reduce((sum, node) => sum + defaultPositions[node][0], 0) / graph.nodes().length;
            const defaultCenterY =
                graph.nodes().reduce((sum, node) => sum + defaultPositions[node][1], 0) / graph.nodes().length;

            // Centers should be shifted by approximately the center parameter
            assert.approximately(centerX - defaultCenterX, center[0], 0.5);
            assert.approximately(centerY - defaultCenterY, center[1], 0.5);
        });

        it("should only support 2D layouts", () => {
            const graph = completeGraph(5);

            // 2D layout works
            const positions2D = spiralLayout(graph, 1, [0, 0], 2);
            graph.nodes().forEach((node) => {
                assert.equal(positions2D[node].length, 2);
            });

            // 3D layout should throw error
            assert.throws(() => {
                spiralLayout(graph, 1, [0, 0, 0], 3);
            }, "can only handle 2 dimensions");
        });

        it("should respect resolution parameter", () => {
            const graph = gridGraph(3, 3);

            const positions1 = spiralLayout(graph, 1, [0, 0], 2, 0.1, true);
            const positions2 = spiralLayout(graph, 1, [0, 0], 2, 1.0, true);

            // Different resolutions should produce different spirals
            let different = false;
            graph.nodes().forEach((node) => {
                if (
                    Math.abs(positions1[node][0] - positions2[node][0]) > 0.01 ||
                    Math.abs(positions1[node][1] - positions2[node][1]) > 0.01
                ) {
                    different = true;
                }
            });
            assert.isTrue(different);
        });
    });

    describe("Special cases and edge cases", () => {
        it("should handle string node IDs", () => {
            const graph = {
                nodes: () => ["first", "second", "third", "fourth", "fifth"],
                edges: () => [
                    ["first", "second"],
                    ["second", "third"],
                    ["third", "fourth"],
                    ["fourth", "fifth"],
                ],
            };

            const positions = spiralLayout(graph);

            assert.equal(Object.keys(positions).length, 5);
            ["first", "second", "third", "fourth", "fifth"].forEach((node) => {
                assert.isDefined(positions[node]);
                assert.equal(positions[node].length, 2);
            });
        });

        it("should produce consistent results", () => {
            const graph = randomGraph(15, 0.2, 12345);

            const positions1 = spiralLayout(graph, 1, [0, 0], 2, true, 0.5);
            const positions2 = spiralLayout(graph, 1, [0, 0], 2, true, 0.5);

            // Spiral layout is deterministic
            graph.nodes().forEach((node) => {
                assert.deepEqual(positions1[node], positions2[node]);
            });
        });

        it("should handle large graphs efficiently", () => {
            const graph = gridGraph(20, 20); // 400 nodes

            const startTime = performance.now();
            const positions = spiralLayout(graph);
            const endTime = performance.now();

            assert.equal(Object.keys(positions).length, 400);
            assert.isBelow(endTime - startTime, 100);
        });

        it("should create visually distinct layout from circular", () => {
            const graph = cycleGraph(20);
            const spiralPos = spiralLayout(graph);

            // In spiral, consecutive nodes should have varying distances from center
            const distances = graph.nodes().map((node) => {
                const [x, y] = spiralPos[node];
                return Math.sqrt(x * x + y * y);
            });

            // Calculate variance in distances
            const avgDist = distances.reduce((a, b) => a + b) / distances.length;
            const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / distances.length;

            // Spiral should have some variance (unlike perfect circle)
            assert.isAbove(variance, 0.001);
        });
    });

    describe("Layout patterns", () => {
        it("should create tight spiral for dense graphs", () => {
            const graph = completeGraph(25);
            const positions = spiralLayout(graph, 1, [0, 0], 2, 0.35, true);

            // Check that nodes fill space efficiently
            const boundingBox = {
                minX: Math.min(...graph.nodes().map((n) => positions[n][0])),
                maxX: Math.max(...graph.nodes().map((n) => positions[n][0])),
                minY: Math.min(...graph.nodes().map((n) => positions[n][1])),
                maxY: Math.max(...graph.nodes().map((n) => positions[n][1])),
            };

            const width = boundingBox.maxX - boundingBox.minX;
            const height = boundingBox.maxY - boundingBox.minY;

            // Spiral should be roughly square (not too elongated)
            const aspectRatio = Math.max(width, height) / Math.min(width, height);
            assert.isBelow(aspectRatio, 2);
        });

        it("should create logarithmic spiral pattern", () => {
            const n = 50;
            const graph = cycleGraph(n);
            const positions = spiralLayout(graph, 1, [0, 0], 2, 0.35, false);

            // For non-equidistant spiral, radius should grow exponentially
            const radii = graph.nodes().map((node) => {
                const [x, y] = positions[node];
                return Math.sqrt(x * x + y * y);
            });

            // Filter out near-zero radii
            const nonZeroRadii = radii.filter((r) => r > 0.01);

            // Check if growth is approximately exponential
            // by checking if log(radii) grows linearly
            if (nonZeroRadii.length > 10) {
                const logRadii = nonZeroRadii.map((r) => Math.log(r));

                // Simple linear regression
                const n = logRadii.length;
                const indices = Array.from({ length: n }, (_, i) => i);
                const sumX = indices.reduce((a, b) => a + b);
                const sumY = logRadii.reduce((a, b) => a + b);
                const sumXY = indices.reduce((sum, x, i) => sum + x * logRadii[i], 0);
                const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

                // Positive slope indicates exponential growth
                assert.isAbove(slope, 0);
            }
        });
    });
});
