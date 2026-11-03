/**
 * A line the program draws for an arrow annotation is that annotation, not an edge, where graphty draws an arrow
 * annotation along it and one of its ends lands on no node's outline. Read as an edge between the nodes near its ends,
 * it made an edge the file does not have (cys-annotation-example: the "NAB2 upregulated" note's arrow, its tail 9 px
 * off node 169409, read as an edge 169409->169421 graphty was failed for not drawing) and left graphty's arrow with
 * nothing to pair with.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 20,
    h: 20,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const GREY = { color: "#999999", opacity: 1, width: 1, dash: null, dashClass: "solid" } as const;
const BLACK = { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" } as const;

describe("arrow annotations' lines", () => {
    const grid: [string, number, number][] = [
        ["a", 100, 100],
        ["b", 160, 80],
        ["c", 400, 300],
        ["d", 100, 300],
    ];
    // the note's line: from 11.6 px off a's outline to b's outline
    const noteLine: Pt[] = [
        [112, 82],
        [150, 80],
    ];
    const scene = (): Prim[] => {
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
        const line = (points: Pt[], stroke: typeof GREY | typeof BLACK): Prim =>
            prim({ kind: "path", closed: false, points, fill: null, stroke: { ...stroke } });
        return [
            ...grid.map(([, x, y]) => prim({ tag: "ellipse", points: disc(x, y, 10) })),
            line(
                [
                    [150.5, 83.2],
                    [109.5, 96.8],
                ],
                GREY,
            ),
            line(
                [
                    [390, 300],
                    [110, 300],
                ],
                GREY,
            ),
            line(noteLine, BLACK),
            // the note's arrowhead, drawn right after its line, at b's outline where the edge b-a starts
            prim({
                points: [
                    [144, 77],
                    [150, 80],
                    [144, 83],
                ],
                corners: 3,
                fill: { color: "#000000", opacity: 1, gradient: null },
            }),
        ];
    };
    const edge = (id: string, source: string, target: string, points: Pt[]): PEdge => ({
        id,
        source,
        target,
        points,
        stroke: { ...GREY },
        arrows: [],
        label: null,
    });
    const guide = (strays: PScene["strays"]): PScene => ({
        side: "graphty",
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: grid.map(([id, x, y]) => node(id, x, y)),
        edges: [
            edge("ba", "b", "a", [
                [160, 80],
                [100, 100],
            ]),
            edge("cd", "c", "d", [
                [400, 300],
                [100, 300],
            ]),
        ],
        groups: [],
        texts: [],
        strays,
    });

    it("leaves a line along an arrow annotation graphty draws as a stray, never an edge", () => {
        const o = associate(
            scene(),
            600,
            400,
            guide([
                {
                    index: 0,
                    tag: "annotation-arrow",
                    kind: "shape",
                    box: { x0: 108, y0: 79, x1: 150, y1: 82 },
                    fill: null,
                    stroke: null,
                    text: null,
                },
            ]),
        ).scene;
        assert.sameMembers(
            o.edges.map((e) => `${e.source}-${e.target}`),
            ["b-a", "c-d"],
        );
        assert.isTrue(o.strays.some((s) => s.stroke === BLACK.color && s.box.x0 === 112 && s.box.x1 === 150));
        // and its arrowhead is no arrowhead of the edge beside it
        assert.deepEqual(
            o.edges.flatMap((e) => e.arrows),
            [],
        );
        assert.isTrue(o.strays.some((s) => s.fill === BLACK.color && s.box.x0 === 144));
    });

    it("still reads the line as an edge where graphty draws no arrow annotation there", () => {
        const o = associate(scene(), 600, 400, guide([])).scene;
        // the planted defect: with no annotation to say otherwise, the note's line is taken for a second a-b edge
        assert.sameMembers(
            o.edges.map((e) => [e.source, e.target].sort().join("-")),
            ["a-b", "a-b", "c-d"],
        );
    });
});
