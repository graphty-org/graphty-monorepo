import { describe, it, expect } from "vitest";
import { forceatlas2Layout } from "../src/layouts/force-directed/forceatlas2";
import { randomGraph } from "../src/generators/random";

describe("ForceAtlas2 3D Edge Cases", () => {
    it("should handle 2D initial positions when requesting 3D output", () => {
        const graph = randomGraph(5, 0.5, 42);

        // Provide 2D initial positions
        const initialPositions2D = {};
        graph.nodes().forEach((node, i) => {
            initialPositions2D[node] = [i * 0.1, i * 0.2]; // Only X and Y
        });

        // Request 3D output
        const positions3D = forceatlas2Layout(
            graph,
            initialPositions2D, // 2D positions
            50, // maxIter
            1.0, // jitterTolerance
            2.0, // scalingRatio
            1.0, // gravity
            false, // distributedAction
            false, // strongGravity
            null, // nodeMass
            null, // nodeSize
            null, // weight
            false, // dissuadeHubs
            false, // linlog
            42, // seed
            3, // dim - 3D!
        );

        // All positions should be 3D with valid Z coordinates
        Object.entries(positions3D).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3);
            expect(typeof pos[0]).toBe("number");
            expect(typeof pos[1]).toBe("number");
            expect(typeof pos[2]).toBe("number");
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false); // This was failing before the fix!
        });
    });

    it("should handle mixed dimensionality in initial positions", () => {
        const graph = {
            nodes: () => ["a", "b", "c", "d"],
            edges: () => [
                ["a", "b"],
                ["b", "c"],
                ["c", "d"],
            ],
        };

        // Mix of 2D and 3D initial positions
        const mixedPositions = {
            a: [0.1, 0.2], // 2D
            b: [0.3, 0.4, 0.5], // 3D
            c: [0.6, 0.7], // 2D
            // 'd' has no initial position
        };

        const positions3D = forceatlas2Layout(
            graph,
            mixedPositions,
            50,
            1.0,
            2.0,
            1.0,
            false,
            false,
            null,
            null,
            null,
            false,
            false,
            42,
            3, // Request 3D
        );

        // All should be valid 3D
        Object.entries(positions3D).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should handle 1D initial positions when requesting 3D output", () => {
        const graph = {
            nodes: () => ["a", "b", "c"],
            edges: () => [
                ["a", "b"],
                ["b", "c"],
            ],
        };

        // 1D initial positions
        const positions1D = {
            a: [0.5],
            b: [1.0],
            c: [1.5],
        };

        const positions3D = forceatlas2Layout(
            graph,
            positions1D,
            50,
            1.0,
            2.0,
            1.0,
            false,
            false,
            null,
            null,
            null,
            false,
            false,
            42,
            3,
        );

        // Should expand to 3D
        Object.entries(positions3D).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should handle empty positions object when requesting 3D", () => {
        const graph = randomGraph(5, 0.5, 42);

        const positions3D = forceatlas2Layout(
            graph,
            {}, // Empty positions
            50,
            1.0,
            2.0,
            1.0,
            false,
            false,
            null,
            null,
            null,
            false,
            false,
            42,
            3,
        );

        Object.entries(positions3D).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should properly scale 3D positions through rescaleLayout", () => {
        const graph = {
            nodes: () => ["a", "b"],
            edges: () => [["a", "b"]],
        };

        // Very small initial positions
        const tinyPositions = {
            a: [0.0001, 0.0001],
            b: [-0.0001, -0.0001],
        };

        const positions3D = forceatlas2Layout(
            graph,
            tinyPositions,
            10, // Few iterations to keep positions small
            1.0,
            2.0,
            1.0,
            false,
            false,
            null,
            null,
            null,
            false,
            false,
            42,
            3,
        );

        // Positions should be rescaled properly, not collapsed to origin
        const distances = Object.values(positions3D).map((pos) =>
            Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]),
        );

        // At least one node should be away from origin
        expect(Math.max(...distances)).toBeGreaterThan(0.1);

        // No NaN values
        Object.values(positions3D).forEach((pos) => {
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });
});
