/**
 * Tests for NumPy-like utility functions
 */

import { assert, describe, it } from "vitest";

import { np } from "../src/utils/numpy";

describe("NumPy Utils", () => {
    describe("zeros", () => {
        it("should create 1D array of zeros", () => {
            assert.deepEqual(np.zeros(3), [0, 0, 0]);
            assert.deepEqual(np.zeros(0), []);
            assert.deepEqual(np.zeros(1), [0]);
        });

        it("should create 1D array from single-element array shape", () => {
            assert.deepEqual(np.zeros([3]), [0, 0, 0]);
            assert.deepEqual(np.zeros([0]), []);
        });

        it("should create 2D array of zeros", () => {
            assert.deepEqual(np.zeros([2, 3]), [
                [0, 0, 0],
                [0, 0, 0],
            ]);
            assert.deepEqual(np.zeros([3, 2]), [
                [0, 0],
                [0, 0],
                [0, 0],
            ]);
            assert.deepEqual(np.zeros([1, 1]), [[0]]);
        });

        it("should create 3D array of zeros", () => {
            const result = np.zeros([2, 2, 2]) as number[][][];
            assert.deepEqual(result, [
                [
                    [0, 0],
                    [0, 0],
                ],
                [
                    [0, 0],
                    [0, 0],
                ],
            ]);
        });
    });

    describe("ones", () => {
        it("should create 1D array of ones", () => {
            assert.deepEqual(np.ones(3), [1, 1, 1]);
            assert.deepEqual(np.ones(0), []);
            assert.deepEqual(np.ones(1), [1]);
        });

        it("should create 1D array from single-element array shape", () => {
            assert.deepEqual(np.ones([3]), [1, 1, 1]);
            assert.deepEqual(np.ones([0]), []);
        });

        it("should create 2D array of ones", () => {
            assert.deepEqual(np.ones([2, 3]), [
                [1, 1, 1],
                [1, 1, 1],
            ]);
            assert.deepEqual(np.ones([3, 2]), [
                [1, 1],
                [1, 1],
                [1, 1],
            ]);
        });

        it("should create 3D array of ones", () => {
            const result = np.ones([2, 1, 2]) as number[][][];
            assert.deepEqual(result, [[[1, 1]], [[1, 1]]]);
        });
    });

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

    describe("array", () => {
        it("should copy arrays", () => {
            const input = [1, 2, 3];
            const result = np.array(input);
            assert.deepEqual(result, input);
            assert.notStrictEqual(result, input); // different reference
        });

        it("should wrap non-arrays", () => {
            assert.deepEqual(np.array(5), [5]);
            assert.deepEqual(np.array("hello"), ["hello"]);
            assert.deepEqual(np.array(null), [null]);
        });

        it("should handle nested arrays", () => {
            const input = [
                [1, 2],
                [3, 4],
            ];
            const result = np.array(input);
            assert.deepEqual(result, input);
            assert.notStrictEqual(result, input);
        });
    });

    describe("repeat", () => {
        it("should repeat single values", () => {
            assert.deepEqual(np.repeat(5, 3), [5, 5, 5]);
            assert.deepEqual(np.repeat("a", 2), ["a", "a"]);
        });

        it("should repeat arrays", () => {
            assert.deepEqual(np.repeat([1, 2], 2), [1, 2, 1, 2]);
            assert.deepEqual(np.repeat([1, 2, 3], 3), [1, 2, 3, 1, 2, 3, 1, 2, 3]);
        });

        it("should handle zero repeats", () => {
            assert.deepEqual(np.repeat(5, 0), []);
            assert.deepEqual(np.repeat([1, 2], 0), []);
        });

        it("should handle single repeat", () => {
            assert.deepEqual(np.repeat([1, 2, 3], 1), [1, 2, 3]);
        });
    });

    describe("mean", () => {
        it("should calculate mean of 1D array", () => {
            assert.strictEqual(np.mean([1, 2, 3, 4, 5]), 3);
            assert.strictEqual(np.mean([2, 4, 6]), 4);
            assert.strictEqual(np.mean([10]), 10);
        });

        it("should calculate mean of 2D array (flatten)", () => {
            assert.strictEqual(
                np.mean([
                    [1, 2],
                    [3, 4],
                ]),
                2.5,
            );
            assert.strictEqual(
                np.mean([
                    [1, 1],
                    [1, 1],
                ]),
                1,
            );
        });

        it("should calculate mean along axis 0 (columns)", () => {
            const result = np.mean(
                [
                    [1, 2, 3],
                    [4, 5, 6],
                ],
                0,
            ) as number[];
            assert.deepEqual(result, [2.5, 3.5, 4.5]);
        });

        it("should calculate mean along axis 1 (rows)", () => {
            const result = np.mean(
                [
                    [1, 2, 3],
                    [4, 5, 6],
                ],
                1,
            ) as number[];
            assert.deepEqual(result, [2, 5]);
        });

        it("should handle empty arrays", () => {
            assert.isNaN(np.mean([]));
        });

        it("should handle nested empty arrays", () => {
            assert.isNaN(np.mean([[], []]));
        });
    });

    describe("add", () => {
        it("should add two numbers", () => {
            assert.strictEqual(np.add(5, 3), 8);
            assert.strictEqual(np.add(-2, 7), 5);
        });

        it("should add number to array", () => {
            assert.deepEqual(np.add(2, [1, 2, 3]), [3, 4, 5]);
            assert.deepEqual(np.add([1, 2, 3], 10), [11, 12, 13]);
        });

        it("should add two arrays element-wise", () => {
            assert.deepEqual(np.add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
            assert.deepEqual(np.add([10, 20], [1, 2]), [11, 22]);
        });

        it("should handle negative numbers", () => {
            assert.deepEqual(np.add([-1, -2], [1, 2]), [0, 0]);
            assert.deepEqual(np.add(5, [-3, -7]), [2, -2]);
        });
    });

    describe("subtract", () => {
        it("should subtract two numbers", () => {
            assert.strictEqual(np.subtract(8, 3), 5);
            assert.strictEqual(np.subtract(-2, 7), -9);
        });

        it("should subtract number from array", () => {
            assert.deepEqual(np.subtract(10, [1, 2, 3]), [9, 8, 7]);
            assert.deepEqual(np.subtract([5, 6, 7], 2), [3, 4, 5]);
        });

        it("should subtract two arrays element-wise", () => {
            assert.deepEqual(np.subtract([5, 7, 9], [1, 2, 3]), [4, 5, 6]);
            assert.deepEqual(np.subtract([10, 20], [3, 5]), [7, 15]);
        });

        it("should handle negative results", () => {
            assert.deepEqual(np.subtract([1, 2], [5, 7]), [-4, -5]);
        });
    });

    describe("max", () => {
        it("should return single number as-is", () => {
            assert.strictEqual(np.max(42), 42);
            assert.strictEqual(np.max(-5), -5);
        });

        it("should find max in 1D array", () => {
            assert.strictEqual(np.max([1, 5, 3, 9, 2]), 9);
            assert.strictEqual(np.max([-10, -5, -20]), -5);
            assert.strictEqual(np.max([7]), 7);
        });

        it("should find max in nested arrays", () => {
            assert.strictEqual(
                np.max([
                    [1, 2],
                    [3, 4],
                ]),
                4,
            );
            assert.strictEqual(
                np.max([
                    [10, 5],
                    [2, 8],
                    [1, 12],
                ]),
                12,
            );
        });

        it("should handle deeply nested arrays", () => {
            assert.strictEqual(np.max([[[1, 2]], [[3, 4]]]), 4);
        });
    });

    describe("min", () => {
        it("should return single number as-is", () => {
            assert.strictEqual(np.min(42), 42);
            assert.strictEqual(np.min(-5), -5);
        });

        it("should find min in 1D array", () => {
            assert.strictEqual(np.min([1, 5, 3, 9, 2]), 1);
            assert.strictEqual(np.min([-10, -5, -20]), -20);
            assert.strictEqual(np.min([7]), 7);
        });

        it("should find min in nested arrays", () => {
            assert.strictEqual(
                np.min([
                    [1, 2],
                    [3, 4],
                ]),
                1,
            );
            assert.strictEqual(
                np.min([
                    [10, 5],
                    [2, 8],
                    [1, 12],
                ]),
                1,
            );
        });

        it("should handle deeply nested arrays", () => {
            assert.strictEqual(np.min([[[1, 2]], [[3, 4]]]), 1);
        });
    });

    describe("norm", () => {
        it("should calculate Euclidean norm", () => {
            assert.strictEqual(np.norm([3, 4]), 5); // 3-4-5 triangle
            assert.strictEqual(np.norm([1, 0]), 1);
            assert.strictEqual(np.norm([0, 0]), 0);
        });

        it("should handle negative values", () => {
            assert.strictEqual(np.norm([-3, 4]), 5);
            assert.strictEqual(np.norm([-3, -4]), 5);
        });

        it("should handle single element", () => {
            assert.strictEqual(np.norm([5]), 5);
            assert.strictEqual(np.norm([-7]), 7);
        });

        it("should handle higher dimensions", () => {
            assert.approximately(np.norm([1, 2, 2]), 3, 0.005); // sqrt(1 + 4 + 4) = 3
        });

        it("should handle empty array", () => {
            assert.strictEqual(np.norm([]), 0);
        });
    });
});
