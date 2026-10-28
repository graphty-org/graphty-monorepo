/**
 * The oracle association of what vis-network draws on an edge besides its line: a middle arrow whose point is the
 * line's middle however near an end its base reaches (`arrows.middle.scaleFactor`), a middle arrow drawn as a stroked
 * half circle (`arrows.middle.type` "curve"), a band under the line in dashes of its own (`background.dashes`), and
 * the picture drawn inside a node (a circularImage), which the node keeps.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 33 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = (id: string, cx: number, cy: number, w = 8, h = 8): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape: "ellipse",
    fill: { color: "#c8c8c8", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const edge = (id: string, source: string, target: string): PEdge => ({
    id,
    source,
    target,
    points: [],
    stroke: { color: "#505050", opacity: 1, width: 1.4, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});

/**
 * The oracle side of one edge between s (100, 200) and t (171, 200) among four corner anchors, with what is drawn
 * over its line, associated against graphty's drawing of the same nodes and edge.
 * @param extra - the primitives drawn besides the nodes and the line, given the next primitive's index
 * @param under - whether a dotted band is drawn under the line first
 * @returns the oracle scene
 */
function sceneWith(extra: (prim: (over: Partial<Prim> & { points: Pt[] }) => Prim) => Prim[], under = false): PScene {
    let index = 0;
    const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 0,
        fill: { color: "#c8c8c8", opacity: 1, gradient: null },
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    const anchors: [string, number, number][] = [
        ["nw", 20, 20],
        ["ne", 580, 20],
        ["sw", 20, 380],
        ["se", 580, 380],
    ];
    const line = (width: number, dash: number[] | null): Prim =>
        prim({
            kind: "path",
            closed: false,
            points: [
                [100, 200],
                [135.5, 200],
                [171, 200],
            ],
            fill: null,
            stroke: {
                color: dash === null ? "#505050" : "#6f6f6f",
                opacity: 1,
                width,
                dash,
                dashClass: dash === null ? "solid" : "dotted",
            },
        });
    const prims = [
        ...anchors.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 3) })),
        ...(under ? [line(9.4, [5.6, 3.7])] : []),
        line(1.4, null),
        prim({ tag: "ellipse", points: disc(100, 200, 4) }),
        prim({ tag: "ellipse", points: disc(171, 200, 4) }),
        ...extra(prim),
    ];
    const g: PScene = {
        side: "graphty",
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: [...anchors.map(([id, x, y]) => node(id, x, y, 6, 6)), node("s", 100, 200), node("t", 171, 200)],
        edges: [edge("e", "s", "t")],
        groups: [],
        texts: [],
        strays: [],
    };
    return associate(prims, 600, 400, g).scene;
}

describe("vis-network's middle caps", () => {
    it("takes a cap pointing at the line's middle as the middle arrow, though its base reaches the source", () => {
        // arrows.middle.scaleFactor 2 on a 71 px line: the point at the middle, the base 32 px back, by the source
        const o = sceneWith((prim) => [
            prim({
                fill: { color: "#505050", opacity: 1, gradient: null },
                points: [
                    [135.5, 200],
                    [103.2, 209.7],
                    [106.5, 200],
                    [103.2, 190.3],
                    [135.5, 200],
                ],
            }),
        ]);
        const e = o.edges.find((x) => x.source === "s" || x.target === "s");
        assert.deepEqual(
            e?.arrows.map((a) => a.end),
            ["middle"],
        );
    });

    it("takes a stroked half circle across the line's middle as a hollow middle arrow", () => {
        // arrows.middle.type "curve": a semicircle whose chord crosses the line before its middle, bulging to it
        const r = 7.3;
        const cx = 135.5 - r;
        const arc = Array.from({ length: 17 }, (_, i): Pt => {
            const t = -Math.PI / 2 + (i * Math.PI) / 16;
            return [cx + r * Math.cos(t), 200 + r * Math.sin(t)];
        });
        const o = sceneWith((prim) => [
            prim({
                kind: "path",
                closed: false,
                fill: null,
                stroke: { color: "#505050", opacity: 1, width: 1.4, dash: null, dashClass: "solid" },
                points: arc,
            }),
        ]);
        const e = o.edges.find((x) => x.source === "s" || x.target === "s");
        assert.deepEqual(
            e?.arrows.map((a) => [a.end, a.shape, a.filled]),
            [["middle", "half-circle", false]],
        );
        assert.lengthOf(o.strays, 0);
    });
});

describe("vis-network's edge background in dashes", () => {
    it("takes a dotted band under the line as the edge's outline, in its own line class", () => {
        const o = sceneWith(() => [], true);
        const lines = o.edges.filter((x) => x.source === "s" || x.target === "s");
        assert.lengthOf(lines, 1);
        assert.deepEqual(lines[0].outline, { color: "#6f6f6f", opacity: 1, width: 9.4, dashClass: "dotted" });
    });
});

describe("a picture drawn as part of a node", () => {
    it("is kept with the node it is drawn in", () => {
        const o = sceneWith((prim) => [prim({ kind: "image", tag: "image", fill: null, points: disc(171, 200, 3.5) })]);
        const t = o.nodes.find((n) => n.id === "t");
        assert.lengthOf(t?.pictures ?? [], 1);
    });
});
