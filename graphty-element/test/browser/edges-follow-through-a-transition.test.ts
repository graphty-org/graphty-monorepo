/**
 * @file Edges, arrowheads, labels and self-loops follow their nodes on every frame of a layout
 * transition (glide, staggered glide) and rest between them once it lands, and arrowed edges rest
 * between their nodes after a particle-morph, on both render paths, in 2D and 3D.
 *
 * Run (from graphty-element):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=browser test/browser/edges-follow-through-a-transition.test.ts
 * and the same with --project=minimum-work, which splits each change across frames. The file sets
 * each case's render path itself, so "forced-batched" skips it. A failing frame is printed as a PNG
 * data URL with the node centers the element reported in it. The fixture and the frame checks are
 * in test/helpers/edges-follow.ts.
 */

import { afterEach, describe, it } from "vitest";

import {
    assertAtRest,
    assertFollowed,
    assertLazy,
    checkWhileMoving,
    cleanUp,
    frameClock,
    mounted,
} from "../helpers/edges-follow";

afterEach(cleanUp);

/** The transitions that move drawn nodes, each into the layout it moves them to. */
const TRANSITIONS = [
    { transition: "glide", layout: "circular", options: {} },
    { transition: "glide", layout: "ngraph", options: { seed: 7 } },
    { transition: "staggered-glide", layout: "circular", options: {} },
] as const;

describe.each(["objects", "batched"] as const)("through a layout transition on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        describe.each(TRANSITIONS)("$transition into $layout", ({ transition, layout, options }) => {
            it.each(["arrow", "undirected", "curved", "dashed", "labeled", "self-loop"] as const)(
                "%s edges follow every frame of the move and rest between their nodes",
                async (kind) => {
                    const element = await mounted(path, view, kind);
                    assertLazy(element);
                    frameClock(element);
                    await element.session.config.set({ layoutTransition: { transition, seconds: 1 } });
                    assertFollowed(
                        await checkWhileMoving(element, kind, () => element.setLayout(layout, options), {
                            afterStart: "until still",
                        }),
                    );
                    await assertAtRest(element, kind);
                },
            );
        });

        // Particles draw each node as a cloud on the way, so no frame of the move shows the node: only
        // the landing is checked.
        it("arrowed edges rest between their nodes after a particle-morph", async () => {
            const element = await mounted(path, view, "arrow");
            assertLazy(element);
            frameClock(element);
            await element.session.config.set({ layoutTransition: { transition: "particle-morph", seconds: 0.5 } });
            await element.setLayout("circular");
            await element.waitForSettled();
            await assertAtRest(element, "arrow");
        });
    });
});
