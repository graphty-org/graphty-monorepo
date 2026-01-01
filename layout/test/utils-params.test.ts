/**
 * Tests for parameter processing utilities
 */

import { describe, it, expect } from "vitest";
import { _processParams } from "../src/utils/params";
import { createTestGraph } from "./test-utils";

describe("Parameter Utils", () => {
    describe("_processParams", () => {
        it("should use default center when null", () => {
            const graph = createTestGraph([1, 2], [[1, 2]]);
            const result = _processParams(graph, null, 2);

            expect(result.G).toBe(graph);
            expect(result.center).toEqual([0, 0]);
        });

        it("should use default center when undefined", () => {
            const nodes = [1, 2, 3];
            const result = _processParams(nodes, null, 3);

            expect(result.G).toBe(nodes);
            expect(result.center).toEqual([0, 0, 0]);
        });

        it("should preserve provided center", () => {
            const graph = createTestGraph([1, 2], [[1, 2]]);
            const center = [5, 10];
            const result = _processParams(graph, center, 2);

            expect(result.G).toBe(graph);
            expect(result.center).toBe(center);
        });

        it("should work with array of nodes", () => {
            const nodes = ["a", "b", "c"];
            const center = [1, 2, 3];
            const result = _processParams(nodes, center, 3);

            expect(result.G).toBe(nodes);
            expect(result.center).toBe(center);
        });

        it("should throw error when center length does not match dimension", () => {
            const graph = createTestGraph([1, 2], [[1, 2]]);

            expect(() => {
                _processParams(graph, [1, 2], 3); // center has 2 elements, dim is 3
            }).toThrow("length of center coordinates must match dimension of layout");
        });

        it("should throw error when center is too long", () => {
            const nodes = [1, 2, 3];

            expect(() => {
                _processParams(nodes, [1, 2, 3, 4], 2); // center has 4 elements, dim is 2
            }).toThrow("length of center coordinates must match dimension of layout");
        });

        it("should throw error when center is too short", () => {
            const graph = createTestGraph([1], []);

            expect(() => {
                _processParams(graph, [1], 3); // center has 1 element, dim is 3
            }).toThrow("length of center coordinates must match dimension of layout");
        });

        it("should work with 1D layouts", () => {
            const graph = createTestGraph([1, 2], [[1, 2]]);
            const result = _processParams(graph, [5], 1);

            expect(result.center).toEqual([5]);
        });

        it("should work with high-dimensional layouts", () => {
            const nodes = [1, 2, 3];
            const center = [1, 2, 3, 4, 5];
            const result = _processParams(nodes, center, 5);

            expect(result.center).toBe(center);
        });

        it("should handle empty center array for 0D (edge case)", () => {
            const graph = createTestGraph([1], []);
            const result = _processParams(graph, [], 0);

            expect(result.center).toEqual([]);
        });

        it("should create correct default center for various dimensions", () => {
            const graph = createTestGraph([1], []);

            expect(_processParams(graph, null, 1).center).toEqual([0]);
            expect(_processParams(graph, null, 4).center).toEqual([0, 0, 0, 0]);
            expect(_processParams(graph, null, 0).center).toEqual([]);
        });
    });
});
