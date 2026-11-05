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

    it("reads two boxes of one size stacked a little under a box's height apart as two nodes", () => {
        // cx2-wp1449-tlr: WikiPathways labels 137067 and 137010, two 45.7 x 10.5 boxes about 9.6 px apart, within the twin
        // distance (0.2 of the size and half a pixel), were read as one node and its outline; the other was lost
        const box = (x: number, y: number, w: number, h: number): Pt[] => [
            [x - w / 2, y - h / 2],
            [x + w / 2, y - h / 2],
            [x + w / 2, y + h / 2],
            [x - w / 2, y + h / 2],
        ];
        const STACK: [string, number, number][] = [
            ["s", 200, 300],
            ["t", 200, 309.5],
        ];
        const rect = (id: string, x: number, y: number): PNode => ({
            ...node([id, x, y, 45.7]),
            shape: "rect",
            h: 10.5,
        });
        const stacked: PScene = {
            ...guide,
            nodes: [...guide.nodes.slice(0, 6), ...STACK.map(([id, x, y]) => rect(id, x, y))],
        };
        // each drawn as Cytoscape desktop draws a node: its fill, then its outline on the same spot
        const shapes: Prim[] = [
            ...prims.slice(0, 6),
            ...STACK.flatMap(([, x, y], i): Prim[] => {
                const points = box(x, y, 45.7, 10.5);
                const fill: Prim = { ...prims[0], index: 6 + 2 * i, box: boxOfPoints(points), corners: 4, points };
                const outline: Prim = {
                    ...fill,
                    index: 7 + 2 * i,
                    fill: null,
                    stroke: { color: "#000000", opacity: 1, width: 0.585, dash: null, dashClass: "solid" },
                };
                return [fill, outline];
            }),
        ];
        const o = associate(shapes, 600, 400, stacked).scene;
        for (const [id, , y] of STACK) {
            const n = o.nodes.find((m) => m.id === id);
            assert.isDefined(n, id);
            assert.approximately(n?.h ?? 0, 10.5, 0.05, `${id} height`);
            assert.approximately(n?.cy ?? 0, y, 0.05, `${id} middle`);
        }
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
    const drawnAt = (at: typeof AT): Prim[] =>
        at.flatMap(([, x, y, size, content], i): Prim[] => {
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
    const drawn = drawnAt(AT);

    it("gives each node the label drawn where its own label goes", () => {
        const o = associate(drawn, 600, 400, labelled).scene;
        for (const [id, , y, size] of AT.slice(6)) {
            const n = o.nodes.find((m) => m.id === id);
            assert.approximately(n?.label?.y ?? 0, labelAt(y, size), 0.01, id);
        }
    });

    it("does not let graphty's own wrong label offset pick the label of a twin four node sizes away", () => {
        // q is drawn 40 px above p and graphty sets both labels 40 px too high: graphty's offset would hand each node
        // its twin's label and hide graphty's placement error, so apart nodes go by their middles
        const apart = AT.map(([id, x, y, size, content]): [string, number, number, number, string] =>
            id === "q" ? [id, x, 160, size, content] : [id, x, y, size, content],
        );
        const wrong: PScene = {
            ...guide,
            nodes: apart.map(([id, x, y, size, content]) => ({
                ...node([id, x, y, size]),
                label: words(content, x, labelAt(y, size) - (id === "p" || id === "q" ? 40 : 0)),
            })),
        };
        const o = associate(drawnAt(apart), 600, 400, wrong).scene;
        for (const [id, , y, size] of apart.slice(6)) {
            const n = o.nodes.find((m) => m.id === id);
            assert.approximately(n?.label?.y ?? 0, labelAt(y, size), 0.01, id);
        }
    });
});
