/**
 * Settled styles: what each program draws differently is decided in graph-io and handed over as neutral values, so a
 * consumer draws the rules the same way whatever program wrote the file.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry, type ImportGraphOptions } from "../../src/registry.js";
import {
    type ExtractedStyles,
    readFileStyles,
    resolveStyles,
    settleStyles,
    type StyleProperty,
    type StyleTarget,
    unsettledStyles,
} from "../../src/styles/internal.js";

const registry = createRegistry();
const SPECIMENS = resolve(import.meta.dirname, "../fidelity/specimens");

/**
 * Imports a document with its styles and reads its settled values.
 * @param input - the document
 * @param format - its format
 * @param styles - the style options
 * @returns the styles and a reader of one property by element id
 */
async function load(
    input: string | Uint8Array,
    format: string,
    styles: ImportGraphOptions["styles"] = true,
): Promise<{
    styles: ExtractedStyles;
    values: (target: StyleTarget, property: string) => readonly unknown[];
    edge: (property: string, id: string) => unknown;
}> {
    const result = await registry.importGraph(input, { format, styles, errorLimit: Infinity });
    const ex = result.styles;
    if (ex === null || ex === undefined) {
        throw new Error("no styles");
    }
    const values = (target: StyleTarget, property: string): readonly unknown[] =>
        resolveStyles(ex, target, property as StyleProperty, result.snapshot);
    const ids = Array.from({ length: result.snapshot.edgeCount }, (_, e) =>
        result.snapshot.edges.byRole("id")?.value(e),
    );
    return { styles: ex, values, edge: (property, id) => values("edge", property)[ids.indexOf(id)] };
}

const DOT = `digraph {
    a [shape=cylinder]; b [shape=box, style="rounded"]; c;
    a -> b [style=dashed, arrowhead=onormal];
}`;

const VIS = JSON.stringify({
    nodes: [
        { id: 1, shape: "icon", icon: { code: "\\uf007" } },
        { id: 2, shape: "box" },
    ],
    edges: [{ from: 1, to: 2, arrows: { to: { enabled: true, type: "crow" } } }],
});

describe("settled arrows", () => {
    it("gives vis-network's crow as the vee turned round it draws", async () => {
        const { values } = await load(VIS, "json");
        expect(values("edge", "targetArrow")).toEqual(["inverted-vee"]);
    });

    it("gives yEd's arrows of several pieces as an end cap and a row sized to the line", async () => {
        const { edge } = await load(
            new Uint8Array(readFileSync(resolve(SPECIMENS, "yed-graphml/specimen-arrows.graphml"))),
            "graphml",
        );
        // at line width 1, on yEd's standard head of 12 by 10
        expect(edge("targetArrow", "target-standard")).toBe("vee");
        expect([edge("targetArrowExtent", "target-standard"), edge("targetArrowBreadth", "target-standard")]).toEqual([
            12, 10,
        ]);
        expect(edge("targetArrow", "target-dash")).toBe("stem");
        expect(edge("targetArrowParts", "target-dash")).toBe("tee*1x8");
        expect(edge("targetArrowExtent", "target-dash")).toBe(8);
        expect(edge("targetArrow", "target-crows-foot-one-mandatory")).toBe("stem");
        expect(edge("targetArrowParts", "target-crows-foot-one-mandatory")).toBe("tee*1x16 stem*8 tee*1x16");
        expect(edge("targetArrow", "target-white-delta-bar")).toBe("triangle-open");
        expect(edge("targetArrowParts", "target-white-delta-bar")).toBe("stem*5 tee*1x16");
        expect(edge("targetArrow", "target-crows-foot-many-optional")).toBe("crow");
        expect(edge("targetArrowParts", "target-crows-foot-many-optional")).toBe("circle-open*10x10");
    });

    it("strokes Graphviz's open arrowhead as thick as its line, at Graphviz's size", async () => {
        const { values } = await load(DOT, "dot");
        expect(values("edge", "targetArrow")).toEqual(["triangle-open"]);
        expect(values("edge", "targetArrowOutlineWidth")).toEqual([1]);
        expect(values("edge", "targetArrowExtent")).toEqual([10]);
    });
});

describe("settled shapes, corners and dashes", () => {
    it("gives Graphviz's cylinder and vis-network's icon node as graphty's shapes", async () => {
        expect((await load(DOT, "dot")).values("node", "shape")).toEqual(["database", "round-rectangle", "ellipse"]);
        expect((await load(VIS, "json")).values("node", "shape")).toEqual(["none", "round-rectangle"]);
    });

    it("gives Graphviz's corner rounding: a third of the shorter side, at most 12", async () => {
        const { values } = await load(DOT, "dot");
        expect(values("node", "cornerRadiusCap")).toEqual([12, 12, 12]);
        expect(values("node", "cornerFraction")).toEqual([1 / 3, 1 / 3, 1 / 3]);
    });

    it("gives Graphviz's dashes in widths of the line", async () => {
        const { values } = await load(DOT, "dot");
        expect(values("edge", "dashLength")).toEqual([5]);
        expect(values("edge", "dashGap")).toEqual([2]);
    });
});

describe("settled sizes, labels and order", () => {
    it("sizes every shape of another program's file uniformly and draws its nodes in file order", async () => {
        const { values } = await load(DOT, "dot");
        expect(values("node", "sizeMode")).toEqual(["uniform", "uniform", "uniform"]);
        expect(values("node", "drawOrder")).toEqual([0, 50, 100]);
    });

    it("places Cytoscape.js's outside labels by their words", async () => {
        const doc = JSON.stringify({
            elements: { nodes: [{ data: { id: "a", label: "A" } }], edges: [] },
            style: [{ selector: "node", style: { label: "data(label)", "text-valign": "top" } }],
        });
        expect((await load(doc, "json")).values("node", "labelGapOf")).toEqual(["words"]);
    });

    it("keeps vis-network's border width on screen", async () => {
        expect((await load(VIS, "json")).values("node", "borderScreenWidth")).toEqual([1, 1]);
    });

    it("draws an edge's end captions in its label's face", async () => {
        const doc = `digraph { edge [fontsize=20, fontcolor="#ff0000"]; a -> b [headlabel="H"] }`;
        const { values } = await load(doc, "dot");
        expect(values("edge", "targetLabelSize")).toEqual([20]);
        expect(values("edge", "targetLabelColor")).toEqual(["#ff0000"]);
    });

    it("settles sigma.js's label grid into node screen sizes for the canvas it is drawn in", async () => {
        const doc = JSON.stringify({
            attributes: {},
            nodes: [
                { key: "a", attributes: { x: 0, y: 0, size: 10, label: "A" } },
                { key: "b", attributes: { x: 1, y: 1, size: 5, label: "B" } },
                { key: "c", attributes: { x: 100, y: 100, size: 5, label: "C" } },
            ],
            edges: [],
        });
        const { values } = await load(doc, "json", { viewport: { width: 800, height: 600 } });
        // fitted 30 px in from the canvas's 600 px side: 5.4 px per unit; a and b share a 100 px cell, b ranked second
        // shows once its 10 px are drawn 5.4 times as large (54 px); the label sizes are on screen
        expect(values("node", "labelMinNodeScreenSize")).toEqual([12, 54, 12]);
        expect(values("node", "labelGridCellSize")).toEqual([null, null, null]);
        expect(values("node", "labelScreenSize")).toEqual([12, 12, 12]);
    });
});

describe("settled facts in place of the program", () => {
    it("states how far apart the program lays out a file with no positions", async () => {
        expect((await load(VIS, "json")).styles.styles.lengths).toEqual({ units: "file", spacing: 87 });
        const gexf =
            '<gexf version="1.3"><graph><nodes><node id="a"/><node id="b"/><node id="c"/><node id="d"/></nodes></graph></gexf>';
        // Gephi scatters nodes over a 1000-wide square: the median nearest distance of 4 uniform points
        expect((await load(gexf, "gexf")).styles.styles.lengths?.spacing).toBeCloseTo(
            1000 * Math.sqrt(Math.LN2 / (Math.PI * 4)),
            9,
        );
    });

    it("gives a file graphty drew in scene units, with its old border color as the outline", async () => {
        const result = await registry.importGraph(DOT, { format: "dot" });
        const read = readFileStyles(registry.importer("dot"), result.snapshot, result.report) as ExtractedStyles;
        const graphty = { ...read, styles: { ...read.styles, source: { ...read.styles.source, tool: "graphty" } } };
        const settled = settleStyles(graphty, result.snapshot);
        expect(settled.styles.lengths).toEqual({ units: "scene" });
        const outline = resolveStyles(settled, "node", "graphty:node.outline", result.snapshot);
        expect(outline).toEqual(resolveStyles(read, "node", "borderColor", result.snapshot));
        expect(resolveStyles(settled, "node", "borderColor", result.snapshot)).toEqual([null, null, null]);
        expect(resolveStyles(settled, "node", "drawOrder", result.snapshot)).toEqual([null, null, null]);
    });

    it("leaves the program's defaults out when asked, with nothing derived from them", async () => {
        const { styles } = await load(DOT, "dot", { toolDefaults: false });
        expect(styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
        expect(styles.styles.rules.some((r) => r.set?.cornerRadiusCap !== undefined)).toBe(false);
    });

    it("names every rule by what it does", async () => {
        const { styles } = await load(DOT, "dot");
        const names = styles.styles.rules.map((r) => r.name);
        expect(names.every((name) => typeof name === "string" && name.length > 0)).toBe(true);
        expect(names.some((name) => /graphviz|dot/i.test(name ?? ""))).toBe(false);
        expect(names).toContain("Arrows");
        expect(names).toContain("Defaults");
    });
});

describe("unsettledStyles", () => {
    it.each([
        ["dot", DOT],
        ["json", VIS],
    ])("gives back exactly what the %s reader and planner read", async (format, doc) => {
        const result = await registry.importGraph(doc, { format, styles: true });
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        const read = readFileStyles(registry.importer(format), result.snapshot, result.report);
        expect(JSON.parse(JSON.stringify(unsettledStyles(result.styles).styles))).toEqual(
            JSON.parse(JSON.stringify(read?.styles)),
        );
        expect([...unsettledStyles(result.styles).columns.node.keys()]).toEqual([...(read?.columns.node.keys() ?? [])]);
    });
});
