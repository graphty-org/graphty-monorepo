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

        // a fourth item draws a text in its own size, color and font (a chart's item labels), the size a share of
        // the node's height
        await styleEveryNode(
            graph,
            {
                "node.shapeTexts": JSON.stringify([
                    [-0.5, 0, "a", { size: 0.25 }],
                    [0.5, 0, "a", { size: 0.5, color: "#ff0000", font: "Courier New" }],
                ]),
            },
            "texts with a look",
        );
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const [small, big] = node.shapeTextLabels;
        const run = big.textRuns[0][0].style;
        assert.strictEqual(run.color, "#ff0000");
        assert.strictEqual(run.font, "Courier New");
        assert.notStrictEqual(small.textRuns[0][0].style.color, "#ff0000");
        const tall = (l: typeof small): number => {
            const box = l.labelMesh?.getBoundingInfo().boundingBox.extendSizeWorld;
            assert(box, "the text is on screen");
            return box.y;
        };
        // twice the share of the node's height, about twice as tall (the box adds the same margin round each)
        assert.closeTo(tall(big) / tall(small), 2, 0.2);

        await styleEveryNode(graph, { "node.shapeTexts": "[]" }, "no texts");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(node.shapeTextLabels.length, 0);
    });
});
