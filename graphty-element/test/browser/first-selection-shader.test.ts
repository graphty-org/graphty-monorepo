/**
 * @file The first selection after a load does no work a later one skips (issue #10124).
 *
 * Two costs fell on the first selection only, on a real GPU with 99,000 nodes. The selection halo's material was
 * built then and its shader compiled, holding back the frame that drew the selection; it is now compiled when the
 * scene's first node source is built. And putting the selected row in line with the masks read
 * `DataManager.nodesByIndex`, a table of every node by row rebuilt on its first read after a load, for one row
 * (about 200 ms); the row is now looked up alone. The time is measured in `first-selection-latency.bench.test.ts`.
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
    it.each(["2d", "3d"] as const)("compiles no shader and builds no row table (%s)", async (view) => {
        const grid = await framedGrid(100, view, cleanups);
        const first = await selectByClick(grid);
        assert.equal(first.shaders, 0, "the first click compiled a shader");
        assert.equal(first.rowTableReads, 0, "the first click rebuilt the table of every node by row");
    });
});
