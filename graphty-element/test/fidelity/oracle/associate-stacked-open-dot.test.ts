/**
 * A stacked head whose last part is an open dot (Graphviz's `normalnoneodot`, dot-real-depcruise): the dot's ring is
 * a closed outline with no fill, which a route drawn as a ring is too, and its outline ran longer than the edge's short
 * line, so the dot was read as the edge's line and the line as nothing. The line is the open path; the dot is a head.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

let index = 0;
function prim(over: Partial<Prim> & { points: Pt[] }): Prim {
    return {
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
    };
}
const ellipse = (x: number, y: number, rx: number, ry: number): Pt[] =>
    Array.from({ length: 48 }, (_, i): Pt => [
        x + rx * Math.cos((i * Math.PI) / 24),
        y + ry * Math.sin((i * Math.PI) / 24),
    ]);
const black = { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const node = (id: string, cx: number, cy: number, r: number): PNode => ({
    id,
    cx,
    cy,
    w: 2 * r,
    h: 2 * r,
    shape: "ellipse",
    fill: null,
    stroke: null,
    label: null,
});

describe("a short edge with an open dot in its head", () => {
    it("is read along its open line, the dot one of its heads", () => {
        index = 0;
        const prims: Prim[] = [
            prim({
                tag: "ellipse",
                points: ellipse(500, 100, 20, 10),
                stroke: black,
                hint: { role: "node", id: "s", key: "s" },
            }),
            prim({
                tag: "ellipse",
                points: ellipse(560, 100, 20, 10),
                stroke: black,
                hint: { role: "node", id: "t", key: "t" },
            }),
            // the line, 11.7 long
            prim({
                kind: "path",
                closed: false,
                points: [
                    [520, 100],
                    [531.7, 100],
                ],
                stroke: black,
                hint: { role: "edge", id: "s->t", key: "s->t" },
            }),
            // the normal at the target, 6 long
            prim({
                tag: "polygon",
                corners: 3,
                points: [
                    [534, 97.9],
                    [540, 100],
                    [534, 102.1],
                    [534, 97.9],
                ],
                fill: { color: "#000000", opacity: 1, gradient: null },
                stroke: black,
                hint: { role: "edge", id: "s->t", key: "s->t" },
            }),
            // the open dot behind it, 4.8 across: its outline (15) is longer than the line
            prim({
                tag: "ellipse",
                points: ellipse(531.7, 100, 2.4, 2.4),
                stroke: black,
                hint: { role: "edge", id: "s->t", key: "s->t" },
            }),
        ];
        const guide: PScene = {
            side: "graphty",
            width: 800,
            height: 200,
            background: null,
            nodes: [node("s", 500, 100, 20), node("t", 560, 100, 20)],
            edges: [{ id: "e", source: "s", target: "t", points: [], stroke: null, arrows: [], label: null }],
            groups: [],
            texts: [],
            strays: [],
        };
        const edge = associate(prims, 800, 200, guide).scene.edges[0];
        assert.closeTo(edge.points[0][0], 520, 0.01, "the route starts where the line does");
        assert.sameMembers(
            edge.arrows.map((a) => a.end),
            ["target", "target"],
        );
    });
});
