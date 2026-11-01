/**
 * A polygon whose corners add lengths to their fractions (`-1+24`) is drawn against its box: a glyph of pieces at
 * fixed sizes, such as Graphviz's synthetic-biology shapes (fivepoverhang, proteinstab ...), which may sit off the
 * node's center and fill little of its box. Graphviz ends its edges at that box and places its label by it, not by
 * the pieces (dot-synth-nodes s_fivepoverhang->s_threepoverhang), so graphty-element's node surface is the box too.
 * A polygon whose corners are plain fractions keeps ending its edges at its drawn outline.
 */
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { NodeMesh } from "../../src/meshes/NodeMesh";
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
 * Two nodes of one style side by side, joined by an edge.
 * @param nodeSet - the nodes' style
 * @returns the edge
 */
async function joined(nodeSet: StaticStyle): Promise<Edge> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 20, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, nodeSet);
    // an arrow head, as a DOT digraph draws: its line is placed from where it meets each node's surface
    await styleEveryEdge(graph, { "edge.arrowHead": "normal" });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const edge = edgeBetween(graph, "A", "B");
    assert(edge, "the edge is drawn");
    return edge;
}

/**
 * Where the edge leaves its source toward its target.
 * @param edge - the edge
 * @returns the point
 */
function leaves(edge: Edge): Vector3 {
    return (edge as unknown as { leaveNode(node: unknown, centre: Vector3, toward: Vector3): Vector3 }).leaveNode(
        edge.srcNode,
        edge.srcNode.mesh.position,
        edge.dstNode.mesh.position,
    );
}

/**
 * Where the edge's drawn line starts.
 * @param edge - the edge
 * @returns the start of its first piece
 */
function drawnStart(edge: Edge): Vector3 {
    return drawnEnds(edge)[0];
}

/**
 * Where the edge's drawn line starts and ends.
 * @param edge - the edge
 * @returns the start of its first piece and the end of its last
 */
function drawnEnds(edge: Edge): [Vector3, Vector3] {
    const { lineBatch, lineSlots } = edge as unknown as {
        lineBatch: { endsOf(slot: number): [Vector3, Vector3] } | null;
        lineSlots: number[];
    };
    const last = lineSlots.at(-1);
    assert(lineBatch !== null && last !== undefined, "the line is drawn");
    return [lineBatch.endsOf(lineSlots[0])[0], lineBatch.endsOf(last)[1]];
}

const per = NodeMesh.extentPerSize({ type: "polygon" });

describe("a polygon drawn against its box", () => {
    test("ends its edges at its box, not at its pieces", async () => {
        // fivepoverhang's bar: 1 wide against the left side, above the middle, in a node 4 by 2
        const edge = await joined({
            "node.shape": "polygon",
            "node.shapePoints": "-1,0+0.1 -1+1,0+0.1 -1+1,0+0.4 -1,0+0.4",
            "node.shapeStretchPoints": false,
            "node.width": 4,
            "node.height": 2,
        });
        const node = edge.srcNode;
        assert.approximately(node.drawnHalfExtents.x, 2 * per, 1e-6);
        assert.approximately(node.drawnHalfExtents.y, 1 * per, 1e-6);
        // the box's right side, not the bar's (which ends 1 left of the middle)
        assert.approximately(leaves(edge).x, 2 * per + node.borderReach, 1e-6);
        // and the line drawn starts there: the ray that meets an ordinary node's mesh does not stop at a piece
        assert.approximately(drawnStart(edge).x, 2 * per + node.borderReach, 1e-3);
        // its arrow head's tip meets the target's box, so the line stops short of it, not inside the box
        const target = edge.dstNode;
        const side = target.mesh.position.x - 2 * per - target.borderReach;
        assert.isAtMost(drawnEnds(edge)[1].x, side + 1e-3);
        // where the ray from centre to centre meets each node, which misses the pieces: the box, not nothing
        const { srcPoint, dstPoint } = edge.getInterceptPoints();
        assert(srcPoint && dstPoint, "the line meets both nodes");
        assert.approximately(srcPoint.x, 2 * per + node.borderReach, 1e-3);
        assert.approximately(dstPoint.x, side, 1e-3);
        // and where the line leaves the box placing the arrow from the centres, when the ray finds nothing
        const reach = (Edge as unknown as { boxReachOf(n: unknown, d: Vector3): number }).boxReachOf(
            node,
            new Vector3(1, 0, 0),
        );
        assert.approximately(reach, 2 * per, 1e-6);
    });

    test("whose corners are plain fractions ends its edges at its drawn outline, as before", async () => {
        const edge = await joined({
            "node.shape": "polygon",
            "node.shapePoints": "-0.5,-0.5 0.5,-0.5 0.5,0.5 -0.5,0.5",
            "node.shapeStretchPoints": false,
            "node.width": 4,
            "node.height": 2,
        });
        const node = edge.srcNode;
        assert.approximately(node.drawnHalfExtents.x, 1 * per, 1e-6);
        assert.approximately(leaves(edge).x, 1 * per + node.borderReach, 1e-6);
        assert.approximately(drawnStart(edge).x, 1 * per + node.borderReach, 1e-3);
    });
});
