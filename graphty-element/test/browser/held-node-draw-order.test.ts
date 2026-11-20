/**
 * @file A node whose mesh a consumer read under `"batched"` draws in its look's place.
 *
 * Reading `node.mesh` under `"batched"` moves the node onto a source mesh of its own, built after its
 * look's border. The opaque sort orders by material creation, so that source drew its fill over its
 * border (thin rims) and over every overlapping node's border, where the objects path draws the fill
 * first. Runs in "browser" and "forced-batched"; each check picks its paths itself.
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

/** Twelve overlapping circles: even ones big with a black ring, odd ones small with a blue ring. */
const NODES = Array.from({ length: 12 }, (_, id) => ({
    id,
    position: { x: (id % 4) * 1.1 - 2, y: Math.floor(id / 4) * 1.1 - 1, z: 0 },
    color: ["#e11d48", "#16a34a", "#f59e0b"][id % 3],
}));

/**
 * Mount an element and load the ringed circles in 2D.
 * @returns The element.
 */
async function ringedLooks(): Promise<Graphty> {
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
            set: { "node.shape": "ellipse", "node.size": size, "node.borderColor": ring, "node.borderWidth": 0.15 },
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
 * Switch to batched and read every node's mesh, as a consumer (or the fidelity harness) does.
 * @param graph - The graph.
 */
function holdEveryMesh(graph: Graph): void {
    graph.setRenderPath("batched");
    for (const { id } of NODES) {
        assert.isFalse(graph.getNode(id)?.mesh.isDisposed(), "the consumer gets the node's own mesh");
    }
}

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

describe("a node whose mesh was read under batched", () => {
    it("draws the objects path's picture: fill under its ring, overlapping looks stacked the same", async () => {
        const { graph } = await ringedLooks();
        graph.setRenderPath("objects");
        const objects = await readCanvas(graph);

        holdEveryMesh(graph);
        const held = await readCanvas(graph);
        assert.equal(graph.rowCounts.objectNodes, NODES.length, "every read node draws by its own mesh");
        assert.equal(pixelsOverBar(objects, held), 0);
    });

    it("draws its fill and ring sources in the order the objects path draws them", async () => {
        const { graph } = await ringedLooks();
        graph.setRenderPath("objects");
        const objects = await fillBorderOrder(graph);
        assert.sameMembers(objects, ["fill 0", "border 0", "fill 1", "border 1"]);
        const shared = graph.getNode(0)?.drawnSourceMesh;

        holdEveryMesh(graph);
        assert.notEqual(graph.getNode(0)?.drawnSourceMesh, shared, "a held node draws from a source of its own");
        assert.deepEqual(await fillBorderOrder(graph), objects);
    });
});
