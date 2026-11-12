/**
 * A node's external label (`node.xlabel`, Graphviz's `xlabel`): a second label outside the node, in the label's look,
 * against its top left corner by default and centered where its location and offsets put it (issue #5263).
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

describe("a node's external label", () => {
    test("is drawn beside the node, in the label's look, where its style puts it, and taken down with its words", async () => {
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
            "node.label": "inside",
            "node.labelColor": "#ff0000",
            "node.labelLocation": "center",
            "node.xlabel": "outside",
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const node = graph.getDataManager().nodes.get("R");
        assert(node, "the node is drawn");
        const x = node.xlabelLabel;
        assert(x, "the external label is drawn");
        assert.strictEqual(
            x.textRuns
                .flat()
                .map((r) => r.text)
                .join(""),
            "outside",
        );
        assert.strictEqual(x.textRuns[0][0].style.color, "#ff0000", "in the label's color");
        const mesh = x.labelMesh;
        assert(mesh, "the external label is on screen");
        const at = mesh.getAbsolutePosition();
        const box = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        const half = node.drawnHalfExtents;
        // against the node's top left corner, outside it: its lower right corner on the corner
        assert.closeTo(at.x + box.x, -half.x, 0.05 * half.x);
        assert.closeTo(at.y - box.y, half.y, 0.05 * half.y);

        // a location and offsets of its own: centered 3 right and 1 up of the node's center
        await styleEveryNode(
            graph,
            { "node.xlabelLocation": "center", "node.xlabelOffsetX": 3, "node.xlabelOffsetY": -1 },
            "placed",
        );
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const placed = node.xlabelLabel?.labelMesh?.getAbsolutePosition();
        assert(placed, "the external label is still on screen");
        assert.closeTo(placed.x, 3, 0.05);
        assert.closeTo(placed.y, 1, 0.05);

        await styleEveryNode(graph, { "node.xlabelStyle": { enabled: false } }, "switched off");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.isUndefined(node.xlabelLabel);
    });
});
