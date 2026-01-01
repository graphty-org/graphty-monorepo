import { describe, it, expect } from "vitest";
import { forceatlas2Layout } from "../src";
import { completeGraph } from "../src";

describe("ForceAtlas2 NPM Package Bug", () => {
    it("should return valid Z coordinates when dim=3 (bug report test)", () => {
        // Test case from the bug report
        const graph = {
            nodes: () => ["a", "b", "c", "d"],
            edges: () =>
                [
                    ["a", "b"],
                    ["b", "c"],
                    ["c", "d"],
                    ["d", "a"],
                ] as [string, string][],
        };

        const positions = forceatlas2Layout(
            graph,
            null, // pos
            100, // maxIter
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
            3, // dim - requesting 3D!
        );

        // Check that all nodes have 3D positions
        for (const [node, pos] of Object.entries(positions)) {
            expect(pos).toHaveLength(3);
            expect(pos[0]).toBeTypeOf("number");
            expect(pos[1]).toBeTypeOf("number");
            expect(pos[2]).toBeTypeOf("number");

            // Most importantly: Z coordinate should NOT be NaN
            expect(isNaN(pos[2])).toBe(false);
        }
    });

    it("should work with different graph sizes in 3D", () => {
        const sizes = [5, 10, 20];

        for (const n of sizes) {
            const graph = completeGraph(n);
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

            const nodes = graph.nodes();
            expect(Object.keys(positions)).toHaveLength(nodes.length);

            for (const node of nodes) {
                const pos = positions[node];
                expect(pos).toHaveLength(3);
                expect(isNaN(pos[0])).toBe(false);
                expect(isNaN(pos[1])).toBe(false);
                expect(isNaN(pos[2])).toBe(false);
            }
        }
    });

    it("should handle 3D with initial positions", () => {
        const graph = completeGraph(4);
        const initialPos = {
            0: [0, 0, 0],
            1: [1, 0, 0],
            2: [0, 1, 0],
            3: [0, 0, 1],
        };

        const positions = forceatlas2Layout(
            graph,
            initialPos,
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

        for (const [node, pos] of Object.entries(positions)) {
            expect(pos).toHaveLength(3);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false);
        }
    });
});
