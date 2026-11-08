/**
 * The oracle comparison's routes at a group: a group's inside is no node's inside. A node hides the stretch of line
 * under it, so a route is cut at its end nodes' outlines; a group shows its members, and any line drawn across it,
 * so a route that ends on a group is judged whole. A line graphty runs into a group where the program stops it at
 * the group's border is a difference a reader sees, and an edge between a group and one of its own members, which
 * lies wholly inside the group's box, is measured like any other.
 */
import { assert, describe, it } from "vitest";

import { compareOracle } from "./compare-oracle";
import type { PEdge, PGroup, PNode, PScene, Pt } from "./primitives";

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
/** Six nodes on a grid, which fix the frame, the group's two members and the node its line runs to. */
const NODES = [
    node("a", 100, 100),
    node("b", 300, 100),
    node("c", 500, 100),
    node("d", 100, 300),
    node("e", 300, 300),
    node("f", 500, 300),
    node("m1", 230, 200, { w: 20, h: 20 }),
    node("m2", 270, 200, { w: 20, h: 20 }),
    node("x", 120, 200),
];
const group = (id: string): PGroup => ({
    id,
    box: { x0: 200, y0: 160, x1: 300, y1: 240 },
    fill: { color: "#f5f5f5", opacity: 1, gradient: null },
    stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
    label: null,
    members: ["m1", "m2"],
});
const edge = (source: string, target: string, points: Pt[]): PEdge => ({
    id: `${source}->${target}`,
    source,
    target,
    points,
    stroke: { color: "#0000ff", opacity: 1, width: 2, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});
const scene = (side: PScene["side"], groups: PGroup[], edges: PEdge[]): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: NODES,
    edges,
    groups,
    texts: [],
    strays: [],
});

describe("routes at a group", () => {
    it("fails a line graphty runs across the group to its middle, where the program stops it at the border", () => {
        const o = scene(
            "oracle",
            [group("box@200,160,300,240")],
            [
                edge("grp", "x", [
                    [199.5, 200],
                    [140, 200],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [group("grp")],
            [
                edge("x", "grp", [
                    [120, 200],
                    [250, 200],
                ]),
            ],
        );
        assert.equal(compareOracle("t", o, g).properties["edge.route"].passRate, 0);
    });

    it("measures an edge between a group and its own member instead of passing it unmeasured", () => {
        const o = scene(
            "oracle",
            [group("box@200,160,300,240")],
            [
                edge("grp", "m1", [
                    [230, 160],
                    [230, 190],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [group("grp")],
            [
                edge("grp", "m1", [
                    [250, 200],
                    [230, 200],
                ]),
            ],
        );
        assert.equal(compareOracle("t", o, g).properties["edge.route"].passRate, 0);
    });

    it("passes a line both sides draw alike to the group", () => {
        const route: Pt[] = [
            [140, 200],
            [199.5, 200],
        ];
        const o = scene("oracle", [group("box@200,160,300,240")], [edge("x", "grp", route)]);
        const g = scene("graphty", [group("grp")], [edge("x", "grp", route)]);
        assert.equal(compareOracle("t", o, g).properties["edge.route"].passRate, 1);
    });
});
