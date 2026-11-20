/**
 * @file A node whose mesh a consumer read under `"batched"` draws in its look's place.
 *
 * Reading `node.mesh` under `"batched"` moved the node onto a source mesh of its own, built after its
 * look's border. The opaque sort orders by material creation, so that source drew its fill over its
 * border (thin rims) and over every overlapping node's border, where the objects path draws the fill
 * first; and a node read alone drew over the rest of its look, which the objects path draws in node
 * order. Runs in "browser" and "forced-batched"; each check picks its paths itself.
 */

import "../../src/graphty-element";

import { type AbstractMesh, InstancedMesh, Mesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { type Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

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

/**
 * Mount an element and load the circles in 2D.
 * @param ringed - Whether they have rings, which no batch draws.
 * @returns The element.
 */
async function ringedLooks(ringed = true): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
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
                : // two shapes: a batch draws rows of one shape at any size
                  { "node.shape": parity === 0 ? "ellipse" : "rectangle", "node.size": size },
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
    await element.waitForStableFrame();
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
});
