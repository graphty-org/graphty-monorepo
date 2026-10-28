/**
 * Lines drawn on one another between one pair of nodes, and a line drawn as a filled shape: a band under a line is its
 * outline and one over it its overlay, but only while the program draws more lines there than graphty draws edges
 * (cyjs-genemania: Cytoscape.js's haystack edges between one pair, of different widths, were read as 35 edges with
 * outlines and 37 of graphty's edges left extra); a long thin filled triangle is a line tapering to a point
 * (Cytoscape.js's straight-triangle), not an arrowhead of the line beside it.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { compareOracle } from "./compare-oracle";
import {
    boxOfPoints,
    type PEdge,
    type PNode,
    type Prim,
    type PScene,
    type PStroke,
    type Pt,
    taperPaintedAsFill,
} from "./primitives";

const stroke = (color: string, width: number, opacity = 1): PStroke => ({
    color,
    opacity,
    width,
    dash: null,
    dashClass: "solid",
});
const NODES: [string, number, number][] = [
    ["a", 100, 100],
    ["b", 300, 100],
    ["c", 500, 100],
    ["d", 100, 300],
    ["e", 300, 300],
    ["f", 500, 300],
];
const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const ROUTE: Pt[] = [
    [120, 100],
    [280, 100],
];
const edge = (id: string, over: Partial<PEdge> = {}): PEdge => ({
    id,
    source: "a",
    target: "b",
    points: ROUTE,
    stroke: stroke("#0000ff", 2),
    arrows: [],
    label: null,
    ...over,
});
const scene = (side: PScene["side"], edges: PEdge[]): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: NODES.map(([id, x, y]) => node(id, x, y)),
    edges,
    groups: [],
    texts: [],
    strays: [],
});

/** The program's drawing: the six nodes, then the given primitives in order. */
function drawing(...rest: (Partial<Prim> & { points: Pt[] })[]): Prim[] {
    let index = 0;
    const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "path",
        box: boxOfPoints(over.points),
        closed: false,
        corners: 0,
        fill: null,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    const nodes = NODES.map(([, x, y]) =>
        prim({
            tag: "ellipse",
            kind: "shape",
            closed: true,
            points: disc(x, y, 20),
            fill: { color: "#cccccc", opacity: 1, gradient: null },
        }),
    );
    return [...nodes, ...rest.map(prim)];
}

describe("lines drawn on one another between one pair", () => {
    const wide = { points: ROUTE, stroke: stroke("#ff0000", 6, 0.5) };
    const narrow = { points: ROUTE, stroke: stroke("#0000ff", 2) };

    it("reads coincident lines as edges of their own where graphty draws as many edges between the pair", () => {
        const g = scene("graphty", [edge("1", { stroke: stroke("#ff0000", 6, 0.5) }), edge("2")]);
        const o = associate(drawing(wide, narrow), 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 2);
        assert.isTrue(o.edges.every((e) => e.outline === undefined && e.overlay === undefined));
        const r = compareOracle("t", o, g);
        assert.strictEqual(r.properties["edge.extra"].passRate, 1);
        assert.strictEqual(r.properties["edge.outline"].n, 0);
    });

    it("reads a wider line drawn over a narrower one as its overlay where graphty draws one edge", () => {
        const g = scene("graphty", [edge("1", { overlay: { color: "#ff0000", opacity: 0.5, width: 6 } })]);
        const o = associate(drawing(narrow, wide), 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 1);
        assert.strictEqual(o.edges[0].stroke?.color, "#0000ff");
        assert.deepEqual(o.edges[0].overlay, { color: "#ff0000", opacity: 0.5, width: 6 });
        assert.isUndefined(o.edges[0].outline);
        const r = compareOracle("t", o, g);
        assert.strictEqual(r.properties["edge.overlay"].passRate, 1);
        assert.strictEqual(r.properties["edge.extra"].passRate, 1);
        // graphty drawing no overlay, or one under the line instead, fails the overlay
        for (const miss of [edge("1"), edge("1", { outline: { color: "#ff0000", opacity: 0.5, width: 6 } })]) {
            assert.strictEqual(compareOracle("t", o, scene("graphty", [miss])).properties["edge.overlay"].passRate, 0);
        }
    });
});

describe("a line tapering to a point", () => {
    // Cytoscape.js's straight-triangle: as wide as the line at its source, a point at its target
    const taper: Pt[] = [
        [120, 99],
        [120, 101],
        [280, 100],
        [120, 99],
    ];

    it("reads a long thin filled triangle as a tapered line, not an arrowhead", () => {
        assert.deepEqual(taperPaintedAsFill(taper)?.ends, [
            [120, 100],
            [280, 100],
        ]);
        assert.strictEqual(taperPaintedAsFill(taper)?.width, 2);
        // an arrowhead's triangle is about as long as it is wide
        assert.isNull(
            taperPaintedAsFill([
                [270, 95],
                [270, 105],
                [280, 100],
            ]),
        );
    });

    it("pairs it with graphty's edge between its nodes and judges its line class", () => {
        const fillOnly = {
            kind: "shape" as const,
            closed: true,
            corners: 3,
            points: taper,
            fill: { color: "#0000ff", opacity: 1, gradient: null },
        };
        // a line beside it at the next pair, whose cap and route the triangle's point must not become
        const next = { points: [[320, 100] as Pt, [480, 100] as Pt], stroke: stroke("#0000ff", 2) };
        const g = scene("graphty", [edge("1"), edge("2", { source: "b", target: "c", points: next.points })]);
        const o = associate(drawing(fillOnly, next), 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 2);
        const tapered = o.edges.find((e) => e.target === "b");
        assert.strictEqual(tapered?.stroke?.dashClass, "tapered");
        assert.isTrue(o.edges.every((e) => e.arrows.length === 0));
        const r = compareOracle("t", o, g);
        assert.strictEqual(r.properties["edge.extra"].passRate, 1);
        assert.strictEqual(r.properties["edge.route"].passRate, 1);
        // graphty draws its line whole: a different line class
        assert.strictEqual(r.properties["edge.dash"].passRate, 0.5);
    });
});
