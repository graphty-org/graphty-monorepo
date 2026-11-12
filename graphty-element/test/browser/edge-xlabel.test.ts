/**
 * An edge's external label (`edge.xlabel`, Graphviz's `xlabel` beside a `label`): a second label beside the line's
 * middle, in the label's look, up and left of the middle by default and centered where its location and offsets put
 * it (issue #5288).
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, styleEveryEdge } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Wait until what the layers ask for is drawn.
 * @param g - The graph.
 */
async function drawn(g: Graph): Promise<void> {
    await operationQueueOf(g).waitForCompletion();
    await g.waitForStableFrame();
}

describe("an edge's external label", () => {
    test("is drawn beside the line's middle with the label, in the label's look, and taken down with its words", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNode(asData({ id: "A", position: { x: -5, y: 0, z: 0 } }));
        await graph.addNode(asData({ id: "B", position: { x: 5, y: 0, z: 0 } }));
        await graph.addEdge(asData({ source: "A", target: "B" }), { source: "source", target: "target" });
        await styleEveryEdge(graph, {
            "edge.label": "inside",
            "edge.labelColor": "#ff0000",
            "edge.xlabel": "outside",
        });
        await drawn(graph);
        const edge = [...graph.getDataManager().edges.values()][0];
        assert(edge.label, "the label is still drawn");
        const x = edge.xlabelLabel;
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
        // up and left of the line's middle: its lower right corner on the middle
        assert.closeTo(at.x + box.x, 0, 0.05);
        assert.closeTo(at.y - box.y, 0, 0.05);

        // a location and offsets of its own: centered 3 right and 1 up of the middle
        await styleEveryEdge(
            graph,
            { "edge.xlabelLocation": "center", "edge.xlabelOffsetX": 3, "edge.xlabelOffsetY": -1 },
            "placed",
        );
        await drawn(graph);
        const placed = edge.xlabelLabel?.labelMesh?.getAbsolutePosition();
        assert(placed, "the external label is still on screen");
        assert.closeTo(placed.x, 3, 0.05);
        assert.closeTo(placed.y, 1, 0.05);

        await styleEveryEdge(graph, { "edge.xlabelStyle": { enabled: false } }, "switched off");
        await drawn(graph);
        assert.isNull(edge.xlabelLabel);
        assert(edge.label, "the label stays");
    });
});
