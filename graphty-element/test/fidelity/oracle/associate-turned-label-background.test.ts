/**
 * Cytoscape desktop draws a turned label's background box in the label's own turned frame (cx-syn-mappings: M07 at
 * 35.8 degrees, its rounded box 41.3 x 21 under the label's matrix). Turned, the box's bounds grow to about the node's
 * own, so it was read as an outline of the node's body and the label was judged to have no background, while graphty,
 * drawing one, was judged to draw it extra.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt, type PText } from "./primitives";

type Matrix = readonly [number, number, number, number, number, number];
const through = ([a, b, c, d, e, f]: Matrix, pts: readonly Pt[]): Pt[] =>
    pts.map(([x, y]): Pt => [a * x + c * y + e, b * x + d * y + f]);

/** A rounded rectangle's outline, its corners sampled as quarter circles. */
function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
    const out: Pt[] = [];
    const corners: [number, number, number][] = [
        [x1 - r, y1 - r, 0],
        [x0 + r, y1 - r, 90],
        [x0 + r, y0 + r, 180],
        [x1 - r, y0 + r, 270],
    ];
    for (const [cx, cy, from] of corners) {
        for (let k = 0; k <= 8; k++) {
            const t = ((from + (90 * k) / 8) * Math.PI) / 180;
            out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
        }
    }
    out.push(out[0]);
    return out;
}

let index = 0;
const prim = (points: Pt[], over: Partial<Prim>): Prim => ({
    index: index++,
    tag: "path",
    kind: "shape",
    box: boxOfPoints(points),
    points,
    closed: true,
    corners: 0,
    fill: null,
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
    ...over,
});

// cx-syn-mappings.svg, node 201: the body's parallelogram under the page's matrix, and the label's rounded box under
// the label's turned matrix, as the drawing writes them
const PAGE: Matrix = [0.7186778083091344, 0, 0, 0.7186778083091344, 24.07742842218545, 136.55179226727773];
const TURNED: Matrix = [
    0.5831192567611807, 0.4200829972163943, -0.4200829972163943, 0.5831192567611807, 727.5132980081194,
    132.3731124986123,
];
const parallelogram = through(PAGE, [
    [972.96343994140625, -22.51434898376465],
    [1007.94976806640625, -22.51434898376465],
    [1025.4429931640625, 24.93463134765625],
    [990.45660400390625, 24.93463134765625],
    [972.96343994140625, -22.51434898376465],
]);
const backing = through(TURNED, roundRect(0, -16.7080078125, 41.3349609375, 4.2451171875, 2.619140625));
const yellow = { color: "#ffffcc", opacity: 0.627, gradient: null };
// the label as the SVG reader read it from the drawing
const label: PText = {
    content: "M07",
    x: 742.092,
    y: 137.3295,
    box: { x0: 724.948, y0: 122.052, x1: 759.236, y1: 152.607 },
    sizePx: 12.936,
    family: "Times",
    weight: 400,
    style: "italic",
    anchor: "start",
    rotation: 35.769,
    color: "#7f2704",
    opacity: 0.824,
};

const square = (cx: number, cy: number): Pt[] => [
    [cx - 15, cy - 15],
    [cx + 15, cy - 15],
    [cx + 15, cy + 15],
    [cx - 15, cy + 15],
    [cx - 15, cy - 15],
];
const anchors: [string, number, number][] = [
    ["a", 200, 400],
    ["b", 1000, 600],
    ["c", 300, 800],
];
const plain = { color: "#cccccc", opacity: 1, gradient: null };

describe("a turned label's background box", () => {
    // turned, the box's bounds are about the body's and hold its middle: with an outline drawn round the body it was read
    // as a second outline (cx-syn-mappings), without a stroked one the closer body (cx2-syn-mappings, its outline dashes)
    it.each([
        ["an outline of the node's body", true],
        ["the node's body", false],
    ])("is the label's background, not %s", (_, outlined) => {
        index = 0;
        const prims: Prim[] = [
            ...anchors.map(([, x, y]) => prim(square(x, y), { corners: 4, fill: plain })),
            ...(outlined
                ? [
                      prim(parallelogram, {
                          corners: 4,
                          stroke: { color: "#d95f02", opacity: 0.784, width: 4.327, dash: null, dashClass: "solid" },
                      }),
                  ]
                : []),
            prim(parallelogram, { corners: 4, fill: { color: "#e0abb2", opacity: 0.459, gradient: null } }),
            prim(backing, { fill: yellow }),
            prim([], { kind: "text", box: label.box, closed: false, text: label }),
        ];
        const body = boxOfPoints(parallelogram);
        const node = (id: string, cx: number, cy: number, w: number, h: number, l: PText | null): PNode => ({
            id,
            cx,
            cy,
            w,
            h,
            shape: "rect",
            fill: plain,
            stroke: null,
            label: l,
        });
        const guide: PScene = {
            side: "graphty",
            width: 1200,
            height: 900,
            background: "#ffffff",
            nodes: [
                ...anchors.map(([id, x, y]) => node(id, x, y, 30, 30, null)),
                node("201", (body.x0 + body.x1) / 2, (body.y0 + body.y1) / 2, body.x1 - body.x0, body.y1 - body.y0, {
                    ...label,
                    background: { box: label.box, fill: yellow, stroke: null, shape: "roundrect" },
                }),
            ],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const oracle = associate(prims, 1200, 900, guide).scene.nodes.find((n) => n.id === "201");
        assert.strictEqual(oracle?.fill?.color, "#e0abb2");
        assert.strictEqual(oracle?.label?.content, "M07");
        assert.deepEqual(oracle?.label?.background?.fill, yellow);
        assert.strictEqual(oracle?.label?.background?.shape, "roundrect");
    });
});
