/**
 * @file Under `renderPath: "batched"` a lone curve (`line.bezier` with `line.fanned: false`, or a fanned
 * curve alone between its two nodes) is pulled from the row table (`PulledLineBatch` with curve texels,
 * `meshes/pulledCurve.ts`) and draws the picture the `"objects"` path draws, at rest and after a drag.
 * A fanned curve that gains a parallel edge goes back to an object edge, and is pulled again once the
 * parallel edge is removed.
 * Stage 21 of design/rendering/row-renderer.md; the bar is its section 7.
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

/** A ring and two crossings; edge 0 fans, alone between its nodes until a parallel edge joins it. */
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
    // The graph is directed, so every edge starts with a head: take them off and curve every edge.
    await element.session.styles.add({
        name: "lone curves",
        target: "edge",
        selector: { match: "ids", edges: EDGES.map((edge) => edgeId(element, edge.src, edge.dst)) },
        set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanned": false },
    } as never);
    await element.session.styles.add({
        name: "fanned",
        target: "edge",
        selector: { match: "ids", edges: [edgeId(element, 0, 1)] },
        set: { "edge.fanned": true },
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

describe.each(RENDERERS)("pulled curves on the batched path on %s", (renderer) => {
    it("pull every lone curve and draw the objects path's picture, at rest and after a drag", async () => {
        const objects = await loaded(renderer, "objects");
        assert.deepInclude(objects.graph.rowCounts, { pulledEdges: 0, objectEdges: EDGES.length });
        const objectsRest = await readCanvas(objects.graph);
        const objectsMoved = await moved(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        const curveBatches = batched.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
        assert.lengthOf(curveBatches, 1, "the lone curves are drawn from one curve batch");
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest");
        assert.equal(overBar(objectsMoved, await moved(batched)), 0, "after a drag");
    });

    it("draw a fanned curve as an object edge while a parallel edge joins it, and pull it again after", async () => {
        const parallel = { src: 1, dst: 0 };
        /**
         * Add the parallel edge, fan it, and read the frame; then remove it and read again.
         * @param element - The element.
         * @returns Both frames and the edge counts with the parallel edge.
         */
        async function bundled(element: Graphty): Promise<{ joined: Frame; left: Frame; counts: object }> {
            await element.session.data.addEdges([parallel]);
            const id = edgeId(element, parallel.src, parallel.dst);
            await element.session.styles.add({
                name: "parallel",
                target: "edge",
                selector: { match: "ids", edges: [id] },
                set: { "edge.arrowHead": "none", "edge.curvature": true },
            } as never);
            await settled(element);
            const counts = { ...element.graph.rowCounts };
            const joined = await readCanvas(element.graph);
            await element.session.data.removeEdges([id as never]);
            await settled(element);
            return { joined, left: await readCanvas(element.graph), counts };
        }

        const objects = await loaded(renderer, "objects");
        const before = await bundled(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await bundled(batched);
        assert.deepInclude(
            after.counts,
            { pulledEdges: EDGES.length - 1, objectEdges: 2 },
            "the bundle is drawn as objects",
        );
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 }, "pulled again");
        assert.equal(overBar(before.joined, after.joined), 0, "with the parallel edge");
        assert.equal(overBar(before.left, after.left), 0, "after it is removed");
    });
});
