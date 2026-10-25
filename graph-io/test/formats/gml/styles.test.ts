/**
 * GML styles: each writer's `graphics` and `LabelGraphics` read the way that writer draws them (yEd, Cytoscape,
 * Gephi, OGDF; igraph and unknown writers with no defaults), the valid files that failed before (Gephi's unquoted
 * `Creator`, OGDF's backslash-escaped quotes), and styles written back as yEd GML graphics with the `graphty.styles`
 * block as a graph key.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GML_STYLE_BLOCK_KEY } from "../../../src/formats/gml/index.js";
import { gmlPositions } from "../../../src/formats/gml/positions.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/internal.js";
import { editGmlNodeFill, replaceGmlBlock } from "../../styles/formats/gml.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/gml");
const GENERATED = join(CORPUS, "generated");

/**
 * Imports a GML document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result; styles may be null
 */
async function read(doc: string | Uint8Array, toolDefaults = true) {
    return registry.importGraph(doc, { format: "gml", styles: { toolDefaults }, errorLimit: Infinity });
}

/**
 * Imports a GML document that has styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await read(doc, toolDefaults);
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(join(GENERATED, name)));
const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];
const toolRules = (ex: ExtractedStyles): StyleRule[] => ex.styles.rules.filter((r) => r.origin === "tool");

describe("GML styles: who wrote the file", () => {
    it("reads yEd's keys with yEd's defaults: no fill, label color and weight, arrows by name, curves, extra labels", async () => {
        const { snapshot, styles } = await load(file("yed-labels-and-arrows.gml"));
        expect(styles.styles.source).toEqual({ format: "gml", dialect: "yed", tool: "yed" });
        expect(toolRules(styles)[0].set).toMatchObject({ fill: "#ffcc00", labelFont: "DejaVu Sans, sans-serif" });
        const kind = (i: number): string => String(snapshot.nodes.value("label", i)).replace(/\d+$/, "");
        const opacity = resolveStyles(styles, "node", "fillOpacity", snapshot);
        const weight = resolveStyles(styles, "node", "labelWeight", snapshot);
        const color = resolveStyles(styles, "node", "labelColor", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            expect(opacity[i] === 0).toBe(kind(i) === "compound");
            expect(weight[i]).toBe(kind(i) === "gene" ? "bold" : "normal");
            expect(color[i]).toBe(kind(i) === "gene" ? "#0000ff" : "#000000");
        }
        expect(resolveStyles(styles, "edge", "sourceArrow", snapshot)[0]).toBe("diamond-open");
        // smoothBends rounds the bends of a line, and this edge has none: yEd draws it straight
        expect(resolveStyles(styles, "edge", "curved", snapshot)[0]).toBe(false);
        expect(resolveStyles(styles, "edge", "label", snapshot)[0]).toBe("inhibits");
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_EXTRA_LABELS");
    });

    it("reads Cytoscape's keys with Cytoscape's default style: numbered arrows, outline_width, nodes labeled", async () => {
        const { snapshot, styles } = await load(file("cytoscape-interactions.gml"));
        expect(styles.styles.source.tool).toBe("cytoscape");
        expect(toolRules(styles)[0].set).toMatchObject({ fill: "#89d0f5", shape: "round-rectangle" });
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        const widths = resolveStyles(styles, "edge", "width", snapshot);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const pd = snapshot.edges.value("label", e) === "pd";
            expect(arrows[e]).toBe(pd ? "triangle" : "none");
            expect(widths[e]).toBe(pd ? 3 : 1);
        }
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)[0]).toBe(1);
        expect(resolveStyles(styles, "node", "label", snapshot)[0]).toBe(snapshot.nodes.value("label", 0));
    });

    it("draws Cytoscape's labels in Java's SansSerif face, so a label wraps at 200 px where Cytoscape's does", async () => {
        // Cytoscape's default font is SansSerif, which Java draws in DejaVu Sans: "a much longer label than its node"
        // measures 206 px there and wraps; in the browser's sans-serif (Liberation Sans) it is 180 px and does not
        const doc = 'Creator "Cytoscape"\ngraph [ node [ id 1 label "a much longer label than its node" ] ]';
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelFont", snapshot)[0]).toBe("DejaVu Sans, sans-serif");
        expect(resolveStyles(styles, "node", "labelWrapWidth", snapshot)[0]).toBe(200);
    });

    it("reads Gephi's file with its unquoted Creator: Gephi's defaults and its end nodes' mixed color on edges", async () => {
        const { snapshot, styles } = await load(file("gephi-unquoted-creator.gml"));
        expect(snapshot.graph.value("Creator", 0)).toBe("Gephi");
        expect(styles.styles.source.tool).toBe("gephi");
        const fills = resolveStyles(styles, "node", "fill", snapshot);
        const colors = resolveStyles(styles, "edge", "color", snapshot);
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        // EdgeColor MIXED: Gephi draws the mean of the end nodes' channels, whatever the edge's own color
        const mix = (a: unknown, b: unknown): string =>
            `#${[0, 2, 4]
                .map((k) =>
                    Math.floor(
                        (Number.parseInt(String(a).slice(1 + k, 3 + k), 16) +
                            Number.parseInt(String(b).slice(1 + k, 3 + k), 16)) /
                            2,
                    )
                        .toString(16)
                        .padStart(2, "0"),
                )
                .join("")}`;
        for (let e = 0; e < snapshot.edgeCount; e++) {
            expect(colors[e]).toBe(mix(fills[snapshot.edgeSource(e)], fills[snapshot.edgeTarget(e)]));
            expect(arrows[e]).toBe("triangle");
        }
        // Gephi's preview draws each node's label key, as the GEXF reader reads it
        const labels = resolveStyles(styles, "node", "label", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            expect(labels[i]).toBe(snapshot.nodes.value("label", i) ?? null);
        }
    });

    it("reads OGDF's keys with OGDF's defaults and its backslash-escaped quotes", async () => {
        const { snapshot, styles } = await load(file("ogdf-escaped-labels.gml"));
        expect(styles.styles.source.tool).toBe("ogdf");
        expect(snapshot.nodes.value("label", 0)).toBe('compound "0"');
        const shapes = resolveStyles(styles, "node", "shape", snapshot);
        const borders = resolveStyles(styles, "node", "borderStyle", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const kind = String(snapshot.nodes.value("label", i)).split(" ")[0];
            expect(shapes[i]).toBe(
                { protein: "ellipse", gene: "rectangle", compound: "diamond", drug: "polygon" }[kind],
            );
            expect(borders[i]).toBe(kind === "drug" ? "dashed" : "solid");
        }
        const lines = resolveStyles(styles, "edge", "lineStyle", snapshot);
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            expect(lines[e]).toBe(e % 4 === 0 ? "dotted" : "solid");
            expect(arrows[e]).toBe(e % 2 === 1 ? "triangle" : "none");
        }
    });

    it("reads what GraphIO::writeGML writes: outline, stroke names, shape names, bends without the end points", async () => {
        const node = (id: number, x: number, g: string): string =>
            `node [ id ${String(id)} graphics [ x ${String(x)} y 0 w 40 h 30 fill "#FF8800" ${g} ] ]`;
        const { snapshot, styles } = await load(
            [
                'Creator "ogdf::GraphIO::writeGML"',
                "graph [ directed 1",
                node(0, 0, 'outline "#0000FF" stipple "Dashdot" lineWidth 3.0 type "RoundedRect"'),
                node(1, 100, 'outline "#000000" stipple "None" type "InvTriangle"'),
                node(2, 200, 'stipple 2 type "Hexagon"'),
                'edge [ source 0 target 1 graphics [ arrow "last" stipple "Dot" Line [ point [ x 50 y -40 ] ] ] ]',
                'edge [ source 1 target 2 graphics [ arrow "none" stipple "None" ] ]',
                "]",
            ].join("\n"),
        );
        type Property = Parameters<typeof resolveStyles>[2];
        const node$ = (p: Property): readonly unknown[] => resolveStyles(styles, "node", p, snapshot);
        const edge$ = (p: Property): readonly unknown[] => resolveStyles(styles, "edge", p, snapshot);
        expect(node$("borderColor")[0]).toBe("#0000ff");
        expect(node$("borderStyle")).toEqual(["dash-dot", "solid", "dashed"]);
        expect(node$("borderWidth").slice(0, 2)).toEqual([3, 0]);
        // OGDF's triangles and hexagons are regular, their corners on the ellipse of the box: drawn where they say
        expect(node$("shape")).toEqual(["round-rectangle", "polygon", "polygon"]);
        expect(node$("shapePoints")[1]).toBe("0,-1 0.866,0.5 -0.866,0.5");
        expect(node$("shapePoints")[2]).toBe("1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866");
        expect(node$("shapePointsStretch")).toEqual([null, false, false]);
        expect(node$("labelSize")[0]).toBe(10);
        expect(edge$("lineStyle")[0]).toBe("dotted");
        expect(edge$("visible")).toEqual([null, false]);
        // the one point is the bend, not a port: the edge runs from center to center over it
        expect(edge$("bends")[0]).not.toBeNull();
        expect(edge$("sourcePort")[0]).toBeNull();
    });

    it("reads a yEd label's Java font in Java's face for it, and its #RRGGBBAA text alpha", async () => {
        const label = (font: string, color: string): string =>
            `LabelGraphics [ text "Abc" fontName "${font}" color "${color}" ]`;
        const { snapshot, styles } = await load(
            [
                'Creator "yFiles"',
                "graph [",
                `node [ id 0 graphics [ x 0 y 0 w 30 h 30 ] ${label("Dialog", "#00800080")} ]`,
                `node [ id 1 graphics [ x 50 y 0 w 30 h 30 ] ${label("Monospaced", "#FF0000")} ]`,
                "]",
            ].join("\n"),
        );
        expect(resolveStyles(styles, "node", "labelFont", snapshot)).toEqual([
            "DejaVu Sans, sans-serif",
            "DejaVu Sans Mono, monospace",
        ]);
        expect(resolveStyles(styles, "node", "labelColor", snapshot)).toEqual(["#008000", "#ff0000"]);
        expect(resolveStyles(styles, "node", "labelOpacity", snapshot)[0]).toBeCloseTo(0.502, 3);
    });

    it("reads OGDF's label place: the label's center offset from the node's, y down, where drawSVG draws it", async () => {
        const { snapshot, styles } = await load(
            [
                'Creator "ogdf::GraphIO::writeGML"',
                "graph [",
                'node [ id 0 label "Abc" graphics [ x 0 y 0 label [ x 0 y -24 z 0 ] w 36 h 36 ] ]',
                'node [ id 1 label "Abc" graphics [ x 100 y 0 label [ x 30.5 y 0 z 0 ] w 36 h 36 ] ]',
                "]",
            ].join("\n"),
        );
        expect(resolveStyles(styles, "node", "labelOffsetX", snapshot)).toEqual([0, 30.5]);
        expect(resolveStyles(styles, "node", "labelOffsetY", snapshot)).toEqual([-24, 0]);
    });

    it("reads OGDF's clusters as group nodes holding their vertices, with their box, fill, outline and label", async () => {
        const graphics = (fill: string): string =>
            `graphics [ x 10 y 20 width 100 height 60 fill "${fill}" color "#0000FF" lineWidth 3.0 stipple "Dash" style "rectangle" ]`;
        const { snapshot, styles } = await load(
            [
                'Creator "ogdf::GraphIO::writeGML"',
                "graph [",
                'node [ id 0 label "a" graphics [ x 30 y 40 w 18 h 18 fill "#C8C8C8" type "Ellipse" ] ]',
                'node [ id 1 label "b" graphics [ x 60 y 40 w 18 h 18 fill "#C8C8C8" type "Ellipse" ] ]',
                "]",
                'rootcluster [ graphics [ x 0 y 0 width 0 height 0 ] vertex "0"',
                `  cluster [ id 1 label "Outer" ${graphics("#F5F5F5")}`,
                `    cluster [ id 2 label "Inner" ${graphics("#E0E0FF")} vertex "1" ] ]`,
                "]",
            ].join("\n"),
        );
        expect(snapshot.nodeCount).toBe(4);
        const index = (id: string | number): number => snapshot.ids.requireIndex(id);
        const parent = snapshot.nodes.byRole("parent");
        expect(parent).not.toBeNull();
        const parentOf = (id: string | number): unknown => {
            const i = index(id);
            return parent?.isSet(i) === true ? snapshot.ids.idOf(Number(parent.value(i))) : null;
        };
        // a vertex of the root cluster is in no group; nested clusters nest
        expect([parentOf(0), parentOf(1), parentOf("cluster1"), parentOf("cluster2")]).toEqual([
            null,
            "cluster2",
            null,
            "cluster1",
        ]);
        // x and y are the box's top-left corner: the node's center is the box's middle
        expect([...(snapshot.nodes.byRole("position")?.value(index("cluster1")) as Float64Array)]).toEqual([60, 50, 0]);
        type Property = Parameters<typeof resolveStyles>[2];
        const at = (p: Property): unknown => resolveStyles(styles, "node", p, snapshot)[index("cluster2")];
        expect([at("width"), at("height"), at("fill"), at("borderColor"), at("borderWidth")]).toEqual([
            100,
            60,
            "#e0e0ff",
            "#0000ff",
            3,
        ]);
        expect([at("shape"), at("label")]).toEqual(["rectangle", "Inner"]);
        // GraphIO::drawSVG draws a cluster's outline solid whatever its stipple
        expect(at("borderStyle")).not.toBe("dashed");
        // and its label one font size off the box, toward the side with more of the drawing (here a tie: above,
        // ending at the box's right side)
        expect([at("labelPosition"), at("labelOffsetX"), at("labelShiftX"), at("labelOffsetY")]).toEqual([
            "center",
            50,
            -0.5,
            -40,
        ]);
    });

    it("sets an OGDF cluster's label below and from the left where more of the drawing lies there", async () => {
        const { snapshot, styles } = await load(
            [
                'Creator "ogdf::GraphIO::writeGML"',
                "graph [",
                "node [ id 0 graphics [ x 0 y 0 w 10 h 10 ] ]",
                "node [ id 1 graphics [ x 500 y 500 w 10 h 10 ] ]",
                "]",
                'rootcluster [ cluster [ id 1 label "C" graphics [ x 400 y 50 width 60 height 40 ] vertex "1" ] ]',
            ].join("\n"),
        );
        const i = snapshot.ids.requireIndex("cluster1");
        type Property = Parameters<typeof resolveStyles>[2];
        const at = (p: Property): unknown => resolveStyles(styles, "node", p, snapshot)[i];
        expect([at("labelOffsetX"), at("labelShiftX"), at("labelOffsetY")]).toEqual([-30, 0.5, 30]);
    });

    it("reads what Graphviz's gv2gml writes: H, hasFill, visible, fontColor, Graphviz names, y up, dir as arrow", async () => {
        // gv2gml 14.1.2's own output for a three-node digraph (cmd/tools/gv2gml.c), trimmed of its pass-through keys
        const node = (id: number, x: number, g: string, label = ""): string =>
            `node [ id ${String(id)} name "${String(id)}" ${label} graphics [ x ${String(x)} y 100 w 54 H 36 ${g} ] ]`;
        const { snapshot, styles } = await load(
            [
                "graph [ version 2 directed 1",
                node(0, 27, 'hasFill 1 type "box" fill "orange" outline "blue" width 2 outlineStyle "dashed"'),
                node(
                    1,
                    127,
                    'type "house" fill "red" outline "red"',
                    'label "a" LabelGraphics [ text "a\\nb" fontColor "green" ]',
                ),
                node(2, 227, 'visible 0 hasFill 1 type "point" fill "#ff000080"'),
                'edge [ id 1 source 0 target 1 graphics [ Line [ point [ x 54 y 100 ] point [ x 70 y 100 ] point [ x 80 y 100 ] point [ x 90 y 100 ] point [ x 100 y 100 ] ] fill "red" targetArrow "odiamond" arrow "first" ] ]',
                'edge [ id 2 source 1 target 2 graphics [ sourceArrow "inv" style "dotted" arrow "last" ] ]',
                "edge [ id 3 source 0 target 2 graphics [ visible 0 ] ]",
                "]",
            ].join("\n"),
        );
        expect(styles.styles.source).toEqual({ format: "gml", dialect: "graphviz", tool: "graphviz" });
        expect(gmlPositions(snapshot)?.yAxis).toBe("up");
        type Property = Parameters<typeof resolveStyles>[2];
        const node$ = (p: Property): readonly unknown[] => resolveStyles(styles, "node", p, snapshot);
        const edge$ = (p: Property): readonly unknown[] => resolveStyles(styles, "edge", p, snapshot);
        expect(node$("height")).toEqual([36, 36, 36]);
        // filled only where hasFill says style=filled (a point always): Graphviz's unfilled node is see-through
        expect(node$("fill")[0]).toBe("#ffa500");
        expect(node$("fillOpacity")).toEqual([1, 0, 0.501961]);
        expect(node$("borderColor")[0]).toBe("#0000ff");
        expect(node$("borderStyle")[0]).toBe("dashed");
        expect(node$("shape")).toEqual(["rectangle", "polygon", "ellipse"]);
        expect(node$("visible")[2]).toBe(false);
        // a bare SVG name, as Graphviz's SVG draws it: green is #008000
        expect(node$("labelColor")[1]).toBe("#008000");
        expect(node$("label")[1]).toBe("a\nb");
        // arrow "first" is gv2gml's dir=forward (the head's arrow), "last" dir=back
        expect(edge$("targetArrow")).toEqual(["diamond-open", "none", "triangle"]);
        expect(edge$("sourceArrow")).toEqual(["none", "inverted", "none"]);
        expect(edge$("lineStyle")[1]).toBe("dotted");
        expect(edge$("visible")[2]).toBe(false);
        // a straight spline is the straight edge it looks like
        expect(edge$("bends")[0]).toBeNull();
    });

    it("reads Cytoscape's GML as Cytoscape does: its shape names alone, and a node without a label named by its id", async () => {
        const { snapshot, styles } = await load(
            [
                'Creator "Cytoscape"',
                "graph [",
                'node [ id 7 label "" graphics [ type "round_rect" ] ]',
                'node [ id 8 graphics [ type "VEE" ] ]',
                'node [ id 9 label "Abc" graphics [ type "trapezoid_2" ] ]',
                "]",
            ].join("\n"),
        );
        expect(resolveStyles(styles, "node", "label", snapshot)).toEqual(["7", "8", "Abc"]);
        const shapes = resolveStyles(styles, "node", "shape", snapshot);
        expect(shapes.slice(0, 2)).toEqual(["round-rectangle", "vee"]);
        // a name Cytoscape does not know leaves its default style's shape
        expect(shapes[2]).toBe("round-rectangle");
    });

    it("reads Gephi's GML as Gephi draws it: y up, w a radius, an edge as thick as its value", async () => {
        const doc = [
            "graph [",
            '  Creator "Gephi"',
            "  directed 0",
            '  node [ id 0 label "a" graphics [ x 0.0 y 0.0 z 0.0 w 10.0 h 40.0 d 10.0 fill "#FF8800" ] ]',
            '  node [ id 1 label "b" graphics [ x 100.0 y 50.0 z 0.0 w 20.0 h 20.0 d 20.0 fill "#0000FF" ] ]',
            "  edge [ id 0 source 0 target 1 value 5.0 ]",
            "]",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "width", snapshot)).toEqual([20, 40]);
        expect(resolveStyles(styles, "node", "height", snapshot)).toEqual([20, 40]);
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([5]);
        // the GML reader the graphty element uses keeps `value` as plain data: the width still follows it
        const plainValue = await registry.importGraph(doc, { format: "gml", styles: {}, weightFrom: null });
        const plainStyles = plainValue.styles;
        expect(plainStyles === null || plainStyles === undefined).toBe(false);
        if (plainStyles !== null && plainStyles !== undefined) {
            expect(resolveStyles(plainStyles, "edge", "width", plainValue.snapshot)).toEqual([5]);
        }
        // its Creator line sits inside the graph, and still says Gephi's y grows upward
        expect(gmlPositions(snapshot)?.yAxis).toBe("up");
    });

    it("gives an unknown writer (NetworkX writes no Creator) its own values and no defaults", async () => {
        for (const doc of [
            file("networkx-graphics.gml"),
            new Uint8Array(readFileSync(join(CORPUS, "di-unipi-socc_dgLBF__germany50.gml"))),
        ]) {
            const { snapshot, styles } = await load(doc);
            expect(styles.styles.source.tool).toBeNull();
            expect(toolRules(styles)).toEqual([]);
            expect(resolveStyles(styles, "node", "fill", snapshot).every((v) => v !== null)).toBe(true);
        }
    });

    it("centers a plain GML node's label on its node, where the GML draft names no place for it", async () => {
        const doc = [
            "graph [",
            '  node [ id 1 label "A" graphics [ x 0 y 0 w 20 h 20 ] ]',
            '  node [ id 2 label "B" graphics [ x 40 y 0 w 20 h 20 ] ]',
            '  edge [ source 1 target 2 label "e" graphics [ fill "#000000" ] ]',
            "]",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)).toEqual(["center", "center"]);
        // yEd's GML keeps its own label models
        const yed = await load(
            'Creator "yFiles"\ngraph [ node [ id 1 label "A" graphics [ x 0 y 0 w 20 h 20 ] LabelGraphics [ text "A" anchor "n" ] ] ]',
        );
        expect(resolveStyles(yed.styles, "node", "labelPosition", yed.snapshot)).not.toEqual(["center"]);
    });

    it("gives igraph's file, which holds no graphics, no styles; a color attribute stays data", async () => {
        const result = await read(file("igraph-flat-attributes.gml"));
        expect(result.snapshot.meta.creator).toMatch(/^igraph/);
        expect(result.styles ?? null).toBeNull();
    });

    it("leaves the writer's defaults out with toolDefaults: false", async () => {
        const { styles } = await load(file("yed-labels-and-arrows.gml"), false);
        expect(toolRules(styles)).toEqual([]);
    });
});

describe("GML styles: yEd's flowchart shapes", () => {
    it("reads a yEd node's customconfiguration as its shape where it has no type", async () => {
        const node = (id: number, extra: string): string =>
            `node [ id ${String(id)} graphics [ w 50.0 h 30.0 ${extra} ] ]`;
        const doc = `Creator "yFiles"\ngraph [ ${node(0, 'customconfiguration "com.yworks.flowchart.data"')} ${node(1, 'customconfiguration "com.yworks.flowchart.terminator"')} ${node(2, 'type "ellipse" customconfiguration "com.yworks.flowchart.data"')} ${node(3, 'customconfiguration "com.yworks.flowchart.storedData"')} ]`;
        const { snapshot, styles } = await load(doc, false);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual([
            "parallelogram",
            "round-rectangle",
            "ellipse",
            "polygon",
        ]);
        // stored data: its outline, a left side bulging out and a right side bulging in
        const [, , , stored] = resolveStyles(styles, "node", "shapePoints", snapshot);
        expect(String(stored)).toContain("0.8,0");
        expect(String(stored)).toContain("-1,0");
    });
});

describe("GML files that failed before", () => {
    it("reads an unquoted Creator word as text, and still refuses any other bare word value", async () => {
        const { snapshot } = await registry.importGraph("Creator Gephi\ngraph [ node [ id 1 ] ]", { format: "gml" });
        expect(snapshot.meta.creator).toBe("Gephi");
        await expect(registry.importGraph("graph [ node [ id 1 kind protein ] ]", { format: "gml" })).rejects.toThrow(
            /expected a value for key "kind"/,
        );
    });

    it("reads backslash escapes only in a file OGDF wrote", async () => {
        const ogdf = await registry.importGraph(
            'Creator "ogdf::GraphAttributes::writeGML"\ngraph [ node [ id 1 label "a \\"b\\" c:\\\\" ] ]',
            { format: "gml" },
        );
        expect(ogdf.snapshot.nodes.value("label", 0)).toBe('a "b" c:\\');
        const other = await registry.importGraph('graph [ node [ id 1 label "c:\\" ] ]', { format: "gml" });
        expect(other.snapshot.nodes.value("label", 0)).toBe("c:\\");
    });
});

describe("GML styles: writing", () => {
    it("writes yEd graphics into the records the graph has, keeping positions and bends, and reads back the same rules", async () => {
        const { snapshot, styles } = await load(file("yed-labels-and-arrows.gml"));
        const text = await registry.exportGraphToString(snapshot, "gml", { styles });
        expect(text).toContain(`  ${GML_STYLE_BLOCK_KEY} "`);
        expect(text).toMatch(/graphics \[\n\s+x [\d.]+\n\s+y [\d.]+\n/);
        expect(text).toContain('targetArrow "standard"');
        const back = await load(text);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "fillOpacity"],
            ["node", "labelWeight"],
            ["edge", "color"],
            ["edge", "sourceArrow"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("replaces another writer's style keys with yEd's, so yEd draws what graphty draws", async () => {
        const { snapshot, styles } = await load(file("ogdf-escaped-labels.gml"));
        const text = await registry.exportGraphToString(snapshot, "gml", { styles });
        expect(text).not.toMatch(/\b(lineWidth|stipple|line) /);
        expect(text).toContain('pattern "1"');
        const back = await load(text);
        expect(resolveStyles(back.styles, "edge", "lineStyle", back.snapshot)).toEqual(
            resolveStyles(styles, "edge", "lineStyle", snapshot),
        );
    });

    it("reports values yEd's GML can only approximate, and keeps their exact values in the block", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode(1);
        b.addNode(2);
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { fill: ["#123456", "#123456"], shape: ["pentagon", "ellipse"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const losses = registry.checkExport(g, "gml", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([["shape", 1]]);
        const text = await registry.exportGraphToString(g, "gml", { styles });
        expect(text).toContain('type "rectangle"');
        const back = await load(text);
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["pentagon", "ellipse"]);
    });
});

describe("GML styles: booleans", () => {
    it("keeps a rule over a boolean column GML cannot hold, reading a copy of it as booleans", async () => {
        const b = new GraphBuilder({ directed: false });
        const flag = b.declareNodeColumn({ name: "flag", dtype: "bool" });
        for (let i = 1; i <= 4; i++) {
            b.addNode(i);
            b.setNodeValue(flag, i - 1, i % 2 === 0);
        }
        const g = b.freeze();
        const planned = planStyles(
            {
                format: "test",
                node: { values: { fill: ["#123456", "#123456", "#123456", "#123456"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const rule: StyleRule = {
            id: "node.flagged",
            target: "node",
            role: "group",
            origin: "declared",
            where: { eq: [{ data: "flag" }, true] },
            set: { fill: "#ff0000" },
        };
        const styles: ExtractedStyles = {
            ...planned,
            styles: { ...planned.styles, rules: [...planned.styles.rules, rule] },
        };
        const back = await load(await registry.exportGraphToString(g, "gml", { styles }));
        expect(resolveStyles(back.styles, "node", "fill", back.snapshot)).toEqual(
            resolveStyles(styles, "node", "fill", g),
        );
    });

    it("reads a boolean style value back as a boolean, though GML writes it as 0 or 1", async () => {
        const b = new GraphBuilder({ directed: false });
        for (let i = 1; i <= 5; i++) {
            b.addNode(i);
        }
        const g = b.freeze();
        const italic = [false, true, false, true, true];
        const styles = planStyles(
            {
                format: "test",
                node: { values: { label: ["a", "b", "c", "d", "e"], labelItalic: italic } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const written = await registry.exportGraphToString(g, "gml", { styles });
        const back = await load(written);
        expect(resolveStyles(back.styles, "node", "labelItalic", back.snapshot)).toEqual(italic);
        const second = await registry.exportGraphToString(back.snapshot, "gml", { styles: back.styles });
        const again = await load(second);
        expect(await registry.exportGraphToString(again.snapshot, "gml", { styles: again.styles })).toBe(second);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(file("yed-labels-and-arrows.gml"));
    const written = await registry.exportGraphToBytes(base.snapshot, "gml", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(/\n {2}node \[/, "\n  node [\n    id 9999\n  ]\n  node [");
    return {
        "graphty-written.gml": written,
        "tamper-native-edited.gml": editGmlNodeFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.gml": replaceGmlBlock(written, (block) => block.slice(0, Math.floor(block.length / 2))),
        "tamper-node-added.gml": new TextEncoder().encode(added),
    };
}

describe("GML block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GML_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_GML_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(file("graphty-written.gml"));
        const edited = await load(file("tamper-native-edited.gml"));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the yEd graphics", async () => {
        for (const [name, reason] of [
            ["tamper-block-truncated.gml", "NOT_JSON"],
            ["tamper-node-added.gml", "FINGERPRINT"],
        ] as const) {
            const { snapshot, styles } = await load(file(name));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).not.toBe("graphty");
            expect(resolveStyles(styles, "node", "labelWeight", snapshot)).toContain("bold");
        }
    });
});
