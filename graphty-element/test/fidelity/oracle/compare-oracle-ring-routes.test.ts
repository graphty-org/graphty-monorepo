/**
 * A self-loop drawn as a whole circle is a ring: vis-network strokes it as an arc from 0 to 2 pi, whose ends miss
 * each other by a rounding, starting at the circle's right; graph-io writes it starting on the side facing its node.
 * Judged as an open line, the oracle's ring bent 2078 chords off a chord of a hundredth of a pixel, and the two rings,
 * started at different places, were a third of their length apart (vis-network-specimen-edges-lines
 * self-reference-angle: edge.curve 2078 against 1, edge.route 0.318). And a line that starts on its node's outline
 * and runs across the node is judged from where it last leaves it on both sides; and a line a few pixels long between
 * nodes that nearly touch is not failed for a bend under a pixel deep (gexf-sigma-ediaspora 63 -> 66).
 */
import { assert, describe, it } from "vitest";

import { clipToNodes, compareOracle, curvatureOf, routeShape } from "./compare-oracle";
import type { PEdge, PNode, PScene, Pt } from "./primitives";

/**
 * A circle sampled from an angle, either way round.
 * @param from - the angle it starts at, radians
 * @param way - 1 counterclockwise, -1 clockwise
 * @param miss - how far short of a whole turn it stops, radians
 * @returns the points
 */
function circle(from: number, way: 1 | -1, miss = 0): Pt[] {
    return Array.from({ length: 65 }, (_, i): Pt => {
        const a = from + way * (2 * Math.PI - miss) * (i / 64);
        return [100 + 20 * Math.cos(a), 100 + 20 * Math.sin(a)];
    });
}

describe("a ring's route", () => {
    it("bends as a loop does, whether its ends meet exactly or miss by a rounding", () => {
        assert.strictEqual(curvatureOf(circle(0, 1, 1e-5)), 1);
        assert.strictEqual(curvatureOf(circle(Math.PI, 1)), 1);
    });

    it("is the same ring wherever it starts and whichever way it runs", () => {
        const { gap } = routeShape(circle(0, 1, 1e-5), circle(Math.PI * 0.75, -1));
        assert.isBelow(gap, 0.01);
    });

    it("is another ring when it is drawn elsewhere", () => {
        const moved = circle(0, 1).map(([x, y]): Pt => [x + 20, y]);
        assert.isAbove(routeShape(circle(0, 1), moved).gap, 0.1);
    });
});

describe("a line that starts on the far side of its node", () => {
    const node = (id: string, cx: number): PNode => ({
        id,
        cx,
        cy: 100,
        w: 24,
        h: 24,
        shape: "ellipse",
        fill: null,
        stroke: null,
        label: null,
    });
    const [s, t] = [node("s", 100), node("t", 176)];

    it("is judged from where it last leaves the node, whether its start rounds onto the outline or inside it", () => {
        // Cytoscape.js `source-endpoint: -50% 0%`: from the node's left edge, across it, to the next node
        const onOutline = clipToNodes(
            [
                [88, 100],
                [164, 100],
            ],
            s,
            t,
        );
        const inside = clipToNodes(
            [
                [88.01, 100],
                [164, 100],
            ],
            s,
            t,
        );
        assert.closeTo(onOutline[0][0], 112, 0.01);
        assert.closeTo(inside[0][0], 112, 0.01);
    });
});

describe("a short line between nodes that nearly touch", () => {
    const disc = (id: string, cx: number, cy: number, r: number): PNode => ({
        id,
        cx,
        cy,
        w: 2 * r,
        h: 2 * r,
        shape: "ellipse",
        fill: { color: "#cccccc", opacity: 1, gradient: null },
        stroke: null,
        label: null,
    });
    // a grid that fixes the frame, and two nodes 9 px apart at their outlines
    const nodes = [disc("a", 100, 100, 20), disc("b", 500, 100, 20), disc("c", 100, 300, 20), disc("d", 500, 300, 20)];
    const pair = [disc("p", 300, 150, 36), disc("q", 300, 212, 17)];
    const scene = (side: PScene["side"], points: Pt[]): PScene => ({
        side,
        width: 600,
        height: 400,
        background: "#ffffff",
        nodes: [...nodes, ...pair],
        edges: [
            {
                id: "p->q",
                source: "p",
                target: "q",
                points,
                stroke: { color: "#000000", opacity: 1, width: 1, dash: null, dashClass: "solid" },
                arrows: [],
                label: null,
            } satisfies PEdge,
        ],
        groups: [],
        texts: [],
        strays: [],
    });

    it("is not failed for a bend under a pixel deep", () => {
        const straight = scene("oracle", [
            [300, 186],
            [300, 195],
        ]);
        // the same 9 px, bowed 0.9 px at its middle: 0.1 of its chord, under a pixel
        const bowed = scene("graphty", [
            [300, 186],
            [300.9, 190.5],
            [300, 195],
        ]);
        assert.strictEqual(compareOracle("t", straight, bowed).properties["edge.curve"].passRate, 1);
    });

    it("is failed for a bend a reader sees", () => {
        const straight = scene("oracle", [
            [300, 186],
            [300, 195],
        ]);
        const bowed = scene("graphty", [
            [300, 186],
            [305, 190.5],
            [300, 195],
        ]);
        assert.strictEqual(compareOracle("t", straight, bowed).properties["edge.curve"].passRate, 0);
    });
});

describe("a loop's ring drawn behind its node", () => {
    it("shows only the arc outside the node, wherever the program started stroking it", () => {
        const n: PNode = {
            id: "n",
            cx: 100,
            cy: 100,
            w: 24,
            h: 24,
            shape: "ellipse",
            fill: null,
            stroke: null,
            label: null,
        };
        // a circle of 20 centered on the node's outline to the right, stroked from its own right, as vis-network does
        const ring = circle(0, 1).map(([x, y]): Pt => [x + 12, y]);
        const shown = clipToNodes(ring, n, n);
        const onOutline = (p: Pt): number => Math.hypot(p[0] - 100, p[1] - 100);
        assert.closeTo(onOutline(shown[0]), 12, 0.05);
        assert.closeTo(onOutline(shown.at(-1) ?? shown[0]), 12, 0.05);
        assert.isFalse(shown.some((p) => onOutline(p) < 11.9));
    });
});
