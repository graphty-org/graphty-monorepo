/**
 * The oracle comparison's pure half -- association of raw SVG primitives with graph elements,
 * the similarity fit and the per-property judgement -- on hand-built primitives, so each rule is
 * pinned without a browser: a markup-named drawing and an unnamed one associate the same way, a
 * drawing judged against itself under a similarity passes everything, and each defect the owner
 * reported (a fivefold arrowhead, a bold label, a missing outline, a missing annotation box, a
 * turned label) fails exactly the property that names it.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { compareOracle, curvatureOf } from "./compare-oracle";
import { boxOfPoints, type PFill, type Prim, type PScene, type PStroke, type Pt, type PText } from "./primitives";

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
function oraclePrims(opts: { named: boolean; arrowScale?: number; stray?: boolean }): Prim[] {
    index = 0;
    const hint = (role: "node" | "edge", id: string): Prim["hint"] => (opts.named ? { role, id } : null);
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
                stroke: stroke("#000000", 2),
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
    over: { arrowLength?: number; weight?: number; stroke?: boolean; rotation?: number } = {},
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
            stroke: over.stroke === false ? null : stroke("#000000", 4),
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
