/**
 * @file Hiding by style: `edge.visible` and `node.visible` false stop the drawing and nothing else.
 * The elements stay in the graph, counted by statistics and reachable by the selection, and
 * removing the layer draws them again.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

describe("hidden by style", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "320px";
        container.style.height = "240px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("an edge hidden by edge.visible is not drawn yet still counted by selection and statistics", async () => {
        const session = graph.getSession();
        const layer = await session.styles.add({
            name: "No lines",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.visible": false },
        });
        await graph.waitForStableFrame();

        const edges = [...graph.getDataManager().edges.values()];
        assert.lengthOf(edges, 2);
        assert.isTrue(
            edges.every((edge) => !edge.isRenderVisible()),
            "no edge is drawn",
        );
        assert.strictEqual(session.data.statistics().edgeCount, 2, "statistics still count both edges");
        const delta = await session.selection.apply({ ids: edges.map((edge) => edge.id) });
        assert.strictEqual(delta.edges, 2, "the selection still reaches both edges");

        await session.styles.remove(layer.id);
        await graph.waitForStableFrame();
        assert.isTrue(
            edges.every((edge) => edge.isRenderVisible()),
            "removing the layer draws the edges again",
        );
    });

    it("a node hidden by node.visible is not drawn yet keeps its place in the graph", async () => {
        const session = graph.getSession();
        await session.styles.add({
            name: "No b",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.visible": false },
        });
        await graph.waitForStableFrame();

        const { nodes } = graph.getDataManager();
        const hidden = nodes.get("b");
        assert.isDefined(hidden);
        assert.strictEqual(hidden.getRenderState(), "hidden");
        assert.isFalse(hidden.mesh.isEnabled(), "the node's mesh is not drawn");
        assert.strictEqual(nodes.get("a")?.getRenderState(), "visible", "the other nodes are drawn");
        assert.strictEqual(session.data.statistics().nodeCount, 3, "statistics still count it");
    });
});
