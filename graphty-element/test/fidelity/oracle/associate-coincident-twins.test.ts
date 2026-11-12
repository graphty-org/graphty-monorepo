/**
 * Nodes drawn on one spot (json-cyjs-tokyo: stations of two lines that share a name and a position, Cytoscape.js
 * drawing both discs on one spot). Each oracle shape there is one node's: a second disc drawn like the first is never
 * the first one's outline, so a node graphty leaves out is not hidden inside its twin (#4264); which twin takes which
 * shape goes by id, not by sub-pixel noise of the fit (#5506); and both twins stay drawn when graphty shows both.
 */
import { assert, describe, it } from "vitest";

import { associate, withoutCovered } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const fillOf = (color: string): NonNullable<Prim["fill"]> => ({ color, opacity: 1, gradient: null });
const strokeOf = (color: string): NonNullable<Prim["stroke"]> => ({
    color,
    opacity: 1,
    width: 0.5,
    dash: null,
    dashClass: "solid",
});
// six large nodes frame the drawing; the small ones under test sit between them
const FRAME: [string, number, number, number][] = [
    ["a", 100, 100, 40],
    ["b", 300, 100, 40],
    ["c", 500, 100, 40],
    ["d", 100, 300, 40],
    ["e", 300, 300, 40],
    ["f", 500, 300, 40],
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
    fill: fillOf("#ffffff"),
    stroke: null,
    label: null,
});
const guideOf = (nodes: [string, number, number, number][]): PScene => ({
    side: "graphty",
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: [...FRAME, ...nodes].map(node),
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});
const shape = (index: number, [x, y, size]: [number, number, number], paint: Pick<Prim, "fill" | "stroke">): Prim => {
    const points = disc(x, y, size / 2);
    return {
        index,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(points),
        closed: true,
        corners: 0,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        points,
        ...paint,
    };
};
const framePrims = (): Prim[] =>
    FRAME.map(([, x, y, size], i) => shape(i, [x, y, size], { fill: fillOf("#ffffff"), stroke: null }));
const nodeAt = (scene: PScene, id: string): PNode | undefined => scene.nodes.find((n) => n.id === id);

describe("nodes drawn on one spot", () => {
    it("gives each of two discs on one spot to its own node, by id whichever is a hair nearer", () => {
        // the disc drawn last, on top, goes to the first node by id, however graphty's twins sit a hundredth of a pixel
        // apart
        for (const qOff of [-0.004, 0.004]) {
            const prims = [
                ...framePrims(),
                shape(6, [400, 200, 2.8], { fill: fillOf("#ffffff"), stroke: null }),
                shape(7, [400, 200, 2.8], { fill: fillOf("#ffffff"), stroke: null }),
            ];
            const o = associate(
                prims,
                600,
                400,
                guideOf([
                    ["p", 400, 200, 2.8],
                    ["q", 400, 200 + qOff, 2.8],
                ]),
            ).scene;
            assert.strictEqual(nodeAt(o, "p")?.order, 7, `p, q off by ${String(qOff)}`);
            assert.strictEqual(nodeAt(o, "q")?.order, 6, `q, q off by ${String(qOff)}`);
        }
    });

    it("leaves the disc of a node graphty does not draw out of its neighbour's node", () => {
        // json-cyjs-tokyo's planted "one node deleted": the deleted station's disc, 0.9 px off its twin's, was taken
        // for the twin's outline and the twin read 3.7 px across, so nothing missed it
        const prims = [
            ...framePrims(),
            shape(6, [400, 200, 2.8], { fill: fillOf("#ffffff"), stroke: null }),
            shape(7, [400.9, 200, 2.8], { fill: fillOf("#ffffff"), stroke: null }),
        ];
        const o = associate(prims, 600, 400, guideOf([["p", 400, 200, 2.8]])).scene;
        assert.approximately(nodeAt(o, "p")?.w ?? 0, 2.8, 0.05);
    });

    it("gives each of two nodes on one spot, each a fill and an outline, its own outline", () => {
        const prims = [
            ...framePrims(),
            shape(6, [400, 200, 10], { fill: fillOf("#ffffff"), stroke: null }),
            shape(7, [400, 200, 10], { fill: null, stroke: strokeOf("#000000") }),
            shape(8, [400, 200, 10], { fill: fillOf("#ffffff"), stroke: null }),
            shape(9, [400, 200, 10], { fill: null, stroke: strokeOf("#000000") }),
        ];
        const o = associate(
            prims,
            600,
            400,
            guideOf([
                ["p", 400, 200, 10],
                ["q", 400, 200, 10],
            ]),
        ).scene;
        // each body with the outline drawn next to it, the one on top to the first node by id
        assert.strictEqual(nodeAt(o, "p")?.order, 9);
        assert.strictEqual(nodeAt(o, "q")?.order, 7);
        assert.approximately(nodeAt(o, "p")?.stroke?.width ?? 0, 0.5, 0.01);
    });

    it("still reads a fill painted over a node's body in another color as part of the node", () => {
        // Cytoscape.js's background-blacken: the body, then the same shape in black at half opacity over it
        const prims = [
            ...framePrims(),
            shape(6, [400, 200, 10], { fill: fillOf("#c8c8c8"), stroke: null }),
            shape(7, [400, 200, 10], { fill: { color: "#000000", opacity: 0.5, gradient: null }, stroke: null }),
        ];
        const o = associate(prims, 600, 400, guideOf([["p", 400, 200, 10]])).scene;
        assert.strictEqual(nodeAt(o, "p")?.order, 7);
        assert.lengthOf(o.strays, 0);
    });

    it("still reads a double border, two lines of one color and size, as the node's", () => {
        const prims = [
            ...framePrims(),
            shape(6, [400, 200, 10], { fill: fillOf("#c8c8c8"), stroke: null }),
            shape(7, [400, 200, 10], { fill: null, stroke: { ...strokeOf("#505050"), width: 3 } }),
            shape(8, [400, 200, 10], { fill: null, stroke: strokeOf("#505050") }),
        ];
        const o = associate(prims, 600, 400, guideOf([["p", 400, 200, 10]])).scene;
        assert.strictEqual(nodeAt(o, "p")?.order, 8);
        assert.lengthOf(o.strays, 0);
    });

    it("gives a node drawn twice a fifth of a pixel apart the drawing on top, and leaves the one under it free", () => {
        // cx2-wp1449-tlr's IFNA2: an outline and a fill, then the same 0.22 px lower with its label
        const under: [number, number, number] = [400, 200, 10];
        const top: [number, number, number] = [400, 200.22, 10];
        const prims = [
            ...framePrims(),
            shape(6, under, { fill: null, stroke: strokeOf("#000000") }),
            shape(7, under, { fill: fillOf("#ffffff"), stroke: null }),
            shape(8, top, { fill: null, stroke: strokeOf("#000000") }),
            shape(9, top, { fill: fillOf("#ffffff"), stroke: null }),
        ];
        const o = associate(prims, 600, 400, guideOf([["p", 400, 200, 10]])).scene;
        assert.approximately(nodeAt(o, "p")?.cy ?? 0, 200.22, 0.01);
        assert.approximately(nodeAt(o, "p")?.h ?? 0, 10, 0.05);
        assert.strictEqual(nodeAt(o, "p")?.order, 9);
    });
});

describe("a node covered by its twin on one spot", () => {
    const at = (id: string, order: number): PNode => ({ ...node([id, 400, 200, 2.8]), order });
    const scene: PScene = { ...guideOf([]), side: "oracle", nodes: [at("p", 6), at("q", 7)] };

    it("stays drawn when graphty shows both twins", () => {
        const guide = guideOf([
            ["p", 400, 200, 2.8],
            ["q", 400, 200, 2.8],
        ]);
        assert.deepEqual(
            withoutCovered(scene, guide).nodes.map((n) => n.id),
            ["p", "q"],
        );
    });

    it("is covered when graphty hides it", () => {
        const guide = guideOf([["q", 400, 200, 2.8]]);
        assert.deepEqual(
            withoutCovered(scene, guide).nodes.map((n) => n.id),
            ["q"],
        );
    });
});

describe("two lines drawn one over the other between the same nodes, their labels on one spot", () => {
    const words = (content: string, x: number, y: number): NonNullable<Prim["text"]> => ({
        content,
        x,
        y,
        box: { x0: x - 8, y0: y - 4, x1: x + 8, y1: y + 4 },
        sizePx: 8,
        family: "DejaVu Sans",
        weight: 400,
        style: "normal",
        anchor: "middle",
        rotation: 0,
        color: "#000000",
        opacity: 1,
    });
    const line = (index: number, from: Pt, to: Pt): Prim => ({
        index,
        tag: "path",
        kind: "path",
        box: boxOfPoints([from, to]),
        closed: false,
        corners: 0,
        fill: null,
        stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
        text: null,
        markers: { start: false, end: false },
        hint: null,
        points: [from, to],
    });
    const text = (index: number, content: string, dy: number): Prim => {
        const t = words(content, 400, 200 + dy);
        return { ...line(index, [0, 0], [0, 0]), tag: "text", kind: "text", box: t.box, stroke: null, text: t };
    };
    const guideEdge = (id: string, source: string, target: string, label: string): PScene["edges"][number] => ({
        id,
        source,
        target,
        points: [],
        stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
        arrows: [],
        label: words(label, 400, 200),
    });

    it("gives each line the words graphty draws on that very edge, however a hair nearer the other's are", () => {
        // json-cyjs-tokyo's 7634 -> 7635 (Toei Mita line) and 7635 -> 7634 (Namboku line), drawn on one route
        for (const dy of [-0.01, 0.01]) {
            const prims = [
                ...framePrims(),
                shape(6, [360, 200, 10], { fill: fillOf("#ffffff"), stroke: null }),
                shape(7, [440, 200, 10], { fill: fillOf("#ffffff"), stroke: null }),
                line(8, [365, 200], [435, 200]),
                line(9, [435, 200], [365, 200]),
                text(10, "Namboku", 0),
                text(11, "Mita", dy),
            ];
            const guide: PScene = {
                ...guideOf([
                    ["m", 360, 200, 10],
                    ["n", 440, 200, 10],
                ]),
                edges: [guideEdge("e1", "m", "n", "Mita"), guideEdge("e2", "n", "m", "Namboku")],
            };
            const o = associate(prims, 600, 400, guide).scene;
            for (const e of o.edges) {
                const want = e.source === "m" ? "Mita" : "Namboku";
                assert.strictEqual(e.label?.content, want, `${e.source} -> ${e.target}, dy ${String(dy)}`);
            }
            assert.lengthOf(o.edges, 2);
        }
    });
});
