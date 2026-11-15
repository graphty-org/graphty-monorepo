/**
 * The oracle association of arrowheads that are neither a plain triangle nor a diamond: yEd's concave arrow, two
 * quadratic arms drawn as open strokes from its tip (gml-synthetic-coverage 10 -> 19, `M0 0 Q-6 0 -10 -6` and its
 * mirror at scale 0.8372), and vis-network's bar, crow and curve, drawn where a line run on to its node's center
 * leaves the node (json-vis-synth e1, e4, e5; coordinates taken from its drawing, moved onto one node). Each was read
 * as no head at all.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const INK = "#333333";
const ink = { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const node = (id: string, cx: number, cy: number, w: number, shape: PNode["shape"]): PNode => ({
    id,
    cx,
    cy,
    w,
    h: w,
    shape,
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 49 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 24),
        cy + r * Math.sin((i * Math.PI) / 24),
    ]);
const square = (cx: number, cy: number, half: number): Pt[] => [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
];
/** The anchors that frame the drawing, one at each corner. */
const ANCHORS: [string, number, number][] = [
    ["nw", 20, 20],
    ["ne", 580, 20],
    ["sw", 20, 380],
    ["se", 580, 380],
];

/**
 * The oracle's one edge from s (100, 200) to t (200, 200) among four corner anchors, associated against graphty's
 * drawing of the same nodes and edge.
 * @param round - whether the nodes are discs (vis-network's dots) rather than squares (yEd's rectangles)
 * @param line - the line's points
 * @param extra - what is drawn after the line, given a primitive builder
 * @param targetSize - t's width and height
 * @returns the oracle's edge
 */
function edgeWith(
    round: boolean,
    line: Pt[],
    extra: (prim: (over: Partial<Prim> & { points: Pt[] }) => Prim) => Prim[],
    targetSize = 40,
): PEdge | undefined {
    let index = 0;
    const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 0,
        fill: { color: "#cccccc", opacity: 1, gradient: null },
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    const body = (x: number, y: number, size: number): Prim =>
        round
            ? prim({ tag: "ellipse", points: disc(x, y, size / 2), stroke: ink })
            : prim({ tag: "rect", corners: 4, points: square(x, y, size / 2), stroke: ink });
    const prims = [
        ...ANCHORS.map(([, x, y]) => body(x, y, 6)),
        body(100, 200, 40),
        body(200, 200, targetSize),
        prim({ kind: "path", closed: false, fill: null, stroke: ink, points: line }),
        ...extra(prim),
    ];
    const shape = round ? "ellipse" : "rect";
    const guide: PScene = {
        side: "graphty",
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: [
            ...ANCHORS.map(([id, x, y]) => node(id, x, y, 6, shape)),
            node("s", 100, 200, 40, shape),
            node("t", 200, 200, targetSize, shape),
        ],
        edges: [{ id: "e", source: "s", target: "t", points: [], stroke: ink, arrows: [], label: null }],
        groups: [],
        texts: [],
        strays: [],
    };
    return associate(prims, 600, 400, guide).scene.edges.find((e) => e.source === "s" && e.target === "t");
}

/** A line run on from the source's center to the target's, as vis-network draws one. */
const CENTER_LINE: Pt[] = Array.from({ length: 21 }, (_, i): Pt => [100 + 5 * i, 200]);

describe("arrowheads that are not plain triangles", () => {
    it("reads yEd's concave arrow, two quadratic arms from its tip, as the target's head", () => {
        // the arms of `M0 0 Q-6 0 -10 -6` and `M0 0 Q-6 0 -10 6` at scale 0.8372, the tip on t's outline; yEd stops
        // the line half way back along them
        const arm = (side: number): Pt[] =>
            Array.from({ length: 33 }, (_, i): Pt => {
                const t = i / 32;
                const [x, y] = [2 * t * (1 - t) * -6 + t * t * -10, t * t * 6 * side];
                return [180 + 0.8372 * x, 200 + 0.8372 * y];
            });
        const e = edgeWith(
            false,
            [
                [120, 200],
                [175.4, 200],
            ],
            (prim) => [
                prim({ kind: "path", closed: false, fill: null, stroke: ink, points: arm(-1) }),
                prim({ kind: "path", closed: false, fill: null, stroke: ink, points: arm(1) }),
            ],
        );
        assert.deepEqual(
            e?.arrows.map((a) => [a.end, a.shape]),
            [["target", "vee"]],
        );
    });

    it("reads vis-network's bar, a flat box across the line at the node's outline, as the target's head", () => {
        // json-vis-synth e1 on its 47.3 px node: 2.15 x 14.33, its side 0.8 px off the outline, no corner within 7 px
        // of the line, its middle 25.5 px from the line's end at the node's center
        const e = edgeWith(
            true,
            CENTER_LINE,
            (prim) => [
                prim({
                    fill: { color: "#848484", opacity: 1, gradient: null },
                    points: [
                        [175.55, 207.17],
                        [175.55, 192.83],
                        [173.4, 192.83],
                        [173.4, 207.17],
                        [175.55, 207.17],
                    ],
                }),
            ],
            47.3,
        );
        assert.deepEqual(
            e?.arrows.map((a) => a.end),
            ["target"],
        );
    });

    it("reads vis-network's crow, tines either side of the line at the node's outline, as the target's head", () => {
        // json-vis-synth e4: the back on the line 14.33 from the tines, the notch empty where the line meets the node
        const e = edgeWith(true, CENTER_LINE, (prim) => [
            prim({
                fill: { color: "#848484", opacity: 1, gradient: null },
                points: [
                    [164.87, 200],
                    [179.2, 204.3],
                    [173.47, 200],
                    [179.2, 195.7],
                    [164.87, 200],
                ],
            }),
        ]);
        assert.deepEqual(
            e?.arrows.map((a) => a.end),
            ["target"],
        );
    });

    it("reads vis-network's curve, a stroked half circle bulging to the node's outline, as the target's head", () => {
        // json-vis-synth e5: radius 5.73, its chord across the line, its round side reaching the outline
        const arc = Array.from({ length: 33 }, (_, i): Pt => {
            const a = -Math.PI / 2 + (i * Math.PI) / 32;
            return [174.27 + 5.73 * Math.cos(a), 200 + 5.73 * Math.sin(a)];
        });
        const e = edgeWith(true, CENTER_LINE, (prim) => [
            prim({ kind: "path", closed: false, fill: null, stroke: { ...ink, color: "#848484" }, points: arc }),
        ]);
        assert.deepEqual(
            e?.arrows.map((a) => [a.end, a.filled]),
            [["target", false]],
        );
    });
});
