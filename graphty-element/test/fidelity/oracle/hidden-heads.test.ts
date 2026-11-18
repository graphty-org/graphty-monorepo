/**
 * The oracle's arrowheads drawn under a node painted after them are left out, as graphty's side leaves out a head
 * under a node it draws over its edges.
 */
import { assert, describe, it } from "vitest";

import { withoutHiddenHeads } from "./hidden-heads";
import type { PEdge, PNode, Prim, PScene } from "./primitives";

const node = (id: string, cx: number, order: number): PNode => ({
    id,
    cx,
    cy: 100,
    w: 40,
    h: 24,
    shape: "ellipse",
    fill: { color: "#94effd", opacity: 1, gradient: null },
    stroke: null,
    label: null,
    order,
});
const edge = (source: string, target: string): PEdge => ({
    id: `${source}->${target}`,
    source,
    target,
    points: [
        [0, 100],
        [100, 100],
    ],
    stroke: null,
    arrows: [{ end: "target", length: 8, width: 6, filled: true, shape: "triangle", color: "#990066", at: [100, 100] }],
    label: null,
});
const head = (index: number): Prim => ({
    index,
    tag: "path",
    kind: "path",
    box: { x0: 96, y0: 97, x1: 104, y1: 103 },
    points: [],
    closed: true,
    corners: 3,
    fill: { color: "#990066", opacity: 1, gradient: null },
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
});
const scene = (nodes: PNode[], edges: PEdge[]): PScene => ({
    side: "oracle",
    width: 200,
    height: 200,
    background: null,
    nodes,
    edges,
    groups: [],
    texts: [],
    strays: [],
});

describe("an oracle arrowhead under a node", () => {
    it("is left out under a third node drawn after it (cx2-signor-aml 10 -> 90 under MECP2)", () => {
        const out = withoutHiddenHeads(scene([node("cover", 100, 5)], [edge("a", "b")]), [head(1)]);
        assert.deepEqual(out.edges[0]?.arrows, []);
    });

    it("is left out under two overlapping nodes that hide it together (pajek-iliad's stacks)", () => {
        const out = withoutHiddenHeads(scene([node("left", 84, 5), node("right", 116, 6)], [edge("a", "b")]), [
            head(1),
        ]);
        assert.deepEqual(out.edges[0]?.arrows, []);
    });

    it("stays when the node is drawn before it, or is its own end", () => {
        const before = withoutHiddenHeads(scene([node("cover", 100, 0)], [edge("a", "b")]), [head(1)]);
        assert.lengthOf(before.edges[0]?.arrows ?? [], 1);
        const own = withoutHiddenHeads(scene([node("b", 100, 5)], [edge("a", "b")]), [head(1)]);
        assert.lengthOf(own.edges[0]?.arrows ?? [], 1);
    });
});
