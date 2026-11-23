/**
 * A line a program stops at its arrowhead's base (Cytoscape desktop) ends where its head's tip points, not where the base
 * happens to lie: on cx2-signor-aml two curved lines' bases lay on the outline of a node drawn over or beside the one
 * their heads pointed at (38 -> 50 read as a second 92 -> 27, 146 -> 70 read as 63 -> 1, and so 1 -> 63's gray curve as
 * 135 -> 20, #5383).
 */
import { assert, describe, it } from "vitest";

import { associate, nameDrawnNodes } from "./associate";
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

    // vis-network runs each line on to its nodes' centers and paints every arrowhead after every node, at the target's
    // outline: on json-vis-siblings' crowded flat ellipses a head lies on a neighbor's center, and was read as the
    // neighbor's body (five heads), and a curve between overlapping nodes stands its head beside its source, where
    // the curve first enters the target's ellipse (one head given to another line's source end)
    const flat = (cx: number, cy: number): Pt[] =>
        Array.from({ length: 48 }, (_, i): Pt => [
            cx + 13 * Math.cos((i * Math.PI) / 24),
            cy + 4 * Math.sin((i * Math.PI) / 24),
        ]);
    const visScene = (
        heads: Pt[][],
        lines: Pt[][],
        at: [string, number, number][],
    ): { prims: Prim[]; drawn: { nodes: { id: string; x: number; y: number; w: number; h: number }[] } } => {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#add8e6", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const prims = [
            ...lines.map((points) =>
                prim({
                    kind: "path",
                    closed: false,
                    points,
                    fill: null,
                    stroke: { color: INK, opacity: 1, width: 0.3, dash: null, dashClass: "solid" },
                }),
            ),
            ...at.map(([, x, y]) => prim({ points: flat(x, y) })),
            ...heads.map((points) => prim({ points, corners: 3, fill: { color: INK, opacity: 1, gradient: null } })),
        ];
        return { prims, drawn: { nodes: at.map(([id, x, y]) => ({ id, x, y, w: 26, h: 8 })) } };
    };
    const flatNode = ([id, cx, cy]: [string, number, number]): PNode => ({
        ...node([id, cx, cy, 13]),
        h: 8,
    });
    const quad = (a: Pt, c: Pt, b: Pt): Pt[] =>
        Array.from({ length: 128 }, (_, i): Pt => {
            const t = i / 127;
            return [
                (1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0],
                (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1],
            ];
        });

    it("gives a head drawn over a neighbor's center to the line it ends, not to the neighbor", () => {
        // x -> p runs left to right to p's outline at (187, 100); n, drawn before p, sits under the head
        const at: [string, number, number][] = [
            ["a", 40, 40],
            ["b", 360, 40],
            ["c", 40, 260],
            ["x", 100, 100],
            ["n", 184.5, 99.5],
            ["p", 200, 100],
        ];
        const head: Pt[] = [
            [187, 100],
            [182, 103],
            [182.5, 100],
            [182, 97],
            [187, 100],
        ];
        const { prims, drawn } = visScene(
            [head],
            [
                [
                    [100, 100],
                    [200, 100],
                ],
            ],
            at,
        );
        const guide: PScene = {
            side: "graphty",
            width: 400,
            height: 300,
            background: "#ffffff",
            nodes: at.map(flatNode),
            edges: [edge("e1", "x", "p")],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(nameDrawnNodes(prims, drawn), 400, 300, guide, { ownLayout: true, drawn }).scene;
        const line = o.edges.find((e) => e.source === "x" && e.target === "p");
        assert.deepEqual(
            line?.arrows.map((a) => a.end),
            ["target"],
        );
        assert.deepEqual(o.strays, []);
    });

    it("gives a head beside a curve's source, at its overlapping target's outline, to that curve's target", () => {
        // s and t overlap; s -> t bends out right of t and back, entering t's ellipse at x 177 beside s; s -> u leaves
        // s to the right along the same run, its source end under the same head
        const at: [string, number, number][] = [
            ["a", 40, 40],
            ["b", 360, 40],
            ["c", 40, 260],
            ["s", 175, 150],
            ["t", 190, 151],
            ["u", 330, 160],
        ];
        const curve = quad([175, 150], [200, 153], [190, 151]);
        // where the curve first enters t's ellipse, from s
        const entry = curve.find(([x, y]) => ((x - 190) / 13) ** 2 + ((y - 151) / 4) ** 2 < 1) ?? [177, 150];
        const head: Pt[] = [
            entry,
            [entry[0] - 5, entry[1] + 0.5],
            [entry[0] - 4.2, entry[1] - 1],
            [entry[0] - 4.5, entry[1] - 3],
            entry,
        ];
        const { prims, drawn } = visScene(
            [head],
            [
                curve,
                [
                    [175, 150],
                    [330, 160],
                ],
            ],
            at,
        );
        const guide: PScene = {
            side: "graphty",
            width: 400,
            height: 300,
            background: "#ffffff",
            nodes: at.map(flatNode),
            edges: [edge("e1", "s", "t"), edge("e2", "s", "u")],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(nameDrawnNodes(prims, drawn), 400, 300, guide, { ownLayout: true, drawn }).scene;
        assert.deepEqual(
            o.edges.map((e) => [`${e.source}->${e.target}`, e.arrows.map((a) => a.end)]),
            [
                ["s->t", ["target"]],
                ["s->u", []],
            ],
        );
    });
});
