import { describe, expect, it } from "vitest";

import { graphvizPosBends } from "../../../src/formats/dot/index.js";

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
