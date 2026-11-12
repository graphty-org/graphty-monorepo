/**
 * Graphviz draws a `style=striped` cluster as a filled stripe per color, then its outline unfilled over them (#706,
 * dot-synth-edges-clusters cluster_striped: #ffdddd, #ddffdd and #ddddff under a black outline). The group was read as
 * its outline alone: no fill, where graphty fills it in its first color, and graphty's stripes drawn over its face
 * were extra. The fill in pieces is now the group's, its first color, and each piece is one graphty draws there, as a
 * striped node's are.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import type { PFill, Prim, PScene, Pt } from "./primitives";

const box = (x0: number, x1: number): Pt[] => [
    [x0, 206],
    [x1, 206],
    [x1, 1096],
    [x0, 1096],
    [x0, 206],
];

/**
 * One primitive of the cluster's markup.
 * @param index - its drawing order
 * @param points - its outline
 * @param fill - its fill, or null
 * @returns the primitive
 */
function piece(index: number, points: Pt[], fill: string | null): Prim {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const paint: PFill | null = fill === null ? null : { color: fill, opacity: 1, gradient: null };
    return {
        index,
        tag: "polygon",
        kind: "shape",
        box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
        points,
        closed: true,
        corners: 4,
        fill: paint,
        stroke: { color: "#000000", opacity: 1, width: fill === null ? 1 : 0.5, dash: null, dashClass: "solid" },
        text: null,
        markers: { start: false, end: false },
        hint: { role: "group", id: "cluster_striped", key: "cluster_striped" },
    };
}

const empty: PScene = {
    side: "graphty",
    width: 1200,
    height: 1200,
    background: "#ffffff",
    nodes: [],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
};

describe("Graphviz's striped cluster", () => {
    it("is filled in its first stripe's color, each stripe a piece of its face", () => {
        const prims = [
            piece(0, box(1081, 1106.33), "#ffdddd"),
            piece(1, box(1106.33, 1131.67), "#ddffdd"),
            piece(2, box(1131.67, 1157), "#ddddff"),
            piece(3, box(1081, 1157), null),
        ];
        const [group] = associate(prims, 1200, 1200, empty).scene.groups;
        assert.strictEqual(group.fill?.color, "#ffdddd");
        assert.deepEqual(
            group.faces?.map((f) => f.color),
            ["#ffdddd", "#ddffdd", "#ddddff"],
        );
        assert.deepEqual(group.box, { x0: 1081, y0: 206, x1: 1157, y1: 1096 });
    });

    it("keeps a cluster filled in one piece as it was", () => {
        const [group] = associate([piece(0, box(10, 90), "#eeeeee")], 1200, 1200, empty).scene.groups;
        assert.strictEqual(group.fill?.color, "#eeeeee");
        assert.isUndefined(group.faces);
    });
});
