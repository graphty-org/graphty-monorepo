/**
 * @file A node whose mesh a consumer read under `"batched"` draws in its look's place.
 *
 * Reading `node.mesh` under `"batched"` moved the node onto a source mesh of its own, built after its
 * look's border. The opaque sort orders by material creation, so that source drew its fill over its
 * border (thin rims) and over every overlapping node's border, where the objects path draws the fill
 * first; and a node read alone drew over the rest of its look, which the objects path draws in node
 * order. A look a batch draws drew a read node after the whole batch, over the rest of its look, and a
 * node read between a style change and the frame that draws it built its new look first, over the other
 * looks. Runs in "browser" and "forced-batched"; each check picks its paths itself.
 */

import "../../src/graphty-element";

import { type AbstractMesh, InstancedMesh, Mesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Twelve overlapping circles: even ones big with a black ring, odd ones small with a blue ring (or no rings, odd ones square). */
const NODES = Array.from({ length: 12 }, (_, id) => ({
    id,
    position: { x: (id % 4) * 1.1 - 2, y: Math.floor(id / 4) * 1.1 - 1, z: 0 },
    color: ["#e11d48", "#16a34a", "#f59e0b"][id % 3],
}));

/** The looks {@link ringedLooks} paints: ringed, two shapes, or one plain shape a batch draws. */
type Looks = "ringed" | "two shapes" | "one shape" | "translucent" | "translucent shapes" | "translucent solids";

/** The shapes of the even and the odd looks, for the looks of plain shapes. */
const SHAPES: Partial<Record<Looks, [string, string]>> = {
    "two shapes": ["ellipse", "rectangle"],
    "translucent shapes": ["ellipse", "rectangle"],
    // in 3D: neither's bounds are centered on its node the same way
    "translucent solids": ["tetrahedron", "sphere"],
};

/**
 * Mount an element and load the circles, in 2D (or 3D for the solids).
 * @param looks - Which looks: rings no batch draws, or plain shapes a batch draws.
 * @param options - How.
 * @param options.path - The render path to start on.
 * @param options.settle - False to return before a frame paints the looks.
 * @returns The element.
 */
async function ringedLooks(
    looks: Looks | boolean = true,
    { path = "objects", settle = true }: { path?: "objects" | "batched"; settle?: boolean } = {},
): Promise<Graphty> {
    const ringed = looks === true || looks === "ringed";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.renderPath = path;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(looks === "translucent solids" ? "3d" : "2d");
    for (const [parity, ring, size] of [
        [0, "#000000", 1.6],
        [1, "#2563eb", 1],
    ] as const) {
        const nodes = NODES.filter(({ id }) => id % 2 === parity).map(({ id }) => id);
        await element.session.styles.add({
            name: `ring ${ring}`,
            target: "node",
            selector: { match: "ids", nodes },
            set: ringed
                ? { "node.shape": "ellipse", "node.size": size, "node.borderColor": ring, "node.borderWidth": 0.15 }
                : // a batch draws rows of one shape at any size
                  {
                      "node.shape": (typeof looks === "string" ? SHAPES[looks] : undefined)?.[parity] ?? "ellipse",
                      "node.size": 1.6,
                      ...(typeof looks === "string" && looks.startsWith("translucent") ? { "node.opacity": 0.6 } : {}),
                  },
        } as never);
    }

    for (const color of new Set(NODES.map((node) => node.color))) {
        const nodes = NODES.filter((node) => node.color === color).map(({ id }) => id);
        await element.session.styles.add({
            name: `fill ${color}`,
            target: "node",
            selector: { match: "ids", nodes },
            set: { "node.color": color },
        } as never);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    if (settle) {
        await element.waitForStableFrame();
    }

    return element;
}

/**
 * Switch to batched and read some nodes' meshes, as a consumer (or the fidelity harness) does.
 * @param graph - The graph.
 * @param ids - The nodes to read.
 */
async function holdMeshes(graph: Graph, ids: readonly number[]): Promise<void> {
    graph.setRenderPath("batched");
    for (const id of ids) {
        assert.isFalse(graph.getNode(id)?.mesh.isDisposed(), "the consumer gets the node's own mesh");
    }

    await operationQueueOf(graph).waitForCompletion();
    // A frame, which builds the batches the next one draws with.
    await readCanvas(graph);
}

const EVERY = NODES.map(({ id }) => id);

/**
 * The order one frame draws the fill and border sources of nodes 0 and 1, by name.
 * @param graph - The graph.
 * @returns Labels such as "fill 0" and "border 1", in draw order.
 */
async function fillBorderOrder(graph: Graph): Promise<string[]> {
    const labels = new Map<AbstractMesh, string>();
    for (const id of [0, 1]) {
        const node = graph.getNode(id);
        assert.isDefined(node);
        const { border } = nodeInternals.drawn(node);
        assert.instanceOf(border, InstancedMesh, `node ${String(id)} has a ring`);
        labels.set(node.drawnSourceMesh, `fill ${String(id)}`);
        labels.set(border.sourceMesh, `border ${String(id)}`);
    }

    const order: string[] = [];
    const watched = [...labels].map(([mesh, label]) => {
        assert.instanceOf(mesh, Mesh);
        const observer = mesh.onBeforeRenderObservable.add(() => {
            if (!order.includes(label)) {
                order.push(label);
            }
        });
        return () => mesh.onBeforeRenderObservable.remove(observer);
    });
    await readCanvas(graph);
    for (const unwatch of watched) {
        unwatch();
    }

    return order;
}

/**
 * The order one frame draws the fill sources of nodes 0 and 1 (or the batches drawing them), by name.
 * @param graph - The graph.
 * @returns "fill 0" and "fill 1", in draw order.
 */
async function fillOrder(graph: Graph): Promise<string[]> {
    const order: string[] = [];
    const watched = graph.scene.meshes
        .filter((mesh) => mesh instanceof Mesh)
        .map((mesh) => {
            const observer = mesh.onBeforeRenderObservable.add(() => {
                for (const id of [0, 1]) {
                    const source = graph.getNode(id)?.drawnSourceMesh;
                    // A batch draws its look's rows with the look's material, in the source's place.
                    const drawsIt = mesh === source || (mesh.material !== null && mesh.material === source?.material);
                    const label = `fill ${String(id)}`;
                    if (drawsIt && !order.includes(label)) {
                        order.push(label);
                    }
                }
            });
            return () => mesh.onBeforeRenderObservable.remove(observer);
        });
    await readCanvas(graph);
    for (const unwatch of watched) {
        unwatch();
    }

    return order;
}

describe("a node whose mesh was read under batched", () => {
    for (const [label, ids] of [
        ["every node", EVERY],
        ["the first node alone", [0]],
        ["part of one look", [0, 2]],
        ["some nodes of each look", [0, 1, 3]],
    ] as const) {
        it(`draws the objects path's picture when ${label} is read: fill under its ring, overlaps stacked the same`, async () => {
            const { graph } = await ringedLooks();
            graph.setRenderPath("objects");
            const objects = await readCanvas(graph);

            await holdMeshes(graph, ids);
            const held = await readCanvas(graph);
            assert.equal(graph.rowCounts.objectNodes, NODES.length, "no batch draws a ringed node");
            assert.equal(pixelsOverBar(objects, held), 0);
        });
    }

    it("draws its fill and ring sources in the order the objects path draws them", async () => {
        const { graph } = await ringedLooks();
        graph.setRenderPath("objects");
        const objects = await fillBorderOrder(graph);
        assert.sameMembers(objects, ["fill 0", "border 0", "fill 1", "border 1"]);
        const shared = graph.getNode(0)?.drawnSourceMesh;

        await holdMeshes(graph, EVERY);
        assert.deepEqual(await fillBorderOrder(graph), objects);
        assert.equal(graph.getNode(0)?.drawnSourceMesh, shared, "no batch hides a ringed look's source: it is shared");
    });

    it("draws from a source of its own where its look's source is drawn, when a batch draws its look", async () => {
        const { graph } = await ringedLooks(false);
        graph.setRenderPath("objects");
        const objects = await fillOrder(graph);
        assert.deepEqual(objects, ["fill 0", "fill 1"]);
        const shared = graph.getNode(0)?.drawnSourceMesh;

        await holdMeshes(graph, [0]);
        assert.notEqual(graph.getNode(0)?.drawnSourceMesh, shared, "a batch hides the look's source: it has its own");
        assert.deepEqual(await fillOrder(graph), objects);
        assert.equal(graph.rowCounts.batchedNodes, NODES.length - 1, "a batch draws every plain node but the read one");
    });

    for (const [label, ids, held] of [
        ["two of them", [0, 2], 3],
        ["one in the middle", [5], 1],
        ["the last", [11], 1],
        ["the first and the last", [0, 11], 12],
    ] as const) {
        it(`keeps its place among the rows of its look a batch draws when ${label} is read`, async () => {
            const { graph } = await ringedLooks("one shape");
            graph.setRenderPath("objects");
            const objects = await readCanvas(graph);

            await holdMeshes(graph, ids);
            const picture = await readCanvas(graph);
            // The rows between the first and the last read one draw with them; the rest stay on the batch.
            assert.equal(graph.rowCounts.objectNodes, held, "the read rows and the rows between them");
            assert.equal(graph.rowCounts.batchedNodes, NODES.length - held);
            assert.equal(pixelsOverBar(objects, picture), 0);
        });
    }

    it("keeps its place among the rows of a translucent look a batch draws", async () => {
        const { graph } = await ringedLooks("translucent");
        graph.setRenderPath("objects");
        const objects = await readCanvas(graph);

        await holdMeshes(graph, [3, 5]);
        const picture = await readCanvas(graph);
        // the read rows and the row between them, blended between the look's batches
        assert.equal(graph.rowCounts.objectNodes, 3);
        assert.equal(pixelsOverBar(objects, picture), 0);
    });

    for (const ids of [[0], [1], [2, 5]]) {
        it(`keeps its place among translucent looks of two shapes when ${ids.join(" and ")} is read`, async () => {
            const pictures: CanvasFrame[] = [];
            for (const path of ["objects", "batched"] as const) {
                const { graph } = await ringedLooks("translucent shapes", { path });
                for (const id of ids) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(graph);
                pictures.push(await readCanvas(graph));
                if (path === "batched") {
                    assert.equal(graph.rowCounts.objectNodes, ids.length, "only the read rows leave the batches");
                }
            }

            const [objects, batched] = pictures;
            assert.isDefined(objects);
            assert.isDefined(batched);
            assert.equal(pixelsOverBar(objects, batched), 0);
        });
    }

    for (const ids of [[0], [1], [2, 5]]) {
        it(`blends among translucent 3D looks as it did unread when ${ids.join(" and ")} is read`, async () => {
            // A held node's own source blends at its batch's distance, whatever its shape's bounds.
            const pictures: CanvasFrame[] = [];
            for (const reads of [[], ids]) {
                const { graph } = await ringedLooks("translucent solids", { path: "batched" });
                for (const id of reads) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(graph);
                pictures.push(await readCanvas(graph));
                assert.equal(graph.rowCounts.objectNodes, reads.length);
            }

            const [unread, read] = pictures;
            assert.isDefined(unread);
            assert.isDefined(read);
            assert.equal(pixelsOverBar(unread, read), 0);
        });
    }

    for (const [ids, there] of [
        [[0], ["objects"]],
        [[1], ["objects"]],
        [[2, 5], ["objects"]],
        [[0], ["objects", "batched"]],
        [[1], ["objects", "batched"]],
    ] as const) {
        it(`keeps its place among translucent looks when ${ids.join(" and ")} is read, then the graph goes to ${there.join(" then ")}`, async () => {
            const pictures: CanvasFrame[] = [];
            for (const path of ["objects", "batched"] as const) {
                const { graph } = await ringedLooks("translucent shapes", { path });
                for (const id of ids) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(graph);
                // the objects mount stays where it is; the batched one leaves batched, and may come back
                for (const next of path === "batched" ? there : []) {
                    graph.setRenderPath(next);
                    await operationQueueOf(graph).waitForCompletion();
                    await readCanvas(graph);
                }

                if (graph.renderPath === "objects") {
                    const [id] = ids;
                    const other = graph.getNode(id + 6)?.drawnSourceMesh;
                    assert.equal(graph.getNode(id)?.drawnSourceMesh, other, "it shares its look's source again");
                }

                pictures.push(await readCanvas(graph));
            }

            const [objects, batched] = pictures;
            assert.isDefined(objects);
            assert.isDefined(batched);
            assert.equal(pixelsOverBar(objects, batched), 0);
        });
    }

    it("keeps its look drawn in its place when the rest of its look leaves it and comes back", async () => {
        const pictures: CanvasFrame[] = [];
        for (const path of ["objects", "batched"] as const) {
            const { graph, session } = await ringedLooks("one shape", { path });
            assert.isFalse(graph.getNode(0)?.mesh.isDisposed());
            // Every row but the read one takes another look, then the odd ones come back to the first.
            for (const [name, nodes, set] of [
                ["away", EVERY.slice(1), { "node.shape": "rectangle", "node.color": "#16a34a" }],
                ["back", EVERY.filter((id) => id % 2 === 1), { "node.shape": "ellipse", "node.color": "#e11d48" }],
            ] as const) {
                await session.styles.add({ name, target: "node", selector: { match: "ids", nodes }, set } as never);
                await operationQueueOf(graph).waitForCompletion();
                await readCanvas(graph);
            }

            pictures.push(await readCanvas(graph));
        }

        const [objects, batched] = pictures;
        assert.isDefined(objects);
        assert.isDefined(batched);
        assert.equal(pixelsOverBar(objects, batched), 0);
    });

    it("keeps its place among the rows of its look a batch draws, with a look of another shape over it", async () => {
        const { graph } = await ringedLooks("two shapes");
        graph.setRenderPath("objects");
        const objects = await readCanvas(graph);

        await holdMeshes(graph, [0, 1, 3]);
        assert.equal(pixelsOverBar(objects, await readCanvas(graph)), 0);
    });

    it("draws a node read before its new look's frame where the objects path draws that look", async () => {
        const pictures: CanvasFrame[] = [];
        for (const path of ["objects", "batched"] as const) {
            // Read between the layers' change and the frame that paints it, while the row has no `Node` yet.
            const element = await ringedLooks("ringed", { path, settle: false });
            assert.isFalse(element.graph.getNode(0)?.mesh.isDisposed());
            await element.session.styles.add({
                name: "recolor",
                target: "node",
                selector: { match: "ids", nodes: [0, 4, 8] },
                set: { "node.borderColor": "#9333ea", "node.borderWidth": 0.25 },
            } as never);
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            pictures.push(await readCanvas(element.graph));
        }

        const [objects, batched] = pictures;
        assert.isDefined(objects);
        assert.isDefined(batched);
        assert.equal(pixelsOverBar(objects, batched), 0);
    });
});
