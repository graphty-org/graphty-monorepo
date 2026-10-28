/**
 * @file The selection of a rendered graph follows a freeze that compacts rows away (issue #2792).
 *
 * The selection holds its members by dense row. Removing a node or an edge makes the next freeze
 * compact the removed rows away and renumber every row after them, so a selection that did not
 * follow the renumbering would lose a member that moved past the end of the graph, or select
 * whatever element now sits at its old row.
 */
import { assert, describe, test } from "vitest";

import { Graph } from "../../src/Graph";

const NODE_COUNT = 100;

/**
 * A path n0 - n1 - ... - n99 over a fresh canvas: edge i joins n(i) and n(i+1).
 * @returns the graph
 */
async function makePath(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="selection-compaction-canvas"></canvas>';
    const graph = new Graph(document.getElementById("selection-compaction-canvas") as HTMLCanvasElement);
    const ids = Array.from({ length: NODE_COUNT }, (_, i) => `n${i}`);
    await graph.addNodes(
        ids.map((id) => ({ id })),
        undefined,
        { skipQueue: true },
    );
    await graph.addEdges(
        ids.slice(1).map((id, i) => ({ source: ids[i], target: id })),
        { skipQueue: true },
    );
    return graph;
}

/**
 * The ids the selection holds, read off its masks by row.
 * @param graph - the graph
 * @returns the selected node and edge ids
 */
function selected(graph: Graph): { nodes: string[]; edges: string[] } {
    const { selection } = graph.getSession();
    return { nodes: selection.nodes.map(String), edges: selection.edges.map(String) };
}

describe("the selection of a rendered graph across a compacting freeze", () => {
    test("keeps a selected edge whose row moved when the nodes before it went", async () => {
        const graph = await makePath();
        const session = graph.getSession();
        await session.selection.apply({ edges: ["0", "98"] });

        await session.data.removeNodes(["n0"]);
        await session.data.removeNodes(["n1"]);

        assert.isTrue(session.selection.has("98"), "the last edge is still selected at its new row");
        assert.isFalse(session.selection.has("0"), "the edge that went with n0 is not");
        assert.deepStrictEqual(selected(graph), { nodes: [], edges: ["98"] });
        graph.dispose();
    });

    test("moves a selected node with its row, and selects nothing in its place", async () => {
        const graph = await makePath();
        const session = graph.getSession();
        await session.selection.apply({ nodes: ["n50"], edges: ["60"] });

        await session.data.removeNodes(["n0", "n1", "n2", "n3", "n4"]);

        assert.isTrue(session.selection.has("n50"), "n50 is still selected");
        assert.isTrue(session.selection.has("60"), "and so is edge 60");
        assert.deepStrictEqual(
            selected(graph),
            { nodes: ["n50"], edges: ["60"] },
            "the bits moved with their rows: nothing now at the old rows is selected",
        );
        graph.dispose();
    });

    test("follows an edge removal that renumbers only the edges", async () => {
        const graph = await makePath();
        const session = graph.getSession();
        await session.selection.apply({ edges: ["50"] });

        await session.data.removeEdges(["0", "1", "2"]);

        assert.deepStrictEqual(selected(graph), { nodes: [], edges: ["50"] });
        graph.dispose();
    });
});
