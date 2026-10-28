/**
 * The oracle's nodes drawn wholly under another are left out, as graphty's side leaves out the nodes its scene marks
 * hidden (`occluders` in extract-scene.ts).
 */
import { assert, describe, it } from "vitest";

import { withoutCovered } from "./associate";
import type { PNode, PScene } from "./primitives";

const node = (id: string, order: number, size: number, opacity = 1): PNode => ({
    id,
    cx: 100,
    cy: 100,
    w: size,
    h: size,
    shape: "ellipse",
    fill: { color: "#c8c8c8", opacity, gradient: null },
    stroke: { color: "#646464", opacity: 1, width: 1, dash: null, dashClass: "solid" },
    label: null,
    order,
});
const scene = (nodes: PNode[]): PScene => ({
    side: "oracle",
    width: 200,
    height: 200,
    background: null,
    nodes,
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("an oracle node drawn under another", () => {
    it("is left out when an opaque node drawn after it holds its whole box (gexf-cns-wos n5 under n4)", () => {
        const under = { ...node("n5", 1, 20), label: { content: "n5" } as PNode["label"] };
        const out = withoutCovered(scene([under, node("n4", 2, 20)]));
        assert.deepEqual(
            out.nodes.map((n) => n.id),
            ["n4"],
        );
        // its label is still drawn, a free text it owns
        assert.deepEqual(
            out.texts.map((t) => [t.content, t.owner]),
            [["n5", "n5"]],
        );
    });

    it("leaves out a stray shape drawn under an opaque node, as Gephi's arrowheads of swallowed edges", () => {
        const head = (index: number) => ({
            index,
            tag: "polyline",
            kind: "shape" as const,
            box: { x0: 98, y0: 98, x1: 101, y1: 101 },
            fill: "#bf7676",
            stroke: null,
            text: null,
        });
        const out = withoutCovered({ ...scene([node("n", 5, 20)]), strays: [head(1), head(9)] });
        // the one drawn before the node is under it; the one drawn after is seen
        assert.deepEqual(
            out.strays.map((s) => s.index),
            [9],
        );
        // one in the corner of a round node's box pokes out of its disc (gexf-graphology-rio ncs525's arrowhead)
        const corner = { ...head(1), box: { x0: 106, y0: 106, x1: 109, y1: 109 } };
        assert.lengthOf(withoutCovered({ ...scene([node("n", 5, 20)]), strays: [corner] }).strays, 1);
    });

    it("takes graphty's half pixel into the oracle's pixels by the ratio of the two drawings' node sizes", () => {
        // gexf-cns-wos n5 under n109, 0.63 oracle pixels off, drawn 1.36 oracle pixels to graphty's one
        const off = { ...node("n5", 1, 7.35), cx: 100.63 };
        const oracle = scene([off, node("n109", 2, 7.35)]);
        assert.lengthOf(withoutCovered(oracle).nodes, 2);
        const graphty = scene([node("n5", 0, 5.4), node("n109", 0, 5.4)]);
        assert.deepEqual(
            withoutCovered(oracle, graphty).nodes.map((n) => n.id),
            ["n109"],
        );
    });

    it("is kept when drawn in front, when the node over it is see-through, or when it pokes out", () => {
        assert.lengthOf(withoutCovered(scene([node("big", 1, 40), node("small", 2, 20)])).nodes, 2);
        assert.lengthOf(withoutCovered(scene([node("a", 1, 20), node("b", 2, 20, 0.4)])).nodes, 2);
        assert.lengthOf(withoutCovered(scene([node("a", 1, 30), node("b", 2, 20)])).nodes, 2);
    });
});
