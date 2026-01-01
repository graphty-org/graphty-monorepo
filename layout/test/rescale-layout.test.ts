import { describe, it, assert } from "vitest";
import { rescaleLayout, rescaleLayoutDict, circularLayout, randomLayout, completeGraph, starGraph } from "../src";

describe("Rescale Layout", () => {
    describe("Dictionary format (rescaleLayout)", () => {
        it("should rescale positions dictionary", () => {
            const positions = {
                0: [1, 1],
                1: [-1, 1],
                2: [-1, -1],
                3: [1, -1],
            };

            const rescaled = rescaleLayout(positions, 2);

            // The function scales based on max distance from center
            // Max distance is sqrt(2), so scale factor is 2/sqrt(2) = sqrt(2)
            const expectedScale = Math.sqrt(2);
            assert.approximately(rescaled[0][0], expectedScale, 0.01);
            assert.approximately(rescaled[0][1], expectedScale, 0.01);
        });

        it("should center positions around specified point", () => {
            const positions = {
                A: [1, 1],
                B: [-1, 1],
                C: [-1, -1],
                D: [1, -1],
            };

            const center = [10, 5];
            const rescaled = rescaleLayout(positions, 1, center);

            // The max distance is sqrt(2), scale is 1/sqrt(2)
            const scale = 1 / Math.sqrt(2);
            assert.approximately(rescaled["A"][0], 10 + scale, 0.01);
            assert.approximately(rescaled["A"][1], 5 + scale, 0.01);
        });

        it("should handle empty positions", () => {
            const positions = {};
            const rescaled = rescaleLayout(positions, 2, [5, 5]);

            assert.deepEqual(rescaled, {});
        });

        it("should handle single node", () => {
            const positions = { node1: [3, 4] };
            const rescaled = rescaleLayout(positions, 2, [0, 0]);

            // Single node should be placed at center
            assert.deepEqual(rescaled["node1"], [0, 0]);
        });

        it("should scale and center combined", () => {
            const positions = {
                0: [2, 0],
                1: [0, 2],
                2: [-2, 0],
                3: [0, -2],
            };

            const rescaled = rescaleLayout(positions, 0.5, [10, 10]);

            // Max distance is 2, scale factor is 0.5/2 = 0.25
            assert.approximately(rescaled[0][0], 10.5, 0.01);
            assert.approximately(rescaled[0][1], 10, 0.01);
        });
    });

    describe("Array format (rescaleLayout)", () => {
        it("should rescale positions array", () => {
            const positions = [
                [1, 1],
                [-1, 1],
                [-1, -1],
                [1, -1],
            ];

            const rescaled = rescaleLayout(positions, 3);

            // Max distance is sqrt(2), scale factor is 3/sqrt(2)
            const expectedScale = 3 / Math.sqrt(2);
            assert.approximately(rescaled[0][0], expectedScale, 0.01);
            assert.approximately(rescaled[0][1], expectedScale, 0.01);
        });

        it("should center array positions", () => {
            const positions = [
                [1, 0],
                [0, 1],
                [-1, 0],
                [0, -1],
            ];

            const rescaled = rescaleLayout(positions, 1, [5, 5]);

            assert.deepEqual(rescaled[0], [6, 5]);
            assert.deepEqual(rescaled[1], [5, 6]);
            assert.deepEqual(rescaled[2], [4, 5]);
            assert.deepEqual(rescaled[3], [5, 4]);
        });

        it("should handle empty array", () => {
            const positions: number[][] = [];
            const rescaled = rescaleLayout(positions, 2, [5, 5]);

            assert.deepEqual(rescaled, []);
        });

        it("should handle 3D positions", () => {
            const positions = [
                [1, 1, 1],
                [-1, -1, -1],
            ];

            const rescaled = rescaleLayout(positions, 2, [0, 0, 0]);

            // Max distance is sqrt(3), scale factor is 2/sqrt(3)
            const scale = 2 / Math.sqrt(3);
            assert.approximately(rescaled[0][0], scale, 0.01);
            assert.approximately(rescaled[0][1], scale, 0.01);
            assert.approximately(rescaled[0][2], scale, 0.01);
        });
    });

    describe("Integration with layouts", () => {
        it("should rescale circular layout", () => {
            const graph = completeGraph(6);
            const positions = circularLayout(graph, 1); // radius 1

            const rescaled = rescaleLayout(positions, 5); // scale up to radius 5

            // Check that all nodes are now at radius ~5
            Object.values(rescaled).forEach((pos) => {
                const radius = Math.sqrt(pos[0] ** 2 + pos[1] ** 2);
                assert.approximately(radius, 5, 0.01);
            });
        });

        it("should recenter random layout", () => {
            const graph = starGraph(5);
            const positions = randomLayout(graph, [0, 0]); // centered at origin

            const newCenter = [20, 30];
            const rescaled = rescaleLayout(positions, 1, newCenter);

            // Calculate new center of mass
            const com = [0, 0];
            Object.values(rescaled).forEach((pos) => {
                com[0] += pos[0];
                com[1] += pos[1];
            });
            com[0] /= 5;
            com[1] /= 5;

            assert.approximately(com[0], newCenter[0], 1);
            assert.approximately(com[1], newCenter[1], 1);
        });

        it("should maintain relative positions", () => {
            const positions = {
                A: [1, 0],
                B: [0, 1],
                C: [-1, 0],
                D: [0, -1],
            };

            const rescaled = rescaleLayout(positions, 2.5, [10, 10]);

            // Check that relative positions are maintained
            // A-C should still be horizontal, B-D vertical
            assert.approximately(rescaled["A"][1], rescaled["C"][1], 0.001); // Same Y
            assert.approximately(rescaled["B"][0], rescaled["D"][0], 0.001); // Same X

            // Check distance is scaled properly
            const originalMaxDist = 1; // from center to any point
            const newMaxDist = Math.sqrt((rescaled["A"][0] - 10) ** 2 + (rescaled["A"][1] - 10) ** 2);
            assert.approximately(newMaxDist, 2.5, 0.01);
        });
    });

    describe("rescaleLayoutDict specific", () => {
        it("should be an alias for rescaleLayout with dictionary", () => {
            const positions = {
                node1: [1, 1],
                node2: [-1, -1],
            };

            const result1 = rescaleLayout(positions, 2);
            const result2 = rescaleLayoutDict(positions, 2);

            // Compare values with tolerance for floating point
            Object.keys(result1).forEach((key) => {
                assert.approximately(result1[key][0], result2[key][0], 0.001);
                assert.approximately(result1[key][1], result2[key][1], 0.001);
            });
        });

        it("should handle string node IDs", () => {
            const positions = {
                "user:1": [2, 3],
                "user:2": [4, 5],
                "item:1": [1, 2],
            };

            const rescaled = rescaleLayoutDict(positions, 0.5, [0, 0]);

            assert.isDefined(rescaled["user:1"]);
            assert.isDefined(rescaled["user:2"]);
            assert.isDefined(rescaled["item:1"]);
        });
    });

    describe("Edge cases", () => {
        it("should handle zero scale", () => {
            const positions = {
                A: [5, 5],
                B: [10, 10],
                C: [-5, -5],
            };

            const rescaled = rescaleLayout(positions, 0, [7, 7]);

            // All nodes should collapse to center
            assert.deepEqual(rescaled["A"], [7, 7]);
            assert.deepEqual(rescaled["B"], [7, 7]);
            assert.deepEqual(rescaled["C"], [7, 7]);
        });

        it("should handle negative scale", () => {
            const positions = {
                0: [1, 0],
                1: [0, 1],
            };

            const rescaled = rescaleLayout(positions, -1);

            // Center is at (0.5, 0.5)
            // Centered positions: [0.5, -0.5] and [-0.5, 0.5]
            // Max distance = sqrt(0.5² + 0.5²) = 0.707...
            // Scale factor = -1/0.707... = -1.414...
            // Should flip and scale positions
            assert.approximately(rescaled[0][0], -0.707, 0.01);
            assert.approximately(rescaled[0][1], 0.707, 0.01);
            assert.approximately(rescaled[1][0], 0.707, 0.01);
            assert.approximately(rescaled[1][1], -0.707, 0.01);
        });

        it("should preserve original positions object", () => {
            const positions = {
                A: [1, 2],
                B: [3, 4],
            };

            const original = JSON.parse(JSON.stringify(positions));
            const rescaled = rescaleLayout(positions, 2);

            // Original should be unchanged
            assert.deepEqual(positions, original);

            // Rescaled should be different
            assert.notDeepEqual(rescaled["A"], positions["A"]);
        });

        it("should handle positions with different dimensions", () => {
            const positions = {
                A: [1, 2],
                B: [3, 4, 5], // 3D
                C: [6], // 1D
            };

            const rescaled = rescaleLayout(positions, 2, [0, 0, 0]);

            // rescaleLayout uses dimension of first position (A has 2D)
            // But when center has more dimensions, the result extends to match center
            assert.equal(rescaled["A"].length, 3);
            assert.equal(rescaled["A"][2], 0); // Third dimension from center
            assert.equal(rescaled["B"].length, 3);
            assert.equal(rescaled["C"].length, 3);
        });

        it("should handle very large scale factors", () => {
            const positions = {
                0: [0.001, 0],
                1: [-0.001, 0],
            };

            const rescaled = rescaleLayout(positions, 1000);

            // Max distance is 0.001, scale factor is 1000/0.001 = 1,000,000
            assert.approximately(rescaled[0][0], 1000, 0.1);
            assert.approximately(rescaled[1][0], -1000, 0.1);
        });

        it("should handle positions at origin", () => {
            const positions = {
                A: [0, 0],
                B: [1, 0],
                C: [0, 1],
            };

            const rescaled = rescaleLayout(positions, 3, [10, 10]);

            // Center is at (1/3, 1/3)
            // After centering: A=[-1/3,-1/3], B=[2/3,-1/3], C=[-1/3,2/3]
            // Max distance = sqrt((2/3)^2 + (2/3)^2) = sqrt(8/9) = 0.9428...
            // Scale factor = 3 / 0.9428 = 3.182...
            // B after scaling = [2/3 * 3.182, -1/3 * 3.182] + [10, 10] = [12.12, 8.94]
            const dist = Math.sqrt((rescaled["B"][0] - 10) ** 2 + (rescaled["B"][1] - 10) ** 2);
            assert.approximately(dist, 3, 0.1);
        });
    });

    describe("Practical usage patterns", () => {
        it("should normalize layout to unit square", () => {
            const positions = {
                0: [10, 20],
                1: [30, 40],
                2: [20, 10],
                3: [40, 30],
            };

            // Scale to fit in unit square centered at (0.5, 0.5)
            const rescaled = rescaleLayout(positions, 0.5, [0.5, 0.5]);

            // Check that layout fits in reasonable bounds
            const values = Object.values(rescaled);
            const xCoords = values.map((p) => p[0]);
            const yCoords = values.map((p) => p[1]);

            assert.isAtLeast(Math.min(...xCoords), 0);
            assert.isAtMost(Math.max(...xCoords), 1);
            assert.isAtLeast(Math.min(...yCoords), 0);
            assert.isAtMost(Math.max(...yCoords), 1);
        });

        it("should combine multiple layouts with different scales", () => {
            const layout1 = {
                A: [1, 1],
                B: [-1, 1],
            };

            const layout2 = {
                C: [0.5, 0.5],
                D: [-0.5, 0.5],
            };

            // Scale second layout and offset it
            const rescaled2 = rescaleLayout(layout2, 2, [5, 0]);

            // Combine layouts
            const combined = { ...layout1, ...rescaled2 };

            assert.equal(Object.keys(combined).length, 4);
            assert.deepEqual(combined["A"], [1, 1]);

            // Check rescaled layout is positioned correctly
            const centerX = (rescaled2["C"][0] + rescaled2["D"][0]) / 2;
            assert.approximately(centerX, 5, 0.1);
        });
    });
});

// Note: rescaleLayoutDict is tested implicitly through rescaleLayout tests
// since they share the same implementation for dictionary inputs
