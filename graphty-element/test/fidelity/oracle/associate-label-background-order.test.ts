/**
 * Which label a box behind words belongs to. A background is painted before its words, so a box drawn over a label's
 * words is not that label's: yEd's `sides` model sets label-sides-e's words to the right of its node, under the box
 * label-sides-w's label is drawn on to the left of the next node (graphml-synthetic-nodes), and the comparator gave the
 * box to the label drawn first. A band a label sits on runs its node's whole width, as a group's does: a closed yEd
 * group, drawn as a node (yed-graphml-specimen-groups group-closed), had its band read as nothing. A head drawn over
 * part of a label that has a tighter box of its own is no box behind it (cx2-syn-mappings 423: the square head of
 * 408->423 was its background, the real one a stray), and words graphty draws as a text of their own are no label of
 * the unlabelled box they lie in (cx2-wp1449-tlr's "Peptidoglycan(G+)" over group box 136935).
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { boxOfPoints, type PBox, type PNode, type Prim, type PScene, type Pt, type PText } from "./primitives";

let index = 0;
const rect = ({ x0, y0, x1, y1 }: PBox): Pt[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
];
const shape = (b: PBox, over: Partial<Prim>): Prim => ({
    index: index++,
    tag: "rect",
    kind: "shape",
    box: boxOfPoints(rect(b)),
    points: rect(b),
    closed: true,
    corners: 4,
    fill: null,
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
    ...over,
});
const words = (content: string, box: PBox): PText => ({
    content,
    x: (box.x0 + box.x1) / 2,
    y: (box.y0 + box.y1) / 2,
    box,
    sizePx: 11.4,
    family: "sans-serif",
    weight: 400,
    style: "normal",
    anchor: "start",
    rotation: 0,
    color: "#000000",
    opacity: 1,
});
const text = (t: PText): Prim => shape(t.box, { kind: "text", tag: "text", closed: false, text: t });
const paint = (color: string) => ({ color, opacity: 1, gradient: null });
const node = (id: string, b: PBox, label: PText | null): PNode => ({
    id,
    cx: (b.x0 + b.x1) / 2,
    cy: (b.y0 + b.y1) / 2,
    w: b.x1 - b.x0,
    h: b.y1 - b.y0,
    shape: "rect",
    fill: paint("#c0c0c0"),
    stroke: null,
    label,
});
const anchors: [string, PBox][] = [
    ["a", { x0: 100, y0: 600, x1: 130, y1: 630 }],
    ["b", { x0: 900, y0: 700, x1: 930, y1: 730 }],
];
const guideOf = (nodes: PNode[]): PScene => ({
    side: "graphty",
    width: 1200,
    height: 900,
    background: "#ffffff",
    nodes: [...anchors.map(([id, b]) => node(id, b, null)), ...nodes],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("a label's background box", () => {
    it("is the label drawn over it, not the one beside it drawn under it", () => {
        index = 0;
        const eBody = { x0: 196, y0: 218, x1: 243, y1: 246 };
        const wBody = { x0: 286, y0: 218, x1: 333, y1: 246 };
        const eWords = words("sides:e", { x0: 225, y0: 226, x1: 266, y1: 239 });
        const wWords = words("sides:w", { x0: 238, y0: 226, x1: 281, y1: 239 });
        const yellow = paint("#ffff99");
        const prims = [
            ...anchors.map(([, b]) => shape(b, { fill: paint("#c0c0c0") })),
            shape(eBody, { fill: paint("#c0c0c0") }),
            text(eWords),
            shape(wBody, { fill: paint("#ff6600") }),
            shape({ x0: 236, y0: 224, x1: 282, y1: 241 }, { fill: yellow }),
            text(wWords),
        ];
        const guide = guideOf([node("label-sides-e", eBody, eWords), node("label-sides-w", wBody, wWords)]);
        const { nodes } = associate(prims, 1200, 900, guide).scene;
        const label = (id: string): PText | null | undefined => nodes.find((n) => n.id === id)?.label;
        assert.strictEqual(label("label-sides-e")?.content, "sides:e");
        assert.isNotOk(label("label-sides-e")?.background);
        assert.deepEqual(label("label-sides-w")?.background?.fill, yellow);
    });

    it("is the band across a node a label is drawn on", () => {
        index = 0;
        const body = { x0: 420, y0: 103.5, x1: 500, y1: 153.5 };
        const t = words("Group", { x0: 444.7, y0: 106.8, x1: 475.1, y1: 117.8 });
        const band = paint("#ebebeb");
        const prims = [
            ...anchors.map(([, b]) => shape(b, { fill: paint("#c0c0c0") })),
            shape(body, { fill: paint("#f5f5f5") }),
            shape({ x0: 420, y0: 103.5, x1: 500, y1: 119.1 }, { fill: band }),
            text(t),
        ];
        const oracle = associate(prims, 1200, 900, guideOf([node("group-closed", body, t)])).scene.nodes.find(
            (n) => n.id === "group-closed",
        );
        assert.strictEqual(oracle?.fill?.color, "#f5f5f5");
        assert.deepEqual(oracle?.label?.background?.fill, band);
    });

    it("is the box fitted round the words, not a head drawn over part of them", () => {
        index = 0;
        const body = { x0: 905.9, y0: 669, x1: 958, y1: 685 };
        const t = words("M81", { x0: 890.3, y0: 673.6, x1: 905.4, y1: 680.6 });
        const cream = paint("#ffffcc");
        const square = paint("#972f2d");
        const route: Pt[] = [
            [115, 615],
            [895.5, 676.9],
        ];
        const prims = [
            ...anchors.map(([, b]) => shape(b, { fill: paint("#c0c0c0") })),
            shape(body, { fill: paint("#c04554") }),
            {
                ...shape(boxOfPoints(route), {}),
                kind: "path" as const,
                tag: "path",
                closed: false,
                points: route,
                stroke: { color: "#425d85", opacity: 1, width: 1, dash: null, dashClass: "solid" as const },
            },
            shape({ x0: 895.5, y0: 671.7, x1: 905.9, y1: 682.1 }, { fill: square }),
            shape({ x0: 890.3, y0: 673.7, x1: 905.4, y1: 681.1 }, { fill: cream }),
            text(t),
        ];
        const guide = guideOf([node("423", body, t)]);
        guide.edges.push({
            id: "a->423#g0",
            source: "a",
            target: "423",
            points: route,
            stroke: { color: "#425d85", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            arrows: [],
            label: null,
        });
        const { scene } = associate(prims, 1200, 900, guide);
        assert.deepEqual(scene.nodes.find((n) => n.id === "423")?.label?.background?.fill, cream);
        assert.strictEqual(scene.edges.find((e) => e.target === "423")?.arrows[0]?.color, square.color);
    });

    it("leaves an unlabelled box without the words graphty draws as a text of their own", () => {
        index = 0;
        const body = { x0: 12, y0: 188, x1: 105, y1: 263 };
        const t = words("Peptidoglycan(G+)", { x0: 21.6, y0: 193.3, x1: 80.4, y1: 202.3 });
        const prims = [
            ...anchors.map(([, b]) => shape(b, { fill: paint("#c0c0c0") })),
            shape(body, { fill: paint("#f0f0f0") }),
            text(t),
        ];
        const guide = { ...guideOf([node("136935", body, null)]), texts: [t] };
        const { scene } = associate(prims, 1200, 900, guide);
        assert.isNull(scene.nodes.find((n) => n.id === "136935")?.label ?? null);
        assert.include(
            scene.texts.map((x) => x.content),
            "Peptidoglycan(G+)",
        );
    });
});
