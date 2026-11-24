/**
 * The oracle's arrowheads drawn under a node painted after them are marked hidden, and a head is left out only where
 * it is hidden in both drawings.
 */
import { assert, describe, it } from "vitest";

import { markHiddenHeads, toHiddenTips, withoutHiddenInBoth } from "./hidden-heads";
import type { PArrow, PEdge, PNode, Prim, PScene } from "./primitives";

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

const hidden = (e: PEdge | undefined): (boolean | undefined)[] => (e?.arrows ?? []).map((a) => a.hidden);

describe("an oracle arrowhead under a node", () => {
    it("is marked hidden under a third node drawn after it (cx2-signor-aml 10 -> 90 under MECP2)", () => {
        const out = markHiddenHeads(scene([node("cover", 100, 5)], [edge("a", "b")]), [head(1)]);
        assert.deepEqual(hidden(out.edges[0]), [true]);
    });

    it("is marked hidden under two overlapping nodes that hide it together (pajek-iliad's stacks)", () => {
        const out = markHiddenHeads(scene([node("left", 84, 5), node("right", 116, 6)], [edge("a", "b")]), [head(1)]);
        assert.deepEqual(hidden(out.edges[0]), [true]);
    });

    it("names its end hidden where no head was read but a head-sized piece lies under a third node (113 -> 92)", () => {
        const unread = { ...edge("a", "b"), arrows: [] };
        const out = markHiddenHeads(scene([node("cover", 100, 5)], [unread]), [head(1)]);
        assert.deepEqual(out.edges[0]?.hiddenEnds, ["target"]);
        const shown = markHiddenHeads(scene([node("cover", 100, 0)], [unread]), [head(1)]);
        assert.isUndefined(shown.edges[0]?.hiddenEnds);
    });

    it("carries a line ending at a hidden head's back on to its tip where graphty hides its head too (23 -> 144)", () => {
        const unread: PEdge = {
            ...edge("a", "b"),
            points: [
                [0, 100],
                [96, 100],
            ],
            arrows: [],
        };
        const triangle: Prim = {
            ...head(1),
            points: [
                [96, 97],
                [100, 98.5],
                [104, 100],
                [100, 101.5],
                [96, 103],
                [96, 100],
                [96, 97],
            ],
        };
        const marked = markHiddenHeads(scene([node("cover", 100, 5)], [unread]), [triangle]).edges[0] ?? unread;
        assert.deepEqual(marked.hiddenEnds, ["target"]);
        const under: PArrow = {
            end: "target",
            length: 8,
            width: 6,
            filled: true,
            shape: "triangle",
            color: null,
            hidden: true,
        };
        const tip = toHiddenTips(marked, [under]).points.at(-1) ?? [0, 0];
        assert.approximately(tip[0], 104, 0.01);
        assert.approximately(tip[1], 100, 0.01);
        // graphty draws no head there, or shows it: the piece says nothing of where the line ends (json-cyjs-perf
        // n109 -> n571), and the line is judged as drawn
        assert.deepEqual(toHiddenTips(marked, []).points, unread.points);
        assert.deepEqual(toHiddenTips(marked, [{ ...under, hidden: false }]).points, unread.points);
    });

    it("is not marked when the node is drawn before it, or is its own end", () => {
        const before = markHiddenHeads(scene([node("cover", 100, 0)], [edge("a", "b")]), [head(1)]);
        assert.deepEqual(hidden(before.edges[0]), [undefined]);
        const own = markHiddenHeads(scene([node("b", 100, 5)], [edge("a", "b")]), [head(1)]);
        assert.deepEqual(hidden(own.edges[0]), [undefined]);
    });
});

describe("a paired edge's arrowheads", () => {
    const arrow = (end: PArrow["end"], isHidden: boolean): PArrow => ({
        end,
        length: 8,
        width: 6,
        filled: true,
        shape: "triangle",
        color: "#990066",
        ...(isHidden ? { hidden: true } : {}),
    });
    const lengths = (pair: [PArrow[], PArrow[]]): number[] => pair.map((list) => list.length);

    it("leave out a head hidden in both drawings, from both sides together", () => {
        const [oracle, graphty] = withoutHiddenInBoth({ arrows: [arrow("target", true), arrow("source", false)] }, [
            arrow("target", true),
            arrow("source", false),
        ]);
        assert.deepEqual(
            oracle.map((a) => a.end),
            ["source"],
        );
        assert.deepEqual(
            graphty.map((a) => a.end),
            ["source"],
        );
    });

    it("leave out graphty's hidden head where the oracle's head there was hidden and never read", () => {
        assert.deepEqual(
            lengths(withoutHiddenInBoth({ arrows: [], hiddenEnds: ["target"] }, [arrow("target", true)])),
            [0, 0],
        );
    });

    it("keep a head hidden in one drawing only, on both sides (gexf-sigma-ediaspora's smaller nodes)", () => {
        assert.deepEqual(
            lengths(withoutHiddenInBoth({ arrows: [arrow("target", true)] }, [arrow("target", false)])),
            [1, 1],
        );
        assert.deepEqual(
            lengths(withoutHiddenInBoth({ arrows: [arrow("target", false)] }, [arrow("target", true)])),
            [1, 1],
        );
        assert.deepEqual(
            lengths(withoutHiddenInBoth({ arrows: [], hiddenEnds: ["target"] }, [arrow("target", false)])),
            [0, 1],
        );
    });

    it("keep a hidden head the other side does not draw at all", () => {
        assert.deepEqual(lengths(withoutHiddenInBoth({ arrows: [arrow("target", true)] }, [])), [1, 0]);
        assert.deepEqual(lengths(withoutHiddenInBoth({ arrows: [] }, [arrow("target", true)])), [0, 1]);
    });
});
