/**
 * The oracle comparison's label and group checks on tiny hand-made pairs of drawings: each pair differs in one thing a
 * reader sees (a label at half opacity, in a serif face, on two lines, aligned left, at the start of its node, off its
 * edge's line, with a halo or a box behind it, a group box drawn a little off) and fails exactly that property, which
 * the comparator before these checks passed. And what the association must read as a label's or a node's own: a box
 * drawn behind a label's words, an underlay under a node.
 */
import { assert, describe, it } from "vitest";

import { associate, underlaysOf } from "./associate";
import {
    browserFontClass,
    compareOracle,
    labelAnchor,
    lineAlign,
    placeOnLine,
    programFontClass,
} from "./compare-oracle";
import {
    boxOfPoints,
    type PBox,
    type PEdge,
    type PFill,
    type PGroup,
    type PNode,
    type Prim,
    type PScene,
    type PStroke,
    type Pt,
    type PText,
} from "./primitives";

const fill = (color: string, opacity = 1): PFill => ({ color, opacity, gradient: null });
const stroke = (color: string, width = 2): PStroke => ({ color, opacity: 1, width, dash: null, dashClass: "solid" });
/** A label of `size` px, `w` wide, centered at (x, y). */
function text(content: string, x: number, y: number, over: Partial<PText> = {}, w = 30, size = 10): PText {
    return {
        content,
        x,
        y,
        box: { x0: x - w / 2, y0: y - size / 2, x1: x + w / 2, y1: y + size / 2 },
        sizePx: size,
        family: "DejaVu Sans",
        weight: 400,
        style: "normal",
        anchor: "middle",
        rotation: 0,
        color: "#000000",
        opacity: 1,
        ...over,
    };
}
const node = (id: string, cx: number, cy: number, over: Partial<PNode> = {}): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: fill("#cccccc"),
    stroke: null,
    label: null,
    ...over,
});
/** Six nodes on a grid, which fix the frame. */
const GRID: [string, number, number][] = [
    ["a", 100, 100],
    ["b", 300, 100],
    ["c", 500, 100],
    ["d", 100, 300],
    ["e", 300, 300],
    ["f", 500, 300],
];
function scene(side: PScene["side"], over: Partial<PScene> = {}, label: Partial<Record<string, PText>> = {}): PScene {
    return {
        side,
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: GRID.map(([id, x, y]) => node(id, x, y, { label: label[id] ?? null })),
        edges: [],
        groups: [],
        texts: [],
        strays: [],
        ...over,
    };
}
/** The properties under a full pass rate, and the elements failing each. */
function failures(o: PScene, g: PScene): Record<string, string[]> {
    return compareOracle("t", o, g).failures;
}
/** A label on node a, the same on both sides but for `over` on graphty's. */
function labelPair(over: Partial<PText>, oOver: Partial<PText> = {}): Record<string, string[]> {
    return failures(
        scene("oracle", {}, { a: text("A", 100, 100, oOver) }),
        scene("graphty", {}, { a: text("A", 100, 100, { ...oOver, ...over }) }),
    );
}

describe("label checks", () => {
    it("passes a label drawn alike on both sides", () => {
        assert.deepEqual(labelPair({}), {});
    });

    it("fails a label drawn at half the program's opacity", () => {
        assert.deepEqual(labelPair({ opacity: 0.5 }), { "label.opacity": ["a"] });
    });

    it("fails a Java font name graphty's browser cannot draw, which a serif face then stands in for", () => {
        assert.deepEqual(labelPair({ family: "Dialog" }, { family: "Dialog" }), { "label.family": ["a"] });
        assert.deepEqual(labelPair({ family: "Arial" }, { family: "Dialog.bold" }), {});
        assert.deepEqual(labelPair({ family: "Times New Roman" }), { "label.family": ["a"] });
        // a family the program names that no table knows is not told
        assert.deepEqual(labelPair({ family: "Nonesuch" }, { family: "Nonesuch" }), {});
    });

    it("resolves font families as the pinned fonts do", () => {
        assert.deepEqual(
            [
                "Helvetica,Arial,sans-serif",
                "ArialMT",
                "Calibri-Bold",
                "Dialog.bolditalic",
                "Courier New",
                "Lato",
                "Wingbat",
            ].map(programFontClass),
            ["sans-serif", "sans-serif", "sans-serif", "sans-serif", "monospace", "sans-serif", null],
        );
        assert.deepEqual(
            ["Dialog", "Wingbat, monospace", "Verdana", "SansSerif", "'DejaVu Serif'"].map(browserFontClass),
            ["serif", "monospace", "sans-serif", "serif", "serif"],
        );
    });

    it("fails a label wrapped onto two lines where the program drew one", () => {
        const two = [
            { x0: 85, y0: 90, x1: 115, y1: 100 },
            { x0: 85, y0: 100, x1: 115, y1: 110 },
        ];
        assert.deepEqual(labelPair({ content: "A\nB", lines: two }, { content: "A B" }), { "label.lines": ["a"] });
    });

    it("fails lines centered where the program aligned them left", () => {
        // two lines of different widths sharing their left edge
        const lines: PBox[] = [
            { x0: 85, y0: 90, x1: 115, y1: 100 },
            { x0: 85, y0: 100, x1: 100, y1: 110 },
        ];
        assert.strictEqual(lineAlign(text("A\nB", 100, 100, { lines })), "start");
        assert.isNull(lineAlign(text("A", 100, 100)));
        assert.deepEqual(labelPair({ align: "middle" }, { content: "A\nB", lines }), { "label.align": ["a"] });
        assert.deepEqual(labelPair({ align: "start" }, { content: "A\nB", lines }), {});
    });

    it("fails a label at the start of its node where the program centered it, a shift the offset check passes", () => {
        // 4 px left of center: within half a font size, but no longer centered on the 40 px node
        assert.deepEqual(labelPair({ x: 96, box: { x0: 81, y0: 95, x1: 111, y1: 105 } }), { "label.anchor": ["a"] });
        const box = { x0: 80, y0: 80, x1: 120, y1: 120 };
        assert.strictEqual(labelAnchor(text("A", 100, 100, {}, 20), box), "center/center");
        assert.strictEqual(labelAnchor(text("A", 100, 70), box), "center/before");
        assert.strictEqual(labelAnchor(text("A", 100, 114, {}, 20), box), "center/end");
        assert.strictEqual(labelAnchor(text("A", 130, 100, {}, 20), box), "after/center");
        // a label wider than its node on both sides sits across it, a few pixels of drift aside
        assert.strictEqual(labelAnchor(text("A", 94, 100, {}, 90), box), "center/center");
    });

    it("fails a halo graphty does not draw round the letters, and one of another color or width", () => {
        const halo = { color: "#ff0000", opacity: 1, width: 2 };
        assert.deepEqual(labelPair({ outline: null }, { outline: halo }), { "label.outline": ["a"] });
        assert.deepEqual(labelPair({ outline: { ...halo, color: "#0000ff" } }, { outline: halo }), {
            "label.outline": ["a"],
        });
        assert.deepEqual(labelPair({ outline: { ...halo, width: 4 } }, { outline: halo }), { "label.outline": ["a"] });
        assert.deepEqual(labelPair({}, { outline: halo }), {});
    });

    it("fails a box behind the words graphty does not draw, and one of another fill, size, shape or border", () => {
        const bg = {
            box: { x0: 83, y0: 93, x1: 117, y1: 107 },
            fill: fill("#ffff00"),
            stroke: null,
            shape: "rect" as const,
        };
        assert.deepEqual(labelPair({ background: null }, { background: bg }), { "label.background": ["a"] });
        assert.deepEqual(labelPair({ background: { ...bg, fill: fill("#ffff00", 0.4) } }, { background: bg }), {
            "label.background": ["a"],
        });
        assert.deepEqual(
            labelPair({ background: { ...bg, box: { x0: 73, y0: 88, x1: 127, y1: 112 } } }, { background: bg }),
            { "label.backgroundBox": ["a"] },
        );
        assert.deepEqual(labelPair({ background: { ...bg, shape: "roundrect" } }, { background: bg }), {
            "label.backgroundBox": ["a"],
        });
        assert.deepEqual(labelPair({ background: bg }, { background: { ...bg, stroke: stroke("#ff0000", 1) } }), {
            "label.backgroundBorder": ["a"],
        });
        assert.deepEqual(labelPair({}, { background: bg }), {});
    });
});

describe("edge label checks", () => {
    const edge = (label: PText | null): PEdge => ({
        id: "e1",
        source: "a",
        target: "b",
        points: [
            [120, 100],
            [280, 100],
        ],
        stroke: stroke("#0000ff"),
        arrows: [],
        label,
    });
    const pair = (o: PText, g: PText): Record<string, string[]> =>
        failures(scene("oracle", { edges: [edge(o)] }), scene("graphty", { edges: [edge(g)] }));

    it("passes an edge label drawn alike, and judges how it is drawn as a node's label is", () => {
        assert.deepEqual(pair(text("x", 200, 100), text("x", 200, 100)), {});
        assert.deepEqual(pair(text("x", 200, 100), text("x", 200, 100, { weight: 700 })), {
            "label.weight": ["edge:e1"],
        });
    });

    it("fails an edge label drawn above its line where the program drew it on the line", () => {
        assert.deepEqual(pair(text("x", 200, 100), text("x", 200, 88)), { "label.offLine": ["edge:e1"] });
        // the other side of the line is as wrong
        assert.deepEqual(pair(text("x", 200, 88), text("x", 200, 112)), { "label.offLine": ["edge:e1"] });
    });

    it("fails an edge label a quarter of the way along where the program drew it at the middle", () => {
        assert.deepEqual(pair(text("x", 200, 100), text("x", 160, 100)), { "label.alongLine": ["edge:e1"] });
    });

    it("measures a point's place along a line and its side", () => {
        const line: Pt[] = [
            [0, 0],
            [10, 0],
            [10, 10],
        ];
        assert.deepEqual(placeOnLine(line, [5, 2]), { s: 5, length: 20, d: 2 });
        assert.deepEqual(placeOnLine(line, [12, 5]), { s: 15, length: 20, d: -2 });
    });
});

describe("group checks", () => {
    const group = (box: PBox, over: Partial<PGroup> = {}): PGroup => ({
        id: "g1",
        box,
        fill: fill("#eeeeee"),
        stroke: stroke("#333333", 1),
        label: null,
        members: ["a", "b"],
        ...over,
    });
    const BOX = { x0: 60, y0: 60, x1: 340, y1: 140 };
    const pair = (o: PGroup, g: PGroup): Record<string, string[]> =>
        failures(scene("oracle", { groups: [o] }), scene("graphty", { groups: [g] }));

    it("passes a group box drawn alike", () => {
        assert.deepEqual(pair(group(BOX), group(BOX)), {});
    });

    it("fails a box whose one side is drawn off by a tenth, which an overlap of 0.8 passes", () => {
        assert.deepEqual(pair(group(BOX), group({ ...BOX, x1: 368 })), { "group.box": ["g1"] });
    });

    it("fails a group's outline color, line style and fill opacity", () => {
        assert.deepEqual(pair(group(BOX), group(BOX, { stroke: stroke("#ff0000", 1) })), { "group.stroke": ["g1"] });
        assert.deepEqual(pair(group(BOX), group(BOX, { stroke: { ...stroke("#333333", 1), dashClass: "dashed" } })), {
            "group.strokeDash": ["g1"],
        });
        assert.deepEqual(pair(group(BOX), group(BOX, { fill: fill("#eeeeee", 0.3) })), { "group.fillOpacity": ["g1"] });
    });

    it("judges a group's label as drawn, and where it sits against its box", () => {
        const top = text("G", 200, 70);
        assert.deepEqual(pair(group(BOX, { label: top }), group(BOX, { label: { ...top, sizePx: 20 } })), {
            "label.size": ["group:g1"],
        });
        assert.deepEqual(pair(group(BOX, { label: top }), group(BOX, { label: text("G", 200, 130) })), {
            "label.offset": ["group:g1"],
            "label.anchor": ["group:g1"],
        });
    });

    it("finds no group box under an annotation that overlaps it by under half", () => {
        const o = scene("oracle", { groups: [group(BOX)] });
        const g = scene("graphty", {
            strays: [
                {
                    index: 0,
                    tag: "annotation-shape",
                    kind: "shape",
                    box: { ...BOX, x1: 180 },
                    fill: null,
                    stroke: null,
                    text: null,
                },
            ],
        });
        assert.deepEqual(compareOracle("t", o, g).failures["group.present"], ["g1"]);
    });
});

describe("what the association reads as a label's own and a node's own", () => {
    let index = 0;
    const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
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
    });
    const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
    ];
    const circle = (x: number, y: number, r: number): Pt[] =>
        Array.from({ length: 24 }, (_, i): Pt => [
            x + r * Math.cos((i * Math.PI) / 12),
            y + r * Math.sin((i * Math.PI) / 12),
        ]);
    /** The oracle's drawing of the grid, with `extra(id, x, y)` drawn before each node's body and label. */
    function drawing(extra: (id: string, x: number, y: number) => Prim[]): Prim[] {
        index = 0;
        return GRID.flatMap(([id, x, y]) => {
            const t = text(id.toUpperCase(), x, y);
            return [
                ...extra(id, x, y),
                prim({ tag: "ellipse", points: circle(x, y, 20), fill: fill("#cccccc") }),
                prim({ tag: "text", kind: "text", points: [], closed: false, box: t.box, text: t }),
            ];
        });
    }
    const guide = scene(
        "graphty",
        {},
        Object.fromEntries(GRID.map(([id, x, y]) => [id, text(id.toUpperCase(), x, y)])),
    );

    it("reads a box drawn tight behind a label's words as its background, not a stray", () => {
        const prims = drawing(() => []);
        // a yellow box behind a's words, drawn just before them
        const t = prims.findIndex((p) => p.text?.content === "A");
        prims.splice(t, 0, prim({ tag: "rect", corners: 4, points: rect(82, 93, 118, 107), fill: fill("#ffff00") }));
        const { scene: o } = associate(prims, 600, 400, guide);
        const a = o.nodes.find((n) => n.id === "a");
        assert.strictEqual(a?.label?.background?.fill?.color, "#ffff00");
        assert.strictEqual(a?.label?.background?.shape, "rect");
        assert.lengthOf(o.strays, 0);
        assert.deepEqual(compareOracle("t", o, guide).failures, { "label.background": ["a"] });
    });

    it("reads a box behind an edge label near the edge's end as the label's background, not an arrowhead", () => {
        const prims = drawing(() => []);
        prims.push(
            prim({
                kind: "path",
                closed: false,
                points: [
                    [120, 100],
                    [280, 100],
                ],
                stroke: stroke("#555555", 1),
            }),
            prim({ tag: "path", corners: 4, points: rect(240, 94, 276, 106), fill: fill("#ffff00") }),
        );
        const t = text("lbl", 258, 100);
        prims.push(prim({ tag: "text", kind: "text", points: [], closed: false, box: t.box, text: t }));
        const withEdge: PScene = {
            ...guide,
            edges: [
                {
                    id: "e1",
                    source: "a",
                    target: "b",
                    points: [
                        [120, 100],
                        [280, 100],
                    ],
                    stroke: stroke("#555555", 1),
                    arrows: [],
                    label: text("lbl", 258, 100),
                },
            ],
        };
        const { scene: o } = associate(prims, 600, 400, withEdge);
        const [e] = o.edges;
        assert.deepEqual([e.arrows.length, e.label?.background?.fill?.color], [0, "#ffff00"]);
    });

    it("leaves a box graphty draws as an annotation round a label to that annotation", () => {
        const prims = drawing(() => []);
        prims.push(prim({ tag: "rect", corners: 4, points: rect(82, 93, 118, 107), fill: fill("#ffff00") }));
        const annotated: PScene = {
            ...guide,
            strays: [
                {
                    index: 0,
                    tag: "annotation-shape",
                    kind: "shape",
                    box: { x0: 82, y0: 93, x1: 118, y1: 107 },
                    fill: null,
                    stroke: null,
                    text: null,
                },
            ],
        };
        const { scene: o } = associate(prims, 600, 400, annotated);
        assert.isNull(o.nodes.find((n) => n.id === "a")?.label?.background ?? null);
        assert.lengthOf(o.strays, 1);
    });

    it("leaves an underlay out of a node's body, its size and its fill", () => {
        const under = (): Prim => prim({ tag: "ellipse", points: circle(100, 100, 28), fill: fill("#00ff00", 0.5) });
        const prims = drawing((id) => (id === "a" ? [under()] : []));
        const body = prims.find((p) => p.tag === "ellipse" && p.fill?.color === "#cccccc");
        assert.isDefined(body);
        assert.deepEqual([...underlaysOf([prims[0], body])], [prims[0]]);
        const { scene: o } = associate(prims, 600, 400, guide);
        const a = o.nodes.find((n) => n.id === "a");
        assert.deepEqual([a?.fill?.color, Math.round(a?.w ?? 0)], ["#cccccc", 40]);
        assert.isNull(a?.stroke ?? null);
        // what graphty does not draw is a stray, not the node's border or fill
        assert.lengthOf(o.strays, 1);
    });

    it("keeps a see-through fill drawn over a smaller shape, which reaches past it unevenly, as the node's", () => {
        index = 0;
        const big = prim({ points: circle(100, 100, 28), fill: fill("#00ff00", 0.5) });
        const chart = prim({ points: rect(80, 80, 100, 120), fill: fill("#ff0000") });
        assert.strictEqual(underlaysOf([big, chart]).size, 0);
        // a see-through node under a see-through box of its own size is the node
        const box = prim({ points: rect(78, 78, 122, 122), fill: fill("#ffffcc", 0.6) });
        assert.strictEqual(underlaysOf([big, box]).size, 0);
    });
});
