/**
 * @file A channel whose `drawnWhen` names a view draws in exactly that view.
 *
 * `drawnWhen`'s dimension condition is what an application dims a control by in the other view, so it must be
 * true both ways: the channel changes the picture in the view it names, and changes nothing in the other. A
 * channel that does draw in the other view is dimmed wrongly; one that does not draw where it claims is a gap
 * the dimming hides. The instrument: test/helpers/channel-paints.ts.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";
import {
    addProbePrerequisites,
    measurePaint,
    mountProbeGraph,
    PIXEL_CHANGE,
    PREREQUISITES,
    probeFor,
    sortedDescriptors,
    viewsOf,
} from "../helpers/channel-paints";

/**
 * What a channel needs beyond its prerequisites for its effect to show: facets are a few pixels wide on a small node.
 */
const SHOWN_WITH: Readonly<Partial<Record<string, { base?: Record<string, unknown> }>>> = {
    "node.flat": { base: { "node.shape": "sphere", "node.size": 4 } },
};

/** Every renderable channel that names a view. */
const ONE_VIEW = sortedDescriptors(CHANNEL_DESCRIPTORS).filter(
    (descriptor) => descriptor.renderable && viewsOf(descriptor).length === 1,
);

it("finds the channels that name a view", () => {
    assert.isAbove(ONE_VIEW.length, 3, "node.zIndex, node.flat, node.unlit, edge.lift and more name one view");
});

for (const view of ["2d", "3d"] as const) {
    describe(`channels that name a view, drawn in ${view}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        // A graph a channel: one channel's measurement moves the camera's framing (a node drawn larger), and a lift
        // measured after it rose out of the frame.
        beforeEach(async () => {
            ({ container, graph, session } = await mountProbeGraph(view));
            await addProbePrerequisites(session, graph);
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        for (const descriptor of ONE_VIEW) {
            const claims = viewsOf(descriptor).includes(view);
            it(`${claims ? "draws" : "draws nothing"}: ${descriptor.channel}`, async () => {
                const shown = SHOWN_WITH[descriptor.channel];
                const measure = await measurePaint(
                    graph,
                    session,
                    descriptor.target,
                    descriptor.channel,
                    probeFor(descriptor),
                    {
                        ...PREREQUISITES[descriptor.channel],
                        ...shown?.base,
                    },
                );
                // Where it claims to draw, a change to the scene counts, as in the paints gates (a draw order reorders
                // nodes that need not overlap here). Where it claims nothing, only the picture counts: a 2D node keeps
                // a lit material it draws unlit, so writing node.unlit there changes a material and no pixel.
                const drew = claims ? measure.painted : measure.moved > PIXEL_CHANGE;
                assert.strictEqual(
                    drew,
                    claims,
                    `${descriptor.channel} names ${viewsOf(descriptor).join("")} only; in ${view} it ` +
                        `${drew ? "changed" : "did not change"} the picture (${String(measure.moved)} pixels).`,
                );
            });
        }
    });
}
