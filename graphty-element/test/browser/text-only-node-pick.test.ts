/**
 * @file A node drawn only as text -- shape "none", or a Graphviz `shape=plaintext` or `shape=plain` -- is picked by
 * its text. A reader sees the words as the node, so a point on them hovers and clicks the node and `elementAt` names
 * it, on both render paths and in 2D and 3D, even where an edge runs behind the words (issue #10127). Pointer moves
 * and clicks are real mouse input (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import linuxKernelDot from "../../../graph-io/test/conformance/fixtures/dot/graphviz-gallery/Linux_kernel_diagram.gv?raw";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { fileStylesOn } from "../helpers/file-styles-on";
import { click, hover, type Point } from "../helpers/real-input";

fileStylesOn();

/** No wider than the test page's frame (414 px). */
const WIDTH = 400;
const HEIGHT = 300;

type Path = "objects" | "batched";
type View = "2d" | "3d";

const CASES: [Path, View][] = [
    ["objects", "2d"],
    ["objects", "3d"],
    ["batched", "2d"],
    ["batched", "3d"],
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * An empty element on a render path and in a view, drawn.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @returns The element.
 */
async function mounted(path: Path, view: View): Promise<Graphty> {
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
    await element.setViewMode(view);
    return element;
}

/**
 * Wait until what was asked is drawn.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Where a node's words are drawn: each text-only node here centers its label on the node, so that is the node's
 * center on screen.
 * @param element - The element.
 * @param id - The node.
 * @returns The point, in CSS pixels from the element's top-left corner.
 */
function labelCenter(element: Graphty, id: string): Point {
    const point = element.nodeScreenPosition(id);
    assert.isTrue(point?.visible, `node ${id} is drawn on screen`);
    assert.isOk(point);
    assert.isTrue(
        point.x > 0 && point.x < WIDTH && point.y > 0 && point.y < HEIGHT,
        `the words of ${id} are on screen at ${JSON.stringify(point)}`,
    );
    return { x: point.x, y: point.y };
}

/**
 * Hover, `elementAt` and a click at a point all name one node.
 * @param element - The element.
 * @param point - Where.
 * @param id - The node.
 */
async function picksNode(element: Graphty, point: Point, id: string): Promise<void> {
    assert.deepEqual(element.elementAt(point), { kind: "node", id }, `elementAt on the text names ${id}`);

    await hover(element, point);
    await drawnFrames(element.graph.getScene(), 3);
    assert.strictEqual(String(element.session.selection.hovered), id, `the pointer on the text hovers ${id}`);

    await click(element, point);
    await drawnFrames(element.graph.getScene(), 3);
    assert.deepEqual([...element.session.selection.nodes].map(String), [id], `the click on the text selects ${id}`);
    assert.deepEqual([...element.session.selection.edges], [], "and no edge");
}

describe("a node drawn only as text", () => {
    for (const [path, view] of CASES) {
        it(`is picked by its text over an edge, ${path} ${view}`, async () => {
            const element = await mounted(path, view);
            await element.session.data.addNodes([
                { id: "a", position: { x: -6, y: 0, z: 0 } },
                { id: "s", position: { x: 0, y: 0, z: 0 } },
                { id: "b", position: { x: 6, y: 0, z: 0 } },
            ]);
            // the edge runs straight through s's center, behind its words
            await element.session.data.addEdges([{ src: "a", dst: "b" }]);
            await element.graph.setLayout("fixed", { dim: 3 });
            await element.session.styles.add({
                name: "text only",
                selector: { match: "ids", nodes: ["s"] },
                set: {
                    "node.shape": "none",
                    "node.label": "TEXT ONLY",
                    "node.labelStyle": { location: "center", sizePx: 40 },
                },
            });
            await settled(element);

            await picksNode(element, labelCenter(element, "s"), "s");
        });
    }
});

describe("the Graphviz sample's text-only nodes", () => {
    for (const [path, view] of CASES) {
        it(`are picked by their text, ${path} ${view}`, async () => {
            const element = await mounted(path, view);
            await element.session.data.import(
                { type: "dot", config: { data: linuxKernelDot } },
                { styles: "file", layout: "recommended" },
            );
            await settled(element);
            // framed on each text-only node, so its words are large enough to point at
            for (const id of ["LKD", "bottom"]) {
                await element.zoomToNodes([id]);
                await settled(element);
                await picksNode(element, labelCenter(element, id), id);
            }
        });
    }
});
