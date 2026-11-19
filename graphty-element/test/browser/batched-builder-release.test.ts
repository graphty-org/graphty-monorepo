/**
 * @file Under `renderPath: "batched"` the graph store lets its builder go once a load given through
 * `nodeData` and `edgeData` is in (the snapshot holds the same rows), and rebuilds it once on the
 * first edit after the load, which comes out correct, as does undoing it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { GraphStore } from "../../src/data/GraphStore";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";

afterEach(() => {
    document.body.replaceChildren();
});

const nodes = (): { id: number; position: { x: number; y: number; z: number } }[] =>
    Array.from({ length: 30 }, (_, id) => ({ id, position: { x: id, y: -id, z: 0 } }));
const edges = (): { src: number; dst: number }[] =>
    Array.from({ length: 60 }, (_, at) => ({ src: at % 30, dst: (at * 7 + 1) % 30 }));

/**
 * Mount an element and hand it the records through its properties.
 * @param path - The render path.
 * @param n - The node records.
 * @param m - The edge records.
 * @returns The element.
 */
async function loaded(path: "objects" | "batched", n: object[], m: object[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.edgeSrcIdPath = "src";
    element.edgeDstIdPath = "dst";
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    element.nodeData = n as Record<string, unknown>[];
    element.edgeData = m as Record<string, unknown>[];
    await vi.waitFor(() => {
        assert.strictEqual(element.graph.getNodeCount(), n.length);
        assert.strictEqual(element.graph.getEdgeCount(), m.length);
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The graph as a reader sees it: every node record and every edge's ends, in order.
 * @param element - The element.
 * @returns The plain data.
 */
function graphOf(element: Graphty): unknown {
    const snapshot = element.session.data.snapshot();
    const ends = Array.from({ length: snapshot.edgeCount }, (_, row) => [
        snapshot.ids.idOf(snapshot.edgeSource(row)),
        snapshot.ids.idOf(snapshot.edgeTarget(row)),
    ]);
    return {
        nodes: [...dispatcherOf(element.session).state.graph.nodes.values()],
        ends,
    };
}

/**
 * A graph as {@link graphOf} reads it, its nodes and edges in id order.
 * @param graph - The graph.
 * @returns It, sorted.
 */
function sorted(graph: unknown): unknown {
    const { nodes, ends } = graph as { nodes: { id: number }[]; ends: number[][] };
    return {
        nodes: [...nodes].sort((a, b) => a.id - b.id),
        ends: [...ends].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    };
}

/**
 * Whether the element's graph store has let its builder go, and how often it rebuilt one.
 * @param element - The element.
 * @returns The state.
 */
function builderRelease(element: Graphty): { released: boolean; revivals: number } {
    const manager = element.graph.getDataManager() as unknown as { store: GraphStore };
    return { ...manager.store.builderRelease };
}

describe("the graph builder on the batched path", () => {
    it("load the graph they were handed, let the builder go, and take a first edit after the load", async () => {
        const element = await loaded("batched", nodes(), edges());
        const want = { nodes: nodes(), ends: edges().map((edge) => [edge.src, edge.dst]) };
        assert.deepEqual(graphOf(element), want);
        // Loaded and only looked at: the snapshot alone holds the structure.
        assert.deepEqual(builderRelease(element), { released: true, revivals: 0 });

        await element.session.data.addEdges([{ src: 2, dst: 3 }]);
        await element.session.data.removeNodes([5]);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.strictEqual(builderRelease(element).revivals, 1, "the first edit rebuilt it once");
        const snapshot = element.session.data.snapshot();
        assert.strictEqual(snapshot.nodeCount, 29);
        assert.strictEqual(snapshot.edgeCount, 60 + 1 - edges().filter((e) => e.src === 5 || e.dst === 5).length);
        assert.isFalse(snapshot.ids.has(5));
        const last = snapshot.edgeCount - 1;
        assert.deepEqual(
            [snapshot.ids.idOf(snapshot.edgeSource(last)), snapshot.ids.idOf(snapshot.edgeTarget(last))],
            [2, 3],
        );

        // Undo the edit, then the load's graph is back.
        await element.session.undo();
        await element.session.undo();
        await operationQueueOf(element.graph).waitForCompletion();
        // The same graph; an undone removal puts its node back last, so compare in id order.
        assert.deepEqual(sorted(graphOf(element)), sorted(want));
        assert.strictEqual(builderRelease(element).revivals, 1, "a rebuilt builder is kept");
    });
});
