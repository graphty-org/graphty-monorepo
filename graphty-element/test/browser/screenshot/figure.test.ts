/**
 * @file A vector figure (`exportFigure`, issue #819) draws each node where and in the color the
 * canvas draws it, with its border and each edge's arrowheads, keeps labels and the key as text, and fails with a code for a format it does
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

test("a label's solid background is a box behind its text", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Labelled on blue",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "N", "node.labelBackground": "#0000ff" },
    });
    await graph.waitForStableFrame();

    const svg = await parse(exportFigure(graph).blob);
    const boxes = [...svg.querySelectorAll('rect[fill="rgb(0,0,255)"]')];
    assert.equal(boxes.length, 3, "one box per label");
    const texts = [...svg.querySelectorAll("text")].filter((t) => t.textContent === "N");
    for (const text of texts) {
        const x = Number(text.querySelector("tspan")?.getAttribute("x"));
        const inside = boxes.some((box) => {
            const left = Number(box.getAttribute("x"));
            return x > left && x < left + Number(box.getAttribute("width"));
        });
        assert.ok(inside, "the text sits on a box");
    }
});

test("a PDF figure is one page the canvas's size with the labels and the key as text", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Labelled",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "N(1)" },
    });
    await graph.waitForStableFrame();

    const figure = exportFigure(graph, {
        format: "pdf",
        legend: [{ title: "Group", rows: [{ label: "First", color: "#00ff00" }] }],
    });
    assert.equal(figure.blob.type, "application/pdf");
    const pdf = new TextDecoder("latin1").decode(await figure.blob.arrayBuffer());
    assert.ok(pdf.startsWith("%PDF-1.4"));
    assert.include(pdf, `/MediaBox [0 0 ${String(Math.round(figure.width * 100) / 100)} `);
    assert.equal(pdf.match(/\(N\\\(1\\\)\) Tj/g)?.length, 3, "every label is text, its brackets escaped");
    assert.include(pdf, "(Group) Tj");
    assert.include(pdf, "(First) Tj");
    // The cross-reference table points at each object.
    const xref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    assert.ok(pdf.slice(xref).startsWith("xref"));
    const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    assert.equal(offsets.length, 4);
    offsets.forEach((offset, i) => {
        assert.ok(
            pdf.slice(offset).startsWith(`${String(i + 1)} 0 obj`),
            `object ${String(i + 1)} where the table says`,
        );
    });
});

/**
 * A path's corners, as `M x yLx yLx yZ` writes them.
 * @param path - The path.
 * @returns Every corner of its triangles.
 */
function corners(path: Element): number[][] {
    return [...(path.getAttribute("d") ?? "").matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [
        Number(m[1]),
        Number(m[2]),
    ]);
}

test("each arrowhead is drawn in its color with its tip at its target node", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Magenta arrows",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "normal", "edge.arrowHeadColor": "#ff00ff" },
    });
    await graph.waitForStableFrame();

    for (const blob of [exportFigure(graph).blob]) {
        const svg = await parse(blob);
        const heads = [...svg.querySelectorAll('path[fill="#ff00ff"]')];
        assert.equal(heads.length, 2, "one arrowhead per edge");
        for (const [head, target] of heads.map((h, i) => [h, ["2", "3"][i]] as const)) {
            const at = graph.nodeScreenPosition(target);
            assert.ok(at?.visible);
            const nearest = Math.min(...corners(head).map(([x, y]) => Math.hypot(x - at.x, y - at.y)));
            assert.closeTo(nearest, at.radius, at.radius * 0.25, `node ${target}'s arrowhead tip on its outline`);
        }
    }
    const pdf = new TextDecoder("latin1").decode(await exportFigure(graph, { format: "pdf" }).blob.arrayBuffer());
    assert.include(pdf, "1 0 1 rg", "the arrowheads are filled magenta in the PDF");
});

test("a node's border is a ring in its color around the node", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Green borders",
        target: "node",
        selector: { match: "everything" },
        set: { "node.borderColor": "#00ff00", "node.borderWidth": 0.2 },
    });
    await graph.waitForStableFrame();

    const svg = await parse(exportFigure(graph).blob);
    const rings = [...svg.querySelectorAll('path[fill="rgb(0,255,0)"]')];
    assert.equal(rings.length, 3, "one ring per node");
    for (const id of ["1", "2", "3"]) {
        const at = graph.nodeScreenPosition(id);
        assert.ok(at?.visible);
        const around = rings.some((ring) => {
            const reach = corners(ring).map(([x, y]) => Math.hypot(x - at.x, y - at.y));
            return Math.min(...reach) >= at.radius * 0.7 && Math.max(...reach) <= at.radius * 2;
        });
        assert.ok(around, `node ${id}'s ring sits around it`);
    }
});

test("an unknown format fails with E_BAD_COMMAND naming the field", async () => {
    graph = await createTestGraphWithData();

    try {
        exportFigure(graph, { format: "png" as "svg" });
        assert.fail("expected a throw");
    } catch (error) {
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_BAD_COMMAND");
        assert.equal(error.details?.field, "format");
    }
});
