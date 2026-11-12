/**
 * What yEd and yEd Live draw, measured in their own drawings (test/fidelity/oracles/): arrowhead sizes, the line
 * widths yEd draws whole, and the fill of a node that sets none.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { yedDrawnWidth } from "../../src/formats/graphml/styles-yed.js";
import { createRegistry } from "../../src/registry.js";
import { type ToolArrowhead, toolDefaults } from "../../src/styles/defaults.js";
import { resolveStyles } from "../../src/styles/internal.js";
import type { StyleArrowShape, StyleProperty } from "../../src/styles/types.js";

const registry = createRegistry();
const SPECIMENS = resolve(import.meta.dirname, "../fidelity/specimens");

/**
 * Imports a specimen and reads its resolved properties.
 * @param format - the format
 * @param path - the specimen under `specimens/`
 * @returns the readers
 */
async function specimen(format: "gml" | "graphml", path: string) {
    const { snapshot, styles } = await registry.importGraph(new Uint8Array(readFileSync(resolve(SPECIMENS, path))), {
        format,
        styles: { toolDefaults: true },
        errorLimit: Infinity,
    });
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const ids = Array.from({ length: snapshot.edgeCount }, (_, e) => snapshot.edges.byRole("id")?.value(e));
    const edges = (property: StyleProperty): readonly unknown[] => resolveStyles(styles, "edge", property, snapshot);
    return {
        edges,
        edge: (property: StyleProperty, id: string): unknown => edges(property)[ids.indexOf(id)],
        nodes: (property: StyleProperty): readonly unknown[] => resolveStyles(styles, "node", property, snapshot),
    };
}

/**
 * A program's arrowhead of one shape, long and wide.
 * @param head - how the program sizes its arrowheads
 * @param shape - the shape
 * @param width - the line width
 * @returns its length and width
 */
function drawn(head: ToolArrowhead | undefined, shape: StyleArrowShape, width: number): number[] {
    if (head === undefined) {
        throw new Error("no arrowhead");
    }
    const own = head.shapes?.[shape];
    const length = head.length(1, width) * (own?.length ?? 1);
    return [length, length * (own?.aspect ?? head.aspect)].map((n) => Number(n.toFixed(6)));
}

describe("yEd's arrowheads", () => {
    const head = toolDefaults("yed")?.arrowhead;

    it.each([
        [1, 12, 10],
        [2, 13.5, 11.25],
        [3, 15, 12.5],
        [5, 18, 15],
        [8, 22.5, 18.75],
    ])("draws the standard head on a line %d wide %d long and %d wide", (width, length, across) => {
        expect(drawn(head, "vee", width)).toEqual([length, across]);
    });

    it.each([
        ["triangle", 12, 12],
        ["triangle-open", 16, 12],
        ["diamond", 14, 10],
        ["diamond-open", 14, 10],
        ["circle", 8, 8],
        ["circle-open", 8, 8],
        ["square", 8, 8],
        ["tee", 1, 10],
        ["crow", 12, 16],
        ["other:crows_foot_many_mandatory", 12, 16],
        ["other:crows_foot_many_optional", 12, 16],
        ["other:crows_foot_one", 1, 16],
        ["other:crows_foot_one_mandatory", 1, 16],
        ["other:crows_foot_one_optional", 1, 16],
        ["other:crows_foot_optional", 10, 10],
        ["other:dash", 1, 8],
        ["other:cross", 8, 8],
        ["other:open-vee", 12, 12],
        ["other:white_delta_bar", 16, 12],
    ] as const)("draws %s %d long and %d wide on a line 1 wide", (shape, length, across) => {
        expect(drawn(head, shape, 1)).toEqual([length, across]);
    });
});

describe("yEd Live's arrowheads", () => {
    const head = toolDefaults("yfiles3")?.arrowhead;

    it.each([1, 1.5, 5])("draws the default head 8 long and 6 wide on a line %d wide", (width) => {
        expect(drawn(head, "vee", width)).toEqual([8, 6]);
    });

    it("draws a diamond 10 by 6 and an ellipse 6 by 6", () => {
        expect(drawn(head, "diamond", 1.5)).toEqual([10, 6]);
        expect(drawn(head, "circle", 1.5)).toEqual([6, 6]);
    });

    it("draws a cross 10 by 10, a kite 10 by 6 and a deltoid 5.2 by 6", () => {
        expect(drawn(head, "other:cross", 1.5)).toEqual([10, 10]);
        expect(drawn(head, "other:kite", 1.5)).toEqual([10, 6]);
        expect(drawn(head, "other:deltoid", 1.5)).toEqual([5.2, 6]);
    });

    it("reads an arrow's scales", async () => {
        const { edge } = await specimen("graphml", "yed-live-graphml/specimen-arrows.graphml");
        expect(edge("targetArrowLength", "arrow-length-scale-2")).toBe(2);
        expect(edge("targetArrowWidth", "arrow-width-scale-2")).toBe(2);
    });

    it("reads a length of 12 as three quarters of normal both ways, and a chevron wider than the default head", async () => {
        const { edge } = await specimen("graphml", "yed-live-graphml/specimen-arrows.graphml");
        expect(edge("targetArrowLength", "arrow-length-12")).toBe(0.75);
        expect(edge("targetArrowWidth", "arrow-length-12")).toBe(0.75);
        expect(edge("sourceArrowWidth", "source-chevron")).toBeCloseTo(8 / 6);
    });

    it("draws yFiles 2.6's triangles 4 by 9, and yFiles 3's as the default head", async () => {
        const old = await specimen("graphml", "yed-live-graphml/specimen-arrows-p2.graphml");
        expect(old.edge("targetArrowLength", "v2-target-triangle")).toBe(0.5);
        expect(old.edge("targetArrowWidth", "v2-target-triangle")).toBe(1.5);
        const { edge } = await specimen("graphml", "yed-live-graphml/specimen-arrows.graphml");
        expect(edge("targetArrowLength", "target-triangle")).toBeNull();
    });

    it("keeps a width of 1.5, which it draws as written", async () => {
        const { edges } = await specimen("graphml", "yed-live-graphml/specimen-arrows.graphml");
        expect(edges("width")).toContain(1.5);
    });
});

describe("yEd's short arrow", () => {
    it("is 8 x 12 against the standard head's 12 x 10, in GraphML and in GML", async () => {
        const graphml = await specimen("graphml", "yed-graphml/specimen-arrows.graphml");
        expect(graphml.edge("targetArrowLength", "target-short")).toBe(8 / 12);
        expect(graphml.edge("targetArrowWidth", "target-short")).toBe(12 / 10);
        expect(graphml.edge("sourceArrowWidth", "source-short")).toBe(12 / 10);
        const gml = await specimen("gml", "gml/specimen-arrows-p2.gml");
        expect(gml.edges("targetArrowLength")).toContain(8 / 12);
        expect(gml.edges("targetArrowWidth")).toContain(12 / 10);
    });
});

describe("yEd's two-armed arrows", () => {
    it("draw concave 10 x 12 and convex 10 x 10 against plain's 12 x 12", async () => {
        const { edge } = await specimen("graphml", "yed-graphml/specimen-arrows.graphml");
        expect(edge("targetArrowLength", "target-plain")).toBeNull();
        expect(edge("targetArrowLength", "target-concave")).toBe(10 / 12);
        expect(edge("targetArrowWidth", "target-concave")).toBeNull();
        expect(edge("targetArrowLength", "target-convex")).toBe(10 / 12);
        expect(edge("targetArrowWidth", "target-convex")).toBe(10 / 12);
    });
});

describe("yEd GML's arrow key", () => {
    it("draws the standard head", async () => {
        const { edges } = await specimen("gml", "gml/specimen-arrows-p2.gml");
        const both = edges("sourceArrow").flatMap((shape, e) => (shape === edges("targetArrow")[e] ? [shape] : []));
        expect(both).toContain("vee");
        expect(both).not.toContain("triangle");
    });
});

describe("yEd's line widths", () => {
    it("draws 0.5 and 1.5 one wide and leaves whole widths alone, in GraphML and in GML", async () => {
        const graphml = await specimen("graphml", "yed-graphml/specimen-edges-lines.graphml");
        const gml = await specimen("gml", "gml/specimen-edges-lines-p2.gml");
        for (const { edges } of [graphml, gml]) {
            const widths = new Set(edges("width"));
            expect(widths.has(0.5)).toBe(false);
            expect(widths.has(1.5)).toBe(false);
            expect(widths.has(1)).toBe(true);
            expect(widths.has(3)).toBe(true);
        }
    });
});

describe("yEd's fractional widths", () => {
    it.each([
        [0.2, 1],
        [0.5, 1],
        [1, 1],
        [1.5, 1],
        [1.9, 1],
        [2, 2],
        [2.5, 2],
        [2.9, 2],
        [3.5, 3],
        [7.5, 7],
    ])("draws a width of %d %d wide, as yEd's SVG export of each width shows", (width, drawnWidth) => {
        expect(yedDrawnWidth(width)).toBe(drawnWidth);
    });

    it("leaves no width and a width of 0 as written", () => {
        expect(yedDrawnWidth(null)).toBeNull();
        expect(yedDrawnWidth(0)).toBe(0);
    });

    it("draws a node's border of 0.5 one wide", async () => {
        const graphml = await specimen("graphml", "yed-graphml/specimen-node-fills-borders.graphml");
        expect(graphml.nodes("borderWidth")).not.toContain(0.5);
        expect(graphml.nodes("borderWidth")).toContain(8);
    });
});

describe("yEd's skewed dash", () => {
    it("reads as its own stroke, not a square, 12 long on its line in GraphML", async () => {
        const graphml = await specimen("graphml", "yed-graphml/specimen-arrows.graphml");
        expect(graphml.edge("targetArrow", "target-skewed-dash")).toBe("other:skewed-dash");
    });
});

describe("yEd's default node fill", () => {
    it("draws a node that sets no fill #ccccff, in GraphML and in GML", async () => {
        const graphml = await specimen("graphml", "yed-graphml/specimen-node-fills-borders.graphml");
        expect(graphml.nodes("fill")).toContain("#ccccff");
        const gml = await specimen("gml", "gml/specimen-node-fills-borders-p2.gml");
        expect(gml.nodes("fill")).toContain("#ccccff");
    });
});
