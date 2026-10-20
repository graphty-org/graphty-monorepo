/**
 * `shape.texts`: further texts over a node, each one line in the label's typography centered on its point, as
 * Graphviz draws a record's fields (dot-specimen-node-shapes-p2 `shape-record`: "a", "b", "c" side by side).
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

describe("a node's further texts", () => {
    test("draws each text over the node at its point, in the label's font, and takes them down with the style", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNode(asData({ id: "R", position: { x: 0, y: 0, z: 0 } }));
        await styleEveryNode(graph, {
            "node.shape": "rectangle",
            "node.width": 4,
            "node.height": 2,
            "node.shapeTexts": JSON.stringify([
                [-0.5, 0, "a"],
                [0.5, 0.5, "b"],
            ]),
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const node = graph.getDataManager().nodes.get("R");
        assert(node, "the node is drawn");
        const texts = node.shapeTextLabels;
        assert.deepEqual(
            texts.map((t) =>
                t.textRuns
                    .flat()
                    .map((r) => r.text)
                    .join(""),
            ),
            ["a", "b"],
        );
        const [a, b] = texts.map((t) => t.labelMesh?.getAbsolutePosition());
        assert(a && b, "both texts are on screen");
        const half = node.drawnHalfExtents;
        // a quarter of the node's width apart either side of its middle, b half its half height up
        assert.closeTo(b.x - a.x, half.x, 0.05 * half.x);
        assert.closeTo(b.y - a.y, 0.5 * half.y, 0.05 * half.y);

        await styleEveryNode(graph, { "node.shapeTexts": "[]" }, "no texts");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(node.shapeTextLabels.length, 0);
    });
});
