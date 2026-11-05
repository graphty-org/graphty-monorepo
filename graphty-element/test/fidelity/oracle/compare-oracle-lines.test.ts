/**
 * The oracle comparison's line, route, gradient and arrowhead checks on tiny hand-made pairs of drawings: each pair
 * differs in one property a reader sees (a line a sixth wider, dashes against dots, a zigzag drawn straight, an arc
 * against a sine wave, a gradient's colors or direction, a hollow arrowhead against a filled one) and fails exactly
 * that property, which the comparator before these checks passed.
 */
import { assert, describe, it } from "vitest";

import { associate, lineCapSize } from "./associate";
import { compareOracle, rampColor, routeShape } from "./compare-oracle";
import {
    arrowShapeOf,
    bandPaintedAsFill,
    boxOfPoints,
    dashClassOf,
    outlinePaintedAsFill,
    type PArrow,
    type PEdge,
    type PFill,
    type PGradient,
    type PNode,
    type Prim,
    type PScene,
    type PStroke,
    type Pt,
} from "./primitives";

const fill = (color: string, gradient: PGradient | null = null): PFill => ({ color, opacity: 1, gradient });
const stroke = (color: string, width = 2, over: Partial<PStroke> = {}): PStroke => ({
    color,
    opacity: 1,
    width,
    dash: null,
    dashClass: "solid",
    ...over,
});
const node = (id: string, cx: number, cy: number, over: Partial<PNode> = {}): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: fill("#cccccc"),
    stroke: null,
    label: null,
    ...over,
});
/** Six nodes on a grid, which fix the frame, and an edge a -> b between the first two. */
const NODES: [string, number, number][] = [
    ["a", 100, 100],
    ["b", 300, 100],
    ["c", 500, 100],
    ["d", 100, 300],
    ["e", 300, 300],
    ["f", 500, 300],
];
const arrow = (over: Partial<PArrow> = {}): PArrow => ({
    end: "target",
    length: 10,
    width: 8,
    filled: true,
    shape: "triangle",
    color: "#0000ff",
    ...over,
});
const edge = (over: Partial<PEdge> = {}): PEdge => ({
    id: "e1",
    source: "a",
    target: "b",
    points: [
        [120, 100],
        [280, 100],
    ],
    stroke: stroke("#0000ff"),
    arrows: [],
    label: null,
    ...over,
});
function scene(
    side: PScene["side"],
    edges: PEdge[],
    nodes: PNode[] = NODES.map(([id, x, y]) => node(id, x, y)),
): PScene {
    return { side, width: 600, height: 400, background: "#ffffff", nodes, edges, groups: [], texts: [], strays: [] };
}
const failing = (o: PScene, g: PScene): string[] =>
    Object.entries(compareOracle("t", o, g).properties)
        .filter(([, v]) => v.passRate !== null && v.passRate < 1)
        .map(([k]) => k);

/** A path's points along a function y(x) from x0 to x1. */
const along = (x0: number, x1: number, y: (x: number) => number, n = 200): Pt[] =>
    Array.from({ length: n }, (_, i): Pt => {
        const x = x0 + ((x1 - x0) * i) / (n - 1);
        return [x, y(x)];
    });
/** A closed outline sampled evenly by arc length, as the SVG reader samples a filled path's subpath. */
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
/** The outline of a polyline stroked `w` wide (its two sides, one back), sampled evenly. */
function strokedOutline(line: readonly Pt[], w: number, step = 0.5): Pt[] {
    const side = (sign: number): Pt[] =>
        line.map((p, i) => {
            const [a, b] = [line[Math.max(0, i - 1)], line[Math.min(line.length - 1, i + 1)]];
            const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            return [p[0] - (sign * w * (b[1] - a[1])) / (2 * L), p[1] + (sign * w * (b[0] - a[0])) / (2 * L)];
        });
    return evenly([...side(1), ...side(-1).reverse()], step);
}
const rect = (cx: number, cy: number, w: number, h: number, turn = 0): Pt[] => {
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    return evenly(
        (
            [
                [-w / 2, -h / 2],
                [w / 2, -h / 2],
                [w / 2, h / 2],
                [-w / 2, h / 2],
            ] as Pt[]
        ).map(([x, y]): Pt => [cx + x * c - y * s, cy + x * s + y * c]),
        0.2,
    );
};
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);

describe("line widths", () => {
    it("fails an edge a sixth wider than the program's, which the old tolerance of a half passed", () => {
        const o = scene("oracle", [edge()]);
        assert.deepEqual(failing(o, scene("graphty", [edge({ stroke: stroke("#0000ff", 2.1) })])), []);
        assert.deepEqual(failing(o, scene("graphty", [edge({ stroke: stroke("#0000ff", 2.35) })])), ["edge.width"]);
    });

    it("fails a node outline a sixth wider than the program's", () => {
        const nodes = (w: number): PNode[] =>
            NODES.map(([id, x, y]) => node(id, x, y, { stroke: stroke("#000000", w) }));
        const o = scene("oracle", [], nodes(2));
        // graphty's ring lies wholly outside its fill, so its node is drawn 2 widths smaller for the same outer size
        const g = (w: number): PScene =>
            scene(
                "graphty",
                [],
                nodes(w).map((n) => ({ ...n, w: 42 - 2 * w, h: 42 - 2 * w })),
            );
        assert.deepEqual(failing(o, g(2.1)), []);
        assert.deepEqual(failing(o, g(2.35)), ["node.strokeWidth"]);
    });

    it("judges a line drawn at its screen floor as drawn, whatever the frame's scale (sigma's minEdgeThickness)", () => {
        // graphty frames the graph half as large: a length is read at twice its pixels, a screen floor at its own
        const half = (over: Partial<PStroke>): PScene =>
            scene(
                "graphty",
                [
                    edge({
                        points: [
                            [60, 50],
                            [140, 50],
                        ],
                        stroke: stroke("#0000ff", 0.85, over),
                    }),
                ],
                NODES.map(([id, x, y]) => node(id, x / 2, y / 2, { w: 20, h: 20 })),
            );
        const o = scene("oracle", [edge({ stroke: stroke("#0000ff", 0.85) })]);
        const width = (g: PScene): number | null => compareOracle("t", o, g).properties["edge.width"].passRate;
        assert.strictEqual(width(half({ screen: true })), 1);
        assert.strictEqual(width(half({})), 0);
    });
});

describe("group outlines", () => {
    const withGroup = (s: PScene, groupStroke: PStroke | null): PScene => ({
        ...s,
        groups: [
            {
                id: "g",
                box: { x0: 60, y0: 60, x1: 340, y1: 140 },
                fill: null,
                stroke: groupStroke,
                label: null,
                members: ["a", "b"],
            },
        ],
    });
    const judged = (o: PStroke | null, g: PStroke | null): string[] =>
        failing(withGroup(scene("oracle", [edge()]), o), withGroup(scene("graphty", [edge()]), g));

    it("judges a group's outline by the node's rule: a hairline is none, a pattern's unread width is not judged", () => {
        assert.deepEqual(judged(stroke("#000000", 2), stroke("#000000", 2.1)), []);
        assert.deepEqual(judged(stroke("#000000", 2), stroke("#000000", 2.4)), ["group.strokeWidth"]);
        // under the hairline on one side and none on the other is the same outline, and not a width that fails
        assert.deepEqual(judged(stroke("#000000", 0.1), null), []);
        // a zigzag the program drew as a fill has no width to read: its line class is judged, not its width
        const zig = stroke("#000000", Number.NaN, { dashClass: "zigzag", patterned: true, painted: true });
        assert.deepEqual(judged(zig, stroke("#000000", 2, { dashClass: "zigzag" })), []);
        assert.deepEqual(judged(zig, stroke("#000000", 2)), ["group.strokeDash"]);
        // an outline drawn on one side only fails the outline once, not its width as well
        assert.deepEqual(judged(stroke("#000000", 2), null), ["group.stroke"]);
    });
});

describe("line classes", () => {
    it("reads a dash array by its dashes and its gaps against the width", () => {
        assert.strictEqual(dashClassOf([6, 3], 1), "dashed");
        assert.strictEqual(dashClassOf([1, 2], 1), "dotted");
        assert.strictEqual(dashClassOf([6, 3, 1, 3], 1), "dash-dot");
        // gaps of a tenth of the pattern or less read as a solid line
        assert.strictEqual(dashClassOf([9, 0.5], 1), "solid");
        // a round cap draws a zero-length dash as a dot a width across, and eats a width of each gap
        assert.strictEqual(dashClassOf([0, 6], 2, "round"), "dotted");
        assert.strictEqual(dashClassOf([8, 2.2], 2, "round"), "solid");
        // a gap of a tenth of the pattern still shows, also as a drawing scaled by 0.936 measures it
        assert.strictEqual(dashClassOf([5, 5], 4, "round"), "dashed");
        assert.strictEqual(dashClassOf([4.678, 4.678], 3.742, "round"), "dashed");
        // Cytoscape's dash-dot under round caps: a dot two widths long beside a dash five
        assert.strictEqual(dashClassOf([12, 6, 3, 6], 3, "round"), "dash-dot");
    });

    it("fails dashes drawn as dots and a dash-dot drawn as dashes", () => {
        const line = (dashClass: PStroke["dashClass"]): PEdge => edge({ stroke: stroke("#0000ff", 2, { dashClass }) });
        assert.deepEqual(failing(scene("oracle", [line("dashed")]), scene("graphty", [line("dotted")])), ["edge.dash"]);
        assert.deepEqual(failing(scene("oracle", [line("dash-dot")]), scene("graphty", [line("dashed")])), [
            "edge.dash",
        ]);
    });

    it("reads graphty's measured dashes at the oracle's scale, where graphty drew the graph ten times smaller", () => {
        const small = (dash: number[] | null, dashClass: PStroke["dashClass"]): PScene =>
            scene(
                "graphty",
                [
                    edge({
                        points: [
                            [12, 10],
                            [28, 10],
                        ],
                        stroke: stroke("#0000ff", 0.2, { dash, dashClass }),
                    }),
                ],
                NODES.map(([id, x, y]) => node(id, x / 10, y / 10, { w: 4, h: 4 })),
            );
        const o = scene("oracle", [edge({ stroke: stroke("#0000ff", 2, { dash: [6, 3], dashClass: "dashed" }) })]);
        // (the drawing fills a tenth as much of its canvas, which frame.zoom reports; only the line class is asked here)
        const dash = (g: PScene): number | null => compareOracle("t", o, g).properties["edge.dash"].passRate;
        // dashes 0.6 render px long are dots under graphty's own pixel floor, and 6 oracle px long dashes in its frame
        assert.strictEqual(dash(small([0.6, 0.3], "dotted")), 1);
        assert.strictEqual(dash(small([0.2, 0.3], "dotted")), 0);
        // a class read by name, with no measured dashes, is taken as it is
        assert.strictEqual(dash(small(null, "dotted")), 0);
    });

    it("fails a zigzag edge drawn solid, and a pattern no class names even against another", () => {
        const line = (dashClass: PStroke["dashClass"]): PEdge => edge({ stroke: stroke("#0000ff", 2, { dashClass }) });
        assert.deepEqual(failing(scene("oracle", [line("zigzag")]), scene("graphty", [line("solid")])), ["edge.dash"]);
        assert.deepEqual(failing(scene("oracle", [line("zigzag")]), scene("graphty", [line("zigzag")])), []);
        assert.deepEqual(failing(scene("oracle", [line("other")]), scene("graphty", [line("other")])), ["edge.dash"]);
    });

    it("fails a zigzag node border drawn solid, which the comparator used to leave unjudged", () => {
        const nodes = (dashClass: PStroke["dashClass"]): PNode[] =>
            NODES.map(([id, x, y]) =>
                node(id, x, y, {
                    stroke: stroke("#000000", Number.NaN, { dashClass, patterned: true, painted: true }),
                }),
            );
        const solid = NODES.map(([id, x, y]) => node(id, x, y, { stroke: stroke("#000000", 2) }));
        assert.deepEqual(failing(scene("oracle", [], nodes("zigzag")), scene("graphty", [], solid)), [
            "node.strokeDash",
        ]);
    });
});

describe("patterns a program drew as fills", () => {
    const zig = along(0, 200, (x) => (Math.floor(x / 10) % 2 === 0 ? (x % 10) - 5 : 5 - (x % 10)) * 1.6, 401);
    const sine = along(0, 200, (x) => 8 * Math.sin((x * Math.PI) / 20));

    it("reads a band's pattern: zigzag, sine wave, solid, dots, dashes, slashes, arrows, a double line", () => {
        assert.strictEqual(bandPaintedAsFill([strokedOutline(zig, 2)])?.dashClass, "zigzag");
        assert.strictEqual(bandPaintedAsFill([strokedOutline(sine, 2, 2)])?.dashClass, "sinewave");
        // a sine wave drawn a lobe at a time, each lobe a subpath of its own touching the next
        const lobes = [0, 1, 2, 3, 4].map((k) =>
            strokedOutline(
                sine.filter(([x]) => x >= 40 * k && x <= 40 * (k + 1)),
                2,
                2,
            ),
        );
        assert.strictEqual(bandPaintedAsFill(lobes)?.dashClass, "sinewave");
        // a row of arrows touching one another, each a shaft and a head square on the line, is no wave
        const darts = [0, 1, 2, 3, 4].map((k) =>
            evenly([
                [40 * k, -1],
                [40 * k + 30, -1],
                [40 * k + 30, -8],
                [40 * k + 40, 0],
                [40 * k + 30, 8],
                [40 * k + 30, 1],
                [40 * k, 1],
            ]),
        );
        assert.strictEqual(bandPaintedAsFill(darts)?.dashClass, "arrows");
        const straight = bandPaintedAsFill([
            strokedOutline(
                along(0, 200, () => 0),
                3,
            ),
        ]);
        assert.strictEqual(straight?.dashClass, "solid");
        assert.closeTo(straight?.width ?? 0, 3, 0.1);
        const row = (piece: (x: number) => Pt[]): Pt[][] => Array.from({ length: 20 }, (_, i) => piece(5 + 10 * i));
        assert.strictEqual(bandPaintedAsFill(row((x) => disc(x, 0, 2)))?.dashClass, "dotted");
        assert.strictEqual(bandPaintedAsFill(row((x) => rect(x, 0, 6, 2)))?.dashClass, "dashed");
        assert.strictEqual(bandPaintedAsFill(row((x) => rect(x, 0, 1, 8, 0.5)))?.dashClass, "slashes");
        assert.strictEqual(
            bandPaintedAsFill(
                row((x) =>
                    evenly([
                        [x - 4, -4],
                        [x + 4, 0],
                        [x - 4, 4],
                    ]),
                ),
            )?.dashClass,
            "arrows",
        );
        assert.strictEqual(bandPaintedAsFill([rect(100, -3, 200, 1.5), rect(100, 3, 200, 1.5)])?.dashClass, "double");
        // the ends of its axis are the line's route
        const ends = bandPaintedAsFill([strokedOutline(zig, 2)])?.ends;
        assert.closeTo(Math.min(ends?.[0][0] ?? 0, ends?.[1][0] ?? 0), -1, 1.5);
        assert.closeTo(Math.max(ends?.[0][0] ?? 0, ends?.[1][0] ?? 0), 201, 1.5);
        // no band: a dot, a node-sized square
        assert.isNull(bandPaintedAsFill([disc(0, 0, 5)]));
        assert.isNull(bandPaintedAsFill([rect(0, 0, 40, 40)]));
    });

    it("reads a wide sine wave drawn a period at a time as a sine wave, not a row of arrows", () => {
        // Cytoscape desktop's sine wave on a wide edge (cys-syn-mappings 432->450, as its SVG draws it): each piece a
        // whole period, a crest and a trough, which lies off its mirror image across the line by less than its
        // thickness, though by far more than an arrow drawn square on the line does
        const period: Pt[] = [
            [0, 0],
            [0, 1],
            [0.1, 2],
            [0.1, 3],
            [0.1, 4],
            [0.1, 5],
            [0.6, 5.9],
            [1.1, 6.8],
            [1.7, 7.5],
            [2.5, 8.2],
            [3.4, 8.6],
            [4.4, 8.5],
            [5.2, 8],
            [5.9, 7.3],
            [6.5, 6.5],
            [7, 5.6],
            [7.4, 4.7],
            [7.6, 3.7],
            [7.8, 2.7],
            [8, 1.7],
            [8.2, 0.8],
            [8.5, -0.2],
            [8.8, -1.2],
            [9.1, -2.1],
            [9.6, -3],
            [10.2, -3.7],
            [11.2, -3.7],
            [11.9, -3],
            [12.4, -2.1],
            [12.8, -1.2],
            [13.1, -0.3],
            [13.4, 0.7],
            [13.7, 1.7],
            [14, 2.6],
            [14.2, 3.6],
            [14.5, 4.6],
            [14.5, 4],
            [14.5, 3],
            [14.4, 2],
            [14.4, 1],
            [14.4, -0.1],
            [14.2, -1],
            [13.8, -2],
            [13.5, -2.9],
            [13.1, -3.8],
            [12.6, -4.7],
            [12, -5.6],
            [11.3, -6.2],
            [10.4, -6.4],
            [9.5, -5.9],
            [9, -5.1],
            [8.5, -4.2],
            [8.1, -3.2],
            [7.8, -2.3],
            [7.5, -1.3],
            [7.2, -0.4],
            [7, 0.6],
            [6.7, 1.6],
            [6.4, 2.5],
            [6, 3.5],
            [5.6, 4.4],
            [5, 5.2],
            [4.3, 5.9],
            [3.3, 6],
            [2.5, 5.4],
            [1.9, 4.6],
            [1.5, 3.7],
            [1, 2.8],
            [0.7, 1.9],
            [0.3, 1],
        ];
        const pieces = Array.from({ length: 30 }, (_, k) => period.map(([x, y]): Pt => [x + 14.4 * k, y]));
        assert.strictEqual(bandPaintedAsFill(pieces)?.dashClass, "sinewave");
    });

    it("reads a ring border's pattern: a star of spikes is a zigzag, a ring of loops a sine wave", () => {
        const ring = (r: (a: number) => number, n = 720): Pt[] =>
            Array.from({ length: n }, (_, i) => {
                const a = (2 * Math.PI * i) / n;
                return [100 + r(a) * Math.cos(a), 100 + r(a) * Math.sin(a)];
            });
        const star = evenly(
            Array.from({ length: 10 }, (_, i): Pt => {
                const [a, r] = [(i * Math.PI) / 5, i % 2 === 0 ? 30 : 20];
                return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
            }),
        );
        assert.strictEqual(outlinePaintedAsFill([star, ring(() => 18).reverse()])?.dashClass, "zigzag");
        assert.strictEqual(
            outlinePaintedAsFill([
                ring((a) => 25 + 5 * Math.sin(8 * a)),
                ring((a) => 22 + 5 * Math.sin(8 * a)).reverse(),
            ])?.dashClass,
            "sinewave",
        );
        // two rows of short dashes round the node: a double line
        const rows = [18, 24].flatMap((r) =>
            Array.from({ length: 40 }, (_, i) => {
                const a = (i * Math.PI) / 20;
                return rect(100 + r * Math.cos(a), 100 + r * Math.sin(a), 2, 1.2, a + Math.PI / 2);
            }),
        );
        assert.strictEqual(outlinePaintedAsFill(rows)?.dashClass, "double");
    });

    it("reads two filled shapes side by side in one path as shapes, not as a ring painted as a fill", () => {
        // Cytoscape.js's triangle-tee arrow: a triangle and a bar behind it, one filled path of two subpaths
        const triangle = evenly([
            [470, 139],
            [461.6, 135],
            [461.6, 143.4],
            [470, 139],
        ]);
        const tee = evenly([
            [458.8, 143.4],
            [456, 143.4],
            [456, 135],
            [458.8, 135],
            [458.8, 143.4],
        ]);
        assert.isNull(outlinePaintedAsFill([triangle, tee]));
    });

    it("finds an edge the program drew as a filled zigzag band between two nodes, and reads its pattern", () => {
        let index = 0;
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
        const band = strokedOutline(
            zig.map(([x, y]): Pt => [x + 100, y + 100]),
            2,
        );
        const prims = [
            ...NODES.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            prim({ points: band, fill: fill("#0000ff"), subpaths: [band] }),
        ];
        const g = scene("graphty", [edge({ stroke: stroke("#0000ff", 2, { dashClass: "solid" }) })]);
        const o = associate(prims, 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 1);
        assert.strictEqual(o.edges[0].stroke?.dashClass, "zigzag");
        assert.deepEqual(o.strays, []);
        const r = compareOracle("t", o, g);
        assert.strictEqual(r.properties["edge.present"].passRate, 1);
        assert.strictEqual(r.properties["edge.dash"].passRate, 0);
        // a plain filled bar along a drawn edge (its label's background box) is no second edge
        const bar = strokedOutline(
            along(160, 240, () => 100),
            10,
        );
        const line = prim({
            kind: "path",
            closed: false,
            points: [
                [120, 100],
                [280, 100],
            ],
            stroke: stroke("#0000ff"),
        });
        const withBar = associate(
            [...prims.slice(0, NODES.length), line, prim({ points: bar, fill: fill("#ffff66"), subpaths: [bar] })],
            600,
            400,
            g,
        ).scene;
        assert.strictEqual(withBar.edges.length, 1);
        assert.strictEqual(withBar.edges[0].stroke?.color, "#0000ff");
    });

    it("finds a wide zigzag on a short edge, little longer than it is tall, as that edge and not a stray", () => {
        // Cytoscape desktop's zigzag on a specimen cell: three teeth 20 px high over 60 px
        const tooth = (x: number): number => {
            const k = x % 20;
            return (k < 10 ? k : 20 - k) * 2 - 10;
        };
        const short = strokedOutline(
            along(120, 180, (x) => 100 + tooth(x), 241),
            2,
        );
        let index = 0;
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
        const nodes: [string, number, number][] = [
            ["a", 100, 100],
            ["b", 200, 100],
            ["c", 500, 100],
            ["d", 100, 300],
            ["e", 300, 300],
            ["f", 500, 300],
        ];
        const prims = [
            ...nodes.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            prim({ points: short, fill: fill("#0000ff"), subpaths: [short] }),
        ];
        const g = scene(
            "graphty",
            [
                edge({
                    points: [
                        [120, 100],
                        [180, 100],
                    ],
                }),
            ],
            nodes.map(([id, x, y]) => node(id, x, y)),
        );
        const o = associate(prims, 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 1);
        assert.strictEqual(o.edges[0].stroke?.dashClass, "zigzag");
        assert.deepEqual(o.strays, []);
        assert.strictEqual(compareOracle("t", o, g).properties["edge.dash"].passRate, 0);
    });
});

describe("edge outlines", () => {
    it("reads a wider line drawn under a narrower one along its route as the edge's outline, not a second edge", () => {
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
        const route: Pt[] = [
            [120, 100],
            [280, 100],
        ];
        const nodes = NODES.map(([, x, y]) =>
            prim({ tag: "ellipse", kind: "shape", closed: true, points: disc(x, y, 20), fill: fill("#cccccc") }),
        );
        const band = prim({ points: route, stroke: stroke("#ff0000", 6) });
        const line = prim({ points: route, stroke: stroke("#0000ff", 2) });
        const g = scene("graphty", [edge({ outline: { color: "#ff0000", opacity: 1, width: 6 } })]);
        const o = associate([...nodes, band, line], 600, 400, g).scene;
        assert.strictEqual(o.edges.length, 1);
        assert.strictEqual(o.edges[0].stroke?.color, "#0000ff");
        assert.deepEqual(o.edges[0].outline, { color: "#ff0000", opacity: 1, width: 6 });
        // drawn over the line, the wider one hides it: no outline then
        const over = associate(
            [...nodes, { ...line, index: band.index }, { ...band, index: line.index }],
            600,
            400,
            g,
        ).scene;
        assert.isUndefined(over.edges.find((e) => e.stroke?.color === "#0000ff")?.outline);
    });

    it("fails an edge drawn without the band the program draws under it, or with a band of another width", () => {
        const withBand = (width: number, color = "#ff0000"): PEdge => edge({ outline: { color, opacity: 1, width } });
        const o = scene("oracle", [withBand(6)]);
        assert.deepEqual(failing(o, scene("graphty", [withBand(6)])), []);
        assert.deepEqual(failing(o, scene("graphty", [edge()])), ["edge.outline"]);
        assert.deepEqual(failing(o, scene("graphty", [withBand(8)])), ["edge.outline"]);
        assert.deepEqual(failing(o, scene("graphty", [withBand(6, "#000000")])), ["edge.outline"]);
        assert.deepEqual(failing(scene("oracle", [edge()]), scene("graphty", [withBand(6)])), ["edge.outline"]);
    });
});

describe("routes", () => {
    it("judges a route's shape against its own ends: an arc fails against a sine wave of the same height", () => {
        const arc = along(120, 280, (x) => 100 - 25 * Math.sin(((x - 120) * Math.PI) / 160));
        const wave = along(120, 280, (x) => 100 - 12.5 * Math.sin(((x - 120) * Math.PI) / 80));
        assert.isAbove(routeShape(arc, wave).gap, 0.1);
        assert.isBelow(routeShape(arc, arc).gap, 1e-9);
        const o = scene("oracle", [edge({ points: wave })]);
        assert.include(failing(o, scene("graphty", [edge({ points: arc })])), "edge.route");
    });

    it("compares how far a route bends, not only whether it does", () => {
        const bow = (h: number): Pt[] => along(120, 280, (x) => 100 - h * Math.sin(((x - 120) * Math.PI) / 160));
        const o = scene("oracle", [edge({ points: bow(60) })]);
        // both curved; the old check passed them
        const r = compareOracle("t", o, scene("graphty", [edge({ points: bow(20) })]));
        assert.strictEqual(r.properties["edge.curve"].passRate, 0);
        assert.strictEqual(
            compareOracle("t", o, scene("graphty", [edge({ points: bow(55) })])).properties["edge.curve"].passRate,
            1,
        );
    });

    it("cuts each route at its own nodes' outlines, so a line under the nodes and one between them agree", () => {
        const centers = edge({
            points: [
                [100, 100],
                [300, 100],
            ],
        });
        assert.deepEqual(failing(scene("oracle", [edge()]), scene("graphty", [centers])), []);
        // a route that leaves its node 20 pixels off its center is another route, whatever its shape
        const off = edge({
            points: [
                [120, 120],
                [280, 120],
            ],
        });
        assert.include(failing(scene("oracle", [edge()]), scene("graphty", [off])), "edge.route");
    });
});

describe("gradients", () => {
    const linear = (angle: number, ...colors: string[]): PGradient => ({
        kind: "linear",
        stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color, opacity: 1 })),
        angle,
    });

    it("mixes a gradient's colors between its stops", () => {
        assert.strictEqual(rampColor(linear(0, "#000000", "#ffffff"), 0.5), "#808080");
        assert.strictEqual(rampColor(linear(0, "#ff0000", "#00ff00", "#0000ff"), 1), "#0000ff");
    });

    it("fails a node gradient of other colors or another direction, which a check of presence alone passed", () => {
        const nodes = (g: PGradient): PNode[] =>
            NODES.map(([id, x, y]) => node(id, x, y, { fill: fill("#ff0000", g) }));
        const o = scene("oracle", [], nodes(linear(0, "#ff0000", "#0000ff")));
        assert.deepEqual(failing(o, scene("graphty", [], nodes(linear(5, "#ff0000", "#0000ff")))), []);
        assert.deepEqual(failing(o, scene("graphty", [], nodes(linear(0, "#ff0000", "#00ff00")))), ["node.gradient"]);
        assert.deepEqual(failing(o, scene("graphty", [], nodes(linear(90, "#ff0000", "#0000ff")))), ["node.gradient"]);
        assert.deepEqual(
            failing(o, scene("graphty", [], nodes({ ...linear(0, "#ff0000", "#0000ff"), kind: "radial" }))),
            ["node.gradient"],
        );
    });

    it("fails an edge drawn flat where the program draws a gradient along it", () => {
        const o = scene("oracle", [
            edge({ stroke: stroke("#00ffff", 2, { gradient: linear(0, "#00ffff", "#ff00ff") }) }),
        ]);
        assert.deepEqual(failing(o, scene("graphty", [edge({ stroke: stroke("#00ffff", 2) })])), ["edge.gradient"]);
        // the same gradient, judged against the edge's own direction
        assert.deepEqual(
            failing(
                o,
                scene("graphty", [
                    edge({ stroke: stroke("#00ffff", 2, { gradient: linear(0, "#00ffff", "#ff00ff") }) }),
                ]),
            ),
            [],
        );
    });

    it("judges no direction on a gradient of one color, which looks the same run either way", () => {
        const o = scene("oracle", [
            edge({ stroke: stroke("#c8c8c8", 2, { gradient: linear(0, "#c8c8c8", "#c8c8c8") }) }),
        ]);
        const along = (angle: number, from: string, to: string): PScene =>
            scene("graphty", [edge({ stroke: stroke("#c8c8c8", 2, { gradient: linear(angle, from, to) }) })]);
        assert.deepEqual(failing(o, along(180, "#c8c8c8", "#c8c8c8")), []);
        // a ramp that changes color is still judged by its direction
        const changing = scene("oracle", [
            edge({ stroke: stroke("#c8c8c8", 2, { gradient: linear(0, "#c8c8c8", "#ff0000") }) }),
        ]);
        assert.deepEqual(failing(changing, along(180, "#c8c8c8", "#ff0000")), ["edge.gradient"]);
    });
});

describe("arrowheads", () => {
    it("reads an arrowhead's shape class from its outline", () => {
        const right: Pt = [1, 0];
        const poly = (pts: Pt[]): Pt[] => evenly(pts, 0.25);
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, -4],
                    [10, 0],
                    [0, 4],
                ]),
                right,
            ),
            "triangle",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 0],
                    [10, -4],
                    [10, 4],
                ]),
                right,
            ),
            "inverted",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, -4],
                    [10, 0],
                    [0, 4],
                    [3, 0],
                ]),
                right,
            ),
            "vee",
        );
        // draw.io's classic (mxMarker): its back pressed in a quarter of its length, which reads exactly 0.75 covered
        // a fifth of the way from its back -- a vee, not a triangle
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, -4],
                    [12, 0],
                    [0, 4],
                    [3, 0],
                ]),
                right,
            ),
            "vee",
        );
        // Pajek's arrow, its back pressed in a sixth of its length, and vis-network's, a tenth: triangles
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [-1, -2.5],
                    [5, 0],
                    [-1, 2.5],
                    [0, 0],
                ]),
                right,
            ),
            "triangle",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [-10, -3],
                    [0, 0],
                    [-10, 3],
                    [-9, 0],
                ]),
                right,
            ),
            "triangle",
        );
        // Cytoscape.js's chevron: two thick arms, a notch half its length deep
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [5.6, 0],
                    [1.4, 4.2],
                    [0, 2.8],
                    [2.8, 0],
                    [0, -2.8],
                    [1.4, -4.2],
                ]),
                right,
            ),
            "vee",
        );
        // a crow's foot: tines spreading towards the node, one along the line (Graphviz's, a spike of no width)
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 0],
                    [10, -5],
                    [5, 0],
                    [10, 0],
                    [5, 0],
                    [10, 5],
                ]),
                right,
            ),
            "crow",
        );
        // a vee turned back, its notch empty (vis-network's crow): no crow's foot
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 0],
                    [10, -5],
                    [5, 0],
                    [10, 5],
                ]),
                right,
            ),
            "inverted-vee",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 0],
                    [5, -4],
                    [10, 0],
                    [5, 4],
                ]),
                right,
            ),
            "diamond",
        );
        assert.strictEqual(arrowShapeOf(disc(5, 0, 5), right), "circle");
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, -4],
                    [8, -4],
                    [8, 4],
                    [0, 4],
                ]),
                right,
            ),
            "box",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, -6],
                    [2, -6],
                    [2, 6],
                    [0, 6],
                ]),
                right,
            ),
            "tee",
        );
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 0],
                    [10, 0],
                    [0, 5],
                ]),
                right,
            ),
            "half",
        );
        // Cytoscape's half arrow: one barb back from the tip
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [0, 7],
                    [1, 8],
                    [10, 0.5],
                    [9.5, -0.5],
                ]),
                right,
            ),
            "half",
        );
        // a half circle with its flat side across the tip (Cytoscape's HALF_CIRCLE) is its own class, no inverted
        // triangle
        assert.strictEqual(
            arrowShapeOf(
                Array.from({ length: 33 }, (_, i): Pt => [
                    10 - 10 * Math.sin((i * Math.PI) / 32),
                    -10 * Math.cos((i * Math.PI) / 32),
                ]),
                right,
            ),
            "half-circle",
        );
        // a triangle with a bar behind it, pointing back, is not one: it narrows again past its bar
        assert.notStrictEqual(
            arrowShapeOf(
                poly([
                    [10, -3],
                    [10, 3],
                    [9, 3],
                    [9, 0.5],
                    [8, 0.5],
                    [8, 3],
                    [2, 0],
                    [8, -3],
                    [8, -0.5],
                    [9, -0.5],
                    [9, -3],
                ]),
                right,
            ),
            "half-circle",
        );
        // Cytoscape's CROSS_DELTA (FilledArrowRenderer's CROSS_DELTA, 3 long): a delta 2 long and 1 wide, and a bar
        // 0.25 deep and 1.5 wide at the back, a gap between them; one path of two subpaths, no point in the gap
        const scaled = (pts: Pt[]): Pt[] => pts.map(([x, y]): Pt => [10 * x, 10 * y]);
        const bar = poly(
            scaled([
                [-3, -0.75],
                [-2.75, -0.75],
                [-2.75, 0.75],
                [-3, 0.75],
            ]),
        );
        const delta = scaled([
            [-2, -0.5],
            [0, 0],
            [-2, 0.5],
        ]);
        assert.strictEqual(arrowShapeOf([...poly(delta), ...bar], right), "cross-delta");
        // as the SVG reader gives a straight path's outline: its corners alone, each subpath's start repeated
        assert.strictEqual(
            arrowShapeOf(
                [
                    ...delta,
                    delta[0],
                    ...scaled([
                        [-3, -0.75],
                        [-2.75, -0.75],
                        [-2.75, 0.75],
                        [-3, 0.75],
                        [-3, -0.75],
                    ]),
                ],
                right,
            ),
            "cross-delta",
        );
        // CROSS_OPEN_DELTA: the delta outlined, an inner delta inside the outer one
        const inner = scaled([
            [-1.85, -0.38],
            [-0.3, 0],
            [-1.85, 0.38],
        ]);
        assert.strictEqual(arrowShapeOf([...poly(delta), ...poly(inner), ...bar], right), "cross-delta");
        // a bar narrower than the delta in front is no crossed delta
        assert.notStrictEqual(
            arrowShapeOf(
                [
                    ...poly(delta),
                    ...poly(
                        scaled([
                            [-3, -0.2],
                            [-2.75, -0.2],
                            [-2.75, 0.2],
                            [-3, 0.2],
                        ]),
                    ),
                ],
                right,
            ),
            "cross-delta",
        );
        // read against the line's direction, whichever way it runs on screen
        assert.strictEqual(
            arrowShapeOf(
                poly([
                    [-4, 0],
                    [0, 10],
                    [4, 0],
                ]),
                [0, 1],
            ),
            "triangle",
        );
    });

    it("fails a hollow arrowhead drawn filled, another shape, and another color, at the same size", () => {
        const at = (a: PArrow): PEdge => edge({ arrows: [a] });
        const o = scene("oracle", [at(arrow())]);
        assert.deepEqual(failing(o, scene("graphty", [at(arrow())])), []);
        assert.deepEqual(failing(scene("oracle", [at(arrow({ filled: false }))]), scene("graphty", [at(arrow())])), [
            "edge.arrowFill",
        ]);
        assert.deepEqual(failing(o, scene("graphty", [at(arrow({ shape: "diamond" }))])), ["edge.arrowShape"]);
        assert.deepEqual(failing(o, scene("graphty", [at(arrow({ color: "#ff0000" }))])), ["edge.arrowColor"]);
        assert.deepEqual(
            failing(
                scene("oracle", [at(arrow({ shape: "other" }))]),
                scene("graphty", [at(arrow({ shape: "other" }))]),
            ),
            ["edge.arrowShape"],
        );
    });

    /**
     * Reads the arrowhead an oracle drew as one polygon at b's end of an edge a -> b.
     * @param look - the polygon's fill and outline
     * @param look.fill - its fill
     * @param look.stroke - its outline
     * @returns the arrow the reader finds
     */
    const readHeads = (looks: readonly { fill: PFill | null; stroke: PStroke | null }[]): PArrow[] => {
        let index = 0;
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
        const prims = [
            ...NODES.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [120, 100],
                    [270, 100],
                ],
                stroke: stroke("#0000ff"),
            }),
            ...looks.map((look) =>
                prim({
                    tag: "polygon",
                    points: [
                        [270, 96],
                        [280, 100],
                        [270, 104],
                        [270, 96],
                    ],
                    ...look,
                }),
            ),
        ];
        return associate(prims, 600, 400, scene("graphty", [edge({ arrows: [arrow()] })])).scene.edges[0]?.arrows ?? [];
    };
    const readHead = (look: { fill: PFill; stroke: PStroke }): PArrow | undefined => readHeads([look])[0];

    it("reads a translucent Cytoscape.js arrowhead painted over its erasure as one filled arrowhead", () => {
        // drawArrowhead erases the shape (recorded as a white fill), then fills it at the edge's opacity
        const heads = readHeads([
            { fill: fill("#ffffff"), stroke: null },
            { fill: { ...fill("#008000"), opacity: 0.2 }, stroke: null },
        ]);
        assert.strictEqual(heads.length, 1);
        assert.isTrue(heads[0]?.filled);
        assert.strictEqual(heads[0]?.color, "#008000");
    });

    it("reads an arrowhead filled in the canvas's own color as hollow, and gives it its outline's color", () => {
        const head = readHead({ fill: fill("#ffffff"), stroke: stroke("#ff0000", 1) });
        assert.isFalse(head?.filled);
        assert.strictEqual(head?.color, "#ff0000");
        assert.strictEqual(head?.shape, "triangle");
    });

    it("reads a translucent arrowhead filled as faintly as its outline as filled", () => {
        // Graphviz's edge color #00000033: the line, the arrow's outline and its fill all at 0.2 opacity
        const faint = { opacity: 0.2 };
        const head = readHead({ fill: { ...fill("#000000"), ...faint }, stroke: stroke("#000000", 2, faint) });
        assert.isTrue(head?.filled);
        assert.strictEqual(head?.color, "#000000");
        // a faint fill under an opaque outline is still a hollow arrowhead's
        assert.isFalse(readHead({ fill: { ...fill("#000000"), ...faint }, stroke: stroke("#000000", 2) })?.filled);
    });
});

describe("a line a program stops at its arrowhead's base", () => {
    it("reaches its node through the arrowhead, as Cytoscape desktop draws a long arrowhead on a short edge", () => {
        let index = 0;
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
        // the line ends 25 px short of b's box, farther than an end reaches on its own; the arrowhead fills the gap
        const prims = [
            ...NODES.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [120, 100],
                    [255, 100],
                ],
                stroke: stroke("#0000ff"),
            }),
            prim({
                tag: "polygon",
                points: [
                    [255, 92],
                    [280, 100],
                    [255, 108],
                    [255, 92],
                ],
                fill: fill("#0000ff"),
            }),
        ];
        const o = associate(prims, 600, 400, scene("graphty", [edge({ arrows: [arrow()] })])).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]),
            [["a", "b", ["target"]]],
        );
        assert.deepEqual(o.strays, []);
    });
    // The pieces of one edge drawn as a line from a's outline and a head reaching to b's (x 280), in the oracle.
    const drawn = (line: Pt[], head: Pt[]): Prim[] => {
        let index = 0;
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
        return [
            ...NODES.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            prim({ kind: "path", closed: false, points: line, stroke: stroke("#0000ff") }),
            prim({ tag: "polygon", points: head, fill: fill("#0000ff") }),
        ];
    };

    it("takes an arrowhead longer than the short line it caps as that line's, not as a stray", () => {
        // Cytoscape desktop's arrow size 24 on a short edge: a 40 px line and a 120 px head
        const prims = drawn(
            [
                [120, 100],
                [160, 100],
            ],
            [
                [160, 80],
                [280, 100],
                [160, 120],
                [160, 80],
            ],
        );
        const o = associate(prims, 600, 400, scene("graphty", [edge({ arrows: [arrow()] })])).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]),
            [["a", "b", ["target"]]],
        );
        assert.deepEqual(o.strays, []);
        assert.deepEqual(o.edges[0].points.at(-1), [280, 100]);
    });

    it("takes a stub under a long head between small nodes as the edge to the node the head reaches", () => {
        // Cytoscape desktop's arrow size 24 between nodes 11 px across (xgmml-specimen-arrows-p2 edge 8): a 13 px
        // stub from a's outline, a 51 px head on to b's; the stub's far end is within a small node's reach of a
        let index = 0;
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
        const small: [string, number, number][] = [
            ["a", 91, 100],
            ["b", 167.7, 100],
            ["c", 500, 100],
            ["d", 91, 300],
        ];
        const prims = [
            ...small.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 5.5), fill: fill("#cccccc") })),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [97, 100],
                    [110.2, 100],
                ],
                stroke: stroke("#0000ff", 1.5),
            }),
            prim({
                tag: "polygon",
                points: [
                    [110.2, 87.1],
                    [161.6, 100],
                    [110.2, 112.9],
                    [110.2, 87.1],
                ],
                fill: fill("#0000ff"),
            }),
        ];
        const guide = scene(
            "graphty",
            [
                edge({
                    points: [
                        [97, 100],
                        [162, 100],
                    ],
                    arrows: [arrow({ length: 48, width: 24 })],
                }),
            ],
            small.map(([id, x, y]) => node(id, x, y, { w: 11, h: 11 })),
        );
        const o = associate(prims, 600, 400, guide).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]),
            [["a", "b", ["target"]]],
        );
        assert.deepEqual(o.strays, []);
        // the same stub drawn from its far end: that end, now its first, is the one re-read
        const back = prims.map((q) => (q.kind === "path" ? { ...q, points: [...q.points].reverse() } : q));
        const r = associate(back, 600, 400, guide).scene;
        assert.deepEqual(
            r.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]),
            [["b", "a", ["source"]]],
        );
    });

    it("takes a line-wide dot at a wide line's end over a small node as the line's own end", () => {
        // Cytoscape desktop's arrow shape NONE on a line 6 px wide from a node 11 px across (xgmml-specimen-arrows-p2
        // arrow-on-wide-edge): a half dot 3 px deep at the line's start, over the node's box
        let index = 0;
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
        const half = Array.from({ length: 13 }, (_, k): Pt => {
            const t = Math.PI / 2 + (k * Math.PI) / 12;
            return [97 + 3 * Math.cos(t), 100 - 3 * Math.sin(t)];
        });
        const prims = [
            prim({ tag: "ellipse", points: disc(91, 100, 5.5), fill: fill("#cccccc") }),
            prim({ tag: "ellipse", points: disc(300, 100, 5.5), fill: fill("#cccccc") }),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [97, 100],
                    [262, 100],
                ],
                stroke: stroke("#505050", 6),
            }),
            prim({ points: [...half, half[0]], fill: fill("#505050") }),
            prim({
                tag: "polygon",
                points: [
                    [262, 92],
                    [294, 100],
                    [262, 108],
                    [262, 92],
                ],
                fill: fill("#505050"),
            }),
        ];
        const guide = scene(
            "graphty",
            [
                edge({
                    points: [
                        [97, 100],
                        [294, 100],
                    ],
                    arrows: [arrow({ length: 32, width: 16 })],
                }),
            ],
            [node("a", 91, 100, { w: 11, h: 11 }), node("b", 300, 100, { w: 11, h: 11 })],
        );
        const o = associate(prims, 600, 400, guide).scene;
        assert.deepEqual(
            o.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]),
            [["a", "b", ["target"]]],
        );
        assert.deepEqual(o.strays, []);
    });

    it("gives a cap at a crowded node to the line that stops at its base, not the end nearest its middle", () => {
        // Cytoscape desktop stops a line at its arrowhead's base; another line ending at the same node may end under
        // the middle of that cap, nearer its center (xgmml-syn-mappings 1269791)
        let index = 0;
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
        const prims = [
            ...NODES.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 20), fill: fill("#cccccc") })),
            // drawn before either line: drawn right after a line, a cap is that line's (Cytoscape desktop draws each
            // edge's arrowheads right after its line), which would decide it here
            prim({
                tag: "polygon",
                points: [
                    [255, 92],
                    [280, 100],
                    [255, 108],
                    [255, 92],
                ],
                fill: fill("#0000ff"),
            }),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [120, 100],
                    [255, 100],
                ],
                stroke: stroke("#0000ff"),
            }),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [115, 285],
                    [264, 101],
                ],
                stroke: stroke("#ff0000"),
            }),
        ];
        const guide = scene("graphty", [
            edge({ arrows: [arrow({ length: 25, width: 16 })] }),
            edge({
                id: "e2",
                source: "d",
                points: [
                    [115, 285],
                    [285, 112],
                ],
                stroke: stroke("#ff0000"),
            }),
        ]);
        const o = associate(prims, 600, 400, guide).scene;
        assert.deepEqual(o.edges.map((e) => [e.source, e.target, e.arrows.map((a) => a.end)]).sort(), [
            ["a", "b", ["target"]],
            ["d", "b", []],
        ]);
    });

    it("takes every cap at the end of a patterned band of no one width as an arrowhead", () => {
        // Cytoscape desktop paints slashes, arrows and double lines as filled bands, read with no one line width
        assert.strictEqual(lineCapSize(edge({ stroke: stroke("#0000ff", Number.NaN) })), 0.25);
        assert.strictEqual(lineCapSize(edge({ stroke: stroke("#0000ff", 2) })), 2.45);
    });

    it("runs a line on to its flat head's reach along the line, not to one of the head's corners", () => {
        // a tee: a bar across the line's end, whose farthest points are its two outer corners
        const prims = drawn(
            [
                [120, 100],
                [276, 100],
            ],
            [
                [276, 85],
                [280, 85],
                [280, 115],
                [276, 115],
                [276, 85],
            ],
        );
        const o = associate(prims, 600, 400, scene("graphty", [edge({ arrows: [arrow({ shape: "tee" })] })])).scene;
        assert.deepEqual(
            o.edges.map((e) => e.points.map(([x, y]) => [Math.round(x), Math.round(y)])),
            [
                [
                    [120, 100],
                    [276, 100],
                    [280, 100],
                ],
            ],
        );
    });
});

describe("edges whose ends the two sides name differently", () => {
    // graphty draws "x" on "b" (another line's station at the same place, which the oracle's reader names "b")
    const stacked = (over: Partial<PEdge> = {}): PScene =>
        scene(
            "graphty",
            [edge({ target: "x", ...over })],
            [...NODES.map(([id, x, y]) => node(id, x, y)), node("x", 301, 100)],
        );

    it("are paired by where graphty draws them, and judged (json-cyjs-tokyo's stacked stations)", () => {
        const o = scene("oracle", [edge()]);
        const r = compareOracle("t", o, stacked());
        assert.strictEqual(r.properties["edge.present"].passRate, 1);
        assert.strictEqual(r.properties["edge.extra"].passRate, 1);
        // the pair is judged: a line three times as wide fails its width
        const wide = compareOracle("t", o, stacked({ stroke: stroke("#0000ff", 6) }));
        assert.strictEqual(wide.properties["edge.width"].passRate, 0);
        // drawn the other way round, it is the same edge
        const back = compareOracle(
            "t",
            o,
            stacked({
                source: "x",
                target: "a",
                points: [
                    [280, 100],
                    [120, 100],
                ],
            }),
        );
        assert.strictEqual(back.properties["edge.present"].passRate, 1);
        assert.strictEqual(back.properties["edge.route"].passRate, 1);
    });

    it("are paired by the nodes their files name first, where two stack on one node (gexf-cns-wos n5, n100 on n109)", () => {
        // both sides see two edges a - b; the files name their sources x and y, drawn under a
        const own = (id: string, from: string, width: number): PEdge =>
            edge({ id, ownEnds: { source: from, target: "b" }, stroke: stroke("#0000ff", width) });
        const o = scene("oracle", [own("e1", "x", 2), own("e2", "y", 6)]);
        const g = scene("graphty", [own("e1", "y", 6), own("e2", "x", 2)]);
        const r = compareOracle("t", o, g);
        assert.strictEqual(r.properties["edge.present"].passRate, 1);
        assert.strictEqual(r.properties["edge.width"].passRate, 1);
    });

    it("stay apart where graphty's end is at another node", () => {
        // an edge drawn to the wrong node is missing and extra, never paired by its route
        const o = scene("oracle", [edge()]);
        const g = scene("graphty", [
            edge({
                target: "e",
                points: [
                    [120, 100],
                    [300, 280],
                ],
            }),
        ]);
        assert.includeMembers(failing(o, g), ["edge.present", "edge.extra"]);
    });
});

describe("parallel edges found by geometry", () => {
    // Two edges between one pair drawn over one another: only their looks tell which is which (cx2-signor-aml 26->27)
    const solidBox = edge({ arrows: [arrow({ shape: "box" })] });
    const dashed = edge({ stroke: stroke("#0000ff", 2, { dashClass: "dashed" }) });
    const g = (e: PEdge, id: string): PEdge => ({ ...structuredClone(e), id });
    const o = (e: PEdge, k: number): PEdge => ({ ...structuredClone(e), id: `a->b#g${String(k)}` });

    it("pairs each with the edge drawn like it, its line and its arrowheads, whatever order graphty lists them in", () => {
        const oracle = scene("oracle", [o(dashed, 0), o(solidBox, 1)]);
        assert.deepEqual(failing(oracle, scene("graphty", [g(solidBox, "x"), g(dashed, "y")])), []);
        assert.deepEqual(failing(oracle, scene("graphty", [g(dashed, "y"), g(solidBox, "x")])), []);
    });

    it("never gives an edge's exact twin to an edge it only half matches", () => {
        // the oracle's first edge is solid with no arrowhead, which neither of graphty's is; its second is solid with a
        // box: paired one at a time, the first took that twin (only its arrowhead differs) and left the second the
        // dashed line
        const plain = edge();
        const report = compareOracle(
            "t",
            scene("oracle", [o(plain, 0), o(solidBox, 1)]),
            scene("graphty", [g(solidBox, "x"), g(dashed, "y")]),
        );
        assert.deepEqual(
            report.elements.filter((e) => e.id.startsWith("a->b#g1")),
            [],
        );
    });
});
