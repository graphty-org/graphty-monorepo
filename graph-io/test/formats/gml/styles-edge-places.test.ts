/**
 * GML styles that Graphviz's gv2gml and OGDF write and their programs draw: gv2gml's open arrows and double outlines,
 * and where Graphviz (`lp`) and OGDF's drawSVG place an edge's label.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { toolDefaults } from "../../../src/styles/defaults.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a GML document with its styles.
 * @param doc - the document
 * @returns the snapshot and a reader of one property per element
 */
async function load(doc: string) {
    const result = await registry.importGraph(doc, { format: "gml", styles: { toolDefaults: true } });
    const { styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    type Property = Parameters<typeof resolveStyles>[2];
    return {
        node: (p: Property): readonly unknown[] => resolveStyles(styles, "node", p, result.snapshot),
        edge: (p: Property): readonly unknown[] => resolveStyles(styles, "edge", p, result.snapshot),
    };
}

/** A gv2gml node: its center in points (y up) and its graphics keys. */
const gvNode = (id: number, x: number, y: number, g = 'type "circle" outline "#505050" width 1'): string =>
    `node [ id ${String(id)} name "${String(id)}" graphics [ x ${String(x)} y ${String(y)} w 12 H 12 hasFill 1 fill "#c8c8c8" ${g} ] ]`;

describe("GML styles: gv2gml's arrows and outlines as Graphviz draws them", () => {
    it("reads the open arrows the neutral vocabulary has no name for (obox, oinv, invempty) as open", async () => {
        const edge = (id: number, arrow: string): string =>
            `edge [ id ${String(id)} source 0 target 1 graphics [ targetArrow "${arrow}" arrow "first" ] ]`;
        const { edge: edge$ } = await load(
            [
                "graph [ version 2 directed 1",
                gvNode(0, 10, 10),
                gvNode(1, 90, 10),
                edge(1, "obox"),
                edge(2, "olbox"),
                edge(3, "oinv"),
                edge(4, "invempty"),
                edge(5, "onormal"),
                "]",
            ].join("\n"),
        );
        expect(edge$("targetArrow")).toEqual([
            "other:open-square",
            "other:open-square",
            "other:open-inverted",
            "other:open-inverted",
            "triangle-open",
        ]);
        expect(edge$("targetArrowSide")[1]).toBe("left");
    });

    it("reads curve and icurve as an arc bulging toward the tip and away from it, half an arrow deep", async () => {
        const edge = (id: number, arrow: string): string =>
            `edge [ id ${String(id)} source 0 target 1 graphics [ targetArrow "${arrow}" arrow "first" ] ]`;
        const { edge: edge$ } = await load(
            [
                "graph [ version 2 directed 1",
                gvNode(0, 10, 10),
                gvNode(1, 90, 10),
                edge(1, "curve"),
                edge(2, "icurve"),
                edge(3, "licurve"),
                "]",
            ].join("\n"),
        );
        expect(edge$("targetArrow")).toEqual(["other:curve", "other:inv-curve", "other:inv-curve"]);
        expect(edge$("targetArrowSide")[2]).toBe("left");
        // arrows.c arrow_type_curve: an arc of radius half the arrow's 10 points across a stem 10 points long
        const shapes = toolDefaults("graphviz")?.arrowhead?.shapes;
        expect(shapes?.["other:curve"]).toEqual({ length: 0.5, aspect: 2 });
        expect(shapes?.["other:inv-curve"]).toEqual({ length: 0.5, aspect: 2 });
    });

    it("draws the second outline of a doublecircle and a doubleoctagon, 4 points outside the first", async () => {
        const { node: node$ } = await load(
            [
                "graph [ version 2 directed 0",
                gvNode(0, 10, 10, 'type "doublecircle" outline "#505050" width 1'),
                gvNode(1, 50, 10, 'type "doubleoctagon" outline "#ff0000" width 2 outlineStyle "dashed"'),
                gvNode(2, 90, 10, 'type "circle"'),
                "]",
            ].join("\n"),
        );
        expect(node$("outerBorderColor")).toEqual(["#505050", "#ff0000", null]);
        expect(node$("outerBorderWidth")).toEqual([1, 2, null]);
        expect(node$("outerBorderOffset")).toEqual([3, 2, null]);
        expect(node$("outerBorderStyle")[1]).toBe("dashed");
        // w and H are the outer size: the innermost outline is 2 x 4 points smaller
        expect(node$("width")).toEqual([4, 4, 12]);
    });
});

describe("GML styles: where the program places an edge's label", () => {
    it("moves a gv2gml label to Graphviz's lp, beside a straight line (y up)", async () => {
        const { edge: edge$ } = await load(
            [
                "graph [ version 2 directed 0",
                gvNode(0, 10, 100),
                gvNode(1, 90, 100),
                'edge [ id 1 source 0 target 1 label "Abc" lp "52.5,106.5" graphics [ Line [ point [ x 16 y 100 ] point [ x 40 y 100 ] point [ x 60 y 100 ] point [ x 84 y 100 ] ] ] LabelGraphics [ text "Abc" ] ]',
                'edge [ id 2 source 0 target 1 lp "" graphics [ ] ]',
                "]",
            ].join("\n"),
        );
        // 2.5 right of the middle, 6.5 above it: y grows downward in graphty
        expect(edge$("labelOffsetX")).toEqual([2.5, null]);
        expect(edge$("labelOffsetY")).toEqual([-6.5, null]);
        // moved from the line's middle, not from beside it
        expect(edge$("labelPosition")[0]).toBe("center");
    });

    it("moves an OGDF label on a bent edge to the middle of its first segment, where drawSVG draws it", async () => {
        const ogdfNode = (id: number, x: number, y: number): string =>
            `node [ id ${String(id)} graphics [ x ${String(x)} y ${String(y)} w 12 h 12 type "Ellipse" ] ]`;
        const { edge: edge$ } = await load(
            [
                'Creator "ogdf::GraphIO::writeGML"',
                "graph [ directed 0",
                ogdfNode(0, 935, 436),
                ogdfNode(1, 1011, 436),
                ogdfNode(2, 100, 100),
                ogdfNode(3, 200, 100),
                'edge [ source 0 target 1 label "Abc" graphics [ type "line" Line [ point [ x 935 y 436 ] point [ x 973 y 406 ] point [ x 1011 y 436 ] ] ] ]',
                'edge [ source 2 target 3 label "Abc" graphics [ type "line" ] ]',
                "]",
            ].join("\n"),
        );
        // graphty hangs the label at the bend (973, 406); drawSVG at (954, 421)
        expect(edge$("labelOffsetX")).toEqual([-19, null]);
        expect(edge$("labelOffsetY")).toEqual([15, null]);
        // drawSVG draws every edge label on its line
        expect(edge$("labelPosition")).toEqual(["center", "center"]);
    });
});

describe("GML styles: what Gephi leaves out", () => {
    it("hides an edge whose directed key disagrees with a Gephi graph's, which Gephi's importer never loads", async () => {
        const doc = (graph: 0 | 1 | null): string =>
            [
                "graph [",
                '  Creator "Gephi"',
                graph === null ? "" : `  directed ${String(graph)}`,
                '  node [ id 0 label "a" graphics [ x 0.0 y 0.0 w 10.0 ] ]',
                '  node [ id 1 label "b" graphics [ x 100.0 y 0.0 w 10.0 ] ]',
                "  edge [ id 1 source 0 target 1 directed 0 ]",
                "  edge [ id 2 source 0 target 1 directed 1 ]",
                "]",
            ].join("\n");
        // a directed graph: the undirected edge (read as a pair of directed halves) is hidden, the directed one kept
        expect((await load(doc(1))).edge("visible")).toEqual([false, false, null]);
        // an undirected graph: the directed edge is the one Gephi leaves out
        const undirected = (await load(doc(0))).edge("visible");
        expect(undirected.filter((v) => v === false)).toHaveLength(1);
        // no directed header: Gephi reads a mixed graph and loads every edge
        expect((await load(doc(null))).edge("visible").filter((v) => v === false)).toHaveLength(0);
    });
});
