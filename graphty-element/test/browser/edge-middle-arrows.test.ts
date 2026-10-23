/**
 * A cap drawn part-way along an edge's line (`arrowMiddleHead`, `arrowMiddleTail`), besides the caps at
 * its ends: Cytoscape.js's `mid-target-arrow-*` and `mid-source-arrow-*`, vis-network's
 * `arrows.middle`. Each sits with its tip at the middle of the line (or `position` of the way back
 * from its own end) and points along the line toward its end, and the line runs on under it.
 */
import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, edgeBetween, styleEveryEdge } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Two nodes 4 apart on the x axis, one edge between them, styled by `set`, laid out and placed.
 * @param set - the edge layer
 * @returns the graph
 */
async function oneEdge(set: StaticStyle): Promise<Graph> {
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
    await styleEveryEdge(graph, set);
    await operationQueueOf(graph).waitForCompletion();
    // the paint applied and the edges placed, as a reader first sees them
    await graph.waitForStableFrame();
    return graph;
}

describe("a cap part-way along the line", () => {
    test("the mid head sits at the middle of the line, pointing toward the target, besides the end caps", async () => {
        const g = await oneEdge({ "edge.arrowHead": "normal", "edge.arrowMiddleHead": "normal" });
        const edge = edgeBetween(g, "A", "B");
        assert(edge?.arrowMiddleHeadCap, "the edge draws a mid head");
        assert.deepEqual(
            edge.drawnCaps.map((c) => c.end),
            ["arrowHead", "arrowMiddleHead"],
        );
        // the line runs between the two nodes' surfaces, which are as far from x = 2 as each other
        assert.closeTo(edge.arrowMiddleHeadCap.position.x, 2, 0.05);
        assert.closeTo(edge.arrowMiddleHeadCap.position.y, 0, 1e-6);
        // the end cap is still at the target's surface
        assert.isAbove(edge.arrowCap?.position.x ?? 0, 3);
    });

    test("the mid tail points toward the source and sits `position` of the way from the source end", async () => {
        const g = await oneEdge({
            "edge.arrowHead": "none",
            "edge.arrowMiddleTail": "normal",
            "edge.arrowMiddleTailPosition": 0.25,
        });
        const edge = edgeBetween(g, "A", "B");
        const cap = edge?.arrowMiddleTailCap;
        assert(cap, "the edge draws a mid tail");
        assert.isNull(edge.arrowCap);
        // a quarter of the way along the line from where it leaves A, so left of the middle
        assert.isBelow(cap.position.x, 2);
        assert.isAbove(cap.position.x, 0);
        // it points toward A: the back of its geometry (local -x) lies toward B, right of its tip
        const tip = cap.position.clone();
        const back = Vector3.TransformCoordinates(new Vector3(-1, 0, 0), cap.transform);
        assert.isAbove(back.x, tip.x);
    });

    test("a mid cap goes with its style", async () => {
        const g = await oneEdge({ "edge.arrowMiddleHead": "diamond" });
        const edge = edgeBetween(g, "A", "B");
        assert.include(edge?.drawnCaps.find((c) => c.end === "arrowMiddleHead")?.name ?? "", "diamond");
        assert.isNull(edge?.arrowMiddleTailCap ?? null);
    });
});
