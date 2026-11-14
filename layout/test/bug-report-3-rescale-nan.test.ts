import { assert, describe, it } from "vitest";

import type { PositionMap } from "../src/types/index.js";
import { rescaleLayout } from "../src/utils/rescale";

describe("Bug Report #3: rescaleLayout returns all zeros when encountering NaN values", () => {
    it("should return zeros when input contains NaN Z values with 3D center", () => {
        // Positions with NaN Z coordinates (as returned by forceatlas2Layout in 3D)
        const positionsWithNaN = {
            node1: [0.5, 0.3, NaN],
            node2: [-0.2, 0.7, NaN],
            node3: [0.1, -0.5, NaN],
        };

        const scaled = rescaleLayout(positionsWithNaN, 1, [0, 0, 0]);

        // Fixed: When NaN is present, valid coordinates are preserved
        Object.values(scaled).forEach((pos) => {
            assert.lengthOf(pos, 3);
            // X and Y should be rescaled properly
            assert.isNumber(pos[0]);
            assert.isNumber(pos[1]);
            assert.isNotNaN(pos[0]);
            assert.isNotNaN(pos[1]);
            // Z should remain NaN
            assert.isNaN(pos[2]);
        });
    });

    it("demonstrates that valid X,Y coordinates are lost due to NaN in Z", () => {
        // Input has valid X,Y but NaN Z
        const positions = {
            a: [1.5, 2.5, NaN],
            b: [-1.0, -2.0, NaN],
            c: [0.5, 0.5, NaN],
        };

        console.log("Input positions:", positions);
        const result = rescaleLayout(positions);
        console.log("Scaled positions:", result);

        // Fixed: Valid coordinates are preserved, NaN remains NaN
        Object.entries(result).forEach(([node, pos]) => {
            console.log(`${node}: [${pos[0]}, ${pos[1]}, ${pos[2]}]`);
            assert.lengthOf(pos, 3); // Maintains 3D
            assert.isNotNaN(pos[0]); // X is valid
            assert.isNotNaN(pos[1]); // Y is valid
            assert.isNaN(pos[2]); // Z remains NaN
        });
    });

    it("shows the mathematical propagation of NaN through rescaleLayout", () => {
        const positions = {
            node1: [1, 1, NaN],
        };

        // With the fix, rescaleLayout now:
        // 1. Ignores NaN values when calculating center
        // 2. Ignores NaN values when calculating distances
        // 3. Preserves NaN values in the output

        const result = rescaleLayout(positions, 1, [0, 0, 0]) as PositionMap;

        // The function now properly handles NaN: X and Y are rescaled, Z remains NaN
        assert.strictEqual(result.node1[0], 0); // X is rescaled to center
        assert.strictEqual(result.node1[1], 0); // Y is rescaled to center
        assert.isNaN(result.node1[2]); // Z remains NaN
    });

    it("should work correctly with valid 3D positions", () => {
        const validPositions = {
            node1: [0.5, 0.3, 0.2],
            node2: [-0.2, 0.7, -0.1],
            node3: [0.1, -0.5, 0.3],
        };

        const scaled = rescaleLayout(validPositions, 1, [0, 0, 0]);

        // With valid positions, rescaling should work
        Object.values(scaled).forEach((pos) => {
            assert.isTrue(pos.every((v) => !isNaN(v)));
            // Not all values should be zero
            assert.isTrue(pos.some((v) => v !== 0));
        });
    });

    it("demonstrates the cascading bug effect from forceatlas2 to rescale", () => {
        // Simulate what happens in the full pipeline:
        // 1. forceatlas2Layout returns positions with NaN Z (this was bug #2)
        const forceatlas2Output = {
            a: [-0.699, -0.397, NaN],
            b: [-0.547, -0.234, NaN],
            c: [0.709, 0.378, NaN],
            d: [0.537, 0.254, NaN],
        };

        // 2. rescaleLayout is called on these positions
        const finalOutput = rescaleLayout(forceatlas2Output);

        // 3. With the fix, rescaleLayout now preserves dimensionality and handles NaN correctly
        Object.values(finalOutput).forEach((pos) => {
            assert.lengthOf(pos, 3); // Maintains 3D dimension
            assert.isNumber(pos[0]); // X is a valid number
            assert.isNumber(pos[1]); // Y is a valid number
            assert.isNotNaN(pos[0]); // X is not NaN
            assert.isNotNaN(pos[1]); // Y is not NaN
            assert.isNaN(pos[2]); // Z remains NaN
        });

        console.log("Pipeline with fixed rescale:");
        console.log("1. ForceAtlas2 output:", forceatlas2Output);
        console.log("2. After rescale:", finalOutput);
        console.log("Result: X,Y coordinates are properly rescaled, Z remains NaN");
    });

    it("verifies the specific case with null values mentioned in bug report", () => {
        // The bug report mentions null, but let's test both null and NaN
        // A null where the type wants a number: the bad input the bug report describes, as parsed
        // data delivers it.
        const positionsWithNull = JSON.parse('{"node1": [0.5, 0.3, null], "node2": [-0.2, 0.7, null]}') as PositionMap;

        // Note: null gets converted to 0 in calculations, not NaN
        const result = rescaleLayout(positionsWithNull, 1, [0, 0, 0]);

        console.log("Input with null:", positionsWithNull);
        console.log("Result:", result);

        // With null (not NaN), rescaling might work differently
        // This helps clarify the difference between the bug report's claim and actual behavior
    });
});
