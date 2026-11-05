/**
 * How the oracle comparison reads yEd's arrow ends (#5846, #5850): two lines drawn over one another pair by their
 * heads, a cap stood back from its line's end is judged by how far back, and a cap on a short line stays its end's
 * even when it sits nearer the middle. Each reading comes with the wrong drawing it must still fail.
 */
import { assert, describe, it } from "vitest";

import { arrowheadEdge } from "./associate";
import { compareOracle } from "./compare-oracle";
import { boxOfPoints, type PArrow, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const node = (id: string, cx: number, cy: number, size = 20): PNode => ({
    id,
    cx,
    cy,
    w: size,
    h: size,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const NODES = [node("a", 100, 100), node("b", 300, 100), node("c", 100, 300), node("d", 300, 300)];
const INK = "#000000";
const head = (shape: PArrow["shape"], over: Partial<PArrow> = {}): PArrow => ({
    end: "target",
    length: 8,
    width: 8,
    filled: true,
    shape,
    color: INK,
    ...over,
});
const line = (id: string, arrows: PArrow[]): PEdge => ({
    id,
    source: "a",
    target: "b",
    points: [
        [110, 100],
        [290, 100],
    ],
    stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows,
    label: null,
});
const scene = (side: PScene["side"], edges: PEdge[]): PScene => ({
    side,
    width: 400,
    height: 400,
    background: "#ffffff",
    nodes: NODES,
    edges,
    groups: [],
    texts: [],
    strays: [],
});
const stroke = (points: Pt[], closed: boolean): Prim => ({
    index: 0,
    tag: "path",
    kind: "path",
    box: boxOfPoints(points),
    points,
    closed,
    corners: 0,
    fill: null,
    stroke: { color: INK, opacity: 1, width: 1, dash: null, dashClass: "solid" },
    text: null,
    markers: { start: false, end: false },
    hint: null,
});

describe("two lines alike, drawn over one another", () => {
    const oracle = scene("oracle", [line("a->b#g0", [head("tee")]), line("a->b#g1", [head("vee")])]);

    it("pairs each with graphty's that has its head", () => {
        const g = scene("graphty", [line("1", [head("vee")]), line("2", [head("tee")])]);
        assert.strictEqual(compareOracle("t", oracle, g).properties["edge.arrowShape"].passRate, 1);
    });

    it("still fails a head graphty draws wrong", () => {
        const g = scene("graphty", [line("1", [head("vee")]), line("2", [head("vee")])]);
        assert.strictEqual(compareOracle("t", oracle, g).properties["edge.arrowShape"].passRate, 0.5);
    });
});

describe("a cap stood back from its line's end", () => {
    const at = (back: number): Pt => [290 - back, 100];
    const oracle = scene("oracle", [line("a->b#0", [head("tee", { at: at(10) })])]);
    const place = (back: number): number | null => {
        const g = scene("graphty", [line("1", [head("tee", { at: at(back), standing: true })])]);
        return compareOracle("t", oracle, g).properties["edge.arrowPlace"].passRate;
    };

    it("passes as far back as the program stands it", () => {
        assert.strictEqual(place(11), 1);
    });

    it("fails drawn at the end, or further back than the program stands it", () => {
        assert.strictEqual(place(0), 0);
        assert.strictEqual(place(25), 0);
    });
});

describe("which end a stroke caps", () => {
    const short: PEdge = {
        ...line("a->b#g0", []),
        points: [
            [100, 100],
            [164, 100],
        ],
    };

    it("reads a bar 8 px off a short line's middle as the end's, stood back from it", () => {
        const bar = stroke(
            [
                [140, 91],
                [140, 109],
            ],
            false,
        );
        assert.strictEqual(arrowheadEdge(bar, [short], [])?.end, "target");
    });

    it("keeps a bar on the line's middle as the middle's", () => {
        const bar = stroke(
            [
                [132, 91],
                [132, 109],
            ],
            false,
        );
        assert.strictEqual(arrowheadEdge(bar, [short], [])?.end, "middle");
    });

    it("keeps a triangle set with its tip on the line's middle as the middle's", () => {
        const triangle: Pt[] = [
            [132, 100],
            [120, 94],
            [120, 106],
        ];
        assert.strictEqual(arrowheadEdge({ ...stroke(triangle, true), kind: "shape" }, [short], [])?.end, "middle");
    });

    const end = node("b", 170, 104, 24);
    const toNode: PEdge = {
        ...line("a->b#g0", []),
        points: [
            [100, 100],
            [158, 100],
        ],
    };

    it("reads two arms round a small node's center as its line's head", () => {
        const arms: Pt[] = [
            [160, 100],
            [176, 92],
            [160, 100],
            [176, 108],
        ];
        assert.strictEqual(arrowheadEdge(stroke(arms, true), [toNode], [end])?.end, "target");
    });

    it("keeps a closed shape with an inside round a node's center as the node's", () => {
        const triangle: Pt[] = [
            [160, 104],
            [180, 92],
            [180, 116],
        ];
        assert.strictEqual(arrowheadEdge(stroke(triangle, true), [toNode], [end]), null);
    });
});
