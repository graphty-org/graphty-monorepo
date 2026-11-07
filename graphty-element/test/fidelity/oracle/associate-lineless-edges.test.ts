/**
 * An edge drawn with no line: Cytoscape desktop stops a line at its arrowheads' bases, so between two nodes nearer than
 * its heads' lengths it draws no line at all, only the heads. On cx-radiation-bibliography the circle heads of a blue
 * edge between two boxes 3.7 px apart are drawn alone, one after the other (at 148,727), and a green edge's triangle
 * head between two overlapping boxes is drawn alone (at 184,239), its tip on the target's outline though it points on
 * into the source. Each was left as unattached shapes, and graphty's edge there as one the program does not draw.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const BORDER = { color: "#999999", opacity: 1, width: 3.11, dash: null, dashClass: "solid" as const };
const WHITE = { color: "#ffffff", opacity: 1, gradient: null };
/** Boxes as Cytoscape drew them on cx-radiation-bibliography: four fixing the frame, then two pairs. */
const BOXES: [string, number, number, number, number][] = [
    ["a", 20, 20, 73.3, 32.5],
    ["b", 1100, 20, 1153.3, 32.5],
    ["c", 20, 850, 73.3, 862.5],
    ["d", 1100, 850, 1153.3, 862.5],
    ["p", 102.2, 712.7, 155.5, 725.2],
    ["q", 141.8, 728.9, 195.1, 741.3],
    ["r", 133.6, 230.6, 186.9, 243.0],
    ["s", 184.6, 234.6, 237.9, 247.0],
];
const node = ([id, x0, y0, x1, y1]: [string, number, number, number, number]): PNode => ({
    id,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    w: x1 - x0,
    h: y1 - y0,
    shape: "rect",
    fill: WHITE,
    stroke: BORDER,
    label: null,
});
const edge = (source: string, target: string, color: string): PEdge => ({
    id: `${source}->${target}`,
    source,
    target,
    points: [],
    stroke: { color, opacity: 1, width: 0.24, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 24 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 12),
        cy + r * Math.sin((i * Math.PI) / 12),
    ]);

describe("an edge drawn with no line, only its heads", () => {
    it("is read from its heads alone, between the nodes they touch", () => {
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
        const prims = [
            // the heads come first: Cytoscape desktop draws every edge before the nodes
            prim({ points: disc(148.08, 726.8, 1.3625), fill: { color: "#6699ff", opacity: 1, gradient: null } }),
            prim({ points: disc(149.24, 727.28, 1.3625), fill: { color: "#6699ff", opacity: 1, gradient: null } }),
            prim({
                corners: 3,
                points: [
                    [189.4009, 240.4492],
                    [184.0737, 238.666],
                    [189.6133, 237.7324],
                    [189.4009, 240.4492],
                ],
                fill: { color: "#009900", opacity: 1, gradient: null },
            }),
            ...BOXES.map(([, x0, y0, x1, y1]) =>
                prim({
                    corners: 4,
                    points: [
                        [x0, y0],
                        [x1, y0],
                        [x1, y1],
                        [x0, y1],
                        [x0, y0],
                    ],
                    fill: WHITE,
                    stroke: BORDER,
                }),
            ),
        ];
        const guide: PScene = {
            side: "graphty",
            width: 1200,
            height: 900,
            background: "#ffffff",
            nodes: BOXES.map(node),
            edges: [edge("q", "p", "#6699ff"), edge("r", "s", "#009900")],
            groups: [],
            texts: [],
            strays: [],
        };
        const o = associate(prims, 1200, 900, guide).scene;
        assert.deepEqual(o.strays, [], "no head is left unattached");
        assert.deepEqual(o.edges.map((e) => `${e.source}->${e.target}`).sort(), ["q->p", "r->s"]);
        const dots = o.edges.find((e) => e.target === "p");
        assert.deepEqual(dots?.arrows.map((a) => a.end).sort(), ["source", "target"]);
        const arrow = o.edges.find((e) => e.target === "s");
        assert.deepEqual(
            arrow?.arrows.map((a) => [a.end, a.shape]),
            [["target", "triangle"]],
        );
        assert.isNull(arrow?.stroke ?? null, "the program drew no line, so the line has no paint to judge");
    });
});
