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
    it("let it go again after a second source merges in, so a graph of several sources holds one copy", async () => {
        const element = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = "batched";
        element.layout = "fixed";
        element.style.display = "block";
        element.style.width = "300px";
        element.style.height = "200px";
        document.body.appendChild(element);
        const csv = (prefix: string, count: number): string =>
            [
                "source,target",
                ...Array.from({ length: count }, (_, at) => `${prefix}${at % 20},${prefix}${(at + 3) % 20}`),
            ].join("\n");
        await element.session.data.import({ type: "csv", config: { data: csv("a", 60) }, name: "a.csv" });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isTrue(builderRelease(element).released, "the first source let it go");

        // The second source writes into the let-go builder, which rebuilds it once.
        await element.session.data.import(
            { type: "csv", config: { data: csv("b", 30) }, name: "b.csv" },
            { mode: "merge" },
        );
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.strictEqual(element.session.data.snapshot().edgeCount, 90, "both sources' edges are in");
        assert.strictEqual(element.session.data.sources().length, 2);
        assert.deepEqual(builderRelease(element), { released: true, revivals: 1 });

        // Two more sources: the third rebuilds it and keeps it, the fourth writes with no rebuild and,
        // having paid for that rebuild, lets it go. Paged or many-source loading must not copy the
        // whole graph once per load.
        for (const prefix of ["c", "d"]) {
            await element.session.data.import(
                { type: "csv", config: { data: csv(prefix, 30) }, name: `${prefix}.csv` },
                { mode: "merge" },
            );
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
        }
        assert.strictEqual(element.session.data.snapshot().edgeCount, 150);
        assert.deepEqual(builderRelease(element), { released: true, revivals: 2 });
    });
    it("let it go again after nodes and edges arrive as two commands, and clear and undo it with no rebuild", async () => {
        const element = await loaded("batched", [], []);
        await element.session.data.addNodes(nodes());
        await element.session.data.addEdges(edges());
        await operationQueueOf(element.graph).waitForCompletion();
        const want = { nodes: nodes(), ends: edges().map((edge) => [edge.src, edge.dst]) };
        assert.deepEqual(graphOf(element), want);
        // The edges rebuilt the nodes-only builder once, and the loaded graph lets it go again.
        assert.deepEqual(builderRelease(element), { released: true, revivals: 1 });

        await element.session.data.clear();
        await operationQueueOf(element.graph).waitForCompletion();
        assert.strictEqual(element.session.data.snapshot().nodeCount, 0);
        await element.session.undo();
        await operationQueueOf(element.graph).waitForCompletion();
        assert.deepEqual(sorted(graphOf(element)), sorted(want));
        assert.strictEqual(builderRelease(element).revivals, 1, "the clear set the let-go graph aside unrebuilt");
    });

    it("keep the builder let go through calls that change nothing, and through reads", async () => {
        const element = await loaded("batched", nodes(), edges());
        const { data } = element.session;
        const step = async (what: string, call: () => unknown): Promise<void> => {
            await call();
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.deepEqual(builderRelease(element), { released: true, revivals: 0 }, what);
        };

        await step("removing a node the graph does not hold", () => data.removeNodes([999]));
        await step("removing an edge the graph does not hold", () => data.removeEdges(["no-such-edge"]));
        await step("adding a node the graph holds", () => data.addNodes([{ id: 3, position: { x: 3, y: -3, z: 0 } }]));
        await step("updating a node to the values it holds", () => data.updateNodes([{ id: 3, values: { id: 3 } }]));
        await step("reading how many edges join a pair", () =>
            [...element.graph.getDataManager().edges.values()].slice(0, 5).map((edge) => edge.parallelCount),
        );
    });
});
