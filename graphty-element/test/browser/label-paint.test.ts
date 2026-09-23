/**
 * @file A label a layer asks for, checked against the pixels on the canvas.
 *
 * WHY THIS FILE EXISTS. Four test files mention the `node.label` channel and all four assert the
 * model: `test/managers/style-painter.test.ts` adds a layer that sets `node.label`, asks the
 * painter what it resolved, and finds the words and `enabled: true` -- which is true, and says
 * nothing about whether anything built a label. The leaf tests next to it
 * (`Edge.label.test.ts`, `Edge.arrowText.test.ts`, `label-attachOffset.test.ts`) construct a
 * `RichTextLabel` by hand, or declare a style object literal and assert the fields they just
 * typed. Between the painter's answer and the frame there was nothing at all, and that is
 * exactly where the defect lived: the painter reported a label on a node that had no label
 * object and no label mesh anywhere in the scene.
 *
 * WHAT MAKES THIS DIFFERENT FROM THE OTHER PIXEL TEST. `style-paint-pixels.test.ts` samples the
 * MOST COLOURFUL pixel near a node and skips anything whose channel spread is under 24, because
 * grey is the background, the edges and a specular highlight. The default label is black text on
 * whitesmoke -- pure grey by that measure -- so the one instrument in the repository that reads
 * pixels is calibrated to ignore precisely what a label is. Reading a label needs the inverse
 * measurement: count the NEAR-BLACK pixels in the neighbourhood, which is what this file does.
 *
 * HOW EACH TEST IS MADE HONEST. Every measurement is taken twice in the same place -- once
 * before the edit and once after -- and the assertion is about the change. A count alone could
 * be satisfied by a shadow, an edge or a dark corner of the graph; a count that was zero and is
 * now hundreds, in the same rectangle of the same frame, cannot be. The before-reading is
 * asserted too, so a test cannot quietly pass because the thing it is looking for was already
 * there.
 *
 * THE ORDER OF OPERATIONS IS THE SUBJECT. Every test here loads the data first, drains the
 * queue, renders, and only THEN edits the style -- so the graph is already painted and the first
 * repaint has already moved every mesh key off the bootstrap. That is the ordinary case for a
 * settings panel toggling labels on a graph a reader is already looking at, and it is the case
 * the element dropped: a label, a tooltip and a label's typography key no source mesh (they are
 * `role: "content"` in `src/session/styles/intern.ts`), so a paint that changes only one of them
 * arrives with an unchanged mesh key and was discarded by the early return in `paintFrom`.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";
import type { GraphSession } from "../../src/session";

/**
 * Two nodes and the edge between them.
 *
 * Two rather than five: a label is drawn at roughly the size of the node it belongs to, so a
 * graph crowded enough to be interesting is a graph whose labels overlap each other and whose
 * dark-pixel counts stop belonging to any one node. Two nodes on a circle sit on opposite sides
 * of the canvas with nothing between them.
 */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge, whose own label is measured at the midpoint between the two nodes. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/**
 * How many frames to render before reading the buffer.
 *
 * A label is a plane carrying a dynamic texture, and the texture is drawn on a canvas and
 * uploaded; the material behind it compiles a shader asynchronously, as every other Babylon
 * material does. This is the same wait `style-paint-pixels.test.ts` makes, for the same reason.
 */
const FRAMES = 60;

/** How long to leave between frames so the work a frame started can land. */
const FRAME_MS = 10;

/**
 * How dark every channel of a pixel must be for it to count as a glyph.
 *
 * The element's background is whitesmoke (245) and its default node is indigo (99, 102, 241),
 * whose blue channel alone puts it far outside this. Nothing else in a default scene is this
 * dark, which is what makes the count attributable to text.
 */
const INK = 70;

/**
 * How red a pixel must be to count as a glyph drawn in red, for the typography test.
 *
 * Read as a shape rather than a distance: strong red with both other channels suppressed. The
 * indigo node fails it on red, the whitesmoke background fails it on green and blue.
 */
const RED = { min: 150, others: 90 };

/**
 * How many near-black pixels must appear before a square is called "showing text".
 *
 * Generous on purpose, in both directions. The exact count depends on the glyphs, the font, the
 * camera distance and the device pixel ratio, none of which this file is asserting; what it is
 * asserting is the difference between nothing and something. Measured on this graph, the word
 * covers between seven hundred and eight hundred pixels and its absence covers zero, so the
 * threshold sits an order of magnitude away from both readings.
 */
const LEGIBLE = 40;

/**
 * How far from a projected position to look, in pixels, for the glyphs belonging to it.
 *
 * A node's label is attached ABOVE the node with an offset, so a small radius finds the node
 * and misses the label entirely -- measured, thirty pixels finds none of it. Ninety finds all of
 * one label and, on this graph, none of the other: the two nodes project three hundred and
 * sixty-five pixels apart.
 */
const NEIGHBOURHOOD = 90;

describe("a label a layer asks for, on a graph that is already drawn", () => {
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

        // Data first, and through the queued path, so this file measures the content-channel
        // defect alone: a data-source load that never gets its first repaint and a style edit
        // that a data load obsoletes are both real and both belong to other files.
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);

        // CIRCULAR rather than the default physics layout, because a label's pixels are counted
        // in a square around a projected position and a node that is still drifting when the
        // frame is read is a square around where it used to be.
        //
        // AND TIGHTLY SCALED, which is not cosmetic. A `RichTextLabel` is a plane sized in WORLD
        // units -- one unit tall at the default 48px -- while the camera frames whatever the
        // graph spans, so how many pixels a label covers is the ratio of the two. At this
        // layout's own scale the two nodes sit 160 units apart and a five-letter word lands on
        // sixteen barely-tinted pixels, which no threshold can tell from the paper. At a
        // twentieth of that the same word is some seven hundred solidly black pixels.
        await graph.setLayout("circular", { scale: 0.05 });
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render until the textures and shaders have landed, then read the frame off the GPU.
     * @returns The pixels, four bytes each, bottom row first, as WebGL hands them back.
     */
    async function readFrame(): Promise<Uint8Array> {
        const { engine } = graph;

        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    /**
     * Where a world position lands on the canvas.
     * @param at - The world position.
     * @returns The pixel column and the pixel row, counting rows the way WebGL hands them back.
     */
    function projected(at: Vector3): { x: number; y: number } {
        const { engine } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const camera = graph.scene.activeCamera;

        assert.isNotNull(camera, "a graph that has rendered has an active camera");

        const point = Vector3.Project(
            at,
            // Identity, because `absolutePosition` is already world space. The transform matrix
            // the scene hands back is view times projection, which is the rest of the journey.
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );

        // WebGL reads bottom row first and projection counts from the top, so the row is flipped
        // here rather than at every use.
        return { x: Math.round(point.x), y: Math.round(height - point.y) };
    }

    /**
     * How many pixels near one position pass a test.
     *
     * A SQUARE RATHER THAN A POINT, and a large one. A node's label is attached above the node
     * with an offset, an edge's at the midpoint of the line, and both are billboarded planes
     * whose extent depends on how long the word is -- so the honest neighbourhood is "near
     * enough to belong to this element and nowhere near the other one", which for two nodes on
     * opposite sides of a circle is comfortably satisfied.
     * @param pixels - The frame.
     * @param at - The world position the glyphs belong to.
     * @param wanted - What counts.
     * @returns How many pixels in the square pass.
     */
    function countNear(
        pixels: Uint8Array,
        at: Vector3,
        wanted: (pixel: { r: number; g: number; b: number }) => boolean,
    ): number {
        const { engine } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const centre = projected(at);
        let found = 0;

        for (let y = centre.y - NEIGHBOURHOOD; y <= centre.y + NEIGHBOURHOOD; y++) {
            for (let x = centre.x - NEIGHBOURHOOD; x <= centre.x + NEIGHBOURHOOD; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) {
                    continue;
                }

                const offset = (y * width + x) * 4;

                if (wanted({ r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] })) {
                    found++;
                }
            }
        }

        return found;
    }

    /**
     * Whether a pixel is dark enough to be a glyph drawn in the default black.
     * @param pixel - The channels.
     * @returns Whether it counts as ink.
     */
    function isInk(pixel: { r: number; g: number; b: number }): boolean {
        return pixel.r < INK && pixel.g < INK && pixel.b < INK;
    }

    /**
     * Whether a pixel is a glyph drawn in red.
     * @param pixel - The channels.
     * @returns Whether it counts as red ink.
     */
    function isRedInk(pixel: { r: number; g: number; b: number }): boolean {
        return pixel.r > RED.min && pixel.g < RED.others && pixel.b < RED.others;
    }

    /**
     * How many near-black pixels are drawn near one node.
     * @param pixels - The frame.
     * @param id - The node id.
     * @param wanted - What counts, defaulting to the default label's black.
     * @returns The count.
     */
    function inkNearNode(
        pixels: Uint8Array,
        id: string,
        wanted: (pixel: { r: number; g: number; b: number }) => boolean = isInk,
    ): number {
        return countNear(pixels, nodeAt(id), wanted);
    }

    /**
     * Where one node is drawn, in world space.
     * @param id - The node id.
     * @returns The position.
     */
    function nodeAt(id: string): Vector3 {
        const node = graph.getNodes().find((candidate) => String(candidate.id) === id);

        assert.isDefined(node, `the graph holds a node called ${id}`);

        return node.mesh.absolutePosition;
    }

    /**
     * Halfway between the two nodes, which is where an edge's label is attached.
     * @returns The position.
     */
    function edgeMidpoint(): Vector3 {
        return Vector3.Center(nodeAt("alpha"), nodeAt("omega"));
    }

    /**
     * The node object the element holds for one id, so its label can be inspected.
     * @param id - The node id.
     * @returns The node.
     */
    function nodeObject(id: string): Node {
        const node = graph.getNodes().find((candidate) => String(candidate.id) === id);

        assert.isDefined(node, `the graph holds a node called ${id}`);

        return node;
    }

    /**
     * The one edge the element holds, so its label can be inspected.
     * @returns The edge.
     */
    function edgeObject(): Edge {
        const [edge] = Array.from(graph.getDataManager().edges.values());

        assert.isDefined(edge, "the graph holds the one edge");

        return edge;
    }

    /** A layer that writes words onto every node and nothing else. */
    const wordsOnNodes: LayerSpec = {
        name: "Node words",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "HELLO" },
    };

    /** A layer that writes words onto every edge and nothing else. */
    const wordsOnEdges: LayerSpec = {
        name: "Edge words",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.label": "HELLO" },
    };

    it("draws the words on a node when a layer adds only node.label", async () => {
        const before = await readFrame();

        assert.isUndefined(nodeObject("alpha").label, "no layer has asked for a label yet");
        assert.isBelow(
            inkNearNode(before, "alpha"),
            LEGIBLE,
            "and nothing that looks like text is on screen before one does",
        );

        await session.styles.add(wordsOnNodes);
        await graph.operationQueue.waitForCompletion();

        const after = await readFrame();
        const { label } = nodeObject("alpha");

        assert.isDefined(label, "a layer that writes words onto a node builds that node a label");
        assert.isNotNull(label.labelMesh, "and the label has a mesh in the scene");
        assert.isAbove(
            inkNearNode(after, "alpha"),
            LEGIBLE,
            "and the words are actually drawn where the node is",
        );
    });

    it("draws the words on an edge when a layer adds only edge.label", async () => {
        const before = await readFrame();
        const edge = edgeObject();

        assert.isNull(edge.label, "no layer has asked for an edge label yet");

        const inkBefore = countNear(before, edgeMidpoint(), isInk);

        assert.isBelow(inkBefore, LEGIBLE, "and nothing that looks like text is on the edge");

        await session.styles.add(wordsOnEdges);
        await graph.operationQueue.waitForCompletion();

        const after = await readFrame();

        assert.isNotNull(edge.label, "a layer that writes words onto an edge builds that edge a label");
        assert.isAbove(
            countNear(after, edgeMidpoint(), isInk),
            LEGIBLE,
            "and the words are actually drawn along the edge",
        );
    });

    it("redraws the glyphs when a layer changes only node.labelStyle", async () => {
        const added = await session.styles.add(wordsOnNodes);
        await graph.operationQueue.waitForCompletion();

        const black = await readFrame();

        assert.isAbove(inkNearNode(black, "alpha"), LEGIBLE, "the words are drawn in the default black");
        assert.isBelow(inkNearNode(black, "alpha", isRedInk), LEGIBLE, "and nothing on screen is red yet");

        // The typography alone: the words are unchanged, so nothing but `node.labelStyle` moves.
        await session.styles.update(added.id, {
            set: { "node.label": "HELLO", "node.labelStyle": { color: "#ff0000" } },
        });
        await graph.operationQueue.waitForCompletion();

        const red = await readFrame();

        assert.isAbove(
            inkNearNode(red, "alpha", isRedInk),
            LEGIBLE,
            "a layer that changes a label's colour changes the colour the glyphs are drawn in",
        );
        assert.isBelow(
            inkNearNode(red, "alpha"),
            LEGIBLE,
            "and the black glyphs it replaced are gone rather than drawn underneath",
        );
    });

    it("leaves the label alone when a repaint changes something else", async () => {
        await session.styles.add(wordsOnNodes);
        await graph.operationQueue.waitForCompletion();

        // Rendered before the label is read, not only after: a repaint announces a dirty set and
        // `UpdateManager.syncStyles` hands it to the elements on the NEXT frame, so a paint that
        // has committed has not yet been drawn.
        await readFrame();

        const before = nodeObject("alpha").label;

        assert.isDefined(before, "the words are on screen to begin with");

        // Colour is an `instance` channel: one buffer write, no geometry, no text. The label
        // must survive it as the very same object.
        await session.styles.add({
            name: "Node colour",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#118844" },
        });
        await graph.operationQueue.waitForCompletion();

        const after = await readFrame();

        // WHY IDENTITY AND NOT JUST PRESENCE. Building a `RichTextLabel` means a canvas, a
        // dynamic texture and an upload, and doing that on every repaint of a labelled graph
        // would turn a colour change from one buffer write into a texture rebuild per node --
        // paying for this fix on every frame that has nothing to do with text. The comparison
        // in `syncLabel` is what prevents it, and the same object coming back is the only
        // evidence that the comparison ran.
        // Compared as a boolean rather than with `strictEqual`, which would try to pretty-print
        // two whole `RichTextLabel`s -- a scene, a texture and a material each -- and run out of
        // string before it printed the difference.
        assert.isTrue(
            nodeObject("alpha").label === before,
            "a repaint that says nothing about the words rebuilds no label",
        );
        assert.isAbove(inkNearNode(after, "alpha"), LEGIBLE, "and the words are still drawn");
    });

    it("takes the label away when the layer that asked for it is removed", async () => {
        const added = await session.styles.add(wordsOnNodes);
        await graph.operationQueue.waitForCompletion();

        const drawn = await readFrame();

        assert.isAbove(inkNearNode(drawn, "alpha"), LEGIBLE, "the words are on screen to begin with");

        await session.styles.remove(added.id);
        await graph.operationQueue.waitForCompletion();

        const gone = await readFrame();

        assert.isUndefined(nodeObject("alpha").label, "removing the layer that asked for a label removes the label");
        assert.isBelow(inkNearNode(gone, "alpha"), LEGIBLE, "and the glyphs leave the canvas with it");
    });
});
