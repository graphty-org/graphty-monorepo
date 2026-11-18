/**
 * @file The llm-regression matchers (which run only with a key) accept exactly the registered id a
 * prompt asked for, however the model spelled it, and nothing that merely contains it.
 */

import { assert, describe, it } from "vitest";

import { isAlgorithm, isCameraView, isLayout } from "./llm-regression/matchers";

describe("llm-regression matchers", () => {
    it("matches an algorithm by its key, not by a substring", () => {
        assert.isTrue(isAlgorithm("PageRank", "pagerank"));
        assert.isTrue(isAlgorithm("graphty:degree", "degree"));
        assert.isFalse(isAlgorithm("graphty:edge-betweenness", "betweenness"));
        assert.isFalse(isAlgorithm(undefined, "degree"));
    });

    it("matches a layout by its id or one of its engines", () => {
        assert.isTrue(isLayout("Circular", "circular"));
        assert.isTrue(isLayout("d3", "force"));
        assert.isTrue(isLayout("force-2d", "force"));
        assert.isFalse(isLayout("circle-ish", "circular"));
    });

    it("matches a camera view by its id", () => {
        assert.isTrue(isCameraView("topview", "topView"));
        assert.isFalse(isCameraView("top", "topView"));
    });
});
