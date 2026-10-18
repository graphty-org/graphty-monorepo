/**
 * The oracle comparison's pure half -- association of raw SVG primitives with graph elements,
 * the similarity fit and the per-property judgement -- on hand-built primitives, so each rule is
 * pinned without a browser: a markup-named drawing and an unnamed one associate the same way, a
 * drawing judged against itself under a similarity passes everything, and each defect the owner
 * reported (a fivefold arrowhead, a bold label, a missing outline, a missing annotation box, a
 * turned label) fails exactly the property that names it.
 */
import { assert, describe, it } from "vitest";

import { associate, diskColor, rasterScene } from "./associate";
import { compareOracle, curvatureOf } from "./compare-oracle";
import { boxOfPoints, type PFill, type Prim, type PScene, type PStroke, type Pt, type PText } from "./primitives";
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

/** graphty's drawing of the same graph, scaled by 2 and shifted, as its primitive scene. */
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
        width: 900,
        height: 700,
        background: "#ffffff",
        nodes: [node("a", 100, 100), node("b", 300, 100), node("c", 200, 250)],
        edges: [
            {
                id: "e1",
                source: "a",
                target: "b",
                points: [map([120, 100]), map([280, 100])],
                stroke: stroke("#0000ff", 2),
                arrows: [{ end: "target", length: over.arrowLength ?? 20, width: 16, filled: true }],
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

    it("fails the arrowhead length of a fivefold arrowhead and nothing else", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: true }), graphtyScene({ arrowLength: 100 }))), [
            "edge.arrowLength",
        ]);
    });

    it("fails the label weight of a bold label drawn over a normal one", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: false }), graphtyScene({ weight: 700 }))), ["label.weight"]);
    });

    it("fails the outline of nodes drawn without one", () => {
        assert.deepEqual(failing(run(oraclePrims({ named: true }), graphtyScene({ stroke: false }))), ["node.stroke"]);
    });

    it("judges two thin outlines either side of the hairline as one outline, and a thick one as another", () => {
        // the oracle's 0.2 px is under the hairline; graphty's 0.54 px is 0.27 px in the oracle's frame
        assert.deepEqual(failing(run(oraclePrims({ named: true, outline: 0.2 }), graphtyScene({ outline: 0.54 }))), []);
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

    it("fails the node positions of a drawing mirrored top to bottom, unless the program is known to mirror", () => {
        const g = graphtyScene();
        const flip = ([x, y]: Pt): Pt => [x, 700 - y];
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
