/**
 * @file The element's own id lookups on a real `Graph` take an integer id in either spelling: node
 * `34` answers to `"34"`, and edge `"0"` to `0`. The session's lookups are covered in Node by
 * `test/session/id-spelling.test.ts`.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { EdgeId } from "../../src/catalog/types";
import type { StyleChangedEvent } from "../../src/events";
import { Graph, operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding node `34`, node `"35"` and the edge between them.
 * @returns The graph and the edge's id.
 */
async function loadedGraph(): Promise<{ graph: Graph; edge: EdgeId }> {
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
    await graph.setLayout("circular");
    await graph.addNodes([{ id: 34 }, { id: "35" }]);
    await graph.addEdges([{ src: 34, dst: "35" }]);
    await operationQueueOf(graph).waitForCompletion();
    const [{ id: edge }] = graph.getSession().data.edges();
    return { graph, edge };
}

describe("either spelling of an integer id on the element", () => {
    it("isNodeSelected answers either spelling of the selected node", async () => {
        const { graph } = await loadedGraph();
        assert.isTrue(graph.selectNode("34"));
        assert.isTrue(graph.isNodeSelected(34));
        assert.isTrue(graph.isNodeSelected("34"));
        assert.isFalse(graph.isNodeSelected(" 34"));
    });

    it("updateEdges and removeEdges reach the edge by the number it spells", async () => {
        const { graph, edge } = await loadedGraph();
        const asNumber = Number(edge) as unknown as EdgeId;

        await graph.updateEdges([{ id: asNumber, tag: "e" }]);
        assert.strictEqual(graph.getSession().data.edge(edge)?.tag, "e");

        await graph.removeEdges([asNumber]);
        assert.strictEqual(graph.getSession().snapshot().edgeCount, 0);
    });

    it('a { match: "ids" } style layer paints node 34 named "34", and reports ids that name nothing', async () => {
        const { graph } = await loadedGraph();
        const told: StyleChangedEvent[] = [];
        const stop = graph.on("style-changed", (event) => told.push(event));
        cleanups.push(stop);

        const layer = await graph.getSession().styles.add({
            name: "Named as text",
            target: "node",
            selector: { match: "ids", nodes: ["34", "99"] },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(graph.getSession().styles.counts(layer.id).matched, 1);
        assert.strictEqual(
            graph
                .getSession()
                .styles.explain({ node: 34 })
                .channels.find((each) => each.channel === "node.color")?.layerId,
            layer.id,
        );
        assert.deepStrictEqual(
            told.map((event) => event.warnings),
            [[{ code: "W_UNKNOWN_ID", params: { target: "node", ids: ["99"] } }]],
        );
    });
});
