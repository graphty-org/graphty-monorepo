/**
 * Tests for NumPy-like utility functions
 */

import { assert, describe, it } from "vitest";

import { np } from "../src/utils/numpy";

describe("NumPy Utils", () => {
    describe("linspace", () => {
        it("should create linearly spaced array", () => {
            const result = np.linspace(0, 1, 5);
            assert.lengthOf(result, 5);
            assert.strictEqual(result[0], 0);
            assert.strictEqual(result[4], 1);
            assert.approximately(result[2], 0.5, 0.005);
        });

        it("should handle single point", () => {
            assert.deepEqual(np.linspace(5, 5, 1), [5]);
        });

        it("should handle reverse range", () => {
            const result = np.linspace(10, 0, 3);
            assert.deepEqual(result, [10, 5, 0]);
        });

        it("should handle negative numbers", () => {
            const result = np.linspace(-1, 1, 3);
            assert.deepEqual(result, [-1, 0, 1]);
        });
    });
});
