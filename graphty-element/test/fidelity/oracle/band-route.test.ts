/**
 * A line a program drew as a band of pieces (Cytoscape desktop's slashed, dotted and dashed edges, exported as
 * filled shapes) is routed through its pieces, so a curved edge is read as the curve it is drawn along.
 */
import { assert, describe, it } from "vitest";

import { bandPaintedAsFill, type Pt } from "./primitives";

/** A slash: a thin rectangle `len` long, turned `turn` from the x axis, its outline sampled every 0.2. */
function slash(cx: number, cy: number, turn: number, len = 8, thick = 1): Pt[] {
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    const corners: Pt[] = [
        [-thick / 2, -len / 2],
        [thick / 2, -len / 2],
        [thick / 2, len / 2],
        [-thick / 2, len / 2],
    ];
    const out: Pt[] = [];
    corners.forEach(([x0, y0], i) => {
        const [x1, y1] = corners[(i + 1) % corners.length];
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2));
        for (let k = 0; k < steps; k++) {
            const [x, y] = [x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps];
            out.push([cx + x * c - y * s, cy + x * s + y * c]);
        }
    });
    return out;
}

/** The farthest any point of a route lies from the straight line through its two ends. */
function bow(route: readonly Pt[]): number {
    const [a, b] = [route[0], route[route.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return Math.max(...route.map(([x, y]) => Math.abs((x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0])) / len));
}

describe("a band drawn in pieces", () => {
    it("is routed through its pieces, so slashes along an arc read as the arc and not its chord", () => {
        // 21 slashes along a 200-long arc that sags 30 below its chord
        const pieces = Array.from({ length: 21 }, (_, i) => {
            const x = 10 * i;
            const y = 30 * Math.sin((Math.PI * x) / 200);
            return slash(x, y, 0.4);
        });
        const band = bandPaintedAsFill(pieces);
        assert.strictEqual(band?.dashClass, "slashes");
        const route = band?.route ?? [];
        assert.isAbove(route.length, 20);
        assert.isAbove(bow(route), 25);
        // in order along the line
        for (let i = 1; i < route.length; i++) {
            assert.isAtLeast(route[i][0], route[i - 1][0] - 1e-6);
        }
    });

    it("keeps a straight band of pieces on its axis", () => {
        const band = bandPaintedAsFill(Array.from({ length: 20 }, (_, i) => slash(5 + 10 * i, 0, 0.4)));
        assert.strictEqual(band?.dashClass, "slashes");
        assert.isUndefined(band?.route);
    });

    it("reads a straight double line drawn as short pieces on its two rows as straight, midway between the rows", () => {
        // Cytoscape desktop's PARALLEL_LINES (cx-specimen-edges-lines): 1 x 1.5 pieces in turn on two rows 4.5 apart
        const pieces = Array.from({ length: 120 }, (_, i) =>
            slash(10 + Math.floor(i / 2), i % 2 === 0 ? 0 : 4.5, Math.PI / 2, 1, 1.5),
        );
        const band = bandPaintedAsFill(pieces);
        assert.strictEqual(band?.dashClass, "double");
        assert.isUndefined(band?.route, "straight, not zigzagged from one row to the other");
        assert.closeTo(band?.ends[0][1] ?? 0, 2.25, 0.01);
    });

    it("reads a slanted double line whose pieces are not always drawn in turn on its rows as straight", () => {
        // cys-syn-mappings 366->387: rows 0.8 apart, pieces 0.7 apart along, sorted along the line some fall twice on a row
        const slope = -0.014;
        const pieces = Array.from({ length: 400 }, (_, i) => {
            const side = (i % 2 === 0) !== (i % 37 === 0) ? -0.4 : 0.4;
            const x = 0.35 * i;
            return slash(x - side * slope, x * slope + side, Math.PI / 2, 0.25, 0.25);
        });
        const band = bandPaintedAsFill(pieces);
        assert.strictEqual(band?.dashClass, "double");
        assert.isUndefined(band?.route, "straight, not zigzagged from one row to the other");
    });
});
