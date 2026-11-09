/**
 * @file Under `renderPath: "batched"` a straight animated line (`line.animationSpeed`) is pulled from the row
 * table and its gradient scrolls in the fragment stage, so an animated edge costs no CPU a frame: one frame
 * callback runs for every animated pulled line, not one per look, and neither a frame of the animation nor a
 * move uploads an edge byte. Parked (`scene.animationsEnabled` off), it draws the picture the `"objects"`
 * path's greased line draws. Stage 22 of design/rendering/row-renderer.md; the bar is its section 7.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { animatedEdgeFrames } from "../../src/meshes/EdgeMesh";
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

/** One color an edge, so the `"objects"` path draws one greased line batch an edge. */
const COLORS = EDGES.map((_, i) => `#${(0x203040 + i * 0x101807).toString(16).slice(-6)}`);

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
 * Mount an element on a render path with every edge animated and the animation parked.
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
    element.graph.scene.animationsEnabled = false;
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    for (const [i, edge] of EDGES.entries()) {
        await element.session.styles.add({
            name: `animated-${i}`,
            target: "edge",
            selector: { match: "ids", edges: [edgeId(element, edge.src, edge.dst)] },
            set: {
                "edge.arrowHead": i === 0 ? "normal" : "none",
                "edge.animationSpeed": 1 + (i % 3),
                "edge.color": COLORS[i],
            },
        } as never);
    }

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

describe.each(RENDERERS)("animated lines on the batched path on %s", (renderer) => {
    it("pull every animated straight line, parked at the objects path's picture, at rest and after a drag", async () => {
        const objects = await loaded(renderer, "objects");
        assert.deepInclude(objects.graph.rowCounts, { pulledEdges: 0, objectEdges: EDGES.length });
        const objectsRest = await readCanvas(objects.graph);
        const objectsMoved = await moved(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest");
        const before = pulledBytes(batched);
        assert.equal(overBar(objectsMoved, await moved(batched)), 0, "after a drag");
        assert.equal(pulledBytes(batched), before, "a move uploads no edge byte");
    });

    it("run one frame callback for every animated pulled line and upload no edge byte as it scrolls", async () => {
        const objects = await loaded(renderer, "objects");
        const scene = objects.graph.getScene();
        // the one object edge is capped, so it is not animated as a pulled line: every other look is its own batch
        assert.equal(animatedEdgeFrames.callbacksOf(scene).size, EDGES.length);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const batchedScene = batched.graph.getScene();
        assert.equal(
            animatedEdgeFrames.callbacksOf(batchedScene).size,
            2,
            "the capped object edge's and the pulled lines'",
        );
        const before = pulledBytes(batched);
        batchedScene.animationsEnabled = true;
        await readCanvas(batched.graph);
        await readCanvas(batched.graph);
        assert.equal(pulledBytes(batched), before, "a frame of the animation uploads no edge byte");
    });
});
