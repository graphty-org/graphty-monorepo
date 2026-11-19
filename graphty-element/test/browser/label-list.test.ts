/**
 * Several labels on one node and one edge (`node.labels`, `edge.labels`): each entry draws a text mesh
 * of its own where its style puts it, and a higher layer's `off` takes down only that one.
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * The words one drawn label shows.
 * @param label - The label.
 * @param label.textRuns - Its runs.
 * @returns The words.
 */
function wordsOf(label: { readonly textRuns: readonly (readonly { readonly text: string }[])[] } | undefined): string {
    return (label?.textRuns ?? [])
        .flat()
        .map((run) => run.text)
        .join("");
}

describe("a label list", () => {
    test("draws one text mesh per label, and a higher layer's off removes only that one", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNodes([
            asData({ id: "A", position: { x: -4, y: 0, z: 0 } }),
            asData({ id: "B", position: { x: 4, y: 0, z: 0 } }),
        ]);
        await graph.addEdge(asData({ source: "A", target: "B" }), { source: "source", target: "target" });
        await styleEveryNode(graph, {
            "node.labels": [
                { id: "top", text: "TOP", style: { location: "top" } },
                { id: "bottom", text: "BOTTOM", style: { location: "bottom" } },
            ],
        });
        await styleEveryEdge(graph, { "edge.labels": [{ id: "mid", text: "MID" }] });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const node = graph.getDataManager().nodes.get("A");
        assert(node, "the node is drawn");
        assert.deepStrictEqual([...node.extraLabels.keys()], ["top", "bottom"]);
        const top = node.extraLabels.get("top")?.labelMesh;
        const bottom = node.extraLabels.get("bottom")?.labelMesh;
        assert(top && bottom, "both labels are on screen");
        assert.notStrictEqual(top, bottom, "as two meshes");
        assert.strictEqual(wordsOf(node.extraLabels.get("top")), "TOP");
        assert.strictEqual(wordsOf(node.extraLabels.get("bottom")), "BOTTOM");
        assert.isAbove(top.getAbsolutePosition().y, bottom.getAbsolutePosition().y, "top above bottom");

        const edge = [...graph.getDataManager().edges.values()][0];
        assert(edge, "the edge is drawn");
        assert.strictEqual(wordsOf(edge.extraLabels.get("mid")), "MID");
        assert(edge.extraLabels.get("mid")?.labelMesh, "the edge's label is on screen");

        await styleEveryNode(graph, { "node.labels": [{ id: "bottom", off: true }] }, "hide bottom");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.deepStrictEqual([...node.extraLabels.keys()], ["top"], "only the bottom label is gone");
        assert.isTrue(bottom.isDisposed(), "its mesh is taken down");
        assert.isFalse(node.extraLabels.get("top")?.labelMesh?.isDisposed(), "the other stays");
    });
});
