/**
 * `shape.labelTable`: a label drawn as a table of cells, as Graphviz draws an HTML-like `<TABLE>` label
 * (dot-specimen-labels-p2 `html-td-rowspan`: "a" over two rows beside "b" over "c"). The node grows round the table,
 * each cell's words are drawn in its place, and the label's own words are not drawn.
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

/**
 * A cell holding one word.
 * @param text - the word
 * @param more - its other fields
 * @returns the cell
 */
const cell = (text: string, more: object = {}): object => ({ lines: [{ text }], ...more });

describe("a node's table label", () => {
    test("grows the node round the table, draws each cell's words in its place and its outline", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNode(asData({ id: "T", position: { x: 0, y: 0, z: 0 } }));
        const table = {
            cellBorder: 0.1,
            cellSpacing: 0.2,
            cellPadding: 0.2,
            rows: [{ cells: [cell("a", { rowspan: 2, width: 3 }), cell("b")] }, { cells: [cell("c")] }],
        };
        await styleEveryNode(graph, {
            "node.shape": "rectangle",
            "node.width": 0,
            "node.height": 0,
            "node.label": "a b c",
            "node.labelFit": "bounds",
            "node.borderColor": "#000000",
            "node.labelTable": JSON.stringify(table),
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const node = graph.getDataManager().nodes.get("T");
        assert(node, "the node is drawn");
        assert.isUndefined(node.label, "the label's own words are drawn in the cells instead");
        const words = node.shapeTextLabels.map((t) =>
            t.textRuns
                .flat()
                .map((r) => r.text)
                .join(""),
        );
        assert.deepEqual(words, ["a", "b", "c"]);
        const [a, b, c] = node.shapeTextLabels.map((t) => t.labelMesh?.getAbsolutePosition());
        assert(a && b && c, "every word is on screen");
        // "a" spans both rows, on their middle; "b" above "c", both right of "a"
        assert.closeTo(a.y, (b.y + c.y) / 2, 0.01);
        assert.isAbove(b.y, c.y);
        assert.isAbove(b.x, a.x);
        assert.closeTo(b.x, c.x, 0.01);
        // the node is the table: wider than the 3 its first column asks for, and outlined cell by cell
        const half = node.drawnHalfExtents;
        assert.isAbove(2 * half.x, 3);
        const outlines = (): number =>
            node.mesh
                .getChildMeshes()
                .map((m) => ("sourceMesh" in m ? (m as { sourceMesh: typeof m }).sourceMesh : m))
                .filter((m) => m.name === "node-decoration").length;
        assert.isAbove(outlines(), 0, "the cells' outlines are drawn over the node");

        await styleEveryNode(graph, { "node.labelTable": "" }, "no table");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(node.shapeTextLabels.length, 0);
        assert.strictEqual(outlines(), 0, "no cells, no outlines");
        assert.isDefined(node.label, "without a table the label draws its own words");
    });

    test("fills the table and its cells under their outlines, and draws a cell's picture in its cell", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNode(asData({ id: "T", position: { x: 0, y: 0, z: 0 } }));
        // a 20 x 10 picture
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>';
        const picture = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        const table = {
            cellBorder: 0,
            cellSpacing: 0,
            cellPadding: 0,
            fill: "#ffffe0",
            rows: [
                {
                    cells: [
                        cell("a", { fill: "#4477aa", width: 2, height: 2 }),
                        { image: { src: picture, scale: "true" }, width: 4, height: 2, fixedSize: true },
                    ],
                },
            ],
        };
        await styleEveryNode(graph, {
            "node.shape": "rectangle",
            "node.width": 0,
            "node.height": 0,
            "node.label": "a",
            "node.labelFit": "bounds",
            "node.color": "transparent",
            "node.labelTable": JSON.stringify(table),
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const node = graph.getDataManager().nodes.get("T");
        assert(node, "the node is drawn");
        const pieces = node.decorationPieces;
        const bodies = pieces.filter((p) => p.kind === "body").map((p) => p.box);
        const half = node.drawnHalfExtents;
        // the table's background over the whole node (its corners are kept to 6 places of the node's half sides), then the first cell's over its third of it
        assert.lengthOf(bodies, 2);
        assert.approximately(bodies[0].x1 - bodies[0].x0, 2 * half.x, 1e-4);
        assert.approximately(bodies[1].x1 - bodies[1].x0, (2 * half.x) / 3, 1e-4);
        const image = pieces.find((p) => p.kind === "image");
        assert(image, "the cell's picture is drawn");
        // contained in the second cell (two thirds of the node, right of the first) in its own proportions
        const { x0, x1, y0, y1 } = image.box;
        assert.approximately(x1 - x0, 2 * (y1 - y0), 1e-4);
        assert.approximately((x0 + x1) / 2, half.x / 3, 1e-4);
        assert.approximately((y0 + y1) / 2, 0, 1e-4);
        assert.approximately(x1, half.x, 1e-4);
    });
});
