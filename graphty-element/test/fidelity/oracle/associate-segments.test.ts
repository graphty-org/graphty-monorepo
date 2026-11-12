/**
 * Graphviz's colored segments (`color="red;0.5:blue"`): one route drawn as open paths laid end to end, each in the next
 * color. They are one line, painted through the colors with a hard switch at each joint, not the longest piece alone
 * (dot-specimen-edges-lines color-segments-3 was read as its blue piece: its route a third of the line, its color blue).
 */
import { assert, describe, it } from "vitest";

import { segmentedLine } from "./associate";
import { rampColor } from "./compare-oracle";
import { boxOfPoints, type Prim, type Pt } from "./primitives";

const piece = (index: number, color: string, from: number, to: number, width = 1.5): Prim => {
    const points: Pt[] = [
        [from, 100],
        [to, 100],
    ];
    return {
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
    };
};

describe("an edge drawn in colored segments", () => {
    it("is one line from the first piece's start to the last one's end, its colors switching where the pieces meet", () => {
        const read = segmentedLine([
            piece(0, "#ff0000", 0, 20),
            piece(1, "#008000", 20, 50),
            piece(2, "#0000ff", 50, 100),
        ]);

        assert.isNotNull(read);
        const line = read?.line;
        assert.deepEqual(
            [line?.points[0], line?.points.at(-1)],
            [
                [0, 100],
                [100, 100],
            ],
        );
        assert.strictEqual(line?.stroke?.color, "#ff0000", "its first color is the line's");
        const ramp = line?.stroke?.gradient ?? null;
        assert.isNotNull(ramp);
        const at = (t: number): string => (ramp === null ? "" : rampColor(ramp, t));
        assert.deepEqual([at(0.1), at(0.35), at(0.75)], ["#ff0000", "#008000", "#0000ff"]);
        assert.strictEqual(read?.pieces.size, 3);
    });

    it("joins an orthogonal route drawn as its runs and its rounded corner, in any order, as one line in one color", () => {
        // Graphviz's radius=8: the first run, the last run, then the corner between them drawn from the last run's start
        const corner = piece(2, "#505050", 0, 0);
        // a quarter circle of radius 6 from (56, 100) round to (50, 94), drawn from the last run's start
        corner.points = Array.from({ length: 9 }, (_, i): Pt => {
            const a = (Math.PI / 2) * (i / 8);
            return [56 - 6 * Math.sin(a), 94 + 6 * Math.cos(a)];
        });
        const up = piece(0, "#505050", 0, 0);
        up.points = [
            [50, 40],
            [50, 94],
        ];
        const along = piece(1, "#505050", 56, 120);
        const read = segmentedLine([up, along, corner]);

        assert.deepEqual(
            [read?.line.points[0], read?.line.points.at(-1)],
            [
                [50, 40],
                [120, 100],
            ],
        );
        assert.strictEqual(read?.line.points.length, 11, "the first run, the corner, the last run");
        assert.isUndefined(read?.line.stroke?.gradient, "one color: no gradient");
    });

    it("is not read from pieces that do not meet or differ in width", () => {
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20), piece(1, "#0000ff", 30, 50)]), "apart");
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20), piece(1, "#0000ff", 20, 50, 3)]), "two widths");
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20)]), "one piece");
        // Graphviz's `tee` tail: the line and a stub of its stem on its end, in one color, which the line runs on to
        assert.isNull(segmentedLine([piece(0, "#505050", 5, 100), piece(1, "#505050", 0, 5)]), "a stem");
    });
});
