/**
 * @file The first selection after a load compiles no shader (issue #10124).
 *
 * The selection halo's source mesh and material are built on the first selection, and compiling that material's
 * shader then held back the frame that drew the selection: about 300 ms on a real GPU with 99,000 nodes, against
 * nothing for every later selection. The shader is now compiled when the scene's first node source is built, so the
 * first real click on a node, in either view, finds it ready. The time is measured in
 * `first-selection-latency.bench.test.ts`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { framedGrid, selectByClick } from "../helpers/first-selection";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("the first selection after a load", () => {
    it.each(["2d", "3d"] as const)("compiles no shader (%s)", async (view) => {
        const grid = await framedGrid(100, view, cleanups);
        const first = await selectByClick(grid);
        assert.equal(first.shaders, 0, "the first click compiled a shader");
    });
});
