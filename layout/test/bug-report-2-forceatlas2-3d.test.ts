import { describe, it, expect } from "vitest";
import { forceatlas2Layout } from "../src/layouts/force-directed/forceatlas2";
import { randomGraph } from "../src/generators/random";

describe("Bug Report #2: forceatlas2Layout returns NaN for Z coordinates in 3D mode", () => {
    it("should return valid 3D positions when dim=3", () => {
        // Create a simple test graph
        const graph = randomGraph(5, 0.5, 42);

        // Run forceatlas2Layout with dim=3
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
            3, // dim - 3D!
        );

        // Check that positions are returned for all nodes
        const nodes = graph.nodes();
        expect(Object.keys(positions)).toHaveLength(nodes.length);

        // Check each position
        Object.entries(positions).forEach(([node, pos]) => {
            expect(pos).toHaveLength(3); // Should have 3 coordinates

            // X and Y coordinates should be valid numbers
            expect(typeof pos[0]).toBe("number");
            expect(typeof pos[1]).toBe("number");
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);

            // Bug fixed: Z coordinate should now be a valid number
            expect(typeof pos[2]).toBe("number");
            expect(isNaN(pos[2])).toBe(false); // Bug is fixed!
        });
    });

    it("demonstrates the bug with a specific graph structure", () => {
        // Create graph from bug report
        const graph = {
            nodes: () => ["a", "b", "c", "d"],
            edges: () => [
                ["a", "b"],
                ["b", "c"],
                ["c", "d"],
                ["d", "a"],
            ],
        };

        const positions3d = forceatlas2Layout(
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
            42,
            3, // 3D
        );

        console.log("ForceAtlas2 3D positions:", positions3d);
        console.log("Z coordinate analysis:");
        Object.entries(positions3d).forEach(([node, pos]) => {
            console.log(`${node}: z=${pos[2]} (type: ${typeof pos[2]}, isNaN: ${isNaN(pos[2])})`);
        });

        // Verify the bug is fixed
        expect(isNaN(positions3d.a[2])).toBe(false);
        expect(isNaN(positions3d.b[2])).toBe(false);
        expect(isNaN(positions3d.c[2])).toBe(false);
        expect(isNaN(positions3d.d[2])).toBe(false);
    });

    it("should work correctly in 2D mode for comparison", () => {
        const graph = randomGraph(5, 0.5, 42);

        const positions2d = forceatlas2Layout(
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
            42,
            2, // 2D
        );

        Object.entries(positions2d).forEach(([node, pos]) => {
            expect(pos).toHaveLength(2);
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
        });
    });

    it("demonstrates the cascading effect with rescaleLayout", () => {
        const graph = {
            nodes: () => ["a", "b", "c"],
            edges: () => [
                ["a", "b"],
                ["b", "c"],
            ],
        };

        // ForceAtlas2 returns positions with NaN Z coordinates
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

        // These positions have NaN Z values, which then cause rescaleLayout to fail
        // (rescaleLayout is called internally at the end of forceatlas2Layout)

        // With the fix, ForceAtlas2 now returns valid 3D positions
        Object.entries(positions).forEach(([node, pos]) => {
            console.log(`${node}: [${pos[0]}, ${pos[1]}, ${pos[2]}]`);
            // All coordinates should be valid
            expect(typeof pos[0]).toBe("number");
            expect(typeof pos[1]).toBe("number");
            expect(typeof pos[2]).toBe("number");
            expect(isNaN(pos[0])).toBe(false);
            expect(isNaN(pos[1])).toBe(false);
            expect(isNaN(pos[2])).toBe(false); // Z is now valid!
        });
    });
});
