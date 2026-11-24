/**
 * A head drawn before the nodes is no piece of a node drawn over it later: Cytoscape desktop draws every line and head
 * before any node, and on cx2-signor-aml 39 -> 38's head lay under the flat mir-143 box drawn over it, so it was read as
 * that box's drawing and left a stray beside a headless line.
 */
import { assert, describe, it } from "vitest";

import { arrowheadEdge } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type Pt } from "./primitives";

const INK = "#990066";
const node = (id: string, cx: number, cy: number, w: number, h: number, order: number): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "rect",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
    order,
});
// the line from s, stopped at its head's base; the head's tip on t's outline
const LINE: PEdge = {
    id: "s->t#g0",
    source: "s",
    target: "t",
    points: [
        [100, 300],
        [283, 300],
    ],
    stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
};
const HEAD_POINTS: Pt[] = [
    [283, 295.5],
    [300, 300],
    [283, 304.5],
    [283, 295.5],
];
const HEAD: Prim = {
    index: 5,
    tag: "path",
    kind: "shape",
    box: boxOfPoints(HEAD_POINTS),
    closed: true,
    corners: 3,
    points: HEAD_POINTS,
    fill: { color: INK, opacity: 1, gradient: null },
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
};

/**
 * The edge the head is read as capping.
 * @param flatOrder - when the flat box over the head is drawn
 * @returns the edge's id, or null where the head is read as the box's drawing
 */
function headOf(flatOrder: number): string | null {
    const nodes = [
        node("s", 80, 300, 40, 40, 10),
        node("t", 320, 300, 40, 40, 11),
        // a flat box over the head, its center inside the head's box
        node("flat", 292, 300, 50, 8, flatOrder),
    ];
    return arrowheadEdge(HEAD, [LINE], nodes)?.e.id ?? null;
}

describe("a head under a node drawn after other nodes", () => {
    it("is its line's when other nodes' bodies were drawn between it and the node over it", () => {
        assert.strictEqual(headOf(20), "s->t#g0");
    });

    it("stays the node's drawing when it is drawn next to that node", () => {
        assert.strictEqual(headOf(6), null);
    });
});
