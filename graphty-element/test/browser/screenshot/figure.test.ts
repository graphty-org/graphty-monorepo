/**
 * @file A vector figure (`exportFigure`, issue #819) draws each node where and in the color the
 * canvas draws it, keeps labels and the key as text, and fails with a code for a format it does
 * not write.
 */

import { afterEach, assert, test } from "vitest";

import { GraphtyError } from "../../../src/errors";
import type { Graph } from "../../../src/Graph";
import { exportFigure } from "../../../src/screenshot/figure";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

afterEach(() => {
    cleanupTestGraphWithData(graph);
});

/**
 * The figure as a document.
 * @param blob - The SVG file.
 * @returns Its root.
 */
async function parse(blob: Blob): Promise<SVGSVGElement> {
    const doc = new DOMParser().parseFromString(await blob.text(), "image/svg+xml");
    assert.equal(doc.querySelector("parsererror"), null, "well-formed SVG");
    return doc.documentElement as unknown as SVGSVGElement;
}

test("each node is drawn where and in the color the canvas draws it, and its label is text", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Labelled red",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff0000", "node.label": "N" },
    });
    await graph.waitForStableFrame();

    const figure = exportFigure(graph);
    assert.equal(figure.blob.type, "image/svg+xml");
    const svg = await parse(figure.blob);
    assert.equal(svg.getAttribute("width"), String(figure.width));

    const shapes = [...svg.querySelectorAll("circle, polygon")];
    assert.equal(shapes.length, 3, "one shape per node");
    for (const shape of shapes) {
        assert.equal(shape.getAttribute("fill"), "rgb(255,0,0)");
    }
    for (const id of ["1", "2", "3"]) {
        const at = graph.nodeScreenPosition(id);
        assert.ok(at?.visible);
        const near = shapes.some((shape) => {
            if (shape.tagName === "circle") {
                const dx = Number(shape.getAttribute("cx")) - at.x;
                const dy = Number(shape.getAttribute("cy")) - at.y;
                return Math.hypot(dx, dy) < 0.5;
            }
            const points = (shape.getAttribute("points") ?? "").split(" ").map((p) => p.split(",").map(Number));
            const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
            const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
            return Math.hypot(cx - at.x, cy - at.y) < at.radius;
        });
        assert.ok(near, `node ${id} drawn at its screen position`);
    }

    assert.equal(svg.querySelectorAll("line").length, 2, "one line per edge");
    const words = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    assert.equal(words.filter((w) => w === "N").length, 3, "every label is text");
});

test("the key is drawn as text in its corner", async () => {
    graph = await createTestGraphWithData();

    const svg = await parse(
        exportFigure(graph, { legend: [{ title: "Group", rows: [{ label: "First", color: "#00ff00" }] }] }).blob,
    );
    const words = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    assert.includeMembers(words, ["Group", "First"]);
    assert.ok(svg.querySelector('rect[fill="#00ff00"]'), "the row's chip");
});

test("an unknown format fails with E_BAD_COMMAND naming the field", async () => {
    graph = await createTestGraphWithData();

    try {
        exportFigure(graph, { format: "pdf" as "svg" });
        assert.fail("expected a throw");
    } catch (error) {
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_BAD_COMMAND");
        assert.equal(error.details?.field, "format");
    }
});
