/**
 * The oracle comparison's routes at nodes that cut a line badly: two nodes drawn over one another, a node one side
 * draws no body for, and a node the oracle draws nothing of at all. Each pair is drawn alike, and the comparator before
 * these checks failed it (pajek-synth-vertices 32->41, pajek-lin-rel4 41->229, pajek-1crn 27->28).
 */
import { assert, describe, it } from "vitest";

import { clipToNodes, compareOracle, type OracleProperty } from "./compare-oracle";
import type { PEdge, PNode, PScene, Pt } from "./primitives";

const node = (id: string, cx: number, cy: number, over: Partial<PNode> = {}): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
    ...over,
});
/** Six nodes on a grid, which fix the frame. */
const GRID = [
    node("a", 100, 100),
    node("b", 300, 100),
    node("c", 500, 100),
    node("d", 100, 300),
    node("e", 300, 300),
    node("f", 500, 300),
];
const edge = (source: string, target: string, points: Pt[]): PEdge => ({
    id: `${source}->${target}`,
    source,
    target,
    points,
    stroke: { color: "#0000ff", opacity: 1, width: 2, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});
const scene = (side: PScene["side"], nodes: PNode[], edges: PEdge[]): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: [...GRID, ...nodes],
    edges,
    groups: [],
    texts: [],
    strays: [],
});
const passRate = (o: PScene, g: PScene, property: OracleProperty): number | null =>
    compareOracle("t", o, g).properties[property].passRate;

describe("routes at nodes that cut a line badly", () => {
    it("keeps a line wholly under two overlapping nodes as drawn, not the sliver between their outlines", () => {
        // a tall node over a wide one, the line between their centers under both
        const [p, q] = [node("p", 300, 100, { w: 60, h: 160 }), node("q", 300, 160, { w: 160, h: 60 })];
        const line: Pt[] = [
            [300, 100],
            [300, 160],
        ];
        assert.deepEqual(clipToNodes(line, p, q), line);
        // one side draws the wide node a little taller: the slivers differ, the lines do not
        const o = scene(
            "oracle",
            [
                { ...p, cx: 300, cy: 200 },
                { ...q, cx: 300, cy: 260 },
            ],
            [
                edge("p", "q", [
                    [300, 200],
                    [300, 260],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [
                { ...p, cx: 300, cy: 200 },
                { ...q, cx: 300, cy: 260, h: 70 },
            ],
            [
                edge("p", "q", [
                    [300, 200],
                    [300, 260],
                ]),
            ],
        );
        assert.strictEqual(passRate(o, g, "edge.route"), 1);
    });

    it("cuts a line at neither side's node where one side draws no body for it", () => {
        // the oracle finds the bodiless node only by its 3 x 1 label; graphty's faceless node is 40 across
        const o = scene(
            "oracle",
            [node("q", 300, 200, { w: 3, h: 1, shape: null, fill: null })],
            [
                edge("a", "q", [
                    [100, 100],
                    [300, 200],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [node("q", 300, 200, { shape: "other", fill: null, faceless: [] })],
            [
                edge("a", "q", [
                    [100, 100],
                    [300, 200],
                ]),
            ],
        );
        assert.strictEqual(passRate(o, g, "edge.route"), 1);
    });

    it("pairs an edge at a node the oracle draws nothing of, its end named after graphty's node", () => {
        // the oracle's association names the end after graphty's node it found no body for (drawn under another)
        const o = scene(
            "oracle",
            [],
            [
                edge("a", "q", [
                    [100, 100],
                    [300, 200],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [node("q", 300, 200)],
            [
                edge("a", "q", [
                    [100, 100],
                    [300, 200],
                ]),
            ],
        );
        assert.strictEqual(passRate(o, g, "edge.present"), 1);
        assert.strictEqual(passRate(o, g, "edge.extra"), 1);
    });
});
