/**
 * The oracle association's edge ends: where nodes overlap, a line ends at its node's outline, so an end inside a big
 * node's box but on the outline of a small node drawn over it belongs to the small node (cys-affinity-purification);
 * and a shape inside a node at the end of a line of the node's own drawing (a chart's slice) is no arrowhead.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
];
const node = (id: string, cx: number, cy: number, w = 40, h = 40): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const edge = (id: string, source: string, target: string): PEdge => ({
    id,
    source,
    target,
    points: [],
    stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});

describe("edge ends at overlapping nodes", () => {
    it("gives a line ending on a small node's outline inside a big node's box to the small node", () => {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#cccccc", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const grid: [string, number, number][] = [
            ["a", 100, 100],
            ["c", 500, 100],
            ["d", 100, 300],
            ["f", 500, 300],
        ];
        const line = (points: Pt[]): Prim =>
            prim({
                kind: "path",
                closed: false,
                points,
                fill: null,
                stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            });
        const prims = [
            ...grid.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20) })),
            // a 40 x 40 node, and a flat 30 x 8 one drawn over the bottom of its box
            prim({ points: rect(280, 180, 320, 220), corners: 4 }),
            prim({ points: rect(285, 205, 315, 213), corners: 4 }),
            // one line from each to c, the flat node's (drawn first) from just above its own top, the big node's
            // from its top: drawn first, the flat node's line took the big node's pair, and the big node's then had
            // none left
            line([
                [305, 204.6],
                [482, 110],
            ]),
            line([
                [300, 179.6],
                [482, 108],
            ]),
        ];
        const nodes = [
            ...grid.map(([id, x, y]) => node(id, x, y)),
            node("big", 300, 200),
            node("flat", 300, 209, 30, 8),
        ];
        const g: PScene = {
            side: "graphty",
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes,
            edges: [edge("e1", "big", "c"), edge("e2", "flat", "c")],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 600, 400, g).scene;
        assert.deepEqual(o.edges.map((e) => [e.source, e.target].sort().join("-")).sort(), ["big-c", "c-flat"]);
    });

    it("leaves a shape inside a node at the end of a line of the node's own drawing free, not an arrowhead", () => {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#cccccc", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const grid: [string, number, number][] = [
            ["a", 100, 100],
            ["c", 500, 100],
            ["d", 100, 300],
            ["f", 500, 300],
        ];
        const prims = [
            ...grid.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20) })),
            prim({ tag: "ellipse", points: disc(300, 200, 30) }),
            // a ring chart's line between two slices, from the hole to the rim, and a small slice at its end
            prim({
                kind: "path",
                closed: false,
                points: [
                    [300, 190],
                    [300, 172],
                ],
                fill: null,
                stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            }),
            prim({ points: rect(300, 172, 312, 184), fill: { color: "#1f77b4", opacity: 1, gradient: null } }),
        ];
        const g: PScene = {
            side: "graphty",
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes: [...grid.map(([id, x, y]) => node(id, x, y)), node("ring", 300, 200, 60, 60)],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 600, 400, g).scene;
        assert.include(
            o.strays.map((x) => x.fill),
            "#1f77b4",
        );
    });
});
