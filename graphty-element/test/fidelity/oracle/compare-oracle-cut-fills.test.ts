/**
 * A fill a clip cuts into parts of a node (yEd's entity relationship node, painted whole twice, clipped once to its
 * header and once to the rest): each part is the node's, not a shape of its own, and the part in another color is
 * judged by its box and its color, so a band of the wrong depth or color, or none, still fails.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { compareOracle } from "./compare-oracle";
import { type PBox, type PNode, type Prim, type PScene, type PStray, type Pt } from "./primitives";

const FILL = (color: string): NonNullable<Prim["fill"]> => ({ color, opacity: 1, gradient: null });
const LINE: NonNullable<Prim["stroke"]> = { color: "#25537a", opacity: 1, width: 1, dash: null, dashClass: "solid" };
const WHOLE: PBox = { x0: 300, y0: 200, x1: 400, y1: 260 };
const HEADER: PBox = { ...WHOLE, y1: 226 };
const REST: PBox = { ...WHOLE, y0: 226 };
const corners = ({ x0, y0, x1, y1 }: PBox): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
];
const shape = (index: number, box: PBox, paint: Pick<Prim, "fill" | "stroke">, uncut?: PBox): Prim => ({
    index,
    tag: "rect",
    kind: "shape",
    box,
    closed: true,
    corners: 4,
    text: null,
    markers: { start: false, end: false },
    hint: null,
    points: corners(box),
    ...paint,
    ...(uncut === undefined ? {} : { uncut }),
});
const graphtyNode = (id: string, cx: number, cy: number, w: number, h: number): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "rect",
    fill: FILL("#ffffff"),
    stroke: LINE,
    label: null,
});
const FRAME: [string, number, number][] = [
    ["a", 100, 100],
    ["b", 600, 100],
    ["c", 100, 400],
    ["d", 600, 400],
    ["e", 350, 400],
];
const guide = (strays: PStray[]): PScene => ({
    side: "graphty",
    width: 700,
    height: 500,
    background: "#ffffff",
    nodes: [...FRAME.map(([id, x, y]) => graphtyNode(id, x, y, 40, 40)), graphtyNode("n", 350, 230, 100, 60)],
    edges: [],
    groups: [],
    texts: [],
    strays,
});
const frame = (): Prim[] =>
    FRAME.map(([, x, y], i) =>
        shape(i, { x0: x - 20, y0: y - 20, x1: x + 20, y1: y + 20 }, { fill: FILL("#ffffff"), stroke: LINE }),
    );
const entity = (): Prim[] => [
    ...frame(),
    shape(10, REST, { fill: FILL("#ffffff"), stroke: null }, WHOLE),
    shape(11, HEADER, { fill: FILL("#a8afc6"), stroke: null }, WHOLE),
    shape(12, WHOLE, { fill: null, stroke: LINE }),
];
const band = (box: PBox, fill: string): PStray => ({
    index: 0,
    tag: "annotation-shape",
    kind: "shape",
    box,
    fill,
    stroke: null,
    text: null,
});

/**
 * Judges the entity against what graphty draws over the node's face.
 * @param strays - graphty's pieces
 * @returns the failing strays
 */
function failures(strays: PStray[]): Record<string, string[]> {
    const g = guide(strays);
    const { scene, method } = associate(entity(), 700, 500, g);
    const { failures: all } = compareOracle("t", scene, g, method);
    return Object.fromEntries(Object.entries(all).filter(([p]) => p.startsWith("stray.")));
}

describe("a fill cut by a clip", () => {
    it("reads both parts as the node's, its size the whole shape's and its fill the first drawn", () => {
        const g = guide([]);
        const n = associate(entity(), 700, 500, g).scene.nodes.find((x) => x.id === "n");
        assert.isDefined(n);
        assert.strictEqual(n.h, 60);
        assert.strictEqual(n.fill?.color, "#ffffff");
        assert.deepEqual(n.bands, [{ box: HEADER, color: "#a8afc6" }]);
    });

    it("passes the band graphty draws in that box and color", () => {
        assert.deepEqual(failures([band(HEADER, "#a8afc6")]), {});
    });

    it("fails with no band, a band of another color and a band of another depth", () => {
        const missed = { "stray.present": ["band@300,200,400,226"] };
        assert.deepEqual(failures([]), missed);
        assert.deepEqual(failures([band(HEADER, "#ff0000")]), missed);
        assert.deepEqual(failures([band({ ...HEADER, y1: 206 }, "#a8afc6")]), {
            ...missed,
            "stray.extra": ["graphty:annotation-shape#0"],
        });
    });

    it("leaves a part in the node's own color unjudged, as nothing shows it", () => {
        const g = guide([]);
        const prims = entity().map((p) => (p.index === 11 ? { ...p, fill: FILL("#ffffff") } : p));
        const n = associate(prims, 700, 500, g).scene.nodes.find((x) => x.id === "n");
        assert.isUndefined(n?.bands);
    });
});
