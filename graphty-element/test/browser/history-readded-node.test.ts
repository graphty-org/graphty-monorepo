/**
 * @file Undo never puts a node that was removed and brought back unplaced at the coordinates of
 * its earlier self (issue #583). Both ways it happened end the same: a restore wrote an
 * arrangement taken before the node came back, which held its coordinates from before it was
 * removed.
 *
 * - Undoing a step that took a before-arrangement (an import) filed that arrangement under the step
 *   directly below, even one that moved nothing (a saved set). Undoing that step then restored the
 *   arrangement below it, taken before the node came back.
 * - An arrangement taken before a step created a row placed that row's node: a step's undo that
 *   restored it, or the baseline that eviction folds the oldest steps into under a step or byte
 *   limit, put the node back where its earlier self was.
 *
 * A new row starts unplaced, so no arrangement older than the step that created it places it, and
 * a before-arrangement goes to the seal target, which skips steps that moved nothing
 * (design/undo/undo-design.md section 6.4).
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Every node's coordinates in the lane, by id.
 * @param graph - The graph.
 * @returns `id: x,y,z`.
 */
function lane(graph: Graph): Record<string, string> {
    const session = graph.getSession();
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, string> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
    }

    return out;
}

/**
 * A graph holding `n1 -> n2 -> n3` laid out by one engine and at rest, with its history cleared,
 * so the start of the history holds where every node settled; then n2 and n3 removed and n2
 * brought back, unplaced, by an edge.
 * @param engine - The engine.
 * @returns The graph.
 */
async function begin(engine: string): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    graph.engine.stopRenderLoop();
    await graph.setLayout(engine);
    const session = graph.getSession();
    await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await session.data.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    for (let frame = 0; frame < 300 && graph.getLayoutManager().running; frame++) {
        graph.getUpdateManager().stepFrames(1);
    }

    graph.getLayoutManager().running = false;
    session.history.clear();

    await session.data.removeNodes(["n2", "n3"]);
    await session.data.addEdges([{ src: "n2", dst: "n1" }]);
    assert.strictEqual(lane(graph).n2, "NaN,NaN,NaN", "the edge brought n2 back unplaced");
    return graph;
}

/** What an import loads. */
const DATASET = JSON.stringify({ nodes: [{ id: "n1" }, { id: "n6" }], edges: [{ src: "n1", dst: "n6" }] });

describe.each(["ngraph", "d3", "spring"])("a node removed and brought back unplaced, under %s", (engine) => {
    it("stays unplaced when undoing a step that moved nothing follows undoing an import", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        session.scope.save("Hubs", "graph");
        const before = lane(graph);

        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "replace" });
        await session.undo();
        assert.deepEqual(lane(graph), before, "undoing the import puts back where it began");
        await session.undo();
        assert.deepEqual(lane(graph), before, "undoing the saved set moves nothing");
    });

    it("stays unplaced when undoing a removal restores an arrangement from before it came back", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        await session.data.removeNodes(["n1", "n2"]);

        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "merge" });
        await session.undo();
        await session.undo();
        // n1 is wherever the layout last left it: ngraph and d3 move it as the edge is added.
        assert.strictEqual(lane(graph).n2, "NaN,NaN,NaN", "n2 back as it was before the removal");
    });

    it("stays unplaced at the start of a history whose step limit folded the steps that removed and brought it back", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        session.history.limitSteps = 2;

        await session.data.removeNodes(["n1", "n2"]);
        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "merge" });
        await session.history.restoreTo(null);
        assert.strictEqual(session.history.position, 0);
        assert.strictEqual(lane(graph).n2, "NaN,NaN,NaN", "n2 as it was where the removal began");
    });

    it("stays unplaced at the start of a history whose step limit folded the steps below an undone import", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        session.scope.save("Hubs", "graph");
        const before = lane(graph);
        session.history.limitSteps = 2;

        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "replace" });
        await session.history.restoreTo(null);
        assert.strictEqual(session.history.position, 0);
        assert.deepEqual(lane(graph), before, "the start of the history is where the import began");
    });

    it("comes back where its earlier self was when undoing everything goes back past its removal", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        await session.history.restoreTo(null);
        const start = lane(graph);
        const top = session.history.steps.at(-1);
        assert.isDefined(top);
        await session.history.restoreTo(top.id);

        await session.positions.set([{ id: "n1", x: 1, y: 2, z: 3 }]);
        await session.data.clear();
        await session.history.restoreTo(null);
        assert.deepEqual(lane(graph), start, "every node where it was before anything was removed");
    });
});
