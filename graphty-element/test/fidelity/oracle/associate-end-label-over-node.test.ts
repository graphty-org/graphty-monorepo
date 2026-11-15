/**
 * An edge's end label drawn over its own end node (Cytoscape.js draws `source-label` at `source-text-offset` 0 by
 * default, so a short label sits on the node it leaves) is the edge's, not the node's: graphty draws no label for the
 * node, and the words are the ones graphty draws at that edge's end. Taken by the node, the edge went looking for
 * its words elsewhere and took the next edge's, and that edge the one after (cytoscapejs-specimen-edge-labels:
 * source-text-rotation-none judged against autorotate's turned label, autorotate against 45deg's).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt, type PText } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 36,
    h: 36,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
/** A straight line as a program's SVG draws it: one segment, two points. */
const straight = (a: Pt, b: Pt, n = 2): Pt[] =>
    Array.from({ length: n }, (_, i): Pt => [
        a[0] + ((b[0] - a[0]) * i) / (n - 1),
        a[1] + ((b[1] - a[1]) * i) / (n - 1),
    ]);
const words = (content: string, x: number, y: number, rotation = 0): PText => ({
    content,
    x,
    y,
    box: { x0: x - 8, y0: y - 6, x1: x + 8, y1: y + 6 },
    sizePx: 10,
    family: "DejaVu Sans",
    weight: 400,
    style: "normal",
    anchor: "middle",
    rotation,
    color: "#000000",
    opacity: 1,
});

describe("an end label drawn over its own node", () => {
    it("goes to the edge whose end it labels, not to the unlabeled node under it", () => {
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
        const line = (points: Pt[]): Prim =>
            prim({
                kind: "path",
                closed: false,
                points,
                fill: null,
                stroke: { color: "#505050", opacity: 1, width: 1.5, dash: null, dashClass: "solid" },
            });
        const text = (t: PText): Prim =>
            prim({ tag: "text", kind: "text", points: [], box: t.box, fill: null, text: t });
        // three edges a row apart, each from a node at x to one 76 px right and 40 px down; the labels: level on the
        // first source node, turned along the second edge just past its source node, turned 45 degrees on the third's
        const xs = [100, 212, 324];
        const nodes = xs.flatMap((x, i) => [node(`s${String(i)}`, x, 100), node(`t${String(i)}`, x + 76, 140)]);
        const g: PScene = {
            side: "graphty",
            width: 600,
            height: 400,
            background: "#ffffff",
            nodes,
            edges: xs.map((x, i): PEdge => ({
                id: `e${String(i)}`,
                source: `s${String(i)}`,
                target: `t${String(i)}`,
                points: straight([x + 16, 108], [x + 60, 132]),
                stroke: { color: "#505050", opacity: 1, width: 1.5, dash: null, dashClass: "solid" },
                arrows: [],
                label: words("Src", x + 4, 101, [0, 27.8, 45][i]),
            })),
            groups: [],
            texts: [],
            strays: [],
        };
        const prims = [
            ...nodes.map((n) => prim({ tag: "ellipse", points: disc(n.cx, n.cy, 18) })),
            ...xs.map((x) => line(straight([x + 16, 108], [x + 60, 132]))),
            text(words("Src", 104, 101)),
            text(words("Src", 216, 102, 27.8)),
            text(words("Src", 328, 101, 45)),
        ];
        const o = associate(prims, 600, 400, g).scene;
        assert.isNull(o.nodes.find((n) => n.id === "s0")?.label ?? null, "the unlabeled source node takes no words");
        const turned = Object.fromEntries(o.edges.map((e) => [e.id.split("#")[0], e.label?.rotation ?? null]));
        assert.deepEqual(
            o.edges.map((e) => [`${e.source}-${e.target}`, e.label?.rotation ?? null]).sort(),
            [
                ["s0-t0", 0],
                ["s1-t1", 27.8],
                ["s2-t2", 45],
            ],
            JSON.stringify(turned),
        );
    });
});
