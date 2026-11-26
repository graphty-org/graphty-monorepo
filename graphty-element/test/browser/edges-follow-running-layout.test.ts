/**
 * @file Edges, arrowheads, labels and self-loops follow their nodes on every frame the element
 * draws while a layout moves the nodes, and while a node is dragged with the real mouse, on both
 * render paths, in 2D and 3D. Every other force-layout check waits for a still frame, so an edge
 * that lags only while the layout runs passes them all. Layout transitions are checked in
 * edges-follow-through-a-transition.test.ts, steps taken part way through a layout in
 * edges-follow-steps-mid-layout.test.ts.
 *
 * Run (from graphty-element):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=browser test/browser/edges-follow-running-layout.test.ts
 * and the same with --project=minimum-work, which splits each change across frames. The file sets
 * each case's render path itself, so "forced-batched" skips it. A failing frame is printed as a PNG
 * data URL with the node centers the element reported in it. The fixture and the frame checks are
 * in test/helpers/edges-follow.ts.
 */

import { afterEach, assert, describe, it } from "vitest";

import { assertAtRest, assertFollowed, assertLazy, checkWhileMoving, cleanUp, mounted } from "../helpers/edges-follow";
import { drag, nodePoint } from "../helpers/real-input";

afterEach(cleanUp);

/** The CPU simulations: ngraph seeded, d3, ForceAtlas2, Fruchterman-Reingold ("spring"). */
const LAYOUTS: readonly { layout: string; options: Record<string, unknown> }[] = [
    { layout: "ngraph", options: { seed: 7 } },
    { layout: "d3", options: {} },
    { layout: "forceatlas2", options: {} },
    { layout: "spring", options: {} },
];

describe.each(["objects", "batched"] as const)("on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(LAYOUTS)("arrowed and plain edges follow every frame of $layout", async ({ layout, options }) => {
            const element = await mounted(path, view, "arrow");
            assertLazy(element);
            assertFollowed(await checkWhileMoving(element, "arrow", () => element.setLayout(layout, options)));
        });

        it.each(["undirected", "curved", "dashed", "labeled", "self-loop"] as const)(
            "%s edges follow every frame of ngraph",
            async (kind) => {
                const element = await mounted(path, view, kind);
                assertLazy(element);
                assertFollowed(await checkWhileMoving(element, kind, () => element.setLayout("ngraph", { seed: 7 })));
            },
        );
    });
});

describe.each(["objects", "batched"] as const)("under a node dragged with the real mouse on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(["arrow", "curved", "self-loop"] as const)(
            "%s edges of a triangle corner follow every frame of the drag",
            async (kind) => {
                const element = await mounted(path, view, kind);
                assertLazy(element);
                const from = nodePoint(element, "t0a");
                const to = { x: from.x + 70, y: from.y + 50 };
                const run = await checkWhileMoving(element, kind, () => drag(element, from, to, 12), {
                    afterStart: "stop",
                });
                assertFollowed(run, 5);
                const at = element.nodeScreenPosition("t0a");
                assert.isDefined(at);
                assert.isBelow(Math.hypot(at.x - to.x, at.y - to.y), 3, "the node ended under the pointer");
                await assertAtRest(element, kind);
            },
        );
    });
});
