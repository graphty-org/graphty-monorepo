/**
 * @file A label and a tooltip are drawn on top of an edge that passes in front of them.
 *
 * THE DEFECT. A label is a billboarded plane in the 3D scene, and until this was fixed it was
 * depth-tested against everything else in it. An edge that crossed the label's plane nearer the
 * camera -- the ordinary case for any edge leaving the node the label belongs to, and for any
 * edge between two nodes in front of it -- was drawn across the words. The reviewer's report was
 * a tooltip in `Styles/Node Tooltip: On One Node Only` with an edge line struck through its text.
 *
 * WHAT IS MEASURED. One edge in a colour nothing else in the scene uses runs horizontally through
 * the label, and closer to the camera than the label is. The pixels of that edge's screen row are
 * read off the frame: outside the label the edge must be there (so the row really is the edge's),
 * and inside the label's screen rectangle there must be none of it.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { styleEveryEdge } from "../helpers/testSetup";

/**
 * The labelled node sits below the middle so its label, attached above it, is centred on y = 0;
 * the two ends of the edge sit at y = 0 as well, and at z = -2, between the label and the camera
 * (the default camera looks along +z from the -z side).
 */
const NODES = [
    { id: "alpha", position: { x: 0, y: -2, z: 0 } },
    { id: "left", position: { x: -6, y: 0, z: -2 } },
    { id: "right", position: { x: 6, y: 0, z: -2 } },
];

/** The edge that crosses in front of the label. */
const EDGES = [{ src: "left", dst: "right" }];

/** The colour of the edge: pure red, which the background, the node, the panel and the text are not. */
const EDGE_COLOUR = "#FF0000";

/** The label's panel: an opaque green, so anything red inside it can only be the edge. */
const LABEL_STYLE = { sizePx: 96, background: "#10B981", color: "#FFFFFF" };

/** Short words, so the label is narrower than the edge and the edge shows on both sides of it. */
const WORDS = "WWW";

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many frames to render before reading the buffer. */
const FRAMES = 30;

/** How long to leave between frames so the work a frame started can land. */
const FRAME_MS = 10;

/** How many pixels in from the label's projected edge to start counting, past antialiasing. */
const INSET = 4;

/** How many rows either side of the edge's projected row to read. */
const BAND = 2;

describe("text is drawn over the edges of the graph", () => {
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
        await graph.setLayout("fixed", { dim: 3 });
        await graph.operationQueue.waitForCompletion();
        await styleEveryEdge(graph, { "edge.color": EDGE_COLOUR, "edge.width": 3 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render until textures and shaders have landed, then read the frame.
     * @returns The pixels, four bytes each, bottom row first.
     */
    async function readFrame(): Promise<Uint8Array> {
        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const { engine } = graph;

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    /**
     * Where a world position lands on the canvas, rows counted bottom first as WebGL reads them.
     * @param at - The world position.
     * @returns The pixel column and row.
     */
    function projected(at: Vector3): { x: number; y: number } {
        const { engine } = graph;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera, "a graph that has rendered has an active camera");

        const point = Vector3.Project(
            at,
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );

        return { x: Math.round(point.x), y: Math.round(engine.getRenderHeight() - point.y) };
    }

    /**
     * Count the edge-red pixels on the edge's row, inside and outside the label's rectangle.
     * @param label - Finds the label or tooltip to measure, once the frame is drawn.
     * @returns The two counts.
     */
    async function redAcrossLabel(
        label: () => RichTextLabel | undefined,
    ): Promise<{ inside: number; outside: number }> {
        const pixels = await readFrame();
        const mesh = label()?.labelMesh;
        assert.isOk(mesh, "the text under test was drawn");
        const width = graph.engine.getRenderWidth();

        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        const a = projected(box.minimumWorld);
        const b = projected(box.maximumWorld);
        const left = Math.min(a.x, b.x) + INSET;
        const right = Math.max(a.x, b.x) - INSET;
        const bottom = Math.min(a.y, b.y) + INSET;
        const top = Math.max(a.y, b.y) - INSET;

        const row = projected(new Vector3(0, 0, -2)).y;
        assert.isTrue(
            row > bottom && row < top,
            `the edge's row ${String(row)} is not inside the label's rows ${String(bottom)}..${String(top)}, ` +
                "so this fixture no longer puts the edge across the text",
        );

        let inside = 0;
        let outside = 0;
        for (let y = row - BAND; y <= row + BAND; y++) {
            for (let x = 0; x < width; x++) {
                const at = (y * width + x) * 4;
                const red = pixels[at] > 150 && pixels[at + 1] < 90 && pixels[at + 2] < 90;
                if (!red) {
                    continue;
                }

                if (x >= left && x <= right) {
                    inside++;
                } else {
                    outside++;
                }
            }
        }

        return { inside, outside };
    }

    // A label is part of the scene and sorts by depth like a node or an edge: an edge nearer the
    // camera passes in front of it. Only a tooltip -- which the reader asked for by pointing --
    // is lifted over everything.
    it("draws an edge that passes in front of a node's label over the label", async () => {
        await graph.getSession().styles.add({
            name: "a label",
            selector: { match: "ids", nodes: ["alpha"] },
            set: { "node.label": WORDS, "node.labelStyle": LABEL_STYLE },
        });

        const { inside, outside } = await redAcrossLabel(() => graph.getNode("alpha")?.label);
        assert.isAbove(outside, 20, "the edge is drawn on this row beside the label");
        assert.isAbove(inside, 20, `only ${String(inside)} pixels of the nearer edge cross the label`);
    });

    it("draws a node's tooltip over an edge that passes in front of it", async () => {
        await graph.getSession().styles.add({
            name: "a tooltip",
            selector: { match: "ids", nodes: ["alpha"] },
            set: { "node.tooltip": WORDS, "node.tooltipStyle": LABEL_STYLE },
        });
        await readFrame();
        const alpha = graph.getNode("alpha");
        alpha?.showTooltip();

        const { inside, outside } = await redAcrossLabel(() => alpha?.tooltip);
        assert.isAbove(outside, 20, "the edge is drawn on this row beside the tooltip");
        assert.strictEqual(inside, 0, `${String(inside)} pixels of the edge were drawn over the tooltip's words`);
    });
});
