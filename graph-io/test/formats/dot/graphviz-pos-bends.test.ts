import { describe, expect, it } from "vitest";

import { graphvizPosBends, graphvizPosCurve } from "../../../src/formats/dot/index.js";

describe("graphvizPosBends", () => {
    it("reads a spline that bows off the line between the centers as bends", () => {
        const bends = graphvizPosBends([0, 0], [100, 0], "10,0 30,40 70,40 90,0");
        expect(bends).not.toBeNull();
        expect(Math.max(...(bends ?? "").split(" ").map((pair) => Number(pair.split(",")[1])))).toBeGreaterThan(0.2);
    });

    it("reads a line Graphviz drew straight (splines=false), half a point off the centers' line, as no bends", () => {
        // linux-kernel's VFS -> mmap: 0.61 points off a 345-point line
        expect(graphvizPosBends([0, 0], [345, 0], "20,0.61 100,0.4 240,0.2 320,0")).toBeNull();
    });

    it("reads a self-loop given its node's size as offsets round the node, its ends included", () => {
        // splines=ortho round a 24-point circle at (180, 464): out of its left top, round its east side, back in
        const pos = "163,468.68 163,464.56 163,461 163,461 163,461 186.87,461 186.87,461";
        const bends = graphvizPosBends([180, 464], [180, 464], pos, [24, 24]);
        const pairs = (bends ?? "").split(" ").map((pair) => pair.split(",").map(Number));
        expect(pairs[0][0]).toBeCloseTo(-17 / 12, 2);
        expect(pairs.at(-1)?.[0]).toBeCloseTo(6.87 / 12, 2);
        expect(graphvizPosBends([180, 464], [180, 464], pos)).toBeNull();
    });
});

describe("graphvizPosCurve", () => {
    /**
     * The measures of a route.
     * @param pos - its `pos` text
     * @returns one per sample
     */
    const params = (pos: string): number[] => graphvizPosCurve([0, -50], [120, -50], pos)?.params ?? [];

    it("spreads a one-piece spline's parameter evenly over its samples, as Graphviz splits its color bands", () => {
        const measures = params("10,0 30,40 70,40 90,0");
        expect(measures).toHaveLength(9);
        measures.forEach((u, k) => {
            expect(u).toBeCloseTo(k / 8, 9);
        });
    });

    it("gives each piece a share as long as its control polygon, and the arrow tips the ends' measures", () => {
        // a piece 30 points long, then one 90 long; a tail tip and a head tip beyond the spline's ends
        const pos = "s,-5,0 e,125,0 0,0 10,0 20,0 30,0 60,0 90,0 120,0";
        const measures = params(pos);
        expect(measures).toHaveLength(1 + 17 + 1);
        expect(measures[0]).toBe(0);
        expect(measures[1]).toBe(0);
        expect(measures[9]).toBeCloseTo(0.25, 9);
        expect(measures[13]).toBeCloseTo(0.25 + 0.75 / 2, 9);
        expect(measures[17]).toBeCloseTo(1, 9);
        expect(measures[18]).toBe(1);
        // one sample per measure, kept though the route is on the line between the centers
        expect(graphvizPosBends([0, -50], [120, -50], pos)).not.toBeNull();
        expect(graphvizPosCurve([0, 0], [120, 0], pos)?.points.split(" ")).toHaveLength(measures.length);
        expect(graphvizPosBends([0, 0], [120, 0], pos)).toBeNull();
    });

    it("reads nothing from a pos that is not a spline", () => {
        expect(graphvizPosCurve([0, 0], [100, 0], "10,0 30,40")).toBeNull();
    });
});
