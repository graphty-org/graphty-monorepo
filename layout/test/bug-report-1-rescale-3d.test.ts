import { assert, describe, it } from "vitest";

import type { PositionMap } from "../src/types/index.js";
import { rescaleLayout } from "../src/utils/rescale";

describe("Bug Report #1: rescaleLayout causes NaN for Z coordinates in 3D", () => {
    it("should handle 3D positions without returning NaN for Z coordinates", () => {
        // Test data: 3D positions
        const positions3D = {
            a: [1, 2, 3],
            b: [-1, -2, -3],
            c: [0.5, 0.5, 0.5],
        };

        // Call rescaleLayout with default parameters (this is where the bug occurs)
        const rescaled = rescaleLayout(positions3D);

        // Check that all positions are returned
        assert.lengthOf(Object.keys(rescaled), 3);

        // Check each position
        Object.values(rescaled).forEach((pos) => {
            assert.lengthOf(pos, 3); // Should have 3 coordinates

            // X and Y should be valid numbers
            assert.isNumber(pos[0]);
            assert.isNumber(pos[1]);
            assert.isNotNaN(pos[0]);
            assert.isNotNaN(pos[1]);

            // Z coordinate should now be valid (bug fixed)
            assert.isNumber(pos[2]);
            assert.isNotNaN(pos[2]); // Fixed: Z is now valid
        });
    });

    it("should work correctly when 3D center is provided", () => {
        const positions3D = {
            a: [1, 2, 3],
            b: [-1, -2, -3],
            c: [0.5, 0.5, 0.5],
        };

        // Workaround: provide 3D center
        const rescaled = rescaleLayout(positions3D, 1, [0, 0, 0]);

        Object.values(rescaled).forEach((pos) => {
            assert.lengthOf(pos, 3);
            // All coordinates should be valid numbers
            assert.isNotNaN(pos[0]);
            assert.isNotNaN(pos[1]);
            assert.isNotNaN(pos[2]); // Z should be valid when center is 3D
        });
    });

    it("demonstrates the exact bug scenario from the report", () => {
        // Input from bug report
        const positions = {
            a: [1, 2, 3],
            b: [-1, -2, -3],
            c: [0.5, 0.5, 0.5],
        };

        const result = rescaleLayout(positions) as PositionMap;

        // Bug behavior: default center=[0,0] causes center[2] to be undefined
        // When calculating: val * scaleFactor + center[i]
        // For i=2: number + undefined = NaN

        console.log("Rescaled positions:", result);
        console.log(
            "Z values:",
            Object.entries(result).map(([k, v]) => `${k}: ${v[2]} (isNaN: ${isNaN(v[2])})`),
        );

        // Verify the bug is fixed
        assert.isNotNaN(result.a[2]);
        assert.isNotNaN(result.b[2]);
        assert.isNotNaN(result.c[2]);
    });
});
