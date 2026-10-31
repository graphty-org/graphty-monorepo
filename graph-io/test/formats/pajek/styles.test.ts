/**
 * Pajek styles: vertex shape keywords and drawing parameters and line parameters read with Pajek's rules and
 * Pajek's stated defaults, the files that failed to read before (a trailing `0` after the parameters, `NaN` line
 * values, a shape keyword among the parameters), and styles written back as Pajek parameters with the
 * `graphty.styles` block as a comment line.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { PAJEK_ISSUE, PAJEK_STYLE_COMMENT } from "../../../src/formats/pajek/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
} from "../../../src/styles/internal.js";
import { editPajekVertexFill, replacePajekBlock } from "../../styles/formats/pajek.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/pajek");
const GENERATED = join(CORPUS, "generated");

/**
 * Imports a Pajek document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether Pajek's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, {
        format: "pajek",
        styles: { toolDefaults },
        errorLimit: Infinity,
    });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * What graphty draws for one property of every element.
 * @param ex - the styles
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values by element index
 */
function drawn(ex: ExtractedStyles, snapshot: GraphSnapshot, target: StyleTarget, property: string) {
    return resolveStyles(ex, target, property as StyleProperty, snapshot);
}

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(join(GENERATED, name)));
const text = (name: string): string => readFileSync(join(GENERATED, name), "utf8");
const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];
const codes = (ex: ExtractedStyles): string[] => ex.styles.notes.map((n) => n.code);

describe("Pajek styles: Pajek's rules", () => {
    it("draws each vertex's label, nothing for an empty one, and Pajek's dark red border half a point wide", async () => {
        const { snapshot, styles } = await load(
            '*Vertices 3\n1 "Achilles" ic Red\n2 "" bc Blue bw 3\n3 Hector ic Red\n',
        );
        expect(drawn(styles, snapshot, "node", "label")).toEqual(["Achilles", null, "Hector"]);
        expect(drawn(styles, snapshot, "node", "borderColor")).toEqual(["#660000", "#0000ff", "#660000"]);
        // a border width is in points, as written
        expect(drawn(styles, snapshot, "node", "borderWidth")).toEqual([0.5, 3, 0.5]);
        const bare = await load('*Vertices 1\n1 "Achilles"\n', false);
        expect(drawn(bare.styles, bare.snapshot, "node", "label")).toEqual(["Achilles"]);
        expect(drawn(bare.styles, bare.snapshot, "node", "borderColor")).toEqual([null]);
    });

    it("writes the label graphty draws, the nearest Pajek can hold for a line break or a double quote", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.addNode("b");
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { label: ['two\nlines "quoted"', "plain"] } },
                edge: { values: {} },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
        );
        const losses = registry.checkExport(g, "pajek", { styles });
        expect(losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => l.style?.property)).toEqual([
            "label",
        ]);
        const out = await registry.exportGraphToString(g, "pajek", { styles });
        expect(out).toContain(`1 "two lines 'quoted'"`);
        const back = await load(out);
        expect(drawn(back.styles, back.snapshot, "node", "label")).toEqual(['two\nlines "quoted"', "plain"]);
        const withoutBlock = await load(out.replace(/^% graphty\.styles .*\n/, ""));
        expect(drawn(withoutBlock.styles, withoutBlock.snapshot, "node", "label")).toEqual([
            "two lines 'quoted'",
            "plain",
        ]);
    });

    it("reads the shape keyword and the vertex parameters in points, a vertex 20 points times x_fact and y_fact", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        expect(styles.styles.source).toEqual({ format: "pajek", dialect: "dvips", tool: "pajek" });
        expect(styles.styles.units.length).toBe("px");
        expect(drawn(styles, snapshot, "node", "shape")).toEqual([
            "ellipse",
            "rectangle",
            "polygon",
            "triangle",
            "other:cross",
            "none",
        ]);
        // Pajek's diamond has its top and bottom cut q wide (q 0.001 by default): six corners
        expect(drawn(styles, snapshot, "node", "shapePoints")[2]).toBe("-1,0 -0.001,1 0.001,1 1,0 0.001,-1 -0.001,-1");
        expect(drawn(styles, snapshot, "node", "fill").slice(0, 4)).toEqual([
            "#ff804d",
            "#61ffe0",
            "#ff8a80",
            "#db9470",
        ]);
        // as Pajek 6.02 draws the file: the vertices that set no size are Pajek's normal 20 points, and each vertex
        // that names a shape starts from the defaults, whatever the one before it set
        expect(drawn(styles, snapshot, "node", "width")).toEqual([80, 80, 120, 160, 20, 0]);
        expect(drawn(styles, snapshot, "node", "height")).toEqual([40, 80, 40, 40, 20, 0]);
        expect(drawn(styles, snapshot, "node", "labelColor").slice(0, 3)).toEqual(["#0f75ff", "#000000", "#660000"]);
        expect(drawn(styles, snapshot, "node", "labelSize").slice(0, 3)).toEqual([16, 16, 15]);
        expect(drawn(styles, snapshot, "node", "borderWidth")[1]).toBe(2);
        // a label's text starts at its polar point: no lr or lphi is Pajek's default, 20 from the center at 285
        // degrees, and lr 30 lphi 200 is 30 out at 200 degrees, each label's middle 0.3465 of its size above the point
        expect(drawn(styles, snapshot, "node", "labelPosition").slice(2, 4)).toEqual(["center", "center"]);
        expect(drawn(styles, snapshot, "node", "labelOffsetX").slice(2, 4)).toEqual([5.176380902, -28.190778624]);
        expect(drawn(styles, snapshot, "node", "labelOffsetY").slice(2, 4)).toEqual([14.121016526, 5.0631043]);
        // `cross` has no name in the neutral vocabulary: kept as other:cross and noted; the line pattern `Dashed` is
        // no Pajek keyword: noted
        expect(codes(styles)).toEqual(["W_STYLE_UNKNOWN_VALUE", "W_STYLE_UNKNOWN_VALUE"]);
    });

    it("reads line color, width and pattern, carried from line to line, and Pajek's arc and edge defaults", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const key = (e: number): string =>
            `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))}-${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}`;
        const byEdge = (property: string): Record<string, unknown> =>
            Object.fromEntries(drawn(styles, snapshot, "edge", property).map((v, e) => [key(e), v]));
        // as Pajek 6.02 draws the file: arc 3-5 sets no color and is drawn in arc 4-2's red; an edge is drawn twice its w
        expect(byEdge("color")).toMatchObject({ "1-1": "#0000ff", "4-2": "#ff0000", "3-5": "#ff0000" });
        expect(byEdge("width")).toMatchObject({ "1-1": 3, "4-2": 3, "3-5": 1.5, "1-2": 4, "5-6": 4 });
        // Pajek's SVG export draws Dots and a negative value in 5 px dashes and gaps: dashes on the arc 3 wide, dots on
        // the edge 4 wide
        expect(byEdge("lineStyle")).toMatchObject({
            "4-2": "dashed",
            "3-5": "solid",
            "1-2": "dotted",
            // Pajek knows Solid and Dots only: `p Dashed` draws a solid line
            "5-6": "solid",
            "1-1": "solid",
        });
        // arcs get Pajek's arrow at the target; edges (each kept as a pair) none
        // the loop 1-1 is an arc too, but its head is drawn under its node, where the loop comes back to the center
        expect(byEdge("targetArrow")).toMatchObject({ "1-1": "none", "4-2": "triangle", "1-2": "none" });
        expect(new Set(drawn(styles, snapshot, "edge", "sourceArrow"))).toEqual(new Set(["none"]));
    });

    it("draws no line of value 0, and a pattern Pajek does not know as a solid line", async () => {
        const { snapshot, styles } = await load(
            "*Vertices 4\n1 a\n2 b\n3 c\n4 d\n*Arcs\n1 2 0\n2 3 1 p dots\n3 4 1 p Dots\n",
        );
        expect(drawn(styles, snapshot, "edge", "visible")).toEqual([false, null, null]);
        expect(drawn(styles, snapshot, "edge", "lineStyle")).toEqual(["solid", "solid", "dashed"]);
        // the same when the import keeps the line value as an attribute (weightFrom null), as graphty-element reads it;
        // a negative value is dashed while the line carries no pattern
        const kept = await registry.importGraph("*Vertices 3\n1 a\n2 b\n3 c\n*Arcs\n1 2 0\n2 3 -1\n3 1 -1 p Solid\n", {
            format: "pajek",
            styles: { toolDefaults: true },
            weightFrom: null,
        });
        if (kept.styles === null || kept.styles === undefined) {
            throw new Error("no styles");
        }
        expect(drawn(kept.styles, kept.snapshot, "edge", "visible")).toEqual([false, null, null]);
        expect(drawn(kept.styles, kept.snapshot, "edge", "lineStyle")).toEqual(["solid", "dashed", "solid"]);
    });

    it("reads every color form Pajek documents: names, GrayNN, RGB and CMYK in hex and decimals", async () => {
        const { snapshot, styles } = await load(file("color-forms.net"));
        expect(drawn(styles, snapshot, "node", "fill")).toEqual([
            "#616ec4",
            "#ffff00",
            "#ff8000",
            "#33cc99",
            "#404040",
            // LightYellow, one of the ten names Pajek adds to dvips'; an out-of-range channel and no ic: Pajek's
            // default (a name Pajek does not know is white: `pajek-specimen-node-fills-borders-p3`)
            "#ffff99",
            "#ffd9bc",
            "#ffd9bc",
        ]);
        expect(drawn(styles, snapshot, "node", "borderColor").slice(0, 3)).toEqual(["#000000", "#00ffff", "#cccccc"]);
        expect(drawn(styles, snapshot, "edge", "color")).toEqual([
            "#0000ff",
            "#a60000",
            "#ff0033",
            "#808080",
            // the last arc sets no c and is drawn in the one before it's Gray50, as Pajek 6.02 draws it
            "#808080",
        ]);
        const bad = styles.styles.notes.find((n) => n.code === "W_STYLE_BAD_VALUE");
        expect(bad?.params.samples).toEqual(["RGB(2,0,0)"]);
    });

    it("carries parameters from line to line as Pajek 6.02 draws them", async () => {
        // this file as Pajek 6.02's own SVG export draws it: a vertex that sets nothing is drawn as the vertex before
        // it, a vertex that sets anything starts from the defaults, and a line keeps each parameter the line before
        // it set
        const doc = [
            "*Vertices 4",
            '1 "a" 0.1 0.1 0.5 box ic Red x_fact 2 fos 9',
            '2 "b" 0.9 0.1 0.5',
            '3 "c" 0.1 0.9 0.5 ic Green bw 2',
            '4 "d" 0.9 0.9 0.5',
            "*Arcs",
            "1 2 1 c Blue w 3",
            "2 3 1 w 1",
            "3 4 1",
            "",
        ].join("\n");
        const { snapshot, styles } = await load(doc);
        expect(drawn(styles, snapshot, "node", "shape")).toEqual(["rectangle", "rectangle", "ellipse", "ellipse"]);
        expect(drawn(styles, snapshot, "node", "fill")).toEqual(["#ff0000", "#ff0000", "#00ff00", "#00ff00"]);
        expect(drawn(styles, snapshot, "node", "width")).toEqual([40, 40, 20, 20]);
        expect(drawn(styles, snapshot, "node", "labelSize")).toEqual([9, 9, 15, 15]);
        expect(drawn(styles, snapshot, "node", "borderWidth")).toEqual([0.5, 0.5, 2, 2]);
        expect(drawn(styles, snapshot, "edge", "color")).toEqual(["#0000ff", "#0000ff", "#0000ff"]);
        expect(drawn(styles, snapshot, "edge", "width")).toEqual([3, 1, 1]);
        // written back so that Pajek carries nothing the styles do not say
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        const back = await load(out.replace(/^% graphty\.styles .*\n/m, ""));
        for (const [target, property] of [
            ["node", "shape"],
            ["node", "fill"],
            ["node", "width"],
            ["node", "borderWidth"],
            ["edge", "color"],
            ["edge", "width"],
        ] as const) {
            expect(drawn(back.styles, back.snapshot, target, property), `${target} ${property}`).toEqual(
                drawn(styles, snapshot, target, property),
            );
        }
    });

    it("gives a file without parameters Pajek's defaults, and none with toolDefaults: false", async () => {
        const doc = "*Vertices 3\n1 a\n2 b\n3 c\n*Arcs\n1 2\n*Edges\n2 3\n";
        const { snapshot, styles } = await load(doc);
        // as Pajek 6.02 draws a file without parameters (test/fidelity/oracles/pajek-*.svg)
        expect(new Set(drawn(styles, snapshot, "node", "shape"))).toEqual(new Set(["ellipse"]));
        expect(drawn(styles, snapshot, "node", "fill")).toEqual(["#ffd9bc", "#ffd9bc", "#ffd9bc"]);
        expect(drawn(styles, snapshot, "node", "borderColor")).toEqual(["#660000", "#660000", "#660000"]);
        expect(drawn(styles, snapshot, "node", "width")).toEqual([20, 20, 20]);
        expect(drawn(styles, snapshot, "node", "labelSize")).toEqual([15, 15, 15]);
        expect(drawn(styles, snapshot, "node", "labelColor")).toEqual(["#ad0000", "#ad0000", "#ad0000"]);
        expect(drawn(styles, snapshot, "node", "labelWeight")).toEqual(["bold", "bold", "bold"]);
        // an arc is grey and 1 wide, an edge (kept as a pair) teal and 2 wide
        expect(drawn(styles, snapshot, "edge", "width")).toEqual([1, 2, 2]);
        expect(drawn(styles, snapshot, "edge", "color")).toEqual(["#999999", "#007091", "#007091"]);
        expect(drawn(styles, snapshot, "edge", "targetArrow")).toEqual(["triangle", "none", "none"]);
        const bare = await load(doc, false);
        expect(bare.styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
        expect(drawn(bare.styles, bare.snapshot, "node", "shape")).toEqual([null, null, null]);
        for (const property of ["borderColor", "borderWidth", "labelColor", "labelPosition"]) {
            expect(drawn(bare.styles, bare.snapshot, "node", property)).toEqual([null, null, null]);
        }
    });
});

describe("Pajek styles: where an arc's arrowhead stops", () => {
    it("stops an arc's arrowhead 1 px short of its target's outline, whatever its size", async () => {
        // pajek-synth-lines: every arc's tip 1.25 from a vertex 20 across with a border 0.5 wide, `s` 1 to 5; `s`
        // carries to the next line, and a loop and an edge draw no arrowhead
        const { snapshot, styles } = await load(
            "*Vertices 3\n1 a 0.1 0.1\n2 b 0.2 0.1\n3 c 0.3 0.1\n*Arcs\n1 2\n2 3 s 5\n3 1\n3 3\n*Edges\n1 3\n",
        );
        // an edge is kept as a pair of directed edges
        expect(drawn(styles, snapshot, "edge", "targetArrowGap")).toEqual([
            0.166667,
            0.0333333,
            0.0333333,
            null,
            null,
            null,
        ]);
    });
});

describe("Pajek styles: sizes, label placement and line labels", () => {
    const doc = [
        "*Vertices 4",
        '1 "a" 0.1 0.1 0.5 ellipse s_size 2 x_fact 3 fos 8 font Courier lr 0',
        '2 "b" 0.9 0.1 0.5 ellipse s_size 2 lphi 90',
        '3 "c" 0.1 0.9 0.5 y_fact 0.4 lr 12 lphi 300',
        '4 "d" 0.9 0.9 0.5 ellipse bw 0.5',
        "*Arcs",
        '1 2 1 w 0.6 l "a to b" lc Red fos 14 font Times',
        "3 4 1",
        "",
    ].join("\n");

    it("draws a vertex 20 points times x_fact and y_fact whatever its s_size, and places its label by lr and lphi", async () => {
        // pajek-specimen-node-sizes-opacity: s_size 0.5, 2 and 3 are all drawn 36 across at x_fact 1.8
        const { snapshot, styles } = await load(doc);
        expect(drawn(styles, snapshot, "node", "width")).toEqual([60, 20, 20, 20]);
        expect(drawn(styles, snapshot, "node", "height")).toEqual([20, 20, 8, 20]);
        expect(drawn(styles, snapshot, "node", "borderWidth")).toEqual([0.5, 0.5, 0.5, 0.5]);
        expect(drawn(styles, snapshot, "node", "labelSize")).toEqual([8, 15, 15, 15]);
        // a PostScript font name is its family with a generic one after it (`pajek-specimen-labels` `font-courier`)
        expect(drawn(styles, snapshot, "node", "labelFont")).toEqual(["Courier, monospace", "Arial", "Arial", "Arial"]);
        // Pajek starts a label's text at the polar point, its baseline through it, and runs it right: lr 0 centers it,
        // lphi 90 at the default lr 20 is 20 above the center, lr 12 lphi 300 below and right; the last vertex sets
        // neither and is left to the default beneath
        expect(drawn(styles, snapshot, "node", "labelPosition")).toEqual(["center", "center", "center", "center"]);
        expect(drawn(styles, snapshot, "node", "labelShiftX")).toEqual([0, 0.5, 0.5, 0.5]);
        expect(drawn(styles, snapshot, "node", "labelOffsetX")).toEqual([0, 0, 6, 5.176380902]);
        expect(drawn(styles, snapshot, "node", "labelOffsetY")).toEqual([0, -25.1975, 5.194804845, 14.121016526]);
    });

    it("reads a line's label, its color, size and font, and its width in points", async () => {
        const { snapshot, styles } = await load(doc);
        // Pajek draws no line label but under Mark Lines / with Labels (`pajek-specimen-edge-labels-p2`)
        expect(drawn(styles, snapshot, "edge", "label")).toEqual([null, null]);
        const marked = await registry.importGraph(doc, {
            format: "pajek",
            styles: true,
            pajekDraw: { ini: { "Form8.withLabels1": "" } },
        });
        if (marked.styles === null || marked.styles === undefined) {
            throw new Error("no styles");
        }
        expect(drawn(marked.styles, marked.snapshot, "edge", "label")).toEqual(["a to b", null]);
        expect(drawn(styles, snapshot, "edge", "labelColor")).toEqual(["#ff0000", null]);
        expect(drawn(styles, snapshot, "edge", "labelSize")).toEqual([14, null]);
        expect(drawn(styles, snapshot, "edge", "labelFont")).toEqual(["Times, serif", null]);
        // the second arc sets no w and is drawn as wide as the first, as Pajek 6.02 draws it
        expect(drawn(styles, snapshot, "edge", "width")).toEqual([0.6, 0.6]);
    });

    it("reads an arc's arrow position ap as a fraction from its end, notes a distance above 1, and writes it back", async () => {
        const arcs = "*Vertices 3\n1 a\n2 b\n3 c\n*Arcs\n1 2 1 ap 0.5\n2 3 1 ap 20\n3 1 1\n";
        const { snapshot, styles } = await load(arcs);
        expect(drawn(styles, snapshot, "edge", "arrowPosition")).toEqual([0.5, null, null]);
        expect(
            styles.styles.notes.filter(
                (n) => n.code === "W_STYLE_NOT_CARRIED" && n.params.property === "arrowPosition",
            ),
        ).toHaveLength(1);
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        expect(out).toMatch(/^1 2 .*\bap 0\.5\b/m);
        const back = await load(out.replace(/^% graphty\.styles .*\n/m, ""));
        expect(drawn(back.styles, back.snapshot, "edge", "arrowPosition")).toEqual([0.5, null, null]);
    });

    it("writes the same sizes, label places and line labels back, read without the block as with it", async () => {
        const { snapshot, styles } = await load(doc);
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        for (const back of [await load(out), await load(out.replace(/^% graphty\.styles .*\n/, ""))]) {
            for (const [target, property] of [
                ["node", "width"],
                ["node", "height"],
                ["node", "borderWidth"],
                ["node", "labelSize"],
                ["node", "labelFont"],
                ["node", "labelPosition"],
                ["edge", "width"],
                ["edge", "label"],
                ["edge", "labelColor"],
                ["edge", "labelSize"],
                ["edge", "labelFont"],
            ] as const) {
                expect(drawn(back.styles, back.snapshot, target, property), `${target} ${property}`).toEqual(
                    drawn(styles, snapshot, target, property),
                );
            }
        }
    });
});

describe("Pajek files that failed to read before", () => {
    it("keeps every vertex's label, position and style when Pajek wrote a trailing 0, and every edge", async () => {
        const { snapshot, styles, report } = await load(file("b98-trailing-zero.net"));
        expect(report.counts.skippedNodes).toBe(0);
        expect(report.counts.skippedEdges).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([PAJEK_ISSUE.TRAILING_VALUE]);
        expect(snapshot.nodeCount).toBe(12);
        // 10 arcs and 8 edges, each edge kept as a directed pair
        expect(snapshot.edgeCount).toBe(26);
        const labels = snapshot.nodes.byRole("label");
        expect(Array.from({ length: 12 }, (_, i) => labels?.value(i))).toEqual(
            Array.from({ length: 12 }, (_, i) => String(i + 1)),
        );
        const fills = drawn(styles, snapshot, "node", "fill");
        // every vertex is colored: the four that set nothing are drawn as the vertex before them, as Pajek 6.02 draws
        // the file
        expect(fills.filter((v) => v !== "#ffd9bc")).toHaveLength(12);
        expect(fills[2]).toBe(fills[1]);
        expect(drawn(styles, snapshot, "node", "width")[0]).toBe(380);
    });

    it("keeps a line whose value is NaN, without a value", async () => {
        const { snapshot, report } = await load(file("nan-values.net"));
        expect(snapshot.edgeCount).toBe(16);
        expect(report.counts.skippedEdges).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([PAJEK_ISSUE.NAN_VALUE]);
        const weights = snapshot.edges.byRole("weight");
        const loop = Array.from({ length: snapshot.edgeCount }, (_, e) => e).find(
            (e) => snapshot.edgeSource(e) === 0 && snapshot.edgeTarget(e) === 0,
        );
        expect(loop).toBeDefined();
        expect(weights?.isSet(loop ?? -1)).toBe(false);
    });

    it("reads a shape keyword written among the parameters, as Pajek does", async () => {
        const { snapshot, styles, report } = await load(
            '*Vertices 2\n1 "a" ic Red triangle\n2 "b" box bc Blue\n*Edges\n',
        );
        expect(report.issues).toEqual([]);
        expect(drawn(styles, snapshot, "node", "shape")).toEqual(["triangle", "rectangle"]);
        expect(drawn(styles, snapshot, "node", "fill")).toEqual(["#ff0000", "#ffd9bc"]);
    });
});

describe("Pajek styles: writing", () => {
    it("draws a man or a woman at the size of the figure Pajek draws, and writes back the size it was given", async () => {
        // pajek-specimen-node-shapes: at x_fact 0.5 Pajek's man is 25.0 across and 64.9 tall, its woman 30.0 by 64.8;
        // pajek-synth-vertices: a figure that sets no factor is drawn at 0.3 of x_fact 1 and y_fact 1, not at 1
        const { snapshot, styles } = await load(
            '*Vertices 3\n1 "m" 0.1 0.1 0.5 man x_fact 0.5 y_fact 0.5\n2 "w" 0.2 0.1 0.5 woman\n3 "b" 0.3 0.1 0.5 box x_fact 0.5\n',
        );
        expect(drawn(styles, snapshot, "node", "width")).toEqual([25.02, 18.018, 10]);
        expect(drawn(styles, snapshot, "node", "height")).toEqual([64.87, 38.868, 20]);
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        expect(out).toMatch(/^1 m 0\.1 0\.1 0\.5 man x_fact 0\.5 y_fact 0\.5$/m);
        expect(out).toMatch(/^2 w 0\.2 0\.1 0\.5 woman x_fact 0\.3 y_fact 0\.3$/m);
    });

    it("writes the shape keyword and parameters and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        expect(out.startsWith(PAJEK_STYLE_COMMENT)).toBe(true);
        expect(out).toMatch(
            /^2 square 0\.8 0\.25 0\.5 box ic SkyBlue lc Black x_fact 4\.0 y_fact 4\.0 fos 16\.0 bw 2\.0$/m,
        );
        // the width arc 4-2 is drawn at, carried from the arc before it, is written on it
        expect(out).toContain("4 2 -1 c Red w 3.0 s 2.0 p Dots l dotted");
        const back = await load(out);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "shape"],
            ["node", "fill"],
            ["node", "width"],
            ["node", "labelColor"],
            ["edge", "color"],
            ["edge", "lineStyle"],
            ["edge", "targetArrow"],
        ] as const) {
            expect(drawn(back.styles, back.snapshot, target, property)).toEqual(
                drawn(styles, snapshot, target, property),
            );
        }
    });

    it("reads a file without the comment line by inference, as any Pajek file", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        const withoutBlock = out.replace(/^% graphty\.styles .*\n/, "");
        expect(withoutBlock).not.toContain("graphty.styles");
        const again = await load(withoutBlock);
        expect(again.styles.styles.source.tool).toBe("pajek");
        for (const property of ["shape", "fill", "width", "height", "labelColor", "labelSize", "borderWidth"]) {
            expect(drawn(again.styles, again.snapshot, "node", property)).toEqual(
                drawn(styles, snapshot, "node", property),
            );
        }
        // the dashed line is written as Dots, the nearest pattern Pajek has
        expect(drawn(again.styles, again.snapshot, "edge", "color")).toEqual(drawn(styles, snapshot, "edge", "color"));
    });

    it("writes colors exactly and reports what Pajek can only approximate, keeping it exact in the block", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        shape: ["hexagon", "rectangle"],
                        fill: ["#123456", "#ff0000"],
                        fillOpacity: [0.5, null],
                    },
                },
                edge: { values: { lineStyle: ["zigzag"], sourceArrow: ["diamond"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
        );
        const losses = registry.checkExport(g, "pajek", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count])
                .sort(),
        ).toEqual([
            ["edge", "lineStyle", 1],
            ["edge", "sourceArrow", 1],
            ["node", "fillOpacity", 1],
            ["node", "shape", 1],
        ]);
        expect(losses.filter((l) => l.code === "W_STYLE_NOT_WRITTEN")).toEqual([]);
        const out = await registry.exportGraphToString(g, "pajek", { styles });
        // a color with a dvips name is written by it, any other as RGBrrggbb; the ids are kept for the block; a
        // vertex drawn without a label gets an empty one, which Pajek draws as nothing
        expect(out).toContain('1 "" ic RGB123456 graphty_originalId a\n');
        expect(out).toContain('2 "" box ic Red graphty_originalId b\n');
        const back = await load(out);
        expect(drawn(back.styles, back.snapshot, "node", "label")).toEqual([null, null]);
        expect(drawn(back.styles, back.snapshot, "node", "shape")).toEqual(["hexagon", "rectangle"]);
        expect(drawn(back.styles, back.snapshot, "node", "fill")).toEqual(["#123456", "#ff0000"]);
        expect(drawn(back.styles, back.snapshot, "node", "fillOpacity")).toEqual([0.5, null]);
        expect(drawn(back.styles, back.snapshot, "edge", "lineStyle")).toEqual(["zigzag"]);
    });

    it("writes the same file without styles as before", async () => {
        const doc = text("shapes-and-lines.net");
        const { snapshot } = await load(doc);
        const out = await registry.exportGraphToString(snapshot, "pajek");
        expect(out).not.toContain("graphty.styles");
        expect(out).toMatch(/^4 wedge 0\.85 0\.8 0\.5 triangle x_fact 8 y_fact 2 ic Tan lc Black lr 30 lphi 200$/m);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(file("shapes-and-lines.net"));
    const written = await registry.exportGraphToBytes(base.snapshot, "pajek", { styles: base.styles });
    const decoded = new TextDecoder().decode(written);
    const added = decoded.replace(/^\*Vertices 6$/m, "*Vertices 7").replace(/^(\*Arcs)$/m, '7 "extra"\n$1');
    return {
        "graphty-written.net": written,
        "tamper-native-edited.net": editPajekVertexFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.net": replacePajekBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.net": new TextEncoder().encode(added),
    };
}

describe("Pajek block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_PAJEK_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_PAJEK_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(text(name)).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(file("graphty-written.net"));
        const edited = await load(file("tamper-native-edited.net"));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = (ex: ExtractedStyles): number =>
            (ex.columns.node.get("exceptions.fill") ?? []).filter((v) => v !== null).length;
        expect(excepted(edited.styles)).toBe(excepted(unedited.styles) + 1);
        expect(edited.styles.columns.node.get("exceptions.fill")).toContain("#123456");
    });

    it("ignore a truncated block and a block for another graph with a note, and read Pajek's parameters", async () => {
        for (const [name, reason] of [
            ["tamper-block-truncated.net", "NOT_JSON"],
            ["tamper-node-added.net", "FINGERPRINT"],
        ] as const) {
            const { snapshot, styles } = await load(file(name));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("pajek");
            expect(drawn(styles, snapshot, "node", "fill")).toContain("#61ffe0");
        }
    });
});
