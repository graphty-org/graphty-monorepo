/**
 * Words a program draws as glyph outlines (Cytoscape desktop's FreeHEP export of stringApp's enhanced label: a
 * custom graphic beside each node, its halo stroked white and its letters filled) are lettering, not a line drawn in
 * pieces nor an arrowhead. cx-polygenic-sle's file sets every arrow to NONE, yet a label beside a line's end, lying
 * back along the line, was read as that end's arrowhead on 93 ends.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, isLettering, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

/** A closed outline sampled evenly by arc length, as the SVG reader samples a path's subpath. */
function evenly(pts: readonly Pt[], step = 0.25): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
        const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
        for (let k = 0; k < n; k++) {
            out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
        }
    }
    return out;
}
const at = (pts: readonly Pt[], x: number, y: number): Pt[] => evenly(pts.map(([px, py]): Pt => [px + x, py + y]));
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
];

// the outlines of E, L, T and O (with its hole), 8.8 px tall, as a sans-serif face draws them
const E: Pt[] = [
    [0, 0],
    [5.5, 0],
    [5.5, 1],
    [1.2, 1],
    [1.2, 3.9],
    [5, 3.9],
    [5, 4.9],
    [1.2, 4.9],
    [1.2, 7.8],
    [5.6, 7.8],
    [5.6, 8.8],
    [0, 8.8],
];
const L: Pt[] = [
    [0, 0],
    [1.2, 0],
    [1.2, 7.8],
    [5.6, 7.8],
    [5.6, 8.8],
    [0, 8.8],
];
const T: Pt[] = [
    [0, 0],
    [6, 0],
    [6, 1],
    [3.6, 1],
    [3.6, 8.8],
    [2.4, 8.8],
    [2.4, 1],
    [0, 1],
];
/** The word ELTO with its top left at (x, y), one subpath per outline. */
const word = (x: number, y: number): Pt[][] => [
    at(E, x, y),
    at(L, x + 6.5, y),
    at(T, x + 12.8, y),
    at(box(0, 0, 6, 8.8), x + 19.6, y),
    at(box(1.2, 1.2, 4.8, 7.6), x + 19.6, y),
];

describe("lettering drawn as glyph outlines", () => {
    it("tells a row of letters from a line drawn in dashes or dots", () => {
        assert.isTrue(isLettering(word(0, 0)));
        // a dashed line: one dash repeated, a dash's gap apart
        assert.isFalse(isLettering(Array.from({ length: 6 }, (_, i) => at(box(0, 0, 6, 2), 10 * i, 0))));
        // a dotted one: one dot repeated
        assert.isFalse(isLettering(Array.from({ length: 8 }, (_, i) => at(box(0, 0, 2, 2), 4 * i, 0))));
        // a ring round a node is two outlines, one in the other
        assert.isFalse(isLettering([at(box(0, 0, 30, 30), 0, 0), at(box(2, 2, 28, 28), 0, 0)]));
    });

    it("never reads a node's label drawn as glyph outlines beside a line's end as that end's arrowhead", () => {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#1f78b4", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const disc = (cx: number, cy: number, r: number): Pt[] =>
            Array.from({ length: 32 }, (_, i): Pt => [
                cx + r * Math.cos((i * Math.PI) / 16),
                cy + r * Math.sin((i * Math.PI) / 16),
            ]);
        const grid: [string, number, number][] = [
            ["a", 100, 100],
            ["c", 500, 100],
            ["d", 100, 300],
            ["f", 500, 300],
            ["src", 500, 195],
            ["dst", 300, 200],
        ];
        // the label of dst, at its right, where the line from src ends: its halo stroked, then its letters filled
        const letters = word(312, 192);
        const flat = letters.flat();
        const prims = [
            ...grid.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 12) })),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [488, 195],
                    [312, 197],
                ],
                fill: null,
                stroke: { color: "#c994c7", opacity: 0.5, width: 1.2, dash: null, dashClass: "solid" },
            }),
            prim({
                points: flat,
                fill: null,
                stroke: { color: "#ffffff", opacity: 0.37, width: 3.5, dash: null, dashClass: "solid" },
                lettering: true,
            }),
            prim({ points: flat, fill: { color: "#000000", opacity: 1, gradient: null }, lettering: true }),
        ];
        const node = (id: string, cx: number, cy: number): PNode => ({
            id,
            cx,
            cy,
            w: 24,
            h: 24,
            shape: "ellipse",
            fill: { color: "#1f78b4", opacity: 1, gradient: null },
            stroke: null,
            label: null,
        });
        const edge: PEdge = {
            id: "e",
            source: "src",
            target: "dst",
            points: [],
            stroke: { color: "#c994c7", opacity: 0.5, width: 1.2, dash: null, dashClass: "solid" },
            arrows: [],
            label: null,
        };
        const g: PScene = {
            side: "graphty",
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes: grid.map(([id, x, y]) => node(id, x, y)),
            edges: [edge],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 600, 400, g).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.length]),
            [["src", "dst", 0]],
        );
        // the words are left for the stray check, which says graphty draws nothing there
        assert.includeMembers(
            o.strays.map((s) => s.stroke ?? s.fill),
            ["#ffffff", "#000000"],
        );
    });
});
