/**
 * Tests for random number generator utilities
 */

import { describe, it, expect } from "vitest";
import { RandomNumberGenerator } from "../src/utils/random";

describe("Random Utils", () => {
    describe("RandomNumberGenerator", () => {
        describe("constructor", () => {
            it("should use provided seed", () => {
                const rng = new RandomNumberGenerator(12345);
                expect(rng["seed"]).toBe(12345);
            });

            it("should generate random seed when none provided", () => {
                const rng1 = new RandomNumberGenerator();
                const rng2 = new RandomNumberGenerator();
                // Seeds should be different (very high probability)
                expect(rng1["seed"]).not.toBe(rng2["seed"]);
            });

            it("should initialize state properly", () => {
                const rng = new RandomNumberGenerator(42);
                expect(rng["_state"]).toBe(42);
            });

            it("should handle large seeds", () => {
                const largeSeed = 999999999;
                const rng = new RandomNumberGenerator(largeSeed);
                expect(rng["seed"]).toBe(largeSeed);
            });
        });

        describe("_next", () => {
            it("should generate values between 0 and 1", () => {
                const rng = new RandomNumberGenerator(123);
                for (let i = 0; i < 100; i++) {
                    const value = rng["_next"]();
                    expect(value).toBeGreaterThanOrEqual(0);
                    expect(value).toBeLessThan(1);
                }
            });

            it("should be deterministic for same seed", () => {
                const rng1 = new RandomNumberGenerator(456);
                const rng2 = new RandomNumberGenerator(456);

                const sequence1 = Array.from({ length: 10 }, () => rng1["_next"]());
                const sequence2 = Array.from({ length: 10 }, () => rng2["_next"]());

                expect(sequence1).toEqual(sequence2);
            });

            it("should produce different sequences for different seeds", () => {
                const rng1 = new RandomNumberGenerator(111);
                const rng2 = new RandomNumberGenerator(222);

                const sequence1 = Array.from({ length: 10 }, () => rng1["_next"]());
                const sequence2 = Array.from({ length: 10 }, () => rng2["_next"]());

                expect(sequence1).not.toEqual(sequence2);
            });
        });

        describe("rand", () => {
            it("should return single number when no shape provided", () => {
                const rng = new RandomNumberGenerator(789);
                const value = rng.rand() as number;
                expect(typeof value).toBe("number");
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(1);
            });

            it("should return single number when null shape provided", () => {
                const rng = new RandomNumberGenerator(789);
                const value = rng.rand(null) as number;
                expect(typeof value).toBe("number");
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(1);
            });

            it("should return 1D array when given number shape", () => {
                const rng = new RandomNumberGenerator(101112);
                const values = rng.rand(5) as number[];
                expect(Array.isArray(values)).toBe(true);
                expect(values).toHaveLength(5);
                values.forEach((v) => {
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThan(1);
                });
            });

            it("should return empty array for zero length", () => {
                const rng = new RandomNumberGenerator(123);
                expect(rng.rand(0)).toEqual([]);
            });

            it("should return 1D array when given single-element array shape", () => {
                const rng = new RandomNumberGenerator(131415);
                const values = rng.rand([4]) as number[];
                expect(Array.isArray(values)).toBe(true);
                expect(values).toHaveLength(4);
                values.forEach((v) => {
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThan(1);
                });
            });

            it("should return 2D array when given 2D shape", () => {
                const rng = new RandomNumberGenerator(161718);
                const values = rng.rand([2, 3]) as number[][];
                expect(Array.isArray(values)).toBe(true);
                expect(values).toHaveLength(2);
                values.forEach((row) => {
                    expect(Array.isArray(row)).toBe(true);
                    expect(row).toHaveLength(3);
                    row.forEach((v) => {
                        expect(v).toBeGreaterThanOrEqual(0);
                        expect(v).toBeLessThan(1);
                    });
                });
            });

            it("should return 3D array when given 3D shape", () => {
                const rng = new RandomNumberGenerator(192021);
                const values = rng.rand([2, 2, 2]) as number[][][];
                expect(Array.isArray(values)).toBe(true);
                expect(values).toHaveLength(2);
                values.forEach((plane) => {
                    expect(Array.isArray(plane)).toBe(true);
                    expect(plane).toHaveLength(2);
                    plane.forEach((row) => {
                        expect(Array.isArray(row)).toBe(true);
                        expect(row).toHaveLength(2);
                        row.forEach((v) => {
                            expect(v).toBeGreaterThanOrEqual(0);
                            expect(v).toBeLessThan(1);
                        });
                    });
                });
            });

            it("should handle edge cases with zeros in shape", () => {
                const rng = new RandomNumberGenerator(222324);
                expect(rng.rand([0])).toEqual([]);
                expect(rng.rand([3, 0])).toEqual([[], [], []]);
                expect(rng.rand([0, 3])).toEqual([]);
            });

            it("should be deterministic across calls with same seed", () => {
                const rng1 = new RandomNumberGenerator(252627);
                const rng2 = new RandomNumberGenerator(252627);

                const values1 = rng1.rand([2, 3]) as number[][];
                const values2 = rng2.rand([2, 3]) as number[][];

                expect(values1).toEqual(values2);
            });

            it("should handle single element arrays", () => {
                const rng = new RandomNumberGenerator(282930);
                const value1D = rng.rand(1) as number[];
                const value2D = rng.rand([1, 1]) as number[][];

                expect(value1D).toHaveLength(1);
                expect(value2D).toHaveLength(1);
                expect(value2D[0]).toHaveLength(1);
            });

            it("should produce different values in sequence", () => {
                const rng = new RandomNumberGenerator(313233);
                const values = rng.rand(10) as number[];

                // Check that not all values are the same (very high probability)
                const uniqueValues = new Set(values);
                expect(uniqueValues.size).toBeGreaterThan(1);
            });
        });

        describe("integration tests", () => {
            it("should work correctly for layout algorithm use cases", () => {
                const rng = new RandomNumberGenerator(424344);

                // Test typical usage patterns in layout algorithms
                const initialPositions = rng.rand([5, 2]) as number[][];
                expect(initialPositions).toHaveLength(5);
                initialPositions.forEach((pos) => {
                    expect(pos).toHaveLength(2);
                    expect(pos[0]).toBeGreaterThanOrEqual(0);
                    expect(pos[0]).toBeLessThan(1);
                    expect(pos[1]).toBeGreaterThanOrEqual(0);
                    expect(pos[1]).toBeLessThan(1);
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
                expect(mean).toBeGreaterThan(0.4); // Should be around 0.5
                expect(mean).toBeLessThan(0.6);

                // Check distribution across range
                const firstQuartile = values.filter((v) => v < 0.25).length;
                const secondQuartile = values.filter((v) => v >= 0.25 && v < 0.5).length;
                const thirdQuartile = values.filter((v) => v >= 0.5 && v < 0.75).length;
                const fourthQuartile = values.filter((v) => v >= 0.75).length;

                // Each quartile should have roughly 1/4 of values (allow some variance)
                expect(firstQuartile).toBeGreaterThan(200);
                expect(firstQuartile).toBeLessThan(300);
                expect(secondQuartile).toBeGreaterThan(200);
                expect(secondQuartile).toBeLessThan(300);
                expect(thirdQuartile).toBeGreaterThan(200);
                expect(thirdQuartile).toBeLessThan(300);
                expect(fourthQuartile).toBeGreaterThan(200);
                expect(fourthQuartile).toBeLessThan(300);
            });
        });
    });
});
