/**
 * @file Undo puts back an arrangement in which a node was unplaced, and the node stays unplaced
 * under every engine (issue #582).
 *
 * The node first exists only as an edge's endpoint, so it has a row and no record, and nothing
 * places it. An expansion then gives it a record, and ngraph and d3, which keep coordinates of
 * their own, place it as the expansion derives. A removal after that is undone: the lane goes
 * back to the arrangement the expansion began from, where the node was unplaced. ngraph and d3
 * still held their own coordinates for it, and the redraw that follows the restore read them --
 * and the read published them, placing the node at a history position where it never was.
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
 * A node's coordinates in the lane.
 * @param graph - The graph.
 * @param id - The node.
 * @returns `x,y,z`.
 */
function coords(graph: Graph, id: string): string {
    const session = graph.getSession();
    const row = session.snapshot().ids.indexOf(id);
    const at = { x: 0, y: 0, z: 0 };
    session.positions.read(row, at);
    return `${String(at.x)},${String(at.y)},${String(at.z)}`;
}

describe.each(["ngraph", "d3", "spring"])("a node an edge created, under %s", (engine) => {
    it("is unplaced again when undo restores an arrangement from before it was placed", async () => {
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
        const layout = graph.getLayoutManager();
        for (let frame = 0; frame < 300 && layout.running; frame++) {
            graph.getUpdateManager().stepFrames(1);
        }

        layout.running = false;
        session.history.clear();

        await session.data.addEdges([{ src: "n7", dst: "n1" }]);
        const unplaced = coords(graph, "n7");
        assert.strictEqual(unplaced, "NaN,NaN,NaN", "an edge's endpoint is unplaced");
        await session.execute({
            op: "data.expand",
            seed: "n1",
            nodes: [{ id: "n7" }],
            edges: [
                { src: "n1", dst: "n7" },
                { src: "n1", dst: "n2" },
            ],
        });
        await session.data.removeNodes(["n3", "n5"]);
        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "undone");
        assert.strictEqual(coords(graph, "n7"), unplaced, "undo leaves n7 where the expansion began");
    });
});
