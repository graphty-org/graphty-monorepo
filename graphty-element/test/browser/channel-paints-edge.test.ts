/**
 * @file An edge channel the table calls renderable changes the picture, in 2D and in 3D. The instrument and why it
 * exists: test/helpers/channel-paints.ts.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { UNPAINTED_CHANNELS } from "../../src/catalog/unreachable";
import type { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS, labelFieldOf } from "../../src/session/styles/channels";
import {
    addProbePrerequisites,
    BUNDLE_CHANNELS,
    drewPixels,
    measurePaint,
    mountProbeGraph,
    PIXEL_CHANGE,
    probeBase,
    probeFor,
    sortedDescriptors,
    viewsOf,
} from "../helpers/channel-paints";
import { MEASURED_TEXT_STYLES } from "../helpers/label-fields";

/** The waivers, by channel, so a test can ask whether one is expected to paint. */
const waived = new Map(UNPAINTED_CHANNELS.map((entry) => [entry.channel, entry]));

for (const [view, bundle] of [
    ["2d", false],
    ["3d", false],
    ["2d", true],
    ["3d", true],
] as const) {
    describe(`every renderable edge channel changes the picture in ${view}${bundle ? " on the bundle scene" : ""}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            ({ container, graph, session } = await mountProbeGraph(view, "objects", bundle));
            await addProbePrerequisites(session, graph);
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        // A channel whose drawnWhen names one view is measured in that view only here, and in both views by
        // channel-drawn-matches-render.test.ts, which also requires it to draw nothing in the other.
        for (const descriptor of sortedDescriptors(CHANNEL_DESCRIPTORS).filter(
            (entry) =>
                entry.target === "edge" &&
                entry.renderable &&
                viewsOf(entry).includes(view) &&
                // the route and the bundling settings are measured where edges run beside each other
                BUNDLE_CHANNELS.has(entry.channel) === bundle &&
                // A field channel (`edge.labelColor`) is measured by label-fields-node and -edge, channel by channel,
                // in a scene that shows every field: texts in front of nodes for onTop, overlapping for declutter.
                !MEASURED_TEXT_STYLES.includes(labelFieldOf(entry.channel)?.into ?? ""),
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
                    probeBase(descriptor, CHANNEL_DESCRIPTORS),
                );
                const waiver = waived.get(descriptor.channel);
                if (waiver === undefined) {
                    // PIXELS, PLACE BY PLACE: a mesh built hidden, covered or off screen changes the structure only.
                    assert.isTrue(
                        drewPixels(measure, descriptor.channel),
                        `Writing ${descriptor.channel} in ${view} changed nothing that is drawn (${String(measure.changed)} ` +
                            `pixels changed). Fix the renderer, or add the channel to UNPAINTED_CHANNELS in ` +
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

                // pixels again: a waived channel may rebuild a mesh (a clip's offset on a model that loads), never draw
                assert.isAtMost(
                    measure.changed,
                    PIXEL_CHANGE,
                    `${descriptor.channel} is listed in UNPAINTED_CHANNELS and draws now ` +
                        `(${String(measure.changed)} pixels changed): delete the waiver. It said: ${waiver.reason}`,
                );
            });
        }
    });
}
