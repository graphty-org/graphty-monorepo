/**
 * The oracle comparison's routes at a group: a line that starts or ends on a group is cut at the group's box on each
 * side, as at a node's outline. yEd ends a line at a group's border (graphml-galaxy-lcms-workflow n0::n22 -> n0::n27:
 * a 15 px band from the group's left side to n22's top), where graphty draws it to the group's middle; the oracle's
 * reading names the group by a box id of its own.
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
    it("cuts a line at the group's box on both sides, the oracle's group named by a box id of its own", () => {
        // the program's line from the group's left side to x's outline
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
        // graphty's from x's middle to the group's
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
        const report = compareOracle("t", o, g);
        assert.deepEqual(report.failures["edge.route"] ?? [], []);
        assert.equal(report.properties["edge.route"].passRate, 1);
    });

    it("cuts at the inner of two nested groups round the same members, as on the other side", () => {
        const outer = (id: string): PGroup => ({ ...group(id), box: { x0: 190, y0: 150, x1: 310, y1: 250 } });
        const o = scene(
            "oracle",
            [outer("box@190,150,310,250"), group("box@200,160,300,240")],
            [
                edge("grp", "x", [
                    [199.5, 200],
                    [140, 200],
                ]),
            ],
        );
        const g = scene(
            "graphty",
            [outer("big"), group("grp")],
            [
                edge("x", "grp", [
                    [120, 200],
                    [250, 200],
                ]),
            ],
        );
        assert.deepEqual(compareOracle("t", o, g).failures["edge.route"] ?? [], []);
    });

    it("still fails a line that ends elsewhere on the group", () => {
        const o = scene(
            "oracle",
            [group("box@200,160,300,240")],
            [
                edge("grp", "x", [
                    [250, 160],
                    [250, 120],
                    [140, 120],
                    [120, 180],
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
});
