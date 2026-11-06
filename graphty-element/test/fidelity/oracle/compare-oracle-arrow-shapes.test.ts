/**
 * Three arrowhead differences the oracle comparison used to pass, each planted in a tiny pair of drawings that differ
 * in it alone (issue #4252): a line Cytoscape desktop runs on under its half arrow to the tip against one stopped at
 * the head's back, Cytoscape's half arrow drawn as one open stroked barb against a filled wedge, and vis-network's
 * crow (a vee turned back, its notch empty) against a crow's foot with a tine along the line.
 */
import { assert, describe, it } from "vitest";

import { arrowheadEdge, associate, measureArrow } from "./associate";
import { compareOracle } from "./compare-oracle";
import {
    arrowShapeOf,
    boxOfPoints,
    type PArrow,
    type PEdge,
    piecedArrowShapeOf,
    type PNode,
    type Prim,
    type PScene,
    type Pt,
    strokedBarb,
} from "./primitives";

/** Two nodes 40 across, a at (100, 100) and b at (300, 100), and four more that fix the frame. */
const NODES: [string, number, number][] = [
    ["a", 100, 100],
    ["b", 300, 100],
    ["c", 500, 100],
    ["d", 100, 300],
    ["e", 300, 300],
    ["f", 500, 300],
];
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 48 }, (_, i): Pt => [
        cx + r * Math.cos((i / 48) * 2 * Math.PI),
        cy + r * Math.sin((i / 48) * 2 * Math.PI),
    ]);

/**
 * Cytoscape desktop's HALF_TOP barb (its export's polygon, `cx2-specimen-arrows`) at b's end of a -> b, its tip on b's
 * outline at x 280, scaled 15: a strip about a pixel and a half thick.
 */
const BARB: Pt[] = (
    [
        [-0.3, 0.1],
        [-1.3, 1.1],
        [-1.435, 1.1],
        [-0.535, 0.2],
        [-0.535, 0.1],
    ] as Pt[]
).map(([x, y]): Pt => [284.5 + 15 * x, 100 - 15 * y]);

/** A filled wedge on the same side of the line, as long and as wide: half a triangle, tip on b's outline. */
const WEDGE: Pt[] = [
    [280, 100],
    [263, 85],
    [263, 100],
];

/** The one pixel stroke yEd draws its arrowheads' lines in. */
const thin: NonNullable<Prim["stroke"]> = { color: "#505050", opacity: 1, width: 1, dash: null, dashClass: "solid" };

/**
 * What the reader finds of an oracle drawing of a -> b: its line and one filled head at b's end.
 * @param line - the line's points
 * @param head - the head's outline, filled
 * @param stroked - the stroke the head is drawn with instead of a fill
 * @returns the scene read
 */
function read(line: Pt[], head: Pt[], stroked?: Prim["stroke"], strokes: readonly Pt[][] = [], pen = thin): PScene {
    let index = 0;
    const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 0,
        fill: null,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
    const paint = { color: "#505050", opacity: 1, gradient: null };
    const prims = [
        ...NODES.map(([, x, y]) =>
            prim({ tag: "ellipse", points: disc(x, y, 20), fill: { ...paint, color: "#cccccc" } }),
        ),
        prim({
            kind: "path",
            closed: false,
            points: line,
            stroke: { color: "#505050", opacity: 1, width: 1.5, dash: null, dashClass: "solid" },
        }),
        ...(head.length === 0
            ? []
            : [
                  prim({
                      tag: "path",
                      points: head,
                      ...(stroked === undefined ? { fill: paint } : { stroke: stroked }),
                  }),
              ]),
        ...strokes.map((points) => prim({ tag: "line", kind: "path", closed: false, points, stroke: pen })),
    ];
    const hint: PScene = {
        side: "graphty",
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: NODES.map(([id, cx, cy]) => ({
            id,
            cx,
            cy,
            w: 40,
            h: 40,
            shape: "ellipse",
            fill: { ...paint, color: "#cccccc" },
            stroke: null,
            label: null,
        })),
        edges: [
            {
                id: "e1",
                source: "a",
                target: "b",
                points: [
                    [120, 100],
                    [280, 100],
                ],
                stroke: null,
                arrows: [{ end: "target", length: 15, width: 15, filled: true, shape: "half", color: "#505050" }],
                label: null,
            },
        ],
        groups: [],
        texts: [],
        strays: [],
    };
    return associate(prims, 600, 400, hint).scene;
}

/**
 * The properties that fail between two scenes.
 * @param o - the oracle's
 * @param g - graphty's
 * @returns the failing properties
 */
const failing = (o: PScene, g: PScene): string[] =>
    Object.entries(compareOracle("t", o, g).properties)
        .filter(([, v]) => v.passRate !== null && v.passRate < 1)
        .map(([k]) => k);

/**
 * graphty's drawing as the oracle's, its one edge's head changed.
 * @param o - the oracle's scene
 * @param change - what graphty's head has otherwise
 * @returns graphty's scene
 */
function graphtyAs(o: PScene, change: Partial<PArrow>): PScene {
    const edges = o.edges.map((e): PEdge => ({ ...e, arrows: e.arrows.map((a) => ({ ...a, ...change })) }));
    return { ...structuredClone(o), side: "graphty", edges };
}

const toTip: Pt[] = [
    [120, 100],
    [277, 100],
];

describe("half arrows (Cytoscape desktop's HALF_TOP)", () => {
    it("fails a line stopped at a half arrow's back where the program runs it on to where the barb meets it", () => {
        const o = read(toTip, BARB);
        const head = o.edges[0]?.arrows[0];
        assert.strictEqual(head?.shape, "half");
        assert.strictEqual(head?.lineGap, 0);
        assert.deepEqual(failing(o, graphtyAs(o, {})), []);
        // graphty's line stopped at the head's back, a break between it and the barb
        assert.deepEqual(failing(o, graphtyAs(o, { lineGap: 0.6 })), ["edge.arrowPlace"]);
    });

    it("reads the break between where a line stops and where its head first meets it", () => {
        const gap = (head: Pt[], line: Pt[]): number | undefined =>
            measureArrow(head, line, "target", { filled: true, color: null, shape: "half" }).lineGap;
        const toBack: Pt[] = [
            [120, 100],
            [263, 100],
        ];
        assert.strictEqual(gap(BARB, toTip), 0);
        // the barb meets the line only near its tip, 13.5 px past the head's back
        assert.closeTo(gap(BARB, toBack) ?? -1, 13.5 / 17, 0.05);
        // a wedge along the line from its back (Graphviz's lvee) meets a line stopped there: no break
        assert.strictEqual(gap(WEDGE, toBack), 0);
    });

    it("reads Cytoscape's half arrow, a strip as thin as a stroke, as one open barb, and fails a filled wedge", () => {
        assert.isTrue(strokedBarb(BARB));
        assert.isFalse(strokedBarb(WEDGE));
        const o = read(toTip, BARB);
        assert.isFalse(o.edges[0]?.arrows[0]?.filled);
        // a filled half arrow is still read filled
        assert.isTrue(read(toTip, WEDGE).edges[0]?.arrows[0]?.filled);
        assert.deepEqual(failing(o, graphtyAs(o, { filled: true })), ["edge.arrowFill"]);
    });
});

describe("vis-network's crow", () => {
    // its export's polygon (`vis-network-specimen-arrows`, arrow-to-crow): its point on the line, its corners at the
    // node, its notch 0.6 of the way from point to corners, empty
    const visCrow: Pt[] = [
        [665.96, 116.93],
        [684.2, 122.4],
        [676.91, 116.93],
        [684.2, 111.45],
    ];
    // Graphviz's crow (`dot-specimen-arrows`): the same with a tine of no width along the line in the notch
    const graphvizCrow: Pt[] = [
        [124.03, -720.33],
        [134.03, -724.83],
        [129.54, -720.33],
        [133.53, -720.33],
        [133.53, -720.33],
        [129.54, -720.33],
        [134.03, -715.83],
    ];

    it("reads a bar drawn as a stroke across the line as a solid tee as long as its stroke is wide", () => {
        // yEd's dash on a line running aslant: a line there and back, its coordinates rounded to four places
        const bar: Pt[] = [
            [281.8395, 95.5659],
            [281.8399, 104.5617],
            [281.8395, 95.5659],
        ];
        assert.strictEqual(arrowShapeOf(bar, [1, 0]), "tee");
        const stroke = { color: "#333333", opacity: 1, width: 1, dash: null, dashClass: "solid" } as const;
        const line: Pt[] = [
            [120, 100],
            [281, 100],
        ];
        const [head] = read(line, bar, stroke).edges[0]?.arrows ?? [];
        assert.deepEqual([head.shape, head.filled, head.length, head.color], ["tee", true, 1, "#333333"]);
        assert.closeTo(head.width, 9, 0.01);
    });

    it("reads a vee turned back as no crow's foot, and a crow with a tine along the line as one", () => {
        assert.strictEqual(arrowShapeOf(visCrow, [1, 0]), "inverted-vee");
        assert.strictEqual(arrowShapeOf(graphvizCrow, [1, 0]), "crow");
    });

    it("fails graphty's crow's foot against vis-network's crow", () => {
        const o = read(
            toTip,
            visCrow.map(([x, y]): Pt => [x - 404.2, y - 16.93]),
        );
        assert.strictEqual(o.edges[0]?.arrows[0]?.shape, "inverted-vee");
        assert.deepEqual(failing(o, graphtyAs(o, { shape: "crow" })), ["edge.arrowShape"]);
    });

    /** yEd's line, stopped 9 px short of b's outline at x 280 where a crow's foot's fork stands, as `<line>` elements. */
    const stopped: Pt[] = [
        [120, 100],
        [271, 100],
    ];

    it("reads yEd's crow's foot, three strokes from one fork, as one crow", () => {
        // yed-graphml-specimen-arrows: three <line>s from (-10, 0) to (2, 8), (2, 0) and (2, -8) off the line's end
        const fork: Pt = [270, 100];
        const tines: Pt[][] = [
            [fork, [282, 108]],
            [fork, [282, 100]],
            [fork, [282, 92]],
        ];
        const [head, ...more] = read(stopped, [], undefined, tines).edges[0]?.arrows ?? [];
        assert.lengthOf(more, 0);
        assert.deepEqual([head.end, head.shape, head.length, head.width], ["target", "crow", 12, 16]);
    });

    it("reads yEd's concave arrow, two strokes from its tip, as one open vee", () => {
        // yed-graphml-specimen-arrows: M0 0 Q-6 0 -10 -6 and M0 0 Q-6 0 -10 6 at the line's end
        const arm = (side: number): Pt[] => [
            [280, 100],
            [274.5, 100 + 0.75 * side],
            [270, 100 + 6 * side],
        ];
        const [head] = read(stopped, [], undefined, [arm(1), arm(-1)]).edges[0]?.arrows ?? [];
        assert.deepEqual([head.shape, head.filled, head.length, head.width], ["vee", false, 10, 12]);
    });

    it("reads one stroke across a line's end as a bar, and two as two parts", () => {
        // yed-graphml-specimen-arrows crows_foot_one_mandatory: <line>s 6 and 15 back, 16 long, the line running on
        const bar = (x: number): Pt[] => [
            [x, 92],
            [x, 108],
        ];
        const toNode: Pt[] = [
            [120, 100],
            [280, 100],
        ];
        const heads = read(toNode, [], undefined, [bar(274), bar(265)]).edges[0]?.arrows ?? [];
        assert.deepEqual(
            heads.map((h) => [h.shape, h.filled]),
            [
                ["tee", true],
                ["tee", true],
            ],
        );
    });

    it("reads a row of a bar and a circle behind it from the line's end back", () => {
        // yed-graphml-specimen-arrows crows_foot_one_optional: a bar 6 back and a circle 15 back, the circle nearer the
        // bar's ends than the line's end
        const toNode: Pt[] = [
            [120, 100],
            [280, 100],
        ];
        const bar: Pt[] = [
            [274, 92],
            [274, 108],
        ];
        const heads = read(toNode, disc(265, 100, 5), thin, [bar]).edges[0]?.arrows ?? [];
        assert.deepEqual(
            heads.map((h) => h.shape),
            ["tee", "circle"],
        );
    });

    it("counts a bar behind a crow's foot as a part, though it is one pixel deep", () => {
        const fork: Pt = [270, 100];
        const strokes: Pt[][] = [
            [fork, [282, 108]],
            [fork, [282, 100]],
            [fork, [282, 92]],
            [
                [265, 92],
                [265, 108],
            ],
        ];
        const o = read(stopped, [], undefined, strokes);
        assert.deepEqual(
            o.edges[0]?.arrows.map((h) => h.shape),
            ["crow", "tee"],
        );
        assert.notInclude(failing(o, o), "edge.arrowParts");
    });

    it("leaves another line's strokes and a fork with no head's shape unread as this line's head", () => {
        const fork: Pt = [270, 100];
        const tines: Pt[][] = [
            [fork, [282, 108]],
            [fork, [282, 92]],
        ];
        const other = { ...thin, color: "#ff0000" };
        assert.lengthOf(read(stopped, [], undefined, tines, other).edges[0]?.arrows ?? [], 0);
        // both strokes to one side of the line: half an arrow's shape, no open arrow's arms
        const aside: Pt[][] = [
            [fork, [282, 120]],
            [fork, [282, 100]],
        ];
        assert.lengthOf(read(stopped, [], undefined, aside).edges[0]?.arrows ?? [], 0);
    });

    it("leaves a short stroke along a line or off its end unread as a head", () => {
        const stub: Pt[] = [
            [262, 100],
            [271, 100],
        ];
        assert.lengthOf(read(stopped, [], undefined, [stub]).edges[0]?.arrows ?? [], 0);
    });

    it("reads two strokes crossing on the line as a cross, solid, in its stroke's color", () => {
        // yEd's cross: one path M177 309 L185 317 Z M185 309 L177 317 Z, filled black, stroked in the line's color
        const pieces: Pt[][] = [
            [
                [272, 96],
                [280, 104],
            ],
            [
                [280, 96],
                [272, 104],
            ],
        ];
        assert.strictEqual(piecedArrowShapeOf(pieces, [1, 0]), "cross");
        const notCrossing: Pt[][] = [pieces[0], pieces[0].map(([x, y]): Pt => [x + 8, y])];
        assert.isNull(piecedArrowShapeOf(notCrossing, [1, 0]));
    });

    it("takes a head centered exactly on a small node's outline for its line's, not the node's", () => {
        // yed-graphml-specimen-arrows transparent_circle: a disc 8 across on the outline of a node 10 across
        const n: PNode = {
            id: "n",
            cx: 338,
            cy: 641,
            w: 10,
            h: 10,
            shape: "ellipse",
            fill: null,
            stroke: null,
            label: null,
        };
        const e: PEdge = {
            id: "n->m#g0",
            source: "n",
            target: "m",
            points: [
                [343, 641],
                [409, 641],
            ],
            stroke: null,
            arrows: [],
            label: null,
        };
        const ring: Prim = {
            index: 0,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(disc(343, 641, 4)),
            closed: true,
            corners: 0,
            fill: null,
            stroke: thin,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            points: disc(343, 641, 4),
        };
        assert.strictEqual(arrowheadEdge(ring, [e], [n])?.end, "source");
    });
});
