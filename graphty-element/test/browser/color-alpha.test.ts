/**
 * @file An alpha written inside a colour (`#rrggbbaa`, `rgba()`) follows one rule on every channel.
 *
 * THE RULE. Where the channel can draw transparency, the colour's alpha is multiplied with the
 * channel's own opacity: a node filled `#ff000080` is drawn exactly as a node filled `#ff0000` at
 * opacity 128/255, and the same holds for an edge, an arrow cap and the selection halo. An arrow
 * with no colour of its own follows its line's colour, alpha included. A glow's alpha fades the
 * glow; a glow is blended around the node rather than added, so no opaque colour draws the same
 * picture, and `glow-around-the-node.test.ts` checks that fade instead of a case here.
 * An outline cannot be drawn translucent at all -- Babylon's highlight layer pins the alpha of
 * every outline to 1 -- so an outline's alpha is ignored, the colour is drawn opaque, and the
 * layer check says so with `W_ALPHA_IGNORED`.
 *
 * WHAT IT REPLACES. Every channel but the node fill read its colour with Babylon's
 * `Color3.FromHexString`, which reads `#rrggbb` and nothing else: handed nine characters it leaves
 * the colour at its starting black. So an edge, an arrow, a glow, an outline or a halo given an
 * alpha was drawn black (and a black glow is no glow at all), and the node fill drew the colour
 * opaque.
 *
 * Each case below draws the colour with an alpha and its opacity-channel equivalent, and requires
 * the two frames to agree pixel for pixel.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { nextFrame } from "../helpers/real-input";

/** The alpha `80` in hex is, as an opacity. */
const HALF = 128 / 255;

/** The two spellings of a half-transparent red the element accepts. */
const TRANSLUCENT_REDS = ["#ff000080", "rgba(255, 0, 0, 0.502)"] as const;

/** How many pixels may land in another bucket before two frames count as different. */
const PIXEL_CHANGE = 32;

/** One case: what is written with an alpha, and what it must draw like. */
interface AlphaCase {
    readonly target: "node" | "edge";
    readonly channel: string;
    /** The same picture, written without an alpha in any colour. */
    readonly equivalent: Record<string, unknown>;
}

const CASES: readonly AlphaCase[] = [
    { target: "node", channel: "node.color", equivalent: { "node.color": "#ff0000", "node.opacity": HALF } },
    { target: "node", channel: "node.outline", equivalent: { "node.outline": "#ff0000" } },
    {
        target: "edge",
        channel: "edge.color",
        // Both caps have no colour of their own here, so they follow the line, alpha included.
        equivalent: {
            "edge.color": "#ff0000",
            "edge.opacity": HALF,
            "edge.arrowHeadOpacity": HALF,
            "edge.arrowTailOpacity": HALF,
        },
    },
    {
        target: "edge",
        channel: "edge.arrowHeadColor",
        equivalent: { "edge.arrowHeadColor": "#ff0000", "edge.arrowHeadOpacity": HALF },
    },
    {
        target: "edge",
        channel: "edge.arrowTailColor",
        equivalent: { "edge.arrowTailColor": "#ff0000", "edge.arrowTailOpacity": HALF },
    },
];

/**
 * How many pixels moved between two histograms.
 * @param one - The first frame's histogram.
 * @param other - The second's.
 * @returns The pixels that changed bucket, each counted once.
 */
function pixelsMoved(one: Uint32Array, other: Uint32Array): number {
    let moved = 0;

    for (let bucket = 0; bucket < one.length; bucket++) {
        moved += Math.abs(one[bucket] - other[bucket]);
    }

    return moved / 2;
}

describe("a colour with an alpha channel", () => {
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

        await graph.addNodes([{ id: "alpha" }, { id: "omega" }]);
        await graph.addEdges([{ src: "alpha", dst: "omega" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await operationQueueOf(graph).waitForCompletion();

        await session.styles.add({
            name: "big caps at both ends",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.arrowHead": "normal",
                "edge.arrowTail": "normal",
                "edge.arrowHeadSize": 3,
                "edge.arrowTailSize": 3,
            },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Draw the graph with one layer on top, and histogram the frame.
     * @param target - What the layer paints.
     * @param set - What it writes.
     * @returns Every pixel quantised to four bits per channel and counted.
     */
    async function frameWith(target: "node" | "edge", set: Record<string, unknown>): Promise<Uint32Array> {
        const layer: LayerSpec = { name: "alpha probe", target, selector: { match: "everything" }, set };
        const added = await session.styles.add(layer);

        await graph.waitForStableFrame();
        graph.scene.render();

        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        const histogram = new Uint32Array(16 * 16 * 16);

        for (let at = 0; at < pixels.length; at += 4) {
            histogram[((pixels[at] >> 4) << 8) | ((pixels[at + 1] >> 4) << 4) | (pixels[at + 2] >> 4)]++;
        }

        await session.styles.remove(added.id);

        return histogram;
    }

    for (const { target, channel, equivalent } of CASES) {
        for (const red of TRANSLUCENT_REDS) {
            it(`${channel} = ${red} draws like ${JSON.stringify(equivalent)}`, async () => {
                const expected = await frameWith(target, equivalent);
                const drawn = await frameWith(target, { [channel]: red });
                const black = await frameWith(target, { [channel]: "#000000" });
                const moved = pixelsMoved(expected, drawn);

                assert.isAtMost(
                    moved,
                    PIXEL_CHANGE,
                    `${channel} written ${red} moved ${String(moved)} pixels from its equivalent; ` +
                        `${String(pixelsMoved(black, drawn))} pixels from the same channel in black.`,
                );
            });
        }
    }

    it("says an outline's alpha is ignored, with a code", () => {
        const spec: LayerSpec = {
            name: "translucent outline",
            target: "node",
            selector: { match: "everything" },
            set: { "node.outline": "#ff000080" },
        };

        assert.deepStrictEqual(session.styles.validate(spec).warnings, [
            { code: "W_ALPHA_IGNORED", params: { channel: "node.outline", path: "set.node.outline" } },
        ]);
        assert.deepStrictEqual(
            session.styles.validate({ ...spec, set: { "node.outline": "#ff0000" } }).warnings,
            [],
            "an opaque outline earns no warning",
        );
    });

    it("multiplies the selection halo's alpha with its opacity", async () => {
        graph.setSelectionStyle({ color: "#ff000080", opacity: 0.4 });
        await graph.select({ nodes: ["alpha"] });

        // The halo takes the mask on the render loop's update, so draw until it is on screen.
        let halo = graph.scene.meshes.find(
            (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
        );
        while (halo === undefined) {
            graph.scene.render();
            await nextFrame();
            halo = graph.scene.meshes.find(
                (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
            );
        }

        const material = halo.material as unknown as { emissiveColor: { toHexString: () => string }; alpha: number };

        assert.strictEqual(material.emissiveColor.toHexString(), "#FF0000");
        assert.closeTo(material.alpha, 0.4 * HALF, 1e-6);
    });
});
