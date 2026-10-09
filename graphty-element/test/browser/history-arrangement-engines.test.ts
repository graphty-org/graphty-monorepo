/**
 * @file Undo and redo put the nodes where the history says under every engine (issue #1488):
 *
 * - Switching to 2D puts every node on the Z = 0 plane and the layout keeps it there. d3 drew a
 *   3D simulation under a 2D camera, and a switch that does not rebuild the engine left every Z.
 * - A node an edge left behind, with a row and no record, is kept by an arrangement capture. The
 *   renderer's store answered "no rows" whenever no node had a record, so the capture was empty
 *   and redo left the node unplaced.
 * - An engine writing back what the lane holds moves nothing. ngraph and d3 publish every row
 *   after an add, which counted as a move, so the add's step took a capture of its own and redo
 *   put back where the nodes were then instead of where the layout had moved them since.
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
 * A graph holding `n1 -> n2 -> n3` laid out by one engine, at rest, with its history cleared.
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
    frames(graph, 300);
    graph.getLayoutManager().running = false;
    session.history.clear();
    return graph;
}

/**
 * Step the layout while it runs.
 * @param graph - The graph.
 * @param count - At most this many frames.
 */
function frames(graph: Graph, count: number): void {
    for (let frame = 0; frame < count && graph.getLayoutManager().running; frame++) {
        graph.getUpdateManager().stepFrames(1);
    }
}

describe.each(["ngraph", "d3", "spring"])("the arrangement under %s", (engine) => {
    it("puts every node on the plane in 2D and keeps it there, and undo brings the Z back", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        const spatial = lane(graph);

        await session.layout.setDimension("2d");
        frames(graph, 20);
        for (const [id, coords] of Object.entries(lane(graph))) {
            assert.match(coords, /,0$/, `node ${id} is on the plane`);
        }

        await session.undo();
        assert.deepEqual(lane(graph), spatial, "undone, the Z the history kept");
    });

    it("keeps a node an edge left behind where it was placed, through undo and redo", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        await session.data.clear();
        await session.data.addEdges([{ src: "n4", dst: "n1" }]);
        await session.data.removeNodes(["n1"]);
        await session.positions.set([{ id: "n4", x: 1, y: 2, z: 3 }]);
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        await session.history.restoreTo(null);
        const top = session.history.steps.at(-1);
        assert.isDefined(top);
        await session.history.restoreTo(top.id);
        assert.deepEqual(lane(graph), { n4: "1,2,3" }, "redone, n4 where it was placed");
    });

    it("redoes an add that moved nothing over where the layout has moved the nodes since", async () => {
        const graph = await begin(engine);
        const session = graph.getSession();
        await session.data.addEdges([{ src: "n1", dst: "n5" }]);
        await session.undo();
        graph.getLayoutManager().running = true;
        graph.getUpdateManager().stepFrames(1);
        const moved = lane(graph);

        await session.redo();
        assert.deepEqual(lane(graph), { ...moved, n5: "NaN,NaN,NaN" }, "the nodes stay where the layout left them");
    });
});
