/**
 * @file The renderer's public objects hand out nothing a caller can write project state through:
 * the data manager's coordinates, node and edge maps and pair index, a node's record, and the
 * graph's configuration document. Each write either has no writer to reach or throws, and nothing
 * moves, not even from JavaScript that ignores the types.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A graph of two nodes and one edge, loaded and at rest, with no steps.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
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
    await graph.addNodes([{ id: "n1" }, { id: "n2" }]);
    await graph.addEdges([{ src: "n1", dst: "n2" }]);
    await operationQueueOf(graph).waitForCompletion();
    graph.getSession().history.clear();
    return graph;
}

describe("the renderer's public objects are read-only", () => {
    it("gives the data manager's coordinates no writer, even through a cast", async () => {
        const graph = await loadedGraph();
        const positions = graph.getDataManager().positions as unknown as Record<string, unknown>;

        for (const member of ["write", "view", "setPinned", "fillUnplaced", "grow", "remap", "pinnedView"]) {
            assert.notProperty(positions, member, `positions.${member}`);
        }

        const at = { x: 0, y: 0, z: 0 };
        graph.getDataManager().positions.read(0, at);
        assert.isFalse(graph.getSession().canUndo);
    });

    it("gives a node no way to take a record the graph does not hold", async () => {
        const graph = await loadedGraph();
        const node = graph.getDataManager().nodes.get("n1") as unknown as Record<string, unknown>;

        assert.notProperty(node, "adoptRecord");
        assert.deepEqual<unknown>(graph.getNode("n1")?.data, graph.getSession().data.node("n1"));
    });

    it("hands out node, edge and pair maps with no writers", async () => {
        const graph = await loadedGraph();
        const manager = graph.getDataManager();

        for (const [label, map] of [
            ["nodes", manager.nodes],
            ["edges", manager.edges],
        ] as const) {
            for (const member of ["set", "delete", "clear"]) {
                assert.notProperty(map, member, `${label}.${member}`);
            }
        }

        assert.strictEqual(manager.nodes.size, 2);
        const pair = manager.getEdgesBetween("n1", "n2") as unknown as unknown[];
        pair.length = 0;
        assert.lengthOf(manager.getEdgesBetween("n1", "n2"), 1, "the pair list handed out is a copy");
    });

    it("refuses to replace the configuration document", async () => {
        const graph = await loadedGraph();
        const { styles } = graph;

        assert.throws(() => {
            (graph as unknown as { styles: unknown }).styles = {};
        });
        assert.strictEqual(graph.styles, styles);
    });
});
