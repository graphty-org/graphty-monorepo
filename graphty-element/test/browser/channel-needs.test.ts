/**
 * @file A channel's `needs` are what it takes to draw: written alone, the channel changes nothing
 * (or nothing it is for), and written with its needs, it changes the picture. In both views.
 *
 * Each channel with `needs` is measured on one graph per view: a frame with only what its
 * `drawnWhen` asks for (a flat shape for raised edges, a curved edge for a support point), a frame
 * with the channel added, and a frame with its needs added too.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS, type ChannelDescriptor } from "../../src/session/styles/channels";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** Two nodes. */
const NODES = [{ id: "a" }, { id: "b" }];

/** Two edges between them: a curved bundle fans apart only with two. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "b" },
];

/** Fewer pixels than the smallest thing a need switches on: two renderings of one scene agree exactly. */
const SAME = 16;

/**
 * Channels that draw something alone, and why their needs are still needs: the need makes them
 * draw what they are for.
 */
const DRAWS_ALONE: Readonly<Record<string, string>> = {
    "node.wireframe":
        "alone it draws the dense full-detail mesh; its need is the low-detail one a wireframe is read at",
    "edge.animationSpeed": "its need is a solid line, already the default; written only above a patterned line",
};

/**
 * Known rendering gaps, by view: a channel whose needs are right but which draws nothing there
 * today. The list may only shrink: a gap that starts drawing fails until its entry is deleted.
 */
const KNOWN_GAPS: Readonly<Record<"2d" | "3d", Readonly<Record<string, string>>>> = {
    "2d": { "edge.underlayColor": "an edge underlay band draws nothing in the 2D view (style panel round 5, batch 2)" },
    "3d": {},
};

/**
 * A value for a channel far from its default.
 * @param descriptor - The channel.
 * @returns The value.
 */
function probeFor(descriptor: ChannelDescriptor): unknown {
    if (descriptor.start !== undefined) {
        return descriptor.start;
    }

    switch (descriptor.accepts) {
        case "color":
            return "#E00000";
        case "number": {
            const low = descriptor.min ?? 0;
            return descriptor.max === undefined ? low + 4 : low + (descriptor.max - low) * 0.5;
        }
        case "boolean":
            return descriptor.default !== true;
        case "enum":
            // The first value that is not the default: every enum option drawing is another test's
            // (an edge outline's "dash-dot" draws nothing today).
            return (descriptor.values ?? []).find((value) => value !== descriptor.default);
        case "text":
            if (descriptor.listOf === "color") {
                return "#E00000 #00A000 #0000E0";
            }

            return descriptor.channel === "node.shapeLines" ? "-1,-1 1,1; -1,1 1,-1" : "1 2 3";
        default:
            return undefined;
    }
}

/**
 * What the channel's `drawnWhen` asks for, written so the channel has somewhere to draw.
 * @param descriptor - The channel.
 * @returns The values to write first.
 */
function groundFor(descriptor: ChannelDescriptor): Record<string, unknown> {
    const ground: Record<string, unknown> = {};
    const needed = new Set(descriptor.needs?.map((need) => need.channel));
    for (const condition of descriptor.drawnWhen ?? []) {
        // A condition the channel's needs meet is left to them, so the channel alone goes without it.
        if ("values" in condition && !needed.has(condition.channel)) {
            const value = condition.values[0];
            ground[condition.channel] = value === "true" || value === "false" ? value === "true" : value;
        }
    }

    // A label's settings need words to draw on.
    if (/\.label[A-Z]/.test(descriptor.channel)) {
        ground[`${descriptor.target}.label`] = "WORDS";
    }

    return ground;
}

const WITH_NEEDS = Object.values(CHANNEL_DESCRIPTORS)
    .filter((descriptor) => descriptor.needs !== undefined)
    .sort((one, other) => one.channel.localeCompare(other.channel));

for (const view of ["2d", "3d"] as const) {
    describe(`a channel's needs, in ${view.toUpperCase()}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            container = document.createElement("div");
            container.style.width = "480px";
            container.style.height = "360px";
            document.body.appendChild(container);
            graph = new Graph(container);
            await graph.init();
            session = graph.getSession();
            await graph.addNodes(NODES);
            await graph.addEdges(EDGES);
            await graph.setLayout("circular", { scale: 0.2 });
            await graph.setViewMode(view);
            await operationQueueOf(graph).waitForCompletion();
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        /**
         * Add a layer over every element of the channel's target and read the frame.
         * @param target - Nodes or edges.
         * @param set - What the layer writes.
         * @returns The layer's id and the frame.
         */
        async function layer(target: "node" | "edge", set: Record<string, unknown>): Promise<[string, CanvasFrame]> {
            const spec: LayerSpec = { name: "needs probe", target, selector: { match: "everything" }, set };
            const added = await session.styles.add(spec);
            await session.styles.settled();
            await operationQueueOf(graph).waitForCompletion();
            return [added.id, await readCanvas(graph)];
        }

        for (const descriptor of WITH_NEEDS) {
            const shown = descriptor.drawnWhen?.find((condition) => "dimension" in condition);
            if (shown !== undefined && "dimension" in shown && shown.dimension !== view) {
                continue;
            }

            it(`${descriptor.channel} draws with its needs, and not without them`, async () => {
                const { target } = descriptor;
                const [ground, base] = await layer(target, groundFor(descriptor));
                const [head, alone] = await layer(target, { [descriptor.channel]: probeFor(descriptor) });
                const needs = Object.fromEntries((descriptor.needs ?? []).map((need) => [need.channel, need.value]));
                const [partners, together] = await layer(target, needs);
                for (const id of [partners, head, ground]) {
                    await session.styles.remove(id);
                }

                if (DRAWS_ALONE[descriptor.channel] === undefined) {
                    assert.isAtMost(
                        pixelsOverBar(base, alone),
                        SAME,
                        `${descriptor.channel} alone changed the picture: it needs nothing, or not what it says`,
                    );
                }

                // A need already met by the default (a solid line) changes nothing here: the
                // channel then draws alone.
                const noOp = (descriptor.needs ?? []).every((need) => {
                    const partner = CHANNEL_DESCRIPTORS[need.channel];
                    return partner.off === undefined && String(partner.default) === String(need.value);
                });
                if (noOp) {
                    return;
                }

                if (KNOWN_GAPS[view][descriptor.channel] !== undefined) {
                    assert.isAtMost(
                        pixelsOverBar(alone, together),
                        SAME,
                        `${descriptor.channel} draws in ${view} now: delete its KNOWN_GAPS entry`,
                    );
                    return;
                }

                assert.isAbove(
                    pixelsOverBar(alone, together),
                    SAME,
                    `${descriptor.channel} with ${JSON.stringify(needs)} drew nothing more than alone`,
                );
            });
        }
    });
}
