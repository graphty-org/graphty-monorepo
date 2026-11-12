/**
 * What Cytoscape desktop draws at a line's ends and round a node, each misread on the syn-mappings samples (#3113): a
 * line's own end taken for its arrowhead, a head over a small node cutting a line off from its heads, a head a few
 * degrees off the line read as another shape, a hairline's dash-dot read as dots, and borders round nodes that are not
 * round.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import {
    arrowShapeOf,
    boxOfPoints,
    dashClassOf,
    outlinePaintedAsFill,
    type PEdge,
    type PNode,
    type Prim,
    type PScene,
    type PStroke,
    type Pt,
} from "./primitives";

const INK = "#404040";
const HEAD = "#aa2222";
const OTHER = "#22aa22";
const line = (width: number): PStroke => ({ color: INK, opacity: 1, width, dash: null, dashClass: "solid" });
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 48 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 24),
        cy + r * Math.sin((i * Math.PI) / 24),
    ]);
const turned = (points: readonly Pt[], degrees: number): Pt[] => {
    const [c, s] = [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)];
    return points.map(([x, y]): Pt => [x * c - y * s, x * s + y * c]);
};

/** The nodes: four fixing the frame, then the ones each drawing adds. */
const FRAME: [string, number, number, number][] = [
    ["a", 40, 40, 20],
    ["b", 760, 40, 20],
    ["c", 40, 560, 20],
    ["d", 760, 560, 20],
];
const node = ([id, cx, cy, r]: [string, number, number, number]): PNode => ({
    id,
    cx,
    cy,
    w: 2 * r,
    h: 2 * r,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});

/**
 * The drawing of some nodes and shapes, as associate reads it against graphty's one edge s -> t.
 * @param nodes - the nodes besides the frame's
 * @param shapes - what is drawn after them, in order
 * @returns the edge read between s and t
 */
function readEdge(nodes: [string, number, number, number][], shapes: Partial<Prim>[]): PEdge | undefined {
    const all = [...FRAME, ...nodes];
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
    const prims = [
        ...all.map(([, x, y, r]) => prim({ points: disc(x, y, r) })),
        ...shapes.map((s) => prim({ points: [], ...s })),
    ];
    const guide: PScene = {
        side: "graphty",
        width: 800,
        height: 600,
        background: "#ffffff",
        nodes: all.map(node),
        edges: [
            {
                id: "e",
                source: "s",
                target: "t",
                points: [],
                stroke: line(1),
                arrows: [],
                label: null,
            },
        ],
        groups: [],
        texts: [],
        strays: [],
    };
    return associate(prims, 800, 600, guide).scene.edges.find((e) => e.source === "s" && e.target === "t");
}

const stroked = (points: Pt[], width: number): Partial<Prim> => ({
    kind: "path",
    closed: false,
    points,
    fill: null,
    stroke: line(width),
});
const filled = (points: Pt[], color: string, corners = points.length): Partial<Prim> => ({
    points,
    corners,
    fill: { color, opacity: 1, gradient: null },
});

describe("the shapes drawn with a line", () => {
    it("reads a line-wide piece of the line's color at 45 degrees as the line's end, not its arrowhead", () => {
        const edge = readEdge(
            [
                ["s", 500, 500, 20],
                ["t", 200, 200, 20],
            ],
            [
                stroked(
                    [
                        [486, 486],
                        [240, 240],
                    ],
                    4,
                ),
                // a square as wide as the line, 5.6 across its box
                filled(
                    [
                        [240, 237.2],
                        [242.8, 240],
                        [240, 242.8],
                        [237.2, 240],
                        [240, 237.2],
                    ],
                    INK,
                ),
                filled(
                    [
                        [214, 214],
                        [222, 236],
                        [240, 240],
                        [236, 222],
                        [214, 214],
                    ],
                    HEAD,
                ),
            ],
        );
        assert.deepEqual(
            edge?.arrows.map((a) => [a.end, a.color]),
            [["target", HEAD]],
        );
    });

    it("keeps a small head of the line's color that is wider than the line", () => {
        // 5 across on a 3 px line: within the box a line-wide square has at 45 degrees, but no square
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 500, 300, 20],
            ],
            [
                stroked(
                    [
                        [120, 300],
                        [475, 300],
                    ],
                    3,
                ),
                filled(
                    [
                        [480, 300],
                        [475, 302.5],
                        [475, 297.5],
                        [480, 300],
                    ],
                    INK,
                ),
            ],
        );
        assert.deepEqual(
            edge?.arrows.map((a) => [a.end, a.shape]),
            [["target", "triangle"]],
        );
    });

    it("keeps a small pointed head as thin as a wide line across its slanted sides", () => {
        // yEd Live's 8 x 6 head on a 5 px line: 5.6 thick and within the box a line-wide square has at 45 degrees
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 500, 300, 20],
            ],
            [
                stroked(
                    [
                        [120, 300],
                        [472, 300],
                    ],
                    5,
                ),
                filled(
                    [
                        [480, 300],
                        [472, 303],
                        [472, 297],
                        [480, 300],
                    ],
                    INK,
                ),
            ],
        );
        assert.deepEqual(
            edge?.arrows.map((a) => [a.end, a.shape]),
            [["target", "triangle"]],
        );
    });

    it("takes no group title bar across the sheet for a head", () => {
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 500, 300, 20],
            ],
            [
                stroked(
                    [
                        [120, 300],
                        [480, 300],
                    ],
                    1,
                ),
                filled(
                    [
                        [10, 301],
                        [790, 301],
                        [790, 305],
                        [10, 305],
                        [10, 301],
                    ],
                    OTHER,
                ),
            ],
        );
        assert.deepEqual(edge?.arrows, []);
    });

    it("keeps a line's own head at its end when it lies over a small node's center", () => {
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 500, 300, 20],
                ["m", 430, 300, 4],
            ],
            [
                stroked(
                    [
                        [120, 300],
                        [380, 300],
                    ],
                    2,
                ),
                filled(
                    [
                        [480, 300],
                        [380, 330],
                        [380, 270],
                        [480, 300],
                    ],
                    HEAD,
                ),
            ],
        );
        assert.deepEqual(
            edge?.arrows.map((a) => [a.end, a.color]),
            [["target", HEAD]],
        );
    });

    it("gives a barb whose box holds both ends of a short line to the end its outline meets", () => {
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 173, 300, 20],
            ],
            [
                stroked(
                    [
                        [120, 300],
                        [153, 300],
                    ],
                    2,
                ),
                filled(
                    [
                        [153, 300],
                        [115, 340],
                        [150, 340],
                        [153, 300],
                    ],
                    HEAD,
                ),
            ],
        );
        assert.deepEqual(
            edge?.arrows.map((a) => [a.end, a.color]),
            [["target", HEAD]],
        );
    });

    it("puts a line's own head first at its end, ahead of one only near it", () => {
        const edge = readEdge(
            [
                ["s", 100, 300, 20],
                ["t", 500, 300, 20],
            ],
            [
                filled(
                    [
                        [478, 306],
                        [462, 312],
                        [462, 300],
                        [478, 306],
                    ],
                    OTHER,
                ),
                stroked(
                    [
                        [120, 300],
                        [460, 300],
                    ],
                    2,
                ),
                filled(
                    [
                        [480, 300],
                        [460, 306],
                        [460, 294],
                        [480, 300],
                    ],
                    HEAD,
                ),
            ],
        );
        assert.strictEqual(edge?.arrows.find((a) => a.end === "target")?.color, HEAD);
    });

    it("reads a flat diamond along its own axis, not a line end a few degrees off it", () => {
        // cx-syn-mappings 342->345: a zigzag's fitted axis ends 8 px short of the head, 6 degrees off its axis
        const edge = readEdge(
            [
                ["s", 600, 490, 20],
                ["t", 750, 507, 26],
            ],
            [
                stroked(
                    [
                        [620, 492.3],
                        [714.64, 505.491],
                    ],
                    0.5,
                ),
                filled(
                    [
                        [721.677, 501.607],
                        [723.096, 505.15],
                        [721.113, 508.411],
                        [719.694, 504.868],
                        [721.677, 501.607],
                    ],
                    HEAD,
                ),
            ],
        );
        assert.strictEqual(edge?.arrows.find((a) => a.end === "target")?.shape, "diamond");
    });
});

describe("a head a few degrees off its line", () => {
    const square: Pt[] = [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
    ];

    it("reads a square as a box, its one corner for a tip beside its side", () => {
        for (const degrees of [3, 5]) {
            assert.strictEqual(arrowShapeOf(turned(square, degrees), [1, 0]), "box", `${String(degrees)} degrees`);
        }
    });

    it("still reads a wedge with its tip on the line as half an arrow", () => {
        const wedge: Pt[] = [
            [0, 0],
            [10, 0],
            [0, 8],
        ];
        assert.strictEqual(arrowShapeOf(wedge, [1, 0]), "half");
    });
});

describe("a hairline's line class", () => {
    it("reads alternating dashes and dots under the pixel floor as a dash-dot", () => {
        assert.strictEqual(dashClassOf([1.4, 1.17, 0.47, 1.17, 1.4, 1.17, 0.47, 1.17], 0.47), "dash-dot");
    });

    it("reads dots of one length under it as dotted, the line's last cut short by its end", () => {
        assert.strictEqual(dashClassOf([1, 1, 1, 1, 1, 1, 1, 1, 0.3, 1], 0.5), "dotted");
    });
});

describe("a border round a node that is not round", () => {
    /** A flat diamond's outline at a share of its way round, grown by a distance. */
    const diamondAt = (share: number, grow: number): Pt => {
        const corners: Pt[] = [
            [50 + grow * 3, 0],
            [0, 15 + grow],
            [-50 - grow * 3, 0],
            [0, -15 - grow],
        ];
        const at = (share % 1) * 4;
        const [p, q] = [corners[Math.floor(at)], corners[(Math.floor(at) + 1) % 4]];
        const t = at - Math.floor(at);
        return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const tick = ([x, y]: Pt): Pt[] => disc(x, y, 0.3);

    it("reads ticks drawn in turn on two rows as a double line", () => {
        const ticks = Array.from({ length: 480 }, (_, i) => tick(diamondAt(Math.floor(i / 2) / 240, (i % 2) * 2)));
        assert.strictEqual(outlinePaintedAsFill(ticks)?.dashClass, "double");
    });

    it("reads ticks drawn one after another on one row as dots", () => {
        const ticks = Array.from({ length: 60 }, (_, i) => tick(diamondAt(i / 60, 0)));
        assert.strictEqual(outlinePaintedAsFill(ticks)?.dashClass, "dotted");
    });

    /** A zigzag round a box, wider or taller than the other outline by what it swings past it. */
    const zigzag = (w: number, h: number): Pt[] => {
        const corner = (i: number): Pt => {
            const a = (i * 2 * Math.PI) / 24;
            const swing = i % 2 === 0 ? 1 : 0.7;
            return [w * swing * Math.cos(a), h * swing * Math.sin(a)];
        };
        return Array.from({ length: 24 * 12 }, (_, k): Pt => {
            const [p, q] = [corner(Math.floor(k / 12)), corner(Math.floor(k / 12) + 1)];
            const t = (k % 12) / 12;
            return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
        });
    };

    it("reads a zigzag's two outlines swinging past one another as one ring", () => {
        assert.strictEqual(outlinePaintedAsFill([zigzag(27, 16), zigzag(25, 19)])?.dashClass, "zigzag");
    });
});
