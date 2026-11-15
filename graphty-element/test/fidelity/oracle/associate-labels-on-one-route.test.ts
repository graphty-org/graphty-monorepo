/**
 * Two parallel edges a program draws over one another with one label between them (yEd stores no fan for them:
 * graphml-synthetic-edges n4 -> n5, n13 -> n14, n22 -> n23). The two lines lie within a hundredth of a pixel of each
 * other and differ only in where each stops for its arrowhead, so no place on the page tells which line the label
 * belongs to. The order does: yEd draws each edge whole, its line, its arrowhead and then its label. Read by the
 * nearest middle, the label went to the line that stopped shorter, and the pair was compared the wrong way round: a
 * bar against a standard head.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { compareOracle } from "./compare-oracle";
import {
    boxOfPoints,
    type PArrow,
    type PEdge,
    type PNode,
    type Prim,
    type PScene,
    type Pt,
    type PText,
} from "./primitives";

const STROKE = { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" as const };
const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "rect",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const NODES = [node("a", 100, 100), node("b", 400, 100), node("c", 100, 300), node("d", 400, 300)];
const words = (content: string, x: number, y: number): PText => ({
    content,
    x,
    y,
    box: { x0: x - 16, y0: y - 6, x1: x + 16, y1: y + 6 },
    sizePx: 10,
    family: "DejaVu Sans",
    weight: 400,
    style: "normal",
    anchor: "middle",
    rotation: 0,
    color: "#000000",
    opacity: 1,
});
const box = (cx: number, cy: number): Pt[] => [
    [cx - 20, cy - 20],
    [cx + 20, cy - 20],
    [cx + 20, cy + 20],
    [cx - 20, cy + 20],
    [cx - 20, cy - 20],
];
const guide = (edges: PEdge[]): PScene => ({
    side: "graphty",
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: NODES,
    edges,
    groups: [],
    texts: [],
    strays: [],
});
const guideEdge = (id: string, label: PText | null): PEdge => ({
    id,
    source: "a",
    target: "b",
    points: [
        [120, 100],
        [380, 100],
    ],
    stroke: STROKE,
    arrows: [],
    label,
});

/** Prims in document order: the nodes, then each of `drawn`, numbered as they come. */
const drawing = (drawn: (Pt[] | PText)[]): Prim[] => {
    const plain = {
        fill: null,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: null,
        corners: 0,
    };
    const bodies = NODES.map((n, index): Prim => ({
        ...plain,
        index,
        tag: "rect",
        kind: "shape",
        box: boxOfPoints(box(n.cx, n.cy)),
        points: box(n.cx, n.cy),
        closed: true,
        corners: 4,
        fill: n.fill,
    }));
    const rest = drawn.map((d, i): Prim => {
        const index = NODES.length + i;
        return Array.isArray(d)
            ? {
                  ...plain,
                  index,
                  tag: "path",
                  kind: "path",
                  box: boxOfPoints(d),
                  points: d,
                  closed: false,
                  stroke: STROKE,
              }
            : { ...plain, index, tag: "text", kind: "text", box: d.box, points: [], closed: false, text: d };
    });
    return [...bodies, ...rest];
};
const labelled = (scene: PScene): string[] => scene.edges.filter((e) => e.label !== null).map((e) => e.id);

describe("a label between two lines drawn over one another", () => {
    const full: Pt[] = [
        [120, 100],
        [380, 100],
    ];
    const short: Pt[] = [
        [120, 100],
        [372, 100],
    ];
    const g = guide([guideEdge("1", null), guideEdge("2", words("label 0", 250, 112))]);

    it("goes to the line drawn just before it, though the other's middle is nearer", () => {
        // the text sits under the short line's middle (246) and 4 px from the long one's (250): nearest would say short
        const label = words("label 0", 246, 112);
        const o = associate(drawing([short, full, label]), 600, 400, g).scene;
        assert.deepEqual(labelled(o), ["a->b#g1"]);
    });

    it("stays with its line when the other is drawn after the text", () => {
        const label = words("label 0", 250, 112);
        const o = associate(drawing([short, label, full]), 600, 400, g).scene;
        assert.deepEqual(labelled(o), ["a->b#g0"]);
    });

    it("still goes by place between lines a reader tells apart", () => {
        const low: Pt[] = [
            [120, 110],
            [380, 110],
        ];
        const high: Pt[] = [
            [120, 90],
            [380, 90],
        ];
        // the line drawn just before the text is the far one
        const o = associate(drawing([low, high, words("label 0", 250, 116)]), 600, 400, g).scene;
        assert.deepEqual(labelled(o), ["a->b#g0"]);
    });
});

describe("a bar stood back from one of two lines drawn over one another", () => {
    // yEd's crows_foot_one_mandatory on the long line: its bar stands where the other line stops for its own head
    const long: Pt[] = [
        [120, 100],
        [380, 100],
    ];
    const short: Pt[] = [
        [120, 100],
        [372, 100],
    ];
    const bar: Pt[] = [
        [372, 92],
        [372, 108],
    ];
    const g = guide([guideEdge("1", null), guideEdge("2", null)]);
    const capped = (scene: PScene): string[] => scene.edges.filter((e) => e.arrows.length > 0).map((e) => e.id);

    it("is the line's drawn before it, not the line that ends beside it", () => {
        assert.deepEqual(capped(associate(drawing([long, bar, short]), 600, 400, g).scene), ["a->b#g0"]);
    });

    it("is the later line's when that is the one drawn before it", () => {
        assert.deepEqual(capped(associate(drawing([long, short, bar]), 600, 400, g).scene), ["a->b#g1"]);
    });
});

describe("the comparison of such a pair once each label is on its line", () => {
    const head = (shape: PArrow["shape"]): PArrow => ({
        end: "target",
        length: 12,
        width: 10,
        filled: true,
        shape,
        color: "#000000",
    });
    const edge = (id: string, shape: PArrow["shape"], label: PText | null): PEdge => ({
        ...guideEdge(id, label),
        arrows: [head(shape)],
    });
    const label = words("label 0", 250, 112);
    const oracle: PScene = {
        ...guide([edge("a->b#g0", "diamond", null), edge("a->b#g1", "triangle", label)]),
        side: "oracle",
    };

    it("passes graphty's drawing of the same two heads", () => {
        const g = guide([edge("1", "diamond", null), edge("2", "triangle", label)]);
        assert.strictEqual(compareOracle("t", oracle, g).properties["edge.arrowShape"].passRate, 1);
    });

    it("still fails graphty's drawing with the two heads swapped", () => {
        const g = guide([edge("1", "triangle", null), edge("2", "diamond", label)]);
        assert.strictEqual(compareOracle("t", oracle, g).properties["edge.arrowShape"].passRate, 0);
    });
});
