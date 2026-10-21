/**
 * The oracle comparison's pairing of a mutual pair of arcs: Pajek bows `a -> c` and `c -> a` apart, so each is the
 * other's route run backwards, a little to one side, within the route tolerance on a long chord. Paired by its route
 * alone, `a -> c` took graphty's `c -> a` and was judged with its arrowhead at the other end (pajek-synth-lines 6 -> 26
 * and 26 -> 6).
 */
import { assert, describe, it } from "vitest";

import { compareOracle } from "./compare-oracle";
import type { PEdge, PNode, PScene, Pt } from "./primitives";

const node = (id: string, cx: number, cy: number): PNode => ({
    id,
    cx,
    cy,
    w: 20,
    h: 20,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const NODES = [node("a", 100, 100), node("b", 300, 300), node("c", 500, 100), node("d", 100, 300)];
/** A bow from one node to another, `off` px to the side at its middle, its arrowhead at the target. */
const arc = (id: string, source: string, target: string, from: Pt, to: Pt, off: number): PEdge => ({
    id,
    source,
    target,
    points: Array.from({ length: 17 }, (_, i): Pt => {
        const t = i / 16;
        return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + off * 4 * t * (1 - t)];
    }),
    stroke: { color: "#ff00ff", opacity: 1, width: 2, dash: null, dashClass: "solid" },
    arrows: [{ end: "target", length: 12, width: 10, filled: true, shape: "triangle", color: "#ff00ff" }],
    label: null,
});
const scene = (side: PScene["side"], edges: PEdge[]): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: NODES,
    edges,
    groups: [],
    texts: [],
    strays: [],
});

describe("a mutual pair of arcs bowed apart", () => {
    it("pairs each arc with graphty's that runs its way, not the other bowed back over it", () => {
        const [a, c]: [Pt, Pt] = [
            [110, 100],
            [490, 100],
        ];
        const o = scene("oracle", [arc("a->c#0", "a", "c", a, c, 8), arc("c->a#0", "c", "a", c, a, -8)]);
        // graphty lists c -> a first
        const g = scene("graphty", [arc("2", "c", "a", c, a, -8), arc("1", "a", "c", a, c, 8)]);
        const report = compareOracle("t", o, g);
        assert.strictEqual(report.properties["edge.arrow"].passRate, 1);
        assert.strictEqual(report.properties["edge.route"].passRate, 1);
    });

    it("pairs them by their arrowheads where the markup names an edge's two nodes in no order (Gephi)", () => {
        const [a, c]: [Pt, Pt] = [
            [110, 100],
            [490, 100],
        ];
        // the oracle's names run a -> c for both, each line's own arrowhead telling its way
        const reversed = { ...arc("a->c#1", "a", "c", a, c, 8), arrows: [] as PEdge["arrows"] };
        reversed.arrows = [{ end: "source", length: 12, width: 10, filled: true, shape: "triangle", color: "#ff00ff" }];
        reversed.points = arc("x", "c", "a", c, a, -8).points.reverse();
        const o = scene("oracle", [arc("a->c#0", "a", "c", a, c, 8), reversed]);
        const g = scene("graphty", [arc("2", "c", "a", c, a, -8), arc("1", "a", "c", a, c, 8)]);
        assert.strictEqual(compareOracle("t", o, g).properties["edge.arrow"].passRate, 1);
    });
});
