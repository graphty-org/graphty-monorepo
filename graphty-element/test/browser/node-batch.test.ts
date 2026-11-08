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

import { Matrix, Mesh, type Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { isRowBatch } from "../../src/meshes/RowPullPlugin";
import { rowScanOf } from "../../src/render/PickService";
import { RowTable } from "../../src/render/RowTable";
import { drag, hover, nextFrame, wheel } from "../helpers/real-input";
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
        // One draw per shape: the two sizes share a batch, each row scaled in its matrix.
        assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled()).length, 1);
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

            // A row's size changes live: the batch follows it in its matrix.
            await layer(element, [3], { "node.size": 2.2 });
            await element.waitForStableFrame();
            const resized = await readFrame(graph);
            assert.notEqual(overBar(batched, resized), 0, "the new size reached the picture");
            assert.equal(batches(graph.getScene()).filter((mesh) => mesh.isEnabled(false)).length, 2);
            assert.equal(overBar(resized, await frameOn(graph, "objects")), 0);
        },
    );

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
});
