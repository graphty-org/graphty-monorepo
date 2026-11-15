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
});
