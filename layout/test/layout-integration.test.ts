import { describe, it, expect } from "vitest";
import { forceatlas2Layout, springLayout, kamadaKawaiLayout, arfLayout } from "../src/index";
import { randomGraph, completeGraph } from "../src/generators";

describe("Layout Integration Tests - 3D with Real Usage Patterns", () => {
    // Test the actual usage pattern from the examples
    it("should handle the exact usage pattern from 3D examples", () => {
        const graph = randomGraph(25, 0.15, Date.now());

        // Spring layout as used in example
        const springPositions = springLayout(
            graph,
            1, // k (spring constant)
            null, // pos
            null, // fixed
            50, // iterations
            200, // scale - as used in example!
            [0, 0, 0],
            3, // 3D
        );

        Object.values(springPositions).forEach((pos) => {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should handle ForceAtlas2 with typical example parameters", () => {
        const graph = randomGraph(25, 0.15, Date.now());

        const positions = forceatlas2Layout(
            graph,
            null,
            100,
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
            Date.now(),
            3, // 3D
        );

        // Positions need manual scaling (as done in example)
        const scaledPositions = {};
        Object.entries(positions).forEach(([node, pos]) => {
            scaledPositions[node] = [pos[0] * 200, pos[1] * 200, pos[2] * 200];

            // Check original positions are valid
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should handle switching between 2D and 3D layouts", () => {
        const graph = completeGraph(10);

        // Start with 2D layout
        const positions2D = springLayout(graph, 1, null, null, 50, 1, [0, 0], 2);

        // Use 2D positions as initial for 3D layout
        const positions3D = forceatlas2Layout(
            graph,
            positions2D, // 2D initial positions!
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

        Object.entries(positions3D).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        });
    });

    it("should handle all force-directed layouts in 3D consistently", () => {
        const graph = randomGraph(10, 0.3, 42);

        // Test all force-directed algorithms
        const layouts = {
            spring: springLayout(graph, 1, null, null, 50, 1, [0, 0, 0], 3),
            forceatlas2: forceatlas2Layout(
                graph,
                null,
                50,
                1,
                2,
                1,
                false,
                false,
                null,
                null,
                null,
                false,
                false,
                42,
                3,
            ),
            kamadaKawai: kamadaKawaiLayout(graph, null, null, null, 1, [0, 0, 0], 3),
            arf: arfLayout(graph, null, 1, 1.1, 50, 42, 2), // ARF is 2D only
        };

        // All except ARF should produce valid 3D positions
        ["spring", "forceatlas2", "kamadaKawai"].forEach((name) => {
            const positions = layouts[name];
            Object.values(positions).forEach((pos) => {
                expect(pos).toHaveLength(3);
                expect(isNaN(pos[0])).toBe(false);
                expect(isNaN(pos[1])).toBe(false);
                expect(isNaN(pos[2])).toBe(false);
            });
        });

        // ARF should be 2D
        Object.values(layouts.arf).forEach((pos) => {
            expect(pos).toHaveLength(2);
        });
    });

    it("should handle graph generators that create specific node types", () => {
        const graph = {
            nodes: () => [0, 1, 2, 3, 4], // Numeric nodes
            edges: () => [
                [0, 1],
                [1, 2],
                [2, 3],
                [3, 4],
                [4, 0],
            ],
        };

        const positions = forceatlas2Layout(
            graph,
            null,
            50,
            1,
            2,
            1,
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

        graph.nodes().forEach((node) => {
            expect(positions[node]).toBeDefined();
            expect(positions[node]).toHaveLength(3);
            expect(isNaN(positions[node][0])).toBe(false);
            expect(isNaN(positions[node][1])).toBe(false);
            expect(isNaN(positions[node][2])).toBe(false);
        });
    });
});
