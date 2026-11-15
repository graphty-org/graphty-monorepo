/**
 * A table node drawn as boxes stacked one under the other (#5347): yed-graphml-specimen-groups-p2's
 * table-lane-style-rows, which draw.io draws as a light header box, a light box under it for the rows, and a gray row
 * outlined in black over the rows' top half. The node is the whole table, the union of its rows, never one row; two
 * flat nodes stacked with a gap stay two nodes.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const fillOf = (color: string): NonNullable<Prim["fill"]> => ({ color, opacity: 1, gradient: null });
const BLACK: NonNullable<Prim["stroke"]> = {
    color: "#000000",
    opacity: 1,
    width: 1.03,
    dash: null,
    dashClass: "solid",
};
// six nodes frame the drawing, so the fit between the two sides is fixed
const FRAME: [string, number, number][] = [
    ["a", 100, 400],
    ["b", 500, 400],
    ["c", 900, 400],
    ["d", 100, 700],
    ["e", 500, 700],
    ["f", 900, 700],
];
const rectOf = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
];
const prim = (index: number, points: Pt[], paint: Pick<Prim, "fill" | "stroke">): Prim => ({
    index,
    tag: "path",
    kind: "shape",
    box: boxOfPoints(points),
    closed: true,
    corners: 4,
    text: null,
    markers: { start: false, end: false },
    hint: null,
    points,
    ...paint,
});
const node = (id: string, cx: number, cy: number, w: number, h: number): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "rect",
    fill: fillOf("#ecf5ff"),
    stroke: null,
    label: null,
});
const guideOf = (nodes: PNode[]): PScene => ({
    side: "graphty",
    width: 1000,
    height: 800,
    background: "#ffffff",
    nodes: [...FRAME.map(([id, x, y]) => node(id, x, y, 40, 40)), ...nodes],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});
const framePrims = (): Prim[] =>
    FRAME.map(([, x, y], i) =>
        prim(i, rectOf(x - 20, y - 20, x + 20, y + 20), { fill: fillOf("#ffffff"), stroke: null }),
    );

describe("a table node drawn as stacked rows", () => {
    it("reads the table as the union of its rows, in the rows' color", () => {
        // the oracle's own drawing of table-lane-style-rows, moved: x 378.43..532.68, y 68.41..160.95
        const prims = [
            ...framePrims(),
            prim(6, rectOf(378.43, 68.41, 532.68, 99.26), { fill: fillOf("#ecf5ff"), stroke: null }),
            prim(7, rectOf(378.43, 99.26, 532.68, 160.95), { fill: fillOf("#ecf5ff"), stroke: null }),
            prim(8, rectOf(378.43, 99.26, 532.68, 130.11), { fill: fillOf("#c0c0c0"), stroke: BLACK }),
        ];
        const o = associate(prims, 1000, 800, guideOf([node("table", 455.555, 114.68, 154.25, 92.54)])).scene;
        const table = o.nodes.find((n) => n.id === "table");
        assert.isDefined(table);
        assert.approximately(table.h, 92.54, 0.5, "the table's height is all of its rows");
        assert.approximately(table.w, 154.25, 0.5);
        assert.strictEqual(table.fill?.color, "#ecf5ff", "the table's fill is its rows', not one row's");
        assert.isFalse(
            o.nodes.some((n) => n.id !== "table" && !FRAME.some(([id]) => id === n.id)),
            "no row is read as a node of its own",
        );
    });

    it("keeps two flat nodes stacked a gap apart as two nodes", () => {
        const prims = [
            ...framePrims(),
            prim(6, rectOf(400, 100, 446, 110.5), { fill: fillOf("#ecf5ff"), stroke: BLACK }),
            prim(7, rectOf(400, 120.1, 446, 130.6), { fill: fillOf("#ecf5ff"), stroke: BLACK }),
        ];
        const o = associate(
            prims,
            1000,
            800,
            guideOf([node("top", 423, 105.25, 46, 10.5), node("under", 423, 125.35, 46, 10.5)]),
        ).scene;
        assert.approximately(o.nodes.find((n) => n.id === "top")?.h ?? 0, 10.5, 0.1);
        assert.approximately(o.nodes.find((n) => n.id === "under")?.h ?? 0, 10.5, 0.1);
    });
});
