/**
 * An edge whose line lies wholly under its arrowhead: Graphviz runs a stub of a few pixels from the source toward the
 * tip under the head of a very short edge in a dense hub (dot-real-softmaint odfpr1_0_3t_18 -> 371187: a half-pixel
 * stub under a 10 px head). The head caps the end it points to, the target, and the route runs from the source toward
 * the tip; it was read as a head at the source, the route run backwards.
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

describe("an edge whose line lies wholly under its arrowhead", () => {
    it("is capped at the end its head points to, its route from the source toward the tip", () => {
        index = 0;
        const prims: Prim[] = [
            prim({
                tag: "ellipse",
                points: ellipse(286, 100, 4.32, 4.32),
                stroke: black,
                hint: { role: "node", id: "s", key: "s" },
            }),
            prim({
                tag: "ellipse",
                points: ellipse(330.2, 106.3, 31.58, 13.5),
                stroke: black,
                hint: { role: "node", id: "t", key: "t" },
            }),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [290.75, 100.68],
                    [291.21, 100.74],
                ],
                stroke: black,
                hint: { role: "edge", id: "s->t", key: "s->t" },
            }),
            prim({
                tag: "polygon",
                corners: 3,
                points: [
                    [288.86, 96.87],
                    [298.27, 101.75],
                    [287.88, 103.8],
                    [288.86, 96.87],
                ],
                fill: { color: "#000000", opacity: 1, gradient: null },
                stroke: black,
                hint: { role: "edge", id: "s->t", key: "s->t" },
            }),
        ];
        const guide: PScene = {
            side: "graphty",
            width: 400,
            height: 200,
            background: null,
            nodes: [node("s", 286, 100, 4), node("t", 330, 106, 30)],
            edges: [{ id: "e", source: "s", target: "t", points: [], stroke: null, arrows: [], label: null }],
            groups: [],
            texts: [],
            strays: [],
        };
        const edge = associate(prims, 400, 200, guide).scene.edges[0];
        assert.deepEqual(
            edge.arrows.map((a) => [a.end, a.shape]),
            [["target", "triangle"]],
        );
        const [first, last] = [edge.points[0], edge.points.at(-1) ?? edge.points[0]];
        assert.isBelow(first[0], last[0], "the route runs from the source toward the tip");
        assert.closeTo(last[0], 298.27, 0.01, "and ends at the tip");
    });
});
