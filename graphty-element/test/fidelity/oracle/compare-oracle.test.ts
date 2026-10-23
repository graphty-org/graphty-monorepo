/**
 * The oracle comparison's pure half -- association of raw SVG primitives with graph elements,
 * the similarity fit and the per-property judgement -- on hand-built primitives, so each rule is
 * pinned without a browser: a markup-named drawing and an unnamed one associate the same way, a
 * drawing judged against itself under a similarity passes everything, and each defect the owner
 * reported (a fivefold arrowhead, a bold label, a missing outline, a missing annotation box, a
 * turned label) fails exactly the property that names it.
 */
import { assert, describe, it } from "vitest";

import { associate, diskColor, type RasterDrawing, rasterScene, shapeOf, stackedTexts } from "./associate";
import {
    clipToNodes,
    compareOracle,
    curvatureOf,
    medianSpacing,
    namedCaptions,
    outerOf,
    specimenRoleNames,
    specimenSettingNames,
    withoutCaptions,
} from "./compare-oracle";
import {
    boxOfPoints,
    outlinePaintedAsFill,
    PAINTED_OUTLINE,
    type PFill,
    type PNode,
    type Prim,
    type PScene,
    type PStroke,
    type Pt,
    type PText,
} from "./primitives";
import { textContentOf } from "./svg-primitives";

const fill = (color: string): PFill => ({ color, opacity: 1, gradient: null });
const stroke = (color: string, width = 1): PStroke => ({ color, opacity: 1, width, dash: null, dashClass: "solid" });

let index = 0;
function prim(over: Partial<Prim> & { points: Pt[] }): Prim {
    return {
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
    };
}
const circle = (x: number, y: number, r: number): Pt[] =>
    Array.from({ length: 24 }, (_, i): Pt => [
        x + r * Math.cos((i * Math.PI) / 12),
        y + r * Math.sin((i * Math.PI) / 12),
    ]);
function text(content: string, x: number, y: number, size = 12, over: Partial<PText> = {}): PText {
    return {
        content,
        x,
        y,
        box: { x0: x - size, y0: y - size / 2, x1: x + size, y1: y + size / 2 },
        sizePx: size,
        family: "Helvetica",
        weight: 400,
        style: "normal",
        anchor: "middle",
        rotation: 0,
        color: "#000000",
        opacity: 1,
        ...over,
    };
}

/** An oracle drawing of a - b - c with an arrow on a->b, as raw primitives. */
function oraclePrims(opts: { named: boolean; arrowScale?: number; stray?: boolean; outline?: number }): Prim[] {
    index = 0;
    const hint = (role: "node" | "edge", id: string): Prim["hint"] => (opts.named ? { role, id, key: id } : null);
    const out: Prim[] = [
        prim({
            points: [
                [0, 0],
                [400, 0],
                [400, 300],
                [0, 300],
                [0, 0],
            ],
            fill: fill("#ffffff"),
            tag: "rect",
            corners: 4,
        }),
    ];
    const nodes: [string, number, number][] = [
        ["a", 100, 100],
        ["b", 300, 100],
        ["c", 200, 250],
    ];
    for (const [id, x, y] of nodes) {
        out.push(
            prim({
                tag: "ellipse",
                points: circle(x, y, 20),
                fill: fill("#ff0000"),
                stroke: stroke("#000000", opts.outline ?? 2),
                hint: hint("node", id),
            }),
        );
        const t = text(id.toUpperCase(), x, y);
        out.push(
            prim({ tag: "text", kind: "text", points: [], closed: false, box: t.box, text: t, hint: hint("node", id) }),
        );
    }
    const s = opts.arrowScale ?? 1;
    out.push(
        prim({
            kind: "path",
            closed: false,
            points: [
                [120, 100],
                [270, 100],
            ],
            stroke: stroke("#0000ff"),
            hint: hint("edge", "a->b"),
        }),
    );
    out.push(
        prim({
            tag: "polygon",
            corners: 3,
            points: [
                [270, 100 - 4 * s],
                [270 + 10 * s, 100],
                [270, 100 + 4 * s],
                [270, 100 - 4 * s],
            ],
            fill: fill("#0000ff"),
            hint: hint("edge", "a->b"),
        }),
    );
    out.push(
        prim({
            kind: "path",
            closed: false,
            points: [
                [300, 120],
                [200, 230],
            ],
            stroke: stroke("#0000ff"),
            hint: hint("edge", "b->c"),
        }),
    );
    if (opts.stray === true) {
        out.push(
            prim({
                tag: "rect",
                corners: 4,
                points: [
                    [150, 10],
                    [250, 10],
                    [250, 40],
                    [150, 40],
                    [150, 10],
                ],
                fill: fill("#ffff00"),
            }),
        );
    }
    return out;
}

/** graphty's drawing of the same graph, scaled by 2 and shifted on a canvas scaled alike, as its primitive scene. */
function graphtyScene(
    over: { arrowLength?: number; weight?: number; stroke?: boolean; outline?: number; rotation?: number } = {},
): PScene {
    const map = ([x, y]: Pt): Pt => [2 * x + 50, 2 * y + 30];
    const node = (id: string, x: number, y: number): PScene["nodes"][number] => {
        const [cx, cy] = map([x, y]);
        return {
            id,
            cx,
            cy,
            w: 80,
            h: 80,
            shape: "ellipse",
            fill: fill("#ff0000"),
            stroke: over.stroke === false ? null : stroke("#000000", over.outline ?? 4),
            label: text(id.toUpperCase(), cx, cy, 24, { weight: over.weight ?? 400, rotation: over.rotation ?? 0 }),
        };
    };
    return {
        side: "graphty",
        width: 850,
        height: 630,
        background: "#ffffff",
        nodes: [node("a", 100, 100), node("b", 300, 100), node("c", 200, 250)],
        edges: [
            {
                id: "e1",
                source: "a",
                target: "b",
                points: [map([120, 100]), map([280, 100])],
                stroke: stroke("#0000ff", 2),
                arrows: [
                    {
                        end: "target",
                        length: over.arrowLength ?? 20,
                        width: 16,
                        filled: true,
                        shape: "triangle",
                        color: "#0000ff",
                    },
                ],
                label: null,
            },
            {
                id: "e2",
                source: "b",
                target: "c",
                points: [map([300, 120]), map([200, 230])],
                stroke: stroke("#0000ff", 2),
                arrows: [],
                label: null,
            },
        ],
        groups: [],
        texts: [],
        strays: [],
    };
}

const run = (prims: Prim[], g: PScene): ReturnType<typeof compareOracle> => {
    const a = associate(prims, 400, 300, g);
    return compareOracle("t", a.scene, g, a.method);
};
const failing = (r: ReturnType<typeof compareOracle>): string[] =>
    Object.entries(r.properties)
        .filter(([, v]) => v.passRate !== null && v.passRate < 1)
        .map(([k]) => k);

describe("oracle comparison", () => {
    it("associates a markup-named drawing and an unnamed one alike", () => {
        for (const named of [true, false]) {
            const a = associate(oraclePrims({ named }), 400, 300, graphtyScene());
            assert.strictEqual(a.method, named ? "markup" : "geometry");
            assert.deepEqual(
                a.scene.nodes.map((n) => [n.id, n.label?.content]),
                [
                    ["a", "A"],
                    ["b", "B"],
                    ["c", "C"],
                ],
            );
            assert.deepEqual(
                a.scene.edges.map((e) => [e.source, e.target, e.arrows.length]),
                [
                    ["a", "b", 1],
                    ["b", "c", 0],
                ],
            );
            assert.strictEqual(a.scene.background, "#ffffff");
            assert.deepEqual(a.scene.strays, []);
        }
    });

    it("passes every property of a drawing judged against itself under a similarity", () => {
        for (const named of [true, false]) {
            const r = run(oraclePrims({ named }), graphtyScene());
            assert.deepEqual(failing(r), [], JSON.stringify(r.elements));
            assert.closeTo(r.transform?.scale ?? 0, 0.5, 1e-9);
            assert.strictEqual(r.transform?.rms, 0);
        }
    });

    it("leaves a specimen sheet's cap-* caption nodes and their words unjudged on either side", () => {
        const a = associate(oraclePrims({ named: true }), 400, 300, graphtyScene());
        const g = graphtyScene();
        const cap = (side: PScene, id: string, x: number, y: number, words: string, color: string): void => {
            side.nodes.push({ ...side.nodes[0], id, cx: x, cy: y, fill: fill(color), label: text(words, x, y) });
        };
        cap(g, "cap-a", 250, 290, "shape=ellipse", "#00ff00");
        cap(a.scene, "cap-b", 200, 50, "shape=box", "#0000ff");
        a.scene.texts.push(text("shape=box", 10, 10));
        const r = compareOracle("t", a.scene, g, a.method);
        assert.deepEqual(failing(r), []);
        assert.strictEqual(r.counts.oracleNodes, 3);
        assert.strictEqual(r.counts.graphtyNodes, 3);
        assert.strictEqual(r.counts.oracleTexts, 0);
    });

    it("fits the frame on a specimen sheet's anchor-* nodes alone, so a misplaced specimen fails only itself", () => {
        const corners: [string, Pt][] = [
            ["anchor-nw", [0, 0]],
            ["anchor-ne", [400, 0]],
            ["anchor-sw", [0, 300]],
            ["anchor-se", [400, 300]],
        ];
        const withAnchors = (side: PScene, map: (p: Pt) => Pt): void => {
            for (const [id, p] of corners) {
                const [cx, cy] = map(p);
                side.nodes.push({ ...side.nodes[0], id, cx, cy, label: null });
            }
        };
        const a = associate(oraclePrims({ named: true }), 400, 300, graphtyScene());
        const g = graphtyScene();
        withAnchors(a.scene, (p) => p);
        withAnchors(g, ([x, y]) => [2 * x + 50, 2 * y + 30]);
        const c = g.nodes.find((n) => n.id === "c");
        assert.isDefined(c);
        if (c !== undefined) {
            c.cx += 300;
        }
        const r = compareOracle("t", a.scene, g, a.method);
        assert.closeTo(r.transform?.scale ?? 0, 0.5, 1e-9);
        assert.isFalse(r.transform?.unrelatedLayout);
        assert.include(failing(r), "node.position");
        assert.deepEqual(
            r.properties["node.position"].worst.map((w) => w.id),
            ["c"],
        );
    });

    it("fails the arrowhead length of a fivefold arrowhead and nothing else", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: true }), graphtyScene({ arrowLength: 100 }))), [
            "edge.arrowLength",
            "edge.arrowToSpacing",
        ]);
    });

    it("fails the label weight of a bold label drawn over a normal one", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: false }), graphtyScene({ weight: 700 }))), ["label.weight"]);
    });

    it("counts an oracle label under one render pixel as no label, as graphty's side does", () => {
        const prims = oraclePrims({ named: true }).map((p) =>
            p.text?.content === "A" ? { ...p, text: { ...p.text, sizePx: 0.4 } } : p,
        );
        const g = graphtyScene();
        g.nodes[0] = { ...g.nodes[0], label: null };
        const r = run(prims, g);
        assert.strictEqual(r.properties["label.present"].passRate, 1);
        assert.strictEqual(r.properties["label.present"].n, 3);
    });

    it("counts a graphty label under one pixel as no label too, as a node's further texts can be", () => {
        // Cytoscape's chart item labels at their default 1 px (xgmml-specimen-images-charts-p5 pie-item-labels): under
        // a pixel on both sides once scaled, so drawn on neither as far as a reader can tell
        const prims = oraclePrims({ named: true }).map((p) =>
            p.text?.content === "A" ? { ...p, text: { ...p.text, sizePx: 0.4 } } : p,
        );
        const g = graphtyScene();
        const { label } = g.nodes[0];
        assert(label !== null, "the node has a label");
        g.nodes[0] = { ...g.nodes[0], label: { ...label, sizePx: 0.4 } };
        const r = run(prims, g);
        assert.strictEqual(r.properties["label.present"].passRate, 1);
    });

    it("sizes a node to its outline's outer edge: an SVG stroke half outside, graphty's ring wholly outside", () => {
        const node = (w: number, width: number | null): PScene["nodes"][number] => ({
            id: "n",
            cx: 0,
            cy: 0,
            w,
            h: w / 2,
            shape: "rect",
            fill: fill("#ffffff"),
            stroke: width === null ? null : stroke("#000000", width),
            label: null,
        });
        // Cytoscape desktop draws a node 3 across with a border of 2 as a 1-wide path stroked 2 wide: 3 across in all.
        // graphty draws it with its border inside its size, as a fill of nothing ringed 1.5 wide: 3 across as well.
        assert.deepEqual(outerOf(node(1, 2), "oracle"), [3, 2.5]);
        assert.deepEqual(outerOf(node(0, 1.5), "graphty"), [3, 3]);
        assert.deepEqual(outerOf(node(40, null), "graphty"), [40, 20]);
    });

    it("finds a node drawn as a stroked outline of no size, a dot as wide as its stroke", () => {
        // c drawn as Cytoscape desktop draws a node no larger than its border: its outline inset to a point
        const prims = oraclePrims({ named: false }).map((p) =>
            p.tag === "ellipse" && Math.abs(p.box.y0 - 230) < 1
                ? { ...p, points: Array.from({ length: 5 }, (): Pt => [200, 250]), box: boxOfPoints([[200, 250]]) }
                : p,
        );
        const c = associate(prims, 400, 300, graphtyScene()).scene.nodes.find((n) => n.id === "c");
        assert.deepEqual([c?.w, c?.h, c?.stroke?.width], [0, 0, 2]);
    });

    it("fails the outline of nodes drawn without one", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: true }), graphtyScene({ stroke: false }))), ["node.stroke"]);
    });

    it("judges two thin outlines either side of the hairline as one outline, and a thick one as another", () => {
        // the oracle's 0.2 px is under the hairline; graphty's 0.42 px is 0.21 px in the oracle's frame, within the
        // width tolerance of it
        assert.deepEqual(failing(run(oraclePrims({ named: true, outline: 0.2 }), graphtyScene({ outline: 0.42 }))), []);
        // graphty's 0.27 px is over the hairline and a third wider than the oracle's: an outline against none
        assert.deepEqual(failing(run(oraclePrims({ named: true, outline: 0.2 }), graphtyScene({ outline: 0.54 }))), [
            "node.stroke",
        ]);
        assert.deepEqual(failing(run(oraclePrims({ named: true, outline: 0.2 }), graphtyScene({ outline: 4 }))), [
            "node.stroke",
        ]);
    });

    it("fails the label rotation of a turned label", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: true }), graphtyScene({ rotation: 30 }))), [
            "label.rotation",
        ]);
    });

    it("reports a shape the program drew and graphty did not as a stray", () => {
        const r = run(oraclePrims({ named: true, stray: true }), graphtyScene());
        assert.deepEqual(failing(r), ["stray.present"]);
        assert.deepEqual(
            r.strays.map((s) => [s.tag, s.fill]),
            [["rect", "#ffff00"]],
        );
    });

    it("gives a byte-identical report for the same inputs", () => {
        const a = JSON.stringify(run(oraclePrims({ named: false }), graphtyScene({ arrowLength: 60 })));
        const b = JSON.stringify(run(oraclePrims({ named: false }), graphtyScene({ arrowLength: 60 })));
        assert.strictEqual(a, b);
    });

    it("resolves a Graphviz port, a Gephi underscored id and parallel edges to graphty's ids", () => {
        index = 0;
        const g = graphtyScene();
        g.nodes[0].id = "node a";
        g.edges[0].source = "node a";
        const prims = oraclePrims({ named: true }).map((p): Prim => {
            if (p.hint?.id === "a") {
                return { ...p, hint: { ...p.hint, id: "node_a", key: "node_a" } };
            }
            if (p.hint?.id === "a->b") {
                return { ...p, hint: { ...p.hint, id: "node_a:port1->b", key: "edge1" } };
            }
            return p;
        });
        const second = prims
            .filter((p) => p.hint?.key === "edge1")
            .map((p): Prim => ({
                ...p,
                index: p.index + 100,
                hint: { role: "edge", id: "node_a:port1->b", key: "edge9" },
            }));
        const a = associate([...prims, ...second], 400, 300, g);
        assert.deepEqual(
            a.scene.edges.map((e) => e.id),
            ["b->c#0", "node a->b#0", "node a->b#1"],
        );
        assert.include(
            a.scene.nodes.map((n) => n.id),
            "node a",
        );
    });

    it("finds each body at its own label when the program laid the graph out otherwise", () => {
        const g = graphtyScene();
        // graphty put the three nodes in a row: no similarity relates that to a triangle
        const moved: Pt[] = [
            [100, 100],
            [450, 105],
            [800, 100],
        ];
        g.nodes.forEach((n, i) => {
            const [x, y] = moved[i];
            n.label = n.label ? { ...n.label, x, y, box: { x0: x - 20, y0: y - 6, x1: x + 20, y1: y + 6 } } : null;
            n.cx = x;
            n.cy = y;
        });
        const a = associate(oraclePrims({ named: false }), 400, 300, g);
        assert.deepEqual(a.guide?.source, "label-anchors");
        assert.deepEqual(
            a.scene.nodes.map((n) => [n.id, n.cx, n.cy]),
            [
                ["a", 100, 100],
                ["b", 300, 100],
                ["c", 200, 250],
            ],
        );
        const r = compareOracle("t", a.scene, g, a.method);
        assert.strictEqual(r.counts.labelOverlap, 1);
        assert.strictEqual(r.transform?.unrelatedLayout, true);
    });

    it("reads a dot as wide as its line at the line's end as part of the line, not an arrowhead", () => {
        // Cytoscape desktop draws arrow shape NONE as a filled dot one line width across
        const prims = oraclePrims({ named: false });
        prims.push(prim({ tag: "path", points: circle(120, 100, 0.5), fill: fill("#0000ff") }));
        const a = associate(prims, 400, 300, graphtyScene());
        assert.deepEqual(
            a.scene.edges.map((e) => [e.source, e.target, e.arrows.map((x) => x.end)]),
            [
                ["a", "b", ["target"]],
                ["b", "c", []],
            ],
        );
        assert.deepEqual(a.scene.strays, []);
    });

    it("takes a picture at an edge's end as its arrowhead (vis-network's image arrows), its colors its own", () => {
        const prims = oraclePrims({ named: false });
        // a 10 x 10 picture standing on the b - c line where it meets c
        prims.push(
            prim({
                tag: "image",
                kind: "image",
                points: [],
                fill: null,
                box: { x0: 198, y0: 220, x1: 208, y1: 230 },
            }),
        );
        const a = associate(prims, 400, 300, graphtyScene());
        const bc = a.scene.edges.find((e) => e.source === "b" && e.target === "c");
        assert(bc);
        assert.deepEqual(
            bc.arrows.map((x) => [x.end, x.shape, x.filled, x.color]),
            [["target", "image", true, null]],
        );
        assert.deepEqual(a.scene.strays, []);
    });

    it("takes a box holding nodes near an edge's end as a group, not as an arrowhead", () => {
        const prims = oraclePrims({ named: false });
        prims.push(
            prim({
                tag: "path",
                corners: 4,
                points: [
                    [60, 60],
                    [340, 60],
                    [340, 140],
                    [60, 140],
                    [60, 60],
                ],
                stroke: stroke("#888888"),
            }),
        );
        // the same box filled, drawn as a second primitive, and an edge drawn as a filled ribbon
        // through b's and c's centers: one group, and no group of the ribbon
        prims.push(
            prim({
                tag: "path",
                corners: 4,
                points: [
                    [60, 60],
                    [340, 60],
                    [340, 140],
                    [60, 140],
                    [60, 60],
                ],
                fill: fill("#eeeeee"),
            }),
            prim({
                tag: "path",
                points: [
                    [298, 98],
                    [302, 102],
                    [202, 252],
                    [198, 248],
                    [298, 98],
                ],
                fill: fill("#0000ff"),
            }),
        );
        const a = associate(prims, 400, 300, graphtyScene());
        assert.deepEqual(
            a.scene.edges.map((e) => e.arrows.length),
            [1, 0],
        );
        assert.deepEqual(
            a.scene.groups.map((g) => [g.members, g.fill?.color, g.stroke?.color]),
            [[["a", "b"], "#eeeeee", "#888888"]],
        );
    });

    it("gives nested groups their own labels, a label drawn above its box included", () => {
        const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
            [x0, y0],
        ];
        const prims = oraclePrims({ named: false });
        const outer = text("Outer", 200, 32);
        const inner = text("Inner", 200, 70);
        prims.push(
            prim({ tag: "path", corners: 4, points: box(40, 40, 360, 290), stroke: stroke("#888888") }),
            prim({ tag: "path", corners: 4, points: box(60, 60, 340, 140), stroke: stroke("#888888") }),
            // Cytoscape.js draws a compound's label above its box; the inner group's words sit inside the outer box
            prim({ tag: "text", kind: "text", points: [], closed: false, box: outer.box, text: outer }),
            prim({ tag: "text", kind: "text", points: [], closed: false, box: inner.box, text: inner }),
        );
        const map = ([x, y]: Pt): Pt => [2 * x + 50, 2 * y + 30];
        const group = (
            id: string,
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            label: string,
            members: string[],
        ) => {
            const [a0, b0] = map([x0, y0]);
            const [a1, b1] = map([x1, y1]);
            return {
                id,
                box: { x0: a0, y0: b0, x1: a1, y1: b1 },
                fill: null,
                stroke: stroke("#888888", 2),
                label: text(label, (a0 + a1) / 2, b0, 24),
                members,
            };
        };
        const g = graphtyScene();
        g.groups = [
            group("inner", 60, 60, 340, 140, "Inner", ["a", "b"]),
            group("outer", 40, 40, 360, 290, "Outer", ["a", "b", "c"]),
        ];
        const a = associate(prims, 400, 300, g);
        assert.deepEqual(
            a.scene.groups.map((x) => [x.members.length, x.label?.content ?? null]),
            [
                [3, "Outer"],
                [2, "Inner"],
            ],
        );
        const r = compareOracle("t", a.scene, g, a.method);
        assert.strictEqual(r.properties["group.label"].passRate, 1);
    });

    it("takes graphty's annotation over a box around nodes as that box drawn, its words as free words", () => {
        const prims = oraclePrims({ named: false });
        const note = text("Note", 200, 70);
        prims.push(
            prim({
                tag: "path",
                corners: 4,
                points: [
                    [60, 60],
                    [340, 60],
                    [340, 140],
                    [60, 140],
                    [60, 60],
                ],
                fill: fill("#c7e9c0"),
            }),
            prim({ tag: "text", kind: "text", points: [], closed: false, box: note.box, text: note }),
        );
        const g = graphtyScene();
        g.strays = [
            {
                index: 0,
                tag: "annotation-shape",
                kind: "shape",
                box: { x0: 170, y0: 150, x1: 730, y1: 310 },
                fill: null,
                stroke: null,
                text: null,
            },
        ];
        const r = run(prims, g);
        assert.strictEqual(r.properties["group.present"].passRate, 1);
        assert.strictEqual(r.properties["group.box"].passRate, 1);
        assert.isNull(r.properties["group.label"].passRate, "an annotation has no group label");
        // its words are judged as free words: graphty draws none there
        assert.strictEqual(r.properties["stray.present"].passRate, 0);
        g.strays.push({
            index: 1,
            tag: "annotation-text",
            kind: "text",
            box: { x0: 426, y0: 158, x1: 474, y1: 182 },
            fill: null,
            stroke: null,
            text: "Note",
        });
        assert.strictEqual(run(prims, g).properties["stray.present"].passRate, 1);
    });

    it("counts free words as drawn where graphty draws a text holding them", () => {
        const prims = oraclePrims({ named: false });
        const legend = text("Legend", 200, 200);
        prims.push(prim({ tag: "text", kind: "text", points: [], closed: false, box: legend.box, text: legend }));
        const g = graphtyScene();
        assert.strictEqual(run(prims, g).properties["stray.present"].passRate, 0);
        // a label-only node graphty draws no body for: its label, on one line where the program wrapped it
        g.texts = [text("The Legend here", 450, 430, 24)];
        assert.strictEqual(run(prims, g).properties["stray.present"].passRate, 1);
    });

    it("fails the node positions of a drawing mirrored top to bottom, unless the program is known to mirror", () => {
        const g = graphtyScene();
        const flip = ([x, y]: Pt): Pt => [x, 630 - y];
        for (const n of g.nodes) {
            [n.cx, n.cy] = flip([n.cx, n.cy]);
            if (n.label !== null) {
                const [x, y] = flip([n.label.x, n.label.y]);
                n.label = { ...n.label, x, y, box: { x0: x - 24, y0: y - 12, x1: x + 24, y1: y + 12 } };
            }
        }
        for (const e of g.edges) {
            e.points = e.points.map(flip);
        }
        const prims = oraclePrims({ named: true });
        const a = associate(prims, 400, 300, g);
        const plain = compareOracle("t", a.scene, g, a.method);
        assert.strictEqual(plain.transform?.reflect, false);
        assert.include(failing(plain), "node.position");
        // the mirror is reported as such, not only through the positions it puts out of place
        assert.include(failing(plain), "frame.mirror");
        const mirrored = compareOracle("t", a.scene, g, a.method, { mirror: true });
        assert.strictEqual(mirrored.transform?.reflect, true);
        assert.deepEqual(failing(mirrored), []);
    });

    it("judges a raster oracle by the nodes its program says it drew and the fills its pixels show", () => {
        // a 4 x 4 raster: white, with a red 2 x 2 block crossed by one gray pixel
        const px = new Uint8ClampedArray(4 * 4 * 4).fill(255);
        const paint = (x: number, y: number, rgb: number[]): void => {
            px.set([...rgb, 255], (y * 4 + x) * 4);
        };
        for (const [x, y] of [
            [1, 1],
            [2, 1],
            [1, 2],
        ]) {
            paint(x, y, [255, 0, 0]);
        }
        paint(2, 2, [128, 128, 128]);
        assert.strictEqual(diskColor(px, 4, 4, 1.5, 1.5, 1), "#ff0000");
        const scene = rasterScene({ nodes: [{ id: "a", x: 1.5, y: 1.5, r: 2, label: "A" }] }, 4, 4, (x, y, r) =>
            diskColor(px, 4, 4, x, y, r),
        );
        assert.strictEqual(scene.background, "#ffffff");
        assert.deepEqual(
            scene.nodes.map((n) => [n.id, n.w, n.fill?.color, n.label?.content]),
            [["a", 4, "#ff0000", "A"]],
        );
        // only the words of its labels are judged: graphty's label size and place are not
        const g = graphtyScene();
        const o = rasterScene(
            {
                nodes: [
                    { id: "a", x: 100, y: 100, r: 20, label: "A" },
                    { id: "b", x: 300, y: 100, r: 20, label: "B" },
                    { id: "c", x: 200, y: 250, r: 20, label: null },
                ],
            },
            400,
            300,
            () => "#ff0000",
        );
        const r = compareOracle("t", o, g);
        assert.deepEqual(failing(r), ["node.stroke", "label.present", "background"]);
        assert.strictEqual(r.properties["label.size"].n, 0);
        assert.strictEqual(r.properties["node.position"].pass, 3);
    });

    it("leaves out of a raster oracle a node a later one paints over, and keeps one a see-through one covers", () => {
        const drawing = {
            nodes: [
                { id: "small", x: 100, y: 100, r: 5, label: null },
                { id: "under", x: 300, y: 100, r: 5, label: null },
                { id: "big", x: 102, y: 100, r: 30, label: null },
                { id: "glass", x: 300, y: 100, r: 30, label: null },
            ],
        };
        // "glass" is see-through: what shows where it covers "under" is not its own color
        const fillAt = (x: number, _y: number, r: number): string => (x > 200 && r < 5 ? "#8080ff" : "#ff0000");
        assert.deepEqual(
            rasterScene(drawing, 400, 300, fillAt).nodes.map((n) => n.id),
            ["big", "glass", "under"],
        );
    });

    it("takes a raster oracle's recorded paint over its pixels, and judges its recorded edges", () => {
        // sigma.js's record: "half" drawn at alpha 0.5 (its pixels show the color blended with white), "gone" fully
        // transparent, "under" wholly inside the opaque "b" drawn after it, and two edges, one fully transparent
        const drawing = {
            nodes: [
                { id: "under", x: 200, y: 200, r: 3, label: null, fill: "#00ffff", alpha: 1 },
                { id: "half", x: 100, y: 100, r: 10, label: null, fill: "#ff0000", alpha: 0.5 },
                { id: "none", x: 300, y: 250, r: -5, label: null, fill: "#ff0000", alpha: 1 },
                { id: "gone", x: 300, y: 100, r: 10, label: null, fill: "#000000", alpha: 0 },
                { id: "b", x: 200, y: 200, r: 10, label: null, fill: "#0000ff", alpha: 1 },
            ],
            edges: [
                { id: "e", source: "half", target: "b", fill: "#00ff00", alpha: 1, width: 1.7, label: "E" },
                { id: "hidden", source: "gone", target: "b", fill: "#00ff00", alpha: 0, width: 1.7, label: null },
            ],
        };
        // the pixels show "b" over "under" blended with something drawn across it: not "b"'s own color
        const scene = rasterScene(drawing, 400, 300, (_x, _y, r) => (r < 2 ? "#ccffff" : "#ff8080"));
        assert.deepEqual(
            scene.nodes.map((n) => [n.id, n.w, n.fill?.color, n.fill?.opacity]),
            [
                ["b", 20, "#0000ff", 1],
                ["half", 20, "#ff0000", 0.5],
                // sigma draws a node of negative size as nothing
                ["none", 0, undefined, undefined],
            ],
        );
        assert.deepEqual(
            scene.edges.map((e) => [e.id, e.points, e.stroke?.color, e.stroke?.width, e.label?.content]),
            [
                [
                    "e",
                    [
                        [100, 100],
                        [200, 200],
                    ],
                    "#00ff00",
                    1.7,
                    "E",
                ],
            ],
        );
        assert.strictEqual(scene.nodesOnly, false);
        // a self-loop the record names by its one node has no route to judge, but is judged present and painted
        const node = (id: string, x: number, y: number): RasterDrawing["nodes"][number] => ({
            id,
            x,
            y,
            r: 20,
            label: id.toUpperCase(),
            fill: "#ff0000",
            alpha: 1,
        });
        const paint = { fill: "#0000ff", alpha: 1, width: 2, label: null };
        const loops = rasterScene(
            {
                nodes: [node("a", 100, 100), node("b", 300, 100), node("c", 200, 250)],
                edges: [
                    { id: "e1", source: "a", target: "b", ...paint },
                    { id: "e2", source: "b", target: "c", ...paint },
                    { id: "loop", source: "a", target: "a", ...paint },
                ],
            },
            400,
            300,
            () => "#ff0000",
        );
        const g = graphtyScene();
        const [ax, ay] = [g.nodes[0].cx, g.nodes[0].cy];
        g.edges.push({
            id: "loop",
            source: "a",
            target: "a",
            points: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k): Pt => {
                const t = (k / 8) * 2 * Math.PI;
                return [ax + 30 * Math.sin(t), ay - 50 - 30 * Math.cos(t) + 30];
            }),
            stroke: { color: "#0000ff", opacity: 1, width: 4, dash: null, dashClass: "solid" },
            arrows: [],
            label: null,
        });
        const judged = compareOracle("t", loops, g);
        assert.strictEqual(judged.properties["edge.present"].pass, 3);
        assert.strictEqual(judged.properties["edge.color"].n, 3);
        assert.strictEqual(judged.properties["edge.route"].n, 2);
        assert.strictEqual(judged.properties["edge.curve"].n, 2);
        // an older record, with no paint, still judges nodes only
        const old = rasterScene({ nodes: [{ id: "a", x: 1, y: 1, r: 1, label: null }], edges: [] }, 4, 4, () => null);
        assert.strictEqual(old.nodesOnly, true);
    });

    it("reads the positioned tspan lines of one SVG text as separate lines", () => {
        // the parts of an Element the reader looks at (this project runs without a DOM)
        const el = (name: string, text: string, attrs: string[] = [], children: Element[] = []): Element =>
            ({
                localName: name,
                textContent: text,
                children,
                hasAttribute: (a: string) => attrs.includes(a),
            }) as unknown as Element;
        const two = el(
            "text",
            "  Analogmultiplexer",
            [],
            [el("tspan", "  Analog", ["x", "y"]), el("tspan", "multiplexer", ["x", "y"])],
        );
        const one = el("text", "one run", [], [el("tspan", "run")]);
        assert.strictEqual(textContentOf(two), "Analog\nmultiplexer");
        assert.strictEqual(textContentOf(one), "one run");
        // Cytoscape.js puts a zero-width space between the letters of a label it may break anywhere
        const zw = String.fromCharCode(0x200b);
        assert.strictEqual(textContentOf(el("text", ["f", "i", "l", "l"].join(zw))), "fill");
    });

    it("leaves a specimen sheet's captions out on both sides, by the words graphty's caption nodes draw", () => {
        const g = {
            ...graphtyScene(),
            texts: [text("fill=red", 50, 50, 12, { owner: "cap-fill-red" }), text("note", 9, 9)],
        };
        // the oracle's SVG names no caption: its captions are free texts, one of them wrapped in two lines
        const o = {
            ...graphtyScene(),
            side: "oracle" as const,
            texts: [text("fill=", 50, 50), text("red", 50, 60), text("note", 9, 9)],
        };
        assert.deepEqual(
            withoutCaptions(o, g).texts.map((t) => t.content),
            ["note"],
        );
        assert.deepEqual(
            withoutCaptions(g).texts.map((t) => t.content),
            ["note"],
        );
    });

    it("leaves out a wrapped caption whose first line is another caption's words", () => {
        // vis-network wraps "w=3 color" under "w=3", the whole caption of the specimen beside it
        const g = {
            ...graphtyScene(),
            texts: [
                text("w=3 color", 50, 50, 12, { owner: "cap-stroke" }),
                text("w=3", 150, 50, 12, { owner: "cap-stroke-default" }),
            ],
        };
        const o = {
            ...graphtyScene(),
            side: "oracle" as const,
            texts: [text("w=3", 50, 50), text("color", 50, 60), text("w=3", 150, 50), text("note", 9, 9)],
        };
        assert.deepEqual(
            withoutCaptions(o, g).texts.map((t) => t.content),
            ["note"],
        );
    });

    it("leaves out a caption node a sheet ids by number once it is named by its cap-* attribute", () => {
        // a GML sheet ids its caption node 5 and keeps "cap-fill-red" in its comment; the program draws it as a node
        const o = { ...graphtyScene(), side: "oracle" as const };
        o.nodes = [...o.nodes, { ...o.nodes[0], id: "5", label: text("fill=red", 50, 50) }];
        const captionOf = new Map([["5", "cap-fill-red"]]);
        assert.include(
            withoutCaptions(o).nodes.map((n) => n.id),
            "5",
        );
        assert.deepEqual(
            withoutCaptions(namedCaptions(o, captionOf)).nodes.map((n) => n.id),
            ["a", "b", "c"],
        );
        assert.strictEqual(namedCaptions(o, new Map()), o);
    });

    it("names a sheet's numbered captions and corner anchors by the attribute that keeps their role", () => {
        const rows = [
            { id: 0, comment: "anchor-nw", label: "" },
            { id: 4, comment: "default" },
            { id: 5, template: "cap-default", label: "(nothing set)" },
        ];
        assert.deepEqual(
            [...specimenRoleNames(rows)],
            [
                ["0", "anchor-nw"],
                ["5", "cap-default"],
            ],
        );
    });

    it("names every numbered node of a GML sheet by the setting its comment or template keeps", () => {
        const rows = [
            { id: 0, comment: "anchor-nw" },
            { id: 4, comment: "target-arrow-box-s" },
            { id: 7, template: "label-offset-n" },
            { id: 8, comment: "THIS FILE IS AUTO GENERATED" },
            { id: 9, comment: "twice" },
            { id: 10, comment: "twice" },
            { id: "shape-box", comment: "shape-box" },
        ];
        // captions and anchors are specimenRoleNames', named before the association
        assert.deepEqual(
            [...specimenSettingNames(rows)],
            [
                ["4", "target-arrow-box-s"],
                ["7", "label-offset-n"],
            ],
        );
    });

    it("judges no text the program drew off its canvas", () => {
        const o = {
            ...graphtyScene(),
            side: "oracle" as const,
            texts: [text("Short", 1665, 538), text("Seen", 100, 380)],
        };
        const r = compareOracle("t", o, graphtyScene());
        assert.deepEqual(r.failures["stray.present"], ["text#0"]);
        assert.strictEqual(r.properties["stray.present"].n, 1);
    });

    it("fixes the frame on anchors named by their role, so a misplaced specimen does not pull it", () => {
        const g = graphtyScene();
        g.nodes = [
            ...g.nodes,
            ...[
                ["0", 0, 0],
                ["1", 400, 0],
                ["2", 0, 300],
                ["3", 400, 300],
            ].map(([id, x, y]) => ({ ...g.nodes[0], id: String(id), cx: Number(x), cy: Number(y), label: null })),
        ];
        // the oracle draws node c 60 px off where the anchors place it
        const o: PScene = {
            ...g,
            side: "oracle",
            nodes: g.nodes.map((n) => (n.id === "c" ? { ...n, cx: n.cx + 60 } : n)),
        };
        const names = specimenRoleNames(
            ["0", "1", "2", "3"].map((id, i) => ({ id, comment: `anchor-${["nw", "ne", "sw", "se"][i]}` })),
        );
        const report = compareOracle("t", namedCaptions(o, names), namedCaptions(g, names));
        assert.deepEqual(report.failures["node.position"], ["c"]);
        assert.closeTo(report.transform?.tx ?? NaN, 0, 1e-3);
        // by number, the fit is taken on every node and the misplaced one pulls the frame towards itself
        assert.isAbove(Math.abs(compareOracle("t", o, g).transform?.tx ?? NaN), 1);
    });

    it("takes a caption's words off a specimen the association gave them to as its label", () => {
        const g = { ...graphtyScene(), texts: [text("w=40 h=80", 50, 50, 12, { owner: "cap-size-40x80" })] };
        // a tall specimen reaches down to its caption, so the oracle's association hands it the caption's words
        const o = { ...graphtyScene(), side: "oracle" as const };
        o.nodes = o.nodes.map((n) => (n.id === "a" ? { ...n, label: text("w=40 h=80", 50, 50) } : n));
        const out = withoutCaptions(o, g);
        assert.deepEqual(
            out.nodes.map((n) => n.label?.content ?? null),
            [null, "B", "C"],
        );
    });

    it("leaves out the box a program draws tight around a caption's words, and keeps other shapes", () => {
        const g = { ...graphtyScene(), texts: [text("fill=red", 50, 50, 12, { owner: "cap-fill-red" })] };
        const t = text("fill=red", 50, 50);
        const mid: [number, number] = [(t.box.x0 + t.box.x1) / 2, (t.box.y0 + t.box.y1) / 2];
        const shape = (h: number, at: [number, number]) => ({
            index: 0,
            tag: "path",
            kind: "shape" as const,
            box: { x0: at[0] - 40, y0: at[1] - h / 2, x1: at[0] + 40, y1: at[1] + h / 2 },
            fill: "#ffffff",
            stroke: null,
            text: null,
        });
        // Cytoscape desktop draws a yEd caption's white box although the file says hasFill 0
        const body = shape(13, mid);
        const big = shape(80, mid);
        const elsewhere = shape(13, [mid[0] + 200, mid[1]]);
        const o = { ...graphtyScene(), side: "oracle" as const, texts: [t], strays: [body, big, elsewhere] };
        assert.deepEqual(withoutCaptions(o, g).strays, [big, elsewhere]);
    });

    it("sees a drawing that paints no background on white, and fails graphty's whitesmoke there", () => {
        const bare = oraclePrims({ named: true }).slice(1);
        assert.strictEqual(associate(bare, 400, 300, graphtyScene()).scene.background, "#ffffff");
        assert.deepEqual(failing(run(bare, graphtyScene())), []);
        assert.deepEqual(failing(run(bare, { ...graphtyScene(), background: "#f5f5f5" })), ["background"]);
    });

    it("gives each label line to the nearest node that wants it, whichever node comes first", () => {
        const g = graphtyScene();
        // a and b both end their labels in "X": b's sits nearer a than a's own does, and nearer
        // still to b, so a node-by-node pick would hand it to a and leave b without one
        g.nodes[0].label = text("A\nX", 100, 100);
        g.nodes[1].label = text("B\nX", 300, 100);
        const words = (content: string, x: number, y: number): Prim => {
            const t = text(content, x, y);
            return prim({ tag: "text", kind: "text", points: [], closed: false, box: t.box, text: t });
        };
        const prims = [
            ...oraclePrims({ named: false }).filter((p) => p.text === null),
            words("A", 100, 100),
            words("B", 300, 100),
            words("X", 100, 215),
            words("X", 205, 115),
        ];
        const labels = associate(prims, 400, 300, g).scene.nodes.map((n) => [n.id, n.label?.content ?? null]);
        assert.deepEqual(labels, [
            ["a", "A\nX"],
            ["b", "B\nX"],
            ["c", null],
        ]);
    });

    it("pairs parallel edges found by geometry alone with the graphty edge drawn nearest each", () => {
        const g = graphtyScene();
        const bow: PScene["edges"][number] = {
            ...g.edges[0],
            id: "e0",
            points: [
                [290, 230],
                [450, 210],
                [610, 230],
            ],
        };
        // graphty: the straight a-b edge first, then its sibling bowed within the route tolerance; the oracle lists
        // its bowed one first, so id order would pair a curve with a straight line
        const two: PScene = { ...g, edges: [g.edges[0], { ...bow, id: "e3" }, g.edges[1]] };
        const oracle: PScene = {
            ...two,
            side: "oracle",
            edges: [
                { ...bow, id: "a->b#g0" },
                { ...g.edges[0], id: "a->b#g1" },
                { ...g.edges[1], id: "b->c#g0" },
            ],
        };
        const r = compareOracle("t", oracle, two);
        assert.strictEqual(r.properties["edge.curve"].pass, 3);
        assert.strictEqual(r.properties["edge.route"].pass, 3);
    });

    it("judges a route between its nodes, wherever each program starts the line under a node", () => {
        const node = (id: string, cx: number): PNode => ({
            id,
            cx,
            cy: 0,
            w: 40,
            h: 40,
            shape: null,
            fill: null,
            stroke: null,
            label: null,
        });
        const [a, b] = [node("a", 0), node("b", 100)];
        const round = (pts: Pt[]): Pt[] => pts.map(([x, y]): Pt => [Math.round(x * 100) / 100, y]);
        // center to center and border to border are the same line once clipped
        const centers = clipToNodes(
            [
                [0, 0],
                [100, 0],
            ],
            a,
            b,
        );
        assert.deepEqual(round(centers), [
            [20, 0],
            [80, 0],
        ]);
        const borders: Pt[] = [
            [20, 0],
            [50, 10],
            [80, 0],
        ];
        assert.deepEqual(clipToNodes(borders, a, b), borders);
        // a path that never leaves its nodes is kept
        const inside: Pt[] = [
            [0, 0],
            [5, 0],
        ];
        assert.deepEqual(clipToNodes(inside, a, a), inside);
    });

    it("pairs two parallel edges drawn over one another by their label words", () => {
        const g = graphtyScene();
        const labelled = { ...g.edges[0], id: "e3", arrows: [], label: text("L", 300, 100) };
        g.edges.push(labelled);
        // the program drew the labelled edge first: the same two lines, the label on the other one
        const o: PScene = {
            ...g,
            side: "oracle",
            edges: [{ ...g.edges[0], label: text("L", 300, 100) }, g.edges[1], { ...labelled, label: null }],
        };
        const r = compareOracle("t", o, g, "markup");
        assert.strictEqual(r.properties["edge.label"].passRate, 1);
    });

    it("reads a path ending where two nodes overlap as the edge graphty draws between them", () => {
        // a small node drawn over a big one's side: the path to the big one ends nearer the small one
        const body = (id: string, x: number, r: number): Prim =>
            prim({ points: circle(x, 100, r), fill: fill("#ff0000"), hint: { role: "node", id, key: id } });
        const prims = [
            body("a", 100, 40),
            body("b", 135, 10),
            body("c", 300, 10),
            prim({
                kind: "path",
                closed: false,
                points: [
                    [290, 100],
                    [145, 100],
                ],
                stroke: stroke("#0000ff"),
            }),
        ];
        const node = (id: string, x: number, r: number): PScene["nodes"][number] => ({
            id,
            cx: x,
            cy: 100,
            w: 2 * r,
            h: 2 * r,
            shape: "ellipse",
            fill: fill("#ff0000"),
            stroke: null,
            label: null,
        });
        const g: PScene = {
            side: "graphty",
            width: 400,
            height: 300,
            background: "#ffffff",
            nodes: [node("a", 100, 40), node("b", 135, 10), node("c", 300, 10)],
            edges: [
                {
                    id: "e",
                    source: "c",
                    target: "a",
                    points: [
                        [290, 100],
                        [140, 100],
                    ],
                    stroke: stroke("#0000ff"),
                    arrows: [],
                    label: null,
                },
            ],
            groups: [],
            texts: [],
            strays: [],
        };
        const a = associate(prims, 400, 300, g);
        assert.deepEqual(
            a.scene.edges.map((e) => [e.source, e.target]),
            [["c", "a"]],
        );

        // an edge graphty draws to a group: the path ends on the group's members' box
        const grouped: PScene = {
            ...g,
            edges: [{ ...g.edges[0], target: "group" }],
            groups: [
                {
                    id: "group",
                    box: { x0: 60, y0: 60, x1: 145, y1: 140 },
                    fill: null,
                    stroke: null,
                    label: null,
                    members: ["a", "b"],
                },
            ],
        };
        assert.deepEqual(
            associate(prims, 400, 300, grouped).scene.edges.map((e) => [e.source, e.target]),
            [["c", "group"]],
        );
    });

    it("reads a label wrapped into stacked lines as one text too", () => {
        const line = (content: string, y: number): Prim =>
            prim({ kind: "text", tag: "text", points: [], text: text(content, 100, y) });
        const wrapped = stackedTexts([line("Repair assembly", 100), line("checkpoint", 114), line("far away", 300)]);
        assert.deepEqual(
            wrapped.map((p) => p.text?.content),
            ["Repair assembly", "checkpoint", "far away", "Repair assembly checkpoint"],
        );
    });

    it("tells a curved path from a straight one", () => {
        assert.strictEqual(
            curvatureOf([
                [0, 0],
                [5, 0],
                [10, 0],
            ]),
            0,
        );
        assert.isAbove(
            curvatureOf([
                [0, 0],
                [5, 2],
                [10, 0],
            ]),
            0.1,
        );
    });
});

describe("shape classes of a four-sided outline", () => {
    const outline = (points: Pt[]): Prim => prim({ points: [...points, points[0]], corners: 4 });
    it("tells a rectangle, a diamond and a parallelogram apart, counting a closed outline's first point once", () => {
        assert.strictEqual(
            shapeOf(
                outline([
                    [0, 0],
                    [40, 0],
                    [40, 20],
                    [0, 20],
                ]),
            ),
            "rect",
        );
        assert.strictEqual(
            shapeOf(
                outline([
                    [20, 0],
                    [40, 10],
                    [20, 20],
                    [0, 10],
                ]),
            ),
            "diamond",
        );
        // Cytoscape's PARALLELOGRAM: two corners on the box, two not; neither a rectangle nor a diamond
        assert.strictEqual(
            shapeOf(
                outline([
                    [0, 0],
                    [35, 0],
                    [50, 20],
                    [15, 20],
                ]),
            ),
            "other",
        );
    });
});

describe("an outline a program drew as a filled path", () => {
    // sampled along its sides, as the SVG reader samples a path
    const square = (x: number, y: number, r: number, clockwise = false): Pt[] => {
        const corners: Pt[] = [
            [x - r, y - r],
            [x + r, y - r],
            [x + r, y + r],
            [x - r, y + r],
        ];
        const pts = corners.flatMap(([ax, ay], i): Pt[] => {
            const [bx, by] = corners[(i + 1) % 4];
            return Array.from({ length: 12 }, (_, k): Pt => [ax + ((bx - ax) * k) / 12, ay + ((by - ay) * k) / 12]);
        });
        return clockwise ? pts.reverse() : pts;
    };

    it("reads a ring as a solid line of the ring's width, dots as a dotted line, and bars across it as slashes", () => {
        const ring = outlinePaintedAsFill([square(100, 100, 21), square(100, 100, 19, true)]);
        assert.strictEqual(ring?.dashClass, "solid");
        assert.isFalse(ring?.patterned);
        assert.closeTo(ring?.width ?? 0, 2, 0.05);
        assert.strictEqual(ring?.box.x0, 79);
        const dots = Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8;
            return circle(100 + 20 * Math.cos(a), 100 + 20 * Math.sin(a), 1.5);
        });
        const dotted = outlinePaintedAsFill(dots);
        assert.strictEqual(dotted?.dashClass, "dotted");
        assert.isFalse(dotted?.patterned);
        assert.closeTo(dotted?.width ?? 0, 3, 0.1);
        // a double line as Cytoscape exports it: short bars across the line, neither a ring nor dots
        const bars = Array.from({ length: 48 }, (_, i): Pt[] => {
            const a = (i * Math.PI) / 24;
            const [c, t] = [Math.cos(a), Math.sin(a)];
            return [
                [100 + 18 * c - 0.3 * t, 100 + 18 * t + 0.3 * c],
                [100 + 22 * c - 0.3 * t, 100 + 22 * t + 0.3 * c],
                [100 + 22 * c + 0.3 * t, 100 + 22 * t - 0.3 * c],
                [100 + 18 * c + 0.3 * t, 100 + 18 * t - 0.3 * c],
            ];
        });
        const slashes = outlinePaintedAsFill(bars);
        assert.strictEqual(slashes?.dashClass, "slashes");
        assert.isTrue(slashes?.patterned);
        assert.isNull(slashes?.width);
    });

    it("leaves a dotted line between two points, an arrowhead and a lone shape as fills", () => {
        const line = Array.from({ length: 16 }, (_, i) => circle(10 + 10 * i, 10 + 5 * i, 1.5));
        assert.isNull(outlinePaintedAsFill(line));
        assert.isNull(outlinePaintedAsFill([square(0, 0, 2), square(10, 0, 1)]));
        assert.isNull(outlinePaintedAsFill([square(0, 0, 20)]));
    });

    it("gives the node its body's fill and shape and the painted ring's line", () => {
        index = 0;
        const hint: Prim["hint"] = { role: "node", id: "a", key: "a" };
        const prims = [
            prim({ tag: "ellipse", points: circle(100, 100, 20), fill: fill("#ff0000"), hint }),
            prim({
                tag: PAINTED_OUTLINE,
                points: circle(100, 100, 20),
                stroke: { ...stroke("#000000", 3), dashClass: "dotted" },
                hint,
            }),
        ];
        const node = associate(prims, 400, 300, { ...graphtyScene(), nodes: [] }).scene.nodes[0];
        assert.strictEqual(node.fill?.color, "#ff0000");
        assert.strictEqual(node.stroke?.dashClass, "dotted");
        assert.strictEqual(node.shape, "ellipse");
    });
});

describe("bodies found by geometry", () => {
    it("gives a node drawn on the middle of a taller box its own shape, not the box's", () => {
        index = 0;
        const rect = (w: number, h: number): Pt[] => [
            [200 - w / 2, 150 - h / 2],
            [200 + w / 2, 150 - h / 2],
            [200 + w / 2, 150 + h / 2],
            [200 - w / 2, 150 + h / 2],
            [200 - w / 2, 150 - h / 2],
        ];
        const prims = [
            prim({ tag: "path", corners: 4, points: rect(95, 75), stroke: stroke("#aaaaaa") }),
            prim({ tag: "path", corners: 4, points: rect(95, 75), fill: { ...fill("#b4b464"), opacity: 0.1 } }),
            prim({ tag: "path", corners: 4, points: rect(80, 20), fill: fill("#ffffff") }),
            prim({ tag: "path", corners: 4, points: rect(80, 20), stroke: stroke("#000000") }),
        ];
        const g = graphtyScene();
        const at = (id: string, w: number, h: number): PScene["nodes"][number] => ({
            ...g.nodes[0],
            id,
            cx: 200,
            cy: 150,
            w,
            h,
            label: null,
        });
        // three placed nodes so the frame fits, and two on one spot
        const guide: PScene = { ...g, edges: [], nodes: [at("group", 95, 75), at("gene", 80, 20)] };
        const a = associate(prims, 400, 300, guide);
        const gene = a.scene.nodes.find((n) => n.id === "gene");
        const group = a.scene.nodes.find((n) => n.id === "group");
        assert.strictEqual(gene?.fill?.color, "#ffffff");
        assert.strictEqual(gene?.stroke?.color, "#000000");
        assert.closeTo(gene?.h ?? 0, 20, 0.5);
        assert.strictEqual(group?.fill?.color, "#b4b464");
    });

    it("takes an outlined shape of size 0 as the body of a node of size 0, its fill painting nowhere", () => {
        const dot: Pt[] = [
            [200, 200],
            [200, 200],
            [200, 200],
        ];
        const prims = [
            ...oraclePrims({ named: false }),
            prim({ points: dot, stroke: stroke("#cccccc", 0.6) }),
            prim({ points: dot, fill: fill("#ffffff") }),
            // a neighbour's arrowhead beside it
            prim({
                tag: "polygon",
                corners: 3,
                points: [
                    [203, 198],
                    [209, 200],
                    [203, 202],
                    [203, 198],
                ],
                fill: fill("#000000"),
            }),
        ];
        const g = graphtyScene();
        // graphty's frame is the oracle's doubled and shifted by (50, 30)
        g.nodes.push({ ...g.nodes[0], id: "anchor", cx: 450, cy: 430, w: 1.2, h: 1.2, label: null });
        const anchor = associate(prims, 400, 300, g).scene.nodes.find((n) => n.id === "anchor");
        assert.isNull(anchor?.fill);
        assert.strictEqual(anchor?.stroke?.color, "#cccccc");
    });
});

describe("what the fit, the averages and the stray match must not hide", () => {
    const node = (id: string, cx: number, cy: number, size = 40, over: Partial<PNode> = {}): PNode => ({
        id,
        cx,
        cy,
        w: size,
        h: size,
        shape: "ellipse",
        fill: fill("#ff0000"),
        stroke: null,
        label: null,
        ...over,
    });
    const sceneOf = (side: PScene["side"], width: number, height: number, nodes: PNode[]): PScene => ({
        side,
        width,
        height,
        background: "#ffffff",
        nodes,
        edges: [],
        groups: [],
        texts: [],
        strays: [],
    });
    const GRID: Pt[] = [
        [100, 100],
        [300, 100],
        [500, 100],
        [100, 300],
        [300, 300],
        [500, 300],
    ];
    const grid = (map: (p: Pt) => Pt = (p) => p, size = 40): PNode[] =>
        GRID.map((p, i) => {
            const [cx, cy] = map(p);
            return node(`n${String(i)}`, cx, cy, size);
        });
    const edge = (id: string, points: Pt[]): PScene["edges"][number] => ({
        id,
        source: "n0",
        target: "n1",
        points,
        stroke: stroke("#0000ff"),
        arrows: [],
        label: null,
    });

    it("judges two nodes too small to draw anything alike, and a drawn node against an undrawn one apart", () => {
        // sigma draws nothing for a node of size 0 (radius 0); graphty draws it 0.014 px across
        const with0 = (w: number): PNode[] => [...grid(), node("zero", 300, 200, w)];
        const undrawn = compareOracle(
            "t",
            sceneOf("oracle", 600, 400, with0(0)),
            sceneOf("graphty", 600, 400, with0(0.014)),
        );
        assert.strictEqual(undrawn.properties["node.width"].passRate, 1);
        assert.strictEqual(undrawn.properties["node.height"].passRate, 1);
        const drawn = compareOracle("t", sceneOf("oracle", 600, 400, with0(0)), sceneOf("graphty", 600, 400, with0(3)));
        assert.isBelow(drawn.properties["node.width"].passRate ?? 1, 1);
    });

    it("passes a drawing judged against itself, with a passing verdict and no failures", () => {
        const r = compareOracle("t", sceneOf("oracle", 600, 400, grid()), sceneOf("graphty", 600, 400, grid()));
        assert.deepEqual(failing(r), []);
        assert.deepEqual(r.verdict, { pass: true, failing: 0 });
        assert.deepEqual(r.failures, {});
    });

    it("fails a sample for one wrong element among many, and names it", () => {
        const g = grid();
        g[3].fill = fill("#0000ff");
        const r = compareOracle("t", sceneOf("oracle", 600, 400, grid()), sceneOf("graphty", 600, 400, g));
        assert.deepEqual(r.verdict, { pass: false, failing: 1 });
        assert.deepEqual(r.failures, { "node.fill": ["n3"] });
    });

    it("fails a node, an edge and an annotation graphty draws that the oracle does not", () => {
        const o = sceneOf("oracle", 600, 400, grid());
        o.edges = [
            edge("e1", [
                [120, 100],
                [280, 100],
            ]),
        ];
        const g = sceneOf("graphty", 600, 400, [...grid(), node("hidden", 300, 200)]);
        // the same edge twice: a duplicate
        g.edges = [
            edge("e1", [
                [120, 100],
                [280, 100],
            ]),
            edge("e2", [
                [120, 100],
                [280, 100],
            ]),
        ];
        g.strays = [
            {
                index: 0,
                tag: "annotation-shape",
                kind: "shape",
                box: { x0: 0, y0: 350, x1: 60, y1: 390 },
                fill: null,
                stroke: null,
                text: null,
            },
        ];
        const r = compareOracle("t", o, g);
        assert.deepEqual(failing(r), ["node.extra", "edge.extra", "stray.extra"]);
        assert.deepEqual(r.failures["node.extra"], ["graphty:hidden"]);
        assert.deepEqual(r.failures["edge.extra"], ["graphty:e2"]);
        assert.deepEqual(r.failures["stray.extra"], ["graphty:annotation-shape#0"]);
    });

    it("matches a stray only to an annotation drawn over most of it", () => {
        const o = sceneOf("oracle", 600, 400, grid());
        o.strays = [
            {
                index: 0,
                tag: "rect",
                kind: "shape",
                box: { x0: 0, y0: 0, x1: 100, y1: 100 },
                fill: "#ffff00",
                stroke: null,
                text: null,
            },
        ];
        const g = sceneOf("graphty", 600, 400, grid());
        // shifted by 40 of its 100 pixels: an intersection over union of 0.43
        g.strays = [
            {
                index: 0,
                tag: "annotation-shape",
                kind: "shape",
                box: { x0: 40, y0: 0, x1: 140, y1: 100 },
                fill: null,
                stroke: null,
                text: null,
            },
        ];
        assert.deepEqual(failing(compareOracle("t", o, g)), ["stray.present", "stray.extra"]);
        g.strays[0].box = { x0: 10, y0: 0, x1: 110, y1: 100 };
        assert.deepEqual(failing(compareOracle("t", o, g)), []);
    });

    it("fails nodes too large or too small for an unrelated layout's spacing, which the size fit hides", () => {
        // graphty laid the graph out otherwise, with nodes three times (and a quarter) the program's size
        const elsewhere: Pt[] = [
            [50, 50],
            [550, 350],
            [100, 350],
            [500, 60],
            [300, 200],
            [250, 380],
        ];
        for (const size of [120, 10]) {
            const g = elsewhere.map(([x, y], i) => node(`n${String(i)}`, x, y, size));
            const r = compareOracle("t", sceneOf("oracle", 600, 400, grid()), sceneOf("graphty", 600, 400, g));
            assert.isTrue(r.transform?.unrelatedLayout);
            assert.strictEqual(r.properties["node.width"].passRate, 1);
            assert.strictEqual(r.properties["node.sizeToSpacing"].passRate, 0, String(size));
            assert.strictEqual(r.properties["node.sizeToExtent"].passRate, 0, String(size));
        }
    });

    it("fails arrowheads too large for the drawing's spacing where the layouts are unrelated", () => {
        const elsewhere: Pt[] = [
            [50, 50],
            [550, 350],
            [100, 350],
            [500, 60],
            [300, 200],
            [250, 380],
        ];
        const o = sceneOf("oracle", 600, 400, grid());
        o.edges = [
            {
                ...edge("e1", [
                    [120, 100],
                    [270, 100],
                ]),
                arrows: [{ end: "target", length: 10, width: 8, filled: true, shape: "triangle", color: "#0000ff" }],
            },
        ];
        const g = sceneOf(
            "graphty",
            600,
            400,
            elsewhere.map(([x, y], i) => node(`n${String(i)}`, x, y, 40)),
        );
        g.edges = [
            {
                ...edge("e1", [
                    [70, 70],
                    [520, 330],
                ]),
                arrows: [{ end: "target", length: 40, width: 32, filled: true, shape: "triangle", color: "#0000ff" }],
            },
        ];
        const r = compareOracle("t", o, g);
        assert.isTrue(r.transform?.unrelatedLayout);
        assert.strictEqual(r.properties["edge.arrowToSpacing"].passRate, 0);
    });

    it("reports a turned frame and a zoomed one instead of fitting them away", () => {
        const o = sceneOf("oracle", 600, 400, grid());
        // a quarter turn, on a canvas turned alike
        const turned = compareOracle(
            "t",
            o,
            sceneOf(
                "graphty",
                400,
                600,
                grid(([x, y]) => [400 - y, x]),
            ),
        );
        assert.deepEqual(failing(turned), ["frame.rotation"]);
        // the same drawing at half the size, in the middle of the same canvas
        const zoomed = compareOracle(
            "t",
            o,
            sceneOf(
                "graphty",
                600,
                400,
                grid(([x, y]) => [150 + x / 2, 100 + y / 2], 20),
            ),
        );
        assert.deepEqual(failing(zoomed), ["frame.zoom"]);
    });

    it("judges positions, label places and routes against their own element, however large the canvas", () => {
        // on a canvas this size, a share of the diagonal is 70 pixels and more: every offset below would pass
        const o = sceneOf("oracle", 6000, 4000, grid());
        const g = grid();
        g[2] = { ...g[2], cx: g[2].cx + 25 };
        assert.deepEqual(failing(compareOracle("t", o, sceneOf("graphty", 6000, 4000, g))), ["node.position"]);
        const labelled = (dy: number): PNode[] => grid().map((n) => ({ ...n, label: text(n.id, n.cx, n.cy + dy) }));
        const ol = sceneOf("oracle", 6000, 4000, labelled(0));
        // moved off its node's middle onto its bottom edge: its place against the node is another too
        assert.deepEqual(failing(compareOracle("t", ol, sceneOf("graphty", 6000, 4000, labelled(20)))), [
            "label.offset",
            "label.anchor",
        ]);
        const oe = sceneOf("oracle", 6000, 4000, grid());
        oe.edges = [
            edge("e1", [
                [120, 100],
                [280, 100],
            ]),
        ];
        const ge = sceneOf("graphty", 6000, 4000, grid());
        ge.edges = [
            edge("e1", [
                [120, 120],
                [280, 120],
            ]),
        ];
        assert.deepEqual(failing(compareOracle("t", oe, ge)), ["edge.route"]);
    });

    it("carries a stand-in oracle's label into the report", () => {
        const o = sceneOf("oracle", 600, 400, grid());
        assert.isTrue(compareOracle("t", o, sceneOf("graphty", 600, 400, grid()), null, { standIn: true }).standIn);
        assert.isFalse(compareOracle("t", o, sceneOf("graphty", 600, 400, grid())).standIn);
    });

    it("measures a drawing's spacing as the median distance to the nearest node", () => {
        assert.strictEqual(medianSpacing(GRID), 200);
        assert.isNull(medianSpacing(GRID.slice(0, 2)));
    });
});

describe("shape classes of a curved outline", () => {
    it("tells an ellipse, a rounded rectangle and another curved shape apart", () => {
        const ellipse = circle(50, 50, 30).map(([x, y]): Pt => [x, 50 + (y - 50) / 2]);
        assert.strictEqual(shapeOf(prim({ points: [...ellipse, ellipse[0]] })), "ellipse");
        // a 100 x 60 rectangle rounded by 10 at each corner, sampled along its outline
        const rounded: Pt[] = [];
        const corner = (cx: number, cy: number, from: number): void => {
            for (let k = 0; k <= 6; k++) {
                const t = from + (k * Math.PI) / 12;
                rounded.push([cx + 10 * Math.cos(t), cy + 10 * Math.sin(t)]);
            }
        };
        corner(90, 50, 0);
        corner(10, 50, Math.PI / 2);
        corner(10, 10, Math.PI);
        corner(90, 10, (3 * Math.PI) / 2);
        assert.strictEqual(shapeOf(prim({ points: [...rounded, rounded[0]] })), "roundrect");
        // a teardrop: curved, and neither
        const drop = Array.from({ length: 24 }, (_, i): Pt => {
            const t = (i * Math.PI) / 12;
            return [50 + (30 * Math.cos(t) * (1 + Math.cos(t))) / 2, 50 + 30 * Math.sin(t)];
        });
        assert.strictEqual(shapeOf(prim({ points: [...drop, drop[0]] })), "other");
        // too few points to tell
        assert.isNull(shapeOf(prim({ points: circle(0, 0, 5).slice(0, 4) })));
    });
});
