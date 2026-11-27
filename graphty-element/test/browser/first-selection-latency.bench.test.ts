/**
 * @file How long the first selection after a load takes beside later ones (issue #10124).
 *
 * The first click on a node used to compile the selection halo's shader, which on a real GPU held back the frame
 * that drew the selection by about 300 ms on a 99,000-node grid. What is asserted is counted work, as in
 * `first-selection-shader.test.ts`: the clicks compile no shader. The times are printed as `[first-selection]`, not
 * asserted.
 *
 * Without a GPU (`GRAPHTY_BROWSER_GPU` unset, as in CI) the grid has 2,000 nodes. This file gates no push: it runs in
 * the "browser-bench" project.
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

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";
const COUNT = GPU ? 99_000 : 2_000;

describe("the first selection after a load", () => {
    it(`takes no longer than a later one (${String(COUNT)} nodes, 2D)`, async () => {
        const grid = await framedGrid(COUNT, "2d", cleanups);
        const clicks = [];
        for (let pass = 0; pass < 3; pass++) {
            clicks.push(await selectByClick(grid));
        }

        console.log(`[first-selection] ${String(COUNT)} nodes 2d ${JSON.stringify(clicks)}`);
        assert.deepEqual(
            clicks.map((one) => one.shaders),
            [0, 0, 0],
            "no click compiles a shader",
        );
    });
});
