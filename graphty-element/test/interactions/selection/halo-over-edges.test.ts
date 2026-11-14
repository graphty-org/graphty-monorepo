/**
 * @file A selected node's halo is drawn over the edges that cross it, and under the node (issue #7453).
 *
 * THE DEFECT. In the 2D view the node, its halo and the edges all lie in one plane, and the halo was
 * pushed back in depth so it would not fight the node for the same pixels. That put it behind every
 * edge too, so an edge passing near a selected node was drawn straight across its halo.
 *
 * WHAT IS MEASURED. A red edge runs past the middle node close enough to cross its halo ring but not
 * the node itself. The node is selected by a real click, and the canvas is read on the edge's row
 * where it crosses the ring: the halo's gold must show there. The node's own centre must still be
 * the node's colour, not the halo's, so the halo stays behind the node. Both the node's own mesh and
 * a node drawn by a shader batch are checked; in 3D, where the halo is a shell round the node, only
 * that it rings the node and stays under it.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import { defineShader } from "../../../src/simple/defineShader";
import { type Pixel, pixelAt } from "../../helpers/canvas-pixels";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** How far above the middle node the edge runs: past the node's outline, inside its halo's. */
const EDGE_Y = 0.85;

/** The middle node, and two nodes either side of it whose edge passes just above it. */
const NODES = [
    { id: "middle", position: { x: 0, y: 0, z: 0 } },
    { id: "left", position: { x: -5, y: EDGE_Y, z: 0 } },
    { id: "right", position: { x: 5, y: EDGE_Y, z: 0 } },
];

const EDGES = [{ src: "left", dst: "right" }];

/** Pure red, which neither the node, the background nor the halo's gold is. */
const EDGE_COLOR = "#FF0000";

/** The node's own colour: a blue the halo's gold is far from. */
const NODE_COLOR = "#0000FF";

/** A surface shader that paints the node its own colour, so a sphere draws on the impostor batch. */
const FLAT_SHADER = "halo-over-edges/flat";

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
 * A mounted element with the three nodes and the red edge.
 * @param viewMode - The view mode.
 * @param shader - Whether a shader batch draws the nodes rather than their own meshes.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", shader: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.session.styles.add({
        name: "red edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": EDGE_COLOR, "edge.width": 4 },
    });
    await element.session.styles.add({
        name: "blue nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": NODE_COLOR, ...(shader ? { "node.shaders": [{ shader: FLAT_SHADER }] } : {}) },
    });
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn on screen.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
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
 * Whether a pixel carries the halo's gold: green well above blue, as the gold over the red edge
 * or over the background both are, and as neither the bare edge nor the blue node is.
 * @param pixel - The pixel.
 * @returns True when the gold shows.
 */
function gold(pixel: Pixel): boolean {
    return pixel[1] > 60 && pixel[1] - pixel[2] > 40;
}

/**
 * Whether a pixel is the node's blue, with no gold over it.
 * @param pixel - The pixel.
 * @returns True for blue.
 */
function blue(pixel: Pixel): boolean {
    return pixel[2] > pixel[0] + 40 && pixel[2] > pixel[1] + 40;
}

describe.each([
    ["2d", false],
    ["3d", false],
    ["2d", true],
    ["3d", true],
] as const)("a selected node's halo in %s (shader batch: %s)", (viewMode, shader) => {
    // In 3D the halo is a shell round the node and an edge through it is depth tested against
    // it, as it is against the node; only the 2D view lays node, halo and edges in one plane.
    const title = viewMode === "2d" ? "is drawn over an edge crossing it and under the node" : "rings the node";
    it(title, async () => {
        const element = await mounted(viewMode, shader);
        const middle = at(element, "middle");
        const left = at(element, "left");
        const right = at(element, "right");
        // the edge's row where it passes over the middle node, and a point on it far from the node
        const t = (middle.x - left.x) / (right.x - left.x);
        const crossing = { x: middle.x, y: left.y + t * (right.y - left.y) };
        const away = { x: (left.x + middle.x) / 2, y: (left.y + crossing.y) / 2 };

        assert.isTrue(bareRed(await pixelAt(element, crossing)), "before the click the edge crosses above the node");
        assert.isTrue(bareRed(await pixelAt(element, away)), "the edge is drawn away from the node");

        await click(element, middle);
        await drawnFrames(element.graph.getScene(), 2);
        await element.waitForStableFrame();
        assert.strictEqual(element.getSelectedNode()?.id, "middle", "the click selected the middle node");

        const below = await pixelAt(element, { x: middle.x, y: 2 * middle.y - crossing.y });
        assert.isTrue(gold(below), `the halo rings the node (got ${below.join(", ")})`);
        if (viewMode === "2d") {
            const ring = await pixelAt(element, crossing);
            assert.isTrue(gold(ring), `the halo shows where the edge crosses it (got ${ring.join(", ")})`);
        }

        const centre = await pixelAt(element, middle);
        assert.isTrue(blue(centre), `the node is drawn over its halo (got ${centre.join(", ")})`);
        assert.isTrue(bareRed(await pixelAt(element, away)), "the edge away from the halo is untouched");
    });
});
