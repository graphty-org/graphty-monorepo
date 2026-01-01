/**
 * Tests for utils index exports
 */

import { describe, it, expect } from "vitest";

describe("Utils Index", () => {
    it("should export all utility functions from numpy", async () => {
        const { np } = await import("../src/utils/index");
        expect(np).toBeDefined();
        expect(typeof np.zeros).toBe("function");
        expect(typeof np.ones).toBe("function");
        expect(typeof np.linspace).toBe("function");
        expect(typeof np.array).toBe("function");
        expect(typeof np.repeat).toBe("function");
        expect(typeof np.mean).toBe("function");
        expect(typeof np.add).toBe("function");
        expect(typeof np.subtract).toBe("function");
        expect(typeof np.max).toBe("function");
        expect(typeof np.min).toBe("function");
        expect(typeof np.norm).toBe("function");
    });

    it("should export RandomNumberGenerator class", async () => {
        const { RandomNumberGenerator } = await import("../src/utils/index");
        expect(RandomNumberGenerator).toBeDefined();
        expect(typeof RandomNumberGenerator).toBe("function");

        const rng = new RandomNumberGenerator(123);
        expect(typeof rng.rand).toBe("function");
    });

    it("should export graph utility functions", async () => {
        const { getNodesFromGraph, getEdgesFromGraph, getNodeDegree, getNeighbors } =
            await import("../src/utils/index");
        expect(typeof getNodesFromGraph).toBe("function");
        expect(typeof getEdgesFromGraph).toBe("function");
        expect(typeof getNodeDegree).toBe("function");
        expect(typeof getNeighbors).toBe("function");
    });

    it("should export parameter processing functions", async () => {
        const { _processParams } = await import("../src/utils/index");
        expect(typeof _processParams).toBe("function");
    });

    it("should export rescale functions", async () => {
        const { rescaleLayout, rescaleLayoutDict } = await import("../src/utils/index");
        expect(typeof rescaleLayout).toBe("function");
        expect(typeof rescaleLayoutDict).toBe("function");
    });

    it("should allow importing everything with wildcard", async () => {
        const utils = await import("../src/utils/index");

        // Check that key exports are available
        expect(utils.np).toBeDefined();
        expect(utils.RandomNumberGenerator).toBeDefined();
        expect(utils.getNodesFromGraph).toBeDefined();
        expect(utils._processParams).toBeDefined();
        expect(utils.rescaleLayout).toBeDefined();
    });

    it("should work with destructured imports", async () => {
        // Test that the typical usage patterns work
        const { np, RandomNumberGenerator, getNodesFromGraph } = await import("../src/utils/index");

        // Quick functional test
        expect(np.zeros(3)).toEqual([0, 0, 0]);

        const rng = new RandomNumberGenerator(42);
        const value = rng.rand() as number;
        expect(typeof value).toBe("number");

        const nodes = getNodesFromGraph([1, 2, 3]);
        expect(nodes).toEqual([1, 2, 3]);
    });
});
