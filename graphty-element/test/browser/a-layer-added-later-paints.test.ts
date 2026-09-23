/**
 * @file A layer added to a graph that is already on screen has to change the picture.
 *
 * WHY THIS IS A SEPARATE FILE FROM `channel-paints.test.ts`. That file is the gate over the whole
 * channel table and it asks a deliberately generous question: it counts a channel as painted when
 * the scene graph changed OR when the frame changed. The scene-graph half is what lets it see an
 * effect whose colour lives in a Babylon layer's private map. It is also a way to pass without
 * drawing anything: creating an effect layer changes the scene graph, and rebuilding a mesh
 * changes its name and its uniqueId, so a channel can move the structure while leaving the
 * picture exactly as it was.
 *
 * So this file asks the narrow question about the five channels that were failing it, and asks it
 * on PIXELS ALONE. Each one is written into a live session, over a graph that has already been
 * drawn, and the frame has to move.
 *
 * WHAT WAS WRONG WITH EACH OF THEM, because the five are three separate defects:
 *
 * - `edge.arrowHeadColor` and `edge.arrowTailColor` are the only colours whose role is `mesh`, so
 *   they belong in the number a source mesh is keyed on. A resolved colour is an object, and the
 *   interner's push had branches for a number, a flag and a word -- so a colour fell through to
 *   "nothing painted this". Every colour hashed the same as every other colour and as no colour
 *   at all, the key never moved, and `Edge.paintFrom` returned early without rebuilding the cap.
 * - `node.glow` was drawn on the first frame and never again, because `Node.paintFrom` applied a
 *   node's effects only on the branch that rebuilds its mesh.
 * - `node.outline` was never drawn at all: the highlight layer was handed the node's
 *   `InstancedMesh`, which Babylon renders through its SOURCE mesh and the layer therefore never
 *   consults, and the TypeError that came back went into a silent catch.
 *
 * All five are `renderable: true` in the channel table and all five were in `UNPAINTED_CHANNELS`
 * -- except `node.glowStrength`, which was kept visible by being declared a `mesh` channel it is
 * not, so that a strength edit would force the rebuild the effects needed. It is an `instance`
 * channel again and this file is what says the rebuild is no longer what carries it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LayerSpec, StaticStyle } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** Two nodes and the edge between them. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge both arrow channels are measured on. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas is. */
const WIDTH = 480;

/** How tall it is. */
const HEIGHT = 360;

/** How many frames to render before reading one. */
const FRAMES = 8;

/** How long to leave between them. */
const FRAME_MS = 10;

/** How many buckets the histogram has: four bits per channel, three channels. */
const BUCKETS = 16 * 16 * 16;

/**
 * How many pixels must move before the picture counts as changed.
 *
 * The same figure `channel-paints.test.ts` uses, and for the same reason: two renderings of an
 * unchanged scene in headless Chromium agree exactly, so the margin is insurance against a driver
 * that dithers rather than a tolerance for a small change.
 */
const PIXEL_CHANGE = 32;

describe("a layer written to a graph that is already drawn", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);

        // Circular rather than a physics layout: a frame read while the nodes are still drifting
        // differs from the one before it for reasons no layer is responsible for.
        await graph.setLayout("circular", { scale: 0.2 });
        await graph.operationQueue.waitForCompletion();

        // THE PREREQUISITES, which are what each measurement below is a change TO. A cap colour
        // needs a cap, and at the default size a cap is a few dozen pixels -- too near the
        // threshold for its colour to be measurable at all -- so the caps are drawn large. A
        // glow's strength needs something glowing to be the strength of.
        await session.styles.add({
            name: "prerequisites",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.arrowHead": "normal",
                "edge.arrowTail": "normal",
                "edge.arrowHeadSize": 3,
                "edge.arrowTailSize": 3,
            },
        });
        await graph.operationQueue.waitForCompletion();
    }, 60000);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Let the last repaint reach the scene, then count the frame's pixels by colour.
     * @returns How many pixels fall in each coarse colour bucket.
     */
    async function frame(): Promise<Uint32Array> {
        await graph.operationQueue.waitForCompletion();

        for (let at = 0; at < FRAMES; at++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        const histogram = new Uint32Array(BUCKETS);

        for (let at = 0; at < pixels.length; at += 4) {
            const bucket = ((pixels[at] >> 4) << 8) | ((pixels[at + 1] >> 4) << 4) | (pixels[at + 2] >> 4);
            histogram[bucket]++;
        }

        return histogram;
    }

    /**
     * How many pixels moved between two frames.
     * @param one - The earlier frame.
     * @param other - The later one.
     * @returns The number of pixels that changed bucket, counting each move once.
     */
    function moved(one: Uint32Array, other: Uint32Array): number {
        let total = 0;

        for (let bucket = 0; bucket < BUCKETS; bucket++) {
            total += Math.abs(one[bucket] - other[bucket]);
        }

        return total / 2;
    }

    /**
     * Write one channel to a graph that is already on screen and say what it did to the frame.
     *
     * The layer is taken away again before the count is returned, so one measurement cannot
     * change what the next one is measured against.
     * @param target - Whether the layer paints nodes or edges.
     * @param set - The channels to write.
     * @returns How many pixels moved when the layer went on, and how many are still moved once it
     *     has been taken off again.
     */
    async function paintsOnALiveGraph(
        target: "node" | "edge",
        set: StaticStyle,
    ): Promise<{ onWriting: number; afterRemoving: number }> {
        const before = await frame();
        const layer: LayerSpec = { name: "measured", target, selector: { match: "everything" }, set };
        const added = await session.styles.add(layer);
        const after = await frame();

        await session.styles.remove(added.id);

        const restored = await frame();

        return { onWriting: moved(before, after), afterRemoving: moved(before, restored) };
    }

    for (const [what, target, set] of [
        ["an arrow head's colour", "edge", { "edge.arrowHeadColor": "#ff00ff" }],
        ["an arrow tail's colour", "edge", { "edge.arrowTailColor": "#00ff00" }],
        ["a node's outline", "node", { "node.outline": "#ff00ff" }],
        ["a node's glow", "node", { "node.glow": "#ff00ff" }],
    ] as const) {
        it(`changes the frame: ${what}`, async () => {
            const { onWriting, afterRemoving } = await paintsOnALiveGraph(target, set as StaticStyle);

            assert.isAbove(
                onWriting,
                PIXEL_CHANGE,
                `${what} was written to a graph that was already drawn and ${String(onWriting)} ` +
                    `pixels moved. The channel table publishes it as renderable, so a consumer ` +
                    `who writes this layer from a settings panel sees nothing happen.`,
            );

            assert.isAtMost(
                afterRemoving,
                PIXEL_CHANGE,
                `Taking the layer away left ${String(afterRemoving)} pixels changed, so ${what} ` +
                    `cannot be undone and every measurement after this one is untrustworthy.`,
            );
        });
    }

    it("changes the frame: a glow's strength, over a graph that is already glowing", async () => {
        // THE GLOW IS ALREADY ON SCREEN BEFORE THE STRENGTH IS WRITTEN, and that is the whole of
        // what this measures. A layer carrying the glow's colour AND its strength together would
        // move the mesh key -- a glow colour is what the renderer builds a source mesh from -- and
        // would therefore be drawn by the rebuild, which is exactly the path that was never
        // broken. Writing the strength on its own leaves the key where it is, so the only thing
        // that can carry it to the screen is the branch of `Node.paintFrom` that does NOT rebuild.
        const glowing = await session.styles.add({
            name: "already glowing",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff" },
        });

        const before = await frame();
        const stronger = await session.styles.add({
            name: "stronger",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glowStrength": 8 },
        });
        const after = await frame();

        await session.styles.remove(stronger.id);

        const restored = await frame();

        await session.styles.remove(glowing.id);
        await graph.operationQueue.waitForCompletion();

        assert.isAbove(
            moved(before, after),
            PIXEL_CHANGE,
            `A glow's strength was raised on a graph that was already glowing and ` +
                `${String(moved(before, after))} pixels moved. Its role is \`instance\`, so it must ` +
                `reach the screen without a source mesh being rebuilt for it.`,
        );

        assert.isAtMost(moved(before, restored), PIXEL_CHANGE, "the strength could not be taken away again");
    });

    it("raises a glow's strength without minting a second source mesh for it", async () => {
        const glow: LayerSpec = {
            name: "glowing",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff" },
        };
        const added = await session.styles.add(glow);

        await graph.operationQueue.waitForCompletion();

        const meshesWhileGlowing = graph.getStylePainter().meshCount("node");

        await session.styles.update(added.id, { set: { "node.glow": "#ff00ff", "node.glowStrength": 8 } });
        await graph.operationQueue.waitForCompletion();

        const meshesAfterStrength = graph.getStylePainter().meshCount("node");

        await session.styles.remove(added.id);
        await graph.operationQueue.waitForCompletion();

        assert.strictEqual(
            meshesAfterStrength,
            meshesWhileGlowing,
            "A glow's strength is a property of the glow LAYER, one per scene, so no two nodes " +
                "can be drawn at two strengths and a source mesh per strength buys nothing. It " +
                "used to mint one anyway, because forcing a rebuild was the only way to make a " +
                "strength edit reach the screen.",
        );
    });
});
