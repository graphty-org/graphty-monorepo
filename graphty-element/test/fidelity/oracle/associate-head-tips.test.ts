/**
 * A line a program stops at its arrowhead's base (Cytoscape desktop) ends where its head's tip points, not where the base
 * happens to lie: on cx2-signor-aml two curved lines' bases lay on the outline of a node drawn over or beside the one
 * their heads pointed at (38 -> 50 read as a second 92 -> 27, 146 -> 70 read as 63 -> 1, and so 1 -> 63's grey curve as
 * 135 -> 20, #5383).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const INK = "#404040";
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 48 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 24),
        cy + r * Math.sin((i * Math.PI) / 24),
    ]);
/** The nodes: four fixing the frame, x the line's source, p its head's target, q the node its base lies on. */
const NODES: [string, number, number, number][] = [
    ["a", 40, 40, 20],
    ["b", 560, 40, 20],
    ["c", 40, 460, 20],
    ["d", 560, 460, 20],
    ["x", 400, 300, 20],
    ["p", 100, 300, 20],
    // its outline passes through the head's base at (140, 300), its center 20.6 px off it
    ["q", 150, 318, 20.6],
];
const node = ([id, cx, cy, r]: [string, number, number, number]): PNode => ({
    id,
    cx,
    cy,
    w: 2 * r,
    h: 2 * r,
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
    stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});

describe("a line's end where its own arrowhead points", () => {
    it("reads a line whose head's base lies on one node's outline and tip on another's as the tip's node's", () => {
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
        const prims = [
            ...NODES.map(([, x, y, r]) => prim({ points: disc(x, y, r) })),
            // the line from x's outline to the head's base, then the head, its tip on p's outline
            prim({
                kind: "path",
                closed: false,
                points: [
                    [380, 300],
                    [140, 300],
                ],
                fill: null,
                stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
            }),
            prim({
                points: [
                    [120, 300],
                    [140, 306],
                    [140, 294],
                    [120, 300],
                ],
                corners: 3,
                fill: { color: INK, opacity: 1, gradient: null },
            }),
        ];
        const guide: PScene = {
            side: "graphty",
            width: 600,
            height: 500,
            background: "#ffffff",
            nodes: NODES.map(node),
            // graphty draws both pairs: the base's node decided it on the base, x -> q
            edges: [edge("e1", "x", "p"), edge("e2", "x", "q")],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 600, 500, guide).scene;
        assert.deepEqual(
            o.edges.map((e) => `${e.source}->${e.target}`),
            ["x->p"],
        );
        assert.strictEqual(o.edges[0]?.arrows.length, 1);
    });
});
