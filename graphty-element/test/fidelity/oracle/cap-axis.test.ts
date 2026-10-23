/**
 * An arrowhead read along its own axis where its line stops at its back, as Gephi draws one on a curved edge.
 */

import { assert, describe, it } from "vitest";

import { measureArrow } from "./associate";
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
