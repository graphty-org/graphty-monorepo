/**
 * The oracle association where nothing in the drawing names a node: json-vis-siblings stores no positions and
 * vis-network hides its labels at that zoom, so graphty and vis-network each lay the graph out their own way and only
 * vis-network's own account of where it drew each node (`drawn` in the oracle's metadata) can tell its bodies apart.
 * Without it the drawings' extents paired bodies by chance, and the fit through those chance pairs called the
 * layouts related.
 */
import { assert, describe, it } from "vitest";

import { associate, nameDrawnNodes } from "./associate";
import { boxOfPoints, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const body = (index: number, cx: number, cy: number, color: string): Prim => ({
    index,
    tag: "path",
    kind: "shape",
    points: disc(cx, cy, 10),
    box: boxOfPoints(disc(cx, cy, 10)),
    closed: true,
    corners: 0,
    fill: { color, opacity: 1, gradient: null },
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
});
const node = (id: string, cx: number, cy: number, color: string): PNode => ({
    id,
    cx,
    cy,
    w: 20,
    h: 20,
    shape: "ellipse",
    fill: { color, opacity: 1, gradient: null },
    stroke: null,
    label: null,
});

// the program drew a (pink) on the left and b (blue) on the right; graphty's own layout put them the other way round
const prims = [body(0, 100, 100, "#ffb6c1"), body(1, 300, 100, "#add8e6"), body(2, 200, 300, "#ffb6c1")];
const guide: PScene = {
    side: "graphty",
    width: 400,
    height: 400,
    background: "#ffffff",
    nodes: [node("a", 300, 100, "#ffb6c1"), node("b", 100, 100, "#add8e6"), node("c", 200, 300, "#ffb6c1")],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
};
const drawn = {
    nodes: [
        { id: "a", x: 100, y: 100, w: 20, h: 20 },
        { id: "b", x: 300, y: 100, w: 20, h: 20 },
        { id: "c", x: 200, y: 300, w: 20, h: 20 },
    ],
};

describe("oracle nodes no id or label names", () => {
    it("pairs no body by the extents when graphty laid the graph out itself", () => {
        // the extents alone pair a with the blue body on the right: chance, not identity
        const chance = associate(prims, 400, 400, guide).scene.nodes.find((n) => n.id === "a");
        assert.strictEqual(chance?.fill?.color, "#add8e6");
        const own = associate(prims, 400, 400, guide, { ownLayout: true });
        assert.deepEqual(own.scene.nodes, []);
        assert.strictEqual(own.guide, null);
    });

    it("names each body by where the program says it drew the node", () => {
        const { scene, method } = associate(nameDrawnNodes(prims, drawn), 400, 400, guide, { ownLayout: true });
        assert.strictEqual(method, "markup");
        assert.deepEqual(
            scene.nodes.map((n) => [n.id, n.cx, n.fill?.color]),
            [
                ["a", 100, "#ffb6c1"],
                ["b", 300, "#add8e6"],
                ["c", 200, "#ffb6c1"],
            ],
        );
    });

    it("leaves a shape not centered on a drawn node, or larger than its box, unnamed", () => {
        const off = body(3, 130, 100, "#000000");
        const big = { ...body(4, 200, 300, "#000000"), box: { x0: 150, y0: 250, x1: 250, y1: 350 } };
        const named = nameDrawnNodes([off, big], drawn);
        assert.deepEqual(
            named.map((p) => p.hint),
            [null, null],
        );
    });
});
