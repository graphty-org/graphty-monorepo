/**
 * The benchmark harness times every algorithm on generated graphs; a random graph that changed from run to run made
 * the timings move on unchanged code (#5843). Two builds of the same benchmark graph must be identical.
 */

import { describe, expect, it } from "vitest";

import { generateTestGraphs } from "../../benchmarks/utils/test-data-generator.js";

describe("benchmark graphs", () => {
    it("builds the same sparse graph on every run, with its full edge count", () => {
        const first = generateTestGraphs.sparse(500);
        const second = generateTestGraphs.sparse(500);
        expect(second.edges).toEqual(first.edges);
        expect(first.edges).toHaveLength(1500);
    });

    it("builds the same dense graph on every run", () => {
        expect(generateTestGraphs.dense(40).edges).toEqual(generateTestGraphs.dense(40).edges);
    });
});
