/**
 * The oracle comparison's label and group checks on tiny hand-made pairs of drawings: each pair differs in one thing a
 * reader sees (a label at half opacity, in a serif face, on two lines, aligned left, at the start of its node, off its
 * edge's line, with a halo or a box behind it, a group box drawn a little off) and fails exactly that property, which
 * the comparator before these checks passed. And what the association must read as a label's or a node's own: a box
 * drawn behind a label's words, an underlay under a node.
 */
import { assert, describe, it } from "vitest";

import { associate, mergeTexts, outerRingOf, stackedTexts, underlaysOf } from "./associate";
import {
    browserFace,
    browserFontClass,
    compareOracle,
    labelAnchor,
    lineAlign,
    lineAngleAt,
    placeOnLine,
    programFace,
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

    it("shows a label under a node-size rule where the oracle's framing would, not graphty's own", () => {
        // json-gephi-worldcup: sigma shows a label on a node 12.22 px across; graphty frames the graph 0.9 times as
        // large, draws the node 11.02 px across and hides the label under sigma's 12 px rule
        const small = (sized: PNode["sizedLabel"], label: PText | null): PScene => ({
            ...scene("graphty"),
            nodes: GRID.map(([id, x, y]) =>
                node(id, 0.9 * x, 0.9 * y, { w: 36, h: 36, ...(id === "a" ? { label, sizedLabel: sized } : {}) }),
            ),
        });
        const o = scene("oracle", {}, { a: text("A", 100, 100) });
        const a = text("A", 90, 90, {}, 27, 9);
        assert.deepEqual(failures(o, small({ label: a, acrossPx: 11.02, min: 12 }, null))["label.present"], undefined);
        // and hides one graphty shows whose node, at the oracle's scale, is under the rule
        assert.deepEqual(failures(o, small({ label: a, acrossPx: 10, min: 12 }, a))["label.present"], ["a"]);
        // a node on its rule's edge at the oracle's scale may show the label or not (sigma's grid: a label ranked
        // second in its cell shows once the view zooms past the first framing)
        const edge = { label: a, acrossPx: 0.9 * 12.001, min: 12 };
        assert.deepEqual(failures(o, small(edge, a))["label.present"], undefined);
        assert.deepEqual(failures(scene("oracle"), small(edge, a))["label.present"], undefined);
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
                // Java draws a font named Default, which it does not have, in Dialog's face
                "Default",
            ].map(programFontClass),
            ["sans-serif", "sans-serif", "sans-serif", "sans-serif", "monospace", "sans-serif", null, "sans-serif"],
        );
        assert.deepEqual(
            ["Dialog", "Wingbat, monospace", "Verdana", "SansSerif", "'DejaVu Serif'"].map(browserFontClass),
            ["serif", "monospace", "sans-serif", "serif", "serif"],
        );
    });

    it("reads a full font name a program writes as a family (DejaVu Sans Bold) as the face it names", () => {
        assert.deepEqual(["DejaVu Sans Bold", "DejaVu Serif Italic", "DejaVu Sans Light"].map(programFace), [
            "dejavu sans",
            "dejavu serif",
            "dejavu sans light",
        ]);
        assert.strictEqual(programFontClass("Liberation Mono Bold Italic"), "monospace");
        // a browser resolves no such name: graphty's label asking for one is drawn in the default face
        assert.strictEqual(browserFace("DejaVu Sans Bold"), "liberation serif");
        assert.deepEqual(labelPair({ family: "DejaVu Serif" }, { family: "DejaVu Sans Bold" }), {
            "label.family": ["a"],
        });
    });

    it("fails a pinned face the program names drawn in another face of its class", () => {
        // DejaVu Sans and Liberation Sans are both sans-serif, and two faces to a reader
        assert.deepEqual(labelPair({ family: "Liberation Sans" }), { "label.family": ["a"] });
        assert.deepEqual(labelPair({ family: "Verdana" }, { family: "Lato" }), { "label.family": ["a"] });
        assert.deepEqual(labelPair({ family: "Arial" }, { family: "Liberation Sans, sans-serif" }), {});
        assert.deepEqual(labelPair({ family: "sans-serif" }), {});
        // a family that names no pinned face is judged by its class, as before
        assert.deepEqual(labelPair({ family: "Verdana" }, { family: "Dialog" }), {});
        assert.deepEqual(["DejaVu Serif, serif", "Helvetica", "dejavu sans mono", "Dialog"].map(programFace), [
            "dejavu serif",
            null,
            "dejavu sans mono",
            null,
        ]);
        assert.deepEqual(
            ["Helvetica, sans-serif", "Dialog, monospace", "Nonesuch", "DejaVu Sans:bold, sans-serif"].map(browserFace),
            ["liberation sans", "dejavu sans mono", "liberation serif", "dejavu sans"],
        );
    });

    it("fails a font a sixth larger than the program's, which a quarter's tolerance passed", () => {
        assert.deepEqual(labelPair({ sizePx: 12 }), { "label.size": ["a"] });
        assert.deepEqual(labelPair({ sizePx: 10.5 }), {});
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
        // 0.3 against 0.2 is within 0.1, and half as strong again
        assert.deepEqual(labelPair({ outline: { ...halo, opacity: 0.3 } }, { outline: { ...halo, opacity: 0.2 } }), {
            "label.outline": ["a"],
        });
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
        // a box at 0.12 where the program's is at 0.2: within 0.1, and two fifths fainter
        assert.deepEqual(
            labelPair(
                { background: { ...bg, fill: fill("#ffff00", 0.12) } },
                { background: { ...bg, fill: fill("#ffff00", 0.2) } },
            ),
            { "label.background": ["a"] },
        );
        const border = { ...stroke("#ff0000", 1), opacity: 0.2 };
        assert.deepEqual(
            labelPair(
                { background: { ...bg, stroke: { ...border, opacity: 0.12 } } },
                { background: { ...bg, stroke: border } },
            ),
            { "label.backgroundBorder": ["a"] },
        );
    });
});

describe("a label's lines drawn as separate texts", () => {
    it("reads font runs side by side on one baseline as one line, and lines one under another as lines", () => {
        // Graphviz's SVG of <FONT>big red</FONT><BR/><FONT FACE="Courier">mono</FONT> <U>u</U> x<SUP>2</SUP>:
        // one text per font run, a space as a gap, the superscript raised a little and smaller
        const merged = mergeTexts([
            text("big red", 100, 80, {}, 50, 20),
            text("mono", 80, 100, {}, 24),
            text("u", 100, 100, {}, 6),
            text("x", 110, 100, {}, 6),
            text("2", 115, 97, {}, 4, 7),
        ]);
        assert.strictEqual(merged?.content, "big red\nmono u x2");
        // a blank the program kept at the start of a run parts it from the run before, however close
        const kept = mergeTexts([
            text("s", 100, 100, {}, 6),
            text("x", 106, 100, { blank: { before: true, after: false } }, 6),
        ]);
        assert.strictEqual(kept?.content, "s x");
        assert.strictEqual(merged?.lines?.length, 2);
        // a line under another, or a text far to its side, stays apart
        assert.strictEqual(mergeTexts([text("a", 100, 100), text("b", 100, 112)])?.content, "a\nb");
        assert.strictEqual(mergeTexts([text("a", 100, 100), text("b", 160, 100)])?.lines?.length, 2);
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

    it("judges an edge label's turn against its own line where the layouts are unrelated", () => {
        // graphty's layout is no turn, zoom or mirror of the oracle's: b sits below a, not beside it
        const moved: Record<string, Pt> = { a: [100, 100], b: [100, 300], c: [500, 300], d: [300, 100], e: [500, 100] };
        const unrelated = (label: PText): PScene => {
            const g = scene("graphty", {
                edges: [
                    {
                        ...edge(label),
                        points: [
                            [100, 120],
                            [100, 280],
                        ],
                    },
                ],
            });
            return {
                ...g,
                nodes: g.nodes.map((n) => {
                    const at = moved[n.id] ?? [300, 300];
                    return { ...n, cx: at[0], cy: at[1] };
                }),
            };
        };
        const o = scene("oracle", { edges: [edge(text("x", 200, 100))] });
        const report = (g: PText): Record<string, string[]> => compareOracle("t", o, unrelated(g)).failures;
        assert.isTrue(compareOracle("t", o, unrelated(text("x", 100, 200))).transform?.unrelatedLayout);
        // the program wrote its label along its level line; graphty's, level on its upright line, is across it
        assert.deepEqual(report(text("x", 100, 200))["label.rotation"], ["edge:e1"]);
        // turned along graphty's line, it is drawn as the program drew it, upright either way
        assert.isUndefined(report(text("x", 100, 200, { rotation: 90 }))["label.rotation"]);
        assert.isUndefined(report(text("x", 100, 200, { rotation: -90 }))["label.rotation"]);
        assert.strictEqual(
            lineAngleAt(
                [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                ],
                [11, 8],
            ),
            90,
        );
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

    it("fails a group outline drawn see-through where the program's is opaque", () => {
        assert.deepEqual(pair(group(BOX), group(BOX, { stroke: { ...stroke("#333333", 1), opacity: 0.3 } })), {
            "group.stroke": ["g1"],
        });
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

    it("judges a group box graphty draws as an annotation by every side, as it judges its own boxes", () => {
        const annotation = (box: PBox): PScene["strays"][number] => ({
            index: 0,
            tag: "annotation-shape",
            kind: "shape",
            box,
            fill: null,
            stroke: null,
            text: null,
        });
        const o = scene("oracle", { groups: [group(BOX)] });
        assert.deepEqual(compareOracle("t", o, scene("graphty", { strays: [annotation(BOX)] })).failures, {});
        // a tenth too wide on one side: an overlap of 0.9, which an overlap of 0.8 alone passes
        const wide = compareOracle("t", o, scene("graphty", { strays: [annotation({ ...BOX, x1: 368 })] }));
        assert.deepEqual(wide.failures, { "group.box": ["g1"] });
    });
});

describe("a node's outline and the ring outside it", () => {
    const ring = (over: Partial<NonNullable<PNode["ring"]>> = {}): NonNullable<PNode["ring"]> => ({
        ...stroke("#999999", 3),
        reach: 4,
        ...over,
    });
    /** Node a, the same on both sides but for `g` on graphty's. */
    const nodePair = (o: Partial<PNode>, g: Partial<PNode>): Record<string, string[]> => {
        const with_ = (side: PScene["side"], over: Partial<PNode>): PScene => {
            const s = scene(side);
            s.nodes[0] = { ...s.nodes[0], ...over };
            return s;
        };
        return failures(with_("oracle", o), with_("graphty", { ...o, ...g }));
    };
    const border = stroke("#505050", 1);

    it("fails a node outline drawn opaque where the program's is see-through", () => {
        assert.deepEqual(nodePair({ stroke: border }, {}), {});
        assert.deepEqual(nodePair({ stroke: { ...border, opacity: 0.3 } }, { stroke: border }), {
            "node.stroke": ["a"],
        });
    });

    it("judges a ring outside the outline on its own: there or not, its color, opacity, width, line and reach", () => {
        assert.deepEqual(nodePair({ stroke: border, ring: ring() }, {}), {});
        assert.deepEqual(nodePair({ stroke: border, ring: ring() }, { ring: null }), { "node.ring": ["a"] });
        assert.deepEqual(nodePair({ stroke: border }, { ring: ring() }), { "node.ring": ["a"] });
        for (const over of [
            { opacity: 0.3 },
            { color: "#ff0000" },
            { width: 6 },
            { dashClass: "dotted" as const },
            { reach: 10 },
        ]) {
            assert.deepEqual(nodePair({ stroke: border, ring: ring() }, { ring: ring(over) }), { "node.ring": ["a"] });
        }
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

    it("reads a whole circle on a node's outline as that node's self-loop where graphty draws one, run as graphty's", () => {
        const prims = drawing(() => []);
        // vis-network's loop: an arc drawn all the way round, centered off the node, its ends meeting
        const ring = [...circle(125, 75, 30), circle(125, 75, 30)[0]];
        prims.push(prim({ kind: "path", closed: false, points: ring, stroke: stroke("#555555", 1) }));
        // graphty's loop on a, the other way round
        const loop = [...circle(125, 75, 30)].reverse();
        const withLoop: PScene = {
            ...guide,
            edges: [
                {
                    id: "l",
                    source: "a",
                    target: "a",
                    points: loop,
                    stroke: stroke("#555555", 1),
                    arrows: [],
                    label: null,
                },
            ],
        };
        const { scene: o } = associate(prims, 600, 400, withLoop);
        const [e] = o.edges;
        assert.deepEqual([e?.source, e?.target], ["a", "a"]);
        assert.lengthOf(o.strays, 0);
        // the route starts at the circle's point nearest the node's center and turns the way graphty's does
        const near = (q: Pt): number => Math.hypot(q[0] - 100, q[1] - 100);
        assert.isAtMost(near(e.points[0]), Math.min(...ring.map(near)) + 1e-9);
        const turn = (pts: readonly Pt[]): number =>
            Math.sign(
                pts.reduce(
                    (sum, [x, y], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y,
                    0,
                ),
            );
        assert.strictEqual(turn(e.points), turn(loop));
    });

    it("reads a round open stroke across an edge's end as a hollow half circle, a bent one as no half circle", () => {
        const line = (): Prim =>
            prim({
                kind: "path",
                closed: false,
                points: [
                    [120, 100],
                    [280, 100],
                ],
                stroke: stroke("#555555", 1),
            });
        const edge: PScene = {
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
                    label: null,
                },
            ],
        };
        // vis-network's curve: half a circle of radius 6 bulging toward b, across the line 6 before its end
        const arc = Array.from({ length: 13 }, (_, i): Pt => {
            const t = -Math.PI / 2 + (i * Math.PI) / 12;
            return [274 + 6 * Math.cos(t), 100 + 6 * Math.sin(t)];
        });
        const curve = associate(
            [
                ...drawing(() => []),
                line(),
                prim({ kind: "path", closed: false, points: arc, stroke: stroke("#555555", 1) }),
            ],
            600,
            400,
            edge,
        ).scene.edges[0];
        assert.deepEqual(
            curve.arrows.map((x) => [x.shape, x.filled]),
            [["half-circle", false]],
        );
        // an open arrow's two strokes, bent at its tip
        const vee: Pt[] = [
            [268, 94],
            [271, 97],
            [274, 100],
            [271, 103],
            [268, 106],
        ];
        const bent = associate(
            [
                ...drawing(() => []),
                line(),
                prim({ kind: "path", closed: false, points: vee, stroke: stroke("#555555", 1) }),
            ],
            600,
            400,
            edge,
        ).scene.edges[0];
        assert.notInclude(
            bent.arrows.map((x) => x.shape),
            "half-circle",
        );
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

    it("gives each of two lines drawn one over another its own label (json-cyjs-tokyo's two lines between stations)", () => {
        const prims = drawing(() => []);
        const along: Pt[] = [
            [120, 100],
            [280, 100],
        ];
        for (const color of ["#00ff33", "#ffffff"]) {
            prims.push(prim({ kind: "path", closed: false, points: along, stroke: stroke(color, 1) }));
        }
        for (const words of ["first line", "second line"]) {
            const t = text(words, 200, 92);
            prims.push(prim({ tag: "text", kind: "text", points: [], closed: false, box: t.box, text: t }));
        }
        const edge = (id: string, color: string, words: string): PEdge => ({
            id,
            source: "a",
            target: "b",
            points: along,
            stroke: stroke(color, 1),
            arrows: [],
            label: text(words, 200, 92),
        });
        const twoLines: PScene = {
            ...guide,
            edges: [edge("e1", "#00ff33", "first line"), edge("e2", "#ffffff", "second line")],
        };
        const { scene: o } = associate(prims, 600, 400, twoLines);
        assert.deepEqual(o.edges.map((e) => e.label?.content ?? null).sort(), ["first line", "second line"]);
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

    it("reads a node filled in pieces by its first piece, not its largest box", () => {
        // three stripes, the middle one a hair wider: Graphviz's striped red:green:blue, red first
        const hint = { role: "node", id: "a", key: "a" } as const;
        const stripes = [
            prim({ points: rect(80, 80, 93.33, 120), fill: fill("#e41a1c"), hint }),
            prim({ points: rect(93.33, 80, 106.68, 120), fill: fill("#4daf4a"), hint }),
            prim({ points: rect(106.68, 80, 120, 120), fill: fill("#377eb8"), hint }),
            prim({ points: rect(80, 80, 120, 120), stroke: stroke("#505050", 1), hint }),
        ];
        const prims = drawing((id) => (id === "a" ? stripes : [])).filter(
            (p) => !(p.fill?.color === "#cccccc" && p.box.x0 < 90 && p.box.y0 < 90),
        );
        const a = associate(prims, 600, 400, guide).scene.nodes.find((n) => n.id === "a");
        assert.deepEqual([a?.fill?.color, Math.round(a?.w ?? 0)], ["#e41a1c", 40]);
        // a fill under a smaller one (a label box inside the node) is still the node's fill
        index = 0;
        const body = prim({ points: rect(80, 80, 120, 120), fill: fill("#cccccc") });
        const box = prim({ points: rect(90, 95, 110, 105), fill: fill("#ffff00") });
        const b = associate(
            drawing((id) => (id === "a" ? [body, box] : [])),
            600,
            400,
            guide,
        ).scene.nodes.find((n) => n.id === "a");
        assert.strictEqual(b?.fill?.color, "#cccccc");
        // Graphviz's wedged red;0.3:green: the green wedge (0.7 of the circle) spans the whole box, the red one,
        // drawn first, does not
        index = 0;
        const red = prim({ points: rect(98, 80, 120, 100), fill: fill("#e41a1c"), hint });
        const green = prim({ points: rect(80, 80, 120, 120), fill: fill("#4daf4a"), hint });
        const c = associate(
            drawing((id) => (id === "a" ? [red, green] : [])).filter(
                (p) => !(p.fill?.color === "#cccccc" && p.box.x0 < 90 && p.box.y0 < 90),
            ),
            600,
            400,
            guide,
        ).scene.nodes.find((n) => n.id === "a");
        assert.strictEqual(c?.fill?.color, "#e41a1c");
    });

    it("reads a ring drawn clear outside a node's border as its ring, not its outline or its size", () => {
        const border = stroke("#505050", 1);
        const outline = (x: number, y: number): Prim =>
            prim({ tag: "ellipse", points: circle(x, y, 22), stroke: stroke("#999999", 3) });
        const prims = drawing((id, x, y) => (id === "a" ? [outline(x, y)] : [])).map((p) =>
            p.fill?.color === "#cccccc" && p.box.x0 < 90 && p.box.y0 < 90 ? { ...p, stroke: border } : p,
        );
        const { scene: o } = associate(prims, 600, 400, guide);
        const a = o.nodes.find((n) => n.id === "a");
        assert.deepEqual(
            [a?.stroke?.color, Math.round(a?.w ?? 0), a?.ring?.color, a?.ring?.width, Math.round(a?.ring?.reach ?? 0)],
            ["#505050", 40, "#999999", 3, 4],
        );
        // without a border of the node's own, a single outline outside the fill is its border
        index = 0;
        const body = prim({ tag: "ellipse", points: circle(100, 100, 20), fill: fill("#cccccc") });
        const far = outline(100, 100);
        assert.isNull(outerRingOf([body, far]));
        assert.strictEqual(outerRingOf([{ ...body, stroke: border }, far]), far);
        // nor is the outline drawn round a node's fill in pieces (a striped node): it rings the pieces together
        const halves = [
            prim({ points: rect(80, 80, 100, 120), fill: fill("#ff0000"), stroke: stroke("#000000", 1) }),
            prim({ points: rect(100, 80, 120, 120), fill: fill("#0000ff"), stroke: stroke("#000000", 1) }),
        ];
        assert.isNull(outerRingOf([...halves, prim({ points: rect(80, 80, 120, 120), stroke: stroke("#000000", 1) })]));
        // nor is a border drawn over the fill's edge a ring
        assert.isNull(outerRingOf([body, prim({ points: circle(100, 100, 20), stroke: stroke("#999999", 3) })]));
    });
});

describe("a label wrapped into stacked lines", () => {
    it("is placed by the box of all its lines, not its first line's", () => {
        const line = (content: string, y: number): Prim => {
            const t = text(content, 100, y, { anchor: "start" });
            return {
                index: y,
                tag: "text",
                kind: "text",
                box: t.box,
                points: [],
                closed: false,
                corners: 0,
                fill: null,
                stroke: null,
                text: t,
                markers: { start: false, end: false },
                hint: null,
            };
        };
        // lines flush right: "wide line" over "ab", their right edges one under another
        const right = (content: string, y: number, w: number): Prim => {
            const t = text(content, 200 - w / 2, y, {}, w);
            return { ...line(content, y), box: t.box, text: t };
        };
        assert.include(
            stackedTexts([right("wide line", 100, 40), right("ab", 112, 12)]).map((p) => p.text?.content),
            "wide line ab",
        );
        const stacked = stackedTexts([line("Two", 100), line("longer lines", 112)]).at(-1)?.text;
        assert.strictEqual(stacked?.content, "Two longer lines");
        assert.deepEqual(stacked?.box, { x0: 85, y0: 95, x1: 115, y1: 117 });
    });
});

describe("a label drawn as runs side by side", () => {
    it("is one text of the runs' words, a space where they are apart", () => {
        const run = (content: string, x0: number, w: number, size = 10): Prim => {
            const t = text(content, x0 + w / 2, 100, { anchor: "start" }, w, size);
            return {
                index: x0,
                tag: "text",
                kind: "text",
                box: t.box,
                points: [],
                closed: false,
                corners: 0,
                fill: null,
                stroke: null,
                text: t,
                markers: { start: false, end: false },
                hint: null,
            };
        };
        // vis-network's "<b>B</b> <i>I</i> <code>M</code>": three texts on one line, the mono one larger
        const out = stackedTexts([run("B", 100, 7), run("I", 110, 3), run("M", 116, 8, 14), run("far", 200, 12)]);
        assert.include(
            out.map((p) => p.text?.content),
            "B I M",
        );
        assert.notInclude(
            out.map((p) => p.text?.content),
            "B I M far",
        );
        // turned words are no line of text: a chart's category names turned 45 degrees under its bars
        // (xgmml-specimen-images-charts-p7 bar-domain-label-position-up-45) stay apart on both sides
        const turned = (content: string, x0: number): Prim => {
            const p = run(content, x0, 8);
            p.text = { ...(p.text as PText), rotation: -45 };
            return p;
        };
        assert.notInclude(
            stackedTexts([turned("a", 100), turned("b", 110), turned("c", 120)]).map((p) => p.text?.content),
            "a b c",
        );
        assert.strictEqual(
            mergeTexts([
                text("a", 104, 100, { rotation: -45 }, 8),
                text("b", 114, 100, { rotation: -45 }, 8),
                text("c", 124, 100, { rotation: -45 }, 8),
            ])?.content,
            "a\nb\nc",
        );
        // a run whose text keeps its blank before its word (" x" drawn as "x" from where the blank starts)
        const x = run("x", 107, 6);
        x.text = { ...(x.text as PText), blank: { before: true, after: false } };
        assert.include(
            stackedTexts([run("B", 100, 7), x]).map((p) => p.text?.content),
            "B x",
        );
    });
});
