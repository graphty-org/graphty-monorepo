/**
 * A line drawn as cubics that are each straight (Graphviz's `splines=polyline` and `splines=ortho`) is read as its
 * corners, not sampled by arc length, which cuts a short leg's corners into a slant.
 */
import { assert, describe, it } from "vitest";

import { placeOnLine } from "./compare-oracle";
import { straightCubicVertices } from "./svg-primitives";

// dot-synth-edges-clusters c2_3->c9_4: a 10.5 pt leg down x=1866 between two long runs
const C2_3_C9_4 =
    "M1481.35,-1066.68C1573.37,-1058.86 1866,-1034 1866,-1034 1866,-1034 1866,-1023.5 1866,-1023.5 1866,-1023.5 420,-1013.5 420,-1013.5 420,-1013.5 291.54,-999.72 225.38,-992.62";

describe("straight cubic lines", () => {
    it("reads each straight cubic as one segment, keeping both corners of a short leg", () => {
        assert.deepEqual(straightCubicVertices(C2_3_C9_4), [
            [1481.35, -1066.68],
            [1866, -1034],
            [1866, -1023.5],
            [420, -1013.5],
            [225.38, -992.62],
        ]);
    });

    it("reads a label beside the short leg as off that leg, by its distance", () => {
        // the oracle's label "dashed" has its middle at about (1881.4, -1028.4)
        const at = placeOnLine(straightCubicVertices(C2_3_C9_4) ?? [], [1881.38, -1028.4]);
        assert.approximately(Math.abs(at.d), 15.38, 0.01);
    });

    it("leaves a cubic that bends, and any other command, to be sampled", () => {
        assert.isNull(straightCubicVertices("M0,0C10,10 20,10 30,0"));
        assert.isNull(straightCubicVertices("M0,0C10,0 20,0 30,0L40,0"));
        // a control point past the segment's end is a bend back, not a straight segment
        assert.isNull(straightCubicVertices("M0,0C40,0 20,0 30,0"));
    });
});
