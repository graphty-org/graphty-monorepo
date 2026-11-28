/**
 * @file A vector figure (`exportFigure`, issue #819) draws each node where and in the color the
 * canvas draws it, with its border, each edge along its curve and stopped at its arrowheads, each label over its
 * solid or gradient panel, draws picture arrowheads as their pictures, stops a pulled, patterned or row line at a
 * translucent node's outline, keeps labels (canvas- or glyph-drawn), node glyphs and the key as text, and fails with a code for a format it does
 * not write.
 */

import { afterEach, assert, test } from "vitest";

import { GraphtyError } from "../../../src/errors";
import { Graph } from "../../../src/Graph";
import { pulledEdgesDefault } from "../../../src/meshes/PulledLineBatch";
import { exportFigure } from "../../../src/screenshot/figure";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

afterEach(() => {
    pulledEdgesDefault.value = false;
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

    const figure = await exportFigure(graph);
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
        (await exportFigure(graph, { legend: [{ title: "Group", rows: [{ label: "First", color: "#00ff00" }] }] }))
            .blob,
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

    const svg = await parse((await exportFigure(graph)).blob);
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

test("a label's gradient background is a box filled with its gradient, in SVG and PDF", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Labelled on red to blue",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.label": "N",
            "node.labelStyle": {
                gradient: true,
                gradientColors: ["#ff0000", "#0000ff"],
                gradientDirection: "horizontal",
            },
        },
    });
    await graph.waitForStableFrame();

    const svg = await parse((await exportFigure(graph)).blob);
    const boxes = [...svg.querySelectorAll('rect[fill^="url(#graphty-panel-"]')];
    assert.equal(boxes.length, 3, "one box per label");
    for (const box of boxes) {
        const id = /url\(#(.+)\)/.exec(box.getAttribute("fill") ?? "")?.[1] ?? "";
        const ramp = svg.querySelector(`linearGradient[id="${id}"]`);
        assert.ok(ramp, "the box's gradient is in the file");
        const stops = [...(ramp?.querySelectorAll("stop") ?? [])].map((s) => s.getAttribute("stop-color"));
        assert.deepEqual(stops, ["#ff0000", "#0000ff"]);
        const left = Number(box.getAttribute("x"));
        const right = left + Number(box.getAttribute("width"));
        assert.closeTo(Number(ramp?.getAttribute("x1")), left, 1, "red at the box's left");
        assert.closeTo(Number(ramp?.getAttribute("x2")), right, 1, "blue at its right");
        assert.equal(ramp?.getAttribute("y1"), ramp?.getAttribute("y2"), "running across it");
    }

    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.equal(pdf.match(/ re\nW n/g)?.length, 3, "each label's bands are cut to its box");
    assert.include(pdf, "1 0 0 rg", "its red end");
    assert.include(pdf, "0 0 1 rg", "its blue end");
    assert.match(pdf, /\n0\.\d+ 0 0\.\d+ rg\n/, "and the blend between");
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

    const figure = await exportFigure(graph, {
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

    for (const blob of [(await exportFigure(graph)).blob]) {
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
    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.include(pdf, "1 0 1 rg", "the arrowheads are filled magenta in the PDF");
});

/**
 * A figure's edge lines as the points each is drawn through.
 * @param svg - The figure.
 * @returns One list of points per line or polyline.
 */
function edgePaths(svg: SVGSVGElement): number[][][] {
    return [...svg.querySelectorAll("line, polyline")].map((line) =>
        line.tagName === "line"
            ? [
                  [Number(line.getAttribute("x1")), Number(line.getAttribute("y1"))],
                  [Number(line.getAttribute("x2")), Number(line.getAttribute("y2"))],
              ]
            : (line.getAttribute("points") ?? "").split(" ").map((p) => p.split(",").map(Number)),
    );
}

/**
 * How far a point is from the straight line through two others.
 * @param p - The point.
 * @param a - One end of the line.
 * @param b - The other.
 * @returns The distance.
 */
function offLine(p: number[], a: number[], b: number[]): number {
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    return Math.abs(cross) / Math.hypot(b[0] - a[0], b[1] - a[1]);
}

// with no head, on renderPath "batched" a curve is drawn with no `Edge`, from its rows (issue #10046)
test.each([
    ["with its head", {}],
    ["with no head", { "edge.arrowHead": "none" }],
] as const)("a curved edge %s is drawn along the curve the canvas draws", async (_, head) => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Curved",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.curvature": true, ...head },
    });
    await graph.waitForStableFrame();

    const paths = edgePaths(await parse((await exportFigure(graph)).blob));
    assert.equal(paths.length, 2, "one line per edge");
    for (const [path, [from, to]] of paths.map(
        (p, i) =>
            [
                p,
                [
                    ["1", "2"],
                    ["2", "3"],
                ][i],
            ] as const,
    )) {
        const a = graph.nodeScreenPosition(from);
        const b = graph.nodeScreenPosition(to);
        assert.ok(a?.visible && b?.visible);
        assert.isAbove(path.length, 2, "drawn through the curve's points");
        const bow = Math.max(...path.map((p) => offLine(p, [a.x, a.y], [b.x, b.y])));
        assert.isAbove(bow, 2, `edge ${from}-${to} bows off the straight line between its nodes`);
    }
    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.equal(
        pdf.match(/ m\n(?:[^\n]+ l\n){2,}S\n/g)?.length,
        2,
        "each edge is one stroke through its curve in the PDF",
    );
});

test("an edge's line stops at its arrowhead instead of running to the node's center", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Arrows",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "normal" },
    });
    await graph.waitForStableFrame();

    const paths = edgePaths(await parse((await exportFigure(graph)).blob));
    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.equal(paths.length, 2, "one line per edge");
    for (const [path, target] of paths.map((p, i) => [p, ["2", "3"][i]] as const)) {
        const at = graph.nodeScreenPosition(target);
        assert.ok(at?.visible);
        const [x, y] = path.at(-1) ?? [];
        assert.isAbove(Math.hypot(x - at.x, y - at.y), at.radius, `the line to node ${target} ends outside it`);
        const ends = [...pdf.matchAll(/(-?[\d.]+) (-?[\d.]+) l\nS\n/g)].map((m) => [Number(m[1]), Number(m[2])]);
        const height = Number(/\/MediaBox \[0 0 [\d.]+ ([\d.]+)\]/.exec(pdf)?.[1]);
        const same = ends.some(([px, py]) => Math.hypot(px - x, height - py - y) < 0.05);
        assert.ok(same, `the PDF's line to node ${target} ends at the same point`);
    }
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

    const svg = await parse((await exportFigure(graph)).blob);
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

test("a node's glyph is text in its color, centered on the node at the size the canvas draws it, in SVG and PDF", async () => {
    graph = await createTestGraphWithData();
    // Flat, so the glyph's face and the node's center are one point on screen.
    await graph.setViewMode("2d");
    await graph.getSession().styles.add({
        name: "Glyph G",
        target: "node",
        selector: { match: "everything" },
        set: { "node.glyph": "G", "node.glyphColor": "#ff00ff" },
    });
    await graph.waitForStableFrame();

    const svg = await parse((await exportFigure(graph)).blob);
    const glyphs = [...svg.querySelectorAll("text")].filter((t) => t.textContent === "G");
    assert.equal(glyphs.length, 3, "one glyph per node");
    for (const id of ["1", "2", "3"]) {
        const at = graph.nodeScreenPosition(id);
        assert.ok(at?.visible);
        const centred = glyphs.find((t) => {
            const span = t.querySelector("tspan");
            return Math.hypot(Number(span?.getAttribute("x")) - at.x, Number(span?.getAttribute("y")) - at.y) < 0.5;
        });
        assert.ok(centred, `node ${id}'s glyph is centered on it`);
        assert.equal(centred.getAttribute("fill"), "#ff00ff");
        // Unsized, the glyph's font is as tall as the node's face is wide.
        const size = Number(centred.getAttribute("font-size"));
        assert.closeTo(size, at.radius * 2, at.radius * 0.2, "the glyph's font size is the node's width on screen");
    }

    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.equal(pdf.match(/\(G\) Tj/g)?.length, 3, "every glyph is text in the PDF");
});

test("labels drawn from the glyph atlas are text", async () => {
    graph = await createTestGraphWithData();
    graph.setLayoutBehavior({ labels: { labelText: "glyphs" } });
    await graph.getSession().styles.add({
        name: "Labelled",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "N" },
    });
    await graph.waitForStableFrame();
    assert.equal(graph.getNode("1")?.label?.drawnBy, "glyphs");

    const svg = await parse((await exportFigure(graph)).blob);
    const words = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    assert.equal(words.filter((w) => w === "N").length, 3, "every glyph-drawn label is text");
});

// a 16 x 16 red triangle pointing right, written out as text, as vis-network files carry it
const PICTURE =
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20" +
    "height%3D%2216%22%3E%3Cpath%20d%3D%22M0%200%20L16%208%20L0%2016%20Z%22%20fill%3D%22%23d62728%22%2F%3E%3C%2Fsvg%3E";

test("a picture arrowhead is its picture, its top edge at the target's outline, in SVG and PDF", async () => {
    graph = await createTestGraphWithData();
    await graph.getSession().styles.add({
        name: "Picture arrows",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "image", "edge.arrowHeadImage": PICTURE },
    });
    await graph.waitForStableFrame();

    const svg = await parse((await exportFigure(graph)).blob);
    const images = [...svg.querySelectorAll("image")];
    assert.equal(images.length, 2, "one picture per edge");
    for (const [image, target] of images.map((im, i) => [im, ["2", "3"][i]] as const)) {
        assert.equal(image.getAttribute("href"), PICTURE);
        const [a, b, c, d, e, f] = (/matrix\(([^)]+)\)/.exec(image.getAttribute("transform") ?? "")?.[1] ?? "")
            .split(" ")
            .map(Number);
        const at = graph.nodeScreenPosition(target);
        assert.ok(at?.visible);
        // The middle of the picture's top edge is the cap's tip; its side runs back along the line.
        const tip = Math.hypot(e + a / 2 - at.x, f + b / 2 - at.y);
        assert.closeTo(tip, at.radius, at.radius * 0.25, `node ${target}'s picture tip on its outline`);
        const back = Math.hypot(e + a / 2 + c - at.x, f + b / 2 + d - at.y);
        assert.isAbove(back, tip, "the picture stands back from the node along the line");
    }

    const pdf = new TextDecoder("latin1").decode(
        await (await exportFigure(graph, { format: "pdf" })).blob.arrayBuffer(),
    );
    assert.equal(pdf.match(/\/Im0 Do/g)?.length, 2, "each arrowhead paints the picture");
    assert.equal(pdf.match(/\/Subtype \/Image \/Width 16 \/Height 16/g)?.length, 2, "its color and its alpha, once");
    assert.include(pdf, "/XObject << /Im0 5 0 R >>");
});

/**
 * How far each end of each of the figure's lines is from the nearer of its two nodes' centers, over that node's
 * radius on screen.
 * @param svg - The figure.
 * @returns One pair per line.
 */
function endReach(svg: SVGSVGElement): number[][] {
    const ends = [
        ["1", "2"],
        ["2", "3"],
    ];
    return edgePaths(svg).map((path, i) =>
        [path[0], path.at(-1) ?? []].map(([x, y], j) => {
            const at = graph.nodeScreenPosition(ends[i][j]);
            assert.ok(at?.visible);
            return Math.hypot(x - at.x, y - at.y) / at.radius;
        }),
    );
}

/** Asserts the figure draws one line per edge, each end on its node's outline. */
async function assertEndsOnOutlines(): Promise<void> {
    const reach = endReach(await parse((await exportFigure(graph)).blob));
    assert.equal(reach.length, 2, "one line per edge");
    for (const r of reach.flat()) {
        assert.closeTo(r, 1, 0.25, "each end on its node's outline, not at its center");
    }
}

/**
 * Shows the graph flat, paints every node at half opacity and every edge with no cap, and waits for the picture.
 * @param line - The edge style's further channels.
 */
async function translucentNodes(line: Record<string, string> = {}): Promise<void> {
    // Flat, so a node's outline is its radius on screen in every direction.
    await graph.setViewMode("2d");
    await graph.getSession().styles.add({
        name: "Half seen",
        target: "node",
        selector: { match: "everything" },
        set: { "node.opacity": 0.5 },
    });
    await graph.getSession().styles.add({
        name: "Bare lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none", ...line },
    });
    await graph.waitForStableFrame();
}

for (const [name, setUp, line, counts] of [
    ["a pulled line", () => (pulledEdgesDefault.value = true), {}, { pulledEdges: 2 }],
    ["a patterned line", () => undefined, { "edge.style": "dash" }, { objectEdges: 2 }],
] as const) {
    test(`${name} stops at a translucent node's outline`, async () => {
        setUp();
        graph = await createTestGraphWithData();
        await translucentNodes(line);
        // on renderPath "batched" a dashed line is a row line drawn from the row table, with no `Edge`
        const patternedRowLine = graph.renderPath === "batched" && "objectEdges" in counts;
        assert.deepInclude(graph.rowCounts, patternedRowLine ? { objectEdges: 0 } : counts);

        await assertEndsOnOutlines();
    });
}

test("a row line drawn with no Edge stops at a translucent node's outline", async () => {
    const container = document.createElement("div");
    container.id = "test-graph-container-screenshot";
    container.style.cssText = "width:800px;height:600px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    graph.setRenderPath("batched");
    await translucentNodes();
    const data = graph.getDataManager();
    data.addNode({ id: "1" });
    data.addNode({ id: "2" });
    data.addNode({ id: "3" });
    data.addEdge({ src: "1", dst: "2" });
    data.addEdge({ src: "2", dst: "3" });
    await graph.setLayout("fixed");
    await graph.waitForStableFrame();
    assert.equal(graph.rowCounts.objectEdges, 0, "no edge is an Edge");

    await assertEndsOnOutlines();
});

test("an unknown format fails with E_BAD_COMMAND naming the field", async () => {
    graph = await createTestGraphWithData();

    try {
        await exportFigure(graph, { format: "png" as "svg" });
        assert.fail("expected a throw");
    } catch (error) {
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_BAD_COMMAND");
        assert.equal(error.details?.field, "format");
    }
});
