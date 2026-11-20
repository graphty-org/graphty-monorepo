/**
 * A line with no cap starts at its node's center, which a drawn node hides; a node drawn at opacity 0 hides nothing,
 * so the line ends at its outline instead (Cytoscape.js keeps a `visibility: hidden` node's edges, trimmed at its
 * shape: cytoscapejs-specimen-edges-lines-p2, #8192).
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Two nodes 6 apart and one capless edge between them, every node at an opacity.
 * @param opacity - the nodes' opacity
 * @returns the drawn line's length, and a node's half width
 */
async function lineBetween(opacity: number): Promise<{ length: number; half: number }> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 6, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": "ellipse", "node.opacity": opacity });
    await styleEveryEdge(graph, { "edge.arrowHead": "none" });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const length = edgeBetween(graph, "A", "B")?.drawnLine?.length;
    const node = graph.getDataManager().getNode("B");
    assert(length !== undefined && node !== undefined, "the line and its node are drawn");
    return { length, half: node.drawnHalfExtents.x };
}

describe("a capless edge's end at a node", () => {
    test("runs to a drawn node's center, which the node hides", async () => {
        const { length } = await lineBetween(1);
        assert.closeTo(length, 6, 1e-3);
    });

    test("stops at the outline of a node drawn at opacity 0", async () => {
        const { length, half } = await lineBetween(0);
        assert.isAbove(half, 0.1);
        assert.closeTo(length, 6 - 2 * half, 1e-3, "each end on its node's outline");
    });
});
