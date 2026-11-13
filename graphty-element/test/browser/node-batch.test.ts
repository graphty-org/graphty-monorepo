/**
 * @file The `"batched"` render path draws the picture `"objects"` draws.
 *
 * The rows keep their meshes as hidden proxies, so a graph can change path on the spot: each
 * check reads the frame on one path, changes path and reads it again. The bar is section 7 of
 * design/rendering/row-renderer.md: zero differing pixels, or at most one level per channel.
 *
 * WebGL always; WebGPU as well when `GRAPHTY_BROWSER_GPU` names a flag set (the `render-parity`
 * project does).
 */

import "../../src/graphty-element";

import { InstancedMesh, Matrix, Mesh, type Scene, TransformNode, Vector3 } from "@babylonjs/core";
import type { LayoutSimulation } from "@graphty/layout";
import { afterEach, assert, describe, it, vi } from "vitest";

import { registerSnapshotLayout } from "../../extend";
import type { Graphty } from "../../index.js";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { nodeFramingBox } from "../../src/managers/UpdateManager";
import { NodeBatches } from "../../src/meshes/NodeBatch";
import { PulledLineBatch } from "../../src/meshes/PulledLineBatch";
import { isRowBatch } from "../../src/meshes/RowPullPlugin";
import { rowScanOf } from "../../src/render/PickService";
import { RowTable } from "../../src/render/RowTable";
import { defineLayout } from "../../src/simple/defineLayout";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { click, drag, hover, nextFrame, wheel } from "../helpers/real-input";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas as readFrame } from "../helpers/whole-canvas";
import { nextModelEvent } from "./models/helpers";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * How many pixels are not the first pixel's color, so a blank frame cannot pass.
 * @param frame - The frame.
 * @returns The count.
 */
function drawn(frame: Frame): number {
    const [r, g, b] = frame.pixels;
    let count = 0;
    for (let i = 0; i < frame.pixels.length; i += 4) {
        if (frame.pixels[i] !== r || frame.pixels[i + 1] !== g || frame.pixels[i + 2] !== b) {
            count++;
        }
    }

    return count;
}

/**
 * Mount an element on a renderer.
 * @param renderer - The renderer.
 * @returns The element.
 */
async function mounted(renderer: "webgl" | "webgpu"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/** Twelve nodes in three colors and two sizes, some of them intersecting. */
const NODES = Array.from({ length: 12 }, (_, id) => ({
    id,
    position: { x: (id % 4) * 1.1 - 2, y: Math.floor(id / 4) * 1.1 - 1, z: (id % 3) * 0.4 },
    tone: ["red", "green", "blue"][id % 3],
    big: id % 2 === 0,
    latitude: 30 + id * 2,
    longitude: -120 + id * 4,
}));

const TONES = { red: "#e11d48", green: "#16a34a", blue: "#000000" };

/**
 * Paint some nodes.
 * @param element - The element.
 * @param ids - The nodes.
 * @param set - The channels.
 * @returns The layer's id.
 */
async function layer(element: Graphty, ids: number[], set: Record<string, unknown>): Promise<string> {
    const spec = { name: `layer ${JSON.stringify(set)}`, target: "node", selector: { match: "ids", nodes: ids }, set };
    const added = await element.session.styles.add(spec as never);
    await operationQueueOf(element.graph).waitForCompletion();
    return added.id;
}

/**
 * Load the nodes and paint them by their data, in a view.
 * @param element - The element.
 * @param view - The view.
 * @param sized - Whether half the nodes are drawn bigger.
 */
async function loaded(element: Graphty, view: "2d" | "3d", sized = true): Promise<void> {
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    if (sized) {
        await layer(
            element,
            NODES.filter((node) => node.big).map((node) => node.id),
            { "node.size": 1.6 },
        );
    }

    for (const [tone, color] of Object.entries(TONES)) {
        await layer(
            element,
            NODES.filter((node) => node.tone === tone).map((node) => node.id),
            { "node.color": color },
        );
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Change path and read the frame.
 * @param graph - The graph.
 * @param path - The path.
 * @returns The frame.
 */
async function frameOn(graph: Graph, path: "objects" | "batched"): Promise<Frame> {
    graph.setRenderPath(path);
    const frame = await readFrame(graph);
    assert.isAbove(drawn(frame), 500, "the frame holds a graph");
    return frame;
}

/**
 * The bytes a batch sends the GPU for each row: its per-instance vertex buffers.
 * @param mesh - The batch.
 * @returns The bytes.
 */
function bytesPerRow(mesh: Mesh): number {
    let bytes = 0;
    for (const kind of mesh.getVerticesDataKinds()) {
        const buffer = mesh.getVertexBuffer(kind);
        if (buffer?.getIsInstanced() === true) {
            bytes += buffer.getSize() * 4;
        }
    }

    return bytes;
}

/**
 * The batch meshes in a scene.
 * @param scene - The scene.
 * @returns They.
 */
function batches(scene: Scene): Mesh[] {
    return scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && isRowBatch(mesh));
}

describe.each(RENDERERS)("node batches on %s", (renderer) => {
    it.each(["3d", "2d"] as const)("draw the object rows' picture in %s", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        const { graph } = element;
        const objects = await frameOn(graph, "objects");
        assert.equal(graph.rowCounts.batchedNodes, 0);
        const batched = await frameOn(graph, "batched");

        assert.deepEqual(graph.rowCounts, {
            batchedNodes: NODES.length,
            objectNodes: 0,
            pulledEdges: 0,
            objectEdges: 0,
        });
        assert.equal(overBar(objects, batched), 0);
        // One draw per shape: the two sizes share a batch, each row scaled in its matrix.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 1);
    });

    it("send 20 bytes a row while no row of a batch is scaled, 84 once one is, with the object rows' picture", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d", false);
        const { graph } = element;
        const objects = await frameOn(graph, "objects");
        const batched = await frameOn(graph, "batched");
        assert.equal(overBar(objects, batched), 0);
        const [batch] = batches(graph.getScene()).filter((mesh) => mesh.isEnabled());
        assert.equal(bytesPerRow(batch), 20, "a row color and a row number, no matrix");

        const big = await layer(element, [0, 5], { "node.size": 1.6 });
        await element.waitForStableFrame();
        assert.equal(bytesPerRow(batch), 84, "a scaled row brings the matrices back");
        const scaled = await readFrame(graph);
        assert.notEqual(overBar(batched, scaled), 0);
        assert.equal(overBar(scaled, await frameOn(graph, "objects")), 0);

        await element.session.styles.remove(big);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.equal(overBar(objects, await frameOn(graph, "batched")), 0);
    });

    it("keep no mesh for a batched row, and give each row its mesh back on the object path", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const scene = graph.getScene();
        const nodeMeshes = (): number =>
            scene.meshes.filter((mesh) => (mesh.metadata as { graphNode?: unknown } | null)?.graphNode !== undefined)
                .length;
        await frameOn(graph, "objects");
        assert.equal(nodeMeshes(), NODES.length);

        await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(nodeMeshes(), 0, "a batched row keeps no mesh, so the scene holds the batches, not the nodes");
        for (const node of graph.getNodes()) {
            assert.isNull(node.drawnPickMesh);
        }

        const objects = await frameOn(graph, "objects");
        assert.equal(nodeMeshes(), NODES.length);
        assert.equal(overBar(objects, await frameOn(graph, "batched")), 0);
    });

    it("free a row and take it back without changing a pixel", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const before = await frameOn(graph, "batched");
        const small = await layer(element, [4], { "node.size": 0.7 });
        const moved = await readFrame(graph);
        assert.notEqual(overBar(before, moved), 0);
        assert.equal(graph.rowCounts.objectNodes, 0);

        const onObjects = await frameOn(graph, "objects");
        assert.equal(overBar(moved, onObjects), 0);

        graph.setRenderPath("batched");
        await element.session.styles.remove(small);
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(overBar(before, await readFrame(graph)), 0);
    });

    it("compact holes and keep the picture", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const before = await frameOn(graph, "batched");
        const [batch] = graph.getMeshCache().nodeBatchMap.values();
        assert.isDefined(batch);
        const { slots } = batch;

        // More than a quarter of the slots leave in one repaint, and come back out of row order.
        const small = await layer(element, [0, 4, 8, 9], { "node.shape": "box" });
        await readFrame(graph);
        assert.isBelow(batch.slots, slots);
        assert.equal(batch.holes, 0);

        await element.session.styles.remove(small);
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(overBar(before, await readFrame(graph)), 0);
        assert.equal(batch.slots, slots);
    });

    it("keep colors apart across looks, through a repaint of one row", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const before = await frameOn(graph, "batched");
        await layer(element, [6], { "node.color": "#f59e0b" });
        const batched = await readFrame(graph);
        assert.notEqual(overBar(before, batched), 0, "the repaint reached the picture");
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it.each(["3d", "2d"] as const)(
        "draw a size ramp in %s with one batch per shape, as the object rows draw it",
        async (view) => {
            const element = await mounted(renderer);
            await loaded(element, view);
            for (const node of NODES) {
                await layer(element, [node.id], { "node.size": 0.4 + node.id * 0.13 });
            }

            await layer(
                element,
                NODES.filter((node) => node.id >= 6).map((node) => node.id),
                { "node.shape": "box" },
            );
            await element.waitForStableFrame();
            const { graph } = element;
            const objects = await frameOn(graph, "objects");
            const batched = await frameOn(graph, "batched");
            assert.equal(graph.rowCounts.batchedNodes, NODES.length);
            const drawing = batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false));
            assert.equal(drawing.length, 2, "twelve sizes in two shapes draw as one batch per shape");
            assert.equal(overBar(objects, batched), 0);

            // A row's size changes live. Its new source is made after the boxes', so the objects path
            // draws it after them, and one batch with the other spheres would win their depth ties
            // the other way: it draws from a batch of its own.
            await layer(element, [3], { "node.size": 2.2 });
            await element.waitForStableFrame();
            const resized = await readFrame(graph);
            assert.notEqual(overBar(batched, resized), 0, "the new size reached the picture");
            assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false)).length, 3);
            assert.equal(overBar(resized, await frameOn(graph, "objects")), 0);
        },
    );

    it.each(["3d", "2d"] as const)("draw translucent rows in %s as the object rows draw them", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 0).map((node) => node.id),
            { "node.opacity": 0.4 },
        );
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 1).map((node) => node.id),
            { "node.opacity": 0.7 },
        );
        await element.waitForStableFrame();
        const { graph } = element;
        const objects = await frameOn(graph, "objects");
        const batched = await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(graph.rowCounts.objectNodes, 0);
        // An opacity is in the source's material, so each opacity is a look of its own, and a translucent
        // look keeps one batch per size, as Babylon orders translucent sources back to front: 1 + 2 + 2.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false)).length, 5);
        assert.equal(overBar(objects, batched), 0);
    });

    it.each(["3d", "2d"] as const)("draw rows in z order in %s as the object rows draw them", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        // Overlapping rows on both kinds of level: behind the edges' plane, and flattened in front of it.
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 0).map((node) => node.id),
            { "node.zIndex": -2 },
        );
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 1).map((node) => node.id),
            { "node.drawOrder": 40 },
        );
        await layer(element, [2, 5], { "node.drawOrder": 90 });
        await element.waitForStableFrame();
        const { graph } = element;
        const objects = await frameOn(graph, "objects");
        const batched = await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(objects, batched), 0);
    });

    it.each(["3d", "2d"] as const)("draw rows with a picture in %s as the object rows draw them", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        // Four colored pixels, one clear: a 2D row cuts it out, a 3D row keeps it white.
        const canvas = new OffscreenCanvas(2, 2);
        canvas
            .getContext("2d")
            ?.putImageData(
                new ImageData(
                    Uint8ClampedArray.from([255, 200, 0, 255, 0, 120, 255, 255, 40, 40, 40, 255, 0, 0, 0, 0]),
                    2,
                    2,
                ),
                0,
                0,
            );
        const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
        const picture = await element.session.assets.add({ files: new Map([["four.png", png]]) });
        const drawn = nextModelEvent(element, (change) => change.ref === picture.id && change.state === "drawn");
        // On the batch while the picture loads, so its rows move from the plain shape's batch to their own.
        element.graph.setRenderPath("batched");
        // Both sizes and every color: a picture replaces the color, so the colored rows draw white under it.
        await layer(
            element,
            NODES.filter((node) => node.id % 3 !== 2).map((node) => node.id),
            { "node.texture": picture.id },
        );
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const { graph } = element;
        const batched = await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(graph.rowCounts.objectNodes, 0);
        // One draw for the plain rows and one for the pictured ones, across both sizes.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false)).length, 2);
        assert.equal(overBar(await frameOn(graph, "objects"), batched), 0);
        // And the same built afresh.
        assert.equal(overBar(await frameOn(graph, "objects"), await frameOn(graph, "batched")), 0);
        // One draw for the plain rows and one for the pictured ones, across both sizes.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false)).length, 2);
    });

    it.each(["3d", "2d"] as const)("draw rows with a gradient in %s as the object rows draw them", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        // Both sizes and every color: a gradient starts at the row's color, so each color is a ramp of its own.
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 0).map((node) => node.id),
            { "node.gradientColor": "#00ff00", "node.gradientDirection": 90 },
        );
        await layer(
            element,
            NODES.filter((node) => node.id % 3 === 1).map((node) => node.id),
            { "node.gradientColors": "#ff00ff #ffff00 #0000ff", "node.gradientKind": "radial" },
        );
        await element.waitForStableFrame();
        const { graph } = element;
        const objects = await frameOn(graph, "objects");
        const batched = await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(objects, batched), 0);
    });

    it("measure a batched row's radius again after a repaint changes its size", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const node = graph.getNode(1);
        assert.isDefined(node);
        assert.isAbove(node?.drawnRadius ?? 0, 0, "the radius is measured once before the repaint");
        await layer(element, [1], { "node.size": 3 });
        await element.waitForStableFrame();
        assert.isNull(node?.drawnPickMesh ?? null, "the row is still batched");
        const batched = node?.drawnRadius ?? 0;
        const box = node?.drawnBoundingBox.extendSize.x ?? 0;
        assert.closeTo(batched, box, 1e-3, "the radius follows the drawn size");
        graph.setRenderPath("objects");
        await element.waitForStableFrame();
        assert.closeTo(node?.drawnRadius ?? 0, batched, 1e-3, "both paths answer the same radius");
    });

    it("send a look to the object path when one of its rows gains a border, and back", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const ring = await layer(element, [0], { "node.borderColor": "#000000", "node.borderWidth": 0.1 });
        const mixed = await readFrame(graph);
        assert.isAbove(graph.rowCounts.objectNodes, 0);
        assert.isAbove(graph.rowCounts.batchedNodes, 0);
        assert.equal(overBar(mixed, await frameOn(graph, "objects")), 0);

        graph.setRenderPath("batched");
        await element.session.styles.remove(ring);
        await operationQueueOf(graph).waitForCompletion();
        await readFrame(graph);
        assert.equal(graph.rowCounts.objectNodes, 0);
    });

    it("send a row's look to the object path when a consumer reads its mesh, for good", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.objectNodes, 0);

        const node = graph.getNode(0);
        assert.isDefined(node);
        assert.isFalse(node.mesh.isDisposed(), "the consumer gets the node's own mesh");
        const mixed = await readFrame(graph);
        assert.isAbove(graph.rowCounts.objectNodes, 0);
        assert.isAbove(graph.rowCounts.batchedNodes, 0, "other looks stay on the batch");
        assert.equal(overBar(mixed, await frameOn(graph, "objects")), 0);

        // The mesh stays the consumer's through a repaint and a trip back to the path.
        await layer(element, [0], { "node.color": "#f59e0b" });
        await frameOn(graph, "batched");
        assert.isAbove(graph.rowCounts.objectNodes, 0);
    });

    it("read a batched row from its table, keep edges on eased rows and walk no batched row at rest", async () => {
        const element = await mounted(renderer);
        await element.session.data.addNodes([
            { id: "a", position: { x: -4, y: -1, z: 2 } },
            { id: "b", position: { x: 4, y: -1, z: -2 } },
        ]);
        await element.session.data.addEdges([{ source: "a", target: "b" }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const { graph } = element;
        graph.setRenderPath("batched");
        await readFrame(graph);
        const node = graph.getNode("a");
        assert.isDefined(node);
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.isTrue(node.drawnInBatch, "a batched row answers from its table");

        // A frame at rest asks the table for no batched row: the edge walk is told by the table.
        const centerOf = vi.spyOn(RowTable.prototype, "centerOf");
        cleanups.push(() => centerOf.mockRestore());
        await readFrame(graph);
        await readFrame(graph);
        assert.equal(centerOf.mock.calls.length, 0, "no batched row compared on a frame at rest");
        centerOf.mockRestore();

        // Held halfway through a glide, the rows sit off the lane and the edge still ends on them.
        const edge = [...graph.getLayoutManager().edges][0];
        assert.isDefined(edge);
        const before = node.drawnPosition.clone();
        const restCentre = edge.drawnCentre.clone();
        await element.session.config.set({ layoutTransition: { transition: "glide", seconds: 0.4, hold: 0.5 } });
        await graph.setLayout("circular");
        await element.waitForStableFrame();
        assert.isTrue(node.drawnInBatch, "the eased row is still batched");
        assert.isAbove(Vector3.Distance(before, node.drawnPosition), 0.5, "the row moved");
        const centre = edge.drawnCentre.clone();
        assert.isAbove(Vector3.Distance(restCentre, centre), 0.5, "the edge followed");
        graph.setRenderPath("objects");
        await readFrame(graph);
        assert.isAtMost(Vector3.Distance(edge.drawnCentre, centre), 1e-4, "where the object path draws it");
    });

    it("hide and show a batched row with no halo, context point or tooltip without walking it again", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        graph.setRenderPath("batched");
        await readFrame(graph);
        const node = graph.getNode(0);
        assert.isDefined(node);
        assert.isFalse(node.walksEachFrame, "a plain batched row walks only when something changes it");

        // A time window shows and hides tens of thousands of such rows in one frame (issue #6025).
        const rewalk = vi.spyOn(NodeBatches.prototype, "rewalk");
        cleanups.push(() => rewalk.mockRestore());
        assert.isTrue(node.setRenderState("hidden"));
        assert.isTrue(node.setRenderState("visible"));
        assert.equal(rewalk.mock.calls.length, 0, "nothing the batch walks by changed");
        rewalk.mockRestore();

        assert.isFalse(node.walksEachFrame);
        assert.equal(overBar(await frameOn(graph, "batched"), await frameOn(graph, "objects")), 0);
    });

    it("move a dragged row through the table alone", async () => {
        const element = await mounted(renderer);
        await loaded(element, "2d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const node = graph.getNode(3);
        assert.isDefined(node);
        const from = element.worldToScreen(node.drawnWorldPosition);
        const { x } = node.drawnPosition;
        await drag(element, from, { x: from.x + 40, y: from.y + 30 });
        assert.notEqual(node.drawnPosition.x, x);
        const batched = await readFrame(graph);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("answer a held row's exact place, which the table keeps only to 32 bits", async () => {
        const element = await mounted(renderer);
        await loaded(element, "2d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const node = graph.getNode(3);
        assert.isDefined(node);
        assert.isTrue(node.drawnInBatch);
        // A transition puts a node part of the way between two layouts: a point no float32 holds.
        node.setMeshPosition(0.1, 0.2, 0);
        assert.notEqual(Math.fround(0.1), 0.1);
        assert.equal(node.drawnPosition.x, 0.1);
        assert.equal(node.drawnPosition.y, 0.2);
    });

    it("draw a row part of the way through a particle shrink", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const before = await frameOn(graph, "batched");
        const node = graph.getNode(0);
        assert.isDefined(node);
        node.drawShrunk(0.5, 1);
        graph.setRenderPath("objects");
        const objects = await readFrame(graph);
        assert.notEqual(overBar(before, objects), 0, "the shrink reached the picture");
        assert.equal(overBar(objects, await frameOn(graph, "batched")), 0);
    });

    it("leave the batch for flat lighting set live, with the same picture", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        element.lighting = "flat";
        await operationQueueOf(graph).waitForCompletion();
        const batched = await readFrame(graph);
        assert.equal(graph.rowCounts.batchedNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("follow a scale in the matrix as an object row does", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        for (const node of graph.getNodes()) {
            node.drawnAnchor.scaling.set(1.5, 0.6, 1);
        }

        const objects = await readFrame(graph);
        await frameOn(graph, "batched");
        const scale = Matrix.Scaling(1.5, 0.6, 1);
        for (const batch of graph.getMeshCache().nodeBatchMap.values()) {
            // On top of each row's size, which the batch keeps in the same matrix.
            const sized = batch.mesh.thinInstanceGetWorldMatrices();
            for (let slot = 0; slot < batch.slots; slot++) {
                const matrix = sized[slot] ?? Matrix.Identity();
                batch.mesh.thinInstanceSetMatrixAt(slot, scale.multiply(matrix), slot === batch.slots - 1);
            }
        }

        assert.equal(overBar(objects, await readFrame(graph)), 0);
    });

    it("keep the rest of a look on the batch when one of its rows is removed", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const removed = graph.getNode(5);
        assert.isDefined(removed);
        await element.session.data.removeNodes([5, 11]);
        await operationQueueOf(graph).waitForCompletion();
        const meshes = graph.getScene().meshes.length;
        assert.isTrue(removed.mesh.isDisposed(), "a removed row's mesh reads as disposed");
        assert.equal(graph.getScene().meshes.length, meshes, "reading it put no mesh in the scene");
        const batched = await readFrame(graph);

        assert.equal(graph.rowCounts.batchedNodes, NODES.length - 2);
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it.each(["2d", "3d"] as const)("batch a screen-scaled map's rows through a zoom in %s", async (view) => {
        const element = await mounted(renderer);
        await loaded(element, view);
        const { graph } = element;
        await graph.setLayout("location-map", {
            nodeScale: "screen",
            mapDimension: view,
            map: { source: "natural-earth-gray" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        await frameOn(graph, "batched");
        const scale = graph.getNode(0)?.drawnScale;
        await wheel(element, { x: 200, y: 150 }, -300);
        // A reader's zoom does not make the frame unstable, and the rows are rescaled by the render
        // loop's next update pass, not by the wheel event: wait for that pass, not for a stable frame.
        await vi.waitFor(() => {
            assert.notEqual(graph.getNode(0)?.drawnScale, scale, "the zoom scaled the nodes");
        });
        await element.waitForStableFrame();
        const batched = await readFrame(graph);

        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("draw rows sized by depth in the batch, arrowheads with them, through an orbit", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        // Arrowheads are drawn at their node's scale (`Edge.capScale`), so they show whether a batched row's scale is read.
        await element.session.data.addEdges(NODES.slice(1).map((node) => ({ source: node.id - 1, target: node.id })));
        await element.session.styles.add({
            name: "arrowheads",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal" },
        } as never);
        await operationQueueOf(graph).waitForCompletion();
        element.layoutBehavior = { node: { depthIndependentSize: true } };
        await element.waitForStableFrame();
        await frameOn(graph, "batched");
        const scale = graph.getNode(0)?.drawnScale;
        // From an empty corner, so the drag turns the camera rather than moving a node.
        await drag(element, { x: 10, y: 10 }, { x: 90, y: 60 });
        await element.waitForStableFrame();
        const batched = await readFrame(graph);

        assert.notEqual(graph.getNode(0)?.drawnScale, scale, "the orbit scaled the nodes");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        // Still one draw for the shape: each row's view scale is in its matrix.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 1);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("add no attribute to an element on the default path", async () => {
        const element = await mounted(renderer);
        assert.isFalse(element.hasAttribute("render-path"));
    });

    it("keep a live batch's material through a prune", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const cache = graph.getMeshCache();
        const [[source, batch]] = [...cache.nodeBatchMap];
        const { material } = source;
        // What stage 11 leaves: a live batch whose source has no instances.
        const instances = source.instances.splice(0);
        cache.prune();
        source.instances.push(...instances);

        assert.isFalse(source.isDisposed());
        assert.isDefined(material?.getScene().materials.includes(material) ? material : undefined);
        assert.isFalse(batch.mesh.isDisposed());
    });

    // The node ID target is a render target, which Babylon draws upside down on WebGPU as on WebGL
    // (#6073): read the wrong way up, a hover over a row in the top or bottom of the picture named
    // the row mirrored across the middle, or nothing.
    it("hover reads the row under the pointer from the node ID target", async () => {
        const element = await mounted(renderer);
        await loaded(element, "2d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const target = graph.getNodeIdTarget();
        const scan = rowScanOf(graph.scene);
        if (target === null || scan === undefined) {
            assert.fail("the batched path keeps a target and a scan");
        }

        // The materials compile on their own; until then a read answers null.
        while (target.read(0, 0) === null) {
            await nextFrame();
        }

        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        for (const node of graph.getNodes()) {
            const screen = graph.worldToScreen(node.drawnWorldPosition);
            const point = { x: (Math.floor(screen.x) + 0.5) * scaling, y: (Math.floor(screen.y) + 0.5) * scaling };
            const row: number | undefined = scan.shapeRayHit(point.x, point.y)?.row;
            assert.isDefined(row, `the scan finds a row at node ${String(node.id)}`);
            assert.strictEqual(await target.read(point.x, point.y), row, `the target names node ${String(node.id)}`);
        }
    });

    // Stage 31: a labelled row hangs its label from a geometry-free anchor, so it stays on the batch.
    it("keep labelled and tooltip rows on the batch, their labels where the object path puts them", async () => {
        const element = await mounted(renderer);
        await loaded(element, "2d");
        const { graph } = element;
        const bare = await frameOn(graph, "objects");
        const ids = NODES.map((node) => node.id);
        await layer(element, ids, { "node.label": "N", "node.tooltip": "TIP" });
        await element.waitForStableFrame();
        const objects = await frameOn(graph, "objects");
        assert.isAbove(overBar(bare, objects), 100, "the labels are in the picture");
        const batched = await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length, "a labelled row stays batched");
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(objects, batched), 0);
        for (const node of graph.getNodes()) {
            assert.isDefined(node.label, `node ${String(node.id)} keeps its label`);
        }

        // The rows move under a force layout, whose published steps walk only the roster: each
        // label follows its row as on the object path.
        await graph.setLayout("circular", { scale: 0.3 });
        await element.waitForStableFrame();
        // With no framing, which reads every row, only the frame's walk moves a labelled row's anchor.
        const canvas = graph.getScene().getEngine().getRenderingCanvas() as HTMLCanvasElement;
        element.autoFrame = false;
        await graph.setLayout("ngraph", { seed: 7 });
        await element.waitForStableFrame();
        const moved = await readFrame(graph);
        assert.equal(graph.rowCounts.objectNodes, 0, "a moved labelled row stays batched");
        assert.equal(overBar(moved, await frameOn(graph, "objects")), 0);

        // A real hover draws the tooltip and keeps the row on the batch.
        await frameOn(graph, "batched");
        const node = graph.getNode(0);
        assert.isDefined(node);
        const screen = graph.worldToScreen(node.drawnWorldPosition);
        await hover(canvas, screen);
        await vi.waitFor(() => {
            assert.isDefined(node.tooltip, "the hovered row draws its tooltip");
        });
        assert.equal(graph.rowCounts.objectNodes, 0, "a hovered tooltip row stays batched");
    });

    it("keep no disposed mesh reachable from a node after handing it over, either way", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "objects");
        // Fill the memos keyed on the node's mesh, as an edge's endpoint reads do.
        const measured = graph.getNodes().map((node) => [node.drawnHalfExtents.x, node.roundRadius]);
        assert.lengthOf(measured, NODES.length);

        /**
         * The node fields that hold a disposed scene node.
         * @returns Their names.
         */
        const stale = (): string[] =>
            graph.getNodes().flatMap((node) =>
                Object.entries(node)
                    .filter(([, value]) => value instanceof TransformNode && value.isDisposed())
                    .map(([name]) => name),
            );
        await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        assert.deepEqual(stale(), [], "a batched node keeps no mesh it disposed");

        await frameOn(graph, "objects");
        assert.deepEqual(stale(), [], "an object node keeps no anchor it disposed");
    });

    it("hand a group over to its batch and back in work linear in its size", async () => {
        const element = await mounted(renderer);
        const count = 400;
        await element.session.data.addNodes(
            Array.from({ length: count }, (_, id) => ({ id, position: { x: id % 20, y: Math.floor(id / 20), z: 0 } })),
        );
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        const { graph } = element;
        await frameOn(graph, "objects");
        const scene = graph.getScene();
        const root = scene.getTransformNodeByName("graph-root");
        assert.isNotNull(root);
        const children = (root as unknown as { _children: unknown[] })._children;

        // Every removal from these lists scans them: count the entries scanned.
        let scanned = 0;
        for (const list of [scene.meshes, children] as unknown[][]) {
            const { indexOf, some } = list;
            Object.assign(list, {
                indexOf(this: unknown[], ...args: Parameters<typeof indexOf>) {
                    scanned += this.length;
                    return indexOf.apply(this, args);
                },
                some(this: unknown[], ...args: Parameters<typeof some>) {
                    scanned += this.length;
                    return some.apply(this, args);
                },
            });
            cleanups.push(() => {
                Object.assign(list, { indexOf, some });
            });
        }

        scanned = 0;
        await frameOn(graph, "batched");
        assert.equal(graph.rowCounts.batchedNodes, count);
        // One at a time, each removal scanned the whole graph: about count * count / 2.
        assert.isBelow(scanned, 10 * count, "handing over scans a constant amount per node");

        scanned = 0;
        await frameOn(graph, "objects");
        assert.isBelow(scanned, 10 * count, "taking back scans a constant amount per node");
    });

    it("stops drawing a batch when the graph leaves the path", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        await frameOn(graph, "objects");
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 0);
        assert.isNull(graph.getNodeBatches());
    });

    it("load a batched graph with no Node, no anchor and no object row's instance for any row", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        const scene = graph.getScene();
        // During the load, not only after it: each row used to be an object row first, with its
        // own instance, then a batched row with a TransformNode anchor (9 KB per node at peak).
        let anchors = 0;
        let instances = 0;
        const onNode = scene.onNewTransformNodeAddedObservable.add(() => anchors++);
        const onMesh = scene.onNewMeshAddedObservable.add((mesh) => {
            if (mesh instanceof InstancedMesh) {
                instances++;
            }
        });
        try {
            await loaded(element, "3d");
        } finally {
            onNode.remove();
            onMesh.remove();
        }

        assert.equal(instances, 0);
        assert.equal(anchors, 0);
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0);
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        // one style per look (two sizes), not per row: three colors on two sizes is six rows apart
        const batches = graph.getNodeBatches();
        const styles = new Set(NODES.map((node) => batches?.lookOf(node.id)?.paint.style));
        assert.isFalse(styles.has(undefined), "every row is drawn with no Node");
        assert.equal(styles.size, 2);
    });

    it("keep no Map entry per row for a batched graph with no Node, through a repaint and a removal", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await loaded(element, "3d");
        const batches = graph.getNodeBatches();
        assert.isNotNull(batches);
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
        // A row's group and slot are read from its row, not from a Map entry each (89 B a row at 1M).
        assert.equal(batches?.rowMapEntries, 0);

        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(paint);
        if (batches === null || paint === null) {
            return;
        }

        batches.unpaintRow(4);
        assert.equal(batches.batchedNodes, NODES.length - 1);
        assert.isTrue(batches.paintRow(4, paint));
        assert.equal(batches.batchedNodes, NODES.length);
        assert.equal(batches.rowMapEntries, 0);
    });

    it("draw a row with no Node from its paint, the picture its Node drew, and build no Node", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        const before = await frameOn(graph, "batched");
        const manager = graph.getDataManager();
        const built = dataManagerInternals.nodesBuilt(manager);
        const batches = graph.getNodeBatches();
        const node = manager.nodes.get(4);
        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(batches);
        assert.isDefined(node);
        assert.isNotNull(paint);
        if (batches === null || node === undefined || paint === null) {
            return;
        }

        // The row's Node stops drawing it: off its batch, and its mesh given up again.
        batches.leave(node);
        node.drawInBatch(node.paintedSourceMesh);
        const without = await readFrame(graph);
        assert.notEqual(overBar(before, without), 0, "row 4 is gone from the picture");
        assert.equal(batches.batchedNodes, NODES.length - 1);

        assert.isTrue(batches.paintRow(4, paint));
        assert.equal(overBar(before, await readFrame(graph)), 0);
        assert.equal(batches.batchedNodes, NODES.length);
        assert.equal(dataManagerInternals.nodesBuilt(manager), built, "no Node was built for it");

        batches.unpaintRow(4);
        assert.equal(overBar(without, await readFrame(graph)), 0);
        assert.equal(batches.batchedNodes, NODES.length - 1);

        // A paint only a Node can draw is not held: the caller builds the row's Node.
        const bordered = { ...paint, style: { ...paint.style, border: { width: 0.2, color: "#000000" } } };
        assert.isFalse(batches.paintRow(4, bordered));
        assert.equal(batches.batchedNodes, NODES.length - 1);
    });

    it("frame and filter a row with no Node by its row", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph, session } = element;
        await frameOn(graph, "batched");
        const manager = graph.getDataManager();
        const batches = graph.getNodeBatches();
        const table = graph.getRowTable();
        const root = graph.getScene().getTransformNodeByName("graph-root");
        const node = manager.nodes.get(4);
        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(batches);
        assert.isNotNull(table);
        assert.isDefined(node);
        assert.isNotNull(paint);
        if (batches === null || table === null || node === undefined || paint === null) {
            return;
        }

        // What a Node draws when the filter hides its row, and the box the Nodes frame.
        const greenless = { kind: "categories", attribute: "data.tone", values: ["red", "blue"] } as const;
        await session.visibility.set(greenless);
        const filtered = await readFrame(graph);
        await session.visibility.set(null);
        const shown = await readFrame(graph);
        const all = nodeFramingBox(manager.nodes.values());
        assert.isDefined(all);

        // Row 4 is drawn with no Node, and its Node no longer answers the mask, as a row without one could not.
        batches.leave(node);
        node.drawInBatch(node.paintedSourceMesh);
        assert.isTrue(batches.paintRow(4, paint));
        vi.spyOn(node, "setRenderState").mockReturnValue(false);
        const others = [...manager.nodes.values()].filter((other) => other !== node);
        const columns = { rows: batches.columnRowIndices(), table, root };

        const byRow = nodeFramingBox(others, "drawn", columns);
        assert.isDefined(byRow);
        if (all === undefined || byRow === undefined) {
            return;
        }

        assert.equal(byRow.spots.length, all.spots.length, "the row is framed");
        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(byRow.min[axis], all.min[axis], 1e-4);
            assert.closeTo(byRow.max[axis], all.max[axis], 1e-4);
        }

        const spot = (box: typeof all): (typeof all.spots)[number] | undefined =>
            box.spots.find((s) => Vector3.Distance(s.pos, node.drawnWorldPosition) < 1e-3);
        assert.closeTo(spot(byRow)?.half ?? 0, spot(all)?.half ?? -1, 1e-4);

        await session.visibility.set(greenless);
        assert.equal(overBar(filtered, await readFrame(graph)), 0, "the filter hides the row");
        assert.equal(
            nodeFramingBox(others, "drawn", columns)?.spots.length,
            all.spots.length - 4,
            "and fit leaves it out",
        );
        await session.visibility.set(null);
        assert.equal(overBar(shown, await readFrame(graph)), 0, "and shows it again");
    });

    it("lay out rows with no Node by their rows", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        await graph.setLayout("circular", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        const engine = graph.getLayoutManager().layoutEngine;
        assert.isDefined(engine);
        if (engine === undefined) {
            return;
        }

        const positions = layoutEngineInternals.positions(engine);
        const at = { x: 0, y: 0, z: 0 };
        const placed = NODES.map((_, row) => {
            positions.read(row, at);
            return { ...at };
        });
        const nodes = [...graph.getDataManager().nodes.values()];

        // Row 4 first, then every row: the engine is handed no Node for them, as an unbuilt row hands none.
        for (const gone of [[nodes[4]], nodes]) {
            for (const node of gone) {
                layoutEngineInternals.removeNode(engine, node);
            }

            NODES.forEach((_, row) => {
                positions.write(row, 999, 999, 999);
            });
            engine.publishPositions();
            NODES.forEach((_, row) => {
                positions.read(row, at);
                for (const axis of ["x", "y", "z"] as const) {
                    assert.closeTo(at[axis], placed[row][axis], 1e-4, `row ${row} of ${gone.length} without a Node`);
                }
            });
        }
    });

    it("find a location map's locations in rows with no Node", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "loaded with no Node");
        const errors: string[] = [];
        graph.on("error", (event) => {
            errors.push(event.error.message);
        });

        await graph.setLayout("location-map", { mapDimension: "2d" });
        await operationQueueOf(graph).waitForCompletion();
        assert.deepEqual(errors, [], "the layout found the latitude and longitude columns");
        assert.equal(graph.getLayoutManager().layoutEngine?.type, "location-map");
    });

    it("read a location map's designated column in rows with no Node, over the one found by name", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES.map((node) => ({ ...node, home: "38.72, -9.14" })));
        await element.session.config.set({
            data: { knownFields: { nodeLocationPath: "home", nodeLocationRole: "coords" } },
        });
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "loaded with no Node");

        await graph.setLayout("location-map", { mapDimension: "2d" });
        await operationQueueOf(graph).waitForCompletion();
        assert.deepInclude(element.mapFrame?.location, { kind: "location", column: "home" });
    });

    it("hand a snapshot layout the sizes of rows with no Node, and lay it out in 2D building no Node", async () => {
        const seen: { sizes: number[]; extents: number[] } = { sizes: [], extents: [] };
        registerSnapshotLayout({
            descriptor: {
                id: "test-node-batch-sizes",
                plainName: "sizes",
                technicalName: "sizes",
                description: "Reads the node sizes it is handed.",
                family: "geometric",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                engine: "test-node-batch-sizes",
                options: [],
            },
            compute: (input) => {
                seen.sizes = Array.from(input.nodeSizes?.() ?? []);
                seen.extents = Array.from(input.nodeExtents?.() ?? []);
                return Float32Array.from({ length: 2 * input.graph.nodeCount }, (_, k) => k);
            },
        });
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.setViewMode("2d");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        await nextFrame();
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "loaded with no Node");

        await graph.setLayout("test-node-batch-sizes");
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(graph.getLayoutManager().dimension, 2);
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "laid out in 2D with no Node");
        assert.lengthOf(seen.sizes, NODES.length);
        for (const size of [...seen.sizes, ...seen.extents]) {
            assert.isTrue(Number.isFinite(size) && size > 0, `every row is handed its drawn size, got ${size}`);
        }
    });

    it("move the arrow-capped edges of rows with no Node when a layout moves the rows", async () => {
        defineLayout({
            id: "test-row-moved",
            dimensions: 2,
            place(view) {
                const out = new Map<string | number, [number, number]>();
                for (const node of view.nodes()) {
                    const k = Number(node.id);
                    out.set(node.id, [(k % 3) * 1.5 - 1.5, Math.floor(k / 3) * 1.2 - 2]);
                }

                return out;
            },
        });
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.setViewMode("2d");
        await element.session.data.addNodes(NODES);
        // An arrowhead keeps the line off the pulled batch, so it is placed by the edge pass.
        await element.session.data.addEdges(NODES.slice(1).map((node) => ({ source: node.id - 1, target: node.id })));
        await element.session.styles.add({
            name: "arrowheads",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal" },
        } as never);
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();

        await graph.setLayout("test-row-moved");
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "laid out with no Node");
        const batched = await readFrame(graph);

        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("place every row with no Node by a defineLayout layout", async () => {
        defineLayout({
            id: "test-row-by-id",
            dimensions: 2,
            place(view) {
                const out = new Map<string | number, [number, number]>();
                for (const node of view.nodes()) {
                    out.set(node.id, [Number(node.id) * 2, 1]);
                }

                return out;
            },
        });
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getDataManager();
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "loaded with no Node");

        await graph.setLayout("test-row-by-id");
        await operationQueueOf(graph).waitForCompletion();
        const engine = graph.getLayoutManager().layoutEngine;
        assert.exists(engine);
        if (!engine) {
            return;
        }

        const positions = layoutEngineInternals.positions(engine);
        const at = { x: 0, y: 0, z: 0 };
        NODES.forEach((node, row) => {
            assert.isTrue(positions.isPlaced(row), `row ${row} is placed`);
            positions.read(row, at);
            assert.equal(at.x, node.id * 2, `row ${row} is where place() put it`);
        });
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "laid out with no Node");
    });

    it("pull communities together by clusterBy with no Node", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getDataManager();
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "loaded with no Node");

        await graph.setLayout("forceatlas2", { dim: 2, seed: 12, clusterBy: "tone" });
        await operationQueueOf(graph).waitForCompletion();
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine);
        if (!(engine instanceof SimulationLayoutEngine)) {
            return;
        }

        // The rebuilt simulation is a new one of the same class, so its class's method is watched.
        let pulled: Uint32Array | undefined;
        const proto = Object.getPrototypeOf(engine.simulation) as LayoutSimulation;
        const { setClusters } = proto;
        assert.exists(setClusters, "the simulation takes communities");
        proto.setClusters = function (this: LayoutSimulation, clusters) {
            pulled = clusters?.communities;
            setClusters?.call(this, clusters);
        };
        try {
            engine.replaceSimulation();
        } finally {
            proto.setClusters = setClusters;
        }

        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "clustered with no Node");
        assert.exists(pulled, "the communities reached the simulation");
        NODES.forEach((node, row) => {
            assert.equal(pulled?.[row], node.id % 3, `row ${row} is in its tone's community`);
        });
    });

    it("spend a layout's pre-steps at its start when no row has a Node", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, "loaded with no Node");

        // Read as the arrangement starts, before any frame can pay what it left owed.
        const manager = graph.getLayoutManager();
        const start = Reflect.get(manager, "startArrangement") as (...args: unknown[]) => Promise<void>;
        let owed: unknown;
        Reflect.set(manager, "startArrangement", async (...args: unknown[]) => {
            await start.apply(manager, args);
            owed = Reflect.get(manager, "preStepsOwed");
        });
        try {
            graph.setLayoutBehavior({ layout: { preSteps: 5 } });
            await graph.setLayout("forceatlas2", { dim: 2, seed: 12 });
            await operationQueueOf(graph).waitForCompletion();
        } finally {
            Reflect.deleteProperty(manager, "startArrangement");
        }

        assert.strictEqual(owed, false, "the pre-steps were spent, not owed to a later frame");
    });

    it("make an ngraph layout's bodies in row order when only some rows have a Node", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await element.session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        // A Node built for a middle row, as a label or a pick builds one.
        assert.isDefined(graph.getNode(5));
        assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 1, "one row has a Node");

        await graph.setLayout("ngraph", { dim: 2, seed: 7 });
        await operationQueueOf(graph).waitForCompletion();
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, NGraphEngine);
        const order: unknown[] = [];
        engine.ngraph.forEachNode((n) => {
            order.push(n.id);
        });
        assert.deepEqual(
            order,
            NODES.map((n) => n.id),
            "the bodies were made in row order, as on the object path",
        );
    });

    // A simulation handed the frame loop the store's every node, so the first frame after a layout started built a
    // Node for every row and painted each: at 100k rows, seconds before the first layout frame (#6389).
    it("start and switch a simulation layout building no Node and repainting nothing", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        graph.acceleration.setAccelerator(createFakeAccelerator());
        await element.session.data.addNodes(NODES);
        await element.session.data.addEdges(NODES.slice(1).map((node) => ({ source: node.id - 1, target: node.id })));
        await operationQueueOf(graph).waitForCompletion();
        await nextFrame();
        const manager = graph.getDataManager();
        const table = graph.getRowTable();
        assert.isNotNull(table);
        if (table === null) {
            return;
        }

        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "loaded with no Node");
        const snapshot = manager.getSnapshot();
        const paints = vi.spyOn(NodeBatches.prototype, "paintRow");
        cleanups.push(() => {
            paints.mockRestore();
        });

        for (const layout of ["spring-electrical", "ngraph", "spring-electrical"]) {
            const before = table.centerOf(3).clone();
            await graph.setLayout(layout, { dim: 2, seed: 5 });
            await operationQueueOf(graph).waitForCompletion();
            // The layout draws: its rows move with no Node, frame by frame.
            while (table.centerOf(3).equals(before)) {
                await nextFrame();
            }

            const engine = graph.getLayoutManager().layoutEngine;
            assert.isTrue(
                layout === "ngraph" ? engine instanceof NGraphEngine : engine instanceof SimulationLayoutEngine,
                `${layout}: the engine it names`,
            );
            assert.equal(dataManagerInternals.nodesBuilt(manager), 0, `${layout}: no row has a Node`);
            assert.equal(paints.mock.calls.length, 0, `${layout}: no row was repainted`);
            assert.strictEqual(manager.getSnapshot(), snapshot, `${layout}: the snapshot was reused`);
        }
    });

    // Removing a row with no Node used to forget it everywhere but the simulation: its d3 or
    // ngraph body stayed in and kept pushing every other node.
    it("take a removed row with no Node out of a d3 or ngraph simulation", async () => {
        for (const layout of ["d3", "ngraph"] as const) {
            const element = await mounted(renderer);
            const { graph } = element;
            graph.setRenderPath("batched");
            await element.session.data.addNodes(NODES);
            await graph.setLayout(layout, { dim: 2, seed: 7 });
            await operationQueueOf(graph).waitForCompletion();
            assert.equal(dataManagerInternals.nodesBuilt(graph.getDataManager()), 0, `${layout}: no row has a Node`);

            await element.session.data.removeNodes([4, 5]);
            await operationQueueOf(graph).waitForCompletion();
            assert.equal(
                dataManagerInternals.nodesBuilt(graph.getDataManager()),
                0,
                `${layout}: removing built no Node`,
            );
            const engine = graph.getLayoutManager().layoutEngine;
            const ids: unknown[] = [];
            if (engine instanceof D3GraphEngine) {
                engine.refresh();
                for (const body of engine.d3ForceLayout.nodes() as unknown as { id: unknown }[]) {
                    ids.push(body.id);
                }
            } else if (engine instanceof NGraphEngine) {
                engine.ngraph.forEachNode((n) => {
                    ids.push(n.id);
                });
            } else {
                assert.fail(`${layout} is running`);
            }

            assert.deepEqual(
                ids.sort((a, b) => Number(a) - Number(b)),
                NODES.map((n) => n.id).filter((id) => id !== 4 && id !== 5),
                `${layout}: the removed rows' bodies left the simulation`,
            );
            element.remove();
        }
    });

    // A pointer reaches a row with no Node by its row and builds the Node there; the event must
    // carry the very Node the graph answers for that id, or a consumer holds two of one node.
    it("hand a hover on a row with no Node the Node graph.getNode answers", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await loaded(element, "3d");
        const manager = graph.getDataManager();
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "no row has a Node");
        const target = graph.getNodeIdTarget();
        const engine = graph.getLayoutManager().layoutEngine;
        const root = graph.getScene().getTransformNodeByName("graph-root");
        if (target === null || engine === undefined || root === null) {
            assert.fail("the batched path keeps a target, a layout and a root");
        }

        while (target.read(0, 0) === null) {
            await nextFrame();
        }

        const row = 6;
        const at = { x: 0, y: 0, z: 0 };
        layoutEngineInternals.positions(engine).read(row, at);
        const world = Vector3.TransformCoordinates(new Vector3(at.x, at.y, at.z), root.getWorldMatrix());
        const screen = graph.worldToScreen(world);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        assert.strictEqual(
            await target.read((Math.floor(screen.x) + 0.5) * scaling, (Math.floor(screen.y) + 0.5) * scaling),
            row,
            "the point is over the row",
        );
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "finding the point built no Node");

        const hovered: unknown[] = [];
        graph.eventManager.addListener("node-hover", (event) => {
            if (event.type === "node-hover") {
                hovered.push(event.node);
            }
        });
        await hover(element, { x: 2, y: 2 });
        await hover(element, { x: Math.floor(screen.x) + 0.5, y: Math.floor(screen.y) + 0.5 });
        await vi.waitFor(() => {
            assert.lengthOf(hovered, 1, "the hover reached the row");
        });
        assert.strictEqual(hovered[0], graph.getNode(NODES[row].id), "evt.node === graph.getNode(id)");
    });

    it("keep a filtered row hidden when its Node is built later", async () => {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await loaded(element, "3d");
        const manager = graph.getDataManager();
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "no Node built at load");
        const { sets, visibility } = element.session;
        const kept = sets.create({ kind: "fixed", nodes: [0, 1, 2], reading: "induced" }, { name: "Kept" });
        await visibility.set({ kind: "member", of: { set: kept } });
        const filtered = await frameOn(graph, "batched");
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "filtered with no Node");

        const hidden = graph.getNode(5);
        const shown = graph.getNode(1);
        assert.isFalse(hidden?.drawnAnchor.isEnabled(), "the filtered row's new Node is hidden");
        assert.isTrue(shown?.drawnAnchor.isEnabled(), "the kept row's new Node is shown");
        assert.equal(overBar(filtered, await readFrame(graph)), 0, "the same picture with the Nodes built");
    });

    it("publish a simulation's rows with no Node by their rows", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        await graph.setLayout("spring", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine);
        if (!(engine instanceof SimulationLayoutEngine)) {
            return;
        }

        const positions = layoutEngineInternals.positions(engine);
        const at = { x: 0, y: 0, z: 0 };
        const manager = graph.getDataManager();
        // The graph hands out no Node for any row, as a graph of unbuilt rows hands none.
        Object.defineProperty(manager, "nodes", { configurable: true, get: () => new Map() });
        try {
            NODES.forEach((_, row) => {
                positions.write(row, 999, 999, 999);
            });
            engine.publishPositions();
        } finally {
            Reflect.deleteProperty(manager, "nodes");
        }

        NODES.forEach((_, row) => {
            positions.read(row, at);
            assert.notEqual(at.x, 999, `row ${row} is published with no Node`);
        });
    });

    it("move a row with no Node through a layout transition by its row", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph, session } = element;
        await frameOn(graph, "batched");
        const manager = graph.getDataManager();
        const built = dataManagerInternals.nodesBuilt(manager);
        const batches = graph.getNodeBatches();
        const table = graph.getRowTable();
        const node = manager.nodes.get(4);
        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(batches);
        assert.isNotNull(table);
        assert.isDefined(node);
        assert.isNotNull(paint);
        if (batches === null || table === null || node === undefined || paint === null) {
            return;
        }

        // Row 4 is drawn with no Node, and no walk of the layout's nodes reaches it, as none reaches an unbuilt row.
        batches.leave(node);
        node.drawInBatch(node.paintedSourceMesh);
        assert.isTrue(batches.paintRow(4, paint));
        const layouts = graph.getLayoutManager();
        const walked = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(layouts), "nodes")?.get;
        Object.defineProperty(layouts, "nodes", {
            configurable: true,
            get: () => [...(walked?.call(layouts) as Iterable<typeof node>)].filter((other) => other !== node),
        });
        cleanups.push(() => Reflect.deleteProperty(layouts, "nodes"));

        const from = table.centerOf(4);
        await session.config.set({ layoutTransition: { transition: "glide", seconds: 0.4, hold: 0.5 } });
        await graph.setLayout("circular", { dim: 3 });
        await element.waitForStableFrame();
        const engine = layouts.layoutEngine;
        assert.isDefined(engine);
        if (engine === undefined) {
            return;
        }

        const lane = { x: 0, y: 0, z: 0 };
        layoutEngineInternals.positions(engine).read(4, lane);
        const to = new Vector3(lane.x, lane.y, lane.z);
        assert.isAbove(Vector3.Distance(from, to), 0.5, "the new layout moves row 4");
        const held = table.centerOf(4);
        assert.isAbove(Vector3.Distance(held, from), 0.1, "row 4 left where it was");
        assert.isAbove(Vector3.Distance(held, to), 0.1, "and is drawn on its way, held halfway");

        await session.config.set({ layoutTransition: { transition: "glide", seconds: 0.4 } });
        await element.waitForStableFrame();
        assert.isAtMost(Vector3.Distance(table.centerOf(4), to), 1e-4, "row 4 lands where the layout puts it");
        assert.isFalse(table.isHeld(4), "and is drawn from the lane again");
        assert.equal(dataManagerInternals.nodesBuilt(manager), built, "no Node was built for it");
    });

    it.each([
        ["d3", D3GraphEngine],
        ["ngraph", NGraphEngine],
    ] as const)("simulate a row with no Node in %s by its row", async (layout, Engine) => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const manager = graph.getDataManager();
        const built = dataManagerInternals.nodesBuilt(manager);
        const batches = graph.getNodeBatches();
        const node = manager.nodes.get(4);
        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(batches);
        assert.isDefined(node);
        assert.isNotNull(paint);
        if (batches === null || node === undefined || paint === null) {
            return;
        }

        // Row 4 is drawn with no Node: the layout swap hands the engine its row, never its Node.
        batches.leave(node);
        node.drawInBatch(node.paintedSourceMesh);
        assert.isTrue(batches.paintRow(4, paint));
        await graph.setLayout(layout, { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();

        const engine = graph.getLayoutManager().layoutEngine;
        assert.isTrue(engine instanceof Engine, `the engine is ${layout}'s`);
        if (!(engine instanceof Engine)) {
            return;
        }

        assert.notInclude([...engine.nodes], node, "a third party reading the engine's nodes sees only Nodes");
        const positions = layoutEngineInternals.positions(engine);
        positions.write(4, 999, 999, 999);
        engine.step();
        const at = { x: 0, y: 0, z: 0 };
        positions.read(4, at);
        for (const axis of ["x", "y", "z"] as const) {
            assert.isTrue(Number.isFinite(at[axis]) && at[axis] !== 999, `row 4's ${axis} is the simulation's`);
        }

        assert.equal(dataManagerInternals.nodesBuilt(manager), built, "no Node was built for it");
    });

    it("pull a line to a row with no Node from its row, reading no Node for that end", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        const manager = graph.getDataManager();
        const batches = graph.getNodeBatches();
        const table = graph.getRowTable();
        const node = manager.nodes.get(4);
        const paint = graph.getStylePainter().nodePaint(4);
        assert.isNotNull(batches);
        assert.isNotNull(table);
        assert.isDefined(node);
        assert.isNotNull(paint);
        if (batches === null || table === null || node === undefined || paint === null) {
            return;
        }

        // Row 4 is drawn with no Node, and from here on any read of its Node is recorded.
        batches.leave(node);
        node.drawInBatch(node.paintedSourceMesh);
        assert.isTrue(batches.paintRow(4, paint));
        const reads: unknown[] = [];
        const get = vi.spyOn(manager.nodeCache, "get").mockImplementation(function (this: Map<unknown, unknown>, id) {
            reads.push(id);
            return Map.prototype.get.call(this, id) as typeof node;
        });
        cleanups.push(() => get.mockRestore());
        const rows = vi.spyOn(PulledLineBatch.prototype, "setRows");
        cleanups.push(() => rows.mockRestore());

        // The edge gets its `Edge`, whose pull this reads: a batched load would store it with none.
        dataManagerInternals.storeEdgesUnbuilt(manager, false);
        // The graph is directed, so the edge would start with a head, and a capped line is never pulled.
        await element.session.styles.add({
            name: "uncapped",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        } as never);
        manager.addEdge({ src: 4, dst: 9 });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        const [edge] = [...manager.edges.values()].filter((e) => e.srcId === 4);
        assert.isTrue(edge.isPulled, "the line is pulled, as a line between two Nodes is");
        assert.deepInclude(
            rows.mock.calls.map(([, source, target]) => [source, target]),
            [4, manager.nodes.get(9)?.index],
            "and drawn from row 4 to row 9",
        );

        // A new layout moves row 4, and the line follows it, still reading no Node for it.
        const from = table.centerOf(4);
        await graph.setLayout("circular", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isAbove(Vector3.Distance(table.centerOf(4), from), 0.5, "row 4 moved");
        const centre = edge.drawnLine?.centre ?? Vector3.Zero();
        assert.isAtMost(Vector3.Distance(centre, Vector3.Center(table.centerOf(4), table.centerOf(9))), 1e-4);
        assert.notInclude(reads, 4, "no read of row 4's Node");
    });
    it("load a graph under batched building no Node, drawing the picture its Nodes drew", async () => {
        const objects = await mounted(renderer);
        await loaded(objects, "3d");
        const before = await frameOn(objects.graph, "batched");
        objects.remove();

        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        await loaded(element, "3d");
        const manager = graph.getDataManager();
        assert.equal(overBar(before, await readFrame(graph)), 0, "the same picture");
        assert.equal(dataManagerInternals.nodesBuilt(manager), 0, "no Node built at load");
        assert.equal(graph.getNodeBatches()?.columnRowCount, NODES.length);
        assert.equal(manager.nodes.size, NODES.length);
        assert.isTrue(manager.nodes.has(4));

        // Asking for a row's Node builds that one, and the same one each time.
        const node = graph.getNode(4);
        assert.isDefined(node);
        assert.strictEqual(manager.nodes.get(4), node);
        assert.equal(dataManagerInternals.nodesBuilt(manager), 1);
        assert.equal(overBar(before, await readFrame(graph)), 0, "drawn by its Node now, the same picture");

        // Leaving the path builds every Node, and draws the same picture.
        await frameOn(graph, "objects");
        assert.equal(dataManagerInternals.nodesBuilt(manager), NODES.length);
        assert.equal(overBar(before, await readFrame(graph)), 0);
    });
});

describe.each(RENDERERS)("the scene objects of a batched graph on %s (cosmos-gap G6)", (renderer) => {
    /**
     * Load rows on the batched path in a view, hover, select and drag one, and count the scene's transform nodes.
     * @param view - The view, entered before the load.
     * @param count - How many rows.
     * @returns `scene.transformNodes.length` once the drag has settled.
     */
    async function transformNodesAfterUse(view: "2d" | "3d", count: number): Promise<number> {
        const element = await mounted(renderer);
        const { graph } = element;
        graph.setRenderPath("batched");
        // Before the load: a view switch over stored rows still builds every row's Node.
        await element.setViewMode(view);
        const rows = Array.from({ length: count }, (_, id) => ({
            id,
            position: { x: (id % 100) * 1.2, y: Math.floor(id / 100) * 1.2, z: 0 },
        }));
        await element.session.data.addNodes(rows);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();

        const node = graph.getNode(0);
        assert.isDefined(node);
        const at = element.worldToScreen(node.drawnWorldPosition);
        await hover(element, at);
        await click(element, at);
        const { x } = node.drawnPosition;
        await drag(element, at, { x: at.x + 30, y: at.y + 20 });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.notEqual(node.drawnPosition.x, x, "the drag reached the row");
        assert.equal(graph.rowCounts.batchedNodes, count, "every row is still drawn batched");
        return graph.getScene().transformNodes.length;
    }

    it.each(["3d", "2d"] as const)(
        "grow by a constant from 1,000 to 10,000 rows in %s after a hover, a select and a drag",
        async (view) => {
            const small = await transformNodesAfterUse(view, 1_000);
            const large = await transformNodesAfterUse(view, 10_000);
            // One per row was 100,002 at 100k rows before rows were stored with no Node.
            assert.isAtMost(large - small, 20);
        },
    );
});
