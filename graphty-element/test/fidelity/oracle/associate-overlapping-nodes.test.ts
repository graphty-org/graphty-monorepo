/**
 * Two small nodes drawn almost on one another are two bodies, not one body and its outline (json-cyjs-tokyo: stations
 * of two lines 6 model units apart, drawn as 2.8 px discs 0.9 px apart, were read as one node 3.4 px across, so the
 * label Cytoscape.js set flush on the first disc's top read as inside the node and failed label.anchor on 70 nodes).
 * And two such nodes of one name each keep their own label: the station's name above each disc went to whichever
 * node's middle was nearer, which for a disc drawn just above its twin is the twin's label (71 tokyo labels swapped).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt, type PText } from "./primitives";

const FILL = { color: "#ffffff", opacity: 1, gradient: null };
const NODES: [string, number, number, number][] = [
    ["a", 100, 100, 40],
    ["b", 300, 100, 40],
    ["c", 500, 100, 40],
    ["d", 100, 300, 40],
    ["e", 300, 300, 40],
    ["f", 500, 300, 40],
    ["p", 400, 200, 2.8],
    ["q", 400.55, 200.7, 2.8],
];
const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = ([id, cx, cy, size]: [string, number, number, number]): PNode => ({
    id,
    cx,
    cy,
    w: size,
    h: size,
    shape: "ellipse",
    fill: FILL,
    stroke: null,
    label: null,
});
const guide: PScene = {
    side: "graphty",
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: NODES.map(node),
    edges: [],
    groups: [],
    texts: [],
    strays: [],
};
const prims: Prim[] = NODES.map(([, x, y, size], index) => {
    const points = disc(x, y, size / 2);
    return {
        index,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(points),
        closed: true,
        corners: 0,
        fill: FILL,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        points,
    };
});

describe("small nodes drawn almost on one another", () => {
    it("gives each disc to its own node", () => {
        const o = associate(prims, 600, 400, guide).scene;
        const at = new Map(o.nodes.map((n) => [n.id, n]));
        for (const id of ["p", "q"]) {
            const n = at.get(id);
            assert.isDefined(n, id);
            assert.approximately(n?.w ?? 0, 2.8, 0.05, `${id} width`);
            assert.approximately(n?.h ?? 0, 2.8, 0.05, `${id} height`);
        }
    });

    it("still reads a fill and its outline drawn as two shapes on one spot as one node", () => {
        const outline: Prim = {
            ...prims[6],
            index: prims.length,
            fill: null,
            stroke: { color: "#000000", opacity: 1, width: 0.5, dash: null, dashClass: "solid" },
        };
        const o = associate([...prims, outline], 600, 400, guide).scene;
        const p = o.nodes.find((n) => n.id === "p");
        assert.strictEqual(p?.stroke?.color, "#000000");
        assert.approximately(p?.w ?? 0, 2.8, 0.05);
    });
});

describe("two nodes of one name drawn close together", () => {
    // labels drawn above their nodes: a word's middle 11 px above a 10 px node's
    const words = (content: string, x: number, y: number): PText => ({
        content,
        x,
        y,
        box: { x0: x - 8, y0: y - 6, x1: x + 8, y1: y + 6 },
        sizePx: 10,
        family: "DejaVu Sans",
        weight: 400,
        style: "normal",
        anchor: "middle",
        rotation: 0,
        color: "#000000",
        opacity: 1,
    });
    const AT: [string, number, number, number, string][] = [
        ["a", 100, 100, 40, "A"],
        ["b", 300, 100, 40, "B"],
        ["c", 500, 100, 40, "C"],
        ["d", 100, 300, 40, "D"],
        ["e", 300, 300, 40, "E"],
        ["f", 500, 300, 40, "F"],
        // q is drawn 4 px above p: p's label is nearer q's middle than p's
        ["p", 400, 200, 10, "Same"],
        ["q", 400, 196, 10, "Same"],
    ];
    const labelAt = (cy: number, size: number): number => cy - size / 2 - 6;
    const labelled: PScene = {
        ...guide,
        nodes: AT.map(([id, x, y, size, content]) => ({
            ...node([id, x, y, size]),
            label: words(content, x, labelAt(y, size)),
        })),
    };
    const drawn: Prim[] = AT.flatMap(([, x, y, size, content], i): Prim[] => {
        const points = disc(x, y, size / 2);
        const base = {
            closed: true,
            corners: 0,
            stroke: null,
            markers: { start: false, end: false },
            hint: null,
        };
        const t = words(content, x, labelAt(y, size));
        return [
            {
                ...base,
                index: 2 * i,
                tag: "path",
                kind: "shape",
                box: boxOfPoints(points),
                fill: FILL,
                text: null,
                points,
            },
            { ...base, index: 2 * i + 1, tag: "text", kind: "text", box: t.box, fill: null, text: t, points: [] },
        ];
    });

    it("gives each node the label drawn where its own label goes", () => {
        const o = associate(drawn, 600, 400, labelled).scene;
        for (const [id, , y, size] of AT.slice(6)) {
            const n = o.nodes.find((m) => m.id === id);
            assert.approximately(n?.label?.y ?? 0, labelAt(y, size), 0.01, id);
        }
    });
});
