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

    it("reads the line on under a dot centered on its end over the dot's size, past a last step back to its center", () => {
        // vis-network-specimen-mappings-bypass, edge-default as graphty draws it: a curved line runs on under its dot
        // and its last point steps back to the dot's middle, which the dot's outline starts from (its outline as
        // drawn: its middle, then its rim, closed)
        const line: Pt[] = [
            [443.7, 514.0],
            [446.7, 514.1],
            [449.6, 514.5],
            [452.6, 515.2],
            [455.5, 516.1],
            [458.4, 517.3],
            [461.3, 518.7],
            [464.1, 520.4],
            [467.0, 522.4],
            [469.8172505538821, 524.6311584386063],
            [472.64082135871774, 527.1214192159192],
            [475.449453038766, 529.8738387819064],
            [469.111681787777, 523.0349204877961],
        ];
        const dot: Pt[] = [
            [469.111681787777, 523.0349204877961],
            [475.9871906703071, 530.4541149606299],
            [474.4076667371976, 531.6529025361442],
            [472.62462107250457, 532.5205058945605],
            [470.7065751211785, 533.0235835253725],
            [468.7272383134763, 533.1428024373572],
            [466.76267545289306, 532.8735811145856],
            [464.88838358842145, 532.2262655815111],
            [463.17639070529816, 531.2257318110508],
            [461.69248772992495, 529.9104297548977],
            [460.4937002214631, 528.3309057334399],
            [459.6260969115749, 526.5478599690148],
            [459.1230193089019, 524.6298139104056],
            [459.0038004035855, 522.650476991992],
            [459.27302171129855, 520.6859140215238],
            [459.9203372081664, 518.8116220522164],
            [460.92087092266337, 517.0996290733352],
            [462.2361729052469, 515.6157260149622],
            [463.8156968383564, 514.4169384394479],
            [465.59874250304944, 513.5493350810315],
            [467.5167884543755, 513.0462574502196],
            [469.4961252620777, 512.9270385382349],
            [471.46068812266094, 513.1962598610064],
            [473.33497998713256, 513.843575394081],
            [475.04697287025584, 514.8441091645412],
            [476.53087584562905, 516.1594112206943],
            [477.7296633540909, 517.7389352421521],
            [478.5972666639791, 519.5219810065773],
            [479.1003442666521, 521.4400270651865],
            [479.2195631719685, 523.4193639836001],
            [478.95034186425545, 525.3839269540682],
            [478.3030263673876, 527.2582189233757],
            [477.30249265289063, 528.9702119022568],
            [475.9871906703071, 530.4541149606299],
        ];
        const end = extendToTip(line, dot, "target").at(-1) ?? [0, 0];
        // carried on ahead, down the curve, not back up it along the last step
        assert.isAbove(end[0], 475);
    });

    it("reads a cap the line runs on under along the line across the cap, not at the line's end", () => {
        // json-vis-unix, edge 3 BSD -> 4 BSD: vis-network runs the curved line on past its arrowhead to the target
        // node's middle, under the node, where it has turned 14 degrees from the arrowhead's axis
        const line: Pt[] = [
            [664.843, 764.32],
            [665.078, 764.8],
            [665.32, 765.277],
            [665.566, 765.751],
            [665.819, 766.222],
            [666.077, 766.69],
            [666.341, 767.156],
            [666.61, 767.617],
            [666.884, 768.076],
            [667.164, 768.532],
            [667.449, 768.984],
            [667.739, 769.433],
            [668.034, 769.879],
            [668.334, 770.322],
            [668.638, 770.761],
            [668.948, 771.197],
            [669.262, 771.629],
            [669.581, 772.058],
            [669.905, 772.484],
            [670.233, 772.906],
            [670.565, 773.325],
            [670.902, 773.74],
            [671.243, 774.152],
            [671.587, 774.561],
            [671.936, 774.966],
            [672.289, 775.367],
            [672.646, 775.765],
            [673.006, 776.16],
            [673.371, 776.552],
            [673.738, 776.94],
            [674.11, 777.324],
            [674.484, 777.705],
            [674.863, 778.083],
            [675.244, 778.458],
            [675.629, 778.829],
            [676.017, 779.197],
            [676.408, 779.561],
            [676.802, 779.923],
            [677.199, 780.281],
            [677.599, 780.636],
        ];
        const head: Pt[] = [
            [670.826, 773.649],
            [662.765, 766.844],
            [665.856, 766.033],
            [667.842, 763.53],
            [670.826, 773.649],
        ];
        assert.strictEqual(measureArrow(head, line, "target", { filled: true, color: null }).shape, "triangle");
    });
});

describe("an arrowhead drawn as separate pieces in one path", () => {
    // cytoscapejs-specimen-arrows-p2: Cytoscape.js draws its compound arrows as one filled path of two subpaths;
    // these are its middle ones on edges running left to right, pointing back at their sources
    const look = { filled: true, color: null };
    const disc = (cx: number, cy: number, r: number): Pt[] =>
        Array.from({ length: 33 }, (_, i): Pt => {
            const t = (2 * Math.PI * i) / 32;
            return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
        });

    it("reads a triangle with a bar behind it as its triangle, pointing back (mid-source triangle-tee)", () => {
        const path: Pt[] = [
            [80.437, 139.229],
            [145.201, 139.229],
        ];
        const triangle: Pt[] = [
            [112.819, 139.229],
            [121.229, 143.434],
            [121.229, 135.024],
            [112.819, 139.229],
        ];
        const bar: Pt[] = [
            [124.032, 135.024],
            [126.835, 135.024],
            [126.835, 143.434],
            [124.032, 143.434],
            [124.032, 135.024],
        ];
        const outline = [...triangle, ...bar];
        // read as one outline, the stretch from one piece to the next makes no shape
        assert.strictEqual(measureArrow(outline, path, "middle", look).shape, "other");
        assert.strictEqual(
            measureArrow(outline, path, "middle", { ...look, pieces: [triangle, bar] }).shape,
            "inverted",
        );
    });

    it("reads a disc with a triangle behind it pointing at it as a circle-triangle", () => {
        const path: Pt[] = [
            [188.7, 139.229],
            [253.464, 139.229],
        ];
        const circle = disc(221.082, 139.229, 4.205);
        const triangle: Pt[] = [
            [225.287, 139.229],
            [233.696, 143.434],
            [233.696, 135.024],
            [225.287, 139.229],
        ];
        const pieces = [circle, triangle];
        assert.strictEqual(measureArrow(pieces.flat(), path, "middle", { ...look, pieces }).shape, "circle-triangle");
        assert.strictEqual(measureArrow(pieces.flat(), path, "target", { ...look, pieces }).shape, "circle-triangle");
    });

    it("leaves pieces that are none of these unread", () => {
        const path: Pt[] = [
            [0, 0],
            [100, 0],
        ];
        const pieces = [disc(95, 0, 4), disc(85, 0, 4)];
        assert.strictEqual(measureArrow(pieces.flat(), path, "target", { ...look, pieces }).shape, "other");
    });
});

describe("an inverted arrowhead on a line that kinks at its end", () => {
    it("is read along its own axis, not the kinked line's last run (dot-synth-edges-clusters c7_1 -> c8_0)", () => {
        // Graphviz's `inv` at the end of a spline whose last few pixels turn 30 degrees off the run before them,
        // sampled every 4 px: the last sampled run is the long one
        const path: Pt[] = [
            [740.71, 273.46],
            [744.83, 273.63],
            [748.95, 273.8],
            [753.07, 273.97],
            [757.2, 274.14],
            [761.14, 274.78],
        ];
        const head: Pt[] = [
            [764.91, 276.07],
            [761.02, 274.69],
            [763.2, 278.2],
            [764.91, 276.07],
            [764.91, 276.07],
        ];
        assert.strictEqual(measureArrow(head, path, "target", { filled: true, color: null }).shape, "inverted");
    });
});
