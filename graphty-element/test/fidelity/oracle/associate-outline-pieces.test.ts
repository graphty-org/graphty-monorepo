/**
 * Pieces of a box's own drawing are no edges (#5387, draw.io's stand-in drawings): a swimlane container's body outline,
 * drawn from one corner of its header round to the other, was read as an edge between the container and a wide node
 * whose reach covered its far end (graphml-magiclantern-architecture), and a split box's top line as an edge to the node
 * below it (graphml-galaxy-lcms-workflow). And a line to a node the reader found no body for (draw.io draws yEd's
 * flowchart annotation as an open bracket) ends at that node, not at a container 235 px off
 * (graphml-synthetic-nodes generic-11 -> generic-12).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PGroup, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const INK = "#000000";
const PAPER = { color: "#ffffff", opacity: 1, gradient: null };
const LINE = { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
];
const node = (id: string, cx: number, cy: number, w: number, h: number): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "rect",
    fill: PAPER,
    stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
    label: null,
});
const edge = (id: string, source: string, target: string): PEdge => ({
    id,
    source,
    target,
    points: [],
    stroke: LINE,
    arrows: [],
    label: null,
});
/** Four nodes that fix the frame. */
const CORNERS = [
    node("a", 40, 40, 30, 20),
    node("b", 760, 40, 30, 20),
    node("c", 40, 560, 30, 20),
    node("d", 760, 560, 30, 20),
];

/**
 * The oracle's primitives, numbered in drawing order.
 * @returns a maker of primitives
 */
function drawing(): { box: (n: PNode) => Prim; shape: (pts: Pt[]) => Prim; line: (pts: Pt[]) => Prim } {
    let index = 0;
    const base = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 4,
        fill: PAPER,
        stroke: { ...LINE },
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    return {
        box: (n) => base({ points: rect(n.cx - n.w / 2, n.cy - n.h / 2, n.cx + n.w / 2, n.cy + n.h / 2) }),
        shape: (points) => base({ points }),
        line: (points) => base({ kind: "path", closed: false, corners: 0, fill: null, points }),
    };
}
const scene = (nodes: PNode[], edges: PEdge[], groups: PGroup[] = []): PScene => ({
    side: "graphty",
    width: 800,
    height: 600,
    background: "#ffffff",
    nodes,
    edges,
    groups,
    texts: [],
    strays: [],
});
const read = (o: PScene): string[] => o.edges.map((e) => `${e.source}->${e.target}`).sort();

describe("pieces of a box's own drawing", () => {
    it("reads a container's body outline under its header as no edge", () => {
        // a container round m1 and m2 (box 200-400 x 100-300, its header above it), and a wide node below whose reach
        // (half its width) covers the outline's ends
        const members = [node("m1", 260, 200, 40, 20), node("m2", 340, 200, 40, 20)];
        const wide = node("w", 300, 340, 480, 40);
        const nodes = [...CORNERS, ...members, wide];
        const d = drawing();
        const prims = [
            ...[...CORNERS, ...members, wide].map(d.box),
            d.shape(rect(200, 80, 400, 100)),
            d.line([
                [200, 100],
                [200, 300],
                [400, 300],
                [400, 100],
            ]),
            // the one edge: from the wide node's top to the container's bottom
            d.line([
                [300, 320],
                [300, 300],
            ]),
        ];
        const group: PGroup = {
            id: "box",
            box: { x0: 200, y0: 80, x1: 400, y1: 300 },
            fill: PAPER,
            stroke: LINE,
            label: null,
            members: ["m1", "m2"],
        };
        const o = associate(prims, 800, 600, scene(nodes, [edge("e1", "w", "box")], [group])).scene;
        assert.deepEqual(read(o), ["w->box"]);
    });

    it("reads a line along a box's top side as no edge", () => {
        // three split boxes in a row, 22 and 26 px apart, as graphml-galaxy-lcms-workflow's n0::n2, n0::n0, n0::n3
        const left = node("l", 170, 215.5, 113.5, 25);
        const mid = node("m", 296.1, 215.5, 94.6, 25);
        const right = node("r", 426, 215.5, 113.5, 25);
        const nodes = [...CORNERS, left, mid, right];
        const d = drawing();
        const prims = [
            ...nodes.map(d.box),
            // the middle box's top rule, from its top left corner
            d.line([
                [248.8, 203],
                [343.3, 203],
            ]),
            // l -> m, ending at that corner under its arrowhead, which a line's end touching it is carried through
            d.line([
                [226.8, 210],
                [241, 203],
            ]),
            d.shape([
                [248.8, 203],
                [241, 199],
                [241, 207],
                [248.8, 203],
            ]),
            d.line([
                [343.4, 215.5],
                [369.3, 215.5],
            ]),
        ];
        const o = associate(prims, 800, 600, scene(nodes, [edge("e1", "l", "m"), edge("e2", "m", "r")])).scene;
        assert.deepEqual(read(o), ["l->m", "m->r"]);
    });

    it("reads a line to a node drawn with no body as that node's", () => {
        // the annotation: an open bracket, no closed body; a container far below it
        const note = node("note", 250, 200, 60, 36);
        const target = node("t", 360, 200, 60, 36);
        const box = node("frame", 300, 450, 500, 100);
        const nodes = [...CORNERS, note, target, box];
        const d = drawing();
        const prims = [
            ...[...CORNERS, target, box].map(d.box),
            d.line([
                [280, 182],
                [220, 182],
                [220, 218],
                [280, 218],
            ]),
            d.line([
                [280, 200],
                [330, 200],
            ]),
        ];
        const o = associate(prims, 800, 600, scene(nodes, [edge("e1", "note", "t")])).scene;
        assert.deepEqual(read(o), ["note->t"]);
    });
});
