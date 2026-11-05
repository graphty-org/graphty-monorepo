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

    it("judges a line between nodes wider than the room between them by its whole route", () => {
        // two figures 50 across, 55 apart: 5 px of the oracle's line shows between them, 9 px of graphty's between its
        // figures drawn 46 across, both lines center to center (pajek-synth-vertices 41 -> 42)
        const pair = (side: PScene["side"], size: number, points: Pt[]): PScene =>
            scene(
                side,
                [node("p", 300, 200, { w: size, h: size }), node("q", 355, 200, { w: size, h: size })],
                [edge("p", "q", points)],
            );
        const o = pair("oracle", 50, [
            [300, 200],
            [355, 200],
        ]);
        const straight = pair("graphty", 46, [
            [300, 200],
            [355, 200],
        ]);
        assert.strictEqual(passRate(o, straight, "edge.route"), 1);
        // a line that bends out between them still fails
        const bent = pair("graphty", 46, [
            [300, 200],
            [327, 230],
            [355, 200],
        ]);
        assert.strictEqual(passRate(o, bent, "edge.route"), 0);
        // a route one side starts or ends off its node's center (an arc to its arrowhead's back) keeps its sliver
        // (pajek-synth-lines: each arc's line ends 3 px short of where graphty's does, under the arrowhead)
        const short = pair("oracle", 40, [
            [303, 200],
            [352, 200],
        ]);
        const whole = pair("graphty", 40, [
            [300, 200],
            [355, 200],
        ]);
        assert.strictEqual(passRate(short, whole, "edge.route"), 1);
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

describe("a route that crosses its end node to a corner (Graphviz's headport=ne)", () => {
    const s = node("s", 100, 100, { w: 24, h: 24, shape: "rect" });
    const t = node("t", 200, 100, { w: 24, h: 24, shape: "rect" });
    // from s's right side across t to its top right corner, at x 212, y 88
    const across = (end: Pt, after: Pt[] = []): Pt[] => [[112, 98.8], [180, 90.6], [205, 88.8], end, ...after];

    it("is cut where it enters the node whether its end rounds a hair inside the corner or a hair outside", () => {
        const inside = clipToNodes(across([211.6, 88.4]), s, t);
        const outside = clipToNodes(across([212.4, 87.6]), s, t);

        assert.closeTo(inside.at(-1)?.[0] ?? 0, 188, 0.5, "where the line enters t's left side");
        assert.closeTo(outside.at(-1)?.[0] ?? 0, 188, 0.5);
    });

    it("is cut there too when it pokes a hair out past the corner and back", () => {
        const hook = clipToNodes(across([212.3, 87.7], [[211.9, 88.1]]), s, t);

        assert.closeTo(hook.at(-1)?.[0] ?? 0, 188, 0.5);
    });

    it("is cut there too when its last points round a hair outside the outline (headport=n)", () => {
        const top: Pt[] = [
            [112, 99],
            [180, 91],
            [195, 88.6],
            [199, 87.9],
            [200, 87.7],
        ];

        assert.closeTo(clipToNodes(top, s, t).at(-1)?.[0] ?? 0, 188, 0.5);
    });

    it("keeps a route that only passes near its node, never entering it", () => {
        const past: Pt[] = [
            [112, 100],
            [150, 60],
            [190, 87],
        ];

        assert.deepEqual(clipToNodes(past, s, t).at(-1), [190, 87]);
    });
});

describe("a route judged where it runs between its own nodes", () => {
    it("passes two straight lines between nodes one side draws 10 px off, which node.position judges", () => {
        // dot-synth-nodes n_alpha -> n_hsv: both straight, graphty's 10 px lower because its nodes are
        const p = node("p", 150, 200, { w: 30, h: 20 });
        const q = node("q", 250, 200, { w: 30, h: 20 });
        const o = scene(
            "oracle",
            [p, q],
            [
                edge("p", "q", [
                    [165, 200],
                    [235, 200],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [
                { ...p, cy: 210 },
                { ...q, cy: 210 },
            ],
            [
                edge("p", "q", [
                    [165, 210],
                    [235, 210],
                ]),
            ],
        );
        assert.strictEqual(passRate(o, g, "edge.route"), 1);
        assert.strictEqual(passRate(o, g, "edge.curve"), 1);
        // the same lines ending 10 px apart on nodes drawn alike: a port moved, which edge.route judges
        const moved = scene(
            "graphty",
            [p, q],
            [
                edge("p", "q", [
                    [165, 210],
                    [235, 210],
                ]),
            ],
        );
        assert.strictEqual(passRate(o, moved, "edge.route"), 0);
    });

    it("fails a long route sent through the middle of another node, past a share of its chord", () => {
        // dot-synth-nodes n_html3 -> n_unfilled: 1044 px long, sent 45 px off its chord through a 33 x 22 node
        const wide = (side: PScene["side"], bump: number): PScene => ({
            ...scene(
                side,
                [node("p", 50, 380, { w: 33, h: 22 }), node("q", 1100, 380, { w: 33, h: 22 })],
                [
                    edge("p", "q", [
                        [66, 380],
                        [575, 380 - bump],
                        [1084, 380],
                    ]),
                ],
            ),
            width: 1200,
        });
        assert.strictEqual(passRate(wide("oracle", 0), wide("graphty", 0), "edge.route"), 1);
        assert.strictEqual(passRate(wide("oracle", 0), wide("graphty", 45), "edge.route"), 0);
    });
});
