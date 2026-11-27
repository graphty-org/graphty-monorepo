/**
 * @file In 2D an arrowhead ending at a selected node is drawn over the node's halo (issue #10126).
 *
 * THE DEFECT. A 2D halo is a sheet lifted just in front of the edges' plane, so it is drawn over
 * every edge that crosses it (issue #7453). The arrowhead of an edge ending at the node lies in
 * that plane too, inside the halo's band, so selecting the node covered the arrow tip with the
 * band. In 3D the arrowhead was still drawn over it.
 *
 * WHAT IS MEASURED. A red edge runs up into a blue node from below. Before the click the canvas is
 * read down the edge's column from the node's center: the first red pixel past the node's blue is
 * the arrow's tip, inside where the band will be. The node is selected by a real click, and that
 * tip must still be bare red, with none of the halo's gold over it, while the band shows beside
 * the node at the same distance. Both render paths are checked (an object per edge, and edges
 * pulled from the row table), each with the node's own mesh and with a node drawn by a shader
 * batch.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty, RenderPath } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import { defineShader } from "../../../src/simple/defineShader";
import { type Pixel, pixelsAt } from "../../helpers/canvas-pixels";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

/** No wider than the 414 px test page (#10247). */
const WIDTH = 400;
const HEIGHT = 300;

const NODES = [
    { id: "target", position: { x: 0, y: 1, z: 0 } },
    { id: "source", position: { x: 0, y: -4, z: 0 } },
];

const EDGES = [{ src: "source", dst: "target" }];

/** A surface shader that paints the node its own color, so a sphere draws on the impostor batch. */
const FLAT_SHADER = "halo-under-arrowhead/flat";

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({ id: FLAT_SHADER, glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }" });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 2D element with the two nodes and the red edge between them.
 * @param path - The render path.
 * @param shader - Whether a shader batch draws the nodes rather than their own meshes.
 * @returns The element.
 */
async function mounted(path: RenderPath, shader: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    // A wide, fairly solid gold band, so the arrow's tip lies well inside it.
    element.selectionStyle = { color: "#FFD700", opacity: 0.6, scale: 1.8 };
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.session.styles.add({
        name: "red edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#FF0000", "edge.width": 4, "edge.arrowHead": "normal" },
    });
    await element.session.styles.add({
        name: "blue nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#0000FF", ...(shader ? { "node.shaders": [{ shader: FLAT_SHADER }] } : {}) },
    });
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn on screen.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * Whether a pixel is the edge's red with none of the halo's gold over it.
 * @param pixel - The pixel.
 * @returns True for bare red.
 */
function bareRed(pixel: Pixel): boolean {
    return pixel[0] > 200 && pixel[1] < 40 && pixel[2] < 40;
}

/**
 * Whether a pixel carries the halo's gold: green well above blue.
 * @param pixel - The pixel.
 * @returns True when the gold shows.
 */
function gold(pixel: Pixel): boolean {
    return pixel[1] > 60 && pixel[1] - pixel[2] > 40;
}

/**
 * Whether a pixel is the node's blue.
 * @param pixel - The pixel.
 * @returns True for blue.
 */
function blue(pixel: Pixel): boolean {
    return pixel[2] > pixel[0] + 40 && pixel[2] > pixel[1] + 40;
}

describe.each([
    ["objects", false],
    ["objects", true],
    ["batched", false],
    ["batched", true],
] as const)("in 2D on renderPath %s (shader batch: %s)", (path, shader) => {
    it("an arrowhead ending at a selected node is drawn over its halo", async () => {
        const element = await mounted(path, shader);
        const target = at(element, "target");
        const source = at(element, "source");
        // CSS pixels straight down the edge's column from the target's center to the source's
        const column = Array.from({ length: Math.floor(source.y - target.y) }, (_, i) => ({
            x: target.x,
            y: target.y + i,
        }));
        const before = await pixelsAt(element, column);
        assert.isTrue(blue(before[0]), `the target is blue at its center (got ${before[0].join(", ")})`);
        const edgeOfNode = before.findIndex((pixel) => !blue(pixel));
        assert.isAbove(edgeOfNode, 0, "the node's outline is found below its center");
        // the tip, a pixel or two clear of the node's antialiased outline
        const tipIndex = before.findIndex((pixel, i) => i > edgeOfNode + 1 && bareRed(pixel));
        assert.isAbove(tipIndex, 0, "the arrow's tip is drawn just below the node");
        const tip = column[tipIndex];
        // the same distance from the center, beside the node, where no edge runs
        const beside = { x: target.x + (tip.y - target.y), y: target.y };

        await click(element, target);
        await drawnFrames(element.graph.getScene(), 2);
        await element.waitForStableFrame();
        assert.strictEqual(element.getSelectedNode()?.id, "target", "the click selected the target");

        const [atTip, atSide] = await pixelsAt(element, [tip, beside]);
        assert.isTrue(gold(atSide), `the band reaches as far out as the arrow's tip (got ${atSide.join(", ")})`);
        assert.isTrue(bareRed(atTip), `the arrow's tip is drawn over the band (got ${atTip.join(", ")})`);
    });
});
