/**
 * Graphviz's parallel lines (`color="red:green:blue"`, a color list with no fractions): one open path per color, each
 * the route moved sideways 2 points, drawn one over the other. They are one line read as its strands' colors in the
 * order drawn, not the longest strand alone (dot-synth-edges-clusters c7_0 -> c3_2 was read as its blue strand).
 */
import { assert, describe, it } from "vitest";

import { parallelStrands } from "./associate";
import { boxOfPoints, type Prim, type Pt } from "./primitives";

const path = (index: number, color: string, points: Pt[], width = 2): Prim => ({
    index,
    tag: "path",
    kind: "path",
    box: boxOfPoints(points),
    points,
    closed: false,
    corners: 0,
    fill: null,
    stroke: { color, opacity: 1, width, dash: null, dashClass: "solid" },
    text: null,
    markers: { start: false, end: false },
    hint: null,
});

/** A route bent at its middle, moved `by` sideways. */
const route = (by: number): Pt[] => [
    [0, by],
    [50, 30 + by],
    [100, by],
];

describe("an edge drawn as parallel strands", () => {
    it("is its strands in the order drawn, whichever of them is the longest", () => {
        const strands = [path(0, "#ff0000", route(-2)), path(1, "#008000", route(0)), path(2, "#0000ff", route(2))];
        const read = parallelStrands(strands, strands[2]);
        assert.deepEqual(
            read?.map((p) => p.stroke?.color),
            ["#ff0000", "#008000", "#0000ff"],
        );
    });

    it("is no strands for a line alone, or beside a short stem or a line of another width", () => {
        const line = path(0, "#000000", route(0));
        const stem: Prim = path(1, "#000000", [
            [95, 0],
            [100, 0],
        ]);
        const thin = path(2, "#000000", route(1), 1);
        assert.isNull(parallelStrands([line], line));
        assert.isNull(parallelStrands([line, stem, thin], line));
    });

    it("is no strands for two lines far apart", () => {
        const line = path(0, "#000000", route(0));
        const far = path(1, "#000000", route(40));
        assert.isNull(parallelStrands([line, far], line));
    });
});
