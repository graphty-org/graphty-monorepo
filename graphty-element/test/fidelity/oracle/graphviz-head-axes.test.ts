/**
 * Graphviz lays every part of an arrowhead along the line from the spline's end to the node, a few degrees off the
 * spline's own end direction, and on a polyline route the line's last run can be under a render pixel. Read along the
 * line, the `inv` against the node in `invdot`, `invodot` and `invnormal`, the half bar of `lteeoldiamond` and the
 * half triangle of `ornormal` read as the wrong class (dot-synth-edges-clusters). The points are the oracle's own
 * (y as the SVG writes it), at the scorecard's render scale.
 */
import { assert, describe, it } from "vitest";

import { measureArrow } from "./associate";
import type { Pt } from "./primitives";

/** The scorecard draws this sample at about 0.4 render pixels to a point. */
const SCALE = 0.4;

/**
 * Points from an SVG `points` list, scaled.
 * @param s - the list
 * @returns the points
 */
const pts = (s: string): Pt[] =>
    s
        .trim()
        .split(/\s+/)
        .map((q): Pt => {
            const [x, y] = q.split(",").map(Number);
            return [x * SCALE, y * SCALE];
        });

/**
 * The shape class the oracle reads for the head at a line's target end.
 * @param head - the head's polygon
 * @param line - the line, its end last
 * @returns the class
 */
const shapeAt = (head: string, line: string): string =>
    measureArrow(pts(head), pts(line), "target", { filled: true, color: null }).shape;

describe("Graphviz heads read along their own axis", () => {
    it("reads the inv against the node, past a disc, as inverted (invdot, invodot)", () => {
        const invdot = "520.54,-1017.63 510.02,-1018.84 517.5,-1011.33 520.54,-1017.63";
        assert.strictEqual(shapeAt(invdot, "472.01,-1035.15 501.99,-1022.72"), "inverted");
        const invodot = "124.16,-844.79 133.44,-849.9 123,-851.7 124.16,-844.79";
        assert.strictEqual(shapeAt(invodot, "210.91,-858.44 142.26,-851.37"), "inverted");
    });

    it("reads the inv against the node, past a triangle, as inverted (invnormal)", () => {
        const inv = "519.97,-1017.76 509.39,-1017.19 518.01,-1011.04 519.97,-1017.76";
        assert.strictEqual(shapeAt(inv, "439.51,-1033.78 498.63,-1020.31"), "inverted");
    });

    it("reads half a bar as a bar (lteeoldiamond)", () => {
        const ltee = "2260.49,-931.69 2261.61,-936.56 2259.66,-937.01 2258.54,-932.13 2260.49,-931.69";
        assert.strictEqual(shapeAt(ltee, "2183.94,-945.02 2242.41,-935.81"), "tee");
    });

    it("reads half a triangle as half an arrow where the line's last run is under a pixel (ornormal)", () => {
        const half = "1242.34,-1097.17 1232.36,-1100.72 1234.56,-1103.44 1242.34,-1097.17";
        assert.strictEqual(shapeAt(half, "521.39,-1153.32 1182,-1125.5 1233,-1104.7 1234.6,-1103.41"), "half");
    });

    it("still reads a whole triangle on the line's end as a triangle", () => {
        const normal = "497.85,-1024.18 506.48,-1018.03 495.9,-1017.46 497.85,-1024.18";
        assert.strictEqual(shapeAt(normal, "439.51,-1033.78 496.8,-1020.9"), "triangle");
    });
});
