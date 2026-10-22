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

    it("is not read from pieces that do not meet, are of one color, or differ in width", () => {
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20), piece(1, "#0000ff", 30, 50)]), "apart");
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20), piece(1, "#ff0000", 20, 50)]), "one color");
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20), piece(1, "#0000ff", 20, 50, 3)]), "two widths");
        assert.isNull(segmentedLine([piece(0, "#ff0000", 0, 20)]), "one piece");
    });
});
