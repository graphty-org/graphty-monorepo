/**
 * Pajek's Draw window and export options (the `pajekDraw` import option) and the line and label parameters Pajek 6.02
 * draws: each rule as Pajek 6.02's SVG export draws the Pajek specimen pages (`test/fidelity/specimens/pajek/pages.json`).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/index.js";
import {
    extractPositions,
    type FilePositions,
    type PositionColumnExtra,
    toFilePositions,
} from "../../../src/positions/index.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a Pajek document with its styles under the given draw settings.
 * @param doc - the document
 * @param pajekDraw - the draw settings, or undefined for none
 * @returns a getter of what graphty draws for a property of every element, and the import
 */
async function load(doc: string, pajekDraw?: Record<string, unknown>) {
    const result = await registry.importGraph(doc, {
        format: "pajek",
        styles: true,
        errorLimit: Infinity,
        ...(pajekDraw === undefined ? {} : { pajekDraw }),
    });
    const { snapshot, styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const get = (target: "node" | "edge", property: string): readonly unknown[] =>
        resolveStyles(styles, target, property as never, snapshot);
    return { get, result };
}

describe("Pajek's Draw window size (pajekDraw width and height)", () => {
    const doc = '*Vertices 2\n1 "a" 0.08 0.142778 0.5\n2 "b" 0.92 0.826111 0.5\n*Edges\n1 2\n';

    it("stretches the 0..1 coordinates across the window one axis at a time, y in x's unit", async () => {
        // pajek-specimen-labels: x 0.08 is drawn at 96 and y 0.142778 at 128.5 in a 1200 x 900 window
        const { result } = await load(doc, { width: 1200, height: 900 });
        const importer = registry.importer("pajek");
        const p = extractPositions(importer, result.snapshot, result.report) as FilePositions;
        expect(p.pxPerUnit).toBe(1200);
        expect(p.coords[0] * 1200).toBeCloseTo(96, 6);
        expect(-p.coords[1] * 1200).toBeCloseTo(128.5, 3);
        // and back to the numbers the file holds
        const extra = result.snapshot.nodes.byRole("position")?.meta.extra as PositionColumnExtra;
        const back = toFilePositions(p.coords, extra);
        expect(back[1]).toBeCloseTo(0.142778, 9);
    });

    it("keeps the square 500 x 500 window without the option", async () => {
        const { result } = await load(doc);
        const p = extractPositions(registry.importer("pajek"), result.snapshot, result.report) as FilePositions;
        expect(p.pxPerUnit).toBe(500);
        expect(-p.coords[1]).toBeCloseTo(0.142778, 9);
    });

    it("refuses a pajekDraw that is not an object of settings", async () => {
        await expect(registry.importGraph(doc, { format: "pajek", pajekDraw: 3 })).rejects.toThrow(/pajekDraw/);
        await expect(registry.importGraph(doc, { format: "pajek", pajekDraw: { width: -1 } })).rejects.toThrow(
            /pajekDraw/,
        );
    });
});

describe("Pajek's arrow size s and label angle la", () => {
    it("reads s as the arrow size, carried from line to line like c and w", async () => {
        // pajek-football: arcs `w 4 s 4` and `w 9 s 9` draw arrowheads 24 and 54 long (6 x s)
        const { get } = await load("*Vertices 3\n1 a\n2 b\n3 c\n*Arcs\n1 2 1 s 4\n2 3 1\n3 1 1 s 0.5\n");
        expect(get("edge", "arrowSize")).toEqual([4, 4, 0.5]);
    });

    it("turns a label by la counterclockwise, read as a clockwise rotation, 360 and above away from the middle", async () => {
        // pajek-specimen-labels: `la 30` is drawn rotate(-30); `la 400` at (0.3, 0.3) points away from (0.5, 0.5),
        // 135 degrees counterclockwise, and 40 more: 175, a clockwise 185
        const { get } = await load(
            "*Vertices 3\n1 a 0.1 0.1 0.5 ellipse la 30\n2 b 0.2 0.2 0.5 ellipse la 90\n3 c 0.3 0.3 0.5 ellipse la 400\n",
        );
        expect(get("node", "labelRotation")).toEqual([330, 270, 185]);
    });
});

describe("Pajek's line colors written as numbers", () => {
    it("reads no color from c written as fractions: the line keeps its carried or default color", async () => {
        // pajek-1crn: `c 0.700 0.700 0.700` on the first edge is drawn in Pajek's teal; specimen-edges-lines:
        // `c 0.7 0.2 0.2` after a line in black is drawn black
        const { get } = await load(
            "*Vertices 6\n1 a\n2 b\n3 c\n4 d\n5 e\n6 f\n*Edges\n1 2 1 c 0.700 0.700 0.700\n3 4 1 c Red\n5 6 1 c 0.7 0.2 0.2 p Solid\n",
        );
        expect(get("edge", "color")).toEqual(["#007091", "#ff0000", "#ff0000"]);
    });
});

describe("Pajek's Draw window options (pajekDraw ini)", () => {
    const doc = [
        "*Vertices 3",
        '1 "a" 0.1 0.1 0.5',
        '2 "b" 0.5 0.5 0.5 ellipse x_fact 1.8 y_fact 1.8 ic Red',
        '3 "c" 0.9 0.9 0.5 box x_fact 0.5 y_fact 2 ic Blue',
        "*Arcs",
        "2 3 1 c Black",
        "",
    ].join("\n");

    it("draws the vertex numbers for Mark Vertices Using Numbers, no labels for No Labels", async () => {
        expect((await load(doc, { ini: { "Form8.MarkVerticesUsing": "2" } })).get("node", "label")).toEqual([
            "1",
            "2",
            "3",
        ]);
        expect((await load(doc, { ini: { "Form8.MarkVerticesUsing": "3" } })).get("node", "label")).toEqual([
            "",
            "",
            "",
        ]);
        const none = await load(doc, { ini: { "Form8.MarkVerticesUsing": 4 } });
        expect(none.get("node", "label")).toEqual(["", "", ""]);
        // No Labels no Arrows hides the arrows in the Draw window only: the SVG export draws them (`specimen-arrows-p2`)
        expect(none.get("edge", "targetArrow")).toEqual(["triangle"]);
        expect((await load(doc)).get("edge", "targetArrow")).toEqual(["triangle"]);
    });

    it("doubles a sized vertex and quadruples an unsized one at Size of Vertices 16", async () => {
        // pajek-specimen-node-sizes-opacity-p2: the default vertex 20 -> 80, x_fact 1.8 36 -> 72
        const { get } = await load(doc, { ini: { "Form8.SizeofVertices": "16.0000000000" } });
        expect(get("node", "width")).toEqual([80, 72, 20]);
        expect(get("node", "height")).toEqual([80, 72, 80]);
    });

    it("scales each axis on its own: one the file sizes by the factor, one it does not by its square", async () => {
        // a Pajek 6.02 probe: `x_fact 2` alone is drawn 20 x 5 at Size of Vertices 4 and 120 x 180 at 24
        const one = "*Vertices 1\n1 a 0.5 0.5 0.5 ellipse x_fact 2\n";
        const small = await load(one, { ini: { "Form8.SizeofVertices": 4 } });
        expect([small.get("node", "width")[0], small.get("node", "height")[0]]).toEqual([20, 5]);
        const large = await load(one, { ini: { "Form8.SizeofVertices": 24 } });
        expect([large.get("node", "width")[0], large.get("node", "height")[0]]).toEqual([120, 180]);
    });

    it("draws the SVG export's vertex and line opacity", async () => {
        // pajek-specimen-node-sizes-opacity-p3: opacity 0.5 and stroke-opacity 0.5 on each vertex, its label opaque
        const { get } = await load(doc, { ini: { TransparencyofVertices: "0.50", TransparencyofLines: 0.25 } });
        expect(get("node", "fillOpacity")).toEqual([0.5, 0.5, 0.5]);
        expect(get("node", "borderOpacity")).toEqual([0.25, 0.25, 0.25]);
        expect(get("node", "opacity")).toEqual([1, 1, 1]);
        expect(get("edge", "opacity")).toEqual([0.25]);
    });

    it("draws every line straight, and each line as a gradient of its end vertices' fills", async () => {
        expect((await load(doc, { ini: { "Form10.StraightLinesOnly1": "" } })).get("edge", "curved")).toEqual([false]);
        const g = await load(doc, { ini: { "Form10.ColorGradientLines": true } });
        expect(g.get("edge", "gradientColors")).toEqual(["#ff0000 #0000ff"]);
        expect(g.get("edge", "gradientKind")).toEqual(["linear"]);
        expect(g.get("edge", "targetArrowColor")).toEqual(["#0000ff"]);
        // a flag given as off draws as without it
        expect((await load(doc, { ini: { "Form10.ColorGradientLines": "0" } })).get("edge", "gradientKind")).toEqual([
            null,
        ]);
    });
});

describe("Draw > Network + Partition + Vector of a project file (pajekDraw partition, vector, vector2)", () => {
    const paj = [
        "*Network specimen",
        "*Vertices 5",
        '1 "a" 0.1 0.1 0.5',
        '2 "b" 0.2 0.2 0.5 ellipse x_fact 1.8 y_fact 1.8 ic Black',
        '3 "c" 0.3 0.3 0.5 ellipse x_fact 1.8 y_fact 1.8',
        '4 "d" 0.4 0.4 0.5 ellipse x_fact 1.8 y_fact 1.8',
        '5 "e" 0.5 0.5 0.5 ellipse x_fact 3 y_fact 1.8',
        "*Partition clusters",
        "*Vertices 5",
        "0",
        "3",
        "45",
        "-2",
        "1",
        "*Vector size",
        "*Vertices 5",
        "1",
        "4",
        "0",
        "-1",
        "4",
        "*Vector height",
        "*Vertices 5",
        "1",
        "1",
        "1",
        "3",
        "1",
        "",
    ].join("\n");

    it("colors each vertex by its cluster over its own ic, and sizes it by the square root of its value", async () => {
        // pajek-specimen-mappings-bypass: clusters 0 Cyan, 3 Red (over ic Black), 45 as 5, -2 as 2
        const { get } = await load(paj, { partition: 1, vector: 1 });
        expect(get("node", "fill")).toEqual(["#00ffff", "#ff0000", "#ffd8f2", "#7fff00", "#ffff00"]);
        expect(get("node", "width")).toEqual([20, 72, 0, 36, 120]);
        expect(get("node", "height")).toEqual([20, 72, 0, 36, 72]);
    });

    it("reads two vectors as plain factors of the width and the height", async () => {
        // pajek-specimen-mappings-bypass-p3: vector 4 with a second value 1 is four times as wide, as tall as before
        const { get } = await load(paj, { partition: 1, vector: 1, vector2: 2 });
        expect(get("node", "width")).toEqual([20, 144, 0, 36, 240]);
        expect(get("node", "height")).toEqual([20, 36, 36, 108, 36]);
    });

    it("draws the vertices' own colors and sizes without them", async () => {
        const { get } = await load(paj);
        expect(get("node", "fill")).toEqual(["#ffd9bc", "#000000", "#ffd9bc", "#ffd9bc", "#ffd9bc"]);
        expect(get("node", "width")).toEqual([20, 36, 36, 36, 60]);
    });
});
