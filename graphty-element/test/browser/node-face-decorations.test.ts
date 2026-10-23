/**
 * What a node draws over its face, each through a style channel: a pie chart (Cytoscape.js `pie-*`, Graphviz
 * `style=wedged`, Cytoscape's pie and ring charts), bands of color (Cytoscape.js `stripe-*`, Graphviz
 * `style=striped`) and an image (Cytoscape.js `background-image`, vis-network's image nodes).
 */
import { type InstancedMesh, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { asData, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

interface Faced {
    decorationPieces: readonly { kind: "shape" | "image"; box: { x0: number; y0: number; x1: number; y1: number } }[];
    decorations: InstancedMesh[];
}

/**
 * One node, styled by its layer, drawn and settled.
 * @param set - the node layer
 * @returns the node
 */
async function oneNode(set: StaticStyle): Promise<{ node: Node; faced: Faced }> {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "400px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await styleEveryNode(graph, { "node.shape": "rectangle", "node.width": 4, "node.height": 2, ...set });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const node = graph.getDataManager().nodes.get("A");
    assert(node, "the node is drawn");
    return { node, faced: node as unknown as Faced };
}

/** World units per unit of size under the default size mode. */
const PER = 1.5;

describe("a node's pie", () => {
    test("is drawn as slices in their colors over the node, clockwise from 12 o'clock", async () => {
        const { node, faced } = await oneNode({ "node.pieColors": "#ff0000 #0000ff", "node.pieSizes": "0.25 0.75" });
        const pieces = faced.decorationPieces;
        assert.lengthOf(pieces, 2);
        // a disc of half the shorter side (2 * 1.5 / 2), the first quarter at the top right
        const [first] = pieces;
        assert.approximately(first.box.x0, 0, 1e-6);
        assert.approximately(first.box.x1, PER, 1e-6);
        assert.approximately(first.box.y1, PER, 1e-6);
        const mesh = faced.decorations[0].sourceMesh;
        const colors = mesh.getVerticesData(VertexBuffer.ColorKind);
        assert(colors, "the slices carry their colors");
        assert.deepEqual([...colors.slice(0, 4)], [1, 0, 0, 1]);
        assert.deepEqual([...colors.slice(-4)], [0, 0, 1, 1]);
        // in front of the node's face, toward the 2D camera
        const front = (node.mesh as InstancedMesh).sourceMesh.getBoundingInfo().boundingBox.minimum.z;
        assert.isBelow(mesh.getBoundingInfo().boundingBox.maximum.z, front);
    });

    test("is not drawn without colors", async () => {
        const { faced } = await oneNode({ "node.pieSizes": "0.25 0.75" });
        assert.lengthOf(faced.decorationPieces, 0);
    });
});

/**
 * The color drawn at a point of the canvas, after a fresh frame.
 * @param at - the point, in CSS pixels from the top left
 * @param at.x - across
 * @param at.y - down
 * @returns red, green and blue
 */
async function pixelAt(at: { x: number; y: number }): Promise<[number, number, number]> {
    assert(graph);
    await graph.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    const ratio = engine.getRenderWidth() / (container?.clientWidth ?? 1);
    const [x, y] = [Math.round(at.x * ratio), Math.round(engine.getRenderHeight() - at.y * ratio)];
    const data = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
    return [data[0], data[1], data[2]];
}

describe("a node's stripes", () => {
    test("are bands following one another top to bottom, inside the node", async () => {
        const { faced } = await oneNode({ "node.stripeColors": "#ff0000 #00ff00", "node.stripeSizes": "0.25 0.75" });
        const [a, b] = faced.decorationPieces;
        assert.approximately(a.box.y1, PER, 1e-6);
        assert.approximately(a.box.y0, PER - 0.25 * 2 * PER, 1e-6);
        assert.approximately(b.box.y0, -PER, 1e-6);
        assert.approximately(a.box.x0, -2 * PER, 1e-6);
        assert.approximately(a.box.x1, 2 * PER, 1e-6);
    });

    test("are drawn in their own colors over the node's fill", async () => {
        await oneNode({
            "node.color": "#c8c8c8",
            "node.stripeColors": "#ff0000 #00ff00",
            "node.stripeDirection": "right",
            "node.width": 4,
            "node.height": 4,
        });
        assert(graph);
        const center = graph.nodeScreenPosition("A");
        assert(center, "the node is on screen");
        const left = await pixelAt({ x: center.x - 10, y: center.y });
        const right = await pixelAt({ x: center.x + 10, y: center.y });
        assert.isAbove(left[0], 200, `left band is red: ${left.join(",")}`);
        assert.isBelow(left[1], 60);
        assert.isAbove(right[1], 200, `right band is green: ${right.join(",")}`);
        assert.isBelow(right[0], 60);
    });
});

describe("a node's chart", () => {
    test("is drawn as bars in their own colors over the node, each its value's share of the plot", async () => {
        const { faced } = await oneNode({
            "node.width": 4,
            "node.height": 4,
            "node.chartValues": "1 3",
            "node.chartColors": "#ff0000 #0000ff",
            "node.chartMax": 4,
        });
        const [a, b] = faced.decorationPieces;
        // a plot the node's 4 x 4 (6 world units), the bars side by side up from its bottom
        assert.approximately(a.box.x0, -2 * PER, 1e-6);
        assert.approximately(a.box.x1, 0, 1e-6);
        assert.approximately(b.box.x1, 2 * PER, 1e-6);
        assert.approximately(a.box.y0, -2 * PER, 1e-6);
        assert.approximately(a.box.y1, -2 * PER + PER, 1e-6);
        assert.approximately(b.box.y1, -2 * PER + 3 * PER, 1e-6);
    });

    test("is drawn in its colors over the node's fill", async () => {
        await oneNode({
            "node.color": "#c8c8c8",
            "node.width": 4,
            "node.height": 4,
            "node.chartValues": "4 4",
            "node.chartColors": "#ff0000 #0000ff",
        });
        assert(graph);
        const center = graph.nodeScreenPosition("A");
        assert(center, "the node is on screen");
        const left = await pixelAt({ x: center.x - 10, y: center.y });
        const right = await pixelAt({ x: center.x + 10, y: center.y });
        assert.isAbove(left[0], 200, `the first bar is red: ${left.join(",")}`);
        assert.isBelow(left[2], 60);
        assert.isAbove(right[2], 200, `the second bar is blue: ${right.join(",")}`);
        assert.isBelow(right[0], 60);
    });

    test("is not drawn without values", async () => {
        const { faced } = await oneNode({ "node.chartColors": "#ff0000" });
        assert.lengthOf(faced.decorationPieces, 0);
    });
});

describe("a node's image", () => {
    // a 20 x 10 picture: red on the left, blue on the right
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="10" height="10" fill="red"/>' +
        '<rect x="10" width="10" height="10" fill="blue"/></svg>';
    const picture = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    test("is drawn once loaded, contained in the node in its own proportions", async () => {
        const { faced } = await oneNode({ "node.image": picture, "node.width": 4, "node.height": 4 });
        const [image] = faced.decorationPieces;
        assert.strictEqual(image.kind, "image");
        // 20 x 10 inside a 6 x 6 node: 6 x 3
        assert.approximately(image.box.x1 - image.box.x0, 4 * PER, 1e-6);
        assert.approximately(image.box.y1 - image.box.y0, 2 * PER, 1e-6);
    });

    test("that cannot be loaded draws nothing and holds no frame back", async () => {
        const { faced } = await oneNode({ "node.image": "data:image/png;base64,bm90IGFuIGltYWdl" });
        assert.lengthOf(faced.decorationPieces, 0);
    });

    test("that cannot be loaded gives way to its fallback", async () => {
        const { faced } = await oneNode({
            "node.image": "data:image/png;base64,bm90IGFuIGltYWdl",
            "node.imageFallback": picture,
            "node.width": 4,
            "node.height": 4,
        });
        const [image] = faced.decorationPieces;
        assert.strictEqual(image.kind, "image");
        assert.approximately(image.box.y1 - image.box.y0, 2 * PER, 1e-6);
    });

    test("at its own size covers its pixels at the pixel size, cut to the node", async () => {
        const { faced } = await oneNode({
            "node.image": picture,
            "node.imageFit": "none",
            "node.imagePixelSize": 0.1,
            "node.width": 1,
            "node.height": 4,
        });
        const [image] = faced.decorationPieces;
        // 20 x 10 pixels at 0.15 world units each is 3 x 1.5, its own box
        assert.approximately(image.box.x1 - image.box.x0, 3, 1e-6);
        assert.approximately(image.box.y1 - image.box.y0, 1.5, 1e-6);
        // drawn cut to the node's 1.5 width
        const mesh = faced.decorations[0].sourceMesh;
        const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
        assert.approximately(maximum.x - minimum.x, 1.5, 1e-6);
    });
});

describe("a node's glyph", () => {
    test("is its text drawn in its color, centered on a node with no body, a font size across", async () => {
        const { faced } = await oneNode({
            "node.shape": "none",
            "node.width": 4,
            "node.height": 4,
            "node.glyph": "+",
            "node.glyphFont": "DejaVu Sans",
            "node.glyphSize": 3,
            "node.glyphWeight": 900,
            "node.glyphColor": "#1f77b4",
        });
        const [glyph] = faced.decorationPieces;
        assert.strictEqual(glyph.kind, "image");
        // the font's size, 3 units of size, tall and centered on the node
        assert.approximately(glyph.box.y1 - glyph.box.y0, 3 * PER, 1e-6);
        assert.approximately(glyph.box.x0 + glyph.box.x1, 0, 1e-6);
        assert.isAbove(glyph.box.x1 - glyph.box.x0, PER);
        assert(graph);
        const center = graph.nodeScreenPosition("A");
        assert(center, "the node is on screen");
        // a heavy plus sign covers the middle of its box in its color
        const ink = await pixelAt(center);
        assert.isBelow(Math.abs(ink[0] - 0x1f) + Math.abs(ink[1] - 0x77) + Math.abs(ink[2] - 0xb4), 60, ink.join(","));
    });

    test("is not drawn without text", async () => {
        const { faced } = await oneNode({ "node.glyphColor": "#1f77b4" });
        assert.lengthOf(faced.decorationPieces, 0);
    });
});

describe("a database node's rim", () => {
    test("is drawn across its face in its border's color, as part of its outline rather than a piece over it", async () => {
        const { faced } = await oneNode({
            "node.shape": "database",
            "node.borderWidth": 0.2,
            "node.borderColor": "#2b7ce9",
        });
        assert.lengthOf(faced.decorations, 1, "the rim is drawn");
        const colors = faced.decorations[0].sourceMesh.getVerticesData(VertexBuffer.ColorKind);
        assert(colors, "the rim carries its color");
        assert.deepEqual(
            [...colors.slice(0, 3)].map((c) => Math.round(c * 255)),
            [0x2b, 0x7c, 0xe9],
        );
        assert.lengthOf(faced.decorationPieces, 0);
    });
});
