/**
 * An arrowhead read along its own axis where its line stops at its back, as Gephi draws one on a curved edge.
 */

import { assert, describe, it } from "vitest";

import { extendToTip, measureArrow } from "./associate";
import type { Pt } from "./primitives";

/** Points along a circular arc from `a` to `b` of radius `r`, bending clockwise on screen (SVG sweep 1). */
function arc(a: Pt, b: Pt, r: number, n = 32): Pt[] {
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const half = Math.hypot(dx, dy) / 2;
    const h = Math.sqrt(r * r - half * half);
    // the center lies to the right of a -> b on screen for a clockwise sweep
    const c: Pt = [mx - (dy / (2 * half)) * h, my + (dx / (2 * half)) * h];
    const t0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    let t1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
    while (t1 < t0) {
        t1 += 2 * Math.PI;
    }
    return Array.from({ length: n + 1 }, (_, i) => {
        const t = t0 + ((t1 - t0) * i) / n;
        return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
    });
}

describe("an arrowhead's axis", () => {
    // gexf-specimen-arrows-p4, edge weight-4: Gephi's arc ends at the arrowhead's back and the arrowhead points from
    // there at the target node's center, about 14 degrees off the arc's end direction
    const path = arc([854.059814, -676.110657], [894.440796, -679.998352], 63.333331);
    const head: Pt[] = [
        [905.31427, -674.92218],
        [891.90271, -674.561584],
        [896.978882, -685.43512],
    ];

    it("reads a cap drawn on from where its line stops along the cap's own axis", () => {
        assert.strictEqual(measureArrow(head, path, "target", { filled: true, color: null }).shape, "triangle");
    });

    it("reads the cap along its own axis on a short arc, turned up to the most Gephi's aim turns from its arc", () => {
        // gexf-graphology-rio, edge ncs337 -> ncs291: a 1.4 px arc whose arrowhead aims 34 degrees off the arc's end
        const short = arc([-91.541199, 284.750946], [-91.010086, 283.457123], 9.752835);
        const cap: Pt[] = [
            [-88.515694, 281.790375],
            [-90.17672, 284.704315],
            [-91.843452, 282.20993],
        ];
        assert.strictEqual(measureArrow(cap, short, "target", { filled: true, color: null }).shape, "triangle");
    });

    it("keeps the line's direction for half an arrow, which is symmetric about no axis through its tip", () => {
        const end = path.at(-1) ?? [0, 0];
        const back = path[path.length - 4];
        const len = Math.hypot(end[0] - back[0], end[1] - back[1]);
        const [ux, uy] = [(end[0] - back[0]) / len, (end[1] - back[1]) / len];
        // a barb on one side of the line, its tip on the line 12 ahead of its end
        const barb: Pt[] = [
            [end[0], end[1]],
            [end[0] + 12 * ux, end[1] + 12 * uy],
            [end[0] - 5 * uy, end[1] + 5 * ux],
        ];
        assert.strictEqual(measureArrow(barb, path, "target", { filled: true, color: null }).shape, "half");
    });
});

/**
 * A cubic Bezier spline (its start, then three points a piece) sampled at `n` points evenly by arc length, as the
 * oracle's SVG reader samples an edge's line (128 points).
 */
function spline(points: readonly Pt[], n = 128): Pt[] {
    const fine: Pt[] = [points[0]];
    for (let k = 1; k + 2 < points.length; k += 3) {
        const [p0, p1, p2, p3] = [points[k - 1], points[k], points[k + 1], points[k + 2]];
        for (let i = 1; i <= 1000; i++) {
            const t = i / 1000;
            const [a, b, c, d] = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
            fine.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
        }
    }
    const at = [0];
    for (let i = 1; i < fine.length; i++) {
        at.push(at[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
    }
    const total = at.at(-1) ?? 0;
    let j = 0;
    return Array.from({ length: n }, (_, i): Pt => {
        const want = (total * i) / (n - 1);
        while (j < fine.length - 1 && at[j + 1] < want) {
            j++;
        }
        return fine[Math.min(j + 1, fine.length - 1)];
    });
}

describe("an arrowhead at the end of a curved line", () => {
    // dot-profile, edge main -> fclose: Graphviz's spline bends through 60 degrees, and its arrowhead (a polygon closed
    // by repeating its first point) sits on the spline's end tangent, its back on the line's end
    const path = spline([
        [962.1, -449.44],
        [856.97, -450.42],
        [515.3, -449.36],
        [422.1, -396],
        [397.76, -382.07],
        [380.24, -354.7],
        [369.75, -333.97],
    ]);
    const head: Pt[] = [
        [373.03, -332.72],
        [365.56, -325.21],
        [366.72, -335.74],
        [373.03, -332.72],
    ];

    it("reads it along the line's end direction, not along a chord from far back on the curve", () => {
        const arrow = measureArrow(head, path, "target", { filled: true, color: null });
        assert.strictEqual(arrow.shape, "triangle");
        // Graphviz's arrowhead: 10 points long, 3.5 wide each side (arrows.c ARROW_LENGTH, ARROW_WIDTH)
        assert.closeTo(arrow.length, 10, 0.3);
        assert.closeTo(arrow.width, 7, 0.3);
    });

    it("carries the line on to the arrowhead's tip", () => {
        const end = extendToTip(path, head, "target").at(-1) ?? [0, 0];
        assert.isBelow(Math.hypot(end[0] - 365.56, end[1] + 325.21), 0.5);
    });

    // dot-specimen-edges-lines-p11, edge pos-arrow-both-points: `pos` names both end points, and Graphviz draws each
    // arrowhead from the spline's end to its point (arrows.c), 65 degrees off the spline there
    const both = spline([
        [934.33, -450],
        [948.33, -477],
        [974.33, -477],
        [978.33, -450],
    ]);
    const atTarget: Pt[] = [
        [977.59, -453.88],
        [986.16, -447.65],
        [975.57, -447.17],
        [977.59, -453.88],
    ];
    const atSource: Pt[] = [
        [937.09, -447.17],
        [926.51, -447.65],
        [935.08, -453.88],
        [937.09, -447.17],
    ];

    it("reads an arrowhead drawn from the line's end to a point of its own along its own axis, at both ends", () => {
        for (const [head, end] of [
            [atTarget, "target"],
            [atSource, "source"],
        ] as const) {
            const arrow = measureArrow(head, both, end, { filled: true, color: null });
            assert.strictEqual(arrow.shape, "triangle", end);
            assert.closeTo(arrow.length, 10, 0.5, end);
        }
    });
});
