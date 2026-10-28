/**
 * `line.nodeGap`: an edge stops that far short of its nodes' outlines, its arrowhead with it, straight or curved, as
 * Gephi draws its edges under `edge.radius` (gexf-specimen-arrows-p4: 10 px between a node and its edges); and
 * `line.sourceNodeGap` / `line.targetNodeGap` at one end only.
 */
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
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
 * Two flat round nodes 6 apart on the x axis and one edge between them with an arrowhead, laid out and placed.
 * @param edgeSet - more of the edge layer
 * @returns the edge
 */
async function oneEdge(edgeSet: StaticStyle): Promise<Edge> {
    const edge = await placed({ "edge.arrowHead": "normal", ...edgeSet });
    assert(edge.arrowCap, "the head is drawn");
    return edge;
}

/**
 * Two flat round nodes 6 apart on the x axis and one edge between them, laid out and placed.
 * @param edgeSet - the edge layer
 * @returns the edge
 */
async function placed(edgeSet: StaticStyle): Promise<Edge> {
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
    await graph.addNode(asData({ id: "B", position: { x: 6, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": "ellipse" });
    await styleEveryEdge(graph, edgeSet);
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const edge = edgeBetween(graph, "A", "B");
    assert(edge, "the edge is drawn");
    return edge;
}

/**
 * How far the edge's arrowhead sits from B's center.
 * @param edge - the edge
 * @returns the distance
 */
function headFromB(edge: Edge): number {
    const at = edge.arrowCap?.position;
    return at === undefined ? Number.NaN : Math.hypot(at.x - 6, at.y);
}

describe("an edge's gap off its nodes", () => {
    test("moves a straight edge's arrowhead that far further off its node", async () => {
        const touching = headFromB(await oneEdge({}));
        const gapped = headFromB(await oneEdge({ "edge.nodeGap": 0.5 }));
        assert.closeTo(gapped - touching, 0.5, 1e-3);
    });

    test("moves a curved edge's arrowhead that far further off its node along the arc", async () => {
        const arc = { "edge.curvature": true, "edge.fanned": false, "edge.arcRadius": 1 / 1.2 };
        const touching = headFromB(await oneEdge(arc));
        const gapped = headFromB(await oneEdge({ ...arc, "edge.nodeGap": 0.5 }));
        // the head's tip moves out from the outline to the circle 0.5 further out; its position is the cap's own
        assert.isAbove(gapped - touching, 0.4);
        assert.isBelow(gapped - touching, 0.6);
    });

    test("takes each end's own gap over the edge's (Cytoscape.js source- and target-distance-from-node)", async () => {
        const touching = headFromB(await oneEdge({}));
        const target = headFromB(await oneEdge({ "edge.nodeGap": 0.2, "edge.targetNodeGap": 0.5 }));
        const source = headFromB(await oneEdge({ "edge.sourceNodeGap": 0.5 }));
        assert.closeTo(target - touching, 0.5, 1e-3, "the target's own gap, not the edge's");
        assert.closeTo(source - touching, 0, 1e-3, "the source's gap leaves the target end where it was");
    });

    test("stops a line with no cap at that end its gap past the outline, which no node hides", async () => {
        const length = async (gap: number): Promise<number> =>
            (await placed({ "edge.arrowHead": "none", "edge.sourceNodeGap": gap })).drawnLine?.length ?? Number.NaN;
        const [near, far] = [await length(0.2), await length(0.5)];
        assert.closeTo(near - far, 0.3, 1e-3);
    });
});
