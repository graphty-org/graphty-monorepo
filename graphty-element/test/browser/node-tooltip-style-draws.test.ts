/**
 * @file A node tooltip drawn in the colours and the size a layer asked for.
 *
 * WHAT WAS MISSING UNTIL 2.0. A node tooltip appears when the pointer rests on the node, and the
 * only thing a consumer could say about one was what it said: `node.tooltip` carried the words
 * and there was no channel beside it for the look. Everything else about the drawn tooltip -- the
 * typeface, the size, the panel behind it, the colour of the letters -- was the element's own
 * default, and a consumer who wanted their own had nowhere to write it. The renderer was ready
 * the whole time: `Node.showTooltip` builds the tooltip through the same options builder a label
 * goes through, so the entire rich-text block was already read and only the door was missing.
 * `node.tooltipStyle` is that door, and it takes the same `LabelStyle` value `node.labelStyle`
 * takes.
 *
 * WHY THIS FILE EXISTS RATHER THAN `test/browser/channel-paints.test.ts`. That gate writes each
 * channel into a RESTING scene and requires the frame to change, and a resting scene is the one
 * moment a tooltip must not be on screen -- so it cannot see this channel at all, and the
 * `node.tooltipStyle` waiver in `UNPAINTED_CHANNELS` names this file as the place it is proved
 * instead. What is proved here is deliberately not "a mesh exists": a tooltip built at the
 * element's defaults and a tooltip built from a layer that asked for something else both produce
 * a mesh, which is exactly how a channel comes to be published, believed and unreachable.
 *
 * SO EVERY READING IS TAKEN OFF THE DRAWN THING. The size comes from the plane's own bounding
 * box, and the panel colour from the pixels of the `DynamicTexture` the tooltip is drawn on. A
 * tooltip configured beautifully and drawn at the default reads exactly like the default here.
 */

import { type DynamicTexture, Matrix, type StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";

/** Two nodes far enough apart that a pointer over one is nowhere near the other. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge between them. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many frames to render before reading anything back. */
const FRAMES = 20;

/** How long to leave between frames so the work a frame started can land. */
const FRAME_MS = 10;

/** The words, long enough that a change of type size moves the plane by a visible amount. */
const WORDS = "the busiest node in the graph";

/** A layer that gives one node a tooltip and says nothing about how it looks. */
const WORDS_ONLY: LayerSpec = {
    name: "one node's tooltip",
    selector: { match: "ids", nodes: ["alpha"] },
    set: { "node.tooltip": WORDS },
};

/** The panel colour the styled tooltip asks for: a green nothing in the element's defaults uses. */
const PANEL = "#10B981";

/** How far one channel may be from the colour asked for and still count as that colour. */
const COLOUR_TOLERANCE = 24;

/** The type size the styled tooltip asks for, well above the default so the plane has to grow. */
const BIG_TYPE = 72;

/** How much bigger the styled tooltip's plane has to be before the growth counts as real. */
const GROWTH = 1.2;

describe("the look of a node's tooltip, and the channel that carries it", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular");
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render a few frames so a texture upload and a shader compile can land.
     */
    async function settle(): Promise<void> {
        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }
    }

    /**
     * The node the layers in this file select.
     * @returns That node.
     */
    function alpha(): Node {
        const node = graph.getNode("alpha");
        assert.isDefined(node, "the fixture has the node the layers name");

        return node;
    }

    /**
     * Where a node is drawn, in canvas pixels counting from the top.
     * @param node - The node to locate.
     * @returns The pixel column and row.
     */
    function screenPosition(node: Node): { x: number; y: number } {
        const { engine } = graph;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera, "a graph that has rendered has an active camera");

        const point = Vector3.Project(
            node.mesh.absolutePosition,
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );

        return { x: Math.round(point.x), y: Math.round(point.y) };
    }

    /**
     * Move the real pointer to a place on the canvas and let the scene react.
     * @param at - Where to move it, in canvas pixels.
     */
    async function pointerTo(at: { x: number; y: number }): Promise<void> {
        const { canvas } = graph;
        const box = canvas.getBoundingClientRect();

        canvas.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: box.left + at.x,
                clientY: box.top + at.y,
                bubbles: true,
                pointerId: 1,
                pointerType: "mouse",
                // A real pointermove carries no button, and a PointerEvent built by hand defaults
                // to 0 -- the LEFT button -- which Babylon reads as a press. A hand-built move
                // then starts a drag, and a node being dragged stops reporting hover.
                button: -1,
            }),
        );

        await settle();
    }

    /**
     * Put the pointer over the node this file styles.
     */
    async function hoverAlpha(): Promise<void> {
        await pointerTo(screenPosition(alpha()));
    }

    /**
     * Take the pointer away, which takes the tooltip down with it.
     */
    async function hoverNothing(): Promise<void> {
        await pointerTo({ x: 2, y: 2 });
    }

    /**
     * How big the tooltip on screen is, in world units across the widest axis of its plane.
     *
     * Read from the plane's own bounding box rather than from anything the style model holds:
     * the model agreed with itself the entire time this block was unreachable.
     * @returns The size, or null when nothing is drawn.
     */
    function tooltipSize(): { width: number; height: number } | null {
        const mesh = alpha().tooltip?.labelMesh;

        if (!mesh || mesh.isDisposed()) {
            return null;
        }

        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox.extendSizeWorld;

        return { width: box.x * 2, height: box.y * 2 };
    }

    /**
     * The colour of the panel the tooltip's words are drawn on, sampled off its own texture.
     *
     * The sample is taken three pixels in from the top-left corner: far enough past the rounding
     * and the antialiased edge to be panel, far enough from the middle to be nowhere near the
     * letters.
     * @returns The colour as three channels, or null when there is no texture to read.
     */
    function panelColour(): { r: number; g: number; b: number } | null {
        const mesh = alpha().tooltip?.labelMesh;
        const texture = (mesh?.material as StandardMaterial | null)?.diffuseTexture as DynamicTexture | null;

        if (!texture) {
            return null;
        }

        const { width, height } = texture.getSize();

        if (width === 0 || height === 0) {
            return null;
        }

        const image = texture.getContext().getImageData(0, 0, width, height);
        const at = (Math.round(height / 2) * width + 3) * 4;

        return { r: image.data[at], g: image.data[at + 1], b: image.data[at + 2] };
    }

    /**
     * Whether a sampled colour is the one that was asked for.
     * @param seen - What was drawn.
     * @param hex - What the layer asked for, as `#rrggbb`.
     * @returns Whether they match within the tolerance one canvas fill allows.
     */
    function isColour(seen: { r: number; g: number; b: number }, hex: string): boolean {
        const want = {
            r: Number.parseInt(hex.slice(1, 3), 16),
            g: Number.parseInt(hex.slice(3, 5), 16),
            b: Number.parseInt(hex.slice(5, 7), 16),
        };

        return (
            Math.abs(seen.r - want.r) <= COLOUR_TOLERANCE &&
            Math.abs(seen.g - want.g) <= COLOUR_TOLERANCE &&
            Math.abs(seen.b - want.b) <= COLOUR_TOLERANCE
        );
    }

    /** A layer that says how the tooltip looks, on top of whatever wrote the words. */
    const styled = (name: string): LayerSpec => ({
        name,
        selector: { match: "ids", nodes: ["alpha"] },
        set: { "node.tooltipStyle": { sizePx: BIG_TYPE, background: PANEL, color: "#FFFFFF" } },
    });

    it("is drawn in the panel colour the layer asked for, and not the element's default", async () => {
        await graph.getSession().styles.add(WORDS_ONLY);
        await settle();
        await hoverAlpha();

        const before = panelColour();
        assert.isNotNull(before, "the words alone drew a tooltip, which is what the look is added to");
        assert.isFalse(
            isColour(before, PANEL),
            `the element's default tooltip is already ${PANEL}, so this file could not tell a ` +
                "layer's colour from the default. Pick another colour for PANEL.",
        );

        await hoverNothing();
        await graph.getSession().styles.add(styled("the tooltip's own colours"));
        await settle();
        await hoverAlpha();

        const after = panelColour();
        assert.isNotNull(after, "a tooltip is still drawn once a layer says how it should look");
        assert.isTrue(
            isColour(after, PANEL),
            `the tooltip's panel was drawn rgb(${String(after.r)}, ${String(after.g)}, ` +
                `${String(after.b)}) and the layer asked for ${PANEL}. node.tooltipStyle is ` +
                "published as something the element draws, so either the painter is not landing " +
                "it in the tooltip block or Node.showTooltip is not reading it.",
        );
    });

    it("is drawn at the size the layer asked for", async () => {
        await graph.getSession().styles.add(WORDS_ONLY);
        await settle();
        await hoverAlpha();

        const plain = tooltipSize();
        assert.isNotNull(plain, "the words alone drew a tooltip");

        await hoverNothing();
        await graph.getSession().styles.add(styled("a bigger tooltip"));
        await settle();
        await hoverAlpha();

        const big = tooltipSize();
        assert.isNotNull(big, "a tooltip is still drawn once a layer says how big it should be");
        assert.isAbove(
            big.width,
            plain.width * GROWTH,
            `the same words at ${String(BIG_TYPE)}px drew a plane ${String(big.width)} wide ` +
                `where the default drew ${String(plain.width)}. The type size a layer asked for ` +
                "never reached the canvas the tooltip is drawn on.",
        );
    });

    it("rebuilds a tooltip already on screen when a layer changes how it looks", async () => {
        // The half of this that is easy to get wrong, and the reason the channel is `content`
        // rather than `mesh` in src/session/styles/intern.ts: a reader resting on a node while a
        // settings panel changes the style is looking at a tooltip built from the old one, and a
        // channel that only lands on the next hover works in a story and fails in the product.
        await graph.getSession().styles.add(WORDS_ONLY);
        await settle();
        await hoverAlpha();

        const before = panelColour();
        assert.isNotNull(before, "the tooltip is on screen before the styling layer is added");

        await graph.getSession().styles.add(styled("a colour arriving mid-hover"));
        await settle();

        const after = panelColour();
        assert.isNotNull(after, "the tooltip is still on screen after the styling layer is added");
        assert.isTrue(
            isColour(after, PANEL),
            "the pointer never left the node, and the tooltip in front of the reader is still " +
                "drawn in the colours it had before the layer landed.",
        );
    });

    it("draws nothing at all when a layer writes the look and no words, which is what the caveat says", async () => {
        await graph.getSession().styles.add(styled("a look with nothing to look at"));
        await settle();
        await hoverAlpha();

        assert.isNull(
            tooltipSize(),
            "a tooltip was drawn for a node no layer gave any words. The words are what switch " +
                "a tooltip on -- the same rule node.labelStyle follows beside node.label -- and " +
                "the channel's published caveat says so.",
        );
    });

    it("takes a tooltip away when the look says it is switched off", async () => {
        await graph.getSession().styles.add(WORDS_ONLY);
        await graph.getSession().styles.add({
            name: "no tooltip on this node",
            selector: { match: "ids", nodes: ["alpha"] },
            set: { "node.tooltipStyle": { enabled: false } },
        });
        await settle();
        await hoverAlpha();

        assert.isNull(
            tooltipSize(),
            "a layer on top said enabled: false and a tooltip was drawn anyway. That flag is " +
                "how a reader's own layer hides what a layer beneath it annotated, without " +
                "taking the words away from it.",
        );
    });
});
