/**
 * What a program draws wholly under a shape it draws later is not seen (#5196): json-cyjs-perf draws its 500 nodes one
 * over another, and graphty hides the ones it draws under another, but the oracle's hidden discs were read as circle
 * arrowheads of the lines ending there and as strays. And a disc filled in a node's own paint drawn over it, a fifth
 * wider, is another node, not the node's outline (n571 over n570: n570 read 54 px wide, its lines another node's).
 */
import { assert, describe, it } from "vitest";

import { associate, hiddenShapes } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const GREY = { color: "#999999", opacity: 1, gradient: null };
const LINE = { color: "#999999", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 48 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 24),
        cy + r * Math.sin((i * Math.PI) / 24),
    ]);
const node = (id: string, cx: number, cy: number, size: number): PNode => ({
    id,
    cx,
    cy,
    w: size,
    h: size,
    shape: "ellipse",
    fill: GREY,
    stroke: null,
    label: null,
});

/**
 * The oracle's primitives, numbered in drawing order.
 * @returns a maker of discs and lines
 */
function drawing(): { disc: (x: number, y: number, r: number) => Prim; line: (pts: Pt[]) => Prim } {
    let index = 0;
    const base = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 0,
        fill: GREY,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    return {
        disc: (x, y, r) => base({ points: disc(x, y, r) }),
        line: (points) => base({ kind: "path", closed: false, fill: null, stroke: LINE, points }),
    };
}
const CORNERS = [node("a", 40, 40, 20), node("b", 560, 40, 20), node("c", 40, 460, 20), node("d", 560, 460, 20)];
const scene = (nodes: PNode[], edges: PScene["edges"] = []): PScene => ({
    side: "graphty",
    width: 600,
    height: 500,
    background: "#ffffff",
    nodes,
    edges,
    groups: [],
    texts: [],
    strays: [],
});

describe("shapes drawn under others", () => {
    it("reads a disc under a node drawn over it as neither the arrowhead of a line ending there nor a stray", () => {
        const d = drawing();
        const nodes = [...CORNERS, node("l", 100, 200, 40), node("m", 300, 200, 80)];
        const prims = [
            // the lines first, as Cytoscape.js draws them
            d.line([
                [120, 200],
                [260, 200],
            ]),
            ...CORNERS.map((n) => d.disc(n.cx, n.cy, n.w / 2)),
            d.disc(100, 200, 20),
            // a node graphty hides: a 12 px disc wholly under m, by the line's end; and a 30 px one off m's middle
            d.disc(270, 200, 6),
            d.disc(300, 224, 15),
            d.disc(300, 200, 40),
        ];
        const guide = scene(nodes, [
            {
                id: "e",
                source: "l",
                target: "m",
                points: [],
                stroke: LINE,
                arrows: [],
                label: null,
            },
        ]);
        const o = associate(prims, 600, 500, guide).scene;
        assert.deepEqual(
            o.edges.map((e) => [`${e.source}->${e.target}`, e.arrows.length]),
            [["l->m", 0]],
        );
        assert.deepEqual(o.strays, []);
    });

    it("reads a wider disc in a node's own paint drawn over it as no outline of the node", () => {
        const d = drawing();
        const nodes = [...CORNERS, node("n", 200, 300, 44)];
        const prims = [...CORNERS.map((n) => d.disc(n.cx, n.cy, n.w / 2)), d.disc(200, 300, 22), d.disc(204, 304, 27)];
        const o = associate(prims, 600, 500, scene(nodes)).scene;
        const n = o.nodes.find((m) => m.id === "n");
        assert.approximately(n?.w ?? 0, 44, 0.5);
        assert.approximately(n?.cx ?? 0, 200, 0.5);
    });

    it("keeps an arrowhead drawn right after its line, a border drawn under its fill, and a disc drawn on top", () => {
        const d = drawing();
        const line = d.line([
            [100, 100],
            [262, 100],
        ]);
        const head = d.disc(266, 100, 4);
        const border = { ...d.disc(100, 300, 30), fill: null, stroke: { ...LINE, width: 2 } };
        const fill = d.disc(100, 300, 30);
        const node = d.disc(280, 100, 30);
        const over = d.disc(285, 100, 8);
        assert.deepEqual(hiddenShapes([line, head, border, fill, node, over], [head, border, over]), []);
    });
});
