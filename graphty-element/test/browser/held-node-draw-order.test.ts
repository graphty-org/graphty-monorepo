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
 * Mount an empty element.
 * @param path - Its render path.
 * @returns The element.
 */
async function mountElement(path: "objects" | "batched"): Promise<Graphty> {
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
    return element;
}

/**
 * How many pixels the batched picture differs from the objects one by, each drawn on its own mount.
 * @param draw - Mounts on a path, does the steps, and returns the picture.
 * @returns The pixels over the bar.
 */
async function pathsDiffer(draw: (path: "objects" | "batched") => Promise<CanvasFrame>): Promise<number> {
    const objects = await draw("objects");
    return pixelsOverBar(objects, await draw("batched"));
}

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
    const element = await mountElement(path);
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

    it("is drawn by its look's batch from its own mesh, when a batch draws its look", async () => {
        const { graph } = await ringedLooks(false);
        graph.setRenderPath("objects");
        const objects = await fillOrder(graph);
        assert.deepEqual(objects, ["fill 0", "fill 1"]);
        const shared = graph.getNode(0)?.drawnSourceMesh;

        await holdMeshes(graph, [0]);
        const held = graph.getNode(0)?.mesh;
        assert.instanceOf(held, InstancedMesh, "it keeps its own mesh");
        assert.equal(held.sourceMesh, shared, "on its look's source: no source of its own");
        assert.deepEqual(await fillOrder(graph), objects);
        assert.equal(graph.rowCounts.batchedNodes, NODES.length - 1, "a batch draws every plain node but the read one");
    });

    for (const [label, ids] of [
        ["two of them", [0, 2]],
        ["one in the middle", [5]],
        ["the last", [11]],
        ["the first and the last", [0, 11]],
        ["every other one", [1, 3, 5, 7, 9, 11]],
    ] as const) {
        it(`keeps its place among the rows of its look a batch draws when ${label} is read`, async () => {
            const { graph } = await ringedLooks("one shape");
            graph.setRenderPath("objects");
            const objects = await readCanvas(graph);

            await holdMeshes(graph, ids);
            const picture = await readCanvas(graph);
            // Only the read rows leave the batch: the rows between them stay on it, cut at each read row.
            assert.equal(graph.rowCounts.objectNodes, ids.length, "only the read rows");
            assert.equal(graph.rowCounts.batchedNodes, NODES.length - ids.length);
            assert.equal(pixelsOverBar(objects, picture), 0);
        });
    }

    it("keeps its place among the rows of a translucent look a batch draws", async () => {
        const { graph } = await ringedLooks("translucent");
        graph.setRenderPath("objects");
        const objects = await readCanvas(graph);

        await holdMeshes(graph, [3, 5]);
        const picture = await readCanvas(graph);
        // only the read rows, each blended between the look's batches
        assert.equal(graph.rowCounts.objectNodes, 2);
        assert.equal(pixelsOverBar(objects, picture), 0);
    });

    for (const ids of [[0], [1], [2, 5]]) {
        it(`keeps its place among translucent looks of two shapes when ${ids.join(" and ")} is read`, async () => {
            const differ = await pathsDiffer(async (path) => {
                const { graph } = await ringedLooks("translucent shapes", { path });
                for (const id of ids) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(graph);
                const picture = await readCanvas(graph);
                if (path === "batched") {
                    assert.equal(graph.rowCounts.objectNodes, ids.length, "only the read rows leave the batches");
                }

                return picture;
            });
            assert.equal(differ, 0);
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
            const differ = await pathsDiffer(async (path) => {
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

                const picture = await readCanvas(graph);

                return picture;
            });
            assert.equal(differ, 0);
        });
    }

    it("keeps its look drawn in its place when the rest of its look leaves it and comes back", async () => {
        const differ = await pathsDiffer(async (path) => {
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

            const picture = await readCanvas(graph);

            return picture;
        });
        assert.equal(differ, 0);
    });

    it("keeps its place among the rows of its look a batch draws, with a look of another shape over it", async () => {
        const { graph } = await ringedLooks("two shapes");
        graph.setRenderPath("objects");
        const objects = await readCanvas(graph);

        await holdMeshes(graph, [0, 1, 3]);
        assert.equal(pixelsOverBar(objects, await readCanvas(graph)), 0);
    });

    it("draws a node read before its new look's frame where the objects path draws that look", async () => {
        const differ = await pathsDiffer(async (path) => {
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
            const picture = await readCanvas(element.graph);

            return picture;
        });
        assert.equal(differ, 0);
    });

    for (const [ids, restyled] of [
        [[0], 0],
        [[5], 5],
        [[2, 9], 2],
    ] as const) {
        it(`keeps its place among translucent looks when ${ids.join(" and ")} is read, then ${restyled} takes another shape`, async () => {
            // The read node's new look has no batch of its own: its source blends where that batch would.
            const differ = await pathsDiffer(async (path) => {
                const { graph, session } = await ringedLooks("translucent", { path });
                for (const id of ids) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(graph);
                await session.styles.add({
                    name: "restyled",
                    target: "node",
                    selector: { match: "ids", nodes: [restyled] },
                    set: { "node.shape": "rectangle" },
                } as never);
                await operationQueueOf(graph).waitForCompletion();
                await readCanvas(graph);
                return readCanvas(graph);
            });
            assert.equal(differ, 0);
        });
    }

    const LONG = Array.from({ length: 50 }, (_, id) => id);
    for (const [label, reads, opacity] of [
        ["three", [0, 25, 49], 1],
        ["three", [0, 25, 49], 0.6],
        ["every other one", LONG.filter((id) => id % 2 === 1), 1],
        ["every other one", LONG.filter((id) => id % 2 === 1), 0.6],
    ] as const) {
        it(`builds only the read rows of a long look, ${label} read, within limits.objectRows and one batch, at opacity ${opacity}`, async () => {
            const differ = await pathsDiffer(async (path) => {
                const element = await mountElement(path);
                const warnings: unknown[] = [];
                element.addEventListener("limits-warning", (event) => warnings.push(event));
                element.limits = { objectRows: reads.length + 10 };
                // fifty overlapping circles of one look, in a row
                await element.session.data.addNodes(
                    Array.from({ length: 50 }, (_, id) => ({ id, position: { x: id * 0.1 - 2.5, y: 0, z: 0 } })),
                );
                await element.graph.setLayout("fixed", { dim: 3 });
                await element.setViewMode("2d");
                // one look, in three colors, so the stacking shows
                for (const [at, color] of ["#e11d48", "#16a34a", "#2563eb"].entries()) {
                    await element.session.styles.add({
                        name: `look ${color}`,
                        target: "node",
                        selector: {
                            match: "ids",
                            nodes: Array.from({ length: 50 }, (_, id) => id).filter((id) => id % 3 === at),
                        },
                        set: { "node.shape": "ellipse", "node.color": color, "node.opacity": opacity },
                    } as never);
                }
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const { scene } = element.graph;
                const meshes = scene.meshes.length;
                for (const id of reads) {
                    assert.isFalse(element.graph.getNode(id)?.mesh.isDisposed());
                }

                await readCanvas(element.graph);
                const picture = await readCanvas(element.graph);
                if (path === "batched") {
                    // The rows between the read ones stay on the look's batches: no `Node` each, none past the budget.
                    assert.equal(element.graph.rowCounts.objectNodes, reads.length, "only the read rows are built");
                    assert.equal(element.graph.rowCounts.batchedNodes, 50 - reads.length);
                    assert.lengthOf(warnings, 0, "no row goes past limits.objectRows");
                    // however scattered the reads, one instance each and nothing more: one batch draws the look
                    assert.equal(scene.meshes.length - meshes, reads.length, "one mesh a read");
                    const batches = scene.meshes.filter((mesh) => mesh.name.endsWith("-batch") && mesh.isEnabled());
                    assert.lengthOf(batches, 1, "one batch, never cut");
                }

                return picture;
            });
            assert.equal(differ, 0);
        });
    }

    it("shows what a consumer does to a read mesh as the objects path does: scaled, moved, hidden", async () => {
        const differ = await pathsDiffer(async (path) => {
            const { graph } = await ringedLooks("translucent shapes", { path });
            const [scaled, moved, hidden] = [2, 5, 7].map((id) => graph.getNode(id)?.mesh);
            assert.isDefined(scaled);
            assert.isDefined(moved);
            assert.isDefined(hidden);
            scaled.scaling.scaleInPlace(0.5);
            moved.position.y += 0.4;
            hidden.isVisible = false;
            await readCanvas(graph);
            const picture = await readCanvas(graph);
            if (path === "batched") {
                assert.equal(graph.rowCounts.objectNodes, 3);
            }

            return picture;
        });
        assert.equal(differ, 0);
    });

    it("keeps the edges at a read node as they are drawn unread", async () => {
        const drawn: { picture: CanvasFrame; pulled: number }[] = [];
        for (const reads of [[], [1, 2]]) {
            const element = await mountElement("batched");
            // apart, so the edges between them show
            await element.session.data.addNodes(
                Array.from({ length: 4 }, (_, id) => ({ id, position: { x: id * 2 - 3, y: (id % 2) * 1.5, z: 0 } })),
            );
            await element.session.data.addEdges([0, 1, 2].map((id) => ({ source: id, target: id + 1 })));
            await element.graph.setLayout("fixed", { dim: 3 });
            await element.setViewMode("2d");
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            for (const id of reads) {
                assert.isFalse(element.graph.getNode(id)?.mesh.isDisposed());
            }

            await readCanvas(element.graph);
            // plain lines, drawn from the rows, painted after the reads, which asks how their ends are drawn
            await element.session.styles.add({
                name: "edges",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.color": "#2563eb", "edge.arrowHead": "none" },
            } as never);
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            drawn.push({ picture: await readCanvas(element.graph), pulled: element.graph.rowCounts.pulledEdges });
        }

        const [unread, read] = drawn;
        assert.isDefined(unread);
        assert.isDefined(read);
        assert.equal(read.pulled, unread.pulled, "a read end is drawn, so its edges stay row lines");
        assert.equal(pixelsOverBar(unread.picture, read.picture), 0);
    });
});
