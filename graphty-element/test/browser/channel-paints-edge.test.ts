/**
 * @file An edge channel the table calls renderable changes the picture, in 2D and in 3D. The instrument and why it
 * exists: test/helpers/channel-paints.ts.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { UNPAINTED_CHANNELS } from "../../src/catalog/unreachable";
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

/** The waivers, by channel, so a test can ask whether one is expected to paint. */
const waived = new Map(UNPAINTED_CHANNELS.map((entry) => [entry.channel, entry]));

for (const view of ["2d", "3d"] as const) {
    describe(`every renderable edge channel changes the picture in ${view}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            ({ container, graph, session } = await mountProbeGraph(view));
            await addProbePrerequisites(session, graph);
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        // A channel whose drawnWhen names one view is measured in that view only here, and in both views by
        // channel-drawn-matches-render.test.ts, which also requires it to draw nothing in the other.
        for (const descriptor of sortedDescriptors(CHANNEL_DESCRIPTORS).filter(
            (entry) => entry.target === "edge" && entry.renderable && viewsOf(entry).includes(view),
        )) {
            it(`changes the picture: ${descriptor.channel}`, async () => {
                const probe = probeFor(descriptor);
                assert.isDefined(
                    probe,
                    `${descriptor.channel} is published as renderable and probeFor has no value to write to it.`,
                );
                const measure = await measurePaint(
                    graph,
                    session,
                    "edge",
                    descriptor.channel,
                    probe,
                    PREREQUISITES[descriptor.channel] ?? {},
                );
                const waiver = waived.get(descriptor.channel);
                if (waiver === undefined) {
                    assert.isTrue(
                        measure.painted,
                        `Writing ${descriptor.channel} in ${view} changed nothing that is drawn (${String(measure.moved)} ` +
                            `pixels moved). Fix the renderer, or add the channel to UNPAINTED_CHANNELS in ` +
                            `src/catalog/unreachable.ts with the reason.`,
                    );
                    // PIXELS, NOT STRUCTURE: MeshCache keeps the source mesh a removed layer caused to be built.
                    assert.isAtMost(
                        measure.leftMoved,
                        PIXEL_CHANGE,
                        `Removing the layer that wrote ${descriptor.channel} left the picture changed.`,
                    );
                    return;
                }

                assert.isFalse(
                    measure.painted,
                    `${descriptor.channel} is listed in UNPAINTED_CHANNELS and draws now ` +
                        `(${String(measure.moved)} pixels moved): delete the waiver. It said: ${waiver.reason}`,
                );
            });
        }
    });
}
