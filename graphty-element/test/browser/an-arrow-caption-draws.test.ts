/**
 * @file The words at the end of an arrow, from the layer that asks for them to the pixels.
 *
 * WHAT WAS HERE BEFORE. `EdgeStyle` has declared a full rich-text block at each end of an edge
 * since 1.x -- `arrowHead.text` and `arrowTail.text`, what Graphviz calls a headlabel and a
 * taillabel -- and `Edge` has built, positioned and disposed one all along. No style channel
 * wrote either, so no layer, theme or saved style document could ask for a caption, and the only
 * evidence one had ever been drawn was a visual-regression baseline from 1.x. The 307-line test
 * beside this one never constructs an Edge: every case in it either asserts that an object
 * literal holds what was just written into that literal, or builds a bare `RichTextLabel`.
 *
 * So this file is the missing half, and it asks the questions that decided whether the capability
 * was published or deleted: does a caption reach the screen at all, does it reach the screen when
 * a layer is added to a graph a reader is already looking at, and does the APPEARANCE a layer
 * asks for reach it -- which is the half the old builder dropped, reading seven of the block's
 * fields and discarding the rest.
 *
 * IT READS THE CAPTION'S OWN CANVAS. A `RichTextLabel` draws onto a `DynamicTexture`, so the
 * letters, their panel and their border can be counted directly. That is the only way to tell
 * "the style model says the caption is magenta" from "a magenta caption was drawn", which is the
 * distinction the whole channel table now rests on.
 */

import { DynamicTexture, type StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LabelStyle, LayerSpec, StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import type { GraphSession } from "../../src/session";

/** Two nodes and the edge between them: the smallest graph with two ends to caption. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge both captions are measured on. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many frames to render before reading one. */
const FRAMES = 8;

/** How long to leave between them. */
const FRAME_MS = 10;

/** How many buckets the frame histogram has: four bits per channel, three channels. */
const BUCKETS = 16 * 16 * 16;

/**
 * How many pixels must move before the picture counts as changed.
 *
 * The figure `channel-paints.test.ts` and `a-layer-added-later-paints.test.ts` both use: two
 * renderings of an unchanged scene in headless Chromium agree exactly, so this is insurance
 * against a driver that dithers rather than room for a small change to hide in.
 */
const PIXEL_CHANGE = 32;

/** Above this alpha a pixel on a caption's texture counts as drawn rather than as empty canvas. */
const INK_ALPHA = 24;

/** How many pixels of a colour must be on a caption's canvas before it counts as drawn in it. */
const ENOUGH = 20;

describe("a caption at the end of an arrow", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
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

        // THE PREREQUISITE, and it is the subject of one of the tests below as well: a caption
        // hangs from the cap at its end, so both ends need a cap before either can carry one.
        // The caps are drawn large for the same reason the other pixel files draw them large --
        // at the default size a cap is a few dozen pixels.
        await session.styles.add({
            name: "caps at both ends",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 3,
                "edge.arrowTail": "normal",
                "edge.arrowTailSize": 3,
            },
        });
        await graph.operationQueue.waitForCompletion();

        // Drawn before the first measurement, so that every "the frame moved" below is a change
        // to a graph that was already on screen rather than to a graph that had never been drawn.
        await frame();
    }, 60000);

    afterEach(() => {
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
     * The one edge the element holds.
     * @returns The edge, so its two captions can be inspected.
     */
    function edgeObject(): Edge {
        const [edge] = Array.from(graph.getDataManager().edges.values());

        assert.isDefined(edge, "the graph holds the one edge");

        return edge;
    }

    /**
     * What is actually drawn on one caption's own canvas.
     * @param caption - The caption, or null when the edge is not drawing one.
     * @returns How many opaque pixels there are, and how many of each colour, quantised.
     */
    function drawnOn(caption: RichTextLabel | null): { ink: number; counts: Map<string, number> } {
        const counts = new Map<string, number>();

        assert.isNotNull(caption, "the edge is drawing a caption at this end");

        const texture = (caption.labelMesh?.material as StandardMaterial | null)?.diffuseTexture;

        assert.instanceOf(texture, DynamicTexture, "the caption has a canvas of its own to read");

        const { width, height } = texture.getSize();
        const image = texture.getContext().getImageData(0, 0, width, height);
        let ink = 0;

        for (let at = 0; at < image.data.length; at += 4) {
            if (image.data[at + 3] <= INK_ALPHA) {
                continue;
            }

            ink++;

            // Quantised to five bits a channel, so one anti-aliased letter is one colour rather
            // than forty near-identical ones.
            const key = [image.data[at], image.data[at + 1], image.data[at + 2]]
                .map((channel) => (channel >> 3).toString(16).padStart(2, "0"))
                .join("");
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        return { ink, counts };
    }

    /**
     * How many pixels of one colour a caption's canvas holds.
     * @param drawn - What {@link drawnOn} read.
     * @param hex - The colour asked for, as `#rrggbb`.
     * @returns The count, in the same quantisation the reading uses.
     */
    function pixelsOf(drawn: { counts: Map<string, number> }, hex: string): number {
        const key = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
            .map((pair) => (parseInt(pair, 16) >> 3).toString(16).padStart(2, "0"))
            .join("");

        return drawn.counts.get(key) ?? 0;
    }

    /**
     * Add one layer over every edge and let the repaint it causes reach the scene.
     *
     * THE FRAME IS PART OF ADDING IT. A style edit settles its own queue well before the painted
     * result is applied to a mesh -- the painter announces a dirty set and the renderer drains it
     * on the next frame -- so an edge asked what it is drawing the instant `styles.add` resolves
     * answers with what it was drawing before. That is the ordinary shape of this element and
     * every pixel test in the package renders before it reads.
     * @param name - What the layer is called, which is what a failure names.
     * @param set - The channels it writes.
     * @returns The layer's id, so a test can take it away again, and the frame it produced.
     */
    async function addLayer(name: string, set: StaticStyle): Promise<{ id: string; after: Uint32Array }> {
        const spec: LayerSpec = { name, target: "edge", selector: { match: "everything" }, set };
        const added = await session.styles.add(spec);

        return { id: added.id, after: await frame() };
    }

    it("is drawn when a layer writes the words onto a graph that is already on screen", async () => {
        const edge = edgeObject();

        assert.isNull(edge.arrowHeadText, "no layer has asked for a caption yet");

        const before = await frame();

        const { after } = await addLayer("caption the head", { "edge.arrowHeadText": "DESTINATION" });

        assert.isNotNull(
            edge.arrowHeadText,
            "a layer that writes edge.arrowHeadText builds the caption at that end of the edge",
        );
        assert.isAbove(
            drawnOn(edge.arrowHeadText).ink,
            0,
            "and there are letters on the caption's own canvas rather than an empty plane",
        );
        assert.isAbove(
            moved(before, after),
            PIXEL_CHANGE,
            "and the frame moved, so the caption is on screen and not only in the scene graph",
        );
    });

    it("is taken away again when the layer that asked for it is removed", async () => {
        const edge = edgeObject();
        const before = await frame();
        const { id } = await addLayer("caption the head", { "edge.arrowHeadText": "DESTINATION" });

        assert.isNotNull(edge.arrowHeadText, "the caption is drawn while the layer is there");

        await session.styles.remove(id);
        await graph.operationQueue.waitForCompletion();

        const restored = await frame();

        assert.isNull(edge.arrowHeadText, "and gone once it is not");
        assert.isAtMost(
            moved(before, restored),
            PIXEL_CHANGE,
            "and the picture is the one that was there before the layer was added",
        );
    });

    it("draws a caption at each end, and each one says what its own channel asked for", async () => {
        const edge = edgeObject();

        await addLayer("caption both ends", {
            "edge.arrowHeadText": "DESTINATION",
            "edge.arrowTailText": "ORIGIN",
        });

        assert.isNotNull(edge.arrowHeadText, "the head carries a caption");
        assert.isNotNull(edge.arrowTailText, "and so does the tail");
        assert.isAbove(drawnOn(edge.arrowHeadText).ink, 0, "the head's caption has letters on it");
        assert.isAbove(drawnOn(edge.arrowTailText).ink, 0, "and so does the tail's");
    });

    it("draws the caption in the colours its style channel asks for, not the builder's own", async () => {
        const edge = edgeObject();
        const style: LabelStyle = { sizePx: 48, color: "#ff00ff", background: "#00ff00" };

        await addLayer("caption the head in its own colours", {
            "edge.arrowHeadText": "DESTINATION",
            "edge.arrowHeadTextStyle": style,
        });

        const drawn = drawnOn(edge.arrowHeadText);

        assert.isAbove(
            pixelsOf(drawn, "#ff00ff"),
            ENOUGH,
            "the letters are drawn in the colour the layer named, rather than the element's own",
        );
        assert.isAbove(
            pixelsOf(drawn, "#00ff00"),
            ENOUGH,
            "and the panel behind them is drawn in the colour the layer named",
        );
    });

    it("draws the fields the old builder dropped, which is what publishing the style channel was for", async () => {
        const edge = edgeObject();

        // A BORDER AND A TEXT OUTLINE, chosen because both are visible as colour on the caption's
        // own canvas and NEITHER was reachable before. The builder this replaced read seven of
        // the block's fields -- the words, the font size, the two colours, the corner radius and
        // the offset -- and dropped every other one on the floor, so a caption could not be given
        // a border or an outline by any route at all, not even by a caller writing the style out
        // by hand.
        await addLayer("caption the head with a border", {
            "edge.arrowHeadText": "DESTINATION",
            "edge.arrowHeadTextStyle": {
                sizePx: 48,
                color: "#ffffff",
                background: "#000000",
                padding: 12,
                borderWidth: 8,
                borderColor: "#ff9900",
                outline: "#0000ff",
                outlineWidth: 4,
            },
        });

        const drawn = drawnOn(edge.arrowHeadText);

        assert.isAbove(pixelsOf(drawn, "#ff9900"), ENOUGH, "the border is drawn in the colour the layer named");
        assert.isAbove(
            pixelsOf(drawn, "#0000ff"),
            ENOUGH,
            "and the letters carry the outline the layer named, in its colour",
        );
    });

    it("draws nothing at an end that has no cap to hang a caption from", async () => {
        const edge = edgeObject();
        const before = await frame();

        const { after } = await addLayer("caption a tail with no arrow on it", {
            "edge.arrowTail": "none",
            "edge.arrowTailText": "ORIGIN",
        });

        assert.isNull(
            edge.arrowTailText,
            "an end drawn with no arrow has no cap for a caption to hang from, so none is built",
        );
        assert.isAbove(
            moved(before, after),
            PIXEL_CHANGE,
            "and the change on screen is the tail cap going away, which is what the layer also asked for",
        );
    });

    it("draws nothing for a layer that says how a caption should look and never asks for one", async () => {
        const edge = edgeObject();
        const before = await frame();

        const { after } = await addLayer("appearance with no words", {
            "edge.arrowHeadTextStyle": { sizePx: 64, color: "#ff00ff", background: "#00ff00" },
        });

        assert.isNull(
            edge.arrowHeadText,
            "the words are what switch a caption on, exactly as node.label switches a label on",
        );
        assert.isAtMost(moved(before, after), PIXEL_CHANGE, "so the picture is unchanged");
    });
});
