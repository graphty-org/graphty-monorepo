/**
 * The oracle association's ends of lines drawn in pieces (Cytoscape desktop's zigzag, sine wave, slashes, double and
 * arrows lines, exported as filled bands). Such a line stops up to a piece of its pattern short of its arrowhead's base,
 * so its end can lie farther from its node than any end reach, or nearer a neighbor's box than its own node: the
 * arrowheads the program draws right after the line carry it on to its node (cys-syn-mappings 192->204, 426->441). Left
 * unpaired, the band was taken for a neighbor's arrowhead (186->198's target cap read as half, 346 px long). And a band
 * is a line, never an arrowhead an end reaches its node through (420->426's open half circle, read through its own
 * double line to the far node, stood in for the edge). The arrowheads drawn with a line cap it, whatever neighbor's end
 * lies nearer them; and an end beyond a flat ellipse's tip is judged by how far it lies along the ray from its center
 * (xgmml-syn-mappings 345->360, 35 px off read as 19).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
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
/** The outline of a horizontal polyline y(x) from x0 to x1 stroked `w` wide (its two sides, one back). */
function stroked(x0: number, x1: number, y: (x: number) => number, w: number): Pt[] {
    const n = Math.round(x1 - x0) * 2 + 1;
    const line = Array.from({ length: n }, (_, i): Pt => [
        x0 + ((x1 - x0) * i) / (n - 1),
        y(x0 + ((x1 - x0) * i) / (n - 1)),
    ]);
    const side = (sign: number): Pt[] =>
        line.map((p, i) => {
            const [a, b] = [line[Math.max(0, i - 1)], line[Math.min(line.length - 1, i + 1)]];
            const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            return [p[0] - (sign * w * (b[1] - a[1])) / (2 * L), p[1] + (sign * w * (b[0] - a[0])) / (2 * L)];
        });
    return evenly([...side(1), ...side(-1).reverse()]);
}
/** A zigzag about y, a tooth every 10 px, 8 px either side. */
const zigzag =
    (y: number) =>
    (x: number): number =>
        y + (Math.floor(x / 10) % 2 === 0 ? (x % 10) - 5 : 5 - (x % 10)) * 1.6;

const gray = { color: "#cccccc", opacity: 1, gradient: null };
const ink = (color: string): Prim["stroke"] => ({ color, opacity: 1, width: 1, dash: null, dashClass: "solid" });
const node = (id: string, cx: number, cy: number, r: number): PNode => ({
    id,
    cx,
    cy,
    w: 2 * r,
    h: 2 * r,
    shape: "ellipse",
    fill: gray,
    stroke: null,
    label: null,
});
const edge = (id: string, source: string, target: string, dashClass: "solid" | "zigzag" | "double"): PEdge => ({
    id,
    source,
    target,
    points: [],
    stroke: { color: "#404040", opacity: 1, width: 2, dash: null, dashClass },
    arrows: [],
    label: null,
});

/** The primitives of one drawing, indexed in the order they are added (the order the program drew them in). */
function drawing(): { prims: Prim[]; add: (over: Partial<Prim> & { points: Pt[] }) => Prim } {
    const prims: Prim[] = [];
    const add = (over: Partial<Prim> & { points: Pt[] }): Prim => {
        const p: Prim = {
            index: prims.length,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.subpaths?.flat() ?? over.points),
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
    return { prims, add };
}
const guideOf = (nodes: PNode[], edges: PEdge[]): PScene => ({
    side: "graphty",
    width: 800,
    height: 400,
    background: "#ffffff",
    nodes,
    edges,
    groups: [],
    texts: [],
    strays: [],
});
/** A band drawn as a fill: its subpaths, its points all of them. */
const band = (color: string, subpaths: Pt[][]): Partial<Prim> & { points: Pt[] } => ({
    points: subpaths.flat(),
    subpaths,
    fill: { color, opacity: 1, gradient: null },
    stroke: null,
});
const pairs = (s: PScene): string[] => s.edges.map((e) => `${e.source}->${e.target}`).sort();

describe("ends of lines drawn in pieces", () => {
    it("carries a zigzag stopped short of its arrowhead on to its node, never into a neighbor's cap", () => {
        const { prims, add } = drawing();
        const spots: [string, number, number, number][] = [
            ["a", 300, 100, 10],
            ["b", 620, 100, 10],
            ["c", 80, 70, 10],
            ["d", 470, 70, 10],
        ];
        spots.forEach(([, x, y, r]) => add({ tag: "ellipse", points: disc(x, y, r) }));
        // c->d, a plain line whose target end lies beside the middle of the zigzag below it
        add({
            kind: "path",
            closed: false,
            points: [
                [90, 70],
                [460, 70],
            ],
            fill: null,
            stroke: ink("#404040"),
        });
        // a->b, a zigzag stopping 3 px short of its hollow arrowhead, 25 px short of b; the arrowhead runs on to b
        add(band("#4b6489", [stroked(312, 585, zigzag(100), 2)]));
        add({
            points: evenly([
                [588, 92],
                [610, 100],
                [588, 108],
            ]),
            fill: null,
            stroke: ink("#9e3632"),
        });
        const guide = guideOf(
            spots.map(([id, x, y, r]) => node(id, x, y, r)),
            [edge("e1", "a", "b", "zigzag"), edge("e2", "c", "d", "solid")],
        );
        const o = associate(prims, 800, 400, guide).scene;
        assert.deepEqual(pairs(o), ["a->b", "c->d"]);
        const zig = o.edges.find((e) => e.source === "a");
        assert.strictEqual(zig?.stroke?.dashClass, "zigzag");
        assert.deepEqual(
            zig?.arrows.map((x) => [x.end, x.color]),
            [["target", "#9e3632"]],
        );
        assert.deepEqual(o.edges.find((e) => e.source === "c")?.arrows, []);
    });

    it("gives an end nearer a neighbor's box than its own node to the node its arrowhead reaches", () => {
        const { prims, add } = drawing();
        // e sits 13 px below and beside the zigzag's end, inside any end's reach; the arrowhead runs on to b
        const spots: [string, number, number, number][] = [
            ["a", 300, 100, 10],
            ["b", 620, 100, 10],
            ["e", 597, 120, 6],
        ];
        spots.forEach(([, x, y, r]) => add({ tag: "ellipse", points: disc(x, y, r) }));
        add(band("#4f678b", [stroked(312, 585, zigzag(100), 2)]));
        add({
            points: evenly([
                [588, 92],
                [610, 100],
                [588, 108],
            ]),
            fill: { color: "#a13934", opacity: 1, gradient: null },
        });
        const guide = guideOf(
            spots.map(([id, x, y, r]) => node(id, x, y, r)),
            [edge("e1", "a", "b", "zigzag")],
        );
        assert.deepEqual(pairs(associate(prims, 800, 400, guide).scene), ["a->b"]);
    });

    it("never reads an open cap's stroke through its own double line to the far node", () => {
        const { prims, add } = drawing();
        const spots: [string, number, number, number][] = [
            ["f", 100, 300, 10],
            ["g", 400, 300, 10],
        ];
        spots.forEach(([, x, y, r]) => add({ tag: "ellipse", points: disc(x, y, r) }));
        // a double line stopping 10 px short of g, and an open half circle at its end bulging toward g
        add(band("#6d7f99", [stroked(112, 380, () => 297, 1.5), stroked(112, 380, () => 303, 1.5)]));
        add({
            kind: "path",
            closed: false,
            points: Array.from({ length: 17 }, (_, i): Pt => {
                const t = -Math.PI / 2 + (i * Math.PI) / 16;
                return [380 + 5 * Math.cos(t), 300 + 5 * Math.sin(t)];
            }),
            fill: null,
            stroke: ink("#ba5246"),
        });
        const guide = guideOf(
            spots.map(([id, x, y, r]) => node(id, x, y, r)),
            [edge("e1", "f", "g", "double")],
        );
        const o = associate(prims, 800, 400, guide).scene;
        assert.deepEqual(pairs(o), ["f->g"]);
        assert.strictEqual(o.edges[0]?.stroke?.dashClass, "double");
    });

    it("judges an end beyond a flat ellipse's end by its distance along the ray, not its short axis", () => {
        const { prims, add } = drawing();
        const ellipse = (cx: number, cy: number, rx: number, ry: number): Pt[] =>
            Array.from({ length: 32 }, (_, i): Pt => [
                cx + rx * Math.cos((i * Math.PI) / 16),
                cy + ry * Math.sin((i * Math.PI) / 16),
            ]);
        // x, a flat ellipse whose long side an end beyond its tip lies 35 px from; y, the node the end's arrowhead
        // points at, its tip 20 px short of y's box (xgmml-syn-mappings 345->360)
        add({ tag: "ellipse", points: ellipse(638, 498, 19, 7.5) });
        add({
            corners: 4,
            points: evenly([
                [724.5, 496.5],
                [775.5, 496.5],
                [775.5, 517.5],
                [724.5, 517.5],
            ]),
        });
        add({ tag: "ellipse", points: disc(58, 590, 14) });
        add({
            kind: "path",
            closed: false,
            points: [
                [691, 514],
                [72, 588],
            ],
            fill: null,
            stroke: ink("#153a71"),
        });
        add({
            points: evenly([
                [691, 509],
                [705, 514],
                [691, 519],
            ]),
            fill: { color: "#ff7f00", opacity: 1, gradient: null },
        });
        // x's own line to z, drawn after
        add({
            kind: "path",
            closed: false,
            points: [
                [619, 498],
                [72, 592],
            ],
            fill: null,
            stroke: ink("#b9babb"),
        });
        const flat: PNode = { ...node("x", 638, 498, 19), h: 15 };
        const rect: PNode = { ...node("y", 750, 507, 25.5), h: 21, shape: "rect" };
        const guide = guideOf(
            [flat, rect, node("z", 58, 590, 14)],
            [edge("e1", "y", "z", "solid"), edge("e2", "x", "z", "solid")],
        );
        assert.deepEqual(pairs(associate(prims, 800, 400, guide).scene), ["x->z", "y->z"]);
    });

    it("caps a line's end with the arrowhead drawn with it, though a neighbor's end lies nearer that arrowhead", () => {
        const { prims, add } = drawing();
        const spots: [string, number, number, number][] = [
            ["a", 100, 100, 10],
            ["b", 400, 100, 10],
            ["c", 388, 30, 10],
        ];
        spots.forEach(([, x, y, r]) => add({ tag: "ellipse", points: disc(x, y, r) }));
        // a->b, a zigzag stopping 24 px short of b and 3 px short of its arrowhead; c->b ends on b's outline by the
        // arrowhead's tip, nearer its middle than a->b's end
        add(band("#4b6489", [stroked(112, 366, zigzag(100), 2)]));
        add({
            points: evenly([
                [369, 92],
                [390, 100],
                [369, 108],
            ]),
            fill: { color: "#9e3632", opacity: 1, gradient: null },
        });
        add({
            kind: "path",
            closed: false,
            points: [
                [388, 40],
                [388, 99],
            ],
            fill: null,
            stroke: ink("#404040"),
        });
        const guide = guideOf(
            spots.map(([id, x, y, r]) => node(id, x, y, r)),
            [edge("e1", "a", "b", "zigzag"), edge("e2", "c", "b", "solid")],
        );
        const o = associate(prims, 800, 400, guide).scene;
        assert.deepEqual(pairs(o), ["a->b", "c->b"]);
        assert.deepEqual(
            o.edges.find((e) => e.source === "a")?.arrows.map((x) => [x.end, x.color]),
            [["target", "#9e3632"]],
        );
        assert.deepEqual(o.edges.find((e) => e.source === "c")?.arrows, []);
    });

    it("reads a line its own arrowhead carries to a pair graphty does not draw as it was without the arrowhead", () => {
        const { prims, add } = drawing();
        // an arrow annotation from p down toward q, which no edge of the file joins (xgmml-wp4271-cy3-export)
        const spots: [string, number, number, number][] = [
            ["p", 300, 100, 3],
            ["q", 300, 125, 10],
            ["r", 100, 100, 10],
        ];
        spots.forEach(([, x, y, r]) => add({ tag: "ellipse", points: disc(x, y, r) }));
        add({
            kind: "path",
            closed: false,
            points: [
                [300, 90],
                [300, 108],
            ],
            fill: null,
            stroke: ink("#000000"),
        });
        add({
            points: evenly([
                [296, 108],
                [300, 116],
                [304, 108],
            ]),
            fill: { color: "#000000", opacity: 1, gradient: null },
        });
        const guide = guideOf(
            spots.map(([id, x, y, r]) => node(id, x, y, r)),
            [edge("e1", "r", "p", "solid")],
        );
        assert.notInclude(pairs(associate(prims, 800, 400, guide).scene), "p->q");
    });
});
