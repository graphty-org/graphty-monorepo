/**
 * JSON styles: each dialect read as the program that draws it draws it (Cytoscape.js stylesheets, graphology keys as
 * sigma.js draws them, vis.js keys, options and groups, NetworkX's defaults), the files graph-io read wrongly before,
 * and styles written back into every dialect and read back as the same rules.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import {
    cyjsRendered,
    type ExtractedStyles,
    resolveStyles,
    STYLE_BLOCK_NAME,
    StyleNotes,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
} from "../../../src/styles/internal.js";
import { editJsonNodeFill, replaceJsonBlock } from "../../styles/formats/json.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/json");
const GENERATED = join(CORPUS, "generated");
const CONFORMANCE = resolve(import.meta.dirname, "../../conformance/fixtures/json");

/**
 * A corpus or fixture file's bytes, decompressed when stored as `.gz`.
 * @param path - the file
 * @returns the bytes
 */
function bytesOf(path: string): Uint8Array {
    const raw = readFileSync(path);
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * Imports a JSON document with its styles.
 * @param doc - the document, as text, bytes or a value
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array | object) {
    const input = typeof doc === "string" || doc instanceof Uint8Array ? doc : JSON.stringify(doc);
    const result = await registry.importGraph(input, { format: "json", styles: true, errorLimit: Infinity });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * Values of a property by node or edge index.
 * @param r - an import result with styles
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values
 */
function values(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: string): unknown[] {
    return [...resolveStyles(r.styles, target, property as StyleProperty, r.snapshot)];
}

/**
 * The rules as plain JSON with their members in key order, so two reads compare equal when the rules are the same.
 * @param ex - the styles
 * @returns the rules
 */
function rulesOf(ex: ExtractedStyles): unknown {
    const sort = (v: unknown): unknown => {
        if (Array.isArray(v)) {
            return v.map(sort);
        }
        if (v !== null && typeof v === "object") {
            return Object.fromEntries(
                Object.keys(v)
                    .sort()
                    .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
            );
        }
        return v;
    };
    return sort(JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[]);
}

describe("JSON files graph-io read wrongly before", () => {
    it("joins numeric Cytoscape.js endpoints with string node ids (karate: 34 nodes, not 68)", async () => {
        const { snapshot } = await load(bytesOf(join(CONFORMANCE, "networkx/karate.cytoscape.json")));
        expect(snapshot.nodeCount).toBe(34);
        expect(snapshot.edgeCount).toBe(78);
        // and the other way round: number ids named by text, a parent too
        const other = await load({
            elements: {
                nodes: [{ data: { id: 1 } }, { data: { id: 2, parent: "1" } }],
                edges: [{ data: { source: "1", target: "2" } }],
            },
        });
        expect(other.snapshot.nodeCount).toBe(2);
        expect(other.snapshot.edgeCount).toBe(1);
        expect(other.snapshot.nodes.value("parent", other.snapshot.ids.indexOf(2))).toBe(0);
    });

    it("gives Cytoscape.js elements without a data.id ids of their own, as Cytoscape.js does", async () => {
        const data = bytesOf(join(CORPUS, "cyjs-node-types-data.json"));
        expect((await load(data)).snapshot.nodeCount).toBe(26);
        const style = JSON.parse(readFileSync(join(CORPUS, "cyjs-node-types-cy-style.json"), "utf8")) as unknown;
        const r = await load({ elements: JSON.parse(new TextDecoder().decode(data)) as unknown, style });
        const types = Array.from({ length: r.snapshot.nodeCount }, (_v, i) => r.snapshot.nodes.value("type", i));
        const shapes = values(r, "node", "shape");
        expect(shapes[types.indexOf("triangle")]).toBe("triangle");
        expect(shapes[types.indexOf("diamond")]).toBe("diamond");
        expect(values(r, "node", "width").every((w) => w === 40)).toBe(true);
    });

    it("reads Gephi's JSON export for sigma.js: its nodes, their attributes and their colors", async () => {
        const r = await load(bytesOf(join(CORPUS, "vis-WorldCup2014.json.gz")));
        expect(r.snapshot.nodeCount).toBe(736);
        expect(r.snapshot.nodes.has("Modularity Class")).toBe(true);
        expect(r.snapshot.nodes.has("color#element")).toBe(false);
        expect(r.styles.styles.source.tool).toBe("sigma");
        const byClass = r.styles.styles.rules.filter(
            (rule) => rule.target === "node" && rule.map?.fill?.kind === "discrete",
        );
        expect(byClass.map((rule) => rule.map?.fill && "by" in rule.map.fill && rule.map.fill.by)).toEqual([
            { data: "Modularity Class" },
        ]);
        const i = r.snapshot.ids.indexOf("268");
        expect(values(r, "node", "fill")[i]).toBe("#e543a4");
    });

    it("reads Gephi's JSON export of a graph with no edges as Gephi's, with its positions, sizes and colors", async () => {
        const r = await load({
            edges: [],
            nodes: [{ label: "A", x: 10.0, y: -20.0, id: "a", attributes: {}, color: "rgb(255,0,0)", size: 18.0 }],
        });
        expect(r.styles.styles.source.tool).toBe("sigma");
        expect(values(r, "node", "fill")).toEqual(["#ff0000"]);
        expect(values(r, "node", "width")).toEqual([36]);
        expect(values(r, "node", "label")).toEqual(["A"]);
    });

    it("reads a Gephi column named like a key sigma.js draws as data, never as the element's own key", async () => {
        const r = await load({
            edges: [
                {
                    source: "a",
                    target: "b",
                    id: "0",
                    attributes: { color: "rgb(255,0,0)", size: "8" },
                    color: "rgb(1,2,3)",
                    size: 1.0,
                },
            ],
            nodes: [
                {
                    x: 0.0,
                    y: 0.0,
                    id: "a",
                    attributes: { label: "Column", color: "rgb(255,0,0)", x: "50" },
                    color: "rgb(1,2,3)",
                    size: 5.0,
                },
                { label: "B", x: 9.0, y: 0.0, id: "b", attributes: { size: "30" }, color: "rgb(1,2,3)", size: 5.0 },
            ],
        });
        expect(values(r, "node", "fill")).toEqual(["#010203", "#010203"]);
        expect(values(r, "node", "width")).toEqual([10, 10]);
        expect(values(r, "node", "label")).toEqual([null, "B"]);
        expect(values(r, "edge", "color")).toEqual(["#010203"]);
        expect(values(r, "edge", "width")).toEqual([0.5]);
        expect(r.snapshot.nodes.value("label#data", 0)).toBe("Column");
        expect(r.snapshot.nodes.value("x", 0)).toBe(0);
        expect(r.snapshot.edges.value("color#data", 0)).toBe("rgb(255,0,0)");
    });
});

describe("JSON styles: reading", () => {
    it("applies a Cytoscape.js stylesheet over Cytoscape.js's defaults, with an element's own style on top", async () => {
        const r = await load({
            elements: [
                { data: { id: "a" } },
                { data: { id: "b" }, classes: "big" },
                { data: { id: "c" }, style: { "background-color": "blue" } },
                { data: { id: "e", source: "a", target: "b" } },
            ],
            style: [
                { selector: "node", style: { "background-color": "red" } },
                { selector: ".big", style: { width: 50 } },
            ],
        });
        expect(r.styles.styles.source).toEqual({ format: "json", dialect: "cytoscape-js", tool: "cytoscape-js" });
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#ff0000", "#0000ff"]);
        expect(values(r, "node", "width")).toEqual([30, 50, 30]);
        expect(values(r, "edge", "width")).toEqual([3]);
    });

    it("reads a stylesheet written as text the same as one written as an array", async () => {
        const elements = [{ data: { id: "a", w: 12 } }, { data: { id: "b", w: 30 } }];
        const asText = await load({ elements, style: "node { width: data(w); background-color: #123456; }" });
        const asArray = await load({
            elements,
            style: [{ selector: "node", style: { width: "data(w)", "background-color": "#123456" } }],
        });
        expect(values(asText, "node", "width")).toEqual([12, 30]);
        expect(rulesOf(asText.styles)).toEqual(rulesOf(asArray.styles));
    });

    it("gives Cytoscape desktop's export without a stylesheet Cytoscape desktop's default style", async () => {
        const r = await load(bytesOf(join(CORPUS, "cyjs-genemania-export.json")));
        expect(r.styles.styles.source.tool).toBe("cytoscape");
        expect(new Set(values(r, "node", "fill"))).toEqual(new Set(["#89d0f5"]));
        expect(new Set(values(r, "node", "shape"))).toEqual(new Set(["round-rectangle"]));
    });

    it("reads graphology keys as sigma.js draws them, with sigma's defaults", async () => {
        const r = await load({
            attributes: {},
            options: { type: "directed" },
            nodes: [
                { key: "a", attributes: { color: "rgba(255,0,0,0.5)", size: 4, label: "A" } },
                { key: "b", attributes: { visibility: "hidden", hidden: true } },
            ],
            edges: [{ source: "a", target: "b", attributes: { color: "#00f", size: 2 } }],
        });
        expect(r.styles.styles.source.tool).toBe("sigma");
        expect(r.styles.styles.units.length).toBe("relative");
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#666666"]);
        expect(values(r, "node", "fillOpacity")[0]).toBe(127 / 255); // sigma keeps an alpha as a byte
        expect(values(r, "node", "width")).toEqual([8, 20]); // sigma draws size as a radius
        expect(values(r, "node", "label")[0]).toBe("A");
        // sigma 4 draws an element marked visibility "hidden" or hidden true: its default styles bind neither
        expect(values(r, "node", "visible")[1] ?? null).toBe(null);
        expect(values(r, "edge", "color")).toEqual(["#0000ff"]);
        expect(values(r, "edge", "width")).toEqual([1]); // sigma draws an edge half as wide as its size
    });

    it("reads colors and sizes with sigma.js's own rules: what it cannot read is black, a negative node size is no node", async () => {
        // graphology-specimen-node-fills-borders, -edges-lines-p2 and -node-sizes-opacity, drawn by sigma 4.0.1
        const colors = ["hsl(120,100%,25%)", "rgb( 25 , 130 , 196 )", "#f80c", "", "CornflowerBlue"];
        const r = await load({
            attributes: {},
            options: { type: "directed" },
            nodes: [
                ...colors.map((color, i) => ({ key: `n${i}`, attributes: { color, size: 4 } })),
                { key: "negative", attributes: { size: -10 } },
            ],
            edges: colors.map((color, i) => ({ source: "n0", target: `n${i}`, attributes: { color } })),
        });
        const read = ["#000000", "#000000", "#f80c00", "#000000", "#6495ed"];
        expect(values(r, "node", "fill").slice(0, 5)).toEqual(read);
        expect(values(r, "edge", "color")).toEqual(read);
        expect(values(r, "node", "width")[5]).toBe(0);
    });

    it("draws no edge labels and puts node labels right of and over the nodes, thinned by a 100 px grid, as sigma.js does", async () => {
        const r = await load({
            attributes: {},
            options: { type: "directed" },
            nodes: [
                { key: "a", attributes: { label: "A" } },
                { key: "b", attributes: { label: "B" } },
            ],
            edges: [{ source: "a", target: "b", attributes: { label: "a to b" } }],
        });
        // sigma.js's renderEdgeLabels is off by default, and a graphology document carries no settings
        expect(values(r, "edge", "label")).toEqual([null]);
        expect(values(r, "node", "label")).toEqual(["A", "B"]);
        expect(values(r, "node", "labelPosition")).toEqual(["right", "right"]);
        // sigma keeps one label per 100 px cell of its first framing (labelGridCellSize) and avoids no overlap
        expect(values(r, "node", "labelGridCellSize")).toEqual([100, 100]);
        expect(values(r, "node", "labelAvoidOverlap")).toEqual([null, null]);
        // sigma.js draws its labels after every node and edge
        expect(values(r, "node", "labelOnTop")).toEqual([true, true]);
    });

    it("draws a graphology edge half as wide as its size, and one without a size as of size 1, as sigma.js 4 does", async () => {
        const r = await load({
            options: { type: "directed" },
            nodes: [{ key: "a" }, { key: "b" }],
            edges: [
                { source: "a", target: "b", attributes: { color: "#ff0000" } },
                { source: "b", target: "a", attributes: { size: 3 } },
            ],
        });
        // graphology-specimen-arrows: sigma draws edge-size-6 3 px wide beside a node of size 6 drawn 5.8 px in radius,
        // and an edge without a size as one of size 1 (DEFAULT_EDGE_DISPLAY_DATA)
        expect(values(r, "edge", "width")).toEqual([0.5, 1.5]);
    });

    describe("graphology edge labels under sigma.js's settings (the sigmaSettings option)", () => {
        const doc = JSON.stringify({
            options: { type: "directed" },
            nodes: [
                { key: "a", attributes: { label: "a" } },
                { key: "b", attributes: { label: "b" } },
                { key: "c" },
                { key: "d", attributes: { label: "" } },
            ],
            edges: [
                { source: "a", target: "b", attributes: { label: "between labels" } },
                { source: "c", target: "a", attributes: { label: "bare end" } },
                { source: "a", target: "d", attributes: { label: "empty end" } },
            ],
        });
        const loadWith = async (sigmaSettings?: Record<string, unknown>) => {
            const r = await registry.importGraph(doc, { format: "json", styles: true, sigmaSettings });
            return { ...r, styles: r.styles as ExtractedStyles };
        };

        it("draws no edge label by default, as sigma's renderEdgeLabels is off (graphology-specimen-edge-labels)", async () => {
            expect(values(await loadWith(), "edge", "label")).toEqual([null, null, null]);
        });

        it("draws an edge's label between two labeled nodes with renderEdgeLabels (-edge-labels-p2)", async () => {
            const r = await loadWith({ renderEdgeLabels: true, stagePadding: 30 });
            expect(values(r, "edge", "label")).toEqual(["between labels", null, null]);
            // DEFAULT_EDGE_DISPLAY_DATA's labelColor, DEFAULT_EDGE_LABEL_SIZE, at the line's middle
            expect(values(r, "edge", "labelColor")).toEqual(["#666666", "#666666", "#666666"]);
            expect(values(r, "edge", "labelSize")).toEqual([12, 12, 12]);
            expect(values(r, "edge", "labelPosition")).toEqual(["center", "center", "center"]);
        });

        it("draws every edge's label with edgeLabelAnchors allNodes (-edge-labels-p3)", async () => {
            const r = await loadWith({ renderEdgeLabels: true, edgeLabelAnchors: "allNodes" });
            expect(values(r, "edge", "label")).toEqual(["between labels", "bare end", "empty end"]);
        });

        it("refuses settings sigma would not read", async () => {
            await expect(loadWith({ renderEdgeLabels: "yes" })).rejects.toThrow(/renderEdgeLabels/);
            await expect(loadWith({ edgeLabelAnchors: "some" })).rejects.toThrow(/edgeLabelAnchors/);
            await expect(
                registry.importGraph(doc, { format: "json", sigmaSettings: [] as unknown as Record<string, unknown> }),
            ).rejects.toThrow(/sigmaSettings/);
        });
    });

    it("draws a graphology label on one line, each newline or tab a space, as sigma.js's canvas text does", async () => {
        const r = await load({
            options: { type: "directed" },
            nodes: [{ key: "a", attributes: { label: "Line one\nLine two\tend\r\n" } }],
            edges: [],
        });
        expect(values(r, "node", "label")).toEqual(["Line one Line two end  "]);
    });

    it("hides a vis-network label drawn under 4 screen pixels, as its drawThreshold does", async () => {
        const r = await load({ nodes: [{ id: "a", label: "A" }], edges: [{ from: "a", to: "a", label: "loop" }] });
        expect(values(r, "node", "labelMinScreenSize")).toEqual([4]);
        expect(values(r, "edge", "labelMinScreenSize")).toEqual([4]);
    });

    it("reads vis.js font text as vis-network splits it, and draws no edge label whose font is text", async () => {
        const r = await load({
            nodes: [
                { id: "a", label: "A", font: "18px arial #2ca02c" },
                { id: "b", label: "B", font: "14px DejaVu Serif #2ca02c" },
            ],
            edges: [
                { from: "a", to: "b", label: "text", font: "18px arial #2ca02c" },
                { from: "a", to: "b", label: "object", font: { size: 18 } },
            ],
        });
        // size, face and color are the first three words: a two-word face leaves "Serif" as the color
        expect(values(r, "node", "labelFont")).toEqual(["arial", "DejaVu"]);
        expect(values(r, "node", "labelSize")).toEqual([18, 14]);
        expect(values(r, "node", "label")).toEqual(["A", "B"]);
        // vis-network 9.1.9 draws an edge label whose font is text off the canvas
        expect(values(r, "edge", "label")).toEqual(["", "object"]);
    });

    it("reads vis.js keys over its groups and options, with vis-network's defaults, palette and edge colors", async () => {
        const r = await load({
            nodes: [
                { id: "a", group: "g1" },
                { id: "b", group: "g2" },
                { id: "c", color: { background: "#00ff00" } },
                { id: "d", shape: "box" },
            ],
            edges: [
                { from: "a", to: "b" },
                { from: "b", to: "c", color: "blue" },
                { from: "c", to: "d", color: { inherit: "to" } },
            ],
            options: { nodes: { shape: "dot", size: 10 }, edges: { width: 2 }, groups: { g1: { color: "#ff0000" } } },
        });
        expect(r.styles.styles.source.tool).toBe("vis-network");
        // g1 as the file defines it; g2 from vis-network's palette; the rest vis-network's default
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#97c2fc", "#00ff00", "#97c2fc"]);
        // a text color's border is vis-network's darker shade of it
        expect(values(r, "node", "borderColor")).toEqual(["#cc0000", "#2b7ce9", "#2b7ce9", "#2b7ce9"]);
        // vis-network draws `size` as a radius; the box, which vis-network sizes by its label, grows to its label plus
        // the margin, and with no label to a 14 x 14 one (24 across)
        expect(values(r, "node", "width")).toEqual([20, 20, 20, 24]);
        expect(values(r, "node", "labelFit")).toEqual([null, null, null, "bounds"]);
        expect(values(r, "node", "shape")).toEqual(["ellipse", "ellipse", "ellipse", "round-rectangle"]);
        // vis-network draws a label below a dot and inside a box
        expect(values(r, "node", "labelPosition")).toEqual(["bottom", "bottom", "bottom", "center"]);
        // an edge without a color of its own takes its source node's border (its target's under inherit "to")
        expect(values(r, "edge", "color")).toEqual(["#cc0000", "#0000ff", "#2b7ce9"]);
        expect(values(r, "edge", "width")).toEqual([2, 2, 2]);
        const { rules } = r.styles.styles;
        expect(rules.find((x) => x.facts?.reason === "SOURCE_NODE_COLOR")).toMatchObject({ origin: "tool" });
        expect(rules.filter((x) => x.role === "group" && x.target === "node").map((x) => x.origin)).toEqual([
            "declared",
            "tool",
        ]);
        expect(rules.find((x) => x.id === "node.vis.defaults")?.set).toMatchObject({ shape: "ellipse", width: 20 });
    });

    it("draws vis.js image nodes as their picture, a circular image cut to its circle, a broken one's in its place", async () => {
        const r = await load({
            nodes: [
                { id: "a", shape: "image", image: "a.png", size: 10 },
                { id: "b", shape: "circularImage", image: { unselected: "b.png" }, brokenImage: "x.png" },
                {
                    id: "c",
                    shape: "image",
                    image: "c.png",
                    shapeProperties: { useBorderWithImage: true, useImageSize: true },
                },
                { id: "d", shape: "image", brokenImage: "x.png", shapeProperties: { interpolation: false } },
                { id: "e", shape: "box" },
            ],
            edges: [{ from: "a", to: "e" }],
        });
        expect(values(r, "node", "image")).toEqual(["a.png", "b.png", "c.png", "x.png", null]);
        expect(values(r, "node", "imageFallback")).toEqual([null, "x.png", null, null, null]);
        expect(values(r, "node", "imageFit")).toEqual(["cover", "cover", "none", "cover", null]);
        expect(values(r, "node", "imageClip")).toEqual(["none", "node", "none", "none", null]);
        expect(values(r, "node", "imageSmoothing")).toEqual([null, null, null, false, null]);
        expect(values(r, "node", "shape").slice(0, 4)).toEqual(["none", "ellipse", "rectangle", "none"]);
        // the picture's shorter side is the node's 2 * size square
        expect(values(r, "node", "width")[0]).toBe(20);
    });

    it("keeps a vis.js picture inside its padding, at its top left corner and faded with its node; turns triangleDown over", async () => {
        const r = await load({
            nodes: [
                { id: "a", shape: "image", image: "a.png", size: 10, imagePadding: 2 },
                {
                    id: "b",
                    shape: "image",
                    image: "b.png",
                    size: 10,
                    imagePadding: { top: 2, right: 10, bottom: 6 },
                    shapeProperties: { useBorderWithImage: true },
                },
                {
                    id: "c",
                    shape: "image",
                    image: "c.png",
                    size: 10,
                    shapeProperties: { coordinateOrigin: "top-left" },
                },
                { id: "d", shape: "image", image: "d.png", opacity: 0.4 },
                { id: "e", shape: "triangleDown" },
            ],
            edges: [{ from: "a", to: "e" }],
        });
        expect(values(r, "node", "imageFit").slice(0, 2)).toEqual(["none", "none"]);
        expect(values(r, "node", "imageWidth").slice(0, 2)).toEqual([16, 10]);
        expect(values(r, "node", "imageHeight").slice(0, 2)).toEqual([16, 12]);
        // offsets y down, from the node's center
        expect(values(r, "node", "imageOffsetX").slice(0, 3)).toEqual([0, -5, 10]);
        expect(values(r, "node", "imageOffsetY").slice(0, 3)).toEqual([0, -2, 10]);
        expect(values(r, "node", "imageOpacity")).toEqual([null, null, null, 0.4, null]);
        expect(values(r, "node", "shape")[4]).toBe("polygon");
        expect(values(r, "node", "shapePoints")[4]).toBe("-1,1 0,-1 1,1");
    });

    it("draws a vis.js icon node's code as its glyph, in vis-network's FontAwesome, 50 px and blue unless given", async () => {
        const r = await load({
            nodes: [
                {
                    id: "a",
                    shape: "icon",
                    icon: { code: "A", face: "DejaVu Sans", size: 30, color: "#d62728", weight: 900 },
                },
                { id: "b", shape: "icon", icon: { code: "#" } },
                { id: "c", shape: "icon" },
            ],
            edges: [{ from: "a", to: "b" }],
        });
        expect(values(r, "node", "glyph")).toEqual(["A", "#", null]);
        expect(values(r, "node", "glyphFont")).toEqual(["DejaVu Sans", "FontAwesome", null]);
        expect(values(r, "node", "glyphSize")).toEqual([30, 50, null]);
        expect(values(r, "node", "glyphColor")).toEqual(["#d62728", "#2b7ce9", null]);
        expect(values(r, "node", "glyphWeight")).toEqual(["bold", "normal", null]);
    });

    it("reads vis.js's arrow scaleFactor as the arrow size, the target's before the source's", async () => {
        const r = await load({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                { from: "a", to: "b", arrows: { to: { enabled: true, scaleFactor: 2 } } },
                { from: "b", to: "c", arrows: { from: { enabled: true, scaleFactor: 0.5 } } },
                { from: "c", to: "a", arrows: "to" },
            ],
        });
        expect(values(r, "edge", "arrowSize")).toEqual([2, 0.5, null]);
    });

    it("reads vis.js's middle arrows, its curve arrows and an edge background drawn only under a smooth edge", async () => {
        const r = await load({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
            edges: [
                { from: "a", to: "b", arrows: { middle: { enabled: true, type: "bar" } } },
                { from: "b", to: "c", arrows: { to: { enabled: true, type: "curve" } }, smooth: false },
                {
                    from: "c",
                    to: "d",
                    width: 2,
                    arrows: { from: { enabled: true, type: "inv_curve" } },
                    background: { enabled: true, color: "#ffd700", size: 9 },
                },
                {
                    from: "d",
                    to: "a",
                    smooth: { enabled: false },
                    arrows: "middle",
                    background: { enabled: true, size: 9 },
                },
            ],
        });
        expect(values(r, "edge", "midTargetArrow")).toEqual(["tee", null, null, "triangle"]);
        expect(values(r, "edge", "targetArrow")[1]).toBe("other:curve");
        expect(values(r, "edge", "sourceArrow")[2]).toBe("other:inv-curve");
        // the band under the line, its outline beyond the line's own width; none under a straight edge
        expect(values(r, "edge", "outlineWidth")).toEqual([null, null, 7, 0]);
        expect(values(r, "edge", "outlineColor")[2]).toBe("#ffd700");
    });

    it("reads vis.js's dynamic smooth edges as curves through a support point its physics places, with no positions", async () => {
        const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
        // vis-network's defaults: the barnesHut solver, every edge dynamic; an edge's own length is its springs' rest
        const plain = await load({
            nodes,
            edges: [
                { from: "a", to: "b" },
                { from: "b", to: "c", length: 300 },
                { from: "c", to: "a", physics: false },
                { from: "a", to: "c", smooth: { type: "curvedCW" } },
            ],
        });
        expect(values(plain, "edge", "curved")).toEqual([true, true, null, null]);
        expect(values(plain, "edge", "supportModel")).toEqual(["barnesHut", "barnesHut", null, null]);
        expect(values(plain, "edge", "supportSpringLength")).toEqual([95, 300, null, null]);
        expect(values(plain, "edge", "supportSpringConstant")[0]).toBe(0.04);
        expect(values(plain, "edge", "supportRepulsion")[0]).toBe(2000);
        expect(values(plain, "edge", "supportCentralGravity")[0]).toBe(0.3);
        // the forceAtlas2Based solver, with the file's own constants over its defaults
        const fa2 = await load({
            nodes,
            edges: [{ from: "a", to: "b" }],
            options: {
                physics: {
                    solver: "forceAtlas2Based",
                    forceAtlas2Based: { gravitationalConstant: -26, springLength: 230 },
                },
            },
        });
        expect(values(fa2, "edge", "supportModel")).toEqual(["forceAtlas2"]);
        expect(values(fa2, "edge", "supportRepulsion")).toEqual([26]);
        expect(values(fa2, "edge", "supportSpringLength")).toEqual([230]);
        expect(values(fa2, "edge", "supportCentralGravity")).toEqual([0.01]);
        // no physics, or a hierarchical layout (which turns every dynamic curve static): the support node never moves
        for (const options of [
            { physics: false },
            { physics: { enabled: false } },
            { layout: { hierarchical: true } },
        ]) {
            const still = await load({ nodes, edges: [{ from: "a", to: "b" }], options });
            expect(values(still, "edge", "supportModel")).toEqual([null]);
        }
    });

    it("reads vis.js's image arrows: each end's picture and the size it is drawn at", async () => {
        const src = "data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E";
        const r = await load({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                {
                    from: "a",
                    to: "b",
                    arrows: { to: { enabled: true, type: "image", src, imageWidth: 28, imageHeight: 12 } },
                },
                {
                    from: "b",
                    to: "c",
                    arrows: {
                        from: { enabled: true, type: "image", src },
                        middle: { enabled: true, type: "image", src },
                    },
                },
            ],
        });
        expect(values(r, "edge", "targetArrow")[0]).toBe("other:image");
        expect(values(r, "edge", "targetArrowImage")).toEqual([src, null]);
        expect(values(r, "edge", "targetArrowImageWidth")).toEqual([28, null]);
        expect(values(r, "edge", "targetArrowImageHeight")).toEqual([12, null]);
        expect(values(r, "edge", "sourceArrowImage")).toEqual([null, src]);
        expect(values(r, "edge", "midTargetArrowImage")).toEqual([null, src]);
        // no size of its own: drawn at its picture's
        expect(values(r, "edge", "sourceArrowImageWidth")).toEqual([null, null]);
    });

    it("sizes vis.js dots by value over the scaling range, else vis-network's default size 25, and boxes by label", async () => {
        const r = await load({
            nodes: [
                { id: "a", value: 1 },
                { id: "b", value: 3 },
                { id: "c", value: 2, scaling: { min: 0, max: 100 } },
                { id: "d", shape: "square" },
                { id: "e", shape: "box" },
            ],
            edges: [{ from: "a", to: "b" }],
            options: { nodes: { shape: "dot" } },
        });
        // value runs 1..3; a and b take scaling.min 10 and max 30 (radii), c its own 0..100 at the middle
        expect(values(r, "node", "width")).toEqual([20, 60, 100, 50, 24]);
        const back = await load(
            JSON.parse(
                await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect: "vis" }),
            ) as Record<string, unknown>,
        );
        expect(values(back, "node", "width")).toEqual([20, 60, 100, 50, 24]);
    });

    it("widens vis.js edges by value once any edge has one, and draws the rest at options.edges.width", async () => {
        const nodes = [{ id: "a" }, { id: "b" }];
        const edges = [
            { from: "a", to: "b", value: 10 },
            { from: "a", to: "b", value: 1 },
            { from: "a", to: "b", value: 4, scaling: { min: 0, max: 30 } },
            { from: "a", to: "b", width: 8 },
        ];
        const scaled = await load({ nodes, edges, options: { edges: { width: 2, scaling: { min: 1, max: 8 } } } });
        // value runs 1..10 onto scaling 1..8; vis-network drops an edge's own width once any edge has a value
        expect(values(scaled, "edge", "width")).toEqual([8, 1, 10, 2]);
        const defaults = await load({ nodes, edges: [edges[0], edges[1], edges[3]] });
        // the default scaling is 1..15 and the default width 1
        expect(values(defaults, "edge", "width")).toEqual([15, 1, 1]);
        const plain = await load({ nodes, edges: [edges[3]] });
        expect(values(plain, "edge", "width")).toEqual([8]);
    });

    it("grows vis.js nodes of the shapes sized by their label as each shape's resize does", async () => {
        const r = await load({
            nodes: [
                { id: "box", shape: "box", label: "a" },
                { id: "text", shape: "text", label: "a", margin: { top: 1, bottom: 3, left: 2, right: 4 } },
                { id: "circle", shape: "circle", label: "a", margin: 8 },
                { id: "database", shape: "database", label: "a" },
                { id: "ellipse", label: "one\ntwo", font: { size: 10 } },
                { id: "min", shape: "box", label: "a", widthConstraint: { minimum: 40 } },
                { id: "dot", shape: "dot", label: "a" },
            ],
            edges: [{ from: "box", to: "dot" }],
            options: { nodes: {} },
        });
        expect(values(r, "node", "labelFit")).toEqual([
            "bounds",
            "bounds",
            "bounds",
            "bounds",
            "bounds",
            "bounds",
            null,
        ]);
        // the margin on each side; an ellipse adds half its label's height (two lines of 10) instead
        expect(values(r, "node", "labelPaddingX")).toEqual([5, 3, 8, 5, 10, 5, null]);
        expect(values(r, "node", "labelPaddingY")).toEqual([5, 2, 8, 5, 10, 5, null]);
        expect(values(r, "node", "labelFitSquare")).toEqual([null, null, true, true, null, null, null]);
        // widthConstraint.minimum is the label's least width, inside the margin
        expect(values(r, "node", "width")).toEqual([0, 0, 0, 0, 0, 50, 50]);
    });

    it("gives NetworkX's node-link NetworkX's drawing defaults, and d3's bare shape none", async () => {
        const nx = await load({
            directed: true,
            multigraph: false,
            graph: {},
            nodes: [{ id: 1 }, { id: 2 }],
            links: [{ source: 1, target: 2 }],
        });
        expect(nx.styles.styles.source.tool).toBe("networkx");
        expect(values(nx, "node", "fill")).toEqual(["#1f78b4", "#1f78b4"]);
        expect(values(nx, "edge", "targetArrow")).toEqual(["triangle"]);
        const d3 = await registry.importGraph(JSON.stringify({ nodes: [{ id: 1 }], links: [] }), {
            format: "json",
            styles: true,
        });
        expect(d3.styles).toBeNull();
    });
});

/** A small vis.js document with groups, options and per-node keys, the styles every writer below writes. */
const VIS_DOC = {
    nodes: [
        { id: "a", group: "g1", label: "Alpha" },
        { id: "b", group: "g2", shape: "box" },
        { id: "c", color: { background: "#00ff00", border: "#000000" }, size: 7 },
        { id: "d", hidden: true },
    ],
    edges: [
        { from: "a", to: "b", dashes: true },
        { from: "b", to: "c", color: "blue", arrows: "to" },
        { from: "c", to: "d", width: 4 },
    ],
    options: { nodes: { shape: "dot", size: 10 }, groups: { g1: { color: "#ff0000" } } },
};

describe("JSON styles: writing", () => {
    it.each(["cytoscape", "graphology", "vis", "node-link", "d3", "jgf"] as const)(
        "writes %s that reads back as the same rules and values",
        async (dialect) => {
            const r = await load(VIS_DOC);
            const text = await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect });
            const back = await load(text);
            expect(back.styles.styles.source.tool).toBe("graphty");
            expect(rulesOf(back.styles)).toEqual(rulesOf(r.styles));
            for (const [target, property] of [
                ["node", "fill"],
                ["node", "width"],
                ["node", "shape"],
                ["node", "visible"],
                ["edge", "color"],
                ["edge", "lineStyle"],
            ] as const) {
                expect(values(back, target, property)).toEqual(values(r, target, property));
            }
            // written again, the same bytes
            const again = await registry.exportGraphToString(back.snapshot, "json", {
                styles: back.styles,
                dialect,
            });
            expect(
                await registry.exportGraphToString((await load(again)).snapshot, "json", {
                    styles: (await load(again)).styles,
                    dialect,
                }),
            ).toBe(again);
        },
    );

    it("writes Cytoscape.js's stylesheet, graphology's and vis.js's keys, and the block where each dialect keeps it", async () => {
        const r = await load(VIS_DOC);
        const write = async (dialect: string): Promise<Record<string, unknown>> =>
            JSON.parse(await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect })) as Record<
                string,
                unknown
            >;
        const cy = await write("cytoscape");
        expect(Array.isArray(cy.style)).toBe(true);
        expect(typeof cy[STYLE_BLOCK_NAME]).toBe("string");
        const g = await write("graphology");
        expect((g.attributes as Record<string, unknown>)[STYLE_BLOCK_NAME]).toEqual(expect.any(String));
        const gNodes = g.nodes as { attributes: Record<string, unknown> }[];
        expect(gNodes[0].attributes.color).toBe("#ff0000");
        // sigma 4 hides nothing a file says, so a hidden element is kept in the block only
        expect(gNodes[3].attributes.visibility).toBeUndefined();
        expect(values(await load(JSON.stringify(g)), "node", "visible")[3]).toBe(false);
        const v = await write("vis");
        expect(typeof v[STYLE_BLOCK_NAME]).toBe("string");
        const vNodes = v.nodes as Record<string, unknown>[];
        expect(vNodes[2]).toMatchObject({ color: { background: "#00ff00", border: "#000000" }, size: 7, shape: "dot" });
        const nl = await write("node-link");
        expect((nl.graph as Record<string, unknown>)[STYLE_BLOCK_NAME]).toEqual(expect.any(String));
    });

    it("reports what each dialect cannot hold before anything is written", async () => {
        const r = await load(VIS_DOC);
        const codes = (dialect: string, property?: string): string[] =>
            registry
                .checkExport(r.snapshot, "json", { styles: r.styles, dialect })
                .filter((n) => property === undefined || n.style?.property === property)
                .map((n) => n.code);
        expect(codes("node-link", "fill")).toEqual(["W_STYLE_NOT_WRITTEN"]);
        expect(codes("cytoscape", "fill")).toEqual([]);
        expect(codes("vis", "fill")).toEqual([]);
        expect(codes("graphology", "shape")).toEqual(["W_STYLE_NOT_WRITTEN"]);
        expect(codes("graphology", "fill")).toEqual([]);
        expect(codes("obographs")).toContain("W_STYLE_RULES_NOT_KEPT");
        expect(codes("node-link")).not.toContain("W_STYLE_RULES_NOT_KEPT");
        // a box sized by a number: vis-network sizes a box by its label
        expect(codes("vis", "width")).toContain("W_STYLE_APPROXIMATED");
        // a data column named like a style key holds what graphty draws once written
        expect(codes("graphology")).toContain("W_JSON_STYLE_KEY_REPLACED");
    });

    it("reports that JGF cannot keep the rules of a graph whose node ids JGF changes", async () => {
        const r = await load({
            directed: true,
            multigraph: false,
            graph: {},
            nodes: [{ id: 2 }, { id: 1 }],
            links: [],
        });
        const notes = registry.checkExport(r.snapshot, "json", { styles: r.styles, dialect: "jgf" });
        expect(notes.map((n) => n.code)).toContain("W_STYLE_RULES_NOT_KEPT");
    });

    it("writes Cytoscape.js JSON that Cytoscape.js draws as graph-io resolves it", async () => {
        const r = await load(bytesOf(join(CORPUS, "graphology-eurosis.json.gz")));
        const doc = JSON.parse(
            await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect: "cytoscape" }),
        ) as { elements: unknown; style: unknown };
        const cy = cytoscape({
            headless: true,
            styleEnabled: true,
            elements: doc.elements as never,
            style: doc.style as never,
        });
        const differences: string[] = [];
        for (const [target, names] of [
            ["node", ["background-color", "width", "height", "shape", "label"]],
            ["edge", ["line-color", "width"]],
        ] as const) {
            const els = target === "node" ? cy.nodes() : cy.edges();
            expect(els.length).toBe(target === "node" ? r.snapshot.nodeCount : r.snapshot.edgeCount);
            for (const name of names) {
                const site = { notes: new StyleNotes(), target, property: name };
                const property = cyjsRenderedProperty(target, name);
                const want = values(r, target, property);
                els.forEach((ele, i) => {
                    const got = cyjsRendered(target, name, ele.style(name), site);
                    // Cytoscape.js trims a label; the export reports it (W_STYLE_APPROXIMATED)
                    const raw = want[i];
                    const w = typeof raw === "string" && name === "label" ? raw.trim() : raw;
                    if (w !== null && got !== w && differences.length < 10) {
                        differences.push(
                            `${target} ${String(i)} ${name}: Cytoscape.js ${JSON.stringify(got)}, graph-io ${JSON.stringify(w)}`,
                        );
                    }
                });
            }
        }
        expect(differences).toEqual([]);
        const notes = registry.checkExport(r.snapshot, "json", { styles: r.styles, dialect: "cytoscape" });
        expect(notes.some((n) => n.code === "W_STYLE_APPROXIMATED" && n.style?.property === "label")).toBe(true);
    });
});

/**
 * The neutral property a Cytoscape.js property draws.
 * @param target - nodes or edges
 * @param name - the Cytoscape.js property
 * @returns the neutral property
 */
function cyjsRenderedProperty(target: StyleTarget, name: string): string {
    const table: Record<string, string> = {
        "background-color": "fill",
        "line-color": "color",
        width: "width",
        height: "height",
        shape: "shape",
        label: "label",
    };
    return target === "edge" && name === "width" ? "width" : table[name];
}

/** The block-tamper fixtures: files graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const out: Record<string, Uint8Array> = {};
    for (const dialect of ["cytoscape", "graphology"] as const) {
        const base = await load(VIS_DOC);
        const written = await registry.exportGraphToBytes(base.snapshot, "json", { styles: base.styles, dialect });
        const doc = JSON.parse(new TextDecoder().decode(written)) as Record<string, unknown>;
        if (dialect === "cytoscape") {
            (doc.elements as { nodes: unknown[] }).nodes.push({ data: { id: "added" } });
        } else {
            (doc.nodes as unknown[]).push({ key: "added" });
        }
        out[`${dialect}-graphty-written.json`] = written;
        out[`${dialect}-tamper-native-edited.json`] = editJsonNodeFill(written) ?? new Uint8Array();
        out[`${dialect}-tamper-block-truncated.json`] = replaceJsonBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        );
        out[`${dialect}-tamper-node-added.json`] = new TextEncoder().encode(JSON.stringify(doc));
    }
    return out;
}

describe("JSON block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_JSON_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_JSON_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it.each(["cytoscape", "graphology"])(
        "bring an outside edit of %s back as one exception over the same rules",
        async (dialect) => {
            const unedited = await load(bytesOf(join(GENERATED, `${dialect}-graphty-written.json`)));
            const edited = await load(bytesOf(join(GENERATED, `${dialect}-tamper-native-edited.json`)));
            const below = (ex: ExtractedStyles): unknown =>
                (rulesOf(ex) as StyleRule[]).filter((r) => r.role !== "exceptions");
            expect(below(edited.styles)).toEqual(below(unedited.styles));
            const excepted = (ex: ExtractedStyles): unknown[] =>
                [...ex.columns.node]
                    .filter(([key]) => key.startsWith("exceptions."))
                    .flatMap(([, col]) => col.filter((v) => v !== null));
            const added = excepted(edited.styles).slice(excepted(unedited.styles).length);
            expect(added).toEqual(["#123456"]);
        },
    );

    it.each(["cytoscape", "graphology"])(
        "ignore a truncated %s block and a block for another graph with a note",
        async (dialect) => {
            for (const [file, reason] of [
                [`${dialect}-tamper-block-truncated.json`, "NOT_JSON"],
                [`${dialect}-tamper-node-added.json`, "FINGERPRINT"],
            ] as const) {
                const { styles } = await load(bytesOf(join(GENERATED, file)));
                const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
                expect(note?.params.samples).toEqual([reason]);
                expect(styles.styles.source.tool).toBe(dialect === "cytoscape" ? "cytoscape-js" : "sigma");
            }
        },
    );
});
