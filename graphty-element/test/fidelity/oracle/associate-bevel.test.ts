/**
 * yFiles' bevel, read as a reader sees it: yEd paints its BevelNode family as two halves with a line inside them, which
 * are one body, and draws that line of 1 over a lighter one of 2, which leaves the wider a halo. A flat node, or a line
 * in another color, still fails against that reading.
 */
import { assert, describe, it } from "vitest";

import { foldBevelHalves, lineOnTop } from "./associate";
import { compareOracle, type OracleProperty } from "./compare-oracle";
import { boxOfPoints, type PFill, type PNode, type Prim, type PScene, type PStroke, type Pt } from "./primitives";

/**
 * A closed path of a box.
 * @param index - its document order
 * @param box - left, top, right and bottom
 * @param fill - its fill
 * @param stroke - its line
 * @returns the primitive
 */
function box(index: number, [x0, y0, x1, y1]: number[], fill: PFill | null, stroke: PStroke | null = null): Prim {
    const points: Pt[] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
    ];
    return {
        index,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(points),
        points,
        closed: true,
        corners: 0,
        fill,
        stroke,
        text: null,
        markers: { start: false, end: false },
        hint: null,
    };
}

const flat = (color: string): PFill => ({ color, opacity: 1, gradient: null });
const line = (color: string, width: number): PStroke => ({
    color,
    opacity: 1,
    width,
    dash: null,
    dashClass: "solid",
});
const ramp: PFill = {
    color: "#f1f1f1",
    opacity: 1,
    gradient: {
        kind: "linear",
        angle: 90,
        stops: [
            { offset: 0, color: "#f1f1f1", opacity: 1 },
            { offset: 1, color: "#d3d3d3", opacity: 1 },
        ],
    },
};
/** The node generic-legacy-bevelnode, as yEd draws it. */
const bevel = (): Prim[] => [
    box(0, [348, 799.4, 404, 818.4], flat("#c8c8c8")),
    box(1, [348, 782.4, 404, 800.4], ramp),
    box(2, [350, 784.4, 402, 816.4], null, line("#e5e5e5", 2)),
    box(3, [350, 784.4, 402, 816.4], null, line("#505050", 1)),
];

const scene = (side: PScene["side"], node: PNode): PScene => ({
    side,
    width: 1200,
    height: 900,
    background: "#ffffff",
    nodes: [
        node,
        { ...node, id: "a", cx: 100, cy: 100 },
        { ...node, id: "b", cx: 1000, cy: 100 },
        { ...node, id: "c", cx: 500, cy: 700 },
    ],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("yFiles' bevel", () => {
    it("folds yEd's two halves into a body of their whole size, painted as both were", () => {
        const [body, ...rest] = foldBevelHalves(bevel());
        assert.deepEqual(body.box, { x0: 348, y0: 782.4, x1: 404, y1: 818.4 });
        assert.deepEqual(
            body.fill?.gradient?.stops.map((s) => s.color),
            ["#f1f1f1", "#d3d3d3", "#c8c8c8", "#c8c8c8"],
        );
        assert.strictEqual(rest.length, 2);
    });

    it("leaves two boxes with no line inside them, and a flat upper half, as they are", () => {
        assert.strictEqual(foldBevelHalves(bevel().slice(0, 2)).length, 2);
        const [lower, , ...lines] = bevel();
        const plain = box(1, [348, 782.4, 404, 800.4], flat("#f1f1f1"));
        assert.strictEqual(foldBevelHalves([lower, plain, ...lines]).length, 4);
    });

    it("reads the line on top of a wider one down the same path, never one elsewhere or wider", () => {
        const all = bevel();
        const [, , under, over] = all;
        assert.strictEqual(lineOnTop(under, all), over);
        assert.strictEqual(lineOnTop(over, all), over);
        const elsewhere = box(3, [352, 786.4, 400, 814.4], null, line("#505050", 1));
        assert.strictEqual(lineOnTop(under, [under, elsewhere]), under);
        const wide = box(2, [350, 784.4, 402, 816.4], null, line("#505050", 6));
        const gap = box(3, [350, 784.4, 402, 816.4], null, line("#ffffff", 2));
        assert.strictEqual(lineOnTop(wide, [wide, gap]), wide);
    });

    it("still fails a flat node and a line in another color against that reading", () => {
        const [body] = foldBevelHalves(bevel());
        const oracle: PNode = {
            id: "n",
            cx: 376,
            cy: 400,
            w: 56,
            h: 36,
            shape: "rect",
            fill: body.fill,
            stroke: line("#505050", 1),
            label: null,
        };
        const failed = (graphty: PNode): OracleProperty[] => {
            const report = compareOracle("t", scene("oracle", oracle), scene("graphty", graphty));
            return report.elements.find((e) => e.id === "n")?.failed ?? [];
        };
        assert.deepEqual(failed(oracle), []);
        assert.include(failed({ ...oracle, fill: flat("#f1f1f1") }), "node.gradient");
        assert.include(failed({ ...oracle, stroke: line("#e5e5e5", 1) }), "node.stroke");
    });
});
