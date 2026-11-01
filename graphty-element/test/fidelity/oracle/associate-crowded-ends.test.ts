/**
 * The oracle association's edge ends where nodes crowd: a line ends on a triangle's slanted side, not on its box
 * (xgmml-aracne-mycccnd1: an end on one triangle's side lay nearer the box of the triangle beside it, which took two
 * lines and left the first with none); a line ends at a group's own outline, a padding out from its one member
 * (cx2-signor-aml: compound nodes of one member); and a loop graphty draws on a node is read as that loop where its end
 * touches a neighbor too (cx2-signor-aml: five loops on JAK2, their heads' tips on BRAF's outline, read as edges to the
 * node beside it); a stub under a third node is the edge between the two it touches (cx-radiation-bibliography); and a
 * shape under an annotation graphty draws is that annotation, not an arrowhead (cx2-wp1449-tlr).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PGroup, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
/** A closed polygon sampled evenly along its sides, as the SVG reader samples one. */
function evenly(pts: readonly Pt[], step = 0.5): Pt[] {
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
const gray = { color: "#cccccc", opacity: 1, gradient: null };
const ink = { color: "#333333", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const node = (id: string, cx: number, cy: number, w = 28.7, h = w, shape: PNode["shape"] = "ellipse"): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape,
    fill: gray,
    stroke: null,
    label: null,
});
const edge = (id: string, source: string, target: string, points: Pt[] = []): PEdge => ({
    id,
    source,
    target,
    points,
    stroke: ink,
    arrows: [],
    label: null,
});
/** Four nodes far out in the corners, which fix the frame. */
const CORNERS: [string, number, number][] = [
    ["k1", 100, 100],
    ["k2", 1100, 100],
    ["k3", 100, 800],
    ["k4", 1100, 800],
];

/** The primitives of one drawing, indexed in the order they are added. */
function drawing(): { prims: Prim[]; add: (over: Partial<Prim> & { points: Pt[] }) => Prim } {
    const prims: Prim[] = [];
    const add = (over: Partial<Prim> & { points: Pt[] }): Prim => {
        const p: Prim = {
            index: prims.length,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: gray,
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        };
        prims.push(p);
        return p;
    };
    for (const [, x, y] of CORNERS) {
        add({ tag: "ellipse", points: disc(x, y, 14) });
    }
    return { prims, add };
}
const line = (points: Pt[]): Partial<Prim> & { points: Pt[] } => ({
    kind: "path",
    closed: false,
    points,
    fill: null,
    stroke: ink,
});
const guide = (nodes: PNode[], edges: PEdge[], groups: PGroup[] = []): PScene => ({
    side: "graphty",
    width: 1200,
    height: 900,
    background: "#ffffff",
    nodes: [...CORNERS.map(([id, x, y]) => node(id, x, y)), ...nodes],
    edges,
    groups,
    texts: [],
    strays: [],
});
const pairs = (s: PScene): string[] => s.edges.map((e) => [e.source, e.target].sort().join("-")).sort();

describe("edge ends where nodes crowd", () => {
    it("gives a line ending on a triangle's slanted side to that triangle, not to the box of the one beside it", () => {
        // xgmml-aracne-mycccnd1: MYC's lines to PCNA and SLC7A5, two triangles pointing up, one below and right of the
        // other
        const { prims, add } = drawing();
        const triangle = (cx: number, cy: number, s: number): Pt[] =>
            evenly([
                [cx, cy - s / 2],
                [cx + s / 2, cy + s / 2],
                [cx - s / 2, cy + s / 2],
            ]);
        add({ tag: "ellipse", points: disc(601.4, 318.4, 14.3) });
        add({ points: triangle(621.8, 428.9, 28.7), corners: 3 });
        add({ points: triangle(640.9, 448.9, 28.7), corners: 3 });
        add(
            line([
                [605.7, 332.9],
                [638.0, 439.5],
            ]),
        );
        add(
            line([
                [604.1, 333.3],
                [619.8, 417.9],
            ]),
        );
        const g = guide(
            [
                node("myc", 601.4, 318.4),
                node("pcna", 621.8, 428.9, 28.7, 28.7, "triangle"),
                node("slc", 640.9, 448.9, 28.7, 28.7, "triangle"),
            ],
            [edge("e1", "myc", "pcna"), edge("e2", "myc", "slc")],
        );
        assert.deepEqual(pairs(associate(prims, 1200, 900, g).scene), ["myc-pcna", "myc-slc"]);
    });

    it("gives a line that runs through one triangle to the one just past it, not to the one it ran through", () => {
        // xgmml-aracne-mycccnd1: MYC's line to -151 runs through -165, whose apex touches -151's base; it ends there,
        // about a pixel from each, and was read as a second line to -165
        const { prims, add } = drawing();
        const triangle = (cx: number, cy: number, s: number): Pt[] =>
            evenly([
                [cx, cy - s / 2],
                [cx + s / 2, cy + s / 2],
                [cx - s / 2, cy + s / 2],
            ]);
        add({ tag: "ellipse", points: disc(601.4, 318.4, 14.3) });
        add({ points: triangle(634.7, 166.5, 28.7), corners: 3 });
        add({ points: triangle(630.5, 194.8, 28.7), corners: 3 });
        add(
            line([
                [604.6, 303.7],
                [631.4, 181.6],
            ]),
        );
        add(
            line([
                [604.8, 303.7],
                [627.0, 209.9],
            ]),
        );
        const g = guide(
            [
                node("myc", 601.4, 318.4),
                node("t151", 634.7, 166.5, 28.7, 28.7, "triangle"),
                node("t165", 630.5, 194.8, 28.7, 28.7, "triangle"),
            ],
            [edge("e1", "myc", "t151"), edge("e2", "myc", "t165")],
        );
        assert.deepEqual(pairs(associate(prims, 1200, 900, g).scene), ["myc-t151", "myc-t165"]);
    });

    it("ends a line at a group's own outline, a padding out from its one member", () => {
        const { prims, add } = drawing();
        add({ tag: "ellipse", points: disc(400, 400, 20) });
        add({ tag: "ellipse", points: disc(700, 400, 20) });
        // the line stops at the group's box, 30 px out from its member's outline
        add(
            line([
                [420, 400],
                [650, 400],
            ]),
        );
        const group: PGroup = {
            id: "grp",
            box: { x0: 650, y0: 350, x1: 750, y1: 450 },
            fill: null,
            stroke: ink,
            label: null,
            members: ["m"],
        };
        const g = guide([node("s", 400, 400, 40), node("m", 700, 400, 40)], [edge("e1", "s", "grp")], [group]);
        assert.deepEqual(pairs(associate(prims, 1200, 900, g).scene), ["grp-s"]);
    });

    it("reads a loop graphty draws on a node as that loop where its end lies as near a neighbor", () => {
        const { prims, add } = drawing();
        // a 60 x 30 ellipse, and a neighbor whose left end touches its top right
        add({
            tag: "ellipse",
            points: evenly(disc(500, 500, 1).map(([x, y]): Pt => [500 + (x - 500) * 30, 500 + (y - 500) * 15])),
        });
        add({ tag: "ellipse", points: disc(546, 482, 12) });
        // a loop from its left end round to the top, ending where the neighbor's outline runs too
        const loop: Pt[] = Array.from({ length: 41 }, (_, i): Pt => {
            const t = Math.PI + (i / 40) * 1.6 * Math.PI;
            return [496 + 30 * Math.cos(t), 486 + 30 * Math.sin(t)];
        });
        add(line([[470, 500], ...loop, [534, 486]]));
        const g = guide(
            [node("a", 500, 500, 60, 30), node("b", 546, 482, 24)],
            [edge("loop", "a", "a", [[470, 500], ...loop, [524, 488]])],
        );
        assert.deepEqual(pairs(associate(prims, 1200, 900, g).scene), ["a-a"]);
    });
    it("reads a stub under a third node, touching the two nodes of an edge graphty draws there, as that edge", () => {
        // cx-radiation-bibliography: 114 -> 100 between an ellipse and a diamond drawn edge to edge, its few pixels
        // under the bottom corner of the diamond 21 drawn over both
        const { prims, add } = drawing();
        const diamond = (cx: number, cy: number, w: number, h: number): Pt[] =>
            evenly([
                [cx, cy - h / 2],
                [cx + w / 2, cy],
                [cx, cy + h / 2],
                [cx - w / 2, cy],
            ]);
        const ellipse = (cx: number, cy: number, w: number, h: number): Pt[] =>
            disc(0, 0, 1).map(([x, y]): Pt => [cx + (x * w) / 2, cy + (y * h) / 2]);
        add({ tag: "ellipse", points: ellipse(520.7, 396.6, 52.9, 12.5) });
        add({ points: diamond(465.9, 392.2, 53.3, 12.5), corners: 4 });
        add(
            line([
                [493.4, 394.4],
                [487.7, 394.0],
            ]),
        );
        add({ points: diamond(494.4, 389.2, 53.3, 12.5), corners: 4 });
        const g = guide(
            [
                node("p", 520.7, 396.6, 52.9, 12.5),
                node("q", 465.9, 392.2, 53.3, 12.5, "diamond"),
                node("t", 494.4, 389.2, 53.3, 12.5, "diamond"),
            ],
            [edge("e1", "p", "q")],
        );
        assert.deepEqual(pairs(associate(prims, 1200, 900, g).scene), ["p-q"]);
    });

    it("leaves a shape under an annotation graphty draws as that annotation, never an arrowhead at a line's end", () => {
        // cx2-wp1449-tlr: a circle annotation where lines meet at an anchor graphty draws no body for
        const { prims, add } = drawing();
        add({ tag: "ellipse", points: disc(400, 400, 20) });
        add(
            line([
                [420, 400],
                [600, 400],
            ]),
        );
        add({ tag: "ellipse", points: disc(605, 400, 5.5), fill: null, stroke: ink });
        const g: PScene = {
            ...guide(
                [node("a", 400, 400, 40)],
                [
                    edge("e1", "a", "k", [
                        [420, 400],
                        [600, 400],
                    ]),
                ],
            ),
            strays: [
                {
                    index: 0,
                    tag: "annotation-shape",
                    kind: "shape",
                    box: { x0: 599.5, y0: 394.5, x1: 610.5, y1: 405.5 },
                    fill: null,
                    stroke: "#000000",
                    text: null,
                },
            ],
        };
        const o = associate(prims, 1200, 900, g).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.length]),
            [["a", "k", 0]],
        );
        assert.include(
            o.strays.map((x) => x.stroke),
            "#333333",
        );
    });
});
