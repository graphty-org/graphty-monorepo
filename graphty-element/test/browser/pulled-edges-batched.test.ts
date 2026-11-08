/**
 * @file Under `renderPath: "batched"` a graph's plain straight edges are pulled from the row table
 * (`PulledLineBatch`) with no internal switch, and draw the picture the `"objects"` path draws. The
 * default path pulls nothing, and switching the path live moves the edges between the two forms.
 * Stage 16 of design/rendering/row-renderer.md; the bar is its section 7.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drag } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

afterEach(() => {
    document.body.replaceChildren();
});

const NODES = Array.from({ length: 9 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.4 - 1.4, y: Math.floor(id / 3) * 1.4 - 1.4, z: (id % 2) * 0.6 },
}));

/** A ring and two crossings; edge 0 keeps its head and stays an object edge. */
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
 * Mount an element on a render path with the graph loaded.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @returns The element.
 */
async function loaded(renderer: "webgl" | "webgpu", path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
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
    await settled(element);
    return element;
}

/**
 * Wait for queued work and a stable frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
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

describe.each(RENDERERS)("pulled edges on the batched path on %s", (renderer) => {
    it("pull every plain edge and draw the objects path's picture, at rest and after a drag", async () => {
        const objects = await loaded(renderer, "objects");
        assert.deepInclude(objects.graph.rowCounts, { pulledEdges: 0, objectEdges: EDGES.length });
        const objectsRest = await readCanvas(objects.graph);
        const objectsMoved = await moved(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest");
        assert.equal(overBar(objectsMoved, await moved(batched)), 0, "after a drag");
    });

    it("move the edges between the two forms when the path changes live", async () => {
        const element = await loaded(renderer, "objects");
        const objectsRest = await readCanvas(element.graph);

        element.renderPath = "batched";
        await settled(element);
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(objectsRest, await readCanvas(element.graph)), 0, "on batched");

        element.renderPath = "objects";
        await settled(element);
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: 0, objectEdges: EDGES.length });
        assert.equal(overBar(objectsRest, await readCanvas(element.graph)), 0, "back on objects");
    });
});
