/**
 * Tests for random number generator utilities
 */

import { assert, describe, it } from "vitest";

import { RandomNumberGenerator } from "../src/utils/random";

describe("Random Utils", () => {
    describe("RandomNumberGenerator", () => {
        describe("constructor", () => {
            it("should use provided seed", () => {
                const rng = new RandomNumberGenerator(12345);
                assert.strictEqual(rng.seed, 12345);
            });

            it("should honour an explicit seed of 0", () => {
                const rng1 = new RandomNumberGenerator(0);
                const rng2 = new RandomNumberGenerator(0);
                assert.strictEqual(rng1.seed, 0);
                assert.deepEqual([rng1._next(), rng1._next()], [rng2._next(), rng2._next()]);
            });

            it("should generate random seed when none provided", () => {
                const rng1 = new RandomNumberGenerator();
                const rng2 = new RandomNumberGenerator();
                // Seeds should be different (very high probability)
                assert.notStrictEqual(rng1.seed, rng2.seed);
            });

            it("should initialize state properly", () => {
                const rng = new RandomNumberGenerator(42);
                // The state starts at the seed, so the first draw is one LCG step from 42
                assert.strictEqual(rng._next(), (185852 * 42 + 1) / (2 ** 35 - 31));
            });

            it("should handle large seeds", () => {
                const largeSeed = 999999999;
                const rng = new RandomNumberGenerator(largeSeed);
                assert.strictEqual(rng.seed, largeSeed);
            });
        });

        describe("_next", () => {
            it("should generate values between 0 and 1", () => {
                const rng = new RandomNumberGenerator(123);
                for (let i = 0; i < 100; i++) {
                    const value = rng._next();
                    assert.isAtLeast(value, 0);
                    assert.isBelow(value, 1);
                }
            });

            it("should be deterministic for same seed", () => {
                const rng1 = new RandomNumberGenerator(456);
                const rng2 = new RandomNumberGenerator(456);

                const sequence1 = Array.from({ length: 10 }, () => rng1._next());
                const sequence2 = Array.from({ length: 10 }, () => rng2._next());

                assert.deepEqual(sequence1, sequence2);
            });

            it("should produce different sequences for different seeds", () => {
                const rng1 = new RandomNumberGenerator(111);
                const rng2 = new RandomNumberGenerator(222);

                const sequence1 = Array.from({ length: 10 }, () => rng1._next());
                const sequence2 = Array.from({ length: 10 }, () => rng2._next());

                assert.notDeepEqual(sequence1, sequence2);
            });
        });

        describe("rand", () => {
            it("should return single number when no shape provided", () => {
                const rng = new RandomNumberGenerator(789);
                const value = rng.rand() as number;
                assert.strictEqual(typeof value, "number");
                assert.isAtLeast(value, 0);
                assert.isBelow(value, 1);
            });

            it("should return single number when null shape provided", () => {
                const rng = new RandomNumberGenerator(789);
                const value = rng.rand(null) as number;
                assert.strictEqual(typeof value, "number");
                assert.isAtLeast(value, 0);
                assert.isBelow(value, 1);
            });

            it("should return 1D array when given number shape", () => {
                const rng = new RandomNumberGenerator(101112);
                const values = rng.rand(5) as number[];
                assert.strictEqual(Array.isArray(values), true);
                assert.lengthOf(values, 5);
                values.forEach((v) => {
                    assert.isAtLeast(v, 0);
                    assert.isBelow(v, 1);
                });
            });

            it("should return empty array for zero length", () => {
                const rng = new RandomNumberGenerator(123);
                assert.deepEqual(rng.rand(0), []);
            });

            it("should return 1D array when given single-element array shape", () => {
                const rng = new RandomNumberGenerator(131415);
                const values = rng.rand([4]) as number[];
                assert.strictEqual(Array.isArray(values), true);
                assert.lengthOf(values, 4);
                values.forEach((v) => {
                    assert.isAtLeast(v, 0);
                    assert.isBelow(v, 1);
                });
            });

            it("should return 2D array when given 2D shape", () => {
                const rng = new RandomNumberGenerator(161718);
                const values = rng.rand([2, 3]) as number[][];
                assert.strictEqual(Array.isArray(values), true);
                assert.lengthOf(values, 2);
                values.forEach((row) => {
                    assert.strictEqual(Array.isArray(row), true);
                    assert.lengthOf(row, 3);
                    row.forEach((v) => {
                        assert.isAtLeast(v, 0);
                        assert.isBelow(v, 1);
                    });
                });
            });

            it("should return 3D array when given 3D shape", () => {
                const rng = new RandomNumberGenerator(192021);
                const values = rng.rand([2, 2, 2]) as number[][][];
                assert.strictEqual(Array.isArray(values), true);
                assert.lengthOf(values, 2);
                values.forEach((plane) => {
                    assert.strictEqual(Array.isArray(plane), true);
                    assert.lengthOf(plane, 2);
                    plane.forEach((row) => {
                        assert.strictEqual(Array.isArray(row), true);
                        assert.lengthOf(row, 2);
                        row.forEach((v) => {
                            assert.isAtLeast(v, 0);
                            assert.isBelow(v, 1);
                        });
                    });
                });
            });

            it("should handle edge cases with zeros in shape", () => {
                const rng = new RandomNumberGenerator(222324);
                assert.deepEqual(rng.rand([0]), []);
                assert.deepEqual(rng.rand([3, 0]), [[], [], []]);
                assert.deepEqual(rng.rand([0, 3]), []);
            });

            it("should be deterministic across calls with same seed", () => {
                const rng1 = new RandomNumberGenerator(252627);
                const rng2 = new RandomNumberGenerator(252627);

                const values1 = rng1.rand([2, 3]) as number[][];
                const values2 = rng2.rand([2, 3]) as number[][];

                assert.deepEqual(values1, values2);
            });

            it("should handle single element arrays", () => {
                const rng = new RandomNumberGenerator(282930);
                const value1D = rng.rand(1) as number[];
                const value2D = rng.rand([1, 1]) as number[][];

                assert.lengthOf(value1D, 1);
                assert.lengthOf(value2D, 1);
                assert.lengthOf(value2D[0], 1);
            });

            it("should produce different values in sequence", () => {
                const rng = new RandomNumberGenerator(313233);
                const values = rng.rand(10) as number[];

                // Check that not all values are the same (very high probability)
                const uniqueValues = new Set(values);
                assert.isAbove(uniqueValues.size, 1);
            });
        });

        describe("integration tests", () => {
            it("should work correctly for layout algorithm use cases", () => {
                const rng = new RandomNumberGenerator(424344);

                // Test typical usage patterns in layout algorithms
                const initialPositions = rng.rand([5, 2]) as number[][];
                assert.lengthOf(initialPositions, 5);
                initialPositions.forEach((pos) => {
                    assert.lengthOf(pos, 2);
                    assert.isAtLeast(pos[0], 0);
                    assert.isBelow(pos[0], 1);
                    assert.isAtLeast(pos[1], 0);
                    assert.isBelow(pos[1], 1);
                });
            });

            it("should maintain quality of randomness over many calls", () => {
                const rng = new RandomNumberGenerator(454647);
                const values: number[] = [];

                // Generate many values
                for (let i = 0; i < 1000; i++) {
                    values.push(rng.rand() as number);
                }

                // Basic statistical tests
                const mean = values.reduce((a, b) => a + b) / values.length;
                assert.isAbove(mean, 0.4); // Should be around 0.5
                assert.isBelow(mean, 0.6);

                // Check distribution across range
                const firstQuartile = values.filter((v) => v < 0.25).length;
                const secondQuartile = values.filter((v) => v >= 0.25 && v < 0.5).length;
                const thirdQuartile = values.filter((v) => v >= 0.5 && v < 0.75).length;
                const fourthQuartile = values.filter((v) => v >= 0.75).length;

                // Each quartile should have roughly 1/4 of values (allow some variance)
                assert.isAbove(firstQuartile, 200);
                assert.isBelow(firstQuartile, 300);
                assert.isAbove(secondQuartile, 200);
                assert.isBelow(secondQuartile, 300);
                assert.isAbove(thirdQuartile, 200);
                assert.isBelow(thirdQuartile, 300);
                assert.isAbove(fourthQuartile, 200);
                assert.isBelow(fourthQuartile, 300);
            });
        });
    });
});
