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

import { Matrix, Mesh, type Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { isRowBatch } from "../../src/meshes/RowPullPlugin";
import { rowScanOf } from "../../src/render/PickService";
import { drag, nextFrame, wheel } from "../helpers/real-input";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas as readFrame } from "../helpers/whole-canvas";

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
 */
async function loaded(element: Graphty, view: "2d" | "3d"): Promise<void> {
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    await layer(
        element,
        NODES.filter((node) => node.big).map((node) => node.id),
        { "node.size": 1.6 },
    );
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
        // One draw per look, here two sizes.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 2);
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
        const small = await layer(element, [0, 4, 8], { "node.size": 0.7 });
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
            node.drawnPickMesh.scaling.set(1.5, 0.6, 1);
        }

        const objects = await readFrame(graph);
        await frameOn(graph, "batched");
        const scale = Matrix.Scaling(1.5, 0.6, 1);
        for (const batch of graph.getMeshCache().nodeBatchMap.values()) {
            for (let slot = 0; slot < batch.slots; slot++) {
                batch.mesh.thinInstanceSetMatrixAt(slot, scale, slot === batch.slots - 1);
            }
        }

        assert.equal(overBar(objects, await readFrame(graph)), 0);
    });

    it("keep the rest of a look on the batch when one of its rows is removed", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        await element.session.data.removeNodes([5, 11]);
        await operationQueueOf(graph).waitForCompletion();
        const batched = await readFrame(graph);

        assert.equal(graph.rowCounts.batchedNodes, NODES.length - 2);
        assert.equal(graph.rowCounts.objectNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it.each(["2d", "3d"] as const)("leave a screen-scaled map's rows as objects through a zoom in %s", async (view) => {
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
        await element.waitForStableFrame();
        const batched = await readFrame(graph);

        assert.notEqual(graph.getNode(0)?.drawnScale, scale, "the zoom scaled the nodes");
        assert.equal(graph.rowCounts.batchedNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);
    });

    it("leave the batch for depth independent size, and come back when it goes", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        element.layoutBehavior = { node: { depthIndependentSize: true } };
        await element.waitForStableFrame();
        const batched = await readFrame(graph);
        assert.equal(graph.rowCounts.batchedNodes, 0);
        assert.equal(overBar(batched, await frameOn(graph, "objects")), 0);

        graph.setRenderPath("batched");
        element.layoutBehavior = { node: { depthIndependentSize: false } };
        await element.waitForStableFrame();
        await readFrame(graph);
        assert.equal(graph.rowCounts.batchedNodes, NODES.length);
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

    it("stops drawing a batch when the graph leaves the path", async () => {
        const element = await mounted(renderer);
        await loaded(element, "3d");
        const { graph } = element;
        await frameOn(graph, "batched");
        await frameOn(graph, "objects");
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 0);
        assert.isNull(graph.getNodeBatches());
    });
});
