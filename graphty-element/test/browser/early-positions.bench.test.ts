/**
 * @file What placing nodes with `positions.set` costs under a static layout, on both render paths (issue #9162).
 *
 * A static layout (fixed, circular, ...) takes the coordinates a `positions.set` wrote into its own answer, so its
 * next publish does not put the nodes back. On renderPath "batched" a row has no `Node`, so it now takes them row by
 * row: one pass over the rows per `positions.set`. Two steps are timed: placing every node before the first frame
 * (load, set, first stable frame), and placing every node again once drawn (set, stable frame).
 *
 * WHAT IS ASSERTED IS THE RESULT: every node stored where it was put, and no `Node` built on the batched path. The
 * times are printed as `[early-positions]`, not asserted. This file gates no push: it runs in "browser-bench".
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { dataManagerInternals } from "../../src/managers/DataManager";

const SIZES = [1_000, 10_000, 100_000] as const;
/** The objects path builds a mesh per node; past this it measures mesh building, not placing. */
const OBJECTS_CEILING = 10_000;

const elements: Graphty[] = [];
afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

/**
 * Where node `i` of `n` goes: a square grid, offset by `shift`.
 * @param n - Nodes.
 * @param shift - Added to x.
 * @returns The entries.
 */
function grid(n: number, shift: number): { id: string; x: number; y: number }[] {
    const side = Math.ceil(Math.sqrt(n));
    return Array.from({ length: n }, (_, i) => ({
        id: `n${String(i)}`,
        x: (i % side) * 2 + shift,
        y: Math.floor(i / side) * 2,
    }));
}

describe("positions.set under a static layout", () => {
    for (const path of ["objects", "batched"] as const) {
        for (const layout of ["fixed", "circular"] as const) {
            for (const n of SIZES) {
                it.skipIf(path === "objects" && n > OBJECTS_CEILING)(`${path} ${layout} ${String(n)}`, async () => {
                    (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
                    const element = document.createElement("graphty-element");
                    element.renderPath = path;
                    element.limits = { renderCeiling: n };
                    element.style.display = "block";
                    element.style.width = "600px";
                    element.style.height = "400px";
                    document.body.appendChild(element);
                    elements.push(element);
                    await element.updateComplete;
                    const { session } = element;
                    await session.layout.setDimension("2d");
                    await session.layout.set(layout);
                    const built = (): number => dataManagerInternals.nodesBuilt(element.graph.getDataManager());

                    const early = grid(n, 0);
                    const t0 = performance.now();
                    await session.data.addNodes(early.map(({ id }) => ({ id })));
                    await session.positions.set(early);
                    await element.waitForStableFrame();
                    const first = performance.now() - t0;

                    const late = grid(n, 1);
                    const t1 = performance.now();
                    await session.positions.set(late);
                    await element.waitForStableFrame();
                    const again = performance.now() - t1;

                    const last = late[n - 1];
                    const stored = session.positions.get(last.id);
                    assert.deepEqual(stored && { x: stored.x, y: stored.y }, { x: last.x, y: last.y });
                    if (path === "batched") {
                        assert.strictEqual(built(), 0, "placing builds no Node");
                    }

                    console.log(
                        `[early-positions] ${path} ${layout} ${String(n)}: first frame ${first.toFixed(0)} ms, set again ${again.toFixed(0)} ms`,
                    );
                });
            }
        }
    }
});
