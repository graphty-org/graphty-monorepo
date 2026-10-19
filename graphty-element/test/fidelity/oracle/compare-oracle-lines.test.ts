/**
 * The oracle comparison's line, route, gradient and arrowhead checks on tiny hand-made pairs of drawings: each pair
 * differs in one property a reader sees (a line a sixth wider, dashes against dots, a zigzag drawn straight, an arc
 * against a sine wave, a gradient's colors or direction, a hollow arrowhead against a filled one) and fails exactly
 * that property, which the comparator before these checks passed.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
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
        // a crow's foot: tines spreading towards the node
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
            "crow",
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

    it("reads an arrowhead filled in the canvas's own color as hollow, and gives it its outline's color", () => {
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
            prim({
                tag: "polygon",
                points: [
                    [270, 96],
                    [280, 100],
                    [270, 104],
                    [270, 96],
                ],
                fill: fill("#ffffff"),
                stroke: stroke("#ff0000", 1),
            }),
        ];
        const o = associate(prims, 600, 400, scene("graphty", [edge({ arrows: [arrow()] })])).scene;
        const head = o.edges[0]?.arrows[0];
        assert.isFalse(head?.filled);
        assert.strictEqual(head?.color, "#ff0000");
        assert.strictEqual(head?.shape, "triangle");
    });
});
