/**
 * Two yEd drawings the oracle's side read otherwise than graphty's (#7793): a node drawn as its picture alone (yEd's
 * SVG node) is read by its picture's bounds, a box, as graphty's side reads one; and lines a node draws inside its own
 * outline in the outline's paint, as one path in the outline's box (yEd Live's internal storage), are the node's own
 * lines, not its body, while a second outline drawn alike on the same spot still hides the first; and a shape with
 * a picture drawn over it on its spot is the node's body, the picture over it (Cytoscape.js's background image).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const GREY = { color: "#c8c8c8", opacity: 1, gradient: null };
const LINE = { color: "#505050", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const node = (id: string, cx: number, cy: number, w: number, h: number, shape: PNode["shape"]): PNode => ({
    id,
    cx,
    cy,
    w,
    h,
    shape,
    fill: GREY,
    stroke: LINE,
    label: null,
});
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
];

/**
 * The oracle's primitives, numbered in drawing order.
 * @returns a maker of primitives
 */
function drawing(): (over: Partial<Prim> & { points: Pt[] }) => Prim {
    let index = 0;
    return (over) => ({
        index: index++,
        tag: "path",
        kind: "shape",
        box: boxOfPoints(over.points),
        closed: true,
        corners: 4,
        fill: GREY,
        stroke: LINE,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        ...over,
    });
}
const CORNERS = [
    node("a", 40, 40, 20, 20, "rect"),
    node("b", 560, 40, 20, 20, "rect"),
    node("c", 40, 460, 20, 20, "rect"),
    node("d", 560, 460, 20, 20, "rect"),
];
const scene = (nodes: PNode[]): PScene => ({
    side: "graphty",
    width: 600,
    height: 500,
    background: "#ffffff",
    nodes,
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});
const cornerPrims = (p: ReturnType<typeof drawing>): Prim[] =>
    CORNERS.map((n) => p({ points: box(n.cx - 10, n.cy - 10, n.cx + 10, n.cy + 10) }));

describe("picture-only nodes and a node's own inner lines", () => {
    it("reads a node drawn as its picture alone as a box", () => {
        const p = drawing();
        const prims = [
            ...cornerPrims(p),
            p({ tag: "image", kind: "image", fill: null, stroke: null, points: box(280, 230, 320, 270) }),
        ];
        const guide = { ...node("svg", 300, 250, 40, 40, "rect"), fill: null, stroke: null, pictures: [] };
        const o = associate(prims, 600, 500, scene([...CORNERS, guide])).scene;
        assert.strictEqual(o.nodes.find((n) => n.id === "svg")?.shape, "rect");
    });

    it("reads a disc with a picture drawn over it as the disc, not the picture", () => {
        const p = drawing();
        const disc = Array.from({ length: 48 }, (_, i): Pt => [
            300.3 + 17 * Math.cos((i * Math.PI) / 24),
            250 + 17 * Math.sin((i * Math.PI) / 24),
        ]);
        const prims = [
            ...cornerPrims(p),
            p({ tag: "ellipse", corners: 0, points: disc }),
            // Cytoscape.js's background image, as wide as the disc and half as tall
            p({ tag: "image", kind: "image", fill: null, stroke: null, points: box(283, 241, 317, 259) }),
        ];
        const o = associate(prims, 600, 500, scene([...CORNERS, node("n", 300, 250, 34, 34, "ellipse")])).scene;
        const n = o.nodes.find((m) => m.id === "n");
        assert.strictEqual(n?.shape, "ellipse");
        assert.strictEqual(n?.fill?.color, GREY.color);
    });

    it("reads a box with inner lines drawn after it as a box, its lines its own", () => {
        const p = drawing();
        const prims = [
            ...cornerPrims(p),
            p({ points: box(272, 232, 328, 268) }),
            // yEd Live's internal storage: "M 282,232 L 282,268 M 272,242 L 328,242 M 282,232 Z", filled and stroked
            p({
                corners: 2,
                points: [
                    [282, 232],
                    [282, 268],
                    [272, 242],
                    [328, 242],
                    [282, 232],
                    [282, 232],
                ],
            }),
        ];
        const o = associate(prims, 600, 500, scene([...CORNERS, node("s", 300, 250, 56, 36, "rect")])).scene;
        assert.strictEqual(o.nodes.find((n) => n.id === "s")?.shape, "rect");
        assert.deepEqual(o.strays, []);
    });
});
