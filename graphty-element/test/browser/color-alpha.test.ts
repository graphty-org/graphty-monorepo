/**
 * @file An alpha written inside a colour is drawn as transparency, on every colour channel.
 *
 * Issue #2071. Every colour channel accepts `#rrggbbaa` and `rgba()`, but before this the glow,
 * the outline, the edge line, the arrows and the selection halo drew such a colour BLACK (their
 * renderers read exactly six hex digits), and the node fill drew it fully opaque. The rule now is
 * one for every channel: the alpha is multiplied with the channel's own opacity.
 *
 * Each case paints the channel three ways -- opaque red, `#ff000080` and `rgba(255, 0, 0, 0.5)` --
 * and reads the frame where opaque red is drawn. The two alpha spellings must draw the same, and
 * that must be neither the opaque picture nor black. Where the channel has an opacity of its own,
 * opaque red at that opacity must draw the same picture as the alpha colour does.
 *
 * Styling goes through style layers only, and the selection halo through `setSelectionStyle`,
 * which is the one door the halo has.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** Opaque red. */
const OPAQUE = "#ff0000";

/** Red at half alpha, as eight hex digits. */
const HEX_ALPHA = "#ff000080";

/** The same colour as `rgba()`. */
const RGBA = "rgba(255, 0, 0, 0.502)";

/** The alpha both spellings carry. */
const ALPHA = 0x80 / 255;

/** How far apart, in summed RGB, a pixel must be from the unpainted frame to count as painted. */
const PAINTED = 60;

/** How close, per RGB channel of the region's mean, two pictures must be to count as the same. */
const SAME = 4;

/** The mean colour of the painted region of one frame, and how much of it is near black. */
interface Region {
    readonly mean: readonly [number, number, number];
    readonly dark: number;
}

/** One colour channel: how to paint it with a colour, and how to paint opaque red at the alpha's opacity. */
interface ColorCase {
    readonly name: string;
    readonly paint: (color: string) => Promise<() => Promise<void>>;
    readonly atOpacity?: () => Promise<() => Promise<void>>;
}

describe("an alpha inside a colour", () => {
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
        await graph.addNodes([
            { id: "alpha", group: "g" },
            { id: "omega", group: "g" },
        ]);
        await graph.addEdges([{ src: "alpha", dst: "omega" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await operationQueueOf(graph).waitForCompletion();
        await session.styles.add({
            name: "prerequisites",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 3, "edge.width": 6 },
        });
        await session.styles.add({
            name: "prerequisites",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "WWWWW" },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Read the frame once the last repaint is on screen.
     * @returns The RGBA bytes of the frame.
     */
    async function frame(): Promise<Uint8Array> {
        await graph.waitForStableFrame();
        graph.scene.render();
        const { engine } = graph;

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    /**
     * Add one layer and hand back its removal.
     * @param target - Nodes or edges.
     * @param layer - What the layer writes.
     * @returns A function that removes the layer.
     */
    async function withLayer(
        target: "node" | "edge",
        layer: Pick<LayerSpec, "set" | "encode">,
    ): Promise<() => Promise<void>> {
        const added = await session.styles.add({
            name: "alpha probe",
            target,
            selector: { match: "everything" },
            ...layer,
        });

        return async () => {
            await session.styles.remove(added.id);
        };
    }

    /**
     * A channel written by a plain `set`.
     * @param target - Nodes or edges.
     * @param channel - The colour channel.
     * @param extra - Anything else the layer has to write for the channel to draw.
     * @returns How to paint the channel with a colour.
     */
    function setter(
        target: "node" | "edge",
        channel: string,
        extra: Record<string, unknown> = {},
    ): (color: string) => Promise<() => Promise<void>> {
        return (color) => withLayer(target, { set: { ...extra, [channel]: color } });
    }

    /**
     * Paint the selection halo, selecting a node so it is drawn.
     * @param color - The halo colour.
     * @param opacity - The halo's own opacity.
     * @returns A function that puts the default halo back and clears the selection.
     */
    async function halo(color: string, opacity: number): Promise<() => Promise<void>> {
        graph.setSelectionStyle({ color, opacity });
        graph.selectNode("alpha");
        await operationQueueOf(graph).waitForCompletion();

        return async () => {
            graph.setSelectionStyle({ color: "#FFD700", opacity: 0.4 });
            graph.deselectNode();
            await operationQueueOf(graph).waitForCompletion();
        };
    }

    const cases: ColorCase[] = [
        {
            name: "node.color",
            paint: setter("node", "node.color"),
            atOpacity: () => withLayer("node", { set: { "node.color": OPAQUE, "node.opacity": ALPHA } }),
        },
        {
            name: "node.color through an encoding map",
            paint: (color) =>
                withLayer("node", {
                    encode: { "node.color": { by: "data.group", scale: "ordinal", map: { g: color } } },
                }),
            atOpacity: () => withLayer("node", { set: { "node.color": OPAQUE, "node.opacity": ALPHA } }),
        },
        { name: "node.glow", paint: setter("node", "node.glow", { "node.glowStrength": 1 }) },
        { name: "node.outline", paint: setter("node", "node.outline") },
        {
            name: "edge.color",
            paint: setter("edge", "edge.color"),
            atOpacity: () =>
                withLayer("edge", {
                    // The arrow draws in the line's colour when it has none, so it takes the
                    // line's alpha as well.
                    set: { "edge.color": OPAQUE, "edge.opacity": ALPHA, "edge.arrowHeadOpacity": ALPHA },
                }),
        },
        {
            name: "edge.arrowHeadColor",
            paint: setter("edge", "edge.arrowHeadColor"),
            atOpacity: () =>
                withLayer("edge", { set: { "edge.arrowHeadColor": OPAQUE, "edge.arrowHeadOpacity": ALPHA } }),
        },
        {
            name: "node.labelStyle color",
            paint: (color) => withLayer("node", { set: { "node.labelStyle": { color } } }),
        },
        {
            name: "node.labelStyle background",
            paint: (color) => withLayer("node", { set: { "node.labelStyle": { background: color } } }),
        },
        {
            name: "selection halo",
            paint: (color) => halo(color, 1),
            atOpacity: () => halo(OPAQUE, ALPHA),
        },
    ];

    for (const entry of cases) {
        it(`is drawn translucent: ${entry.name}`, async () => {
            const draw = async (paint: () => Promise<() => Promise<void>>): Promise<Uint8Array> => {
                const undo = await paint();
                const pixels = await frame();
                await undo();

                return pixels;
            };
            const base = await frame();
            const opaque = await draw(() => entry.paint(OPAQUE));

            // The region opaque red paints: the pixels it moved away from the unpainted frame.
            const region: number[] = [];
            for (let at = 0; at < opaque.length; at += 4) {
                const moved =
                    Math.abs(opaque[at] - base[at]) +
                    Math.abs(opaque[at + 1] - base[at + 1]) +
                    Math.abs(opaque[at + 2] - base[at + 2]);
                if (moved > PAINTED) {
                    region.push(at);
                }
            }

            assert.isAbove(region.length, 100, `${entry.name} with opaque red painted almost nothing to measure`);

            const read = (pixels: Uint8Array): Region => {
                const sum = [0, 0, 0];
                let dark = 0;
                for (const at of region) {
                    sum[0] += pixels[at];
                    sum[1] += pixels[at + 1];
                    sum[2] += pixels[at + 2];
                    if (pixels[at] < 50 && pixels[at + 1] < 50 && pixels[at + 2] < 50) {
                        dark++;
                    }
                }
                const mean = sum.map((value) => value / region.length) as [number, number, number];

                return { mean, dark: dark / region.length };
            };
            const close = (one: Region, other: Region): boolean =>
                one.mean.every((value, channel) => Math.abs(value - other.mean[channel]) <= SAME);

            const full = read(opaque);
            const hex = read(await draw(() => entry.paint(HEX_ALPHA)));
            const rgba = read(await draw(() => entry.paint(RGBA)));
            const describe = (region: Region): string => region.mean.map(Math.round).join(",");

            assert.isAtMost(hex.dark, 0.05, `${entry.name} drew ${HEX_ALPHA} black (${describe(hex)})`);
            assert.isFalse(
                close(hex, full),
                `${entry.name} drew ${HEX_ALPHA} as opaque as ${OPAQUE} (${describe(hex)}): its alpha was dropped`,
            );
            assert.isTrue(close(hex, rgba), `${HEX_ALPHA} and ${RGBA} drew differently on ${entry.name}`);

            if (entry.atOpacity !== undefined) {
                const faded = read(await draw(entry.atOpacity));

                assert.isTrue(
                    close(hex, faded),
                    `${entry.name}: ${HEX_ALPHA} drew ${describe(hex)} and ${OPAQUE} at opacity ` +
                        `${ALPHA.toFixed(3)} drew ${describe(faded)}; an alpha inside a colour is that opacity`,
                );
            }
        });
    }
});
