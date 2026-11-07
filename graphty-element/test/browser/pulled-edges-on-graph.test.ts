/**
 * @file With the internal switch on, a graph's plain straight edges are pulled from the row table
 * (`PulledLineBatch`) and draw the picture the placed lines draw: at rest, after a node is dragged (no
 * edge byte uploaded) and with an edge hidden. An edge with a cap stays an object edge. The bar is
 * section 7 of design/rendering/row-renderer.md.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { pulledEdgesDefault } from "../../src/meshes/PulledLineBatch";
import { drag } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

afterEach(() => {
    pulledEdgesDefault.value = false;
    document.body.replaceChildren();
});

const NODES = Array.from({ length: 9 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.4 - 1.4, y: Math.floor(id / 3) * 1.4 - 1.4, z: (id % 2) * 0.6 },
}));

/** A ring and two crossings; edge 0 carries a cap and stays an object edge. */
const EDGES = [
    ...NODES.map((node) => ({ src: node.id, dst: (node.id + 1) % NODES.length })),
    { src: 0, dst: 8 },
    { src: 2, dst: 6 },
];

/**
 * An edge's id.
 * @param element - The element.
 * @param source - Its source node.
 * @param target - Its target node.
 * @returns The id.
 */
function edgeId(element: Graphty, source: number, target: number): unknown {
    const edge = edgeBetween(element.graph, source, target);
    assert.isDefined(edge);
    return edge.id;
}

/**
 * Mount an element with the graph loaded, the switch as asked.
 * @param renderer - The renderer.
 * @param pulled - Whether qualifying edges are pulled.
 * @param view - The view.
 * @returns The element.
 */
async function loaded(renderer: "webgl" | "webgpu", pulled: boolean, view: "2d" | "3d" = "3d"): Promise<Graphty> {
    pulledEdgesDefault.value = pulled;
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    // The graph is directed, so every edge starts with a head: take them off, then put one back.
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "ids", edges: EDGES.map((edge) => edgeId(element, edge.src, edge.dst)) },
        set: { "edge.arrowHead": "none" },
    } as never);
    await element.session.styles.add({
        name: "capped",
        target: "edge",
        selector: { match: "ids", edges: [edgeId(element, 0, 1)] },
        set: { "edge.arrowHead": "normal" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Drag node 4 with the mouse and read the frame.
 * @param element - The element.
 * @returns The frame.
 */
async function moved(element: Graphty): Promise<Frame> {
    const node = element.graph.getNode(4);
    assert.isDefined(node);
    const from = element.worldToScreen(node.drawnWorldPosition);
    const { x } = node.drawnPosition;
    await drag(element, from, { x: from.x + 40, y: from.y + 30 });
    assert.notEqual(node.drawnPosition.x, x, "the drag moved the node");
    return readCanvas(element.graph);
}

/**
 * Bytes every pulled batch has sent.
 * @param element - The element.
 * @returns The sum.
 */
function pulledBytes(element: Graphty): number {
    let bytes = 0;
    for (const batch of element.graph.getMeshCache().pulledBatchMap.values()) {
        bytes += batch.uploadedBytes;
    }

    return bytes;
}

describe.each(RENDERERS)("pulled edges on a graph on %s", (renderer) => {
    it("draw the placed lines' picture at rest, after a move and with an edge hidden", async () => {
        const placed = await loaded(renderer, false);
        assert.equal(placed.graph.rowCounts.pulledEdges, 0);
        const placedRest = await readCanvas(placed.graph);
        const placedMoved = await moved(placed);
        await placed.session.styles.add({
            name: "hidden",
            target: "edge",
            selector: { match: "ids", edges: [edgeId(placed, 2, 6)] },
            set: { "edge.visible": false },
        } as never);
        await operationQueueOf(placed.graph).waitForCompletion();
        const placedHidden = await readCanvas(placed.graph);
        placed.remove();

        const pulled = await loaded(renderer, true);
        assert.deepInclude(pulled.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(placedRest, await readCanvas(pulled.graph)), 0, "at rest");

        const before = pulledBytes(pulled);
        assert.equal(overBar(placedMoved, await moved(pulled)), 0, "after a move");
        assert.equal(pulledBytes(pulled), before, "a move uploads no edge byte");

        await pulled.session.styles.add({
            name: "hidden",
            target: "edge",
            selector: { match: "ids", edges: [edgeId(pulled, 2, 6)] },
            set: { "edge.visible": false },
        } as never);
        await operationQueueOf(pulled.graph).waitForCompletion();
        assert.equal(overBar(placedHidden, await readCanvas(pulled.graph)), 0, "with an edge hidden");
        assert.notEqual(overBar(placedRest, placedHidden), 0, "hiding the edge changed the picture");
    });

    it("pull no edge in 2D, where lines are flat rectangles", async () => {
        const placed = await loaded(renderer, false, "2d");
        const placedRest = await readCanvas(placed.graph);
        placed.remove();

        const pulled = await loaded(renderer, true, "2d");
        assert.equal(pulled.graph.rowCounts.pulledEdges, 0);
        assert.equal(overBar(placedRest, await readCanvas(pulled.graph)), 0);
    });
});
