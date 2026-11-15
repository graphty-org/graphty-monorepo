/**
 * An edge ends on a flat shape's own outline, not its box (issue #5793): a line toward a star's dent stops in the
 * dent, where Graphviz's line reaches the star, and not out at the corner of the star's box in empty space.
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { surfaceReach } from "../../src/meshes/edgeRoute";
import { flatShapeOutline, inUnitBox } from "../../src/meshes/shapeOutlines";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/** How far past each outline the line stops, so its ends are on the outline and not at the hidden centers. */
const GAP = 0.01;

/**
 * Two nodes of a shape on a diagonal, (0, 0) and (6, 6), and one edge between them with no caps, placed.
 * @param shape - the nodes' shape
 * @returns the drawn line's length, and B's half extents
 */
async function lineBetween(shape: string): Promise<{ length: number; half: { x: number; y: number; z: number } }> {
    graph?.dispose();
    container?.remove();
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 6, y: 6, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": shape });
    await styleEveryEdge(graph, { "edge.arrowHead": "none", "edge.nodeGap": GAP });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const length = edgeBetween(graph, "A", "B")?.drawnLine?.length;
    const node = graph.getDataManager().getNode("B");
    assert(length !== undefined && node !== undefined, "the line and its node are drawn");
    return { length, half: { ...node.drawnHalfExtents } };
}

describe("an edge's end on a dented shape", () => {
    test("stops at a star's outline on the diagonal, not at its box's corner", async () => {
        const box = await lineBetween("rectangle");
        const star = await lineBetween("star");
        const diagonal = { x: Math.SQRT1_2, y: Math.SQRT1_2, z: 0 };
        const outline = inUnitBox(flatShapeOutline("star", 2, 2));
        assert(outline !== null);
        // a star is not the same both ways: A's end leaves toward B, B's toward A
        const back = { x: -Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 };
        const ends = surfaceReach(diagonal, star.half, null, outline) + surfaceReach(back, star.half, null, outline);
        assert.closeTo(star.length, 6 * Math.SQRT2 - ends - 2 * GAP, 1e-3, "each end on the star's outline");
        assert.isAbove(star.length - box.length, 0.1, "longer than a line stopped at the box's corners");
    });
});
