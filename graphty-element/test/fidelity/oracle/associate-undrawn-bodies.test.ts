/**
 * A node the markup names but draws no body for is placed where its lines meet, not at its label: Pajek draws an
 * `empty` vertex as its label alone, set off from the vertex, and runs every line to the vertex's center
 * (pajek-lin-rel4 v228, pajek-synth-vertices `empty 6`). Placed at its label, its lines were judged in another chord's
 * frame than graphty's (edge.route) and the node itself off its place (node.position).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type Prim, type PScene, type Pt, type PText } from "./primitives";

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
const text = (content: string, x0: number, y0: number): PText => ({
    content,
    x: x0,
    y: y0 + 5,
    box: { x0, y0, x1: x0 + 20, y1: y0 + 10 },
    sizePx: 10,
    family: "Arial",
    weight: 400,
    style: "normal",
    anchor: "start",
    rotation: 0,
    color: "#000000",
    opacity: 1,
});
const square = (id: string, x: number, y: number): Prim =>
    prim({
        points: [
            [x - 10, y - 10],
            [x + 10, y - 10],
            [x + 10, y + 10],
            [x - 10, y + 10],
        ],
        corners: 4,
        hint: { role: "node", id, key: id },
    });
const line = (id: string, points: Pt[]): Prim =>
    prim({
        kind: "path",
        closed: false,
        points,
        fill: null,
        stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
        hint: { role: "edge", id, key: id },
    });
const labelOnly = (id: string, x0: number, y0: number): Prim =>
    prim({
        kind: "text",
        closed: false,
        points: [
            [x0, y0],
            [x0 + 20, y0 + 10],
        ],
        fill: null,
        text: text(id, x0, y0),
        hint: { role: "node", id, key: id },
    });
const guide: PScene = {
    side: "graphty",
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: [],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
};

describe("nodes the markup names and draws no body for", () => {
    it("is placed where its lines meet, of no size, where two or more meet at one point", () => {
        // e's label starts 5 px right and 18 px below where both its lines end, at (200, 200)
        const prims = [
            square("a", 100, 200),
            square("b", 300, 200),
            labelOnly("e", 205, 218),
            line("a->e", [
                [110, 200],
                [200, 200],
            ]),
            line("e->b", [
                [200, 200],
                [290, 200],
            ]),
        ];
        const e = associate(prims, 600, 400, guide).scene.nodes.find((n) => n.id === "e");
        assert.deepInclude(e, { cx: 200, cy: 200, w: 0, h: 0 });
    });

    it("stays at its label where its lines end apart, round its label's box (Graphviz's plaintext)", () => {
        const prims = [
            square("a", 100, 200),
            square("b", 300, 200),
            labelOnly("p", 190, 195),
            line("a->p", [
                [110, 200],
                [190, 200],
            ]),
            line("p->b", [
                [210, 200],
                [290, 200],
            ]),
        ];
        const p = associate(prims, 600, 400, guide).scene.nodes.find((n) => n.id === "p");
        assert.deepInclude(p, { cx: 200, cy: 200, w: 20, h: 10 });
    });
});
