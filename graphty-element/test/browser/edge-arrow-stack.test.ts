/**
 * An end cap's `stack`: more caps drawn in a row behind it, each from where the one before it ends, the line stopping
 * at the last, as Graphviz draws `boxdotnormal` and `lteeoldiamond` (arrows.c arrow_gen).
 */
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { Projector, readEdge } from "../fidelity/drawn-scene";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/** The line an edge draws, read where the tests of its outline read it. */
interface EdgeLines {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
}

/**
 * Two round nodes 8 apart on the x axis and one edge from A to B, laid out and placed.
 * @param edgeSet - the edge layer
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
    await graph.addNode(asData({ id: "B", position: { x: 8, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": "ellipse" });
    await styleEveryEdge(graph, edgeSet);
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const edge = edgeBetween(graph, "A", "B");
    assert(edge?.arrowCap, "the head is drawn");
    return edge;
}

/**
 * Where the edge's line ends at its target.
 * @param edge - the edge
 * @returns the x of its end
 */
function lineEnd(edge: Edge): number {
    const { lineBatch, lineSlots } = edge as unknown as EdgeLines;
    assert(lineBatch, "the edge draws its line from a batch");
    return lineBatch.endsOf(lineSlots[0])[1].x;
}

describe("an end cap's stack", () => {
    test("draws each cap in a row behind the head, and the line stops at the last", async () => {
        const plain = await oneEdge({ "edge.arrowHead": "box" });
        const tip = plain.arrowCap?.position.x ?? Number.NaN;
        const plainEnd = lineEnd(plain);
        graph?.dispose();
        container?.remove();

        const edge = await oneEdge({ "edge.arrowHead": "box", "edge.arrowHeadStack": "box box*2" });
        const length = EdgeMesh.calculateArrowLength();
        const stack = edge.arrowHeadStackCaps;
        assert.strictEqual(stack.length, 2);
        assert.closeTo(edge.arrowCap?.position.x ?? Number.NaN, tip, 1e-3);
        // a box sits by its tip: each one starts a box's length behind the one before it, the second twice as long
        assert.closeTo(stack[0].position.x, tip - length, 1e-3);
        assert.closeTo(stack[1].position.x, tip - 2 * length, 1e-3);
        assert.closeTo(lineEnd(edge), plainEnd - 3 * length, 1e-3);
        // every cap is read where the edge's drawn caps are listed, head first
        assert.deepEqual(
            edge.drawnCaps.map((c) => c.end),
            ["arrowHead", "arrowHead", "arrowHead"],
        );
    });

    test("keeps each part's own side, and draws nothing for a word it cannot read", async () => {
        const edge = await oneEdge({
            "edge.arrowHead": "tee",
            "edge.arrowTail": "normal",
            "edge.arrowHeadStack": "open-diamond:left nothing",
            "edge.arrowTailStack": "dot",
        });
        assert.strictEqual(edge.arrowHeadStackCaps.length, 1);
        assert.strictEqual(edge.arrowTailStackCaps.length, 1);
        assert.match(edge.arrowHeadStackCaps[0].name, /open-diamond/);
        // the tail's dot sits behind the tail, toward the target
        const tail = edge.arrowTailCap?.position.x ?? Number.NaN;
        assert.isAbove(edge.arrowTailStackCaps[0].position.x, tail);
    });

    test("is read by the fidelity scene reader one cap a part, each where it is drawn", async () => {
        const edge = await oneEdge({ "edge.arrowHead": "box", "edge.arrowHeadStack": "dot normal" });
        assert(graph);
        const read = readEdge(edge, new Projector(graph.getScene()));
        const heads = read.caps.filter((c) => c.end === "arrowHead");
        assert.strictEqual(heads.length, 3);
        // each part's outline is its own: the three sit one behind another along the line, not on the head
        const middles = heads.map((c) => {
            const xs = (c.outline ?? []).map(([x]) => x);
            return (Math.min(...xs) + Math.max(...xs)) / 2;
        });
        assert.isAbove(middles[0], middles[1]);
        assert.isAbove(middles[1], middles[2]);
    });
});
