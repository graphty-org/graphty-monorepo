/**
 * @file The tooltip a layer gives an edge, drawn while the real pointer is over the edge's line.
 *
 * `edge.tooltip` was withdrawn in 2.0 because nothing could tell that the pointer was over a line. The element now
 * reads that on every move (the pointer cursor says a line can be clicked, and a click selects the edge), so the
 * same read puts the edge's tooltip up and takes it down. This file drives the real pointer onto the line's middle,
 * onto a node and off the canvas, and asks the edge what it draws.
 */

import type { DynamicTexture, StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { hover, moveHeld, nextFrame, nodePoint, type Point, press, release } from "../helpers/real-input";

/** How wide the canvas is: inside the test frame's viewport, where the real pointer reaches. */
const WIDTH = 400;

/** How tall it is. */
const HEIGHT = 300;

describe("an edge tooltip a layer asks for", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "alpha" }, { id: "omega" }]);
        await graph.addEdges([{ src: "alpha", dst: "omega" }]);
        await graph.setLayout("circular");
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "the edge's tooltip",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.tooltip": "the only edge" },
        });
        await graph.getSession().styles.settled();
        await graph.waitForStableFrame();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The one edge.
     * @returns it
     */
    function edge(): Edge {
        const [only] = [...graph.getDataManager().edges.values()];
        assert.isDefined(only, "the graph holds its edge");
        return only;
    }

    /**
     * The name of the mesh the edge's tooltip is drawn on, or null when it has none (a name, so a failure prints).
     * @returns the name or null
     */
    function tooltipMesh(): string | null {
        const mesh = edge().tooltip?.labelMesh;
        return mesh === undefined || mesh === null || mesh.isDisposed() ? null : mesh.name;
    }

    /**
     * Moves the real pointer and lets the scene hear it.
     * @param at - where, in canvas pixels
     */
    async function pointerTo(at: Point): Promise<void> {
        await hover(graph.canvas, at);
        await graph.waitForStableFrame();
        await nextFrame();
    }

    /**
     * The middle of the edge's line on screen.
     * @returns the point
     */
    function lineMiddle(): Point {
        const a = nodePoint(graph, "alpha");
        const b = nodePoint(graph, "omega");
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    it("is not drawn at rest, and is drawn with its words when the pointer is over the line", async () => {
        assert.isNull(tooltipMesh(), "a tooltip is hover-only");
        assert.strictEqual(edge().tooltipText, "the only edge", "the paint recorded its words");
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh(), "the pointer over the line drew the edge's tooltip");
        assert.isTrue(edge().tooltip?.labelMesh?.isEnabled() ?? false, "and it is shown");
    });

    it("goes away when the pointer moves onto a node, and when it leaves the canvas", async () => {
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh());
        await pointerTo(nodePoint(graph, "alpha"));
        assert.isNull(tooltipMesh(), "over a node no line is pointed at");
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh(), "back over the line");
        await pointerTo({ x: 2, y: 2 });
        assert.isNull(tooltipMesh(), "on empty canvas the tooltip goes");
    });

    it("goes away while a button is held over the line, as a drag starts", async () => {
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh());
        const at = lineMiddle();
        await press(graph.canvas, at);
        await moveHeld(graph.canvas, { x: at.x + 1, y: at.y });
        await graph.waitForStableFrame();
        await nextFrame();
        assert.isNull(tooltipMesh(), "a held button takes the tooltip down");
        await release(graph.canvas, { x: at.x + 1, y: at.y });
    });

    it("is drawn again on an edge rebuilt under the same id while the pointer stays on its line", async () => {
        const at = lineMiddle();
        await pointerTo(at);
        const before = edge();
        assert.isNotNull(tooltipMesh());
        // an undone removal brings the edge back under its own id, as a new Edge
        await graph.removeEdges([before.id]);
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().undo();
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.notStrictEqual(edge(), before, "the edge was rebuilt");
        assert.strictEqual(edge().id, before.id, "under the same id");
        // the pointer moves a pixel along the line, still on it
        await pointerTo({ x: at.x + 1, y: at.y });
        assert.isNotNull(tooltipMesh(), "the rebuilt edge draws its tooltip");
    });

    /**
     * The drawn tooltip's size, off its plane's bounding box, or null when none is drawn.
     * @returns width and height in world units
     */
    function tooltipSize(): { width: number; height: number } | null {
        const mesh = edge().tooltip?.labelMesh;
        if (mesh === undefined || mesh === null || mesh.isDisposed()) {
            return null;
        }
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        return { width: box.x * 2, height: box.y * 2 };
    }

    /**
     * The pixels of the texture the tooltip is drawn on, or null when none is drawn.
     * @returns the pixels and the texture's width
     */
    function tooltipPixels(): { data: Uint8ClampedArray; width: number; height: number } | null {
        const texture = (edge().tooltip?.labelMesh?.material as StandardMaterial | null | undefined)?.diffuseTexture as
            DynamicTexture | null | undefined;
        if (!texture) {
            return null;
        }
        const { width, height } = texture.getSize();
        return { data: texture.getContext().getImageData(0, 0, width, height).data, width, height };
    }

    /**
     * Whether a pixel is near a `#rrggbb` color.
     * @param data - the pixels
     * @param at - the byte offset of the pixel
     * @param hex - the color
     * @returns whether each channel is within 24 of it
     */
    function near(data: Uint8ClampedArray, at: number, hex: string): boolean {
        return [1, 3, 5].every(
            (from, i) => Math.abs(data[at + i] - Number.parseInt(hex.slice(from, from + 2), 16)) <= 24,
        );
    }

    /**
     * The panel color, three pixels in from the left edge at half height, or null when none is drawn.
     * @param hex - the color asked for
     * @returns whether the panel is drawn in it
     */
    function panelIs(hex: string): boolean | null {
        const pixels = tooltipPixels();
        return pixels === null ? null : near(pixels.data, (Math.round(pixels.height / 2) * pixels.width + 3) * 4, hex);
    }

    /**
     * How many of the tooltip's pixels are near a color: its letters, when the color is the text's.
     * @param hex - the color
     * @returns the count
     */
    function pixelsIn(hex: string): number {
        const pixels = tooltipPixels();
        assert.isNotNull(pixels, "a tooltip is drawn");
        let count = 0;
        for (let at = 0; at < pixels.data.length; at += 4) {
            if (near(pixels.data, at, hex)) {
                count++;
            }
        }
        return count;
    }

    it("is drawn at the size, in the letter color and on the panel color its single-look channels write", async () => {
        const [panel, letters] = ["#10B981", "#EF4444"];
        await pointerTo(lineMiddle());
        const plain = tooltipSize();
        assert.isNotNull(plain, "the words alone drew a tooltip");
        assert.isFalse(panelIs(panel), "the default panel is not already the color asked for");
        assert.strictEqual(pixelsIn(letters), 0, "the default letters are not already the color asked for");
        await pointerTo({ x: 2, y: 2 });
        await graph.getSession().styles.add({
            name: "the tooltip's own size and colors",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.tooltipSize": 72, "edge.tooltipColor": letters, "edge.tooltipBackground": panel },
        });
        await graph.getSession().styles.settled();
        await pointerTo(lineMiddle());
        const big = tooltipSize();
        assert.isNotNull(big, "a tooltip is still drawn");
        assert.isAbove(big.height, plain.height * 1.2, "edge.tooltipSize reached the canvas");
        assert.isTrue(panelIs(panel), "edge.tooltipBackground reached the canvas");
        assert.isAbove(pixelsIn(letters), 0, "edge.tooltipColor reached the canvas");
    });

    it("is not drawn on an edge no layer gave one", async () => {
        const [layer] = graph
            .getSession()
            .styles.list()
            .filter((each) => each.name === "the edge's tooltip");
        assert.isDefined(layer);
        await graph.getSession().styles.remove(layer.id);
        await graph.getSession().styles.settled();
        await pointerTo(lineMiddle());
        assert.isNull(tooltipMesh(), "no words, no tooltip");
    });
});
