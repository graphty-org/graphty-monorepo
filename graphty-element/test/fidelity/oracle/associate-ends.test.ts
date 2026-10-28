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

    it("names a line between two nodes drawn on one another the way graphty runs the edge", () => {
        // cx-radiation-bibliography 30 -> 44, a hexagon and a round rectangle that overlap: Cytoscape runs the line from
        // 30's outline back to 44's, which cross, a dot on its start and its arrowhead at 44's end
        let index = 0;
        const grey = { color: "#999999", opacity: 1, width: 3.114, dash: null, dashClass: "solid" as const };
        const green = { color: "#009900", opacity: 1, gradient: null };
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: null,
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const grid: [string, number, number][] = [
            ["a", 100, 100],
            ["c", 800, 100],
            ["d", 100, 800],
            ["f", 800, 800],
        ];
        const hexagon: Pt[] = [
            [412.43, 501.45],
            [425.76, 506.84],
            [452.42, 506.84],
            [465.76, 501.45],
            [452.42, 496.06],
            [425.76, 496.06],
            [412.43, 501.45],
        ];
        const roundrect: Pt[] = [
            [451.71, 489.41],
            [451.71, 492.16],
            [451.71, 494.9],
            [451.71, 497.64],
            [452.49, 500.1],
            [455.19, 500.31],
            [457.94, 500.31],
            [460.68, 500.31],
            [463.42, 500.31],
            [466.17, 500.31],
            [468.91, 500.31],
            [471.65, 500.31],
            [474.39, 500.31],
            [477.14, 500.31],
            [479.88, 500.31],
            [482.62, 500.31],
            [485.37, 500.31],
            [488.11, 500.31],
            [490.85, 500.31],
            [493.59, 500.31],
            [496.34, 500.31],
            [499.08, 500.31],
            [501.82, 500.31],
            [504.48, 499.96],
            [505.05, 497.38],
            [505.05, 494.64],
            [505.05, 491.9],
            [505.02, 489.16],
            [502.94, 487.86],
            [500.19, 487.86],
            [497.45, 487.86],
            [494.71, 487.86],
            [491.96, 487.86],
            [489.22, 487.86],
            [486.48, 487.86],
            [483.74, 487.86],
            [480.99, 487.86],
            [478.25, 487.86],
            [475.51, 487.86],
            [472.77, 487.86],
            [470.02, 487.86],
            [467.28, 487.86],
            [464.54, 487.86],
            [461.8, 487.86],
            [459.05, 487.86],
            [456.31, 487.86],
            [453.57, 487.86],
            [451.71, 489.41],
        ];
        const prims = [
            ...grid.map(([, x, y]) =>
                prim({
                    tag: "ellipse",
                    points: disc(x, y, 20),
                    fill: { color: "#cccccc", opacity: 1, gradient: null },
                }),
            ),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [459.36, 497.65],
                    [455.51, 498.37],
                ],
                stroke: { color: "#009900", opacity: 1, width: 0.389, dash: null, dashClass: "solid" },
            }),
            prim({
                points: [
                    [459.4, 497.84],
                    [459.42, 497.84],
                    [459.44, 497.83],
                    [459.46, 497.82],
                    [459.48, 497.81],
                    [459.49, 497.8],
                    [459.51, 497.78],
                    [459.52, 497.76],
                    [459.53, 497.75],
                    [459.54, 497.73],
                    [459.55, 497.71],
                    [459.55, 497.69],
                    [459.56, 497.66],
                    [459.56, 497.64],
                    [459.55, 497.62],
                    [459.55, 497.6],
                    [459.54, 497.58],
                    [459.54, 497.56],
                    [459.52, 497.54],
                    [459.51, 497.53],
                    [459.5, 497.51],
                    [459.48, 497.5],
                    [459.46, 497.48],
                    [459.44, 497.47],
                    [459.43, 497.47],
                    [459.4, 497.46],
                    [459.38, 497.46],
                    [459.36, 497.46],
                    [459.34, 497.46],
                    [459.33, 497.46],
                    [459.33, 497.49],
                    [459.33, 497.51],
                    [459.34, 497.53],
                    [459.34, 497.55],
                    [459.35, 497.57],
                    [459.35, 497.59],
                    [459.35, 497.61],
                    [459.36, 497.63],
                    [459.36, 497.65],
                    [459.37, 497.67],
                    [459.37, 497.69],
                    [459.37, 497.72],
                    [459.38, 497.74],
                    [459.38, 497.76],
                    [459.38, 497.78],
                    [459.39, 497.8],
                    [459.39, 497.82],
                    [459.4, 497.84],
                ],
                fill: green,
            }),
            prim({
                points: [
                    [455.76, 499.71],
                    [450.16, 499.38],
                    [455.26, 497.03],
                    [455.76, 499.71],
                ],
                corners: 3,
                fill: green,
            }),
            prim({ points: hexagon, corners: 6, stroke: grey }),
            prim({ points: hexagon, corners: 6, fill: { color: "#ffffff", opacity: 1, gradient: null } }),
            prim({ points: roundrect, stroke: grey }),
            prim({ points: roundrect, fill: { color: "#ffffff", opacity: 1, gradient: null } }),
        ];
        const g: PScene = {
            side: "graphty",
            width: 900,
            height: 900,
            background: "#ffffff",
            nodes: [
                ...grid.map(([id, x, y]) => node(id, x, y)),
                { ...node("n30", 439.1, 501.45, 53.33, 10.78), shape: "hexagon" },
                { ...node("n44", 478.38, 494.09, 53.34, 12.45), shape: "roundrect" },
            ],
            edges: [edge("e", "n30", "n44")],
            groups: [],
            texts: [],
            strays: [],
        };
        const [e] = associate(prims, 900, 900, g).scene.edges;
        assert.deepEqual([e.source, e.target], ["n30", "n44"]);
        assert.deepEqual(
            e.arrows.map((x) => x.end),
            ["target"],
        );
    });
});
