/**
 * An edge between two boxes is trimmed at their faces by arithmetic, with no ray cast against their meshes, however
 * often it is placed (issue #412): a ray walks a node's triangles, once per end, on every frame its ends move.
 */
import { Ray } from "@babylonjs/core/Culling/ray.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    vi.restoreAllMocks();
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

describe("an edge between two boxes", () => {
    it("ends on each box's face, and casts no ray to find it", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("fixed", { dim: 3 });
        await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
        await graph.addNode(asData({ id: "B", position: { x: 4, y: 1, z: 0 } }));
        await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
        await styleEveryNode(graph, { "node.shape": "box" });
        await styleEveryEdge(graph, { "edge.arrowHead": "none" });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const edge = edgeBetween(graph, "A", "B");
        assert(edge, "the edge is drawn");
        assert.isFalse(graph.getNode("A")?.drawnInBatch, "each box is drawn by its own mesh");
        const cast = vi.spyOn(Ray.prototype, "intersectsMeshes");
        const { srcPoint, dstPoint } = edge.getInterceptPoints();
        assert.strictEqual(cast.mock.calls.length, 0, "no ray is cast");
        assert(srcPoint && dstPoint, "both ends are found");

        // the line from A's center toward B leaves A through its +x face, and meets B through its -x face
        const halfA = graph.getNode("A")?.drawnHalfExtents.x ?? Number.NaN;
        const halfB = graph.getNode("B")?.drawnHalfExtents.x ?? Number.NaN;
        assert.closeTo(srcPoint.x, halfA, 1e-6);
        assert.closeTo(srcPoint.y, halfA / 4, 1e-6);
        assert.closeTo(dstPoint.x, 4 - halfB, 1e-6);
        assert.closeTo(dstPoint.y, 1 - halfB / 4, 1e-6);
    });
});
