/**
 * An end cap's `gap`: the cap is drawn that many of its own lengths off its node, and the line stops at it, as
 * Cytoscape desktop draws its T bar and half circles (Cytoscape 3.10.5's SVG of the CX2 specimen-arrows sheet).
 */
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { TEE_DEPTH } from "../../src/meshes/FilledArrowRenderer";
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
 * Two round nodes 4 apart on the x axis and one edge between them with a tee head and a box tail, laid out and placed.
 * @param edgeSet - more of the edge layer
 * @returns the edge
 */
async function oneEdge(edgeSet: StaticStyle): Promise<Edge> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 4, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": "ellipse" });
    await styleEveryEdge(graph, { "edge.arrowHead": "tee", "edge.arrowTail": "box", ...edgeSet });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const edge = edgeBetween(graph, "A", "B");
    assert(edge?.arrowCap, "the head is drawn");
    assert(edge.arrowTailCap, "the tail is drawn");
    return edge;
}

describe("an end cap's gap", () => {
    test("stands that many of the cap's own lengths further off the node, head and tail", async () => {
        const touching = await oneEdge({});
        const head = touching.arrowCap?.position.x ?? Number.NaN;
        const tail = touching.arrowTailCap?.position.x ?? Number.NaN;
        graph?.dispose();
        container?.remove();

        const gapped = await oneEdge({ "edge.arrowHeadGap": 2, "edge.arrowTailGap": 2 });
        const length = EdgeMesh.calculateArrowLength();
        // a tee's own length is its bar's depth; a box's is its size
        assert.closeTo(gapped.arrowCap?.position.x ?? Number.NaN, head - 2 * TEE_DEPTH * length, 1e-3);
        assert.closeTo(gapped.arrowTailCap?.position.x ?? Number.NaN, tail + 2 * length, 1e-3);
    });
});
