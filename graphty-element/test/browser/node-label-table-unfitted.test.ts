/**
 * A node whose label is a table (`shape.labelTable`) and that sets no `node.labelFit`: with `shrinkToNode` the table is
 * drawn inside its node as a compact table, words and all, never spread across the canvas over its neighbors.
 */
import { afterEach, assert, describe, test } from "vitest";

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

/**
 * A cell holding one line.
 * @param text - its words
 * @returns the cell
 */
const cell = (text: string): object => ({ lines: [{ text }] });

/**
 * Draws a node at the origin whose label is a three-row record, and waits for the picture.
 * @param shrinkToNode - whether the table asks to shrink to fit its node
 * @returns the node
 */
async function drawRecord(shrinkToNode: boolean): Promise<Node> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "T", position: { x: 0, y: 0, z: 0 } }));
    const table = {
        cellPadding: 0.125,
        ...(shrinkToNode ? { shrinkToNode } : {}),
        rows: [
            { cells: [cell("label"), cell("Rex")] },
            { cells: [cell("x1"), cell("3")] },
            { cells: [cell("animals"), cell("dog, dog, cat, horse")] },
        ],
    };
    await styleEveryNode(graph, { "node.labelTable": JSON.stringify(table) });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const node = graph.getDataManager().nodes.get("T");
    assert(node, "the node is drawn");
    return node;
}

/**
 * How far the node's table words reach from its center, each way, in scene units.
 * @param node - the node
 * @returns the reach right and up, and the tallest word
 */
function reach(node: Node): { x: number; y: number; tallest: number } {
    let x = 0;
    let y = 0;
    let tallest = 0;
    const center = node.mesh.getAbsolutePosition();
    for (const label of node.shapeTextLabels) {
        const mesh = label.labelMesh;
        assert(mesh, "every word is on screen");
        const at = mesh.getAbsolutePosition();
        const half = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        x = Math.max(x, Math.abs(at.x - center.x) + half.x);
        y = Math.max(y, Math.abs(at.y - center.y) + half.y);
        tallest = Math.max(tallest, 2 * half.y);
    }
    return { x, y, tallest };
}

describe("a node's table label on a node that does not grow round it", () => {
    test("is drawn at its own size unless it asks to shrink", async () => {
        const node = await drawRecord(false);
        assert.lengthOf(node.shapeTextLabels, 6);
        const half = node.drawnHalfExtents;
        // the table is far wider than the node: its words reach past it, as Graphviz draws a fixed-size node's table
        assert.isAbove(reach(node).x, 2 * half.x);
    });

    test("shrinks, words and all, to fit inside its round node with shrinkToNode", async () => {
        const node = await drawRecord(true);
        assert.lengthOf(node.shapeTextLabels, 6);
        const half = node.drawnHalfExtents;
        const { x, y, tallest } = reach(node);
        // every word inside the node's box, and the words in their rows: smaller than a row of the node's height
        assert.isAtMost(x, half.x + 1e-3);
        assert.isAtMost(y, half.y + 1e-3);
        assert.isBelow(tallest, (2 * half.y) / 3);
        // the corners of a table fitted to a circle are on it: (x, y) inside the ellipse through the node's box
        assert.isAtMost((x / half.x) ** 2 + (y / half.y) ** 2, 1.2);
    });
});
