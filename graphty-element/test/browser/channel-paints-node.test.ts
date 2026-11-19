/**
 * @file A node channel the table calls renderable changes the picture, in 2D and in 3D, and on a batched row draws
 * what the objects path draws. The instrument and why it exists: test/helpers/channel-paints.ts.
 *
 * Both views, because one view hid gaps: animated edges drew only in 3D, and face decorations sat off a solid in 3D,
 * while this gate ran in the default view alone.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { UNPAINTED_CHANNELS } from "../../src/catalog/unreachable";
import type { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS, type ChannelDescriptor, labelFieldOf } from "../../src/session/styles/channels";
import {
    addProbePrerequisites,
    measurePaint,
    mountProbeGraph,
    NODES,
    PIXEL_CHANGE,
    PREREQUISITES,
    probeFor,
    sortedDescriptors,
    viewsOf,
} from "../helpers/channel-paints";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** The waivers, by channel, so a test can ask whether one is expected to paint. */
const waived = new Map(UNPAINTED_CHANNELS.map((entry) => [entry.channel, entry]));

for (const view of ["2d", "3d"] as const) {
    describe(`every renderable node channel changes the picture in ${view}`, () => {
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
            (entry) => entry.target === "node" && entry.renderable && viewsOf(entry).includes(view),
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
                    "node",
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

describe("the waivers", () => {
    it("waives no label field: every one draws (label-fields-node and -edge measure each)", () => {
        const fields = UNPAINTED_CHANNELS.filter((entry) => labelFieldOf(entry.channel) !== undefined).map(
            (entry) => entry.channel,
        );
        assert.deepEqual(fields, [], "label fields waived in UNPAINTED_CHANNELS");
    });

    it("waives only channels that exist and claim to paint", () => {
        const stray = UNPAINTED_CHANNELS.filter((entry) => {
            const descriptor = CHANNEL_DESCRIPTORS[entry.channel] as ChannelDescriptor | undefined;

            return descriptor === undefined || !descriptor.renderable;
        })
            .map((entry) => entry.channel)
            .sort();

        assert.deepEqual(
            stray,
            [],
            `These waivers in UNPAINTED_CHANNELS name a channel that is gone, or one already ` +
                `published as renderable: false. A channel marked unrenderable says so in the ` +
                `table itself and needs no second record.`,
        );
    });

    it("gives every waiver a reason", () => {
        const silent = UNPAINTED_CHANNELS.filter((entry) => entry.reason.trim().length === 0)
            .map((entry) => entry.channel)
            .sort();

        assert.deepEqual(silent, [], `These waivers have an empty reason, which is the whole entry.`);
    });
});

describe("every node channel on a batched row", () => {
    /** What a batch draws itself: each of these must keep its rows batched and change the picture. */
    const DRAWN_BY_THE_BATCH = new Set([
        "node.color",
        "node.flat",
        "node.meshDetail",
        "node.shape",
        "node.size",
        "node.unlit",
        "node.visible",
        "node.wireframe",
    ]);

    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        ({ container, graph, session } = await mountProbeGraph("3d", "batched"));
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    // Every channel, not only the list: one that joins the batch later is compared with no edit here.
    for (const descriptor of Object.values(CHANNEL_DESCRIPTORS).filter(
        (entry) => entry.target === "node" && entry.renderable,
    )) {
        it(`draws what the objects path draws: ${descriptor.channel}`, async () => {
            const before = await readCanvas(graph);
            assert.equal(graph.rowCounts.batchedNodes, NODES.length, "the last channel left its rows off the batch");

            const added = await session.styles.add({
                name: `probe ${descriptor.channel}`,
                target: "node",
                selector: { match: "everything" },
                set: { [descriptor.channel]: probeFor(descriptor) },
            });
            const batched = await readCanvas(graph);
            const { batchedNodes } = graph.rowCounts;

            graph.setRenderPath("objects");
            const objects = await readCanvas(graph);
            graph.setRenderPath("batched");

            await session.styles.remove(added.id);
            const restored = await readCanvas(graph);

            if (DRAWN_BY_THE_BATCH.has(descriptor.channel)) {
                assert.equal(batchedNodes, NODES.length, `${descriptor.channel} took its rows off the batch`);
                assert.isAbove(pixelsOverBar(before, batched), 0, `${descriptor.channel} changed nothing`);
            }

            assert.equal(pixelsOverBar(batched, objects), 0, `${descriptor.channel} differs between the paths`);
            assert.equal(pixelsOverBar(before, restored), 0, `removing ${descriptor.channel} left the picture changed`);
        });
    }
});
